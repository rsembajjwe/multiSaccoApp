package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "loan_repayment_schedules")
public class LoanRepaymentSchedule {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "loan_id")
    private String loanId;

    @Column(name = "installment_no")
    private int installmentNo;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "principal_due")
    private BigDecimal principalDue;

    @Column(name = "interest_due")
    private BigDecimal interestDue;

    @Column(name = "total_due")
    private BigDecimal totalDue;

    @Column(name = "created_at")
    private Instant createdAt;

    protected LoanRepaymentSchedule() {
    }

    LoanRepaymentSchedule(
            String id,
            String tenantId,
            String loanId,
            int installmentNo,
            LocalDate dueDate,
            BigDecimal principalDue,
            BigDecimal interestDue,
            BigDecimal totalDue) {
        this.id = id;
        this.tenantId = tenantId;
        this.loanId = loanId;
        this.installmentNo = installmentNo;
        this.dueDate = dueDate;
        this.principalDue = principalDue;
        this.interestDue = interestDue;
        this.totalDue = totalDue;
        this.createdAt = Instant.now();
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

    public int getInstallmentNo() {
        return installmentNo;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public BigDecimal getPrincipalDue() {
        return principalDue;
    }

    public BigDecimal getInterestDue() {
        return interestDue;
    }

    public BigDecimal getTotalDue() {
        return totalDue;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
