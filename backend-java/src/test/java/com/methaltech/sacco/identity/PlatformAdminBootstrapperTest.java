package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.methaltech.sacco.security.PasswordHasher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

class PlatformAdminBootstrapperTest {

    private EmbeddedDatabase database;
    private JdbcTemplate jdbcTemplate;
    private PasswordHasher passwordHasher;

    @BeforeEach
    void setUp() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).build();
        jdbcTemplate = new JdbcTemplate(database);
        passwordHasher = new PasswordHasher();
        jdbcTemplate.execute("""
                CREATE TABLE users (
                    id VARCHAR(80) PRIMARY KEY,
                    tenant_id VARCHAR(80) NOT NULL,
                    full_name VARCHAR(160) NOT NULL,
                    email VARCHAR(160) NOT NULL,
                    phone VARCHAR(40),
                    password_hash VARCHAR(128) NOT NULL,
                    password_salt VARCHAR(80) NOT NULL,
                    status VARCHAR(32) NOT NULL,
                    password_reset_required BOOLEAN NOT NULL DEFAULT FALSE
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE roles (
                    id VARCHAR(80) PRIMARY KEY,
                    tenant_id VARCHAR(80) NOT NULL,
                    name VARCHAR(120) NOT NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE user_roles (
                    user_id VARCHAR(80) NOT NULL,
                    role_id VARCHAR(80) NOT NULL,
                    tenant_id VARCHAR(80) NOT NULL,
                    PRIMARY KEY (user_id, role_id)
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE audit_events (
                    id VARCHAR(80) PRIMARY KEY,
                    tenant_id VARCHAR(80) NOT NULL,
                    actor_user_id VARCHAR(80),
                    actor_name VARCHAR(160) NOT NULL,
                    action VARCHAR(240) NOT NULL,
                    resource_type VARCHAR(80),
                    resource_id VARCHAR(120),
                    ip_address VARCHAR(80)
                )
                """);
        jdbcTemplate.update("INSERT INTO roles (id, tenant_id, name) VALUES ('role_platform_super_admin', 'tenant_platform', 'Platform Super Admin')");
    }

    @AfterEach
    void tearDown() {
        database.shutdown();
    }

    @Test
    void skipsWhenBootstrapSettingsAreAbsent() {
        String outcome = bootstrapper("", "", "", "").bootstrapIfConfigured();

        assertEquals("skipped", outcome);
        assertEquals(0, count("users"));
    }

    @Test
    void createsPlatformSuperAdminWhenConfigured() {
        String outcome = bootstrapper("Real Owner", " owner@tereka.online ", "+256700111222", "OwnerPass123").bootstrapIfConfigured();

        assertEquals("created", outcome);
        assertEquals(1, count("users"));
        assertEquals(1, count("user_roles"));
        assertEquals(1, count("audit_events"));
        assertEquals("owner@tereka.online", jdbcTemplate.queryForObject("SELECT email FROM users", String.class));
        assertNotEquals("OwnerPass123", jdbcTemplate.queryForObject("SELECT password_hash FROM users", String.class));
    }

    @Test
    void doesNotDuplicateExistingBootstrapUser() {
        bootstrapper("Real Owner", "owner@tereka.online", "+256700111222", "OwnerPass123").bootstrapIfConfigured();
        String outcome = bootstrapper("Real Owner", "OWNER@TEREKA.ONLINE", "+256700111222", "OwnerPass123").bootstrapIfConfigured();

        assertEquals("existing", outcome);
        assertEquals(1, count("users"));
        assertEquals(1, count("user_roles"));
    }

    @Test
    void rejectsIncompleteConfiguration() {
        PlatformAdminBootstrapper bootstrapper = bootstrapper("", "owner@tereka.online", "", "OwnerPass123");

        assertThrows(IllegalStateException.class, bootstrapper::bootstrapIfConfigured);
    }

    @Test
    void rejectsWeakPassword() {
        PlatformAdminBootstrapper bootstrapper = bootstrapper("Real Owner", "owner@tereka.online", "", "weak");

        assertThrows(IllegalStateException.class, bootstrapper::bootstrapIfConfigured);
    }

    private PlatformAdminBootstrapper bootstrapper(String fullName, String email, String phone, String password) {
        return new PlatformAdminBootstrapper(jdbcTemplate, passwordHasher, fullName, email, phone, password);
    }

    private int count(String table) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }
}
