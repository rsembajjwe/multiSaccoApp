package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record StatementLineResponse(
        String id,
        String tenantId,
        String accountCode,
        String channel,
        BigDecimal amount,
        String externalReference,
        String description,
        LocalDate statementDate,
        String importedByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static StatementLineResponse from(StatementLine line) {
        return new StatementLineResponse(
                line.getId(),
                line.getTenantId(),
                line.getAccountCode(),
                line.getChannel(),
                line.getAmount(),
                line.getExternalReference(),
                line.getDescription(),
                line.getStatementDate(),
                line.getImportedByUserId(),
                line.getCreatedAt(),
                line.getUpdatedAt());
    }
}
