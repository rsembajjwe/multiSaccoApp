package com.methaltech.sacco.subscription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subscription_payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubscriptionPayment {

    @Id
    private String id;

    @Column(name = "subscription_id")
    private String subscriptionId;

    @Column(name = "tenant_id")
    private String tenantId;

    private BigDecimal amount;
    private String channel;

    @Column(name = "external_reference")
    private String externalReference;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "recorded_by_user_id")
    private String recordedByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    SubscriptionPayment(
            String id,
            String subscriptionId,
            String tenantId,
            BigDecimal amount,
            String channel,
            String externalReference,
            Instant receivedAt,
            String recordedByUserId) {
        this.id = id;
        this.subscriptionId = subscriptionId;
        this.tenantId = tenantId;
        this.amount = amount;
        this.channel = channel;
        this.externalReference = externalReference;
        this.receivedAt = receivedAt;
        this.recordedByUserId = recordedByUserId;
        this.createdAt = Instant.now();
    }
}
