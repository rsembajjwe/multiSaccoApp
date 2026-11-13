package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class FleetSummaryResponseTest {
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
                new BigDecimal("100000"), new BigDecimal(balance), onboarding, Instant.now().minusSeconds(48 * 60 * 60));
    }
}
