package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.List;

/**
 * Committee cover view for a loan: the applicant's own credit (self-cover) plus each
 * selected guarantor's savings, remaining guarantee capacity, pledge and response status,
 * with totals and the cover ratio against the requested amount.
 */
public record LoanCoverResponse(
        String loanId,
        BigDecimal amount,
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
