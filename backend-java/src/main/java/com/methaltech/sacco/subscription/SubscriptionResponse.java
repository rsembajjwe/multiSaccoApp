package com.methaltech.sacco.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record SubscriptionResponse(
        String id,
        String tenantId,
        String packageId,
        String status,
        String invoice,
        BigDecimal amount,
        BigDecimal paid,
        int memberCount,
        int billableMembers,
        BigDecimal unitPrice,
        String tierId,
        String tierLabel,
        String billingDescription,
        LocalDate expiry,
        Instant createdAt,
        Instant updatedAt) {

    static SubscriptionResponse from(Subscription subscription) {
        return new SubscriptionResponse(
                subscription.getId(),
                subscription.getTenantId(),
                subscription.getPackageId(),
                subscription.getStatus(),
                subscription.getInvoice(),
                subscription.getAmount(),
                subscription.getPaid(),
                subscription.getMemberCount(),
                subscription.getBillableMembers(),
                subscription.getUnitPrice(),
                subscription.getTierId(),
                subscription.getTierLabel(),
                subscription.getBillingDescription(),
                subscription.getExpiry(),
                subscription.getCreatedAt(),
                subscription.getUpdatedAt());
    }
}
