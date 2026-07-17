package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mfa_challenges")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MfaChallenge {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "code_hash")
    private String codeHash;

    private String status;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    MfaChallenge(String id, String tenantId, String userId, String codeHash, Instant expiresAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.userId = userId;
        this.codeHash = codeHash;
        this.status = "pending";
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    void verify() {
        this.status = "verified";
        this.verifiedAt = Instant.now();
    }
}
