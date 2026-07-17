package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

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

    public String getId() {
        return id;
    }

    public String getTenantId() {
        return tenantId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getPasswordSalt() {
        return passwordSalt;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    void changePassword(String passwordHash, String passwordSalt) {
        this.passwordHash = passwordHash;
        this.passwordSalt = passwordSalt;
    }
}
