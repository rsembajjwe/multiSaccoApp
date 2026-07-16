package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loan_guarantors")
public class LoanGuarantor {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "loan_id")
    private String loanId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "guaranteed_amount")
    private BigDecimal guaranteedAmount;

    private String status;

    @Column(name = "requested_by_user_id")
    private String requestedByUserId;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected LoanGuarantor() {
    }

    LoanGuarantor(
            String id,
            String tenantId,
            String loanId,
            String memberId,
            BigDecimal guaranteedAmount,
            String requestedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.loanId = loanId;
        this.memberId = memberId;
        this.guaranteedAmount = guaranteedAmount;
        this.status = "pending";
        this.requestedByUserId = requestedByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void decide(String status) {
        this.status = status;
        this.decidedAt = Instant.now();
        this.updatedAt = this.decidedAt;
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

    public BigDecimal getGuaranteedAmount() {
        return guaranteedAmount;
    }

    public String getStatus() {
        return status;
    }

    public String getRequestedByUserId() {
        return requestedByUserId;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
