package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;

record MobileMoneyPaymentRequestResponse(
        String id,
        String tenantId,
        String memberId,
        String loanId,
        String purpose,
        BigDecimal amount,
        String currencyCode,
        String payerPhone,
        String externalReference,
        String provider,
        String providerReference,
        String status,
        String statusMessage,
        String checkoutPrompt,
        boolean callbackPosting,
        Instant requestedAt,
        Instant completedAt,
        Instant createdAt,
        Instant updatedAt) {

    static MobileMoneyPaymentRequestResponse from(MobileMoneyPaymentRequestEntity request) {
        return new MobileMoneyPaymentRequestResponse(
                request.getId(),
                request.getTenantId(),
                request.getMemberId(),
                request.getLoanId(),
                request.getPurpose(),
                request.getAmount(),
                request.getCurrencyCode(),
                request.getPayerPhone(),
                request.getExternalReference(),
                request.getProvider(),
                request.getProviderReference(),
                request.getStatus(),
                request.getStatusMessage(),
                request.getCheckoutPrompt(),
                request.isCallbackPosting(),
                request.getRequestedAt(),
                request.getCompletedAt(),
                request.getCreatedAt(),
                request.getUpdatedAt());
    }
}
