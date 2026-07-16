package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.time.Instant;

public record LoanGuarantorResponse(
        String id,
        String tenantId,
        String loanId,
        String memberId,
        BigDecimal guaranteedAmount,
        String status,
        String requestedByUserId,
        Instant decidedAt,
        Instant createdAt,
        Instant updatedAt,
        LoanResponse loan,
        BigDecimal capacity) {

    public static LoanGuarantorResponse from(LoanGuarantor guarantor) {
        return from(guarantor, null, null);
    }

    public static LoanGuarantorResponse from(LoanGuarantor guarantor, Loan loan, BigDecimal capacity) {
        return new LoanGuarantorResponse(
                guarantor.getId(),
                guarantor.getTenantId(),
                guarantor.getLoanId(),
                guarantor.getMemberId(),
                guarantor.getGuaranteedAmount(),
                guarantor.getStatus(),
                guarantor.getRequestedByUserId(),
                guarantor.getDecidedAt(),
                guarantor.getCreatedAt(),
                guarantor.getUpdatedAt(),
                loan == null ? null : LoanResponse.from(loan),
                capacity);
    }
}
