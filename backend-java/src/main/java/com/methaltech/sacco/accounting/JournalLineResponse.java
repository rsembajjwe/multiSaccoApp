package com.methaltech.sacco.accounting;

import java.math.BigDecimal;

record JournalLineResponse(
        String accountCode,
        String accountName,
        String accountType,
        String memberId,
        BigDecimal debit,
        BigDecimal credit) {
}
