package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.methaltech.sacco.tenant.TenantPurgeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

class DemoSeedDataSanitizerTest {

    private EmbeddedDatabase database;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).build();
        jdbcTemplate = new JdbcTemplate(database);
        jdbcTemplate.execute("""
                CREATE TABLE tenants (
                    id VARCHAR(64) PRIMARY KEY
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE users (
                    id VARCHAR(64) PRIMARY KEY,
                    tenant_id VARCHAR(64) NOT NULL,
                    email VARCHAR(160) NOT NULL,
                    password_salt VARCHAR(80) NOT NULL,
                    status VARCHAR(32) NOT NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE members (
                    id VARCHAR(64) PRIMARY KEY,
                    membership_no VARCHAR(64) NOT NULL,
                    email VARCHAR(160),
                    password_salt VARCHAR(80) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    updated_at TIMESTAMP
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE audit_events (
                    id VARCHAR(64) PRIMARY KEY,
                    tenant_id VARCHAR(64) NOT NULL,
                    actor_user_id VARCHAR(64),
                    actor_name VARCHAR(160) NOT NULL,
                    action VARCHAR(240) NOT NULL,
                    resource_type VARCHAR(80),
                    resource_id VARCHAR(120),
                    ip_address VARCHAR(80)
                )
                """);
        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_platform')");
    }

    @AfterEach
    void tearDown() {
        database.shutdown();
    }

    @Test
    void disabledDemoLoginsSuspendSeededAccountsOnly() {
        insertUser("user_platform_admin", "admin@platform.local", "platform_admin_seed_salt_2026", "active");
        insertUser("user_live_admin", "admin@tereka.online", "live_salt", "active");
        insertMember("member_green_amina", "GREE-0001", "amina@example.local", "member_seed_salt_2026", "active");
        insertMember("member_live", "GREE-8244", "real.member@tereka.online", "live_salt", "active");

        int updates = new DemoSeedDataSanitizer(
                jdbcTemplate, new TenantPurgeService(jdbcTemplate), false, false, false).sanitizeIfNeeded();

        assertEquals(2, updates);
        assertEquals("suspended", userStatus("user_platform_admin"));
        assertEquals("active", userStatus("user_live_admin"));
        assertEquals("suspended", memberStatus("member_green_amina"));
        assertEquals("active", memberStatus("member_live"));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM audit_events", Integer.class));
    }

    @Test
    void enabledDemoLoginsLeaveSeededAccountsActive() {
        insertUser("user_platform_admin", "admin@platform.local", "platform_admin_seed_salt_2026", "active");
        insertMember("member_green_amina", "GREE-0001", "amina@example.local", "member_seed_salt_2026", "active");

        int updates = new DemoSeedDataSanitizer(
                jdbcTemplate, new TenantPurgeService(jdbcTemplate), true, false, false).sanitizeIfNeeded();

        assertEquals(0, updates);
        assertEquals("active", userStatus("user_platform_admin"));
        assertEquals("active", memberStatus("member_green_amina"));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM audit_events", Integer.class));
    }

    @Test
    void disabledDemoLoginsPurgeDemoTenantsAndTheirData() {
        // Extra tables to exercise the generic tenant sweep, the role_permissions special case (no
        // tenant_id column) and the financial_transactions self-reference (reversal -> original).
        jdbcTemplate.execute("CREATE TABLE roles (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL)");
        jdbcTemplate.execute("CREATE TABLE role_permissions (role_id VARCHAR(64) NOT NULL REFERENCES roles(id), "
                + "permission_id VARCHAR(64) NOT NULL, PRIMARY KEY (role_id, permission_id))");
        jdbcTemplate.execute("CREATE TABLE loans (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL)");
        jdbcTemplate.execute("CREATE TABLE loan_repayments (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL, "
                + "loan_id VARCHAR(64) NOT NULL REFERENCES loans(id))");
        jdbcTemplate.execute("CREATE TABLE financial_transactions (id VARCHAR(64) PRIMARY KEY, tenant_id VARCHAR(64) NOT NULL, "
                + "original_transaction_id VARCHAR(64), "
                + "CONSTRAINT fk_ft_self FOREIGN KEY (original_transaction_id) REFERENCES financial_transactions(id))");

        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_green')");
        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_lake')");

        // Demo (green) rows across the whole FK chain.
        jdbcTemplate.update("INSERT INTO roles (id, tenant_id) VALUES ('role_green', 'tenant_green')");
        jdbcTemplate.update("INSERT INTO role_permissions (role_id, permission_id) VALUES ('role_green', 'perm_x')");
        jdbcTemplate.update("INSERT INTO loans (id, tenant_id) VALUES ('loan_green', 'tenant_green')");
        jdbcTemplate.update("INSERT INTO loan_repayments (id, tenant_id, loan_id) VALUES ('rep_green', 'tenant_green', 'loan_green')");
        jdbcTemplate.update("INSERT INTO financial_transactions (id, tenant_id, original_transaction_id) VALUES ('ft_orig', 'tenant_green', NULL)");
        jdbcTemplate.update("INSERT INTO financial_transactions (id, tenant_id, original_transaction_id) VALUES ('ft_rev', 'tenant_green', 'ft_orig')");
        jdbcTemplate.update("INSERT INTO users (id, tenant_id, email, password_salt, status) VALUES "
                + "('u_green', 'tenant_green', 'admin@greenvalley.local', 'x_seed_salt_2026', 'active')");

        // Real platform rows that must survive.
        jdbcTemplate.update("INSERT INTO roles (id, tenant_id) VALUES ('role_plat', 'tenant_platform')");
        jdbcTemplate.update("INSERT INTO loans (id, tenant_id) VALUES ('loan_plat', 'tenant_platform')");
        jdbcTemplate.update("INSERT INTO users (id, tenant_id, email, password_salt, status) VALUES "
                + "('u_live', 'tenant_platform', 'admin@tereka.online', 'live_salt', 'active')");

        new DemoSeedDataSanitizer(
                jdbcTemplate, new TenantPurgeService(jdbcTemplate), false, false, false).sanitizeIfNeeded();

        // Demo tenants and everything they owned are gone.
        assertEquals(0, count("SELECT COUNT(*) FROM tenants WHERE id IN ('tenant_green', 'tenant_lake')"));
        assertEquals(0, count("SELECT COUNT(*) FROM roles WHERE tenant_id = 'tenant_green'"));
        assertEquals(0, count("SELECT COUNT(*) FROM role_permissions WHERE role_id = 'role_green'"));
        assertEquals(0, count("SELECT COUNT(*) FROM loans WHERE tenant_id = 'tenant_green'"));
        assertEquals(0, count("SELECT COUNT(*) FROM loan_repayments WHERE tenant_id = 'tenant_green'"));
        assertEquals(0, count("SELECT COUNT(*) FROM financial_transactions WHERE tenant_id = 'tenant_green'"));
        assertEquals(0, count("SELECT COUNT(*) FROM users WHERE tenant_id = 'tenant_green'"));

        // The live platform tenant and its data are untouched.
        assertEquals(1, count("SELECT COUNT(*) FROM tenants WHERE id = 'tenant_platform'"));
        assertEquals(1, count("SELECT COUNT(*) FROM roles WHERE tenant_id = 'tenant_platform'"));
        assertEquals(1, count("SELECT COUNT(*) FROM loans WHERE tenant_id = 'tenant_platform'"));
        assertEquals(1, count("SELECT COUNT(*) FROM users WHERE id = 'u_live'"));
    }

    @Test
    void twoSaccoReseedPreservesSeedTenantsForTheReseedRunner() {
        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_green')");
        jdbcTemplate.update("INSERT INTO tenants (id) VALUES ('tenant_lake')");

        int updates = new DemoSeedDataSanitizer(
                jdbcTemplate, new TenantPurgeService(jdbcTemplate), false, false, true).sanitizeIfNeeded();

        assertEquals(0, updates);
        assertEquals(2, count("SELECT COUNT(*) FROM tenants WHERE id IN ('tenant_green', 'tenant_lake')"));
    }

    private int count(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    private void insertUser(String id, String email, String passwordSalt, String status) {
        jdbcTemplate.update(
                "INSERT INTO users (id, tenant_id, email, password_salt, status) VALUES (?, 'tenant_platform', ?, ?, ?)",
                id,
                email,
                passwordSalt,
                status);
    }

    private void insertMember(String id, String membershipNo, String email, String passwordSalt, String status) {
        jdbcTemplate.update(
                "INSERT INTO members (id, membership_no, email, password_salt, status, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                id,
                membershipNo,
                email,
                passwordSalt,
                status);
    }

    private String userStatus(String id) {
        return jdbcTemplate.queryForObject("SELECT status FROM users WHERE id = ?", String.class, id);
    }

    private String memberStatus(String id) {
        return jdbcTemplate.queryForObject("SELECT status FROM members WHERE id = ?", String.class, id);
    }
}
