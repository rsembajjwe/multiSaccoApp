package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;

record MobileMoneyPaymentResult(
        String id,
        String tenantId,
        String memberId,
        String purpose,
        BigDecimal amount,
        String currencyCode,
        String provider,
        String externalReference,
        String providerReference,
        String status,
        String statusMessage,
        String checkoutPrompt,
        boolean callbackPosting,
        Instant requestedAt) {
}
