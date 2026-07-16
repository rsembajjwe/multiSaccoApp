package com.methaltech.sacco.finance;

import java.math.BigDecimal;
import java.time.Instant;

record FinancialTransactionResponse(
        String id,
        String tenantId,
        String branchId,
        String memberId,
        String type,
        String channel,
        BigDecimal amount,
        String status,
        String reference,
        String narration,
        String makerUserId,
        String checkerUserId,
        Instant postedAt,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt) {

    static FinancialTransactionResponse from(FinancialTransaction transaction) {
        return new FinancialTransactionResponse(
                transaction.getId(),
                transaction.getTenantId(),
                transaction.getBranchId(),
                transaction.getMemberId(),
                transaction.getType(),
                transaction.getChannel(),
                transaction.getAmount(),
                transaction.getStatus(),
                transaction.getReference(),
                transaction.getNarration(),
                transaction.getMakerUserId(),
                transaction.getCheckerUserId(),
                transaction.getPostedAt(),
                transaction.getRejectionReason(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt());
    }
}
