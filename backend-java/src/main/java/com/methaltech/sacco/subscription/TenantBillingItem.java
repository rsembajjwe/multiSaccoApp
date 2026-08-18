package com.methaltech.sacco.subscription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A SACCO's active selection of a billable catalog item (add-on module, support, or setup fee). */
@Entity
@Table(name = "tenant_billing_items")
class TenantBillingItem {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "catalog_code")
    private String catalogCode;

    private int quantity;

    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected TenantBillingItem() {
    }

    TenantBillingItem(String id, String tenantId, String catalogCode, int quantity) {
        this.id = id;
        this.tenantId = tenantId;
        this.catalogCode = catalogCode;
        this.quantity = Math.max(1, quantity);
        this.status = "active";
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    void cancel() {
        this.status = "cancelled";
        this.updatedAt = Instant.now();
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getCatalogCode() {
        return catalogCode;
    }

    int getQuantity() {
        return quantity;
    }

    String getStatus() {
        return status;
    }
}
