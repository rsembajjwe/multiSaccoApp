package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationDeliveryRepository deliveryRepository;

    public Notification notifyPaymentPosted(Member member, String purpose, BigDecimal amount, String resourceType, String resourceId) {
        String title = "Payment received";
        String message = "Your mobile-money " + purpose.replace('_', ' ') + " of " + amount + " was posted.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "payment_received",
                title,
                message,
                resourceType,
                resourceId));
        createDelivery(notification, member, "sms", "demo_sms", member.getPhone(), message);
        createDelivery(notification, member, "email", "demo_email", member.getEmail(), title + ": " + message);
        return notification;
    }

    public Notification notifyLoanApplicationSubmitted(Member member, String product, BigDecimal amount, String loanId) {
        String message = "Mobile loan application " + product + " for UGX " + amount + " was submitted.";
        return notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "loan_application_submitted",
                "Loan application submitted",
                message,
                "loan",
                loanId));
    }

    private void createDelivery(Notification notification, Member member, String channel, String provider, String recipient, String message) {
        if (recipient == null || recipient.isBlank()) return;
        deliveryRepository.save(new NotificationDelivery(
                "delivery_" + UUID.randomUUID(),
                notification.getTenantId(),
                notification.getId(),
                member.getId(),
                channel,
                provider,
                recipient,
                message));
    }
}
