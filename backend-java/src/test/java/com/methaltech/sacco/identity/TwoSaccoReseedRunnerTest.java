package com.methaltech.sacco.identity;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.tenant.TenantPurgeService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class TwoSaccoReseedRunnerTest {

    @Test
    void completesPendingReseedAndDeliversEveryOfficialCredential() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        TenantPurgeService purgeService = mock(TenantPurgeService.class);
        UserRepository userRepository = mock(UserRepository.class);
        StaffOnboardingService onboardingService = mock(StaffOnboardingService.class);
        when(jdbcTemplate.queryForObject(contains("system_reseed_events"), eq(Integer.class), any())).thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("FROM tenants"), eq(Integer.class), any(), any())).thenReturn(0);
        when(jdbcTemplate.queryForList(contains("LOWER(name)"), eq(String.class), eq("A-Z Community Group")))
                .thenReturn(List.of("tenant_hoima"));
        when(jdbcTemplate.queryForList(contains("LOWER(name)"), eq(String.class), eq("Mutwe Community Group")))
                .thenReturn(List.of("tenant_gulu"));
        when(jdbcTemplate.queryForList(contains("id <> 'tenant_platform'"), eq(String.class), any(), any()))
                .thenReturn(List.of("tenant_old"));
        when(jdbcTemplate.queryForList(contains("linked_user_id"), eq(String.class), any(), any()))
                .thenReturn(List.of("u1", "u2", "u3", "u4", "u5", "u6"));
        when(userRepository.findById(anyString())).thenAnswer(invocation -> Optional.of(pendingUser(invocation.getArgument(0))));
        when(onboardingService.reissueTemporaryPassword(any(User.class), eq("email")))
                .thenAnswer(invocation -> invocation.getArgument(0));

        new TwoSaccoReseedRunner(jdbcTemplate, purgeService, userRepository, onboardingService).run(null);

        verify(purgeService).purgeTenantsForReseed(List.of("tenant_old"));
        verify(onboardingService, times(6)).reissueTemporaryPassword(any(User.class), eq("email"));
        verify(jdbcTemplate).update(
                contains("status = 'complete'"),
                eq("Retained exactly two SACCOs, preserved their related baseline data, and delivered new temporary passwords to six official accounts."),
                eq("retain_two_community_groups_2026_v2"));
    }

    @Test
    void skipsAnAlreadyCompletedReseed() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        TenantPurgeService purgeService = mock(TenantPurgeService.class);
        UserRepository userRepository = mock(UserRepository.class);
        StaffOnboardingService onboardingService = mock(StaffOnboardingService.class);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any())).thenReturn(0);

        new TwoSaccoReseedRunner(jdbcTemplate, purgeService, userRepository, onboardingService).run(null);

        verify(purgeService, never()).purgeTenants(any());
        verify(onboardingService, never()).reissueTemporaryPassword(any(), anyString());
    }

    @Test
    void recordsFailureWhenNonRetainedTenantsRemain() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        TenantPurgeService purgeService = mock(TenantPurgeService.class);
        UserRepository userRepository = mock(UserRepository.class);
        StaffOnboardingService onboardingService = mock(StaffOnboardingService.class);
        when(jdbcTemplate.queryForObject(contains("system_reseed_events"), eq(Integer.class), any())).thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("FROM tenants"), eq(Integer.class), any(), any())).thenReturn(1);
        when(jdbcTemplate.queryForList(contains("LOWER(name)"), eq(String.class), eq("A-Z Community Group")))
                .thenReturn(List.of("tenant_hoima"));
        when(jdbcTemplate.queryForList(contains("LOWER(name)"), eq(String.class), eq("Mutwe Community Group")))
                .thenReturn(List.of("tenant_gulu"));
        when(jdbcTemplate.queryForList(contains("id <> 'tenant_platform'"), eq(String.class), any(), any()))
                .thenReturn(List.of("tenant_old"));

        assertThrows(IllegalStateException.class,
                () -> new TwoSaccoReseedRunner(jdbcTemplate, purgeService, userRepository, onboardingService).run(null));

        verify(jdbcTemplate).update(
                contains("status = 'failed'"),
                eq("Could not purge all non-retained SACCOs."),
                eq("retain_two_community_groups_2026_v2"));
        verify(onboardingService, never()).reissueTemporaryPassword(any(), anyString());
    }

    private User pendingUser(String id) {
        User user = new User(id, "tenant_green", id, id + "@example.com", "", "hash", "salt", "active");
        user.beginOnboarding("email");
        return user;
    }
}
