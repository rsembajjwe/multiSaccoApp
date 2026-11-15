package com.methaltech.sacco.notification;

import com.methaltech.sacco.identity.StaffNotificationRecipient;
import com.methaltech.sacco.identity.StaffNotificationRecipientService;
import com.methaltech.sacco.tenant.Tenant;
import com.methaltech.sacco.tenant.TenantRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
class PlatformSmsBroadcastService {

    private final TenantRepository tenantRepository;
    private final StaffNotificationRecipientService recipientService;
    private final NotificationRepository notificationRepository;
    private final NotificationDeliveryRepository deliveryRepository;
    private final List<NotificationProvider> providers;

    PlatformSmsBroadcastService(
            TenantRepository tenantRepository,
            StaffNotificationRecipientService recipientService,
            NotificationRepository notificationRepository,
            NotificationDeliveryRepository deliveryRepository,
            List<NotificationProvider> providers) {
        this.tenantRepository = tenantRepository;
        this.recipientService = recipientService;
        this.notificationRepository = notificationRepository;
        this.deliveryRepository = deliveryRepository;
        this.providers = providers;
    }

    PlatformSmsBroadcastResult send(boolean allSaccos, List<String> requestedTenantIds, String title, String message) {
        NotificationProvider smsProvider = providers.stream()
                .filter(provider -> "sms".equalsIgnoreCase(provider.channel()))
                .findFirst()
                .orElseThrow(() -> new NotificationProviderException("SMS provider is not configured."));
        List<Tenant> tenants = resolveTenants(allSaccos, requestedTenantIds);
        int recipients = 0;
        int sent = 0;
        int failed = 0;
        int saccosReached = 0;

        for (Tenant tenant : tenants) {
            Map<String, StaffNotificationRecipient> uniqueRecipients = new LinkedHashMap<>();
            for (StaffNotificationRecipient recipient : recipientService.verifiedSaccoLeadershipSmsRecipients(tenant.getId())) {
                String normalizedPhone = normalizePhone(recipient.phone());
                if (!normalizedPhone.isBlank() && smsProvider.enabledForRecipient(normalizedPhone)) {
                    uniqueRecipients.putIfAbsent(normalizedPhone, recipient);
                }
            }
            if (!uniqueRecipients.isEmpty()) saccosReached++;
            for (Map.Entry<String, StaffNotificationRecipient> entry : uniqueRecipients.entrySet()) {
                recipients++;
                StaffNotificationRecipient recipient = entry.getValue();
                Notification notification = notificationRepository.save(new Notification(
                        "notification_" + UUID.randomUUID(),
                        tenant.getId(),
                        null,
                        recipient.userId(),
                        "platform_sms_broadcast",
                        title,
                        message,
                        "platform_sms_broadcast",
                        null));
                NotificationSendResult result;
                try {
                    result = smsProvider.sendTo(entry.getKey(), title, message);
                } catch (RuntimeException exception) {
                    result = NotificationSendResult.failed(exception.getMessage());
                }
                deliveryRepository.save(new NotificationDelivery(
                        "delivery_" + UUID.randomUUID(),
                        tenant.getId(),
                        notification.getId(),
                        null,
                        recipient.userId(),
                        "sms",
                        smsProvider.providerId(),
                        entry.getKey(),
                        result,
                        message));
                if ("sent".equalsIgnoreCase(result.status())) sent++;
                else failed++;
            }
        }
        int segments = SmsMessageSegments.count(message);
        return new PlatformSmsBroadcastResult(
                tenants.size(), saccosReached, recipients, sent, failed, segments, recipients * segments);
    }

    private List<Tenant> resolveTenants(boolean allSaccos, List<String> requestedTenantIds) {
        if (allSaccos) {
            return tenantRepository.findAllByOrderByNameAsc().stream()
                    .filter(tenant -> !"tenant_platform".equals(tenant.getId()))
                    .toList();
        }
        List<String> tenantIds = requestedTenantIds == null ? List.of() : requestedTenantIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .filter(id -> !"tenant_platform".equals(id))
                .distinct()
                .toList();
        if (tenantIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one SACCO or choose all SACCOs.");
        }
        List<Tenant> tenants = tenantRepository.findAllById(tenantIds);
        if (tenants.size() != tenantIds.size()) {
            throw new IllegalArgumentException("One or more selected SACCOs were not found.");
        }
        return tenants;
    }

    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("[\\s()-]", "").trim();
    }

    record PlatformSmsBroadcastResult(
            int saccosSelected,
            int saccosReached,
            int recipients,
            int sent,
            int failed,
            int smsSegments,
            int providerSmsUnits) {
    }
}
