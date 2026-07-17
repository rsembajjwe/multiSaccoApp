package com.methaltech.sacco.notification;

import java.time.Instant;

record NotificationTemplateResponse(
        String id,
        String tenantId,
        String channel,
        String eventType,
        String title,
        String body,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    static NotificationTemplateResponse from(NotificationTemplate template) {
        return new NotificationTemplateResponse(
                template.getId(),
                template.getTenantId(),
                template.getChannel(),
                template.getEventType(),
                template.getTitle(),
                template.getBody(),
                template.getStatus(),
                template.getCreatedAt(),
                template.getUpdatedAt());
    }
}
