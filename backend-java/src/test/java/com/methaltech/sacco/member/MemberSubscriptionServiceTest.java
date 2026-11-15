package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.subscription.Subscription;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class MemberSubscriptionServiceTest {

    private final MemberSubscriptionRepository repository = mock(MemberSubscriptionRepository.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final MemberSubscriptionService service = new MemberSubscriptionService(
            repository,
            memberRepository,
            notificationService,
            subscriptionRepository,
            7,
            14);

    @Test
    void lateMemberPaymentEndsWithTheExistingSaccoCycle() {
        LocalDate saccoCycleEnd = LocalDate.now().plusMonths(2);
        Subscription saccoSubscription = activeSaccoSubscription(saccoCycleEnd);
        MemberSubscription memberSubscription = new MemberSubscription(
                "membersub_one",
                "tenant_one",
                "member_one",
                "Member app annual access",
                BigDecimal.valueOf(5000),
                "annual",
                LocalDate.now(),
                saccoCycleEnd);
        when(subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc("tenant_one"))
                .thenReturn(Optional.of(saccoSubscription));
        when(repository.save(any(MemberSubscription.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MemberSubscription paid = service.recordPayment(memberSubscription, BigDecimal.valueOf(5000));

        assertEquals("active", paid.getStatus());
        assertEquals(saccoCycleEnd, paid.getExpiry());
        assertEquals(BigDecimal.valueOf(5000), paid.getAmount());
    }

    @Test
    void paidMemberGetsMemberAppAccessOnlyDuringActiveSaccoCycle() {
        LocalDate saccoCycleEnd = LocalDate.now().plusYears(1);
        Subscription saccoSubscription = activeSaccoSubscription(saccoCycleEnd);
        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        MemberSubscription memberSubscription = new MemberSubscription(
                "membersub_one",
                "tenant_one",
                "member_one",
                "Member app annual access",
                BigDecimal.valueOf(5000),
                "annual",
                LocalDate.now(),
                saccoCycleEnd);
        memberSubscription.recordPayment(BigDecimal.valueOf(5000), saccoCycleEnd);
        when(subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc("tenant_one"))
                .thenReturn(Optional.of(saccoSubscription));
        when(repository.findFirstByMemberIdOrderByCreatedAtDesc("member_one"))
                .thenReturn(Optional.of(memberSubscription));

        MemberSubscriptionService.MemberAppAccess access = service.accessFor(member);

        assertTrue(access.allowed());
        assertEquals(saccoCycleEnd, access.expiry());
    }

    private Subscription activeSaccoSubscription(LocalDate expiry) {
        Subscription subscription = mock(Subscription.class);
        when(subscription.getStatus()).thenReturn("active");
        when(subscription.getExpiry()).thenReturn(expiry);
        return subscription;
    }
}
