package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loan_repayments")
public class LoanRepayment {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "loan_id")
    private String loanId;

    @Column(name = "member_id")
    private String memberId;

    private BigDecimal amount;

    private String channel;

    private String reference;

    private String narration;

    @Column(name = "received_by_user_id")
    private String receivedByUserId;

    private String status;

    @Column(name = "approved_by_user_id")
    private String approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    public static final String STATUS_PENDING_APPROVAL = "pending_approval";
    public static final String STATUS_POSTED = "posted";
    public static final String STATUS_REJECTED = "rejected";

    protected LoanRepayment() {
    }

    public LoanRepayment(
            String id,
            String tenantId,
            String loanId,
            String memberId,
            BigDecimal amount,
            String channel,
            String reference,
            String narration,
            String receivedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.loanId = loanId;
        this.memberId = memberId;
        this.amount = amount;
        this.channel = channel;
        this.reference = reference;
        this.narration = narration;
        this.receivedByUserId = receivedByUserId;
        this.status = STATUS_POSTED;
        this.receivedAt = Instant.now();
        this.createdAt = this.receivedAt;
    }

    /**
     * A provider-originated (mobile-money) repayment that has been RECEIVED but not yet confirmed
     * by the SACCO. It is created in {@code pending_approval} status and does NOT reduce the loan
     * balance until a checker (e.g. Treasurer) approves it. The maker is the system user, so no
     * human maker is blocked from approving it.
     */
    public static LoanRepayment pendingMobileMoney(
            String id,
            String tenantId,
            String loanId,
            String memberId,
            BigDecimal amount,
            String reference,
            String narration,
            String receivedByUserId) {
        LoanRepayment repayment = new LoanRepayment(
                id,
                tenantId,
                loanId,
                memberId,
                amount,
                "mobile_money",
                reference,
                narration,
                receivedByUserId);
        repayment.status = STATUS_PENDING_APPROVAL;
        return repayment;
    }

    public void approve(String checkerUserId) {
        this.status = STATUS_POSTED;
        this.approvedByUserId = checkerUserId;
        this.approvedAt = Instant.now();
    }

    public void reject(String checkerUserId) {
        this.status = STATUS_REJECTED;
        this.approvedByUserId = checkerUserId;
        this.approvedAt = Instant.now();
    }

    public boolean isPendingApproval() {
        return STATUS_PENDING_APPROVAL.equals(status);
    }

    public static LoanRepayment imported(
            String id,
            String tenantId,
            String loanId,
            String memberId,
            BigDecimal amount,
            String channel,
            String reference,
            String narration,
            String receivedByUserId,
            Instant receivedAt) {
        LoanRepayment repayment = new LoanRepayment(
                id,
                tenantId,
                loanId,
                memberId,
                amount,
                channel,
                reference,
                narration,
                receivedByUserId);
        repayment.receivedAt = receivedAt == null ? repayment.receivedAt : receivedAt;
        repayment.createdAt = repayment.receivedAt;
        return repayment;
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getLoanId() {
        return loanId;
    }

    public String getMemberId() {
        return memberId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getChannel() {
        return channel;
    }

    public String getReference() {
        return reference;
    }

    public String getNarration() {
        return narration;
    }

    public String getReceivedByUserId() {
        return receivedByUserId;
    }

    public String getStatus() {
        return status;
    }

    public String getApprovedByUserId() {
        return approvedByUserId;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
