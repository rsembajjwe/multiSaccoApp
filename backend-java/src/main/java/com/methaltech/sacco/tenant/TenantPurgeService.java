package com.methaltech.sacco.tenant;

import java.sql.Savepoint;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Permanently removes one or more SACCO tenants and every row those tenants own.
 *
 * <p>The sweep is schema-agnostic: it discovers every table carrying a {@code tenant_id} column from
 * {@code information_schema} and deletes the target tenants' rows, retrying across passes so foreign-key
 * ordering resolves itself (a child is cleared before its parent). Two structural exceptions the generic
 * sweep cannot express are handled first: {@code role_permissions} (the only tenant-owned child with no
 * {@code tenant_id} column) and the {@code financial_transactions} self-reference (a reversal points at
 * its original), whose reversals are deleted before the originals.
 *
 * <p>PostgreSQL-safe: it never uses {@code SET REFERENTIAL_INTEGRITY} (an H2-only construct) and relies on
 * ordinary transactional deletes. The live platform tenant ({@code tenant_platform}) is always protected
 * and can never be purged. The operation is best-effort and idempotent: if a stray table cannot be cleared
 * within the retry budget, the tenant rows are left in place (rather than partially deleted) and the caller
 * can surface the incomplete result.
 */
@Service
public class TenantPurgeService {

    /** The live platform tenant is never a valid purge target. */
    public static final String PLATFORM_TENANT_ID = "tenant_platform";

    private static final Logger log = LoggerFactory.getLogger(TenantPurgeService.class);
    private static final Pattern SAFE_TABLE_NAME = Pattern.compile("[A-Za-z0-9_]+");

    private final JdbcTemplate jdbcTemplate;

    public TenantPurgeService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Purge every non-platform tenant. Convenience wrapper used by full clean-slate resets.
     *
     * @return the number of rows removed (tenant-owned rows plus the tenant rows themselves)
     */
    public int purgeAllExceptPlatform() {
        List<String> ids;
        try {
            ids = jdbcTemplate.queryForList(
                    "SELECT id FROM tenants WHERE id <> ?", String.class, PLATFORM_TENANT_ID);
        } catch (DataAccessException noTenantsTable) {
            return 0;
        }
        return purgeTenants(ids);
    }

    /**
     * Purge the given tenants and everything they own, best-effort. {@code tenant_platform}, blank ids and
     * duplicates are filtered out. Never throws and never blocks: if a stray table cannot be cleared, those
     * tenant rows are left in place. Used by the startup demo-seed sanitizer, where a single unclearable
     * table must never crash the application.
     *
     * @return the number of rows removed (tenant-owned rows plus the tenant rows themselves)
     */
    public int purgeTenants(Collection<String> tenantIds) {
        return sweep(normalizeTargets(tenantIds)).rowsRemoved();
    }

    /**
     * Purge the given tenants atomically, for interactive platform-admin deletion. Runs in a single
     * transaction and throws {@link TenantPurgeIncompleteException} (rolling the whole delete back) if any
     * tenant cannot be fully removed, so the caller can never end up with orphaned child rows and a
     * surviving tenant.
     *
     * @return the number of rows removed (tenant-owned rows plus the tenant rows themselves)
     */
    @Transactional
    public int purgeTenantsStrict(Collection<String> tenantIds) {
        List<String> targets = normalizeTargets(tenantIds);
        List<String> protectedTenants = targets.stream()
                .filter(this::hasPostedFinancialHistory)
                .toList();
        if (!protectedTenants.isEmpty()) {
            throw new TenantHasFinancialHistoryException(protectedTenants);
        }
        PurgeResult result = sweep(targets);
        if (!result.complete()) {
            throw new TenantPurgeIncompleteException(result.remainingTables());
        }
        return result.rowsRemoved();
    }

    /**
     * Purge the given tenants atomically even when they contain posted financial history.
     * Reserved for an explicitly enabled whole-system reseed where preserving those tenants is not intended.
     */
    @Transactional
    public int purgeTenantsForReseed(Collection<String> tenantIds) {
        PurgeResult result = sweep(normalizeTargets(tenantIds));
        if (!result.complete()) {
            throw new TenantPurgeIncompleteException(result.remainingTables());
        }
        return result.rowsRemoved();
    }

    private PurgeResult sweep(List<String> targets) {
        String schema = tenantSchema();
        if (schema == null || targets.isEmpty() || countExistingTenants(schema, targets) == 0) {
            return new PurgeResult(0, true, List.of());
        }

        String inClause = placeholders(targets.size());
        Object[] args = targets.toArray();
        int purged = 0;
        String tenantsTable = qualifiedName(schema, "tenants");

        // role_permissions is the only tenant-owned child table with no tenant_id column, so clear the
        // target tenants' role grants explicitly before the generic sweep deletes their roles.
        if (tableExists(schema, "role_permissions") && tableExists(schema, "roles")) {
            purged += jdbcTemplate.update(
                    "DELETE FROM " + qualifiedName(schema, "role_permissions")
                            + " WHERE role_id IN (SELECT id FROM " + qualifiedName(schema, "roles")
                            + " WHERE tenant_id IN (" + inClause + "))",
                    args);
        }
        // financial_transactions self-references (a reversal points at its original); delete reversals
        // first so the generic sweep can remove the originals within the same tenant scope.
        if (columnExists(schema, "financial_transactions", "original_transaction_id")) {
            purged += jdbcTemplate.update(
                    "DELETE FROM " + qualifiedName(schema, "financial_transactions")
                            + " WHERE tenant_id IN (" + inClause + ") AND original_transaction_id IS NOT NULL",
                    args);
        }

        List<String> remaining = new ArrayList<>(tablesWithTenantId(schema));
        int maxPasses = remaining.size() + 2;
        for (int pass = 0; pass < maxPasses && !remaining.isEmpty(); pass++) {
            boolean progressed = false;
            Iterator<String> it = remaining.iterator();
            while (it.hasNext()) {
                String table = it.next();
                try {
                    purged += deleteWithSavepoint(
                            "DELETE FROM " + qualifiedName(schema, table) + " WHERE tenant_id IN (" + inClause + ")", args);
                    it.remove();
                    progressed = true;
                } catch (DataIntegrityViolationException stillReferenced) {
                    // A not-yet-cleared child table still references these rows; retry on a later pass.
                }
            }
            if (!progressed) {
                break;
            }
        }

        int tenantsRemoved = 0;
        if (remaining.isEmpty()) {
            tenantsRemoved = jdbcTemplate.update("DELETE FROM " + tenantsTable + " WHERE id IN (" + inClause + ")", args);
        } else {
            log.warn("Tenant purge incomplete for {}; could not clear {} - leaving those tenants in place.",
                    targets, remaining);
        }
        return new PurgeResult(purged + tenantsRemoved, remaining.isEmpty(), List.copyOf(remaining));
    }

    private int deleteWithSavepoint(String sql, Object[] args) {
        return jdbcTemplate.execute((org.springframework.jdbc.core.ConnectionCallback<Integer>) connection -> {
            Savepoint savepoint = connection.getAutoCommit() ? null : connection.setSavepoint();
            try (var statement = connection.prepareStatement(sql)) {
                for (int index = 0; index < args.length; index++) {
                    statement.setObject(index + 1, args[index]);
                }
                int deleted = statement.executeUpdate();
                if (savepoint != null) {
                    connection.releaseSavepoint(savepoint);
                }
                return deleted;
            } catch (java.sql.SQLException exception) {
                if (savepoint != null) {
                    connection.rollback(savepoint);
                }
                throw exception;
            }
        });
    }

    /** Outcome of a purge sweep: rows removed, whether every target tenant was fully cleared, and any tables that blocked completion. */
    private record PurgeResult(int rowsRemoved, boolean complete, List<String> remainingTables) {
    }

    /** Thrown by {@link #purgeTenantsStrict} to roll back an interactive delete that could not fully complete. */
    public static class TenantPurgeIncompleteException extends RuntimeException {
        private final transient List<String> remainingTables;

        TenantPurgeIncompleteException(List<String> remainingTables) {
            super("Tenant purge could not clear all referencing tables: " + remainingTables);
            this.remainingTables = List.copyOf(remainingTables);
        }

        public List<String> getRemainingTables() {
            return remainingTables;
        }
    }

    public static class TenantHasFinancialHistoryException extends RuntimeException {
        private final transient List<String> tenantIds;

        TenantHasFinancialHistoryException(List<String> tenantIds) {
            super("Tenant purge blocked because posted financial history exists: " + tenantIds);
            this.tenantIds = List.copyOf(tenantIds);
        }

        public List<String> getTenantIds() {
            return tenantIds;
        }
    }

    private boolean hasPostedFinancialHistory(String tenantId) {
        String schema = tenantSchema();
        if (schema == null || !tableExists(schema, "financial_transactions")) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + qualifiedName(schema, "financial_transactions")
                        + " WHERE tenant_id = ? AND LOWER(status) = 'posted'",
                Integer.class,
                tenantId);
        return count != null && count > 0;
    }

    private List<String> normalizeTargets(Collection<String> tenantIds) {
        if (tenantIds == null) {
            return List.of();
        }
        return tenantIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .filter(id -> !PLATFORM_TENANT_ID.equals(id))
                .distinct()
                .collect(Collectors.toList());
    }

    private String tenantSchema() {
        try {
            return jdbcTemplate.queryForList(
                            "SELECT table_schema FROM information_schema.tables "
                                    + "WHERE LOWER(table_name) = 'tenants' "
                                    + "  AND table_type IN ('BASE TABLE', 'TABLE') "
                                    + "ORDER BY CASE WHEN LOWER(table_schema) = 'public' THEN 0 ELSE 1 END, table_schema",
                            String.class)
                    .stream()
                    .filter(schema -> schema != null && SAFE_TABLE_NAME.matcher(schema).matches())
                    .findFirst()
                    .orElse(null);
        } catch (DataAccessException noTenantsTable) {
            return null;
        }
    }

    private int countExistingTenants(String schema, List<String> targets) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM " + qualifiedName(schema, "tenants") + " WHERE id IN (" + placeholders(targets.size()) + ")",
                    Integer.class, targets.toArray());
            return count == null ? 0 : count;
        } catch (DataAccessException noTenantsTable) {
            return 0;
        }
    }

    private List<String> tablesWithTenantId(String schema) {
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT DISTINCT c.table_name FROM information_schema.columns c "
                        + "JOIN information_schema.tables t "
                        + "  ON t.table_name = c.table_name AND t.table_schema = c.table_schema "
                        + "WHERE LOWER(c.column_name) = 'tenant_id' "
                        + "  AND c.table_schema = ? "
                        + "  AND t.table_type IN ('BASE TABLE', 'TABLE')",
                String.class, schema);
        List<String> safe = new ArrayList<>();
        for (String table : tables) {
            if (table != null && SAFE_TABLE_NAME.matcher(table).matches()) {
                safe.add(table);
            }
        }
        return safe;
    }

    private boolean tableExists(String schema, String table) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND LOWER(table_name) = LOWER(?)",
                Integer.class, schema, table);
        return count != null && count > 0;
    }

    private boolean columnExists(String schema, String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_schema = ? AND LOWER(table_name) = LOWER(?) AND LOWER(column_name) = LOWER(?)",
                Integer.class, schema, table, column);
        return count != null && count > 0;
    }

    private String qualifiedName(String schema, String table) {
        if (!SAFE_TABLE_NAME.matcher(schema).matches() || !SAFE_TABLE_NAME.matcher(table).matches()) {
            throw new IllegalArgumentException("Unsafe database identifier");
        }
        return schema + "." + table;
    }

    private String placeholders(int count) {
        return String.join(", ", java.util.Collections.nCopies(count, "?"));
    }
}
