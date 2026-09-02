package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.List;

/**
 * Committee guarantor review for a loan: the applicant's own savings plus each
 * selected guarantor's savings, remaining guarantee capacity and response status.
 * Guarantors confirm responsibility for the loan; they do not enter a cash pledge amount.
 */
public record LoanCoverResponse(
        String loanId,
        BigDecimal amount,
        BigDecimal totalPayable,
        ApplicantCover applicant,
        List<GuarantorCover> guarantors,
        BigDecimal acceptedPledges,
        BigDecimal totalCover,
        BigDecimal coverRatio,
        boolean covered,
        BigDecimal shortfall) {

    public record ApplicantCover(
            String memberId,
            String membershipNo,
            String fullName,
            BigDecimal savings) {
    }

    public record GuarantorCover(
            String guarantorRequestId,
            String memberId,
            String membershipNo,
            String fullName,
            BigDecimal savings,
            BigDecimal availableCapacity,
            BigDecimal pledgeAmount,
            String status) {
    }
}
