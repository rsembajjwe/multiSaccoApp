package com.methaltech.sacco.accounting;

import java.util.List;

public record MobileMoneyProviderEvidence(
        int paymentRequests,
        int pendingPaymentRequests,
        int failedPaymentRequests,
        int postedPaymentRequests,
        int callbacksReceived,
        int callbacksPendingApproval,
        int callbacksPosted,
        List<MobileMoneyProviderRouter.PaymentProviderOption> providerOptions,
        MobileMoneyReconciliationSummary reconciliationSummary,
        String evidenceStatus) {
}
