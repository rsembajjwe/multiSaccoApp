package com.methaltech.sacco.loan;

import java.math.BigDecimal;

/**
 * Aggregate loan-portfolio figures for the Reports screen, computed from the
 * same per-loan enrichment used by the loan list, so the numbers match what
 * the client previously summed locally. Lets Reports avoid loading every loan.
 *
 * openLoanCount/disbursedOpen/outstandingOpen cover loans with an active or
 * overdue status; arrears* count only those open loans in arrears; interestTotal
 * sums interest over every loan except rejected/cancelled ones.
 */
public record LoanPortfolioSummaryResponse(
        int openLoanCount,
        BigDecimal disbursedOpen,
        BigDecimal outstandingOpen,
        int arrearsCount,
        BigDecimal arrearsAmount,
        BigDecimal interestTotal) {
}
