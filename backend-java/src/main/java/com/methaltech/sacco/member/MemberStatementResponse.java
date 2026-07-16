package com.methaltech.sacco.member;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

record MemberStatementResponse(
        String tenantId,
        String memberId,
        String membershipNo,
        String memberName,
        LocalDate from,
        LocalDate to,
        StatementBalances openingBalances,
        StatementBalances closingBalances,
        List<MemberStatementLine> lines,
        String csv) {

    record StatementBalances(BigDecimal savings, BigDecimal shares, BigDecimal welfare) {
    }

    record MemberStatementLine(
            String transactionId,
            String reference,
            String type,
            String channel,
            BigDecimal amount,
            BigDecimal savingsMovement,
            BigDecimal sharesMovement,
            BigDecimal welfareMovement,
            BigDecimal savingsBalance,
            BigDecimal sharesBalance,
            BigDecimal welfareBalance,
            String narration,
            String originalTransactionId,
            Instant postedAt) {
    }
}
