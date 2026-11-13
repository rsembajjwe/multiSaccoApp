package com.methaltech.sacco.identity;

import com.methaltech.sacco.tenant.TenantPurgeService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "sacco.reseed.two-saccos.enabled", havingValue = "true")
class TwoSaccoReseedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TwoSaccoReseedRunner.class);
    private static final String EVENT_ID = "retain_two_community_groups_2026_v3";
    private static final String AZ_NAME = "A-Z Community Group";
    private static final String MUTWE_NAME = "Mutwe Community Group";

    private final JdbcTemplate jdbcTemplate;
    private final TenantPurgeService tenantPurgeService;
    private final UserRepository userRepository;
    private final StaffOnboardingService onboardingService;

    TwoSaccoReseedRunner(
            JdbcTemplate jdbcTemplate,
            TenantPurgeService tenantPurgeService,
            UserRepository userRepository,
            StaffOnboardingService onboardingService) {
        this.jdbcTemplate = jdbcTemplate;
        this.tenantPurgeService = tenantPurgeService;
        this.userRepository = userRepository;
        this.onboardingService = onboardingService;
    }

    @Override
    public void run(ApplicationArguments args) {
        Integer pending = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM system_reseed_events WHERE id = ? AND status <> 'complete'",
                Integer.class,
                EVENT_ID);
        if (pending == null || pending == 0) return;

        jdbcTemplate.update("""
                UPDATE system_reseed_events
                SET status = 'running', started_at = CURRENT_TIMESTAMP, completed_at = NULL, details = ?
                WHERE id = ?
                """, "Purging all other SACCOs and refreshing the two retained community groups.", EVENT_ID);

        List<String> retainedTenantIds = retainedTenantIds();
        if (retainedTenantIds.size() != 2) {
            fail("Expected exactly A-Z Community Group and Mutwe Community Group before reseeding.");
        }
        List<String> purgeTargets = jdbcTemplate.queryForList(
                "SELECT id FROM tenants WHERE id <> 'tenant_platform' AND id NOT IN (?, ?)",
                String.class,
                retainedTenantIds.get(0),
                retainedTenantIds.get(1));
        tenantPurgeService.purgeTenantsForReseed(purgeTargets);
        Integer remaining = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tenants WHERE id <> 'tenant_platform' AND id NOT IN (?, ?)",
                Integer.class,
                retainedTenantIds.get(0),
                retainedTenantIds.get(1));
        if (remaining != null && remaining > 0) {
            fail("Could not purge all non-retained SACCOs.");
        }

        normalizeRetainedSaccos(retainedTenantIds);
        List<String> officialUserIds = officialUserIds(retainedTenantIds);
        if (officialUserIds.size() != 6) {
            fail("Expected chairperson, secretary, and treasurer accounts for each retained SACCO.");
        }
        for (String userId : officialUserIds) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalStateException("Missing seeded official " + userId));
            onboardingService.reissueTemporaryPassword(user, "email");
        }
        User proprietor = userRepository.findByTenantIdAndEmailIgnoreCase("tenant_platform", "rsembajjwe@gmail.com")
                .orElseThrow(() -> new IllegalStateException("Missing proprietor account rsembajjwe@gmail.com"));
        onboardingService.reissueTemporaryPassword(proprietor, "email");

        jdbcTemplate.update(
                "UPDATE system_reseed_events SET status = 'complete', completed_at = CURRENT_TIMESTAMP, details = ? WHERE id = ?",
                "Retained exactly two SACCOs and delivered temporary passwords to six officials and the proprietor account.",
                EVENT_ID);
        log.info("Two-SACCO reseed completed; retained A-Z Community Group and Mutwe Community Group.");
    }

    private List<String> retainedTenantIds() {
        Set<String> ids = new LinkedHashSet<>();
        ids.addAll(jdbcTemplate.queryForList(
                "SELECT id FROM tenants WHERE LOWER(name) = LOWER(?) ORDER BY created_at, id",
                String.class,
                AZ_NAME));
        ids.addAll(jdbcTemplate.queryForList(
                "SELECT id FROM tenants WHERE LOWER(name) = LOWER(?) ORDER BY created_at, id",
                String.class,
                MUTWE_NAME));
        return List.copyOf(ids);
    }

    private void normalizeRetainedSaccos(List<String> tenantIds) {
        jdbcTemplate.update("UPDATE tenants SET name = ?, district = 'Kampala', status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                AZ_NAME, tenantIds.get(0));
        jdbcTemplate.update("UPDATE tenants SET name = ?, district = 'Wakiso', status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                MUTWE_NAME, tenantIds.get(1));
        jdbcTemplate.update("UPDATE branches SET name = 'Kampala Main', address = 'Kampala', status = 'active' WHERE tenant_id = ?",
                tenantIds.get(0));
        jdbcTemplate.update("UPDATE branches SET name = 'Lukwanga Main', address = 'Lukwanga, Wakiso District', status = 'active' WHERE tenant_id = ?",
                tenantIds.get(1));
        jdbcTemplate.update("UPDATE sacco_profiles SET legal_name = ?, address = 'Kampala, Uganda', email = 'rsembajjwe@gmail.com', updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?",
                AZ_NAME, tenantIds.get(0));
        jdbcTemplate.update("UPDATE sacco_profiles SET legal_name = ?, address = 'Lukwanga, Wakiso District, Uganda', email = 'rsembajjwe@gmail.com', updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?",
                MUTWE_NAME, tenantIds.get(1));
        jdbcTemplate.update("UPDATE subscriptions SET status = 'active', expiry = DATE '2027-12-31', updated_at = CURRENT_TIMESTAMP WHERE tenant_id IN (?, ?)",
                tenantIds.get(0), tenantIds.get(1));
    }

    private List<String> officialUserIds(List<String> tenantIds) {
        return jdbcTemplate.queryForList("""
                SELECT DISTINCT m.linked_user_id
                FROM sacco_official_assignments a
                JOIN members m ON m.id = a.member_id AND m.tenant_id = a.tenant_id
                WHERE a.tenant_id IN (?, ?)
                  AND LOWER(a.office) IN ('chairperson', 'secretary', 'treasurer')
                  AND m.linked_user_id IS NOT NULL
                ORDER BY m.linked_user_id
                """, String.class, tenantIds.get(0), tenantIds.get(1));
    }

    private void fail(String details) {
        jdbcTemplate.update(
                "UPDATE system_reseed_events SET status = 'failed', details = ? WHERE id = ?",
                details,
                EVENT_ID);
        throw new IllegalStateException(details);
    }
}
