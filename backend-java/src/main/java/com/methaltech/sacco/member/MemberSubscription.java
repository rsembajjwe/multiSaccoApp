package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A member's membership dues subscription: amount, payment status and optional expiry. One-time dues do
 * not expire; recurring dues renew by billing period. Managed by SACCO staff and distinct from the
 * platform's per-SACCO subscription.
 */
@Entity
@Table(name = "member_subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberSubscription {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "plan_name")
    private String planName;

    private BigDecimal amount;
    private BigDecimal paid;
    private String status;

    @Column(name = "billing_period")
    private String billingPeriod;

    @Column(name = "start_date")
    private LocalDate startDate;

    private LocalDate expiry;

    @Column(name = "last_reminder_on")
    private LocalDate lastReminderOn;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    public MemberSubscription(
            String id,
            String tenantId,
            String memberId,
            String planName,
            BigDecimal amount,
            String billingPeriod,
            LocalDate startDate,
            LocalDate expiry) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.planName = planName;
        this.amount = amount;
        this.paid = BigDecimal.ZERO;
        this.status = "pending_payment";
        this.billingPeriod = billingPeriod;
        this.startDate = startDate;
        this.expiry = expiry;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    boolean isFullyPaid() {
        return this.paid != null && this.amount != null && this.paid.compareTo(this.amount) >= 0;
    }

    /** Applies a dues payment; once fully paid the membership becomes active and expiry is extended. */
    void recordPayment(BigDecimal paymentAmount, LocalDate activeExpiry) {
        this.paid = this.paid.add(paymentAmount).min(this.amount);
        this.status = this.paid.compareTo(this.amount) >= 0 ? "active" : "pending_payment";
        if ("active".equals(this.status)) {
            this.expiry = activeExpiry;
            this.lastReminderOn = null;
        }
        this.updatedAt = Instant.now();
    }

    void markExpired() {
        this.status = "expired";
        this.updatedAt = Instant.now();
    }

    void resetForRenewal() {
        this.paid = BigDecimal.ZERO;
        this.status = "pending_payment";
        this.updatedAt = Instant.now();
    }

    void markReminded(LocalDate on) {
        this.lastReminderOn = on;
        this.updatedAt = Instant.now();
    }
}
