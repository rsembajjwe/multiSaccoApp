package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.methaltech.sacco.subscription.Subscription;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class FleetTenantResponseTest {

    @Test
    void classifiesHealthyAndExpiringSaccos() {
        Tenant tenant = tenant("tenant_one");
        tenant.activate();

        FleetTenantResponse healthy = FleetTenantResponse.from(tenant, subscription("active", LocalDate.now().plusDays(90)));
        FleetTenantResponse attention = FleetTenantResponse.from(tenant, subscription("active", LocalDate.now().plusDays(10)));

        assertEquals("healthy", healthy.health());
        assertEquals("attention", attention.health());
        assertEquals("Subscription expires within 30 days", attention.healthReason());
    }

    @Test
    void suspendedAccessOverridesSubscriptionHealth() {
        Tenant tenant = tenant("tenant_two");
        tenant.updateStatus("suspended");

        FleetTenantResponse response = FleetTenantResponse.from(tenant, subscription("active", LocalDate.now().plusYears(1)));

        assertEquals("critical", response.health());
        assertEquals("Platform access is suspended", response.healthReason());
    }

    @Test
    void reportsOutstandingSubscriptionBalance() {
        Tenant tenant = tenant("tenant_three");
        tenant.activate();

        FleetTenantResponse response = FleetTenantResponse.from(tenant, subscription("pending_payment", LocalDate.now().plusDays(60)));

        assertEquals(new BigDecimal("75000"), response.balanceDue());
    }

    private Tenant tenant(String id) {
        return new Tenant(id, "Example SACCO", "EXAM", "REG-1", "Kampala", LocalDate.now().plusYears(1), "growth");
    }

    private Subscription subscription(String status, LocalDate expiry) {
        return new Subscription(
                "subscription_1", "tenant_one", "growth", status, "INV-1",
                new BigDecimal("100000"), new BigDecimal("25000"), 20, 20,
                new BigDecimal("5000"), "tier", "Growth", "Annual subscription", expiry);
    }
}
