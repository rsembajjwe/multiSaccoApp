package com.methaltech.sacco.member;

import com.methaltech.sacco.privacy.PiiMasker;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record MemberResponse(
        String id,
        String tenantId,
        String branchId,
        String membershipNo,
        String fullName,
        String memberType,
        String phone,
        String email,
        String nationalId,
        String status,
        String kycStatus,
        String linkedUserId,
        LocalDate joiningDate,
        BigDecimal savingsBalance,
        BigDecimal sharesBalance,
        BigDecimal welfareBalance,
        String privacyScope,
        ConsentPreferences consentPreferences,
        Instant createdAt,
        Instant updatedAt) {

    static MemberResponse from(Member member) {
        return from(member, false);
    }

    static MemberResponse fromSummary(Member member) {
        return from(member, true);
    }

    private static MemberResponse from(Member member, boolean maskSensitiveFields) {
        return new MemberResponse(
                member.getId(),
                member.getTenantId(),
                member.getBranchId(),
                member.getMembershipNo(),
                member.getFullName(),
                member.getMemberType(),
                maskSensitiveFields ? PiiMasker.phone(member.getPhone()) : member.getPhone(),
                maskSensitiveFields ? PiiMasker.email(member.getEmail()) : member.getEmail(),
                maskSensitiveFields ? PiiMasker.nationalId(member.getNationalId()) : member.getNationalId(),
                member.getStatus(),
                member.getKycStatus(),
                member.getLinkedUserId(),
                member.getJoiningDate(),
                member.getSavingsBalance(),
                member.getSharesBalance(),
                member.getWelfareBalance(),
                maskSensitiveFields ? "summary_masked" : "detail_full",
                ConsentPreferences.from(member),
                member.getCreatedAt(),
                member.getUpdatedAt());
    }

    record ConsentPreferences(
            boolean privacyNoticeAccepted,
            Instant privacyNoticeAcceptedAt,
            boolean smsConsent,
            boolean emailConsent,
            boolean mobileMoneyConsent,
            boolean providerDataSharingConsent,
            Instant consentUpdatedAt) {

        static ConsentPreferences from(Member member) {
            return new ConsentPreferences(
                    member.getPrivacyNoticeAcceptedAt() != null,
                    member.getPrivacyNoticeAcceptedAt(),
                    member.isSmsConsent(),
                    member.isEmailConsent(),
                    member.isMobileMoneyConsent(),
                    member.isProviderDataSharingConsent(),
                    member.getConsentUpdatedAt());
        }
    }
}
