package com.methaltech.sacco.accounting;

interface MobileMoneyProvider {
    String providerId();

    MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request);

    default String normalizeProvider(String requestedProvider) {
        return requestedProvider == null || requestedProvider.isBlank()
                ? providerId()
                : requestedProvider.trim();
    }
}
