package com.methaltech.sacco.identity;

import com.methaltech.sacco.tenant.TenantPurgeService;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * When demo logins are disabled (i.e. real deployments), neutralise the demo seed data that Flyway
 * ships for local development so it can never pollute production: seeded demo accounts are suspended,
 * and the demo SACCO tenants and every row they own are purged. The real platform tenant
 * ({@code tenant_platform}) is always preserved. Runs once at startup; no-op when demo logins are on,
 * so dev and the test suite keep their seed data.
 *
 * <p>The actual tenant purge is delegated to {@link TenantPurgeService}, the single shared implementation
 * used both here and by the platform-admin "delete SACCO" endpoint, so there is one audited, PostgreSQL-safe
 * purge path in the system rather than two divergent copies.
 */
@Component
class DemoSeedDataSanitizer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoSeedDataSanitizer.class);
    /** Seeded demo SACCOs. The live platform tenant is intentionally not in this list. */
    private static final List<String> DEMO_TENANTS = List.of("tenant_green", "tenant_lake");

    private final JdbcTemplate jdbcTemplate;
    private final TenantPurgeService tenantPurgeService;
    private final boolean demoLoginsEnabled;
    private final boolean resetToPlatformAdmin;
    private final boolean twoSaccoReseedEnabled;

    DemoSeedDataSanitizer(
            JdbcTemplate jdbcTemplate,
            TenantPurgeService tenantPurgeService,
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${sacco.reset-to-platform-admin:false}") boolean resetToPlatformAdmin,
            @Value("${sacco.reseed.two-saccos.enabled:false}") boolean twoSaccoReseedEnabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.tenantPurgeService = tenantPurgeService;
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.resetToPlatformAdmin = resetToPlatformAdmin;
        this.twoSaccoReseedEnabled = twoSaccoReseedEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        sanitizeIfNeeded();
    }

    int sanitizeIfNeeded() {
        if (resetToPlatformAdmin) {
            return resetToPlatformAdmin();
        }
        if (twoSaccoReseedEnabled) {
            return 0;
        }
        if (demoLoginsEnabled) {
            return 0;
        }
        int suspended = suspendDemoAccounts();
        if (suspended > 0) {
            writeAudit("Suspended seeded demo accounts because demo logins are disabled.", suspended);
        }
        purgeDemoTenants();
        return suspended;
    }

    /**
     * Start the system with only the platform tenant and the bootstrap Platform Super Admin, without
     * requiring full production mode. Removes only the known demo seed - the demo SACCO tenants and
     * everything they own - and suspends the seeded demo accounts, so real SACCOs, staff and members added
     * later are never touched. The real platform admin is provisioned separately by
     * {@code PlatformAdminBootstrapper}.
     */
    private int resetToPlatformAdmin() {
        String adminEmail = System.getenv("SACCO_BOOTSTRAP_PLATFORM_ADMIN_EMAIL");
        if (adminEmail == null || adminEmail.isBlank()) {
            throw new IllegalStateException(
                    "sacco.reset-to-platform-admin requires the SACCO_BOOTSTRAP_PLATFORM_ADMIN_* variables so a usable "
                            + "platform admin exists after the seeded demo accounts are suspended (otherwise you would be locked out).");
        }
        int suspended = suspendDemoAccounts();
        int purged = purgeDemoTenants();
        int total = suspended + purged;
        if (total > 0) {
            writeAudit("Reset to platform admin: purged seeded demo SACCOs and suspended demo accounts.", total);
        }
        log.warn("reset-to-platform-admin cleared demo seed: {} accounts suspended, {} demo-tenant rows removed.",
                suspended, purged);
        return total;
    }

    private int suspendDemoAccounts() {
        int staffUpdates = jdbcTemplate.update("""
                UPDATE users
                SET status = 'suspended'
                WHERE status <> 'suspended'
                  AND (
                    password_salt LIKE '%seed_salt_2026'
                    OR email LIKE '%@platform.local'
                    OR email LIKE '%@greenvalley.local'
                    OR email LIKE '%@lakefarmers.local'
                  )
                """);
        int memberUpdates = jdbcTemplate.update("""
                UPDATE members
                SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
                WHERE status <> 'suspended'
                  AND (
                    password_salt = 'member_seed_salt_2026'
                    OR email LIKE '%@example.local'
                    OR membership_no LIKE 'GREE-000_'
                    OR membership_no LIKE 'LAKE-000_'
                  )
                """);
        return staffUpdates + memberUpdates;
    }

    /**
     * Delete the demo SACCO tenants and every row they own via the shared {@link TenantPurgeService}.
     * Idempotent and audited when anything is removed.
     */
    int purgeDemoTenants() {
        int removed = tenantPurgeService.purgeTenants(DEMO_TENANTS);
        if (removed > 0) {
            writeAudit("Purged seeded demo SACCO tenants and their data because demo logins are disabled.", removed);
        }
        return removed;
    }

    private void writeAudit(String action, int count) {
        jdbcTemplate.update("""
                INSERT INTO audit_events (
                    id, tenant_id, actor_user_id, actor_name, action, resource_type, resource_id, ip_address
                ) VALUES (?, 'tenant_platform', NULL, 'System', ?, 'demo_seed_data', ?, 'startup')
                """,
                "audit_demo_seed_sanitizer_" + UUID.randomUUID(), action, String.valueOf(count));
    }
}
