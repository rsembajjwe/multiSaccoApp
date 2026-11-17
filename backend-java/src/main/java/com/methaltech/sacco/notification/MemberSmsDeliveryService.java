package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MemberSmsDeliveryService {

    private final List<NotificationProvider> providers;

    MemberSmsDeliveryService(List<NotificationProvider> providers) {
        this.providers = List.copyOf(providers);
    }

    public boolean send(String phone, String message) {
        NotificationProvider smsProvider = providers.stream()
                .filter(provider -> "sms".equalsIgnoreCase(provider.channel()))
                .findFirst()
                .orElseThrow(() -> new NotificationProviderException("SMS provider is not configured."));
        NotificationSendResult result = smsProvider.sendTo(phone, "Tereka message", message);
        return "sent".equalsIgnoreCase(result.status());
    }
}
