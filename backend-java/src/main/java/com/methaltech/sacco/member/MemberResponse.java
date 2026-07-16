package com.methaltech.sacco.member;

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
        LocalDate joiningDate,
        BigDecimal savingsBalance,
        BigDecimal sharesBalance,
        BigDecimal welfareBalance,
        Instant createdAt,
        Instant updatedAt) {

    static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getTenantId(),
                member.getBranchId(),
                member.getMembershipNo(),
                member.getFullName(),
                member.getMemberType(),
                member.getPhone(),
                member.getEmail(),
                member.getNationalId(),
                member.getStatus(),
                member.getKycStatus(),
                member.getJoiningDate(),
                member.getSavingsBalance(),
                member.getSharesBalance(),
                member.getWelfareBalance(),
                member.getCreatedAt(),
                member.getUpdatedAt());
    }
}
