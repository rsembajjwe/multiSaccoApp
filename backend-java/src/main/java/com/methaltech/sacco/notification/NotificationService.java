package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.tenant.TenantMoneyFormatter;
import com.methaltech.sacco.tenant.TenantService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationDeliveryRepository deliveryRepository;
    private final NotificationTemplateRepository templateRepository;
    private final TenantService tenantService;
    private final TenantMoneyFormatter moneyFormatter;
    private final List<NotificationProvider> providers;

    public Notification notifyPaymentPosted(Member member, String purpose, BigDecimal amount, String resourceType, String resourceId) {
        String eventType = "loan_repayment".equals(purpose) ? "loan_repayment_received" : "payment_received";
        NotificationTemplate template = activeTemplate(member.getTenantId(), eventType);
        String title = template == null ? "Payment received" : template.getTitle();
        String message = template == null ? "Your mobile-money " + purpose.replace('_', ' ') + " of " + formattedAmount(member.getTenantId(), amount) + " was posted." : template.getBody();
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                eventType,
                title,
                message,
                resourceType,
                resourceId));
        createDeliveries(notification, member, title, message);
        return notification;
    }

    public Notification notifyLoanApplicationSubmitted(Member member, String product, BigDecimal amount, String loanId) {
        String eventType = "loan_application_submitted";
        NotificationTemplate template = activeTemplate(member.getTenantId(), eventType);
        String title = template == null ? "Loan application submitted" : template.getTitle();
        String message = template == null ? "Mobile loan application " + product + " for " + formattedAmount(member.getTenantId(), amount) + " was submitted." : template.getBody();
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

    public Notification notifyStaffSecurityAlert(
            String tenantId,
            String userId,
            String recipient,
            String title,
            String message,
            String resourceType,
            String resourceId) {
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                tenantId,
                null,
                userId,
                "security_login_risk",
                title,
                message,
                resourceType,
                resourceId));
        deliveryRepository.save(new NotificationDelivery(
                "delivery_" + UUID.randomUUID(),
                tenantId,
                notification.getId(),
                null,
                userId,
                "in_app",
                "tereka_online",
                recipient == null || recipient.isBlank() ? userId : recipient,
                message));
        return notification;
    }

    private NotificationTemplate activeTemplate(String tenantId, String eventType) {
        return templateRepository.findFirstByTenantIdAndEventTypeAndStatusOrderByUpdatedAtDesc(tenantId, eventType, "active")
                .or(() -> templateRepository.findFirstByTenantIdIsNullAndEventTypeAndStatusOrderByUpdatedAtDesc(eventType, "active"))
                .orElse(null);
    }

    private String formattedAmount(String tenantId, BigDecimal amount) {
        return moneyFormatter.format(tenantService.findById(tenantId).orElse(null), amount);
    }

    private void createDeliveries(Notification notification, Member member, String title, String message) {
        providers.stream()
                .filter(provider -> provider.enabledFor(member))
                .forEach(provider -> {
                    String deliveryMessage = "email".equals(provider.channel()) ? title + ": " + message : message;
                    NotificationSendResult result = send(provider, member, title, deliveryMessage);
                    createDelivery(
                            notification,
                            member,
                            provider.channel(),
                            provider.providerId(),
                            provider.recipient(member),
                            result,
                            deliveryMessage);
                });
    }

    private NotificationSendResult send(NotificationProvider provider, Member member, String title, String message) {
        try {
            return provider.send(member, title, message);
        } catch (RuntimeException exception) {
            return NotificationSendResult.failed(exception.getMessage());
        }
    }

    private void createDelivery(Notification notification, Member member, String channel, String providerId, String recipient, NotificationSendResult result, String message) {
        deliveryRepository.save(new NotificationDelivery(
                "delivery_" + UUID.randomUUID(),
                notification.getTenantId(),
                notification.getId(),
                member.getId(),
                channel,
                providerId,
                recipient,
                result,
                message));
    }
}
