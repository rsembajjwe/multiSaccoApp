package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

@Entity
@Table(name = "loans")
public class Loan {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    private String product;

    private BigDecimal amount;

    private BigDecimal balance;

    private String status;

    private String stage;

    private int guarantors;

    private int dsr;

    @Column(name = "repayment_months")
    private int repaymentMonths;

    private String purpose;

    private String channel;

    @Column(name = "submitted_by_member_id")
    private String submittedByMemberId;

    @Column(name = "approved_by_user_id")
    private String approvedByUserId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "disbursed_by_user_id")
    private String disbursedByUserId;

    @Column(name = "disbursed_at")
    private Instant disbursedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected Loan() {
    }

    Loan(
            String id,
            String tenantId,
            String memberId,
            String product,
            BigDecimal amount,
            int dsr,
            int repaymentMonths,
            String purpose,
            String channel,
            String submittedByMemberId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.product = product;
        this.amount = amount;
        this.balance = BigDecimal.ZERO;
        this.status = "submitted";
        this.stage = "Credit Appraisal";
        this.guarantors = 0;
        this.dsr = dsr;
        this.repaymentMonths = repaymentMonths;
        this.purpose = purpose;
        this.channel = channel;
        this.submittedByMemberId = submittedByMemberId;
        this.rejectionReason = "";
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public static Loan submitted(
            String id,
            String tenantId,
            String memberId,
            String product,
            BigDecimal amount,
            int dsr,
            int repaymentMonths,
            String purpose,
            String channel,
            String submittedByMemberId) {
        return new Loan(id, tenantId, memberId, product, amount, dsr, repaymentMonths, purpose, channel, submittedByMemberId);
    }

    void decide(String status, String actorUserId, String reason) {
        this.status = status;
        this.stage = "approved".equals(status) ? "Ready for Disbursement" : "Rejected";
        this.approvedByUserId = "approved".equals(status) ? actorUserId : null;
        this.approvedAt = "approved".equals(status) ? Instant.now() : null;
        this.rejectionReason = "rejected".equals(status) ? reason : "";
        this.updatedAt = Instant.now();
    }

    void disburse(String actorUserId) {
        this.status = "active";
        this.stage = "Disbursed";
        this.balance = this.amount;
        this.disbursedByUserId = actorUserId;
        this.disbursedAt = Instant.now();
        this.updatedAt = this.disbursedAt;
    }

    public void recordRepayment(BigDecimal amount) {
        this.balance = this.balance.subtract(amount);
        this.status = this.balance.compareTo(BigDecimal.ZERO) == 0 ? "closed" : "active";
        this.stage = this.balance.compareTo(BigDecimal.ZERO) == 0 ? "Closed" : "Repayment";
        this.updatedAt = Instant.now();
    }

    public void refreshGuarantors(int acceptedGuarantors) {
        this.guarantors = acceptedGuarantors;
        if (acceptedGuarantors > 0 && Set.of("submitted", "under_review").contains(this.status)) {
            this.stage = "Loan Committee";
        }
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getMemberId() {
        return memberId;
    }

    public String getProduct() {
        return product;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public String getStatus() {
        return status;
    }

    public String getStage() {
        return stage;
    }

    public int getGuarantors() {
        return guarantors;
    }

    public int getDsr() {
        return dsr;
    }

    public int getRepaymentMonths() {
        return repaymentMonths;
    }

    public String getPurpose() {
        return purpose;
    }

    public String getChannel() {
        return channel;
    }

    public String getSubmittedByMemberId() {
        return submittedByMemberId;
    }

    public String getApprovedByUserId() {
        return approvedByUserId;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public String getDisbursedByUserId() {
        return disbursedByUserId;
    }

    public Instant getDisbursedAt() {
        return disbursedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
