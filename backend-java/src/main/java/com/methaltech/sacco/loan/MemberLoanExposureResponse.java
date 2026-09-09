package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.List;

/**
 * A borrower/guarantor's loan-related standing, computed server-side so the
 * loan form does not need to load every member, loan and guarantor request.
 * openLoan is the member's current uncleared loan (top-up target), or null.
 */
public record MemberLoanExposureResponse(
        String memberId,
        String fullName,
        String membershipNo,
        String status,
        BigDecimal savingsBalance,
        BigDecimal sharesBalance,
        BigDecimal welfareBalance,
        int openLoanCount,
        BigDecimal openLoanBalance,
        BigDecimal guaranteedLoanBalance,
        BigDecimal guaranteeCeiling,
        BigDecimal committedGuarantees,
        BigDecimal guaranteeCapacity,
        List<String> guaranteeLabels,
        LoanResponse openLoan) {
}
