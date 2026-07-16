package com.methaltech.sacco.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "accounting_periods")
class AccountingPeriod {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String period;

    private String status;

    @Column(name = "closed_by_user_id")
    private String closedByUserId;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected AccountingPeriod() {
    }

    void updateStatus(String status, String actorUserId) {
        this.status = status;
        this.closedByUserId = "closed".equals(status) ? actorUserId : null;
        this.closedAt = "closed".equals(status) ? Instant.now() : null;
        this.updatedAt = Instant.now();
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getPeriod() {
        return period;
    }

    String getStatus() {
        return status;
    }

    String getClosedByUserId() {
        return closedByUserId;
    }

    Instant getClosedAt() {
        return closedAt;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Instant getUpdatedAt() {
        return updatedAt;
    }
}
