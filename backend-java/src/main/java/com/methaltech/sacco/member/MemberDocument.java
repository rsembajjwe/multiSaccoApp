package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "member_documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MemberDocument {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "storage_key")
    private String storageKey;

    @Column(name = "verification_status")
    private String verificationStatus;

    @Column(name = "retention_status")
    private String retentionStatus;

    @Column(name = "retention_reason")
    private String retentionReason;

    @Column(name = "retention_review_due_at")
    private LocalDate retentionReviewDueAt;

    @Column(name = "retention_reviewed_at")
    private Instant retentionReviewedAt;

    @Column(name = "retention_actioned_by_user_id")
    private String retentionActionedByUserId;

    @Column(name = "retention_storage_action")
    private String retentionStorageAction;

    @Column(name = "retention_storage_action_detail")
    private String retentionStorageActionDetail;

    @Column(name = "retention_storage_action_at")
    private Instant retentionStorageActionAt;

    @Column(name = "uploaded_by_user_id")
    private String uploadedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    MemberDocument(
            String id,
            String tenantId,
            String memberId,
            String documentType,
            String storageKey,
            String verificationStatus,
            String uploadedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.documentType = documentType;
        this.storageKey = storageKey;
        this.verificationStatus = verificationStatus;
        this.retentionStatus = "expired".equals(verificationStatus) ? "review_due" : "active";
        this.retentionReason = "expired".equals(verificationStatus)
                ? "KYC verification expired; review whether this evidence should be retained, replaced, or disposed."
                : "";
        this.uploadedByUserId = uploadedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void updateRetention(String retentionStatus, String retentionReason, LocalDate retentionReviewDueAt, String actionedByUserId) {
        this.retentionStatus = retentionStatus;
        this.retentionReason = retentionReason == null ? "" : retentionReason.trim();
        this.retentionReviewDueAt = retentionReviewDueAt;
        this.retentionReviewedAt = Instant.now();
        this.retentionActionedByUserId = actionedByUserId;
        this.updatedAt = this.retentionReviewedAt;
    }

    void recordStorageAction(DocumentStorageActionResult result) {
        this.retentionStorageAction = result.action();
        this.retentionStorageActionDetail = result.detail().length() <= 500
                ? result.detail()
                : result.detail().substring(0, 500);
        this.retentionStorageActionAt = Instant.now();
        this.updatedAt = this.retentionStorageActionAt;
    }
}
