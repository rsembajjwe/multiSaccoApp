package com.methaltech.sacco.finance;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record TreasuryCashEntryResponse(
        String id,
        String direction,
        String purpose,
        BigDecimal amount,
        String reference,
        String description,
        String memberId,
        LocalDate entryDate,
        String recordedByUserId,
        Instant createdAt) {

    static TreasuryCashEntryResponse from(TreasuryCashEntry e) {
        return new TreasuryCashEntryResponse(
                e.getId(),
                e.getDirection(),
                e.getPurpose(),
                e.getAmount(),
                e.getReference(),
                e.getDescription(),
                e.getMemberId(),
                e.getEntryDate(),
                e.getRecordedByUserId(),
                e.getCreatedAt());
    }
}
