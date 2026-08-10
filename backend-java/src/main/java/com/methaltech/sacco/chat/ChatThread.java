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
 * A support conversation. Every thread belongs to a SACCO ({@code tenantId}) for isolation, even
 * {@code PLATFORM_SUPPORT} threads between a SACCO and the Platform Super Admin.
 *
 * <p>Thread types:</p>
 * <ul>
 *   <li>{@code MEMBER_SUPPORT}   — a SACCO member and SACCO staff.</li>
 *   <li>{@code PLATFORM_SUPPORT} — SACCO staff and the Platform Super Admin.</li>
 * </ul>
 */
@Entity
@Table(name = "chat_threads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatThread {

    public static final String TYPE_MEMBER_SUPPORT = "MEMBER_SUPPORT";
    public static final String TYPE_PLATFORM_SUPPORT = "PLATFORM_SUPPORT";

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String type;

    @Column(name = "member_id")
    private String memberId;

    private String subject;

    private String status;

    @Column(name = "complaint_id")
    private String complaintId;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "member_last_read_at")
    private Instant memberLastReadAt;

    @Column(name = "staff_last_read_at")
    private Instant staffLastReadAt;

    @Column(name = "platform_last_read_at")
    private Instant platformLastReadAt;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_by_member_id")
    private String createdByMemberId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    ChatThread(
            String id,
            String tenantId,
            String type,
            String memberId,
            String subject,
            String status,
            String complaintId,
            String createdByUserId,
            String createdByMemberId) {
        this.id = id;
        this.tenantId = tenantId;
        this.type = type;
        this.memberId = memberId;
        this.subject = subject;
        this.status = status == null || status.isBlank() ? "open" : status;
        this.complaintId = complaintId;
        this.createdByUserId = createdByUserId;
        this.createdByMemberId = createdByMemberId;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.lastMessageAt = now;
    }

    void touch(Instant messageAt) {
        this.lastMessageAt = messageAt;
        this.updatedAt = Instant.now();
    }

    void markMemberRead(Instant at) {
        this.memberLastReadAt = at;
    }

    void markStaffRead(Instant at) {
        this.staffLastReadAt = at;
    }

    void markPlatformRead(Instant at) {
        this.platformLastReadAt = at;
    }

    void updateStatus(String status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }
}
