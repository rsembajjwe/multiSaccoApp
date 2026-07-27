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

    default NotificationSendResult send(Member member, String title, String message) {
        return NotificationSendResult.sent(null, "Demo notification delivery recorded.");
    }
}
