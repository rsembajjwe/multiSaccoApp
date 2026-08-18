package com.methaltech.sacco.subscription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/** A platform-wide billable rate (add-on module, support, setup, overage, or SMS). */
@Entity
@Table(name = "platform_billing_catalog")
class BillingCatalogItem {

    @Id
    private String code;

    private String name;

    private String category;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    @Column(name = "billing_period")
    private String billingPeriod;

    private boolean active;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected BillingCatalogItem() {
    }

    void update(BigDecimal unitPrice, boolean active) {
        this.unitPrice = unitPrice;
        this.active = active;
        this.updatedAt = Instant.now();
    }

    String getCode() {
        return code;
    }

    String getName() {
        return name;
    }

    String getCategory() {
        return category;
    }

    BigDecimal getUnitPrice() {
        return unitPrice;
    }

    String getBillingPeriod() {
        return billingPeriod;
    }

    boolean isActive() {
        return active;
    }
}
