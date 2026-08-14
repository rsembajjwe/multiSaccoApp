package com.methaltech.sacco.subscription;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.MemberRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SubscriptionServiceTest {

    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final SubscriptionService service = new SubscriptionService(memberRepository);

    @Test
    void billsMinimumOneHundredMembersAtFiveThousandForSmallSaccos() {
        SubscriptionBilling billing = service.calculateBilling(12);

        assertEquals(12, billing.memberCount());
        assertEquals(100, billing.billableMembers());
        assertEquals(new BigDecimal("5000"), billing.unitPrice());
        assertEquals("per_member", billing.tierId());
        assertEquals(new BigDecimal("500000"), billing.amount());
    }

    @Test
    void billsActualMembersAtFiveThousandUpToTwoHundredFiftyMembers() {
        SubscriptionBilling billing = service.calculateBilling(250);

        assertEquals(250, billing.memberCount());
        assertEquals(250, billing.billableMembers());
        assertEquals(new BigDecimal("5000"), billing.unitPrice());
        assertEquals("100-250 members", billing.tierLabel());
        assertEquals(new BigDecimal("1250000"), billing.amount());
    }

    @Test
    void switchesToFixedTiersAboveTwoHundredFiftyMembers() {
        SubscriptionBilling firstFixedTier = service.calculateBilling(251);
        SubscriptionBilling growthTier = service.calculateBilling(501);
        SubscriptionBilling enterpriseTier = service.calculateBilling(2501);

        assertEquals("starter_fixed", firstFixedTier.tierId());
        assertEquals(500, firstFixedTier.billableMembers());
        assertNull(firstFixedTier.unitPrice());
        assertEquals(new BigDecimal("1200000"), firstFixedTier.amount());

        assertEquals("growth_fixed", growthTier.tierId());
        assertEquals(2500, growthTier.billableMembers());
        assertEquals(new BigDecimal("3600000"), growthTier.amount());

        assertEquals("enterprise_fixed", enterpriseTier.tierId());
        assertEquals(10000, enterpriseTier.billableMembers());
        assertEquals(new BigDecimal("9000000"), enterpriseTier.amount());
    }

    @Test
    void initialPaidSubscriptionActivatesAndUnpaidSubscriptionWaitsForPayment() {
        Subscription paid = service.createInitialSubscription("tenant_green", "growth", true);
        Subscription unpaid = service.createInitialSubscription("tenant_green", " ", false);

        assertEquals("active", paid.getStatus());
        assertEquals(paid.getAmount(), paid.getPaid());
        assertEquals(LocalDate.now().plusYears(1), paid.getExpiry());

        assertEquals("pending_payment", unpaid.getStatus());
        assertEquals("starter", unpaid.getPackageId());
        assertEquals(BigDecimal.ZERO, unpaid.getPaid());
        assertEquals(LocalDate.now().plusDays(14), unpaid.getExpiry());
    }

    @Test
    void refreshBillingUsesLiveMemberCountAndDowngradesUnderpaidActiveSubscription() {
        when(memberRepository.countByTenantId("tenant_green")).thenReturn(251L);
        Subscription subscription = service.createInitialSubscription("tenant_green", "starter", true);

        Subscription refreshed = service.refreshBilling(subscription);

        assertEquals(251, refreshed.getMemberCount());
        assertEquals("starter_fixed", refreshed.getTierId());
        assertEquals(new BigDecimal("1200000"), refreshed.getAmount());
        assertEquals(new BigDecimal("500000"), refreshed.getPaid());
        assertEquals("pending_payment", refreshed.getStatus());
    }
}
