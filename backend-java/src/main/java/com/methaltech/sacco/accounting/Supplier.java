package com.methaltech.sacco.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "suppliers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class Supplier {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String name;
    private String phone;
    private String email;

    @Column(name = "tax_id")
    private String taxId;

    private String status;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    Supplier(
            String id,
            String tenantId,
            String name,
            String phone,
            String email,
            String taxId,
            String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.taxId = taxId;
        this.status = "active";
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
