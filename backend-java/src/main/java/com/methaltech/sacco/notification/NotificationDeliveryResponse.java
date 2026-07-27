package com.methaltech.sacco.notification;

import java.time.Instant;

record NotificationDeliveryResponse(
        String id,
        String tenantId,
        String notificationId,
        String memberId,
        String userId,
        String channel,
        String provider,
        String recipient,
        String status,
        String message,
        Instant sentAt,
        Instant createdAt,
        String notificationStatus,
        Instant readAt,
        String eventType,
        String title,
        String resourceType,
        String resourceId) {

    static NotificationDeliveryResponse from(NotificationDelivery delivery) {
        return from(delivery, null);
    }

    static NotificationDeliveryResponse from(NotificationDelivery delivery, Notification notification) {
        return new NotificationDeliveryResponse(
                delivery.getId(),
                delivery.getTenantId(),
                delivery.getNotificationId(),
                delivery.getMemberId(),
                delivery.getUserId(),
                delivery.getChannel(),
                delivery.getProvider(),
                delivery.getRecipient(),
                delivery.getStatus(),
                delivery.getMessage(),
                delivery.getSentAt(),
                delivery.getCreatedAt(),
                notification == null ? null : notification.getStatus(),
                notification == null ? null : notification.getReadAt(),
                notification == null ? null : notification.getEventType(),
                notification == null ? null : notification.getTitle(),
                notification == null ? null : notification.getResourceType(),
                notification == null ? null : notification.getResourceId());
    }
}
