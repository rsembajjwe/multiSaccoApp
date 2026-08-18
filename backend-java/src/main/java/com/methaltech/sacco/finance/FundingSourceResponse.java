package com.methaltech.sacco.finance;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record FundingSourceResponse(
        String id,
        String tenantId,
        String sourceType,
        String provider,
        BigDecimal amount,
        String currencyCode,
        String reference,
        LocalDate dateReceived,
        String status,
        String notes,
        String recordedByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static FundingSourceResponse from(FundingSource source) {
        return new FundingSourceResponse(
                source.getId(),
                source.getTenantId(),
                source.getSourceType(),
                source.getProvider(),
                source.getAmount(),
                source.getCurrencyCode(),
                source.getReference(),
                source.getDateReceived(),
                source.getStatus(),
                source.getNotes(),
                source.getRecordedByUserId(),
                source.getCreatedAt(),
                source.getUpdatedAt());
    }
}
