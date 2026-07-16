package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.time.Instant;

public record LoanResponse(
        String id,
        String tenantId,
        String memberId,
        String product,
        BigDecimal amount,
        BigDecimal balance,
        String status,
        String stage,
        int guarantors,
        int guarantorRequests,
        int pendingGuarantors,
        int repayments,
        BigDecimal repaymentTotal,
        int dsr,
        int repaymentMonths,
        String purpose,
        String channel,
        String submittedByMemberId,
        String approvedByUserId,
        Instant approvedAt,
        String disbursedByUserId,
        Instant disbursedAt,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt) {

    public static LoanResponse from(Loan loan) {
        return new LoanResponse(
                loan.getId(),
                loan.getTenantId(),
                loan.getMemberId(),
                loan.getProduct(),
                loan.getAmount(),
                loan.getBalance(),
                loan.getStatus(),
                loan.getStage(),
                loan.getGuarantors(),
                0,
                0,
                0,
                BigDecimal.ZERO,
                loan.getDsr(),
                loan.getRepaymentMonths(),
                loan.getPurpose(),
                loan.getChannel(),
                loan.getSubmittedByMemberId(),
                loan.getApprovedByUserId(),
                loan.getApprovedAt(),
                loan.getDisbursedByUserId(),
                loan.getDisbursedAt(),
                loan.getRejectionReason(),
                loan.getCreatedAt(),
                loan.getUpdatedAt());
    }
}
