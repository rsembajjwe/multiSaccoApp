package com.methaltech.sacco.member;

import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.tenant.SaccoMembershipPolicyService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages member membership dues: assigning a membership, recording dues payments (which activate and
 * extend it by the billing period), and the daily lifecycle — expiring lapsed memberships past a grace
 * window and reminding members before expiry (deduplicated to at most once per day). Distinct from the
 * platform's per-SACCO subscription.
 */
@Service
public class MemberSubscriptionService {

    private final MemberSubscriptionRepository repository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;
    private final SaccoMembershipPolicyService membershipPolicyService;
    private final BigDecimal defaultAmount;
    private final int graceDays;
    private final int reminderWindowDays;

    MemberSubscriptionService(
            MemberSubscriptionRepository repository,
            MemberRepository memberRepository,
            NotificationService notificationService,
            SaccoMembershipPolicyService membershipPolicyService,
            @Value("${sacco.member-subscription.default-amount:5000}") BigDecimal defaultAmount,
            @Value("${sacco.member-subscription.grace-days:7}") int graceDays,
            @Value("${sacco.member-subscription.reminder-window-days:14}") int reminderWindowDays) {
        this.repository = repository;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
        this.membershipPolicyService = membershipPolicyService;
        this.defaultAmount = defaultAmount == null || defaultAmount.signum() <= 0 ? BigDecimal.valueOf(5000) : defaultAmount;
        this.graceDays = Math.max(0, graceDays);
        this.reminderWindowDays = Math.max(1, reminderWindowDays);
    }

    public MemberSubscription assign(String tenantId, String memberId, String planName, BigDecimal amount, String billingPeriod) {
        SaccoMembershipPolicyService.MembershipDuesPolicy policy = membershipPolicyService.policyForTenant(tenantId);
        String period = policy.billingPeriod();
        BigDecimal subscriptionAmount = amount == null || amount.signum() <= 0 ? policy.amount() : amount;
        LocalDate today = LocalDate.now();
        return repository.save(new MemberSubscription(
                "membersub_" + UUID.randomUUID(),
                tenantId,
                memberId,
                planName,
                subscriptionAmount,
                period,
                today,
                membershipPolicyService.nextExpiry(tenantId, today, period)));
    }

    @Transactional
    public MemberSubscription ensureMandatorySubscription(Member member) {
        return repository.findFirstByMemberIdOrderByCreatedAtDesc(member.getId())
                .orElseGet(() -> assign(member.getTenantId(), member.getId(), "Member subscription", membershipPolicyService.policyForTenant(member.getTenantId()).amount(), null));
    }

    @Transactional
    public int ensureMandatorySubscriptions(String tenantId) {
        List<Member> members = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream()
                .filter(member -> !"exited".equals(member.getStatus()))
                .toList();
        int created = 0;
        for (Member member : members) {
            if (repository.findFirstByMemberIdOrderByCreatedAtDesc(member.getId()).isEmpty()) {
                ensureMandatorySubscription(member);
                created++;
            }
        }
        return created;
    }

    @Transactional
    public MemberSubscription recordPayment(MemberSubscription subscription, BigDecimal amount) {
        if (!"expired".equals(subscription.getStatus()) && subscription.isFullyPaid()) {
            throw new IllegalStateException("Member subscription is already fully paid for the current cycle. Do not record a duplicate payment.");
        }
        if ("expired".equals(subscription.getStatus())) {
            subscription.resetForRenewal();
        }
        LocalDate today = LocalDate.now();
        LocalDate base = subscription.getExpiry() != null && subscription.getExpiry().isAfter(today) ? subscription.getExpiry() : today;
        subscription.recordPayment(amount, membershipPolicyService.nextExpiry(subscription.getTenantId(), base, subscription.getBillingPeriod()));
        return repository.save(subscription);
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
