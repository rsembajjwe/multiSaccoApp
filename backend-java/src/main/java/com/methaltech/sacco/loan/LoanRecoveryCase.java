package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "loan_recovery_cases")
public class LoanRecoveryCase {

    public static final String NOTICE_PERIOD = "notice_period";
    public static final String PENDING_APPROVAL = "pending_approval";
    public static final String POSTED = "posted";
    public static final String PARTIALLY_RECOVERED = "partially_recovered";
    public static final String REJECTED = "rejected";
    public static final String BORROWER_SAVINGS = "borrower_savings";
    public static final String GUARANTOR_SHORTFALL = "guarantor_shortfall";

    @Id private String id;
    @Column(name = "tenant_id") private String tenantId;
    @Column(name = "loan_id") private String loanId;
    @Column(name = "borrower_member_id") private String borrowerMemberId;
    private String reference;
    private String status;
    private String reason;
    @Column(name = "recovery_method") private String recoveryMethod;
    @Column(name = "notice_reference") private String noticeReference;
    @Column(name = "notice_served_at") private LocalDate noticeServedAt;
    @Column(name = "grace_ends_at") private LocalDate graceEndsAt;
    @Column(name = "include_guarantors") private boolean includeGuarantors;
    @Column(name = "outstanding_at_proposal") private BigDecimal outstandingAtProposal;
    @Column(name = "borrower_savings_proposed") private BigDecimal borrowerSavingsProposed;
    @Column(name = "guarantor_savings_proposed") private BigDecimal guarantorSavingsProposed;
    @Column(name = "total_proposed") private BigDecimal totalProposed;
    @Column(name = "remaining_after_proposal") private BigDecimal remainingAfterProposal;
    @Column(name = "maker_user_id") private String makerUserId;
    @Column(name = "checker_user_id") private String checkerUserId;
    @Column(name = "decision_reason") private String decisionReason;
    @Column(name = "submitted_at") private Instant submittedAt;
    @Column(name = "decided_at") private Instant decidedAt;
    @Column(name = "posted_at") private Instant postedAt;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;
    @Version @Column(name = "lock_version") private Long lockVersion;

    protected LoanRecoveryCase() {}

    LoanRecoveryCase(
            String id, String tenantId, String loanId, String borrowerMemberId, String reference,
            String reason, String recoveryMethod, String noticeReference, LocalDate noticeServedAt,
            LocalDate graceEndsAt, String makerUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.loanId = loanId;
        this.borrowerMemberId = borrowerMemberId;
        this.reference = reference;
        this.recoveryMethod = recoveryMethod;
        this.status = PENDING_APPROVAL;
        this.reason = reason;
        this.noticeReference = noticeReference;
        this.noticeServedAt = noticeServedAt;
        this.graceEndsAt = graceEndsAt;
        this.includeGuarantors = GUARANTOR_SHORTFALL.equals(recoveryMethod);
        this.makerUserId = makerUserId;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
        this.submittedAt = createdAt;
        updateProposal(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    void updateProposal(BigDecimal outstanding, BigDecimal borrowerAmount, BigDecimal guarantorAmount) {
        this.outstandingAtProposal = normalized(outstanding);
        this.borrowerSavingsProposed = normalized(borrowerAmount);
        this.guarantorSavingsProposed = normalized(guarantorAmount);
        this.totalProposed = this.borrowerSavingsProposed.add(this.guarantorSavingsProposed);
        this.remainingAfterProposal = this.outstandingAtProposal.subtract(this.totalProposed).max(BigDecimal.ZERO);
        this.updatedAt = Instant.now();
    }

    void submit() {
        this.status = PENDING_APPROVAL;
        this.submittedAt = Instant.now();
        this.updatedAt = submittedAt;
    }

    void reject(String checkerUserId, String reason) {
        this.status = REJECTED;
        this.checkerUserId = checkerUserId;
        this.decisionReason = reason == null ? "" : reason.trim();
        this.decidedAt = Instant.now();
        this.updatedAt = decidedAt;
    }

    void markPosted(String checkerUserId, boolean fullyRecovered) {
        this.status = fullyRecovered ? POSTED : PARTIALLY_RECOVERED;
        this.checkerUserId = checkerUserId;
        this.decidedAt = Instant.now();
        this.postedAt = decidedAt;
        this.updatedAt = decidedAt;
    }

    private static BigDecimal normalized(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }

    public String getId() { return id; }
    public String getTenantId() { return tenantId; }
    public String getLoanId() { return loanId; }
    public String getBorrowerMemberId() { return borrowerMemberId; }
    public String getReference() { return reference; }
    public String getStatus() { return status; }
    public String getReason() { return reason; }
    public String getRecoveryMethod() { return recoveryMethod; }
    public String getNoticeReference() { return noticeReference; }
    public LocalDate getNoticeServedAt() { return noticeServedAt; }
    public LocalDate getGraceEndsAt() { return graceEndsAt; }
    public boolean isIncludeGuarantors() { return includeGuarantors; }
    public BigDecimal getOutstandingAtProposal() { return outstandingAtProposal; }
    public BigDecimal getBorrowerSavingsProposed() { return borrowerSavingsProposed; }
    public BigDecimal getGuarantorSavingsProposed() { return guarantorSavingsProposed; }
    public BigDecimal getTotalProposed() { return totalProposed; }
    public BigDecimal getRemainingAfterProposal() { return remainingAfterProposal; }
    public String getMakerUserId() { return makerUserId; }
    public String getCheckerUserId() { return checkerUserId; }
    public String getDecisionReason() { return decisionReason; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getDecidedAt() { return decidedAt; }
    public Instant getPostedAt() { return postedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
