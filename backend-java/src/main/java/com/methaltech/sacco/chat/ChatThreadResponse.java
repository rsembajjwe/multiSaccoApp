package com.methaltech.sacco.chat;

import java.time.Instant;

public record ChatThreadResponse(
        String id,
        String tenantId,
        String tenantName,
        String type,
        String memberId,
        String memberName,
        String subject,
        String status,
        String complaintId,
        Instant lastMessageAt,
        String lastMessagePreview,
        String lastMessageSenderType,
        long unreadCount,
        Instant createdAt,
        Instant updatedAt) {
}
