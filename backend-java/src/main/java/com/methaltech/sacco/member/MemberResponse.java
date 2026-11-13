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
        String whatsapp,
        String email,
        String address,
        String nationalId,
        String status,
        String kycStatus,
        String linkedUserId,
        LocalDate joiningDate,
        BigDecimal savingsBalance,
        BigDecimal sharesBalance,
        BigDecimal welfareBalance,
        BigDecimal loanBalance,
        String privacyScope,
        ConsentPreferences consentPreferences,
        Instant createdAt,
        Instant updatedAt) {

    static MemberResponse from(Member member) {
        return from(member, false, null, true);
    }

    static MemberResponse fromSummary(Member member) {
        return from(member, true, null, true);
    }

    /** Summary with an outstanding loan balance, gated: when [financialsVisible] is false the member's
     *  savings/shares/welfare/loan figures are withheld (null) so only authorised roles see them. */
    static MemberResponse fromSummary(Member member, BigDecimal loanBalance, boolean financialsVisible) {
        return from(member, true, loanBalance, financialsVisible);
    }

    private static MemberResponse from(
            Member member, boolean maskSensitiveFields, BigDecimal loanBalance, boolean financialsVisible) {
        return new MemberResponse(
                member.getId(),
                member.getTenantId(),
                member.getBranchId(),
                member.getMembershipNo(),
                member.getFullName(),
                member.getMemberType(),
                maskSensitiveFields ? PiiMasker.phone(member.getPhone()) : member.getPhone(),
                maskSensitiveFields ? PiiMasker.phone(member.getWhatsapp()) : member.getWhatsapp(),
                maskSensitiveFields ? PiiMasker.email(member.getEmail()) : member.getEmail(),
                member.getAddress(),
                maskSensitiveFields ? PiiMasker.nationalId(member.getNationalId()) : member.getNationalId(),
                member.getStatus(),
                member.getKycStatus(),
                member.getLinkedUserId(),
                member.getJoiningDate(),
                financialsVisible ? member.getSavingsBalance() : null,
                financialsVisible ? member.getSharesBalance() : null,
                financialsVisible ? member.getWelfareBalance() : null,
                financialsVisible ? loanBalance : null,
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
