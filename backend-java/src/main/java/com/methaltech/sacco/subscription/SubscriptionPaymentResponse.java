package com.methaltech.sacco.subscription;

import java.math.BigDecimal;
import java.time.Instant;

public record SubscriptionPaymentResponse(
        String id,
        String subscriptionId,
        String tenantId,
        BigDecimal amount,
        String channel,
        String externalReference,
        Instant receivedAt,
        String recordedByUserId,
        Instant createdAt) {

    public static SubscriptionPaymentResponse from(SubscriptionPayment payment) {
        return new SubscriptionPaymentResponse(
                payment.getId(),
                payment.getSubscriptionId(),
                payment.getTenantId(),
                payment.getAmount(),
                payment.getChannel(),
                payment.getExternalReference(),
                payment.getReceivedAt(),
                payment.getRecordedByUserId(),
                payment.getCreatedAt());
    }
}
