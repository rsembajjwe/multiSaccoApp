package com.methaltech.sacco.finance;

import java.time.Instant;

record FundTypeResponse(
        String id,
        String tenantId,
        String code,
        String name,
        String basis,
        String description,
        boolean system,
        boolean active,
        int displayOrder,
        String createdByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static FundTypeResponse from(FundType fundType) {
        return new FundTypeResponse(
                fundType.getId(),
                fundType.getTenantId(),
                fundType.getCode(),
                fundType.getName(),
                fundType.getBasis(),
                fundType.getDescription(),
                fundType.isSystem(),
                fundType.isActive(),
                fundType.getDisplayOrder(),
                fundType.getCreatedByUserId(),
                fundType.getCreatedAt(),
                fundType.getUpdatedAt());
    }
}
