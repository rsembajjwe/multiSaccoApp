package com.methaltech.sacco.notification;

import com.methaltech.sacco.accounting.MobileMoneyProviderEvidence;
import java.time.Instant;
import java.util.List;

public record ProviderOperationalEvidence(
        int notificationDeliveries,
        int failedNotificationDeliveries,
        int sentNotificationDeliveries,
        int notificationProvidersReady,
        int notificationProvidersUnavailable,
        List<NotificationProviderStatusResponse> notificationProviderStatus,
        MobileMoneyProviderEvidence mobileMoney,
        String evidenceStatus,
        Instant checkedAt) {
}
