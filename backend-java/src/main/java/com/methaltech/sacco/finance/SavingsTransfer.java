package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A transfer of an amount out of a member's savings to another destination, under maker-checker control.
 * Created {@code pending} by a maker; a different checker posts (applies) or rejects it. Group deductions
 * share a {@code batchId}. Posted transfers are immutable (reverse, do not delete).
 */
@Entity
@Table(name = "savings_transfers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavingsTransfer {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "source_member_id")
    private String sourceMemberId;

    private BigDecimal amount;

    @Column(name = "destination_type")
    private String destinationType;

    @Column(name = "destination_fund_code")
    private String destinationFundCode;

    @Column(name = "destination_member_id")
    private String destinationMemberId;

    @Column(name = "loan_id")
    private String loanId;

    @Column(name = "batch_id")
    private String batchId;

    private String reference;
    private String reason;

    @Column(name = "authorization_reference")
    private String authorizationReference;

    @Column(name = "resolution_reference")
    private String resolutionReference;

    private String status;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "decided_by_user_id")
    private String decidedByUserId;

    @Column(name = "decision_reason")
    private String decisionReason;

    @Column(name = "first_approved_by_user_id")
    private String firstApprovedByUserId;

    @Column(name = "first_approved_at")
    private Instant firstApprovedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public SavingsTransfer(
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
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.sourceMemberId = sourceMemberId;
        this.amount = amount;
        this.destinationType = destinationType;
        this.destinationFundCode = destinationFundCode;
        this.destinationMemberId = destinationMemberId;
        this.loanId = loanId;
        this.batchId = batchId;
        this.reference = reference;
        this.reason = reason;
        this.authorizationReference = authorizationReference;
        this.resolutionReference = resolutionReference;
        this.status = "pending";
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    /** Records the first of two required approvals for a high-value transfer. */
    void recordFirstApproval(String userId) {
        this.firstApprovedByUserId = userId;
        this.firstApprovedAt = Instant.now();
        this.status = "awaiting_second_approval";
        this.updatedAt = Instant.now();
    }

    void post(String decidedByUserId) {
        this.status = "posted";
        this.decidedByUserId = decidedByUserId;
        this.updatedAt = Instant.now();
    }

    void reject(String decidedByUserId, String decisionReason) {
        this.status = "rejected";
        this.decidedByUserId = decidedByUserId;
        this.decisionReason = decisionReason;
        this.updatedAt = Instant.now();
    }

    /** Marks a posted transfer reversed (the reverser is recorded in the audit trail). */
    void markReversed(String reason) {
        this.status = "reversed";
        this.decisionReason = reason;
        this.updatedAt = Instant.now();
    }
}
