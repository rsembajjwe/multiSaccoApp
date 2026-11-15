package com.methaltech.sacco.subscription;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.Member;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class SubscriptionAccessServiceTest {

    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final SubscriptionAccessService service = new SubscriptionAccessService(subscriptionRepository);

    @Test
    void freeTrialAllowsAllRegisteredMembers() {
        Member member = member("member_one", "tenant_one");
        Subscription subscription = subscription("trial", 8);
        when(subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc("tenant_one"))
                .thenReturn(Optional.of(subscription));

        SubscriptionAccessService.MemberDepositAccess access = service.memberDataAccess(member);

        assertTrue(access.allowed());
        assertEquals(8, access.coveredMembers());
    }

    @Test
    void activeSaccoSubscriptionAllowsStaffTransactionsForEveryMember() {
        Member member = member("member_one", "tenant_one");
        Subscription subscription = subscription("active", 8);
        when(subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc("tenant_one"))
                .thenReturn(Optional.of(subscription));

        SubscriptionAccessService.MemberDepositAccess access = service.memberDataAccess(member);

        assertTrue(access.allowed());
        assertEquals(8, access.coveredMembers());
    }

    @Test
    void expiredFreeTrialBlocksMemberUpdatesImmediately() {
        Member member = member("member_one", "tenant_one");
        Subscription subscription = subscription("trial", 8);
        when(subscription.getExpiry()).thenReturn(LocalDate.now().minusDays(1));
        when(subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc("tenant_one"))
                .thenReturn(Optional.of(subscription));

        SubscriptionAccessService.MemberDepositAccess access = service.memberDataAccess(member);

        assertFalse(access.allowed());
        assertEquals("SACCO_SUBSCRIPTION_EXPIRED", access.code());
    }

    private Member member(String id, String tenantId) {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn(id);
        when(member.getTenantId()).thenReturn(tenantId);
        return member;
    }

    private Subscription subscription(String status, int memberCount) {
        Subscription subscription = mock(Subscription.class);
        when(subscription.getStatus()).thenReturn(status);
        when(subscription.getMemberCount()).thenReturn(memberCount);
        return subscription;
    }
}
