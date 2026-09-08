package com.methaltech.sacco.accounting;

interface MobileMoneyProvider {
    String providerId();

    /** Whether this provider has the credentials it needs to be used. Unconfigured providers are
     *  skipped by the router. Demo/always-available providers return {@code true}. */
    default boolean isConfigured() {
        return true;
    }

    /** Human-readable provider name for display (e.g. "MTN MoMo"). Defaults to the provider id. */
    default String label() {
        return providerId();
    }

    /** The provider's own account/float balance, fetched live. Unsupported providers return a
     *  non-supported result so the caller can skip them. */
    default MobileMoneyBalanceResult queryBalance() {
        return MobileMoneyBalanceResult.unsupported(providerId(), label());
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
