package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "member_sessions")
class MemberSession {

    @Id
    private String id;

    @Column(name = "member_id")
    private String memberId;

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

    protected MemberSession() {
    }

    MemberSession(String id, String memberId, String tenantId, String tokenHash, Instant expiresAt) {
        this.id = id;
        this.memberId = memberId;
        this.tenantId = tenantId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    String getId() {
        return id;
    }

    String getMemberId() {
        return memberId;
    }

    Instant getExpiresAt() {
        return expiresAt;
    }

    void revoke() {
        this.revokedAt = Instant.now();
    }
}
