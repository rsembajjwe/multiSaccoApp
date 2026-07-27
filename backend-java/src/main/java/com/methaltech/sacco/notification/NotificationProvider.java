package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;

interface NotificationProvider {
    String channel();

    String providerId();

    String recipient(Member member);

    default boolean enabledFor(Member member) {
        String recipient = recipient(member);
        return recipient != null && !recipient.isBlank();
    }

    default boolean enabledForRecipient(String recipient) {
        return recipient != null && !recipient.isBlank();
    }

    default NotificationSendResult send(Member member, String title, String message) {
        return sendTo(recipient(member), title, message);
    }

    default NotificationSendResult sendTo(String recipient, String title, String message) {
        return NotificationSendResult.sent(null, "Demo notification delivery recorded.");
    }

    default NotificationProviderStatusResponse status() {
        return NotificationProviderStatusResponse.ready(channel(), providerId(), null, "Provider is configured.");
    }
}
