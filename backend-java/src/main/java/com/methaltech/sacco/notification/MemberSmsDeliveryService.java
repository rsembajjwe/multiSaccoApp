package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MemberSmsDeliveryService {

    private final NotificationProvider smsProvider;

    MemberSmsDeliveryService(List<NotificationProvider> providers) {
        this.smsProvider = providers.stream()
                .filter(provider -> "sms".equalsIgnoreCase(provider.channel()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("An SMS provider must be configured."));
    }

    public boolean send(String phone, String message) {
        NotificationSendResult result = smsProvider.sendTo(phone, "Tereka message", message);
        return "sent".equalsIgnoreCase(result.status());
    }
}
