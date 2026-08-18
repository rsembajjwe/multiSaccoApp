package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * WhatsApp delivery channel. This is a config-swappable stub that records deliveries exactly like the
 * demo SMS/email providers; swapping {@code sacco.providers.whatsapp} to a real provider id (e.g. the
 * Meta WhatsApp Cloud API) lets a production implementation take over without touching callers. The
 * recipient is the member's phone number, which is the WhatsApp addressable identity. WhatsApp is a
 * charged channel (see PlatformBillingService), so it is opt-in per environment via configuration.
 */
@Component
@ConditionalOnProperty(name = "sacco.providers.whatsapp", havingValue = "demo_whatsapp", matchIfMissing = true)
class WhatsAppNotificationProvider implements NotificationProvider {

    private final String providerId;

    WhatsAppNotificationProvider(@Value("${sacco.providers.whatsapp:demo_whatsapp}") String providerId) {
        this.providerId = providerId;
    }

    @Override
    public String channel() {
        return "whatsapp";
    }

    @Override
    public String providerId() {
        return providerId;
    }

    @Override
    public String recipient(Member member) {
        return member.getPhone();
    }
}
