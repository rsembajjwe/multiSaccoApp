package com.methaltech.sacco.member;

import java.time.Instant;
import java.time.LocalDate;

record MemberDocumentResponse(
        String id,
        String tenantId,
        String memberId,
        String documentType,
        String storageKey,
        String verificationStatus,
        String retentionStatus,
        String retentionReason,
        LocalDate retentionReviewDueAt,
        Instant retentionReviewedAt,
        String retentionActionedByUserId,
        String retentionStorageAction,
        String retentionStorageActionDetail,
        Instant retentionStorageActionAt,
        String uploadedByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static MemberDocumentResponse from(MemberDocument document) {
        return new MemberDocumentResponse(
                document.getId(),
                document.getTenantId(),
                document.getMemberId(),
                document.getDocumentType(),
                document.getStorageKey(),
                document.getVerificationStatus(),
                document.getRetentionStatus(),
                document.getRetentionReason(),
                document.getRetentionReviewDueAt(),
                document.getRetentionReviewedAt(),
                document.getRetentionActionedByUserId(),
                document.getRetentionStorageAction(),
                document.getRetentionStorageActionDetail(),
                document.getRetentionStorageActionAt(),
                document.getUploadedByUserId(),
                document.getCreatedAt(),
                document.getUpdatedAt());
    }
}
