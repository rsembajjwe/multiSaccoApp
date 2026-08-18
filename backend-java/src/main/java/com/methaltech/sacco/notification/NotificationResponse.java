package com.methaltech.sacco.notification;

import java.time.Instant;

public record NotificationResponse(
        String id,
        String tenantId,
        String memberId,
        String userId,
        String channel,
        String eventType,
        String category,
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
                notification.getUserId(),
                notification.getChannel(),
                notification.getEventType(),
                categoryFor(notification.getEventType()),
                notification.getTitle(),
                notification.getBody(),
                notification.getStatus(),
                notification.getResourceType(),
                notification.getResourceId(),
                notification.getCreatedAt(),
                notification.getReadAt());
    }

    /**
     * Classifies a notification into a message-repository category so transaction messages, SACCO
     * announcements, support replies and security alerts can be filtered together in one inbox.
     */
    static String categoryFor(String eventType) {
        if (eventType == null) {
            return "system";
        }
        return switch (eventType) {
            case "payment_received", "loan_repayment_received", "payment_pending_approval", "payment_request_closed" -> "transaction";
            case "loan_application_submitted" -> "loan";
            case "sacco_announcement" -> "sacco_message";
            case "chat_reply", "complaint_reply", "complaint_synced" -> "support";
            case "security_login_risk" -> "security";
            default -> "system";
        };
    }
}
