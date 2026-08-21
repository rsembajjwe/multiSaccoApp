package com.methaltech.sacco.finance;

import java.math.BigDecimal;
import java.time.Instant;

public record SavingsTransferResponse(
        String id,
        String tenantId,
        String sourceMemberId,
        BigDecimal amount,
        String destinationType,
        String destinationFundCode,
        String destinationMemberId,
        String loanId,
        String batchId,
        String reference,
        String reason,
        String authorizationReference,
        String resolutionReference,
        String status,
        String createdByUserId,
        String decidedByUserId,
        String firstApprovedByUserId,
        String decisionReason,
        Instant createdAt,
        Instant updatedAt) {

    public static SavingsTransferResponse from(SavingsTransfer transfer) {
        return new SavingsTransferResponse(
                transfer.getId(),
                transfer.getTenantId(),
                transfer.getSourceMemberId(),
                transfer.getAmount(),
                transfer.getDestinationType(),
                transfer.getDestinationFundCode(),
                transfer.getDestinationMemberId(),
                transfer.getLoanId(),
                transfer.getBatchId(),
                transfer.getReference(),
                transfer.getReason(),
                transfer.getAuthorizationReference(),
                transfer.getResolutionReference(),
                transfer.getStatus(),
                transfer.getCreatedByUserId(),
                transfer.getDecidedByUserId(),
                transfer.getFirstApprovedByUserId(),
                transfer.getDecisionReason(),
                transfer.getCreatedAt(),
                transfer.getUpdatedAt());
    }
}
