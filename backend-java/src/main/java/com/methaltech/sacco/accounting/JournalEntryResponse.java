package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

record JournalEntryResponse(
        String id,
        String tenantId,
        String sourceType,
        String sourceId,
        String reference,
        String description,
        Instant postedAt,
        BigDecimal debitTotal,
        BigDecimal creditTotal,
        boolean isBalanced,
        List<JournalLineResponse> lines) {
}
