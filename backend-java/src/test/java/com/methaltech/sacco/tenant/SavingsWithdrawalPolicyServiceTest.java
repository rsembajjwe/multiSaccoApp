package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SavingsWithdrawalPolicyServiceTest {

    private final SaccoProfileRepository repository = mock(SaccoProfileRepository.class);

    @Test
    void continuousCycleAllowsWithdrawalsEveryDay() {
        when(repository.findByTenantId("tenant_one")).thenReturn(Optional.empty());
        SavingsWithdrawalPolicyService service = serviceAt("2026-07-10T08:00:00Z");

        SavingsWithdrawalPolicyService.WithdrawalWindow result = service.current("tenant_one");

        assertTrue(result.allowed());
        assertEquals("continuous", result.period());
    }

    @Test
    void annualCycleOnlyAllowsConfiguredWindow() {
        SaccoProfile profile = new SaccoProfile(
                "profile_one", "tenant_one", "One SACCO", "", "", "", "", "", "", "");
        profile.updateSavingsCycle("annual", 12, 1, 15);
        when(repository.findByTenantId("tenant_one")).thenReturn(Optional.of(profile));

        SavingsWithdrawalPolicyService.WithdrawalWindow closed = serviceAt("2026-11-30T08:00:00Z").current("tenant_one");
        SavingsWithdrawalPolicyService.WithdrawalWindow open = serviceAt("2026-12-10T08:00:00Z").current("tenant_one");
        SavingsWithdrawalPolicyService.WithdrawalWindow expired = serviceAt("2026-12-20T08:00:00Z").current("tenant_one");

        assertFalse(closed.allowed());
        assertEquals(LocalDate.of(2026, 12, 1), closed.nextOpensOn());
        assertTrue(open.allowed());
        assertEquals(LocalDate.of(2026, 12, 15), open.closesOn());
        assertFalse(expired.allowed());
        assertEquals(LocalDate.of(2027, 12, 1), expired.nextOpensOn());
    }

    private SavingsWithdrawalPolicyService serviceAt(String instant) {
        return new SavingsWithdrawalPolicyService(
                repository,
                Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
    }
}
