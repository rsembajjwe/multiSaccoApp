package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.util.Map;

record MobileMoneyPaymentRequest(
        String tenantId,
        String memberId,
        String memberIdentifier,
        String loanId,
        String purpose,
        BigDecimal amount,
        String currencyCode,
        String payerPhone,
        String externalReference,
        String provider,
        Map<String, Object> providerPayload) {
}
