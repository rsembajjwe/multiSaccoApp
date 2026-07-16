package com.methaltech.sacco.accounting;

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
@Table(name = "mobile_money_callbacks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MobileMoneyCallback {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    private String purpose;
    private BigDecimal amount;

    @Column(name = "external_reference")
    private String externalReference;

    private String provider;

    @Column(name = "provider_payload")
    private String providerPayload;

    private String status;

    @Column(name = "resource_type")
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    MobileMoneyCallback(
            String id,
            String tenantId,
            String memberId,
            String purpose,
            BigDecimal amount,
            String externalReference,
            String provider,
            String providerPayload,
            String status,
            String resourceType,
            String resourceId) {
        this.id = id;
        this.tenantId = tenantId;
        this.memberId = memberId;
        this.purpose = purpose;
        this.amount = amount;
        this.externalReference = externalReference;
        this.provider = provider;
        this.providerPayload = providerPayload;
        this.status = status;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.receivedAt = Instant.now();
        this.createdAt = this.receivedAt;
    }
}
