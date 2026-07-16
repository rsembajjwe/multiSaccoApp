package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "financial_transactions")
class FinancialTransaction {

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

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getBranchId() {
        return branchId;
    }

    String getMemberId() {
        return memberId;
    }

    String getType() {
        return type;
    }

    String getChannel() {
        return channel;
    }

    BigDecimal getAmount() {
        return amount;
    }

    String getStatus() {
        return status;
    }

    String getReference() {
        return reference;
    }

    String getNarration() {
        return narration;
    }

    String getMakerUserId() {
        return makerUserId;
    }

    String getCheckerUserId() {
        return checkerUserId;
    }

    Instant getPostedAt() {
        return postedAt;
    }

    String getRejectionReason() {
        return rejectionReason;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
