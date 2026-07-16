package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record ExpenseResponse(
        String id,
        String tenantId,
        String supplierId,
        String accountCode,
        BigDecimal amount,
        String channel,
        String reference,
        String description,
        LocalDate expenseDate,
        String status,
        String recordedByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static ExpenseResponse from(Expense expense) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getTenantId(),
                expense.getSupplierId(),
                expense.getAccountCode(),
                expense.getAmount(),
                expense.getChannel(),
                expense.getReference(),
                expense.getDescription(),
                expense.getExpenseDate(),
                expense.getStatus(),
                expense.getRecordedByUserId(),
                expense.getCreatedAt(),
                expense.getUpdatedAt());
    }
}
