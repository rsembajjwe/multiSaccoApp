package com.methaltech.sacco.accounting;

import java.time.Instant;

record AccountingPeriodResponse(
        String id,
        String tenantId,
        String period,
        String status,
        String closedByUserId,
        Instant closedAt,
        Instant createdAt,
        Instant updatedAt) {

    static AccountingPeriodResponse from(AccountingPeriod period) {
        return new AccountingPeriodResponse(
                period.getId(),
                period.getTenantId(),
                period.getPeriod(),
                period.getStatus(),
                period.getClosedByUserId(),
                period.getClosedAt(),
                period.getCreatedAt(),
                period.getUpdatedAt());
    }
}
