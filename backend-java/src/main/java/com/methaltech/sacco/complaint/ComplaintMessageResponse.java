package com.methaltech.sacco.complaint;

import java.time.Instant;

public record ComplaintMessageResponse(
        String id,
        String senderType,
        String senderUserId,
        String senderMemberId,
        String senderName,
        String senderRole,
        String senderCode,
        String visibility,
        String action,
        String message,
        Instant createdAt) {

    public static ComplaintMessageResponse from(ComplaintMessage message) {
        return from(message, "", "", "");
    }

    public static ComplaintMessageResponse from(
            ComplaintMessage message, String senderName, String senderRole, String senderCode) {
        return new ComplaintMessageResponse(
                message.getId(),
                message.getSenderType(),
                message.getSenderUserId(),
                message.getSenderMemberId(),
                senderName,
                senderRole,
                senderCode,
                message.getVisibility(),
                message.getAction(),
                message.getMessage(),
                message.getCreatedAt());
    }
}
