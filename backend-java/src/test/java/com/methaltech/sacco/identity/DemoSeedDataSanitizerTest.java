package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
        insertMember("member_green_amina", "GVS-0001", "amina@example.local", "member_seed_salt_2026", "active");
        insertMember("member_live", "GVS-8244", "real.member@tereka.online", "live_salt", "active");

        int updates = new DemoSeedDataSanitizer(jdbcTemplate, false).sanitizeIfNeeded();

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
        insertMember("member_green_amina", "GVS-0001", "amina@example.local", "member_seed_salt_2026", "active");

        int updates = new DemoSeedDataSanitizer(jdbcTemplate, true).sanitizeIfNeeded();

        assertEquals(0, updates);
        assertEquals("active", userStatus("user_platform_admin"));
        assertEquals("active", memberStatus("member_green_amina"));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM audit_events", Integer.class));
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
