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
    void billsMinimumTwentyMembersAtFiveThousandForSmallSaccos() {
        SubscriptionBilling billing = service.calculateBilling(12);

        assertEquals(12, billing.memberCount());
        assertEquals(20, billing.billableMembers());
        assertEquals(new BigDecimal("5000"), billing.unitPrice());
        assertEquals("per_member", billing.tierId());
        assertEquals(new BigDecimal("100000"), billing.amount());
    }

    @Test
    void billsActualMembersAtFiveThousandUpToTwoHundredFiftyMembers() {
        SubscriptionBilling billing = service.calculateBilling(250);

        assertEquals(250, billing.memberCount());
        assertEquals(250, billing.billableMembers());
        assertEquals(new BigDecimal("5000"), billing.unitPrice());
        assertEquals("20-250 members", billing.tierLabel());
        assertEquals(new BigDecimal("1250000"), billing.amount());
    }

    @Test
    void switchesToFixedTiersAboveTwoHundredFiftyMembers() {
        SubscriptionBilling firstFixedTier = service.calculateBilling(251);
        SubscriptionBilling growthTier = service.calculateBilling(501);
        SubscriptionBilling scaleTier = service.calculateBilling(1001);
        SubscriptionBilling enterpriseTier = service.calculateBilling(2501);
        SubscriptionBilling enterprisePlusTier = service.calculateBilling(5001);

        assertEquals("starter_fixed", firstFixedTier.tierId());
        assertEquals(500, firstFixedTier.billableMembers());
        assertNull(firstFixedTier.unitPrice());
        assertEquals(new BigDecimal("1200000"), firstFixedTier.amount());

        assertEquals("growth_fixed", growthTier.tierId());
        assertEquals(1000, growthTier.billableMembers());
        assertEquals(new BigDecimal("2500000"), growthTier.amount());

        assertEquals("scale_fixed", scaleTier.tierId());
        assertEquals(2500, scaleTier.billableMembers());
        assertEquals(new BigDecimal("5000000"), scaleTier.amount());

        assertEquals("enterprise_fixed", enterpriseTier.tierId());
        assertEquals(5000, enterpriseTier.billableMembers());
        assertEquals(new BigDecimal("8000000"), enterpriseTier.amount());

        assertEquals("enterprise_plus_fixed", enterprisePlusTier.tierId());
        assertEquals(10000, enterprisePlusTier.billableMembers());
        assertEquals(new BigDecimal("12000000"), enterprisePlusTier.amount());
    }

    @Test
    void initialPaidSubscriptionActivatesAndUnpaidSubscriptionWaitsForPayment() {
        Subscription paid = service.createInitialSubscription("tenant_green", "growth", true);
        Subscription unpaid = service.createInitialSubscription("tenant_green", " ", false);

        assertEquals("active", paid.getStatus());
        assertEquals(paid.getAmount(), paid.getPaid());
        assertEquals(LocalDate.now().plusYears(1), paid.getExpiry());

        assertEquals("trial", unpaid.getStatus());
        assertEquals("starter", unpaid.getPackageId());
        assertEquals(BigDecimal.ZERO, unpaid.getPaid());
        assertEquals(LocalDate.now().plusMonths(1), unpaid.getExpiry());
    }

    @Test
    void refreshBillingUsesLiveMemberCountAndDowngradesUnderpaidActiveSubscription() {
        when(memberRepository.countByTenantId("tenant_green")).thenReturn(251L);
        Subscription subscription = service.createInitialSubscription("tenant_green", "starter", true);

        Subscription refreshed = service.refreshBilling(subscription);

        assertEquals(251, refreshed.getMemberCount());
        assertEquals("starter_fixed", refreshed.getTierId());
        assertEquals(new BigDecimal("1200000"), refreshed.getAmount());
        assertEquals(new BigDecimal("100000"), refreshed.getPaid());
        assertEquals("pending_payment", refreshed.getStatus());
    }
}
