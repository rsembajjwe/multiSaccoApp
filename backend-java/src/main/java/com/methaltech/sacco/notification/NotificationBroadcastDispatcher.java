package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Runs a SACCO broadcast off the request thread. The controller resolves recipients and returns
 * immediately; this dispatcher performs the per-member fan-out on the {@code notificationExecutor} so a
 * large SACCO never blocks or times out the HTTP call. The async boundary is this bean's public method
 * (invoked from the controller), so Spring's proxy applies.
 */
@Component
@RequiredArgsConstructor
class NotificationBroadcastDispatcher {

    private final NotificationService notificationService;

    @Async(NotificationAsyncConfig.EXECUTOR)
    public void dispatch(String tenantId, List<Member> recipients, String title, String message) {
        notificationService.notifySaccoBroadcast(tenantId, recipients, title, message);
    }
}
