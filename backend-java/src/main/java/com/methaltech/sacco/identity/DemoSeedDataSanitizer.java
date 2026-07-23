package com.methaltech.sacco.identity;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class DemoSeedDataSanitizer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final boolean demoLoginsEnabled;

    DemoSeedDataSanitizer(
            JdbcTemplate jdbcTemplate,
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled) {
        this.jdbcTemplate = jdbcTemplate;
        this.demoLoginsEnabled = demoLoginsEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        sanitizeIfNeeded();
    }

    int sanitizeIfNeeded() {
        if (demoLoginsEnabled) {
            return 0;
        }
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
                    OR membership_no LIKE 'GVS-000_'
                    OR membership_no LIKE 'LFS-000_'
                  )
                """);
        int totalUpdates = staffUpdates + memberUpdates;
        if (totalUpdates > 0) {
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
                    ) VALUES (?, 'tenant_platform', NULL, 'System', ?, 'demo_seed_data', ?, 'startup')
                    """,
                    "audit_demo_seed_sanitizer_" + UUID.randomUUID(),
                    "Suspended seeded demo accounts because demo logins are disabled.",
                    String.valueOf(totalUpdates));
        }
        return totalUpdates;
    }
}
