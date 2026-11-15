package com.methaltech.sacco.member;

import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.subscription.Subscription;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages annual member-app access. Every member pays the fixed fee, while access expiry is aligned to
 * the SACCO staff-app subscription cycle rather than calculated from the member's payment date.
 */
@Service
public class MemberSubscriptionService {

    private final MemberSubscriptionRepository repository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;
    public static final BigDecimal MEMBER_APP_ANNUAL_FEE = BigDecimal.valueOf(5000);
    private final SubscriptionRepository subscriptionRepository;
    private final int graceDays;
    private final int reminderWindowDays;

    MemberSubscriptionService(
            MemberSubscriptionRepository repository,
            MemberRepository memberRepository,
            NotificationService notificationService,
            SubscriptionRepository subscriptionRepository,
            @Value("${sacco.member-subscription.grace-days:7}") int graceDays,
            @Value("${sacco.member-subscription.reminder-window-days:14}") int reminderWindowDays) {
        this.repository = repository;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
        this.subscriptionRepository = subscriptionRepository;
        this.graceDays = Math.max(0, graceDays);
        this.reminderWindowDays = Math.max(1, reminderWindowDays);
    }

    public MemberSubscription assign(String tenantId, String memberId, String planName, BigDecimal amount, String billingPeriod) {
        LocalDate today = LocalDate.now();
        return repository.save(new MemberSubscription(
                "membersub_" + UUID.randomUUID(),
                tenantId,
                memberId,
                "Member app annual access",
                MEMBER_APP_ANNUAL_FEE,
                "annual",
                today,
                latestSaccoCycleExpiry(tenantId)));
    }

    @Transactional
    public MemberSubscription ensureMandatorySubscription(Member member) {
        MemberSubscription subscription = repository.findFirstByMemberIdOrderByCreatedAtDesc(member.getId())
                .orElseGet(() -> assign(member.getTenantId(), member.getId(), "Member app annual access", MEMBER_APP_ANNUAL_FEE, "annual"));
        LocalDate cycleExpiry = latestSaccoCycleExpiry(member.getTenantId());
        if (!cycleExpiry.equals(subscription.getExpiry())
                || subscription.getAmount().compareTo(MEMBER_APP_ANNUAL_FEE) != 0
                || !"annual".equals(subscription.getBillingPeriod())) {
            subscription.alignToSaccoCycle(MEMBER_APP_ANNUAL_FEE, cycleExpiry);
            return repository.save(subscription);
        }
        return subscription;
    }

    @Transactional
    public int ensureMandatorySubscriptions(String tenantId) {
        List<Member> members = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream()
                .filter(member -> !"exited".equals(member.getStatus()))
                .toList();
        // One query for everyone who already has a subscription, instead of a
        // per-member existence check (N+1) on every list/summary load.
        java.util.Set<String> covered = new java.util.HashSet<>(repository.findCoveredMemberIdsByTenantId(tenantId));
        int created = 0;
        for (Member member : members) {
            if (!covered.contains(member.getId())) {
                ensureMandatorySubscription(member);
                created++;
            }
        }
        return created;
    }

    @Transactional
    public MemberSubscription recordPayment(MemberSubscription subscription, BigDecimal amount) {
        Subscription saccoSubscription = activeSaccoSubscription(subscription.getTenantId());
        subscription.alignToSaccoCycle(MEMBER_APP_ANNUAL_FEE, saccoSubscription.getExpiry());
        if (!"expired".equals(subscription.getStatus()) && subscription.isFullyPaid()) {
            throw new IllegalStateException("Member subscription is already fully paid for the current cycle. Do not record a duplicate payment.");
        }
        if ("expired".equals(subscription.getStatus())) {
            subscription.resetForRenewal();
        }
        subscription.recordPayment(amount, saccoSubscription.getExpiry());
        return repository.save(subscription);
    }

    @Transactional
    public MemberAppAccess accessFor(Member member) {
        Subscription saccoSubscription = subscriptionRepository
                .findFirstByTenantIdOrderByCreatedAtDesc(member.getTenantId())
                .orElse(null);
        if (saccoSubscription == null
                || !"active".equals(saccoSubscription.getStatus())
                || saccoSubscription.getExpiry() == null
                || saccoSubscription.getExpiry().isBefore(LocalDate.now())) {
            return MemberAppAccess.blocked("SACCO_SUBSCRIPTION_REQUIRED",
                    "Your SACCO must have an active staff subscription before member-app access can be activated.");
        }
        MemberSubscription memberSubscription = ensureMandatorySubscription(member);
        if (!"active".equals(memberSubscription.getStatus())
                || !memberSubscription.isFullyPaid()
                || memberSubscription.getExpiry() == null
                || memberSubscription.getExpiry().isBefore(LocalDate.now())) {
            return MemberAppAccess.blocked("MEMBER_APP_SUBSCRIPTION_REQUIRED",
                    "Pay the UGX 5,000 annual member-app subscription to continue.");
        }
        return MemberAppAccess.allowed(memberSubscription.getExpiry());
    }

    private Subscription activeSaccoSubscription(String tenantId) {
        Subscription subscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId)
                .orElseThrow(() -> new IllegalStateException("The SACCO has no staff subscription cycle."));
        if (!"active".equals(subscription.getStatus())
                || subscription.getExpiry() == null
                || subscription.getExpiry().isBefore(LocalDate.now())) {
            throw new IllegalStateException("The SACCO staff subscription must be active before member-app payment can be posted.");
        }
        return subscription;
    }

    private LocalDate latestSaccoCycleExpiry(String tenantId) {
        return subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId)
                .map(Subscription::getExpiry)
                .orElseGet(() -> LocalDate.now().plusMonths(1));
    }

    public record MemberAppAccess(boolean allowed, String code, String message, LocalDate expiry) {
        static MemberAppAccess allowed(LocalDate expiry) {
            return new MemberAppAccess(true, "", "", expiry);
        }

        static MemberAppAccess blocked(String code, String message) {
            return new MemberAppAccess(false, code, message, null);
        }
    }

    /** Expires active memberships whose expiry (plus grace) has fully lapsed. Returns the count expired. */
    @Transactional
    public int expireLapsed() {
        List<MemberSubscription> lapsed = repository.findByStatusAndExpiryLessThan("active", LocalDate.now().minusDays(graceDays));
        lapsed.forEach(MemberSubscription::markExpired);
        repository.saveAll(lapsed);
        return lapsed.size();
    }

    /**
     * Dunning: reminds members whose membership expires within the pre-expiry window, and sends escalated
     * overdue reminders to those already lapsed but still within grace. Deduplicated to at most one per
     * membership per day. Returns the count reminded.
     */
    @Transactional
    public int sendExpiryReminders() {
        LocalDate today = LocalDate.now();
        int reminded = remind(repository.findByStatusAndExpiryBetween("active", today, today.plusDays(reminderWindowDays)), today, false);
        if (graceDays > 0) {
            reminded += remind(repository.findByStatusAndExpiryBetween("active", today.minusDays(graceDays), today.minusDays(1)), today, true);
        }
        return reminded;
    }

    private int remind(List<MemberSubscription> subscriptions, LocalDate today, boolean overdue) {
        int reminded = 0;
        for (MemberSubscription subscription : subscriptions) {
            if (today.equals(subscription.getLastReminderOn())) {
                continue;
            }
            Member member = memberRepository.findById(subscription.getMemberId()).orElse(null);
            if (member != null) {
                if (overdue) {
                    notificationService.notifyMembershipOverdue(member, subscription.getExpiry());
                } else {
                    notificationService.notifyMembershipExpiring(member, subscription.getExpiry());
                }
            }
            subscription.markReminded(today);
            reminded++;
        }
        repository.saveAll(subscriptions);
        return reminded;
    }

}
