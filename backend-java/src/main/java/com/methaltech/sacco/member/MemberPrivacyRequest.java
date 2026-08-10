package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Set;

@Entity
@Table(name = "member_privacy_requests")
class MemberPrivacyRequest {

    static final Set<String> ALLOWED_TYPES = Set.of("subject_access", "erasure", "retention_review");
    static final Set<String> ALLOWED_STATUSES = Set.of("submitted", "approved", "completed", "rejected");

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "request_type")
    private String requestType;

    private String status;

    private String reason;

    @Column(name = "resolution_note")
    private String resolutionNote;

    @Column(name = "requested_by_member_id")
    private String requestedByMemberId;

    @Column(name = "requested_by_user_id")
    private String requestedByUserId;

    @Column(name = "handled_by_user_id")
    private String handledByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "handled_at")
    private Instant handledAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected MemberPrivacyRequest() {
    }

    MemberPrivacyRequest(
            String id,
            String tenantId,
            String memberId,
            String requestType,
            String reason,
            String requestedByMemberId,
            String requestedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.requestType = requestType;
        this.status = "submitted";
        this.reason = reason;
        this.requestedByMemberId = requestedByMemberId;
        this.requestedByUserId = requestedByUserId;
        this.createdAt = Instant.now();
    }

    void transition(String status, String resolutionNote, String handledByUserId) {
        this.status = status;
        this.resolutionNote = resolutionNote == null ? "" : resolutionNote.trim();
        this.handledByUserId = handledByUserId;
        this.handledAt = Instant.now();
        if ("completed".equals(status)) {
            this.completedAt = this.handledAt;
        }
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getMemberId() {
        return memberId;
    }

    String getRequestType() {
        return requestType;
    }

    String getStatus() {
        return status;
    }

    String getReason() {
        return reason;
    }

    String getResolutionNote() {
        return resolutionNote;
    }

    String getRequestedByMemberId() {
        return requestedByMemberId;
    }

    String getRequestedByUserId() {
        return requestedByUserId;
    }

    String getHandledByUserId() {
        return handledByUserId;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getHandledAt() {
        return handledAt;
    }

    Instant getCompletedAt() {
        return completedAt;
    }
}
