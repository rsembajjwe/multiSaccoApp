package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class EmailNotificationProvider implements NotificationProvider {

    private final String providerId;

    EmailNotificationProvider(@Value("${sacco.providers.email:demo_email}") String providerId) {
        this.providerId = providerId;
    }

    @Override
    public String channel() {
        return "email";
    }

    @Override
    public String providerId() {
        return providerId;
    }

    @Override
    public String recipient(Member member) {
        return member.getEmail();
    }
}
