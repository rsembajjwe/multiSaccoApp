package com.methaltech.sacco.notification;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class OnboardingNotificationService {

    private final List<NotificationProvider> providers;

    OnboardingNotificationService(List<NotificationProvider> providers) {
        this.providers = providers;
    }

    public DeliveryReceipt sendTemporaryPassword(
            String channel,
            String recipient,
            String fullName,
            String organizationName,
            String organizationCode,
            String temporaryPassword) {
        NotificationProvider provider = providers.stream()
                .filter(candidate -> candidate.channel().equalsIgnoreCase(channel))
                .findFirst()
                .orElseThrow(() -> new OnboardingDeliveryException("The selected onboarding channel is not configured."));

        String title = organizationName + " Tereka Online temporary password";
        String message = "Hello " + fullName + ",\n\n"
                + "SACCO/group: " + organizationName + "\n"
                + "Login code: " + organizationCode + "\n"
                + "Your staff account has been created. Your temporary password is: " + temporaryPassword + "\n\n"
                + "Sign in with your SACCO code and this temporary password. You must choose a new password before access is granted. "
                + "Do not share this password.\n\nTereka Online";
        NotificationSendResult result = provider.sendTo(recipient, title, message);
        if (!"sent".equalsIgnoreCase(result.status())) {
            throw new OnboardingDeliveryException("The temporary password could not be delivered through " + channel + ".");
        }
        return new DeliveryReceipt(channel, provider.providerId(), recipient, result.providerReference());
    }

    public record DeliveryReceipt(String channel, String provider, String recipient, String providerReference) {
    }

    public static class OnboardingDeliveryException extends RuntimeException {
        public OnboardingDeliveryException(String message) {
            super(message);
        }
    }
}
