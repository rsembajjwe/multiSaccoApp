package com.methaltech.sacco.subscription;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Runs SACCO subscription lifecycle maintenance daily: expire lapsed subscriptions and send renewal
 * reminders. Scheduling relies on the application's existing {@code @EnableScheduling}. Idempotent.
 */
@Component
class SubscriptionExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionExpiryJob.class);

    private final SubscriptionLifecycleService lifecycleService;

    SubscriptionExpiryJob(SubscriptionLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @Scheduled(cron = "${sacco.subscription.lifecycle-cron:0 30 1 * * *}")
    void run() {
        int expired = lifecycleService.expireLapsed();
        int reminded = lifecycleService.sendExpiryReminders();
        if (expired > 0 || reminded > 0) {
            log.info("Subscription lifecycle: expired {} lapsed subscription(s), sent {} renewal reminder(s).", expired, reminded);
        }
    }
}
