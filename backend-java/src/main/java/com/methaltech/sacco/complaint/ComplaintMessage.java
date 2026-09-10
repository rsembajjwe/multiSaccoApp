package com.methaltech.sacco.complaint;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "complaint_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ComplaintMessage {

    @Id
    private String id;

    @Column(name = "complaint_id")
    private String complaintId;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "sender_type")
    private String senderType;

    @Column(name = "sender_user_id")
    private String senderUserId;

    @Column(name = "sender_member_id")
    private String senderMemberId;

    private String visibility;
    private String action;
    private String message;

    @Column(name = "created_at")
    private Instant createdAt;

    ComplaintMessage(
            String id,
            String complaintId,
            String tenantId,
            String senderType,
            String senderUserId,
            String senderMemberId,
            String visibility,
            String action,
            String message) {
        this.id = id;
        this.complaintId = complaintId;
        this.tenantId = tenantId;
        this.senderType = senderType;
        this.senderUserId = senderUserId;
        this.senderMemberId = senderMemberId;
        this.visibility = visibility;
        this.action = action;
        this.message = message;
        this.createdAt = Instant.now();
    }
}
