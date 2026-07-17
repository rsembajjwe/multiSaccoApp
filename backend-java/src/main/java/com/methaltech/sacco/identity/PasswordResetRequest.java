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
@Table(name = "password_reset_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class PasswordResetRequest {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "token_hash")
    private String tokenHash;

    private String status;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    PasswordResetRequest(String id, String tenantId, String userId, String tokenHash, Instant expiresAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.status = "pending";
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    void markUsed() {
        this.status = "used";
        this.usedAt = Instant.now();
    }
}
