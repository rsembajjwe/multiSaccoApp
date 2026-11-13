package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class MobileMoneyPaymentRequestEntityTest {

    @Test
    void createsPaymentRequestFromProviderResultAndTrimsBlankLoanId() {
        Instant requestedAt = Instant.parse("2026-08-14T09:00:00Z");
        MobileMoneyPaymentRequestEntity request = MobileMoneyPaymentRequestEntity.from(new MobileMoneyPaymentResult(
                "pay_1",
                "tenant_green",
                "member_amina",
                "savings_deposit",
                new BigDecimal("45000"),
                "UGX",
                "mtn_momo",
                "EXT-1",
                "PROV-1",
                "pending",
                "Awaiting member approval",
                "Approve on phone",
                false,
                requestedAt), " ", "+256700000001", "{\"raw\":true}");

        assertEquals("pay_1", request.getId());
        assertEquals("tenant_green", request.getTenantId());
        assertEquals("member_amina", request.getMemberId());
        assertNull(request.getLoanId());
        assertEquals("savings_deposit", request.getPurpose());
        assertEquals(0, request.getAmount().compareTo(new BigDecimal("45000")));
        assertEquals("UGX", request.getCurrencyCode());
        assertEquals("+256700000001", request.getPayerPhone());
        assertEquals("EXT-1", request.getExternalReference());
        assertEquals("mtn_momo", request.getProvider());
        assertEquals("PROV-1", request.getProviderReference());
        assertEquals("pending", request.getStatus());
        assertEquals("Awaiting member approval", request.getStatusMessage());
        assertEquals("Approve on phone", request.getCheckoutPrompt());
        assertFalse(request.isCallbackPosting());
        assertEquals(requestedAt, request.getRequestedAt());
        assertNotNull(request.getCreatedAt());
        assertNotNull(request.getUpdatedAt());
    }

    @Test
    void markPostedRecordsCallbackResourceAndCompletionTime() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();

        request.markPosted("financial_transaction", "txn_1");

        assertEquals("posted", request.getStatus());
        assertEquals("Provider callback posted financial_transaction txn_1.", request.getStatusMessage());
        assertNotNull(request.getCompletedAt());
        assertEquals(request.getCompletedAt(), request.getUpdatedAt());
    }

    @Test
    void markPendingApprovalKeepsRequestOpenAndRecordsResource() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();

        request.markPendingApproval("financial_transaction", "txn_1");

        assertEquals("pending_approval", request.getStatus());
        assertEquals(
                "Payment received; awaiting approval of financial_transaction txn_1.",
                request.getStatusMessage());
        assertNull(request.getCompletedAt());
        assertNotNull(request.getUpdatedAt());
    }

    @Test
    void manualFailureStatusCompletesRequestAndUsesDefaultReasonWhenBlank() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();

        request.updateStatus("failed", " ");

        assertEquals("failed", request.getStatus());
        assertEquals("Payment request marked failed.", request.getStatusMessage());
        assertNotNull(request.getCompletedAt());
    }

    @Test
    void rejectedFinancialDecisionCompletesReceivedPaymentRequest() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();
        request.markPendingApproval("financial_transaction", "txn_1");

        request.updateStatus("rejected", "Payment received but rejected during financial review: duplicate receipt");

        assertEquals("rejected", request.getStatus());
        assertEquals("Payment received but rejected during financial review: duplicate receipt", request.getStatusMessage());
        assertNotNull(request.getCompletedAt());
    }

    @Test
    void providerStatusFailureCompletesRequestAtProviderCheckTime() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();
        Instant checkedAt = Instant.parse("2026-08-14T10:00:00Z");

        request.syncProviderStatus(new MobileMoneyProviderStatusResult(
                "expired",
                "Member did not approve in time",
                "PROV-2",
                "EXPIRED",
                false,
                checkedAt));

        assertEquals("expired", request.getStatus());
        assertEquals("Member did not approve in time", request.getStatusMessage());
        assertEquals("PROV-2", request.getProviderReference());
        assertFalse(request.isCallbackPosting());
        assertEquals(checkedAt, request.getCompletedAt());
        assertEquals(checkedAt, request.getUpdatedAt());
    }

    @Test
    void providerStatusPendingKeepsRequestOpenForRetry() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();
        Instant checkedAt = Instant.parse("2026-08-14T10:00:00Z");

        request.syncProviderStatus(new MobileMoneyProviderStatusResult(
                "pending",
                "Still pending",
                "PROV-3",
                "PENDING",
                true,
                checkedAt));

        assertEquals("pending", request.getStatus());
        assertEquals("Still pending", request.getStatusMessage());
        assertEquals("PROV-3", request.getProviderReference());
        assertTrue(request.isCallbackPosting());
        assertNull(request.getCompletedAt());
        assertEquals(checkedAt, request.getUpdatedAt());
    }

    @Test
    void providerStatusCheckFailureDoesNotChangePendingStatus() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();

        request.recordProviderStatusCheckFailure("");

        assertEquals("pending", request.getStatus());
        assertEquals("Provider status check failed; request remains pending for retry.", request.getStatusMessage());
        assertNull(request.getCompletedAt());
        assertNotNull(request.getUpdatedAt());
    }

    @Test
    void providerStatusCannotRegressPendingApproval() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();
        request.markPendingApproval("financial_transaction", "txn_1");
        String message = request.getStatusMessage();
        Instant updatedAt = request.getUpdatedAt();

        request.syncProviderStatus(new MobileMoneyProviderStatusResult(
                "paid_pending_callback",
                "Provider confirms payment",
                "PROV-1",
                "SUCCESSFUL",
                true,
                Instant.parse("2026-08-14T11:00:00Z")));

        assertEquals("pending_approval", request.getStatus());
        assertEquals(message, request.getStatusMessage());
        assertEquals(updatedAt, request.getUpdatedAt());
    }

    @Test
    void providerStatusCannotReopenManuallyClosedRequest() {
        MobileMoneyPaymentRequestEntity request = pendingRequest();
        request.updateStatus("cancelled", "Cancelled by staff");

        request.syncProviderStatus(new MobileMoneyProviderStatusResult(
                "pending_provider_confirmation",
                "Provider still processing",
                "PROV-1",
                "PENDING",
                true,
                Instant.parse("2026-08-14T11:00:00Z")));

        assertEquals("cancelled", request.getStatus());
        assertEquals("Cancelled by staff", request.getStatusMessage());
        assertNotNull(request.getCompletedAt());
    }

    private static MobileMoneyPaymentRequestEntity pendingRequest() {
        return MobileMoneyPaymentRequestEntity.from(new MobileMoneyPaymentResult(
                "pay_1",
                "tenant_green",
                "member_amina",
                "savings_deposit",
                new BigDecimal("45000"),
                "UGX",
                "mtn_momo",
                "EXT-1",
                "PROV-1",
                "pending",
                "Awaiting member approval",
                "Approve on phone",
                false,
                Instant.parse("2026-08-14T09:00:00Z")), null, "+256700000001", "{}");
    }
}
