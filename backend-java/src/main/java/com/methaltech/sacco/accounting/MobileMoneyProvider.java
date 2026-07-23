package com.methaltech.sacco.accounting;

interface MobileMoneyProvider {
    String providerId();

    MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request);

    default MobileMoneyProviderStatusResult queryPaymentStatus(MobileMoneyPaymentRequestEntity request) {
        return new MobileMoneyProviderStatusResult(
                request.getStatus(),
                "Provider status polling is not available for " + providerId() + ".",
                request.getProviderReference(),
                request.getStatus(),
                true,
                java.time.Instant.now());
    }

    default String normalizeProvider(String requestedProvider) {
        return requestedProvider == null || requestedProvider.isBlank()
                ? providerId()
                : requestedProvider.trim();
    }
}
