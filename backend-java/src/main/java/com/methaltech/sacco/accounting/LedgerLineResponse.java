package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;

record LedgerLineResponse(
        String id,
        String tenantId,
        String journalEntryId,
        String sourceType,
        String sourceId,
        String reference,
        String description,
        Instant postedAt,
        String accountCode,
        String accountName,
        BigDecimal amount) {
}
