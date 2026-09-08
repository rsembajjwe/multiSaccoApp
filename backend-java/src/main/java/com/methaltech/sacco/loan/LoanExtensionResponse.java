package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.time.Instant;

public record LoanExtensionResponse(
        String id,
        String tenantId,
        String loanId,
        int additionalMonths,
        BigDecimal chargeFee,
        String reason,
        boolean requestedByMember,
        String recordedByUserId,
        Instant createdAt) {

    public static LoanExtensionResponse from(LoanExtension extension) {
        return new LoanExtensionResponse(
                extension.getId(),
                extension.getTenantId(),
                extension.getLoanId(),
                extension.getAdditionalMonths(),
                extension.getChargeFee(),
                extension.getReason(),
                extension.isRequestedByMember(),
                extension.getRecordedByUserId(),
                extension.getCreatedAt());
    }
}
