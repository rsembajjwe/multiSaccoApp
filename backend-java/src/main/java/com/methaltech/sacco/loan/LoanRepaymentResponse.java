package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.time.Instant;

record LoanRepaymentResponse(
        String id,
        String tenantId,
        String loanId,
        String memberId,
        BigDecimal amount,
        String channel,
        String reference,
        String narration,
        String receivedByUserId,
        Instant receivedAt,
        Instant createdAt) {

    static LoanRepaymentResponse from(LoanRepayment repayment) {
        return new LoanRepaymentResponse(
                repayment.getId(),
                repayment.getTenantId(),
                repayment.getLoanId(),
                repayment.getMemberId(),
                repayment.getAmount(),
                repayment.getChannel(),
                repayment.getReference(),
                repayment.getNarration(),
                repayment.getReceivedByUserId(),
                repayment.getReceivedAt(),
                repayment.getCreatedAt());
    }
}
