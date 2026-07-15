package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
class User {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "full_name")
    private String fullName;

    private String email;

    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "password_salt")
    private String passwordSalt;

    private String status;

    @Column(name = "created_at")
    private Instant createdAt;

    protected User() {
    }

    User(
            String id,
            String tenantId,
            String fullName,
            String email,
            String phone,
            String passwordHash,
            String passwordSalt,
            String status) {
        this.id = id;
        this.tenantId = tenantId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
        this.status = status;
        this.createdAt = Instant.now();
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getFullName() {
        return fullName;
    }

    String getEmail() {
        return email;
    }

    String getPhone() {
        return phone;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    String getPasswordSalt() {
        return passwordSalt;
    }

    String getStatus() {
        return status;
    }

    Instant getCreatedAt() {
        return createdAt;
    }
}
