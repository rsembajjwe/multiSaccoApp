package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AccountingPeriodServiceTest {

    private final AccountingPeriodRepository repository = mock(AccountingPeriodRepository.class);
    private final AccountingPeriodService service = new AccountingPeriodService(repository);

    @Test
    void periodKeyUsesYearAndMonthForInstantAndLocalDate() {
        assertEquals("2026-08", service.periodKey(Instant.parse("2026-08-14T09:00:00Z")));
        assertEquals("2026-08", service.periodKey(LocalDate.of(2026, 8, 31)));
    }

    @Test
    void missingAccountingPeriodIsTreatedAsOpen() {
        when(repository.findByTenantIdAndPeriod("tenant_green", "2026-08")).thenReturn(Optional.empty());

        assertFalse(service.isClosed("tenant_green", Instant.parse("2026-08-14T09:00:00Z")));
        assertFalse(service.isClosed("tenant_green", LocalDate.of(2026, 8, 14)));
    }

    @Test
    void closedAccountingPeriodBlocksPosting() {
        AccountingPeriod period = new AccountingPeriod("period_1", "tenant_green", "2026-08", "closed", "user_treasurer");
        when(repository.findByTenantIdAndPeriod("tenant_green", "2026-08")).thenReturn(Optional.of(period));

        assertTrue(service.isClosed("tenant_green", Instant.parse("2026-08-14T09:00:00Z")));
        assertTrue(service.isClosed("tenant_green", LocalDate.of(2026, 8, 14)));
    }

    @Test
    void updateStatusTracksCloserAndClearsClosureWhenReopened() {
        AccountingPeriod period = new AccountingPeriod("period_2", "tenant_green", "2026-08", "open", null);

        period.updateStatus("closed", "user_treasurer");

        assertEquals("closed", period.getStatus());
        assertEquals("user_treasurer", period.getClosedByUserId());
        assertNotNull(period.getClosedAt());

        period.updateStatus("open", "user_manager");

        assertEquals("open", period.getStatus());
        assertNull(period.getClosedByUserId());
        assertNull(period.getClosedAt());
    }
}
