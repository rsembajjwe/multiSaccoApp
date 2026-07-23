package com.methaltech.sacco.identity;

import com.methaltech.sacco.security.PasswordHasher;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class PlatformAdminBootstrapper implements ApplicationRunner {

    private static final String PLATFORM_TENANT_ID = "tenant_platform";
    private static final String SUPER_ADMIN_ROLE_ID = "role_platform_super_admin";

    private final JdbcTemplate jdbcTemplate;
    private final PasswordHasher passwordHasher;
    private final String fullName;
    private final String email;
    private final String phone;
    private final String password;

    PlatformAdminBootstrapper(
            JdbcTemplate jdbcTemplate,
            PasswordHasher passwordHasher,
            @Value("${sacco.bootstrap.platform-admin.full-name:}") String fullName,
            @Value("${sacco.bootstrap.platform-admin.email:}") String email,
            @Value("${sacco.bootstrap.platform-admin.phone:}") String phone,
            @Value("${sacco.bootstrap.platform-admin.password:}") String password) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordHasher = passwordHasher;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        bootstrapIfConfigured();
    }

    String bootstrapIfConfigured() {
        if (!anyConfigured()) {
            return "skipped";
        }
        validateConfiguration();
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (activeUserExists(normalizedEmail)) {
            return "existing";
        }
        if (!roleExists()) {
            throw new IllegalStateException("Platform Super Admin role is missing; Flyway migrations may be incomplete.");
        }

        PasswordHasher.PasswordHash passwordHash = passwordHasher.hash(password);
        String userId = "user_bootstrap_platform_" + UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO users (
                    id,
                    tenant_id,
                    full_name,
                    email,
                    phone,
                    password_hash,
                    password_salt,
                    status,
                    password_reset_required
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', FALSE)
                """,
                userId,
                PLATFORM_TENANT_ID,
                fullName.trim(),
                normalizedEmail,
                phone == null ? "" : phone.trim(),
                passwordHash.hash(),
                passwordHash.salt());
        jdbcTemplate.update(
                "INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)",
                userId,
                SUPER_ADMIN_ROLE_ID,
                PLATFORM_TENANT_ID);
        jdbcTemplate.update("""
                INSERT INTO audit_events (
                    id,
                    tenant_id,
                    actor_user_id,
                    actor_name,
                    action,
                    resource_type,
                    resource_id,
                    ip_address
                ) VALUES (?, ?, NULL, 'System', ?, 'user', ?, 'startup')
                """,
                "audit_platform_bootstrap_" + UUID.randomUUID(),
                PLATFORM_TENANT_ID,
                "Created bootstrap Platform Super Admin " + normalizedEmail,
                userId);
        return "created";
    }

    private boolean anyConfigured() {
        return !isBlank(fullName) || !isBlank(email) || !isBlank(phone) || !isBlank(password);
    }

    private void validateConfiguration() {
        List<String> missing = new ArrayList<>();
        if (isBlank(fullName)) missing.add("SACCO_BOOTSTRAP_PLATFORM_ADMIN_FULL_NAME");
        if (isBlank(email)) missing.add("SACCO_BOOTSTRAP_PLATFORM_ADMIN_EMAIL");
        if (isBlank(password)) missing.add("SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD");
        if (!missing.isEmpty()) {
            throw new IllegalStateException("Bootstrap Platform Super Admin configuration is incomplete: " + String.join(", ", missing));
        }
        if (!email.contains("@")) {
            throw new IllegalStateException("SACCO_BOOTSTRAP_PLATFORM_ADMIN_EMAIL must be a valid email address.");
        }
        if (password.length() < 10
                || password.chars().noneMatch(Character::isUpperCase)
                || password.chars().noneMatch(Character::isLowerCase)
                || password.chars().noneMatch(Character::isDigit)) {
            throw new IllegalStateException("SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD must be at least 10 characters and include uppercase, lowercase, and a number.");
        }
    }

    private boolean activeUserExists(String normalizedEmail) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM users
                WHERE tenant_id = ?
                  AND LOWER(email) = ?
                  AND status <> 'deleted'
                """, Integer.class, PLATFORM_TENANT_ID, normalizedEmail);
        return count != null && count > 0;
    }

    private boolean roleExists() {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM roles WHERE id = ? AND tenant_id = ?",
                Integer.class,
                SUPER_ADMIN_ROLE_ID,
                PLATFORM_TENANT_ID);
        return count != null && count > 0;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
