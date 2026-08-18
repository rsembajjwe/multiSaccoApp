package com.methaltech.sacco.notification;

import com.methaltech.sacco.identity.StaffNotificationRecipientService;
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
    private final StaffNotificationRecipientService staffNotificationRecipientService;
    private final NotificationChannelPreferenceService channelPreferenceService;
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

    public Notification notifyPaymentPendingApproval(Member member, String purpose, BigDecimal amount, String resourceType, String resourceId) {
        String title = "Payment received";
        String message = "Your mobile-money " + purpose.replace('_', ' ') + " of "
                + formattedAmount(member.getTenantId(), amount)
                + " was received and is pending SACCO confirmation. Your balance updates once it is approved.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "payment_pending_approval",
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

    /** Notifies a member that their membership dues are approaching expiry, across their enabled channels. */
    public Notification notifyMembershipExpiring(Member member, java.time.LocalDate expiry) {
        String title = "Membership renewal due";
        String message = "Your membership expires on " + expiry + ". Please renew to keep your membership active.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "membership_expiring",
                title,
                message,
                "member_subscription",
                null));
        createDeliveries(notification, member, title, message);
        return notification;
    }

    /** Escalated dunning reminder once a member's membership has lapsed (in the grace window). */
    public Notification notifyMembershipOverdue(Member member, java.time.LocalDate expiry) {
        String title = "Membership overdue - renew now";
        String message = "Your membership lapsed on " + expiry + ". Renew now to keep your membership active.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "membership_overdue",
                title,
                message,
                "member_subscription",
                null));
        createDeliveries(notification, member, title, message);
        return notification;
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

    public Notification notifyComplaintReply(Member member, String complaintId, String subject, String reply) {
        String title = "SACCO admin replied";
        String message = "Reply on " + subject + ": " + reply;
        return notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "complaint_reply",
                title,
                message,
                "complaint",
                complaintId));
    }

    public Notification notifyChatReply(Member member, String threadId, String subject, String preview) {
        String title = "New support reply";
        String message = "Reply on " + subject + ": " + preview;
        return notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "chat_reply",
                title,
                message,
                "chat_thread",
                threadId));
    }

    /**
     * Sends a SACCO announcement/broadcast to the given members. Each member gets a stored message
     * (event type {@code sacco_announcement}) plus fan-out deliveries across every enabled channel
     * (in-app, SMS, WhatsApp, email, push) so the message lands both in the repository and on the
     * member's preferred channels.
     */
    public List<Notification> notifySaccoBroadcast(String tenantId, List<Member> recipients, String title, String message) {
        return recipients.stream()
                .map(member -> {
                    Notification notification = notificationRepository.save(new Notification(
                            "notification_" + UUID.randomUUID(),
                            tenantId,
                            member.getId(),
                            "sacco_announcement",
                            title,
                            message,
                            "sacco_message",
                            null));
                    createDeliveries(notification, member, title, message);
                    return notification;
                })
                .toList();
    }

    /**
     * Notifies the SACCO's finance staff (payment-exception recipients: admins/treasurers) that the
     * platform subscription is approaching expiry and should be renewed. In-app so it surfaces in the
     * notification centre and the message repository.
     */
    public List<Notification> notifySubscriptionExpiring(String tenantId, java.time.LocalDate expiry) {
        String title = "Subscription renewal due";
        String message = "Your SACCO subscription expires on " + expiry + ". Renew to avoid service interruption.";
        return staffNotificationRecipientService.saccoPaymentExceptionRecipients(tenantId).stream()
                .map(recipient -> {
                    Notification notification = notificationRepository.save(new Notification(
                            "notification_" + UUID.randomUUID(),
                            tenantId,
                            null,
                            recipient.userId(),
                            "subscription_expiring",
                            title,
                            message,
                            "subscription",
                            tenantId));
                    deliveryRepository.save(new NotificationDelivery(
                            "delivery_" + UUID.randomUUID(),
                            tenantId,
                            notification.getId(),
                            null,
                            recipient.userId(),
                            "in_app",
                            "tereka_online",
                            recipient.email() == null || recipient.email().isBlank() ? recipient.userId() : recipient.email(),
                            message));
                    return notification;
                })
                .toList();
    }

    /** Escalated dunning reminder once a SACCO subscription has lapsed (in the grace window before suspension). */
    public List<Notification> notifySubscriptionOverdue(String tenantId, java.time.LocalDate expiry) {
        String title = "Subscription overdue - renew now";
        String message = "Your SACCO subscription lapsed on " + expiry + ". Renew now to avoid suspension of write access.";
        return staffNotificationRecipientService.saccoPaymentExceptionRecipients(tenantId).stream()
                .map(recipient -> {
                    Notification notification = notificationRepository.save(new Notification(
                            "notification_" + UUID.randomUUID(),
                            tenantId,
                            null,
                            recipient.userId(),
                            "subscription_overdue",
                            title,
                            message,
                            "subscription",
                            tenantId));
                    deliveryRepository.save(new NotificationDelivery(
                            "delivery_" + UUID.randomUUID(),
                            tenantId,
                            notification.getId(),
                            null,
                            recipient.userId(),
                            "in_app",
                            "tereka_online",
                            recipient.email() == null || recipient.email().isBlank() ? recipient.userId() : recipient.email(),
                            message));
                    return notification;
                })
                .toList();
    }

    public Notification notifySaccoContact(
            String tenantId,
            String eventType,
            String title,
            String message,
            String resourceType,
            String resourceId,
            String phone,
            String email) {
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                tenantId,
                null,
                eventType,
                title,
                message,
                resourceType,
                resourceId));
        createContactDeliveries(notification, title, message, phone, email);
        return notification;
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

    public List<Notification> notifyPaymentRequestManuallyClosed(
            String tenantId,
            String externalReference,
            String status,
            BigDecimal amount,
            String currencyCode,
            String reason,
            String resourceId) {
        String title = "Mobile-money request needs review";
        String amountText = amount == null ? "" : " for " + formattedAmount(tenantId, amount);
        String reasonText = reason == null || reason.isBlank() ? "" : " Reason: " + reason.trim();
        String message = "Payment request " + safe(externalReference) + amountText
                + " was marked " + safe(status) + "." + reasonText;
        return staffNotificationRecipientService.saccoPaymentExceptionRecipients(tenantId).stream()
                .map(recipient -> {
                    Notification notification = notificationRepository.save(new Notification(
                            "notification_" + UUID.randomUUID(),
                            tenantId,
                            null,
                            recipient.userId(),
                            "payment_request_closed",
                            title,
                            message,
                            "mobile_money_payment_request",
                            resourceId));
                    deliveryRepository.save(new NotificationDelivery(
                            "delivery_" + UUID.randomUUID(),
                            tenantId,
                            notification.getId(),
                            null,
                            recipient.userId(),
                            "in_app",
                            "tereka_online",
                            recipient.email() == null || recipient.email().isBlank() ? recipient.userId() : recipient.email(),
                            message));
                    return notification;
                })
                .toList();
    }

    NotificationDelivery retryDelivery(NotificationDelivery original, Notification notification) {
        if (original == null) {
            throw new NotificationProviderException("Notification delivery was not found.");
        }
        if (!"failed".equalsIgnoreCase(original.getStatus())) {
            throw new NotificationProviderException("Only failed notification deliveries can be retried.");
        }
        NotificationProvider provider = providers.stream()
                .filter(candidate -> original.getChannel().equals(candidate.channel())
                        && original.getProvider().equals(candidate.providerId()))
                .findFirst()
                .orElse(null);
        String title = notification == null || notification.getTitle() == null || notification.getTitle().isBlank()
                ? "Tereka Online notification"
                : notification.getTitle();
        NotificationSendResult result = provider == null
                ? NotificationSendResult.failed("Notification provider is not available for retry.")
                : sendTo(provider, original.getRecipient(), title, original.getMessage());
        return deliveryRepository.save(new NotificationDelivery(
                "delivery_" + UUID.randomUUID(),
                original.getTenantId(),
                original.getNotificationId(),
                original.getMemberId(),
                original.getUserId(),
                original.getChannel(),
                original.getProvider(),
                original.getRecipient(),
                result,
                original.getMessage()));
    }

    private NotificationTemplate activeTemplate(String tenantId, String eventType) {
        return templateRepository.findFirstByTenantIdAndEventTypeAndStatusOrderByUpdatedAtDesc(tenantId, eventType, "active")
                .or(() -> templateRepository.findFirstByTenantIdIsNullAndEventTypeAndStatusOrderByUpdatedAtDesc(eventType, "active"))
                .orElse(null);
    }

    private String formattedAmount(String tenantId, BigDecimal amount) {
        return moneyFormatter.format(tenantService.findById(tenantId).orElse(null), amount);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }

    private void createDeliveries(Notification notification, Member member, String title, String message) {
        java.util.Set<String> allowedChannels = channelPreferenceService.allowedChannels(member.getTenantId(), member.getId());
        providers.stream()
                .filter(provider -> provider.enabledFor(member))
                .filter(provider -> "in_app".equals(provider.channel()) || allowedChannels.contains(provider.channel()))
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

    private NotificationSendResult sendTo(NotificationProvider provider, String recipient, String title, String message) {
        try {
            return provider.sendTo(recipient, title, message);
        } catch (RuntimeException exception) {
            return NotificationSendResult.failed(exception.getMessage());
        }
    }

    private void createContactDeliveries(Notification notification, String title, String message, String phone, String email) {
        providers.stream()
                .filter(provider -> channelPreferenceService.saccoChannelEnabled(notification.getTenantId(), provider.channel()))
                .filter(provider -> {
                    String recipient = "email".equals(provider.channel()) ? email : "sms".equals(provider.channel()) ? phone : null;
                    return provider.enabledForRecipient(recipient);
                })
                .forEach(provider -> {
                    String recipient = "email".equals(provider.channel()) ? email : phone;
                    String deliveryMessage = "email".equals(provider.channel()) ? title + ": " + message : message;
                    NotificationSendResult result = sendTo(provider, recipient, title, deliveryMessage);
                    deliveryRepository.save(new NotificationDelivery(
                            "delivery_" + UUID.randomUUID(),
                            notification.getTenantId(),
                            notification.getId(),
                            null,
                            provider.channel(),
                            provider.providerId(),
                            recipient,
                            result,
                            deliveryMessage));
                });
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
