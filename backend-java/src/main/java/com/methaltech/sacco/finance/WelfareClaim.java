package com.methaltech.sacco.finance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "welfare_claims")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WelfareClaim {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "claim_type")
    private String claimType;

    private BigDecimal amount;
    private String channel;
    private String reference;
    private String description;
    private String status;

    @Column(name = "submitted_by_user_id")
    private String submittedByUserId;

    @Column(name = "decided_by_user_id")
    private String decidedByUserId;

    @Column(name = "paid_by_user_id")
    private String paidByUserId;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    WelfareClaim(
            String id,
            String tenantId,
            String memberId,
            String claimType,
            BigDecimal amount,
            String reference,
            String description,
            String submittedByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.claimType = claimType;
        this.amount = amount;
        this.reference = reference;
        this.description = description;
        this.status = "submitted";
        this.submittedByUserId = submittedByUserId;
        this.submittedAt = Instant.now();
        this.updatedAt = this.submittedAt;
    }

    void approve(String userId) {
        this.status = "approved";
        this.decidedByUserId = userId;
        this.decidedAt = Instant.now();
        this.updatedAt = this.decidedAt;
    }

    void reject(String userId, String reason) {
        this.status = "rejected";
        this.decidedByUserId = userId;
        this.rejectionReason = reason;
        this.decidedAt = Instant.now();
        this.updatedAt = this.decidedAt;
    }

    void pay(String userId, String channel) {
        this.status = "paid";
        this.paidByUserId = userId;
        this.channel = channel;
        this.paidAt = Instant.now();
        this.updatedAt = this.paidAt;
    }
}
