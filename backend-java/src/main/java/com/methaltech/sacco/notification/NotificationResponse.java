package com.methaltech.sacco.notification;

import java.time.Instant;

public record NotificationResponse(
        String id,
        String tenantId,
        String memberId,
        String channel,
        String eventType,
        String title,
        String body,
        String status,
        String resourceType,
        String resourceId,
        Instant createdAt,
        Instant readAt) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTenantId(),
                notification.getMemberId(),
                notification.getChannel(),
                notification.getEventType(),
                notification.getTitle(),
                notification.getBody(),
                notification.getStatus(),
                notification.getResourceType(),
                notification.getResourceId(),
                notification.getCreatedAt(),
                notification.getReadAt());
    }
}
