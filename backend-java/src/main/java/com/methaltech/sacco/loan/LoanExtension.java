package com.methaltech.sacco.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loan_extensions")
public class LoanExtension {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "loan_id")
    private String loanId;

    @Column(name = "additional_months")
    private int additionalMonths;

    @Column(name = "charge_fee")
    private BigDecimal chargeFee;

    private String reason;

    @Column(name = "requested_by_member")
    private boolean requestedByMember;

    @Column(name = "recorded_by_user_id")
    private String recordedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    protected LoanExtension() {
    }

    LoanExtension(
            String id,
            String tenantId,
            String loanId,
            int additionalMonths,
            BigDecimal chargeFee,
            String reason,
            boolean requestedByMember,
            String recordedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.loanId = loanId;
        this.additionalMonths = additionalMonths;
        this.chargeFee = chargeFee;
        this.reason = reason;
        this.requestedByMember = requestedByMember;
        this.recordedByUserId = recordedByUserId;
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

    public int getAdditionalMonths() {
        return additionalMonths;
    }

    public BigDecimal getChargeFee() {
        return chargeFee == null ? BigDecimal.ZERO : chargeFee;
    }

    public String getReason() {
        return reason;
    }

    public boolean isRequestedByMember() {
        return requestedByMember;
    }

    public String getRecordedByUserId() {
        return recordedByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
