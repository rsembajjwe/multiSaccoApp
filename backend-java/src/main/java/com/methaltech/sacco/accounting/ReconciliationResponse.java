package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.util.List;

record ReconciliationResponse(
        ReconciliationSummary summary,
        List<ReconciliationMatch> matches,
        List<StatementLineResponse> unmatchedStatementLines,
        List<LedgerLineResponse> unmatchedLedgerLines) {

    record ReconciliationSummary(
            int statementLines,
            int ledgerLines,
            int matched,
            int unmatchedStatementLines,
            int unmatchedLedgerLines,
            BigDecimal matchedAmount,
            BigDecimal unmatchedStatementAmount,
            BigDecimal unmatchedLedgerAmount) {
    }

    record ReconciliationMatch(
            StatementLineResponse statementLine,
            LedgerLineResponse ledgerLine) {
    }
}
