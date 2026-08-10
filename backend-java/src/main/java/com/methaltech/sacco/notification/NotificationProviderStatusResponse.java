package com.methaltech.sacco.notification;

import java.time.Instant;

public record NotificationProviderStatusResponse(
        String channel,
        String provider,
        String status,
        String balance,
        String message,
        Instant checkedAt) {

    static NotificationProviderStatusResponse ready(String channel, String provider, String balance, String message) {
        return new NotificationProviderStatusResponse(channel, provider, "ready", balance, message, Instant.now());
    }

    static NotificationProviderStatusResponse unavailable(String channel, String provider, String message) {
        return new NotificationProviderStatusResponse(channel, provider, "unavailable", null, message, Instant.now());
    }
}
