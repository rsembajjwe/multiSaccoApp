package com.methaltech.sacco.member;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record MemberSubscriptionResponse(
        String id,
        String tenantId,
        String memberId,
        String planName,
        BigDecimal amount,
        BigDecimal paid,
        BigDecimal balanceDue,
        String status,
        String billingPeriod,
        LocalDate startDate,
        LocalDate expiry,
        String lifecycleState,
        Long daysToExpiry,
        Instant createdAt,
        Instant updatedAt) {

    private static final int GRACE_DAYS = 7;
    private static final int EXPIRING_SOON_DAYS = 14;

    public static MemberSubscriptionResponse from(MemberSubscription subscription) {
        LocalDate expiry = subscription.getExpiry();
        Long daysToExpiry = expiry == null ? null : ChronoUnit.DAYS.between(LocalDate.now(), expiry);
        BigDecimal amount = subscription.getAmount() == null ? BigDecimal.ZERO : subscription.getAmount();
        BigDecimal paid = subscription.getPaid() == null ? BigDecimal.ZERO : subscription.getPaid();
        return new MemberSubscriptionResponse(
                subscription.getId(),
                subscription.getTenantId(),
                subscription.getMemberId(),
                subscription.getPlanName(),
                amount,
                paid,
                amount.subtract(paid).max(BigDecimal.ZERO),
                subscription.getStatus(),
                subscription.getBillingPeriod(),
                subscription.getStartDate(),
                expiry,
                lifecycleState(subscription.getStatus(), daysToExpiry),
                daysToExpiry,
                subscription.getCreatedAt(),
                subscription.getUpdatedAt());
    }

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
