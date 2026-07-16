package com.methaltech.sacco.subscription;

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

@Entity
@Table(name = "subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "package_id")
    private String packageId;

    private String status;
    private String invoice;
    private BigDecimal amount;
    private BigDecimal paid;

    @Column(name = "member_count")
    private int memberCount;

    @Column(name = "billable_members")
    private int billableMembers;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    @Column(name = "tier_id")
    private String tierId;

    @Column(name = "tier_label")
    private String tierLabel;

    @Column(name = "billing_description")
    private String billingDescription;

    private LocalDate expiry;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    void refreshBilling(SubscriptionBilling billing) {
        this.memberCount = billing.memberCount();
        this.billableMembers = billing.billableMembers();
        this.unitPrice = billing.unitPrice();
        this.tierId = billing.tierId();
        this.tierLabel = billing.tierLabel();
        this.billingDescription = billing.billingDescription();
        this.amount = billing.amount();
        if (this.paid.compareTo(this.amount) > 0) this.paid = this.amount;
        if ("active".equals(this.status) && this.paid.compareTo(this.amount) < 0) this.status = "pending_payment";
        this.updatedAt = Instant.now();
    }

    void recordPayment(BigDecimal paymentAmount, LocalDate activeExpiry) {
        this.paid = this.paid.add(paymentAmount).min(this.amount);
        this.status = this.paid.compareTo(this.amount) >= 0 ? "active" : "pending_payment";
        if ("active".equals(this.status)) this.expiry = activeExpiry;
        this.updatedAt = Instant.now();
    }
}
