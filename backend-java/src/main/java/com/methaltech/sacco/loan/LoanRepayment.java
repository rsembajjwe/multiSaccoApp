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

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    protected LoanRepayment() {
    }

    LoanRepayment(
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
        this.receivedAt = Instant.now();
        this.createdAt = this.receivedAt;
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

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
