package com.methaltech.sacco.member;

public record DataProtectionEvidence(
        int privacyNoticeAcceptedMembers,
        int membersWithConsentUpdated,
        int privacyRequests,
        int openPrivacyRequests,
        int completedPrivacyRequests,
        int erasureRequestsCompleted,
        int kycDocuments,
        int kycDocumentsReviewDue,
        int kycDocumentsRetained,
        int kycDocumentsDisposed,
        int kycStorageActions,
        int kycStorageDeletes,
        int kycStorageMissing,
        int kycStorageDemoNoop,
        String evidenceStatus) {
}
