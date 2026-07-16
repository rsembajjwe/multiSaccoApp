package com.methaltech.sacco.governance;

import java.time.Instant;
import java.time.LocalDate;

record GovernanceResolutionResponse(
        String id,
        String tenantId,
        String meetingId,
        String title,
        String decision,
        String ownerUserId,
        LocalDate dueDate,
        String status,
        String createdByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static GovernanceResolutionResponse from(GovernanceResolution resolution) {
        return new GovernanceResolutionResponse(
                resolution.getId(),
                resolution.getTenantId(),
                resolution.getMeetingId(),
                resolution.getTitle(),
                resolution.getDecision(),
                resolution.getOwnerUserId(),
                resolution.getDueDate(),
                resolution.getStatus(),
                resolution.getCreatedByUserId(),
                resolution.getCreatedAt(),
                resolution.getUpdatedAt());
    }
}
