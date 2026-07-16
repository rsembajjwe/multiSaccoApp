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
@Table(name = "complaints")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Complaint {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    private String category;
    private String subject;
    private String description;
    private String channel;
    private String priority;
    private String status;

    @Column(name = "resolution_notes")
    private String resolutionNotes;

    @Column(name = "assigned_user_id")
    private String assignedUserId;

    @Column(name = "resolved_by_user_id")
    private String resolvedByUserId;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_by_member_id")
    private String createdByMemberId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    Complaint(
            String id,
            String tenantId,
            String memberId,
            String category,
            String subject,
            String description,
            String channel,
            String priority,
            String status,
            String assignedUserId,
            String createdByUserId,
            String createdByMemberId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.category = category;
        this.subject = subject;
        this.description = description;
        this.channel = channel;
        this.priority = priority;
        this.status = status;
        this.assignedUserId = assignedUserId;
        this.createdByUserId = createdByUserId;
        this.createdByMemberId = createdByMemberId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void updateStatus(String status, String resolutionNotes, String resolvedByUserId) {
        this.status = status;
        this.resolutionNotes = resolutionNotes;
        this.resolvedByUserId = "resolved".equals(status) || "closed".equals(status) ? resolvedByUserId : null;
        this.resolvedAt = this.resolvedByUserId == null ? null : Instant.now();
        this.updatedAt = Instant.now();
    }
}
