package com.methaltech.sacco.accounting;

interface MobileMoneyProvider {
    String providerId();

    /** Whether this provider has the credentials it needs to be used. Unconfigured providers are
     *  skipped by the router. Demo/always-available providers return {@code true}. */
    default boolean isConfigured() {
        return true;
    }

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
