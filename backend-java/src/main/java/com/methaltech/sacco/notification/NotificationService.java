package com.methaltech.sacco.notification;

import com.methaltech.sacco.identity.StaffNotificationRecipientService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.tenant.TenantMoneyFormatter;
import com.methaltech.sacco.tenant.TenantResponse;
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
    private final StaffPushNotifier staffPushNotifier;

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

    public Notification notifyGuarantorRequested(Member guarantor, Member applicant, String loanId) {
        String title = "Guarantee request";
        String message = applicant.getFullName() + " has requested you to guarantee their loan. Open Loans to accept or reject.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                guarantor.getTenantId(),
                guarantor.getId(),
                "loan_guarantor_requested",
                title,
                message,
                "loan_guarantor",
                loanId));
        createDeliveries(notification, guarantor, title, message);
        return notification;
    }

    public Notification notifyGuarantorRecorded(
            Member guarantor, Member applicant, String loanId, java.math.BigDecimal guaranteedAmount) {
        String title = "Signed guarantee recorded";
        String message = "Your signed guarantee for " + applicant.getFullName() + " was recorded for "
                + guaranteedAmount.toPlainString() + ".";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                guarantor.getTenantId(),
                guarantor.getId(),
                "loan_guarantor_recorded",
                title,
                message,
                "loan_guarantor",
                loanId));
        createDeliveries(notification, guarantor, title, message);
        return notification;
    }

    public Notification notifyGuarantorDecision(Member applicant, Member guarantor, String status, String loanId) {
        String title = "Guarantor " + status;
        String message = guarantor.getFullName() + " has " + status + " your loan guarantee request.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                applicant.getTenantId(),
                applicant.getId(),
                "loan_guarantor_decision",
                title,
                message,
                "loan",
                loanId));
        createDeliveries(notification, applicant, title, message);
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

    /**
     * Sends a member's password reset code over a single chosen channel (email, WhatsApp or SMS) — not
     * the usual all-channel fan-out, since a reset code must only go to the requested destination.
     */
    public Notification sendPasswordResetCode(Member member, String code, String channel) {
        String title = "Password reset code";
        String message = "Your password reset code is " + code + ". It expires in 30 minutes. If you did not request this, ignore this message.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "password_reset_code",
                title,
                message,
                "member_password_reset",
                null));
        providers.stream()
                .filter(provider -> channel != null && channel.equals(provider.channel()))
                .filter(provider -> provider.enabledFor(member))
                .findFirst()
                .ifPresent(provider -> {
                    NotificationSendResult result = send(provider, member, title, message);
                    createDelivery(notification, member, provider.channel(), provider.providerId(), provider.recipient(member), result, message);
                });
        return notification;
    }

            public Notification sendMemberActivationCredentials(Member member, String saccoCode, String password, String channel) {
            String title = "Member account activated";
            String message = "Your SACCO member login is active. SACCO code: " + saccoCode
                + ". Membership no: " + member.getMembershipNo()
                        + ". Password: " + password
                + ". Change it after login.";
            Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "member_activation_credentials",
                title,
                message,
                "member",
                member.getId()));
            NotificationProvider provider = providers.stream()
                .filter(candidate -> channel != null && channel.equals(candidate.channel()))
                .filter(candidate -> candidate.enabledFor(member))
                .findFirst()
                .orElseThrow(() -> new NotificationProviderException("No " + channel + " recipient or provider is available for this member."));
            String deliveryMessage = "email".equals(provider.channel()) ? title + ": " + message : message;
            NotificationSendResult result = send(provider, member, title, deliveryMessage);
            createDelivery(notification, member, provider.channel(), provider.providerId(), provider.recipient(member), result, deliveryMessage);
            return notification;
            }

    /** Notifies a member (across their enabled channels) that their savings were moved by a transfer. */
    public Notification notifySavingsMovement(Member member, BigDecimal amount, boolean debit, String description) {
        String title = debit ? "Savings transferred out" : "Savings credited";
        String amountText = formattedAmount(member.getTenantId(), amount);
        String message = (debit
                ? amountText + " was transferred out of your savings."
                : amountText + " was credited to your savings.")
                + (description == null || description.isBlank() ? "" : " " + description);
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                "savings_transfer",
                title,
                message,
                "savings_transfer",
                null));
        createDeliveries(notification, member, title, message);
        return notification;
    }

    public Notification notifyLoanRecoveryNotice(Member member, String reference, BigDecimal recoveryAmount) {
        String title = "Loan recovery notice";
        String message = "Recovery case " + reference + " applied "
                + formattedAmount(member.getTenantId(), recoveryAmount)
                + " from savings to your overdue loan under the signed loan terms. Contact the SACCO for details.";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(), member.getTenantId(), member.getId(),
                "loan_recovery_notice", title, message, "loan_recovery", reference));
        createDeliveries(notification, member, title, message);
        return notification;
    }

    public Notification notifyLoanRecoveryPosted(
            Member member, BigDecimal amount, String reference, String sourceType) {
        String title = "Loan recovery posted";
        String role = "guarantor".equals(sourceType) ? "guarantee obligation" : "loan obligation";
        String message = formattedAmount(member.getTenantId(), amount) + " was applied from your savings toward a "
                + role + " under recovery case " + reference + ".";
        Notification notification = notificationRepository.save(new Notification(
                "notification_" + UUID.randomUUID(), member.getTenantId(), member.getId(),
                "loan_recovery_posted", title, message, "loan_recovery", reference));
        createDeliveries(notification, member, title, message);
        return notification;
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

    /**
     * Best-effort push to the SACCO's staff so they see a member-filed complaint promptly.
     * No-op unless FCM push is configured.
     */
    public void notifyStaffOfComplaint(Member member, String complaintId, String subject) {
        String title = "New complaint";
        String message = subject == null || subject.isBlank()
                ? "A member filed a complaint."
                : "New complaint: " + subject;

        // Persist a per-officer inbox notification for complaint-handling staff, so it appears in
        // their personal inbox (not just as a transient push).
        String tenantId = member.getTenantId();
        for (com.methaltech.sacco.identity.StaffNotificationRecipient recipient : staffNotificationRecipientService.saccoComplaintRecipients(tenantId)) {
            Notification notification = notificationRepository.save(new Notification(
                    "notification_" + UUID.randomUUID(),
                    tenantId,
                    member.getId(),
                    recipient.userId(),
                    "complaint_filed",
                    title,
                    message,
                    "complaint",
                    complaintId));
            createStaffDeliveries(notification, recipient, title, message);
        }

        staffPushNotifier.notifyStaff(tenantId, title, message);
    }

    /**
     * Notifies savings-transfer approvers (administrators and the chairperson) that a transfer or
     * group deduction is awaiting their approval. The maker is skipped, since they cannot approve
     * their own transfer. Persists a per-officer inbox notification plus in-app/SMS/email deliveries.
     */
    public void notifyStaffOfSavingsTransfer(
            String tenantId, String resourceId, BigDecimal amount, int memberCount, String makerUserId) {
        if (tenantId == null || tenantId.isBlank()) {
            return;
        }
        String title = "Savings transfer to approve";
        String amountLabel = formattedAmount(tenantId, amount);
        String message = memberCount > 1
                ? "A group savings deduction of " + amountLabel + " for " + memberCount + " members needs approval."
                : "A savings transfer of " + amountLabel + " needs a second officer's approval.";
        for (com.methaltech.sacco.identity.StaffNotificationRecipient recipient
                : staffNotificationRecipientService.saccoSavingsTransferApproverRecipients(tenantId)) {
            if (makerUserId != null && makerUserId.equals(recipient.userId())) {
                continue;
            }
            Notification notification = notificationRepository.save(new Notification(
                    "notification_" + UUID.randomUUID(),
                    tenantId,
                    null,
                    recipient.userId(),
                    "savings_transfer_pending",
                    title,
                    message,
                    "savings_transfer",
                    resourceId));
            createStaffDeliveries(notification, recipient, title, message);
        }
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

    public List<Notification> notifySmsBroadcast(String tenantId, List<Member> recipients, String title, String message) {
        NotificationProvider smsProvider = providers.stream()
                .filter(provider -> "sms".equals(provider.channel()))
                .findFirst()
                .orElse(null);
        if (smsProvider == null) {
            throw new NotificationProviderException("SMS provider is not configured.");
        }
        return recipients.stream()
                .filter(member -> smsProvider.enabledFor(member))
                .map(member -> {
                    Notification notification = notificationRepository.save(new Notification(
                            "notification_" + UUID.randomUUID(),
                            tenantId,
                            member.getId(),
                            "sacco_sms_broadcast",
                            title,
                            message,
                            "sacco_sms",
                            null));
                    NotificationSendResult result = send(smsProvider, member, title, message);
                    createDelivery(
                            notification,
                            member,
                            smsProvider.channel(),
                            smsProvider.providerId(),
                            smsProvider.recipient(member),
                            result,
                            message);
                    return notification;
                })
                .toList();
    }

    /**
     * Notifies the SACCO's elected leadership that the platform subscription is approaching expiry.
     * Delivery records include in-app plus configured SMS/email attempts so chairperson, secretary and
     * treasurer all receive the renewal warning before operations are affected.
     */
    public List<Notification> notifySubscriptionExpiring(String tenantId, java.time.LocalDate expiry) {
        String title = "Subscription renewal due";
        String message = "Your SACCO subscription expires on " + expiry + ". Renew to avoid service interruption.";
        return staffNotificationRecipientService.saccoSubscriptionLeadershipRecipients(tenantId).stream()
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
                    createStaffDeliveries(notification, recipient, title, message);
                    return notification;
                })
                .toList();
    }

    /** Escalated dunning reminder once a SACCO subscription has lapsed (in the grace window before suspension). */
    public List<Notification> notifySubscriptionOverdue(String tenantId, java.time.LocalDate expiry) {
        String title = "Subscription overdue - renew now";
        String message = "Your SACCO subscription lapsed on " + expiry + ". Renew now to avoid suspension of write access.";
        return staffNotificationRecipientService.saccoSubscriptionLeadershipRecipients(tenantId).stream()
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
                    createStaffDeliveries(notification, recipient, title, message);
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

    public int notifyFleetApprovalRequested(String jobId, String action, int organizationCount,
            String requesterUserId, String requesterName) {
        String title = "Fleet update awaiting approval";
        String message = safe(requesterName) + " requested " + safe(action) + " for "
                + organizationCount + " organization" + (organizationCount == 1 ? "" : "s")
                + ". Review it in the Approval Inbox.";
        return notifyFleetApprovers("fleet_approval_requested", title, message, jobId, requesterUserId);
    }

    public int notifyFleetApprovalEscalation(String jobId, String action, int organizationCount,
            String requesterUserId, boolean overdue) {
        String eventType = overdue ? "fleet_approval_overdue" : "fleet_approval_due_soon";
        String title = overdue ? "Fleet approval SLA breached" : "Fleet approval due soon";
        String message = safe(action) + " for " + organizationCount + " organization"
                + (organizationCount == 1 ? "" : "s")
                + (overdue ? " has exceeded the eight-hour decision SLA." : " has been waiting for more than four hours.")
                + " Review it in the Approval Inbox.";
        return notifyFleetApprovers(eventType, title, message, jobId, requesterUserId);
    }

    public Notification notifyFleetApprovalDecision(String jobId, String requesterUserId,
            String decision, String checkerName, String reason) {
        String eventType = "approve".equals(decision) ? "fleet_approval_approved" : "fleet_approval_rejected";
        String deduplicationKey = fleetApprovalDeduplicationKey(eventType, jobId, requesterUserId);
        if (notificationRepository.existsByDeduplicationKey(deduplicationKey)) return null;
        return staffNotificationRecipientService.platformRecipient(requesterUserId)
                .map(recipient -> {
                    String title = "approve".equals(decision) ? "Fleet update approved" : "Fleet update rejected";
                    String message = safe(checkerName) + " " + ("approve".equals(decision) ? "approved" : "rejected")
                            + " your fleet update request. Reason: " + safe(reason) + ".";
                    Notification notification = new Notification(
                            "notification_" + UUID.randomUUID(), "tenant_platform", null, recipient.userId(),
                            eventType, title, message, "fleet_bulk_job", jobId);
                    notification.assignDeduplicationKey(deduplicationKey);
                    notification = notificationRepository.save(notification);
                    createStaffDeliveries(notification, recipient, title, message);
                    return notification;
                })
                .orElse(null);
    }

    private int notifyFleetApprovers(String eventType, String title, String message,
            String jobId, String excludedUserId) {
        int sent = 0;
        for (com.methaltech.sacco.identity.StaffNotificationRecipient recipient
                : staffNotificationRecipientService.platformFleetApproverRecipients()) {
            String deduplicationKey = fleetApprovalDeduplicationKey(eventType, jobId, recipient.userId());
            if (recipient.userId().equals(excludedUserId)
                    || notificationRepository.existsByDeduplicationKey(deduplicationKey)) continue;
            Notification notification = new Notification(
                    "notification_" + UUID.randomUUID(), "tenant_platform", null, recipient.userId(),
                    eventType, title, message, "fleet_bulk_job", jobId);
            notification.assignDeduplicationKey(deduplicationKey);
            notification = notificationRepository.save(notification);
            createStaffDeliveries(notification, recipient, title, message);
            sent++;
        }
        return sent;
    }

    private String fleetApprovalDeduplicationKey(String eventType, String jobId, String userId) {
        return eventType + ":" + jobId + ":" + userId;
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
                    createStaffDeliveries(notification, recipient, title, message);
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

    private void createStaffDeliveries(
            Notification notification,
            com.methaltech.sacco.identity.StaffNotificationRecipient recipient,
            String title,
            String message) {
        deliveryRepository.save(new NotificationDelivery(
                "delivery_" + UUID.randomUUID(),
                notification.getTenantId(),
                notification.getId(),
                null,
                recipient.userId(),
                "in_app",
                "tereka_online",
                recipient.userId(),
                message));

        providers.stream()
                .filter(provider -> "email".equals(provider.channel()) || "sms".equals(provider.channel()))
                .filter(provider -> channelPreferenceService.saccoChannelEnabled(notification.getTenantId(), provider.channel()))
                .filter(provider -> {
                    String target = "email".equals(provider.channel()) ? recipient.email() : recipient.phone();
                    return provider.enabledForRecipient(target);
                })
                .forEach(provider -> {
                    String target = "email".equals(provider.channel()) ? recipient.email() : recipient.phone();
                    String deliveryMessage = "email".equals(provider.channel()) ? title + ": " + message : message;
                    NotificationSendResult result = sendTo(provider, target, title, deliveryMessage);
                    deliveryRepository.save(new NotificationDelivery(
                            "delivery_" + UUID.randomUUID(),
                            notification.getTenantId(),
                            notification.getId(),
                            null,
                            recipient.userId(),
                            provider.channel(),
                            provider.providerId(),
                            target,
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
