package com.methaltech.sacco.tenant;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class FleetApprovalNotificationJob {
    private final FleetApprovalNotificationService notificationService;

    @Scheduled(
            fixedDelayString = "${sacco.fleet.approval-notifications.fixed-delay:PT15M}",
            initialDelayString = "${sacco.fleet.approval-notifications.initial-delay:PT2M}")
    void run() {
        notificationService.escalatePendingAt(Instant.now());
    }
}
