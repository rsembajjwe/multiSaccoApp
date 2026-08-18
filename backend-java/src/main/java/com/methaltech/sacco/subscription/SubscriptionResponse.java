package com.methaltech.sacco.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record SubscriptionResponse(
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
        String lifecycleState,
        Long daysToExpiry,
        Instant createdAt,
        Instant updatedAt) {

    /** Days a subscription may be past expiry before enforcement (display hint; server config is authoritative). */
    private static final int GRACE_DAYS = 7;
    /** Days before expiry from which the UI shows a renewal warning. */
    private static final int EXPIRING_SOON_DAYS = 14;

    public static SubscriptionResponse from(Subscription subscription) {
        LocalDate expiry = subscription.getExpiry();
        Long daysToExpiry = expiry == null ? null : ChronoUnit.DAYS.between(LocalDate.now(), expiry);
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
                expiry,
                lifecycleState(subscription.getStatus(), daysToExpiry),
                daysToExpiry,
                subscription.getCreatedAt(),
                subscription.getUpdatedAt());
    }

    /**
     * Derived display state: {@code expired}/{@code pending_payment} come straight from status; an active
     * subscription is {@code grace} once past expiry (until the job expires it), {@code expiring} within the
     * warning window, otherwise {@code active}.
     */
    static String lifecycleState(String status, Long daysToExpiry) {
        if (!"active".equals(status)) {
            return status;
        }
        if (daysToExpiry == null) {
            return "active";
        }
        if (daysToExpiry < -GRACE_DAYS) {
            return "expired";
        }
        if (daysToExpiry < 0) {
            return "grace";
        }
        if (daysToExpiry <= EXPIRING_SOON_DAYS) {
            return "expiring";
        }
        return "active";
    }
}
