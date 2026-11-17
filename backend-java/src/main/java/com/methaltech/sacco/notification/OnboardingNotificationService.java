package com.methaltech.sacco.notification;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    public DeliveryReceipt sendPasswordResetCode(
            String channel,
            String recipient,
            String fullName,
            String organizationName,
            String resetCode) {
        NotificationProvider provider = providers.stream()
                .filter(candidate -> candidate.channel().equalsIgnoreCase(channel))
                .filter(candidate -> candidate.enabledForRecipient(recipient))
                .findFirst()
                .orElseThrow(() -> new OnboardingDeliveryException(
                        "The selected password-reset channel is not configured or the account has no matching contact."));
        String title = organizationName + " Tereka Online password reset";
        String message = "Hello " + fullName + ",\n\n"
                + "Your password reset code is: " + resetCode + "\n"
                + "It expires in 30 minutes. If you did not request this reset, ignore this message.\n\n"
                + "Tereka Online";
        NotificationSendResult result = provider.sendTo(recipient, title, message);
        if (!"sent".equalsIgnoreCase(result.status())) {
            throw new OnboardingDeliveryException("The password reset code could not be delivered through " + channel + ".");
        }
        return new DeliveryReceipt(channel, provider.providerId(), recipient, result.providerReference());
    }

    public SmsAccountCapacity platformSmsCapacity(BigDecimal unitPrice) {
        if (unitPrice == null || unitPrice.signum() <= 0) {
            throw new OnboardingDeliveryException("The platform SMS rate is not configured.");
        }
        NotificationProviderStatusResponse status = providers.stream()
                .filter(candidate -> "sms".equalsIgnoreCase(candidate.channel()))
                .map(NotificationProvider::status)
                .filter(candidate -> "ready".equalsIgnoreCase(candidate.status()))
                .filter(candidate -> candidate.balance() != null && !candidate.balance().isBlank())
                .findFirst()
                .orElseThrow(() -> new OnboardingDeliveryException(
                        "The main SMS account balance is currently unavailable."));
        String numericBalance = status.balance().replaceAll("[^0-9.]", "");
        if (numericBalance.isBlank()) {
            throw new OnboardingDeliveryException("The main SMS account returned an invalid balance.");
        }
        try {
            BigDecimal balance = new BigDecimal(numericBalance);
            int availableMessages = balance.divide(unitPrice, 0, RoundingMode.FLOOR).intValue();
            return new SmsAccountCapacity(balance, unitPrice, availableMessages);
        } catch (NumberFormatException exception) {
            throw new OnboardingDeliveryException("The main SMS account returned an invalid balance.");
        }
    }

    public record DeliveryReceipt(String channel, String provider, String recipient, String providerReference) {
    }

    public record SmsAccountCapacity(BigDecimal balance, BigDecimal unitPrice, int availableMessages) {
    }

    public static class OnboardingDeliveryException extends RuntimeException {
        public OnboardingDeliveryException(String message) {
            super(message);
        }
    }
}
