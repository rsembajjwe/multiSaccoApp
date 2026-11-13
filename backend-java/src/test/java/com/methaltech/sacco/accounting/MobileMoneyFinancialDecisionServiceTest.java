package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MobileMoneyFinancialDecisionServiceTest {

    private final MobileMoneyCallbackRepository callbacks = mock(MobileMoneyCallbackRepository.class);
    private final MobileMoneyPaymentRequestRepository requests = mock(MobileMoneyPaymentRequestRepository.class);
    private final MobileMoneyFinancialDecisionService service = new MobileMoneyFinancialDecisionService(callbacks, requests);

    @Test
    void postingFinancialTransactionClosesCallbackAndPaymentRequestTogether() {
        MobileMoneyCallback callback = callback();
        MobileMoneyPaymentRequestEntity request = paymentRequest();
        when(callbacks.findByTenantIdAndResourceTypeAndResourceId("tenant_green", "financial_transaction", "txn_1"))
                .thenReturn(Optional.of(callback));
        when(requests.findByTenantIdAndExternalReferenceIgnoreCase("tenant_green", "EXT-1"))
                .thenReturn(Optional.of(request));

        service.synchronize("tenant_green", "txn_1", "posted", "Verified against provider statement");

        assertEquals("posted", callback.getStatus());
        assertEquals("posted", request.getStatus());
        assertNotNull(request.getCompletedAt());
        verify(callbacks).save(callback);
        verify(requests).save(request);
    }

    @Test
    void rejectingFinancialTransactionPreservesReceivedFundsContext() {
        MobileMoneyCallback callback = callback();
        MobileMoneyPaymentRequestEntity request = paymentRequest();
        when(callbacks.findByTenantIdAndResourceTypeAndResourceId("tenant_green", "financial_transaction", "txn_1"))
                .thenReturn(Optional.of(callback));
        when(requests.findByTenantIdAndExternalReferenceIgnoreCase("tenant_green", "EXT-1"))
                .thenReturn(Optional.of(request));

        service.synchronize("tenant_green", "txn_1", "rejected", "Duplicate receipt");

        assertEquals("rejected", callback.getStatus());
        assertEquals("rejected", request.getStatus());
        assertEquals("Payment received but rejected during financial review: Duplicate receipt", request.getStatusMessage());
        assertNotNull(request.getCompletedAt());
    }

    private static MobileMoneyCallback callback() {
        return new MobileMoneyCallback(
                "callback_1", "tenant_green", "member_1", "savings_deposit",
                new BigDecimal("50000"), "EXT-1", "mtn", "{}", "pending_approval",
                "financial_transaction", "txn_1");
    }

    private static MobileMoneyPaymentRequestEntity paymentRequest() {
        MobileMoneyPaymentRequestEntity request = MobileMoneyPaymentRequestEntity.from(new MobileMoneyPaymentResult(
                "pay_1", "tenant_green", "member_1", "savings_deposit", new BigDecimal("50000"),
                "UGX", "mtn", "EXT-1", "provider_1", "pending", "Pending", "Approve", false,
                Instant.parse("2026-09-30T06:00:00Z")), null, "+256772000000", "{}");
        request.markPendingApproval("financial_transaction", "txn_1");
        return request;
    }
}
