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
    private final NotificationTemplateRepository templateRepository;

    public Notification notifyPaymentPosted(Member member, String purpose, BigDecimal amount, String resourceType, String resourceId) {
        String eventType = "loan_repayment".equals(purpose) ? "loan_repayment_received" : "payment_received";
        NotificationTemplate template = activeTemplate(member.getTenantId(), eventType);
        String title = template == null ? "Payment received" : template.getTitle();
        String message = template == null ? "Your mobile-money " + purpose.replace('_', ' ') + " of " + amount + " was posted." : template.getBody();
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                eventType,
                title,
                message,
                resourceType,
                resourceId));
        createDelivery(notification, member, "sms", "demo_sms", member.getPhone(), message);
        createDelivery(notification, member, "email", "demo_email", member.getEmail(), title + ": " + message);
        return notification;
    }

    public Notification notifyLoanApplicationSubmitted(Member member, String product, BigDecimal amount, String loanId) {
        String eventType = "loan_application_submitted";
        NotificationTemplate template = activeTemplate(member.getTenantId(), eventType);
        String title = template == null ? "Loan application submitted" : template.getTitle();
        String message = template == null ? "Mobile loan application " + product + " for UGX " + amount + " was submitted." : template.getBody();
        return notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                eventType,
                title,
                message,
                "loan",
                loanId));
    }

    public Notification notifyComplaintSynced(Member member, String complaintId) {
        String eventType = "complaint_synced";
        NotificationTemplate template = activeTemplate(member.getTenantId(), eventType);
        String title = template == null ? "Complaint synced" : template.getTitle();
        String message = template == null ? "Your offline complaint draft has been synced to the SACCO." : template.getBody();
        return notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                eventType,
                title,
                message,
                "complaint",
                complaintId));
    }

    private NotificationTemplate activeTemplate(String tenantId, String eventType) {
        return templateRepository.findFirstByTenantIdAndEventTypeAndStatusOrderByUpdatedAtDesc(tenantId, eventType, "active")
                .or(() -> templateRepository.findFirstByTenantIdIsNullAndEventTypeAndStatusOrderByUpdatedAtDesc(eventType, "active"))
                .orElse(null);
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
