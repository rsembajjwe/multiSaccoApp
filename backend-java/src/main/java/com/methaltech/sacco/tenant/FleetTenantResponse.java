package com.methaltech.sacco.tenant;

import com.methaltech.sacco.subscription.Subscription;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

record FleetTenantResponse(
        String id,
        String saccoCode,
        String name,
        String status,
        String district,
        String country,
        String packageId,
        String accountManagerUserId,
        String accountManagerName,
        String health,
        String healthReason,
        String subscriptionStatus,
        LocalDate subscriptionExpiry,
        BigDecimal subscriptionAmount,
        BigDecimal balanceDue,
        int onboarding,
        Instant updatedAt) {

    static FleetTenantResponse from(Tenant tenant, Subscription subscription) {
        String health = "healthy";
        String reason = "Operating normally";
        LocalDate today = LocalDate.now();
        if ("suspended".equals(tenant.getStatus()) || "terminated".equals(tenant.getStatus())) {
            health = "critical";
            reason = "Platform access is " + tenant.getStatus();
        } else if (subscription == null) {
            health = "attention";
            reason = "No subscription assigned";
        } else if ("expired".equals(subscription.getStatus())
                || (subscription.getExpiry() != null && subscription.getExpiry().isBefore(today))) {
            health = "critical";
            reason = "Subscription expired";
        } else if (subscription.getExpiry() != null && !subscription.getExpiry().isAfter(today.plusDays(30))) {
            health = "attention";
            reason = "Subscription expires within 30 days";
        } else if (!"active".equals(tenant.getStatus())) {
            health = "attention";
            reason = "Lifecycle status requires review";
        }
        BigDecimal amount = subscription == null || subscription.getAmount() == null ? BigDecimal.ZERO : subscription.getAmount();
        BigDecimal paid = subscription == null || subscription.getPaid() == null ? BigDecimal.ZERO : subscription.getPaid();
        return new FleetTenantResponse(
                tenant.getId(), tenant.getAbbreviation(), tenant.getName(), tenant.getStatus(),
                tenant.getDistrict(), tenant.getCountry(), tenant.getPackageId(),
                tenant.getAccountManagerUserId(), tenant.getAccountManagerName(), health, reason,
                subscription == null ? "unassigned" : subscription.getStatus(),
                subscription == null ? null : subscription.getExpiry(),
                amount, amount.subtract(paid).max(BigDecimal.ZERO), tenant.getOnboarding(), tenant.getUpdatedAt());
    }
}
