package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
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

    @Column(name = "interest_rate")
    private BigDecimal interestRate;

    @Column(name = "interest_amount")
    private BigDecimal interestAmount;

    @Column(name = "total_payable")
    private BigDecimal totalPayable;

    @Column(name = "monthly_installment")
    private BigDecimal monthlyInstallment;

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

    @Version
    @Column(name = "lock_version")
    private Long lockVersion;

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
        applyTerms(product, amount, repaymentMonths);
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

    public static Loan importedBookLoan(
            String id,
            String tenantId,
            String memberId,
            String product,
            BigDecimal amount,
            BigDecimal balance,
            int dsr,
            int repaymentMonths,
            String purpose,
            String importedByUserId,
            Instant disbursedAt) {
        Loan loan = new Loan(id, tenantId, memberId, product, amount, dsr, repaymentMonths, purpose, "migration", null);
        loan.balance = balance;
        loan.interestRate = BigDecimal.ZERO;
        loan.interestAmount = BigDecimal.ZERO;
        loan.totalPayable = amount;
        loan.monthlyInstallment = repaymentMonths <= 0 ? amount : amount.divide(BigDecimal.valueOf(repaymentMonths), 2, java.math.RoundingMode.HALF_UP);
        loan.status = balance.compareTo(BigDecimal.ZERO) == 0 ? "closed" : "active";
        loan.stage = balance.compareTo(BigDecimal.ZERO) == 0 ? "Migrated Closed" : "Migrated Active";
        loan.approvedByUserId = importedByUserId;
        loan.approvedAt = disbursedAt;
        loan.disbursedByUserId = importedByUserId;
        loan.disbursedAt = disbursedAt;
        loan.updatedAt = disbursedAt == null ? Instant.now() : disbursedAt;
        return loan;
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
        this.balance = this.totalPayable == null || this.totalPayable.compareTo(BigDecimal.ZERO) == 0
                ? this.amount
                : this.totalPayable;
        this.disbursedByUserId = actorUserId;
        this.disbursedAt = Instant.now();
        this.updatedAt = this.disbursedAt;
    }

    private void applyTerms(String product, BigDecimal amount, int repaymentMonths) {
        this.interestRate = switch (product) {
            case "Emergency Loan" -> BigDecimal.valueOf(2.00);
            case "Agriculture Loan" -> BigDecimal.valueOf(1.25);
            case "School Fees Loan" -> BigDecimal.valueOf(1.00);
            default -> BigDecimal.valueOf(1.50);
        };
        BigDecimal months = BigDecimal.valueOf(Math.max(1, repaymentMonths));
        this.interestAmount = amount
                .multiply(this.interestRate)
                .multiply(months)
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        this.totalPayable = amount.add(this.interestAmount);
        this.monthlyInstallment = this.totalPayable.divide(months, 2, java.math.RoundingMode.HALF_UP);
    }

    public void recordRepayment(BigDecimal amount) {
        this.balance = this.balance.subtract(amount).max(BigDecimal.ZERO);
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

    public BigDecimal getInterestRate() {
        return interestRate;
    }

    public BigDecimal getInterestAmount() {
        return interestAmount;
    }

    public BigDecimal getTotalPayable() {
        return totalPayable;
    }

    public BigDecimal getMonthlyInstallment() {
        return monthlyInstallment;
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
