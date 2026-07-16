package com.methaltech.sacco.notification;

import java.time.Instant;

record NotificationDeliveryResponse(
        String id,
        String tenantId,
        String notificationId,
        String memberId,
        String channel,
        String provider,
        String recipient,
        String status,
        String message,
        Instant sentAt,
        Instant createdAt) {

    static NotificationDeliveryResponse from(NotificationDelivery delivery) {
        return new NotificationDeliveryResponse(
                delivery.getId(),
                delivery.getTenantId(),
                delivery.getNotificationId(),
                delivery.getMemberId(),
                delivery.getChannel(),
                delivery.getProvider(),
                delivery.getRecipient(),
                delivery.getStatus(),
                delivery.getMessage(),
                delivery.getSentAt(),
                delivery.getCreatedAt());
    }
}
