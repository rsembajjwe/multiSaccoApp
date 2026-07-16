package com.methaltech.sacco.member;

import java.time.Instant;

record MemberDocumentResponse(
        String id,
        String tenantId,
        String memberId,
        String documentType,
        String storageKey,
        String verificationStatus,
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
                document.getUploadedByUserId(),
                document.getCreatedAt(),
                document.getUpdatedAt());
    }
}
