package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "sacco.providers.sms", havingValue = "demo_sms", matchIfMissing = true)
class SmsNotificationProvider implements NotificationProvider {

    private final String providerId;

    SmsNotificationProvider(@Value("${sacco.providers.sms:demo_sms}") String providerId) {
        this.providerId = providerId;
    }

    @Override
    public String channel() {
        return "sms";
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
