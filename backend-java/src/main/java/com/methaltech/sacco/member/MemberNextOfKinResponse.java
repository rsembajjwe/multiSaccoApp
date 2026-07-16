package com.methaltech.sacco.member;

import java.time.Instant;

record MemberNextOfKinResponse(
        String id,
        String tenantId,
        String memberId,
        String fullName,
        String relationship,
        String phone,
        String address,
        boolean primaryContact,
        String createdByUserId,
        Instant createdAt) {

    static MemberNextOfKinResponse from(MemberNextOfKin nextOfKin) {
        return new MemberNextOfKinResponse(
                nextOfKin.getId(),
                nextOfKin.getTenantId(),
                nextOfKin.getMemberId(),
                nextOfKin.getFullName(),
                nextOfKin.getRelationship(),
                nextOfKin.getPhone(),
                nextOfKin.getAddress(),
                nextOfKin.isPrimaryContact(),
                nextOfKin.getCreatedByUserId(),
                nextOfKin.getCreatedAt());
    }
}
