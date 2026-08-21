package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.time.Instant;

public record LoanAppraisalResponse(
        String id,
        String loanId,
        String appraisedByUserId,
        String recommendation,
        BigDecimal recommendedAmount,
        Integer recommendedTermMonths,
        String notes,
        Instant createdAt) {

    static LoanAppraisalResponse from(LoanAppraisal appraisal) {
        return new LoanAppraisalResponse(
                appraisal.getId(),
                appraisal.getLoanId(),
                appraisal.getAppraisedByUserId(),
                appraisal.getRecommendation(),
                appraisal.getRecommendedAmount(),
                appraisal.getRecommendedTermMonths(),
                appraisal.getNotes(),
                appraisal.getCreatedAt());
    }
}
