package com.methaltech.sacco.finance;

import com.methaltech.sacco.member.Member;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;

@Builder
record WelfareClaimResponse(
        String id,
        String tenantId,
        String memberId,
        String membershipNo,
        String memberName,
        String claimType,
        BigDecimal amount,
        String channel,
        String reference,
        String description,
        String status,
        String submittedByUserId,
        String decidedByUserId,
        String paidByUserId,
        String rejectionReason,
        Instant submittedAt,
        Instant decidedAt,
        Instant paidAt,
        Instant updatedAt) {

    static WelfareClaimResponse from(WelfareClaim claim, Member member) {
        return WelfareClaimResponse.builder()
                .id(claim.getId())
                .tenantId(claim.getTenantId())
                .memberId(claim.getMemberId())
                .membershipNo(member == null ? null : member.getMembershipNo())
                .memberName(member == null ? null : member.getFullName())
                .claimType(claim.getClaimType())
                .amount(claim.getAmount())
                .channel(claim.getChannel())
                .reference(claim.getReference())
                .description(claim.getDescription())
                .status(claim.getStatus())
                .submittedByUserId(claim.getSubmittedByUserId())
                .decidedByUserId(claim.getDecidedByUserId())
                .paidByUserId(claim.getPaidByUserId())
                .rejectionReason(claim.getRejectionReason())
                .submittedAt(claim.getSubmittedAt())
                .decidedAt(claim.getDecidedAt())
                .paidAt(claim.getPaidAt())
                .updatedAt(claim.getUpdatedAt())
                .build();
    }
}
