package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

class TenantPurgeServiceTest {

    private EmbeddedDatabase database;
    private JdbcTemplate jdbcTemplate;
    private TenantPurgeService service;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).build();
        jdbcTemplate = new JdbcTemplate(database);
        service = new TenantPurgeService(jdbcTemplate);

        jdbcTemplate.execute("CREATE TABLE tenants (id VARCHAR(64) PRIMARY KEY)");
        jdbcTemplate.execute("CREATE TABLE roles (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL)");
        jdbcTemplate.execute("CREATE TABLE role_permissions (role_id VARCHAR(64) NOT NULL REFERENCES roles(id), "
                + "permission_id VARCHAR(64) NOT NULL, PRIMARY KEY (role_id, permission_id))");
        jdbcTemplate.execute("CREATE TABLE members (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL)");
        jdbcTemplate.execute("CREATE TABLE loans (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL)");
        jdbcTemplate.execute("CREATE TABLE loan_repayments (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL, "
                + "loan_id VARCHAR(64) NOT NULL REFERENCES loans(id))");
        jdbcTemplate.execute("CREATE TABLE financial_transactions (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL, "
                + "status VARCHAR(32) NOT NULL DEFAULT 'draft', "
                + "original_transaction_id VARCHAR(64), "
                + "CONSTRAINT fk_ft_self FOREIGN KEY (original_transaction_id) REFERENCES financial_transactions(id))");
        jdbcTemplate.execute("CREATE SCHEMA archive");
        jdbcTemplate.execute("CREATE TABLE archive.members (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL)");

        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_platform')");
        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_acme')");

        // Platform-owned rows that must always survive.
        jdbcTemplate.update("INSERT INTO roles (id, tenant_id) VALUES ('role_plat', 'tenant_platform')");
        jdbcTemplate.update("INSERT INTO members (id, tenant_id) VALUES ('mem_plat', 'tenant_platform')");

        // A live customer SACCO with data across the full FK chain.
        jdbcTemplate.update("INSERT INTO roles (id, tenant_id) VALUES ('role_acme', 'tenant_acme')");
        jdbcTemplate.update("INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_acme', 'perm_x')");
        jdbcTemplate.update("INSERT INTO members (id, tenant_id) VALUES ('mem_acme', 'tenant_acme')");
        jdbcTemplate.update("INSERT INTO loans (id, tenant_id) VALUES ('loan_acme', 'tenant_acme')");
        jdbcTemplate.update("INSERT INTO loan_repayments (id, tenant_id, loan_id) VALUES ('rep_acme', 'tenant_acme', 'loan_acme')");
        jdbcTemplate.update("INSERT INTO financial_transactions (id, tenant_id, original_transaction_id) VALUES ('ft_o', 'tenant_acme', NULL)");
        jdbcTemplate.update("INSERT INTO financial_transactions (id, tenant_id, original_transaction_id) VALUES ('ft_r', 'tenant_acme', 'ft_o')");
        jdbcTemplate.update("INSERT INTO archive.members (id, tenant_id) VALUES ('archived_acme', 'tenant_acme')");
    }

    @AfterEach
    void tearDown() {
        database.shutdown();
    }

    @Test
    void purgesAnArbitraryTenantAndAllItsData() {
        int removed = service.purgeTenantsStrict(List.of("tenant_acme"));

        assertTrue(removed >= 7, "expected the SACCO row plus its owned rows to be removed, got " + removed);
        assertEquals(0, count("SELECT COUNT(*) FROM tenants WHERE id = 'tenant_acme'"));
        assertEquals(0, count("SELECT COUNT(*) FROM roles WHERE tenant_id = 'tenant_acme'"));
        assertEquals(0, count("SELECT COUNT(*) FROM role_permissions WHERE role_id = 'role_acme'"));
        assertEquals(0, count("SELECT COUNT(*) FROM members WHERE tenant_id = 'tenant_acme'"));
        assertEquals(0, count("SELECT COUNT(*) FROM loans WHERE tenant_id = 'tenant_acme'"));
        assertEquals(0, count("SELECT COUNT(*) FROM loan_repayments WHERE tenant_id = 'tenant_acme'"));
        assertEquals(0, count("SELECT COUNT(*) FROM financial_transactions WHERE tenant_id = 'tenant_acme'"));
        assertEquals(1, count("SELECT COUNT(*) FROM archive.members WHERE tenant_id = 'tenant_acme'"));
    }

    @Test
    void neverTouchesThePlatformTenant() {
        // Explicitly asking for the platform tenant is a no-op.
        assertEquals(0, service.purgeTenants(List.of("tenant_platform")));
        // And purging a customer leaves platform rows intact.
        service.purgeTenantsStrict(List.of("tenant_acme"));
        assertEquals(1, count("SELECT COUNT(*) FROM tenants WHERE id = 'tenant_platform'"));
        assertEquals(1, count("SELECT COUNT(*) FROM roles WHERE tenant_id = 'tenant_platform'"));
        assertEquals(1, count("SELECT COUNT(*) FROM members WHERE tenant_id = 'tenant_platform'"));
    }

    @Test
    void unknownTenantIsANoOp() {
        assertEquals(0, service.purgeTenants(List.of("tenant_does_not_exist")));
        assertEquals(2, count("SELECT COUNT(*) FROM tenants"));
    }

    @Test
    void strictPurgeThrowsWhenAReferencingTableCannotBeCleared() {
        // A tenant-owned child with no tenant_id column and no cascade blocks its parent's deletion; the
        // generic sweep cannot express it, so a strict purge must fail loudly rather than half-delete.
        jdbcTemplate.execute("CREATE TABLE loan_notes (id VARCHAR(64) PRIMARY KEY, "
                + "loan_id VARCHAR(64) NOT NULL REFERENCES loans(id))");
        jdbcTemplate.update("INSERT INTO loan_notes (id, loan_id) VALUES ('note_acme', 'loan_acme')");

        assertThrows(TenantPurgeService.TenantPurgeIncompleteException.class,
                () -> service.purgeTenantsStrict(List.of("tenant_acme")));
    }

    private int count(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }
}
