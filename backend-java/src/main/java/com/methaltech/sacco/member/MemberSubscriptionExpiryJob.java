package com.methaltech.sacco.member;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily maintenance of member membership dues: expire lapsed memberships and send renewal reminders.
 * Uses the application's existing {@code @EnableScheduling}. Idempotent.
 */
@Component
class MemberSubscriptionExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(MemberSubscriptionExpiryJob.class);

    private final MemberSubscriptionService memberSubscriptionService;

    MemberSubscriptionExpiryJob(MemberSubscriptionService memberSubscriptionService) {
        this.memberSubscriptionService = memberSubscriptionService;
    }

    @Scheduled(cron = "${sacco.member-subscription.lifecycle-cron:0 45 1 * * *}")
    void run() {
        int expired = memberSubscriptionService.expireLapsed();
        int reminded = memberSubscriptionService.sendExpiryReminders();
        if (expired > 0 || reminded > 0) {
            log.info("Member membership lifecycle: expired {} membership(s), sent {} renewal reminder(s).", expired, reminded);
        }
    }
}
