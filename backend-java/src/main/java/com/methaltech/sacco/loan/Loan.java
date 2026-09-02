package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

    @Column(name = "application_source")
    private String applicationSource;

    @Column(name = "signed_form_reference")
    private String signedFormReference;

    @Column(name = "signed_form_received_at")
    private LocalDate signedFormReceivedAt;

    @Column(name = "signed_form_file_name")
    private String signedFormFileName;

    @Column(name = "signed_form_uploaded_by_user_id")
    private String signedFormUploadedByUserId;

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

    @Column(name = "first_approved_by_user_id")
    private String firstApprovedByUserId;

    @Column(name = "first_approved_at")
    private Instant firstApprovedAt;

    @Column(name = "resolution_reference")
    private String resolutionReference;

    @Column(name = "paper_approved_by_chairperson")
    private boolean paperApprovedByChairperson;

    @Column(name = "paper_approved_by_secretary")
    private boolean paperApprovedBySecretary;

    @Column(name = "paper_approved_by_treasurer")
    private boolean paperApprovedByTreasurer;

    @Column(name = "paper_approved_by_committee")
    private boolean paperApprovedByCommittee;

    @Column(name = "paper_approval_reference")
    private String paperApprovalReference;

    @Column(name = "paper_approval_approvers")
    private String paperApprovalApprovers;

    @Column(name = "paper_approval_recorded_by_user_id")
    private String paperApprovalRecordedByUserId;

    @Column(name = "paper_approval_recorded_at")
    private Instant paperApprovalRecordedAt;

    @Column(name = "disbursement_initiated_by_user_id")
    private String disbursementInitiatedByUserId;

    @Column(name = "disbursement_initiated_at")
    private Instant disbursementInitiatedAt;

    @Column(name = "secured_hold_amount")
    private BigDecimal securedHoldAmount = BigDecimal.ZERO;

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
        this.applicationSource = "mobile".equals(channel) ? "online_member_application" : "staff_captured_signed_form";
        this.signedFormReference = "";
        this.signedFormFileName = "";
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
        if ("rejected".equals(status)) {
            this.firstApprovedByUserId = null;
            this.firstApprovedAt = null;
        }
        this.updatedAt = Instant.now();
    }

    void recordFirstApproval(String actorUserId) {
        this.firstApprovedByUserId = actorUserId;
        this.firstApprovedAt = Instant.now();
        this.status = "under_review";
        this.stage = "Awaiting Second Approval";
        this.updatedAt = this.firstApprovedAt;
    }

    void applyResolutionReference(String reference) {
        this.resolutionReference = reference;
        this.updatedAt = Instant.now();
    }

    void recordPaperApproval(
            boolean chairperson,
            boolean secretary,
            boolean treasurer,
            boolean committee,
            String reference,
            String approvers,
            String actorUserId) {
        this.paperApprovedByChairperson = chairperson;
        this.paperApprovedBySecretary = secretary;
        this.paperApprovedByTreasurer = treasurer;
        this.paperApprovedByCommittee = committee;
        this.paperApprovalReference = reference == null ? "" : reference.trim();
        this.paperApprovalApprovers = approvers == null ? "" : approvers.trim();
        this.paperApprovalRecordedByUserId = actorUserId;
        this.paperApprovalRecordedAt = Instant.now();
        this.updatedAt = this.paperApprovalRecordedAt;
    }

    public String getFirstApprovedByUserId() {
        return firstApprovedByUserId;
    }

    public Instant getFirstApprovedAt() {
        return firstApprovedAt;
    }

    public String getResolutionReference() {
        return resolutionReference;
    }

    public boolean isPaperApprovedByChairperson() {
        return paperApprovedByChairperson;
    }

    public boolean isPaperApprovedBySecretary() {
        return paperApprovedBySecretary;
    }

    public boolean isPaperApprovedByTreasurer() {
        return paperApprovedByTreasurer;
    }

    public boolean isPaperApprovedByCommittee() {
        return paperApprovedByCommittee;
    }

    public String getPaperApprovalReference() {
        return paperApprovalReference;
    }

    public String getPaperApprovalApprovers() {
        return paperApprovalApprovers;
    }

    public String getPaperApprovalRecordedByUserId() {
        return paperApprovalRecordedByUserId;
    }

    public Instant getPaperApprovalRecordedAt() {
        return paperApprovalRecordedAt;
    }

    void initiateDisbursement(String actorUserId) {
        this.disbursementInitiatedByUserId = actorUserId;
        this.disbursementInitiatedAt = Instant.now();
        this.stage = "Awaiting Disbursement Approval";
        this.updatedAt = this.disbursementInitiatedAt;
    }

    public String getDisbursementInitiatedByUserId() {
        return disbursementInitiatedByUserId;
    }

    public Instant getDisbursementInitiatedAt() {
        return disbursementInitiatedAt;
    }

    public BigDecimal getSecuredHoldAmount() {
        return securedHoldAmount == null ? BigDecimal.ZERO : securedHoldAmount;
    }

    public void setSecuredHoldAmount(BigDecimal amount) {
        this.securedHoldAmount = amount == null ? BigDecimal.ZERO : amount.max(BigDecimal.ZERO);
        this.updatedAt = Instant.now();
    }

    /** Reduces the recorded collateral hold by up to {@code amount}; returns how much was actually released. */
    public BigDecimal reduceSecuredHold(BigDecimal amount) {
        BigDecimal current = getSecuredHoldAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 || current.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal released = amount.min(current);
        this.securedHoldAmount = current.subtract(released);
        this.updatedAt = Instant.now();
        return released;
    }

    public boolean isSavingsSecured() {
        return getSecuredHoldAmount().compareTo(BigDecimal.ZERO) > 0;
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

    static BigDecimal interestRateFor(String product) {
        return switch (product) {
            case "Emergency Loan" -> BigDecimal.valueOf(2.00);
            case "Agriculture Loan" -> BigDecimal.valueOf(1.25);
            case "School Fees Loan" -> BigDecimal.valueOf(1.00);
            default -> BigDecimal.valueOf(1.50);
        };
    }

    /** Total repayable (principal + interest/charges) for a proposed loan, before it is created. */
    public static BigDecimal totalPayableFor(String product, BigDecimal amount, int repaymentMonths) {
        BigDecimal months = BigDecimal.valueOf(Math.max(1, repaymentMonths));
        BigDecimal interest = amount
                .multiply(interestRateFor(product))
                .multiply(months)
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        return amount.add(interest);
    }

    private void applyTerms(String product, BigDecimal amount, int repaymentMonths) {
        this.interestRate = interestRateFor(product);
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

    public void recordApplicationEvidence(
            String applicationSource,
            String signedFormReference,
            LocalDate signedFormReceivedAt,
            String signedFormFileName,
            String actorUserId) {
        this.applicationSource = applicationSource == null || applicationSource.isBlank()
                ? this.applicationSource
                : applicationSource.trim();
        this.signedFormReference = signedFormReference == null ? "" : signedFormReference.trim();
        this.signedFormReceivedAt = signedFormReceivedAt;
        this.signedFormFileName = signedFormFileName == null ? "" : signedFormFileName.trim();
        this.signedFormUploadedByUserId = actorUserId;
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

    public String getApplicationSource() {
        return applicationSource;
    }

    public String getSignedFormReference() {
        return signedFormReference;
    }

    public LocalDate getSignedFormReceivedAt() {
        return signedFormReceivedAt;
    }

    public String getSignedFormFileName() {
        return signedFormFileName;
    }

    public String getSignedFormUploadedByUserId() {
        return signedFormUploadedByUserId;
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
