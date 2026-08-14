package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class MemberPrivacyEvidenceUnitTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final MemberPrivacyRequestRepository privacyRequestRepository = mock(MemberPrivacyRequestRepository.class);
    private final MemberDocumentRepository documentRepository = mock(MemberDocumentRepository.class);
    private final DataProtectionEvidenceService evidenceService = new DataProtectionEvidenceService(
            memberRepository,
            privacyRequestRepository,
            documentRepository);

    @Test
    void privacyRequestStartsSubmittedAndCompletionSetsHandlingMetadata() {
        MemberPrivacyRequest request = new MemberPrivacyRequest(
                "privacy_1",
                "tenant_green",
                "member_green_amina",
                "erasure",
                "Member requested dormant-account erasure",
                "member_green_amina",
                null);

        assertEquals("submitted", request.getStatus());
        assertEquals("erasure", request.getRequestType());
        assertEquals("member_green_amina", request.getRequestedByMemberId());
        assertNull(request.getHandledAt());
        assertNull(request.getCompletedAt());

        request.transition("completed", "  Erasure completed after audit export.  ", "user_green_admin");

        assertEquals("completed", request.getStatus());
        assertEquals("Erasure completed after audit export.", request.getResolutionNote());
        assertEquals("user_green_admin", request.getHandledByUserId());
        assertNotNull(request.getHandledAt());
        assertEquals(request.getHandledAt(), request.getCompletedAt());
    }

    @Test
    void rejectedPrivacyRequestDoesNotSetCompletedAt() {
        MemberPrivacyRequest request = new MemberPrivacyRequest(
                "privacy_2",
                "tenant_green",
                "member_green_amina",
                "subject_access",
                "Need contribution history",
                null,
                "user_green_admin");

        request.transition("rejected", null, "user_green_admin");

        assertEquals("rejected", request.getStatus());
        assertEquals("", request.getResolutionNote());
        assertNotNull(request.getHandledAt());
        assertNull(request.getCompletedAt());
    }

    @Test
    void documentRetentionAndStorageActionsAreAuditable() {
        MemberDocument document = new MemberDocument(
                "doc_1",
                "tenant_green",
                "member_green_amina",
                "national_id",
                "tenant_green/members/GVS-0001/national-id.pdf",
                "expired",
                "user_green_admin");

        assertEquals("review_due", document.getRetentionStatus());
        assertTrue(document.getRetentionReason().contains("KYC verification expired"));

        document.updateRetention(
                "disposed",
                "  Replaced by newer verified National ID.  ",
                LocalDate.of(2026, 8, 31),
                "user_green_admin");
        document.recordStorageAction(DocumentStorageActionResult.of(
                "deleted",
                "x".repeat(520)));

        assertEquals("disposed", document.getRetentionStatus());
        assertEquals("Replaced by newer verified National ID.", document.getRetentionReason());
        assertEquals(LocalDate.of(2026, 8, 31), document.getRetentionReviewDueAt());
        assertEquals("user_green_admin", document.getRetentionActionedByUserId());
        assertEquals("deleted", document.getRetentionStorageAction());
        assertEquals(500, document.getRetentionStorageActionDetail().length());
        assertNotNull(document.getRetentionReviewedAt());
        assertNotNull(document.getRetentionStorageActionAt());

        MemberDocumentResponse response = MemberDocumentResponse.from(document);
        assertEquals("doc_1", response.id());
        assertEquals("disposed", response.retentionStatus());
        assertEquals("deleted", response.retentionStorageAction());
    }

    @Test
    void evidenceStatusIsReadyWhenRequestsAreClosedAndDisposedDocumentsHaveStorageActions() {
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_green"))
                .thenReturn(List.of(consentedMember("member_1", "GVS-0001"), consentedMember("member_2", "GVS-0002")));
        when(privacyRequestRepository.findByTenantIdOrderByCreatedAtDesc("tenant_green"))
                .thenReturn(List.of(
                        transitionedRequest("privacy_1", "subject_access", "completed"),
                        transitionedRequest("privacy_2", "erasure", "completed"),
                        transitionedRequest("privacy_3", "retention_review", "rejected")));
        when(documentRepository.findByTenantIdOrderByCreatedAtDesc("tenant_green"))
                .thenReturn(List.of(
                        retainedDocument("doc_1"),
                        disposedDocument("doc_2", "deleted"),
                        disposedDocument("doc_3", "demo_noop")));

        DataProtectionEvidence evidence = evidenceService.build("tenant_green");

        assertEquals(2, evidence.privacyNoticeAcceptedMembers());
        assertEquals(2, evidence.membersWithConsentUpdated());
        assertEquals(3, evidence.privacyRequests());
        assertEquals(0, evidence.openPrivacyRequests());
        assertEquals(2, evidence.completedPrivacyRequests());
        assertEquals(1, evidence.erasureRequestsCompleted());
        assertEquals(3, evidence.kycDocuments());
        assertEquals(0, evidence.kycDocumentsReviewDue());
        assertEquals(1, evidence.kycDocumentsRetained());
        assertEquals(2, evidence.kycDocumentsDisposed());
        assertEquals(2, evidence.kycStorageActions());
        assertEquals(1, evidence.kycStorageDeletes());
        assertEquals(0, evidence.kycStorageMissing());
        assertEquals(1, evidence.kycStorageDemoNoop());
        assertEquals("ready", evidence.evidenceStatus());
    }

    @Test
    void evidenceStatusRequiresReviewForOpenRequestsReviewDueDocumentsOrMissingStorageAction() {
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_green"))
                .thenReturn(List.of(consentedMember("member_1", "GVS-0001")));
        when(privacyRequestRepository.findByTenantIdOrderByCreatedAtDesc("tenant_green"))
                .thenReturn(List.of(new MemberPrivacyRequest(
                        "privacy_open",
                        "tenant_green",
                        "member_1",
                        "retention_review",
                        "Review expired files",
                        "member_1",
                        null)));
        when(documentRepository.findByTenantIdOrderByCreatedAtDesc("tenant_green"))
                .thenReturn(List.of(reviewDueDocument("doc_review_due"), disposedDocumentWithoutStorageAction("doc_disposed")));

        DataProtectionEvidence evidence = evidenceService.build("tenant_green");

        assertEquals(1, evidence.openPrivacyRequests());
        assertEquals(1, evidence.kycDocumentsReviewDue());
        assertEquals(1, evidence.kycDocumentsDisposed());
        assertEquals(0, evidence.kycStorageActions());
        assertEquals("review", evidence.evidenceStatus());
    }

    private Member consentedMember(String id, String membershipNo) {
        Member member = new Member(
                id,
                "tenant_green",
                "branch_green_main",
                membershipNo,
                "Member " + membershipNo,
                "individual",
                "+256700000001",
                membershipNo.toLowerCase() + "@example.test",
                "CM123",
                "hash",
                "salt",
                "active",
                "verified",
                LocalDate.of(2026, 1, 1));
        member.updateConsents(true, true, false, true, true);
        return member;
    }

    private MemberPrivacyRequest transitionedRequest(String id, String requestType, String status) {
        MemberPrivacyRequest request = new MemberPrivacyRequest(
                id,
                "tenant_green",
                "member_green_amina",
                requestType,
                "Compliance request",
                "member_green_amina",
                null);
        request.transition(status, status + " note", "user_green_admin");
        return request;
    }

    private MemberDocument retainedDocument(String id) {
        MemberDocument document = activeDocument(id);
        document.updateRetention("retained", "Still required for active KYC.", null, "user_green_admin");
        return document;
    }

    private MemberDocument disposedDocument(String id, String storageAction) {
        MemberDocument document = activeDocument(id);
        document.updateRetention("disposed", "Retention period ended.", null, "user_green_admin");
        document.recordStorageAction(DocumentStorageActionResult.of(storageAction, storageAction + " evidence"));
        return document;
    }

    private MemberDocument disposedDocumentWithoutStorageAction(String id) {
        MemberDocument document = activeDocument(id);
        document.updateRetention("disposed", "Retention period ended.", null, "user_green_admin");
        return document;
    }

    private MemberDocument reviewDueDocument(String id) {
        return new MemberDocument(
                id,
                "tenant_green",
                "member_green_amina",
                "national_id",
                id + ".pdf",
                "expired",
                "user_green_admin");
    }

    private MemberDocument activeDocument(String id) {
        return new MemberDocument(
                id,
                "tenant_green",
                "member_green_amina",
                "photo",
                id + ".jpg",
                "verified",
                "user_green_admin");
    }
}
