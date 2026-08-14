package com.methaltech.sacco.finance;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class WelfareClaimUnitTest {

    @Test
    void submittedClaimStartsWithAuditFieldsAndReference() {
        WelfareClaim claim = newClaim();

        assertThat(claim.getId()).isEqualTo("claim_1");
        assertThat(claim.getTenantId()).isEqualTo("tenant_green");
        assertThat(claim.getMemberId()).isEqualTo("member_green_amina");
        assertThat(claim.getAmount()).isEqualByComparingTo("25000.00");
        assertThat(claim.getStatus()).isEqualTo("submitted");
        assertThat(claim.getSubmittedByUserId()).isEqualTo("user_treasurer");
        assertThat(claim.getSubmittedAt()).isNotNull();
        assertThat(claim.getUpdatedAt()).isEqualTo(claim.getSubmittedAt());
        assertThat(claim.getDecidedAt()).isNull();
        assertThat(claim.getPaidAt()).isNull();
    }

    @Test
    void approveRecordsDecisionAudit() {
        WelfareClaim claim = newClaim();

        claim.approve("user_chairperson");

        assertThat(claim.getStatus()).isEqualTo("approved");
        assertThat(claim.getDecidedByUserId()).isEqualTo("user_chairperson");
        assertThat(claim.getDecidedAt()).isNotNull();
        assertThat(claim.getUpdatedAt()).isEqualTo(claim.getDecidedAt());
        assertThat(claim.getRejectionReason()).isNull();
    }

    @Test
    void rejectRecordsReasonAndDecisionAudit() {
        WelfareClaim claim = newClaim();

        claim.reject("user_chairperson", "Documents missing");

        assertThat(claim.getStatus()).isEqualTo("rejected");
        assertThat(claim.getDecidedByUserId()).isEqualTo("user_chairperson");
        assertThat(claim.getRejectionReason()).isEqualTo("Documents missing");
        assertThat(claim.getDecidedAt()).isNotNull();
        assertThat(claim.getUpdatedAt()).isEqualTo(claim.getDecidedAt());
    }

    @Test
    void payRecordsPaymentAuditAndChannel() {
        WelfareClaim claim = newClaim();
        claim.approve("user_chairperson");

        claim.pay("user_treasurer", "mobile_money");

        assertThat(claim.getStatus()).isEqualTo("paid");
        assertThat(claim.getPaidByUserId()).isEqualTo("user_treasurer");
        assertThat(claim.getChannel()).isEqualTo("mobile_money");
        assertThat(claim.getPaidAt()).isNotNull();
        assertThat(claim.getUpdatedAt()).isEqualTo(claim.getPaidAt());
    }

    @Test
    void rulesAllowOnlyApprovedOrRejectedDecisions() {
        assertThat(WelfareClaimRules.isDecisionStatus("approved")).isTrue();
        assertThat(WelfareClaimRules.isDecisionStatus("rejected")).isTrue();
        assertThat(WelfareClaimRules.isDecisionStatus("paid")).isFalse();
        assertThat(WelfareClaimRules.isDecisionStatus(null)).isFalse();
    }

    @Test
    void rulesRequireReasonsOnlyForRejections() {
        assertThat(WelfareClaimRules.requiresRejectionReason("rejected")).isTrue();
        assertThat(WelfareClaimRules.requiresRejectionReason("approved")).isFalse();
        assertThat(WelfareClaimRules.requiresRejectionReason(null)).isFalse();
    }

    @Test
    void rulesAllowPaymentsOnlyFromApprovedClaimsThroughSupportedChannels() {
        assertThat(WelfareClaimRules.isPayableStatus("approved")).isTrue();
        assertThat(WelfareClaimRules.isPayableStatus("submitted")).isFalse();
        assertThat(WelfareClaimRules.isPayableStatus("rejected")).isFalse();
        assertThat(WelfareClaimRules.isPayableStatus(null)).isFalse();

        assertThat(WelfareClaimRules.isPaymentChannel("mobile_money")).isTrue();
        assertThat(WelfareClaimRules.isPaymentChannel("cash")).isTrue();
        assertThat(WelfareClaimRules.isPaymentChannel("bank")).isTrue();
        assertThat(WelfareClaimRules.isPaymentChannel("crypto")).isFalse();
        assertThat(WelfareClaimRules.isPaymentChannel(null)).isFalse();
    }

    private WelfareClaim newClaim() {
        return new WelfareClaim(
                "claim_1",
                "tenant_green",
                "member_green_amina",
                "medical",
                new BigDecimal("25000.00"),
                "GVS-WCL-0009",
                "Clinic support",
                "user_treasurer");
    }
}
