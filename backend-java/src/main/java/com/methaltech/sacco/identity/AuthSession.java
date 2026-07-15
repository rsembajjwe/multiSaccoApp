package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "auth_sessions")
class AuthSession {

    @Id
    private String id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    protected AuthSession() {
    }

    AuthSession(String id, String userId, String tenantId, String tokenHash, Instant expiresAt) {
        this.id = id;
        this.userId = userId;
        this.tenantId = tenantId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    String getUserId() {
        return userId;
    }

    void revoke() {
        this.revokedAt = Instant.now();
    }
}
