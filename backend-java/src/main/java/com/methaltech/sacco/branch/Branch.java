package com.methaltech.sacco.branch;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "branches")
public class Branch {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String code;

    private String name;

    private String address;

    @Column(name = "manager_user_id")
    private String managerUserId;

    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected Branch() {
    }

    Branch(String id, String tenantId, String code, String name, String address, String managerUserId, String status) {
        this.id = id;
        this.tenantId = tenantId;
        this.code = code;
        this.name = name;
        this.address = address;
        this.managerUserId = managerUserId;
        this.status = status;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getAddress() {
        return address;
    }

    public String getManagerUserId() {
        return managerUserId;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
