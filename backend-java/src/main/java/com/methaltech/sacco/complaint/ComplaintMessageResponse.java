package com.methaltech.sacco.complaint;

import java.time.Instant;

public record ComplaintMessageResponse(
        String id,
        String senderType,
        String senderUserId,
        String senderMemberId,
        String visibility,
        String action,
        String message,
        Instant createdAt) {

    public static ComplaintMessageResponse from(ComplaintMessage message) {
        return new ComplaintMessageResponse(
                message.getId(),
                message.getSenderType(),
                message.getSenderUserId(),
                message.getSenderMemberId(),
                message.getVisibility(),
                message.getAction(),
                message.getMessage(),
                message.getCreatedAt());
    }
}
