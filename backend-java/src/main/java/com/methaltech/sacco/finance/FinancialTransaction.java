package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "financial_transactions")
public class FinancialTransaction {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "branch_id")
    private String branchId;

    @Column(name = "member_id")
    private String memberId;

    private String type;

    private String channel;

    private BigDecimal amount;

    private String status;

    private String reference;

    private String narration;

    @Column(name = "maker_user_id")
    private String makerUserId;

    @Column(name = "checker_user_id")
    private String checkerUserId;

    @Column(name = "posted_at")
    private Instant postedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "original_transaction_id")
    private String originalTransactionId;

    @Column(name = "reversal_reason")
    private String reversalReason;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected FinancialTransaction() {
    }

    FinancialTransaction(
            String id,
            String tenantId,
            String branchId,
            String memberId,
            String type,
            String channel,
            BigDecimal amount,
            String reference,
            String narration,
            String makerUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.branchId = branchId;
        this.memberId = memberId;
        this.type = type;
        this.channel = channel;
        this.amount = amount;
        this.status = "pending_approval";
        this.reference = reference;
        this.narration = narration;
        this.makerUserId = makerUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public static FinancialTransaction postedProviderTransaction(
            String id,
            String tenantId,
            String branchId,
            String memberId,
            String type,
            String channel,
            BigDecimal amount,
            String reference,
            String narration,
            String userId) {
        return postedProviderTransactionAt(id, tenantId, branchId, memberId, type, channel, amount, reference, narration, userId, null);
    }

    public static FinancialTransaction postedProviderTransactionAt(
            String id,
            String tenantId,
            String branchId,
            String memberId,
            String type,
            String channel,
            BigDecimal amount,
            String reference,
            String narration,
            String userId,
            Instant postedAt) {
        FinancialTransaction transaction = new FinancialTransaction(
                id,
                tenantId,
                branchId,
                memberId,
                type,
                channel,
                amount,
                reference,
                narration,
                userId);
        transaction.status = "posted";
        transaction.checkerUserId = userId;
        transaction.postedAt = postedAt == null ? transaction.createdAt : postedAt;
        transaction.updatedAt = transaction.postedAt;
        return transaction;
    }

    static FinancialTransaction reversalOf(
            FinancialTransaction original,
            String id,
            String reference,
            String reason,
            String userId) {
        FinancialTransaction transaction = new FinancialTransaction(
                id,
                original.getTenantId(),
                original.getBranchId(),
                original.getMemberId(),
                original.getType(),
                original.getChannel(),
                original.getAmount(),
                reference,
                "Reversal of " + original.getReference() + (reason == null || reason.isBlank() ? "" : ": " + reason.trim()),
                userId);
        transaction.status = "posted";
        transaction.checkerUserId = userId;
        transaction.postedAt = transaction.createdAt;
        transaction.updatedAt = transaction.createdAt;
        transaction.originalTransactionId = original.getId();
        transaction.reversalReason = reason == null ? "" : reason.trim();
        return transaction;
    }

    void post(String checkerUserId) {
        this.status = "posted";
        this.checkerUserId = checkerUserId;
        this.postedAt = Instant.now();
        this.updatedAt = this.postedAt;
    }

    void reject(String checkerUserId, String reason) {
        this.status = "rejected";
        this.checkerUserId = checkerUserId;
        this.rejectionReason = reason;
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getBranchId() {
        return branchId;
    }

    public String getMemberId() {
        return memberId;
    }

    public String getType() {
        return type;
    }

    public String getChannel() {
        return channel;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getStatus() {
        return status;
    }

    public String getReference() {
        return reference;
    }

    public String getNarration() {
        return narration;
    }

    public String getMakerUserId() {
        return makerUserId;
    }

    public String getCheckerUserId() {
        return checkerUserId;
    }

    public Instant getPostedAt() {
        return postedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public String getOriginalTransactionId() {
        return originalTransactionId;
    }

    public String getReversalReason() {
        return reversalReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
