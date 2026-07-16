package com.methaltech.sacco.member;

import java.math.BigDecimal;
import java.time.Instant;

record MemberBeneficiaryResponse(
        String id,
        String tenantId,
        String memberId,
        String fullName,
        String relationship,
        String phone,
        BigDecimal allocationPercent,
        String createdByUserId,
        Instant createdAt) {

    static MemberBeneficiaryResponse from(MemberBeneficiary beneficiary) {
        return new MemberBeneficiaryResponse(
                beneficiary.getId(),
                beneficiary.getTenantId(),
                beneficiary.getMemberId(),
                beneficiary.getFullName(),
                beneficiary.getRelationship(),
                beneficiary.getPhone(),
                beneficiary.getAllocationPercent(),
                beneficiary.getCreatedByUserId(),
                beneficiary.getCreatedAt());
    }
}
