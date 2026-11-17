package com.methaltech.sacco.tenant;

import com.methaltech.sacco.subscription.Subscription;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

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
        List<String> setupMissing,
        int smsBalance,
        Instant updatedAt) {

    static FleetTenantResponse from(Tenant tenant, Subscription subscription) {
        return from(tenant, subscription, null, Set.of(), 0);
    }

    static FleetTenantResponse from(
            Tenant tenant,
            Subscription subscription,
            SaccoProfile profile,
            Set<String> assignedOffices,
            int smsBalance) {
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
        List<String> setupMissing = setupMissing(tenant, subscription, profile, assignedOffices);
        int onboarding = Math.round(((8 - setupMissing.size()) * 100f) / 8);
        return new FleetTenantResponse(
                tenant.getId(), tenant.getAbbreviation(), tenant.getName(), tenant.getStatus(),
                tenant.getDistrict(), tenant.getCountry(), tenant.getPackageId(),
                tenant.getAccountManagerUserId(), tenant.getAccountManagerName(), health, reason,
                subscription == null ? "unassigned" : subscription.getStatus(),
                subscription == null ? null : subscription.getExpiry(),
                amount, amount.subtract(paid).max(BigDecimal.ZERO), onboarding, List.copyOf(setupMissing),
                smsBalance, tenant.getUpdatedAt());
    }

    private static List<String> setupMissing(
            Tenant tenant,
            Subscription subscription,
            SaccoProfile profile,
            Set<String> assignedOffices) {
        List<String> missing = new ArrayList<>();
        if (blank(tenant.getRegistrationNo())) missing.add("Registration number");
        if (blank(tenant.getDistrict())) missing.add("District");
        if (profile == null || (blank(profile.getPhone()) && blank(profile.getEmail()))) {
            missing.add("SACCO contact phone or email");
        }
        if (subscription == null) {
            missing.add("Subscription package");
        } else if (!Set.of("active", "trial").contains(subscription.getStatus())) {
            missing.add("Active subscription or trial");
        }
        if (!assignedOffices.contains(SaccoOfficialAssignment.CHAIRPERSON)) missing.add("Chairperson assignment");
        if (!assignedOffices.contains(SaccoOfficialAssignment.TREASURER)) missing.add("Treasurer assignment");
        if (!assignedOffices.contains(SaccoOfficialAssignment.SECRETARY)) missing.add("Secretary assignment");
        if (!"active".equals(tenant.getStatus())) missing.add("Active SACCO lifecycle");
        return missing;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
