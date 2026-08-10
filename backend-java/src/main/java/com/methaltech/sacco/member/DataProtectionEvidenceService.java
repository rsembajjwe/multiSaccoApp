package com.methaltech.sacco.member;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DataProtectionEvidenceService {

    private final MemberRepository memberRepository;
    private final MemberPrivacyRequestRepository privacyRequestRepository;
    private final MemberDocumentRepository documentRepository;

    public DataProtectionEvidence build(String tenantId) {
        List<Member> members = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId);
        List<MemberPrivacyRequest> privacyRequests = privacyRequestRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<MemberDocument> documents = documentRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

        int noticeAccepted = (int) members.stream().filter(member -> member.getPrivacyNoticeAcceptedAt() != null).count();
        int consentUpdated = (int) members.stream().filter(member -> member.getConsentUpdatedAt() != null).count();
        int openRequests = (int) privacyRequests.stream()
                .filter(request -> !List.of("completed", "rejected").contains(request.getStatus()))
                .count();
        int completedRequests = (int) privacyRequests.stream().filter(request -> "completed".equals(request.getStatus())).count();
        int completedErasures = (int) privacyRequests.stream()
                .filter(request -> "erasure".equals(request.getRequestType()) && "completed".equals(request.getStatus()))
                .count();
        int reviewDue = (int) documents.stream().filter(document -> "review_due".equals(document.getRetentionStatus())).count();
        int retained = (int) documents.stream().filter(document -> "retained".equals(document.getRetentionStatus())).count();
        int disposed = (int) documents.stream().filter(document -> "disposed".equals(document.getRetentionStatus())).count();
        int storageActions = (int) documents.stream().filter(document -> document.getRetentionStorageActionAt() != null).count();
        int storageDeletes = countStorageAction(documents, "deleted");
        int storageMissing = countStorageAction(documents, "missing");
        int storageDemoNoop = countStorageAction(documents, "demo_noop");
        String evidenceStatus = openRequests == 0 && reviewDue == 0 && disposed == storageActions ? "ready" : "review";

        return new DataProtectionEvidence(
                noticeAccepted,
                consentUpdated,
                privacyRequests.size(),
                openRequests,
                completedRequests,
                completedErasures,
                documents.size(),
                reviewDue,
                retained,
                disposed,
                storageActions,
                storageDeletes,
                storageMissing,
                storageDemoNoop,
                evidenceStatus);
    }

    private int countStorageAction(List<MemberDocument> documents, String action) {
        return (int) documents.stream()
                .filter(document -> action.equals(document.getRetentionStorageAction()))
                .count();
    }
}
