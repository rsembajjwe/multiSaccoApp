package com.methaltech.sacco.chat;

import java.time.Instant;

public record ChatMessageResponse(
        String id,
        String threadId,
        String senderType,
        String senderId,
        String senderName,
        String body,
        Instant createdAt) {
}
