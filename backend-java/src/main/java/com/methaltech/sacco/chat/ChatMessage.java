package com.methaltech.sacco.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A single message within a {@link ChatThread}. {@code senderId} is polymorphic (a member id or a
 * user id) and therefore intentionally not foreign-keyed; {@code senderType} disambiguates it.
 */
@Entity
@Table(name = "chat_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    public static final String SENDER_MEMBER = "MEMBER";
    public static final String SENDER_STAFF = "STAFF";
    public static final String SENDER_PLATFORM = "PLATFORM";

    @Id
    private String id;

    @Column(name = "thread_id")
    private String threadId;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "sender_type")
    private String senderType;

    @Column(name = "sender_id")
    private String senderId;

    private String body;

    @Column(name = "created_at")
    private Instant createdAt;

    ChatMessage(
            String id,
            String threadId,
            String tenantId,
            String senderType,
            String senderId,
            String body) {
        this.id = id;
        this.threadId = threadId;
        this.tenantId = tenantId;
        this.senderType = senderType;
        this.senderId = senderId;
        this.body = body;
        this.createdAt = Instant.now();
    }
}
