package com.methaltech.sacco.member;

import com.methaltech.sacco.notification.NotificationService;
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
    private final int graceDays;
    private final int reminderWindowDays;

    MemberSubscriptionService(
            MemberSubscriptionRepository repository,
            MemberRepository memberRepository,
            NotificationService notificationService,
            @Value("${sacco.member-subscription.grace-days:7}") int graceDays,
            @Value("${sacco.member-subscription.reminder-window-days:14}") int reminderWindowDays) {
        this.repository = repository;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
        this.graceDays = Math.max(0, graceDays);
        this.reminderWindowDays = Math.max(1, reminderWindowDays);
    }

    public MemberSubscription assign(String tenantId, String memberId, String planName, BigDecimal amount, String billingPeriod) {
        String period = normalizePeriod(billingPeriod);
        LocalDate today = LocalDate.now();
        return repository.save(new MemberSubscription(
                "membersub_" + UUID.randomUUID(),
                tenantId,
                memberId,
                planName,
                amount,
                period,
                today,
                nextExpiry(today, period)));
    }

    @Transactional
    public MemberSubscription recordPayment(MemberSubscription subscription, BigDecimal amount) {
        LocalDate today = LocalDate.now();
        LocalDate base = subscription.getExpiry() != null && subscription.getExpiry().isAfter(today) ? subscription.getExpiry() : today;
        subscription.recordPayment(amount, nextExpiry(base, subscription.getBillingPeriod()));
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

    private LocalDate nextExpiry(LocalDate base, String billingPeriod) {
        return "monthly".equalsIgnoreCase(billingPeriod) ? base.plusMonths(1) : base.plusYears(1);
    }

    private String normalizePeriod(String billingPeriod) {
        return "monthly".equalsIgnoreCase(billingPeriod) ? "monthly" : "annual";
    }
}
