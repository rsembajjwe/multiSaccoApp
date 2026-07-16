package com.methaltech.sacco.branch;

import java.time.Instant;

record BranchResponse(
        String id,
        String tenantId,
        String code,
        String name,
        String address,
        String managerUserId,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    static BranchResponse from(Branch branch) {
        return new BranchResponse(
                branch.getId(),
                branch.getTenantId(),
                branch.getCode(),
                branch.getName(),
                branch.getAddress(),
                branch.getManagerUserId(),
                branch.getStatus(),
                branch.getCreatedAt(),
                branch.getUpdatedAt());
    }
}
