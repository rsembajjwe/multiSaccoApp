package com.methaltech.sacco.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A member password-reset request. Email/WhatsApp requests start {@code pending} (code issued
 * immediately, free). SMS requests start {@code pending_payment} and are activated to {@code pending}
 * only once the UGX 500 mobile-money payment is confirmed. Single-use and short-lived.
 */
@Entity
@Table(name = "member_password_reset_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberPasswordResetRequest {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    private String token;
    private String channel;
    private String status;
    private BigDecimal amount;

    @Column(name = "external_reference")
    private String externalReference;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    public MemberPasswordResetRequest(
            String id,
            String tenantId,
            String memberId,
            String token,
            String channel,
            String status,
            BigDecimal amount,
            String externalReference,
            Instant expiresAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.token = token;
        this.channel = channel;
        this.status = status;
        this.amount = amount == null ? BigDecimal.ZERO : amount;
        this.externalReference = externalReference;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    /** Activates a paid SMS reset so the code becomes usable. */
    public void activate() {
        this.status = "pending";
    }

    void markUsed() {
        this.status = "used";
        this.usedAt = Instant.now();
    }
}
