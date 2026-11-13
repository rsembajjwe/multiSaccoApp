package com.methaltech.sacco.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.User;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class TreasuryCashPostingServiceTest {

    private final TreasuryCashEntryRepository repository = mock(TreasuryCashEntryRepository.class);
    private final AuditService auditService = mock(AuditService.class);
    private final TreasuryCashPostingService service = new TreasuryCashPostingService(repository, auditService);
    private final User user = mock(User.class);

    @Test
    void recordsCollectionsAndPayoutsWithFinancialReferences() {
        when(user.getId()).thenReturn("user_treasurer");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.recordCollection(
                "tenant_green", "member_one", new BigDecimal("1000.125"), "COL-001",
                "Savings collection", user, "127.0.0.1");
        service.recordMemberPayout(
                "tenant_green", "member_one", new BigDecimal("250"), "PAY-001",
                "Member withdrawal", user, "127.0.0.1");

        ArgumentCaptor<TreasuryCashEntry> entries = ArgumentCaptor.forClass(TreasuryCashEntry.class);
        verify(repository, org.mockito.Mockito.times(2)).save(entries.capture());
        TreasuryCashEntry collection = entries.getAllValues().get(0);
        TreasuryCashEntry payout = entries.getAllValues().get(1);
        assertEquals(TreasuryCashEntry.IN, collection.getDirection());
        assertEquals("collection", collection.getPurpose());
        assertEquals(new BigDecimal("1000.13"), collection.getAmount());
        assertEquals("COL-001", collection.getReference());
        assertEquals(TreasuryCashEntry.OUT, payout.getDirection());
        assertEquals("member_payout", payout.getPurpose());
        assertEquals("PAY-001", payout.getReference());
        verify(auditService, org.mockito.Mockito.times(2)).record(
                eq("tenant_green"), eq(user), any(), eq("treasury_cash_entry"), any(), eq("127.0.0.1"));
    }
}
