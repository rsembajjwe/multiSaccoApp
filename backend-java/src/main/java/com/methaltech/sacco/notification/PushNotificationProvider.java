package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Mobile-app push channel. Config-swappable stub matching the demo SMS/email/WhatsApp providers; swapping
 * {@code sacco.providers.push} to a real provider id (e.g. Firebase Cloud Messaging) lets a production
 * implementation take over. The recipient is the member id — the mobile app subscribes to the FCM topic
 * {@code member_<id>} at sign-in, so no device token needs to be persisted server-side for the stub. Push
 * is a free/included channel and is not metered for billing.
 */
@Component
@ConditionalOnProperty(name = "sacco.providers.push", havingValue = "demo_push", matchIfMissing = true)
class PushNotificationProvider implements NotificationProvider {

    private final String providerId;

    PushNotificationProvider(@Value("${sacco.providers.push:demo_push}") String providerId) {
        this.providerId = providerId;
    }

    @Override
    public String channel() {
        return "push";
    }

    @Override
    public String providerId() {
        return providerId;
    }

    @Override
    public String recipient(Member member) {
        return member.getId();
    }
}
