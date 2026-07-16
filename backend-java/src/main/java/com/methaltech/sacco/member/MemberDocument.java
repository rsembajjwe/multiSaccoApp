package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
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
        this.uploadedByUserId = uploadedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
