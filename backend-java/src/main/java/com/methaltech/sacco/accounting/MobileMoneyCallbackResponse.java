package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;

record MobileMoneyCallbackResponse(
        String id,
        String tenantId,
        String memberId,
        String purpose,
        BigDecimal amount,
        String externalReference,
        String provider,
        String status,
        String resourceType,
        String resourceId,
        Instant receivedAt,
        Instant createdAt,
        boolean duplicate,
        String suggestedCollectionAccountId,
        String suggestedCollectionAccount,
        String collectionAccountId,
        String collectionAccount) {

    static MobileMoneyCallbackResponse from(MobileMoneyCallback callback) {
        return from(callback, false, null, null);
    }

    static MobileMoneyCallbackResponse from(MobileMoneyCallback callback, boolean duplicate) {
        return from(callback, duplicate, null, null);
    }

    static MobileMoneyCallbackResponse from(
            MobileMoneyCallback callback, boolean duplicate, com.methaltech.sacco.tenant.SaccoPaymentAccount suggested) {
        return from(callback, duplicate, suggested, null);
    }

    /**
     * Reconciliation view. {@code suggested} is the network-matched account; {@code confirmed} is the
     * account a staff member persisted on the callback (takes precedence over the suggestion). Either
     * may be null.
     */
    static MobileMoneyCallbackResponse from(
            MobileMoneyCallback callback,
            boolean duplicate,
            com.methaltech.sacco.tenant.SaccoPaymentAccount suggested,
            com.methaltech.sacco.tenant.SaccoPaymentAccount confirmed) {
        return new MobileMoneyCallbackResponse(
                callback.getId(),
                callback.getTenantId(),
                callback.getMemberId(),
                callback.getPurpose(),
                callback.getAmount(),
                callback.getExternalReference(),
                callback.getProvider(),
                callback.getStatus(),
                callback.getResourceType(),
                callback.getResourceId(),
                callback.getReceivedAt(),
                callback.getCreatedAt(),
                duplicate,
                suggested == null ? null : suggested.getId(),
                suggested == null ? null : collectionAccountLabel(suggested),
                callback.getCollectionAccountId(),
                confirmed == null ? null : collectionAccountLabel(confirmed));
    }

    private static String collectionAccountLabel(com.methaltech.sacco.tenant.SaccoPaymentAccount account) {
        String network = account.getNetwork() == null || account.getNetwork().isBlank()
                ? "Mobile money"
                : account.getNetwork().toUpperCase(java.util.Locale.ROOT);
        return network + " " + account.getAccountNumber();
    }
}
