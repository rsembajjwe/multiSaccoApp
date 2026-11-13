package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loan_recovery_allocations")
public class LoanRecoveryAllocation {

    public static final String BORROWER = "borrower";
    public static final String GUARANTOR = "guarantor";

    @Id private String id;
    @Column(name = "recovery_case_id") private String recoveryCaseId;
    @Column(name = "tenant_id") private String tenantId;
    @Column(name = "loan_id") private String loanId;
    @Column(name = "source_member_id") private String sourceMemberId;
    @Column(name = "source_type") private String sourceType;
    @Column(name = "guarantor_id") private String guarantorId;
    private BigDecimal amount;
    @Column(name = "available_savings_at_proposal") private BigDecimal availableSavingsAtProposal;
    @Column(name = "guarantee_limit_at_proposal") private BigDecimal guaranteeLimitAtProposal;
    private String status;
    @Column(name = "financial_transaction_id") private String financialTransactionId;
    @Column(name = "loan_repayment_id") private String loanRepaymentId;
    @Column(name = "posted_at") private Instant postedAt;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;

    protected LoanRecoveryAllocation() {}

    LoanRecoveryAllocation(
            String id, LoanRecoveryCase recoveryCase, String sourceMemberId, String sourceType,
            String guarantorId, BigDecimal amount, BigDecimal availableSavings, BigDecimal guaranteeLimit) {
        this.id = id;
        this.recoveryCaseId = recoveryCase.getId();
        this.tenantId = recoveryCase.getTenantId();
        this.loanId = recoveryCase.getLoanId();
        this.sourceMemberId = sourceMemberId;
        this.sourceType = sourceType;
        this.guarantorId = guarantorId;
        this.amount = amount;
        this.availableSavingsAtProposal = availableSavings;
        this.guaranteeLimitAtProposal = guaranteeLimit;
        this.status = "proposed";
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    void markPosted(String financialTransactionId, String loanRepaymentId) {
        this.status = "posted";
        this.financialTransactionId = financialTransactionId;
        this.loanRepaymentId = loanRepaymentId;
        this.postedAt = Instant.now();
        this.updatedAt = postedAt;
    }

    public String getId() { return id; }
    public String getRecoveryCaseId() { return recoveryCaseId; }
    public String getTenantId() { return tenantId; }
    public String getLoanId() { return loanId; }
    public String getSourceMemberId() { return sourceMemberId; }
    public String getSourceType() { return sourceType; }
    public String getGuarantorId() { return guarantorId; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getAvailableSavingsAtProposal() { return availableSavingsAtProposal; }
    public BigDecimal getGuaranteeLimitAtProposal() { return guaranteeLimitAtProposal; }
    public String getStatus() { return status; }
    public String getFinancialTransactionId() { return financialTransactionId; }
    public String getLoanRepaymentId() { return loanRepaymentId; }
    public Instant getPostedAt() { return postedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
