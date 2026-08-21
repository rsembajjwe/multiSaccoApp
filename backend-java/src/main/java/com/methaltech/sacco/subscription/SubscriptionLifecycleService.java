package com.methaltech.sacco.subscription;

import com.methaltech.sacco.notification.NotificationService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Drives SACCO subscription expiry and renewal reminders. A subscription that lapses past its grace
 * window is marked {@code expired}; subscriptions approaching expiry generate a renewal reminder to the
 * SACCO's finance staff (deduplicated to at most one per day via {@code lastReminderOn}). Idempotent and
 * safe to run repeatedly — the scheduled job and tests both call these methods directly.
 */
@Service
public class SubscriptionLifecycleService {

    private final SubscriptionRepository subscriptionRepository;
    private final NotificationService notificationService;
    private final int graceDays;
    private final int reminderWindowDays;

    SubscriptionLifecycleService(
            SubscriptionRepository subscriptionRepository,
            NotificationService notificationService,
            @Value("${sacco.subscription.grace-days:7}") int graceDays,
            @Value("${sacco.subscription.reminder-window-days:14}") int reminderWindowDays) {
        this.subscriptionRepository = subscriptionRepository;
        this.notificationService = notificationService;
        this.graceDays = Math.max(0, graceDays);
        this.reminderWindowDays = Math.max(1, reminderWindowDays);
    }

    /** Expires active subscriptions whose expiry (plus grace) has fully lapsed. Returns the count expired. */
    /** Operating statuses whose lapse the lifecycle acts on: fully paid ("active") and free-trial ("trial"). */
    private static final java.util.List<String> OPERATING_STATUSES = java.util.List.of("active", "trial");

    @Transactional
    public int expireLapsed() {
        LocalDate cutoff = LocalDate.now().minusDays(graceDays);
        List<Subscription> lapsed = subscriptionRepository.findByStatusInAndExpiryLessThan(OPERATING_STATUSES, cutoff);
        lapsed.forEach(Subscription::markExpired);
        subscriptionRepository.saveAll(lapsed);
        return lapsed.size();
    }

    /**
     * Dunning: sends renewal reminders for active subscriptions expiring within the pre-expiry window,
     * and escalated overdue reminders for those already lapsed but still within grace (before suspension).
     * Deduplicated to at most one per subscription per day. Returns the count reminded.
     */
    @Transactional
    public int sendExpiryReminders() {
        LocalDate today = LocalDate.now();
        int reminded = remind(subscriptionRepository.findByStatusInAndExpiryBetween(OPERATING_STATUSES, today, today.plusDays(reminderWindowDays)), today, false);
        if (graceDays > 0) {
            reminded += remind(subscriptionRepository.findByStatusInAndExpiryBetween(OPERATING_STATUSES, today.minusDays(graceDays), today.minusDays(1)), today, true);
        }
        return reminded;
    }

    private int remind(List<Subscription> subscriptions, LocalDate today, boolean overdue) {
        int reminded = 0;
        for (Subscription subscription : subscriptions) {
            if (today.equals(subscription.getLastReminderOn())) {
                continue;
            }
            if (overdue) {
                notificationService.notifySubscriptionOverdue(subscription.getTenantId(), subscription.getExpiry());
            } else {
                notificationService.notifySubscriptionExpiring(subscription.getTenantId(), subscription.getExpiry());
            }
            subscription.markReminded(today);
            reminded++;
        }
        subscriptionRepository.saveAll(subscriptions);
        return reminded;
    }
}
