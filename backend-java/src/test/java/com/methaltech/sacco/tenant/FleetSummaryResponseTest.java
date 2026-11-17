package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import com.methaltech.sacco.subscription.Subscription;
import org.junit.jupiter.api.Test;

class FleetSummaryResponseTest {
    @Test
    void explainsSetupProgressAndIncludesSmsBalance() {
        Tenant tenant = new Tenant("tenant_one", "One SACCO", "ONE", "REG-1", "Kampala",
                LocalDate.now().plusYears(1), "community");
        tenant.activate();
        SaccoProfile profile = new SaccoProfile("profile_one", tenant.getId(), "One SACCO", "", "",
                "REG-1", "Kampala", "office@example.com", "+256700000001", "");
        Subscription subscription = new Subscription("subscription_one", tenant.getId(), "community", "trial",
                "INV-1", new BigDecimal("100000"), BigDecimal.ZERO, 3, 3, new BigDecimal("5000"),
                "tier_one", "Starter", "Starter", LocalDate.now().plusMonths(1));

        FleetTenantResponse complete = FleetTenantResponse.from(tenant, subscription, profile,
                Set.of("chairperson", "treasurer", "secretary"), 47);
        FleetTenantResponse incomplete = FleetTenantResponse.from(tenant, subscription, profile,
                Set.of("chairperson"), 0);

        assertEquals(100, complete.onboarding());
        assertEquals(List.of(), complete.setupMissing());
        assertEquals(47, complete.smsBalance());
        assertEquals(List.of("Treasurer assignment", "Secretary assignment"), incomplete.setupMissing());
        assertEquals(75, incomplete.onboarding());
    }

    @Test
    void aggregatesTheEntireFleet() {
        FleetSummaryResponse summary = FleetSummaryResponse.from(List.of(
                row("one", "active", "healthy", "manager", "active", LocalDate.now().plusDays(90), "0", 100),
                row("two", "active", "attention", null, "active", LocalDate.now().plusDays(15), "25000", 70),
                row("three", "suspended", "critical", null, "expired", LocalDate.now().minusDays(1), "75000", 40)));
        assertEquals(3, summary.totalOrganizations());
        assertEquals(1, summary.healthy());
        assertEquals(1, summary.attention());
        assertEquals(1, summary.critical());
        assertEquals(2, summary.active());
        assertEquals(2, summary.unassigned());
        assertEquals(1, summary.renewalsDueIn30Days());
        assertEquals(1, summary.expiredSubscriptions());
        assertEquals(new BigDecimal("100000"), summary.outstandingSubscriptionBalance());
        assertEquals(new BigDecimal("300000"), summary.totalSubscriptionRevenue());
        assertEquals(70, summary.averageOnboarding());
        assertEquals(2, summary.subscriptionDistribution().get("active"));
        assertEquals(2, summary.portfolioDistribution().get("Unassigned"));
        assertEquals(3, summary.districtDistribution().get("Kampala"));
        assertEquals("Unassigned", summary.portfolioWorkloads().get(0).label());
        assertEquals(2, summary.portfolioWorkloads().get(0).total());
        assertEquals(1, summary.portfolioWorkloads().get(0).critical());
        assertEquals("Kampala", summary.districtWorkloads().get(0).label());
        assertEquals(3, summary.districtWorkloads().get(0).total());
        assertEquals(2, summary.riskQueue().size());
        assertEquals("critical", summary.riskQueue().get(0).severity());
        assertEquals("breached", summary.riskQueue().get(0).slaStatus());
        assertEquals(2, summary.renewalsDueIn90Days());
        assertEquals(new BigDecimal("200000"), summary.projectedRenewalValue90Days());
        assertEquals(6, summary.renewalForecast().size());
        assertEquals(2, summary.renewalForecast().stream().mapToLong(FleetSummaryResponse.RenewalForecast::organizations).sum());
    }

    private FleetTenantResponse row(String id, String status, String health, String manager,
            String subscriptionStatus, LocalDate expiry, String balance, int onboarding) {
        return new FleetTenantResponse(id, id.toUpperCase(), "Group " + id, status, "Kampala", "Uganda",
                "growth", manager, manager, health, "test", subscriptionStatus, expiry,
                new BigDecimal("100000"), new BigDecimal(balance), onboarding, List.of(), 25,
                Instant.now().minusSeconds(48 * 60 * 60));
    }
}
