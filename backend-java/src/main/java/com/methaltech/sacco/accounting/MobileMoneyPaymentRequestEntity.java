package com.methaltech.sacco.accounting;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mobile_money_payment_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class MobileMoneyPaymentRequestEntity {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "member_id")
    private String memberId;

    @Column(name = "loan_id")
    private String loanId;

    private String purpose;
    private BigDecimal amount;

    @Column(name = "currency_code")
    private String currencyCode;

    @Column(name = "payer_phone")
    private String payerPhone;

    @Column(name = "external_reference")
    private String externalReference;

    private String provider;

    @Column(name = "provider_reference")
    private String providerReference;

    @Column(name = "provider_payload")
    private String providerPayload;

    private String status;

    @Column(name = "status_message")
    private String statusMessage;

    @Column(name = "checkout_prompt")
    private String checkoutPrompt;

    @Column(name = "callback_posting")
    private boolean callbackPosting;

    @Column(name = "requested_at")
    private Instant requestedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    static MobileMoneyPaymentRequestEntity from(MobileMoneyPaymentResult result, String loanId, String payerPhone, String providerPayload) {
        Instant now = Instant.now();
        MobileMoneyPaymentRequestEntity request = new MobileMoneyPaymentRequestEntity();
        request.id = result.id();
        request.tenantId = result.tenantId();
        request.memberId = result.memberId();
        request.loanId = loanId == null || loanId.isBlank() ? null : loanId.trim();
        request.purpose = result.purpose();
        request.amount = result.amount();
        request.currencyCode = result.currencyCode();
        request.payerPhone = payerPhone;
        request.externalReference = result.externalReference();
        request.provider = result.provider();
        request.providerReference = result.providerReference();
        request.providerPayload = providerPayload;
        request.status = result.status();
        request.statusMessage = result.statusMessage();
        request.checkoutPrompt = result.checkoutPrompt();
        request.callbackPosting = result.callbackPosting();
        request.requestedAt = result.requestedAt();
        request.createdAt = now;
        request.updatedAt = now;
        return request;
    }

    void markPosted(String resourceType, String resourceId) {
        this.status = "posted";
        this.statusMessage = "Provider callback posted " + resourceType + " " + resourceId + ".";
        this.completedAt = Instant.now();
        this.updatedAt = this.completedAt;
    }

    void updateStatus(String status, String reason) {
        this.status = status;
        this.statusMessage = reason == null || reason.isBlank() ? "Payment request marked " + status + "." : reason.trim();
        if (Set.of("failed", "expired", "cancelled").contains(status)) {
            this.completedAt = Instant.now();
        }
        this.updatedAt = Instant.now();
    }

    void syncProviderStatus(MobileMoneyProviderStatusResult result) {
        this.status = result.status();
        this.statusMessage = result.statusMessage();
        this.providerReference = result.providerReference();
        this.callbackPosting = result.callbackPosting();
        if (Set.of("failed", "expired", "cancelled").contains(result.status())) {
            this.completedAt = result.checkedAt();
        }
        this.updatedAt = result.checkedAt();
    }
}
