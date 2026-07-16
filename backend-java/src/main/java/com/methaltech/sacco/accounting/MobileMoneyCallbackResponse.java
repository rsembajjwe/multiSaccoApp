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
        boolean duplicate) {

    static MobileMoneyCallbackResponse from(MobileMoneyCallback callback) {
        return from(callback, false);
    }

    static MobileMoneyCallbackResponse from(MobileMoneyCallback callback, boolean duplicate) {
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
                duplicate);
    }
}
