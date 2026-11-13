package com.methaltech.sacco.notification;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * Best-effort push to authenticated staff devices registered for a tenant. Delegates to the FCM provider when it is active
 * ({@code sacco.providers.push=fcm}); otherwise this is a no-op, so callers never need to know
 * whether push is configured.
 */
@Component
public class StaffPushNotifier {

    private final ObjectProvider<FcmPushNotificationProvider> fcm;
    private final PushDeviceRegistrationService registrations;

    StaffPushNotifier(ObjectProvider<FcmPushNotificationProvider> fcm,
            PushDeviceRegistrationService registrations) {
        this.fcm = fcm;
        this.registrations = registrations;
    }

    public void notifyStaff(String tenantId, String title, String message) {
        if (tenantId == null || tenantId.isBlank()) {
            return;
        }
        fcm.ifAvailable(provider -> registrations.staffTokens(tenantId)
                .forEach(token -> provider.sendToToken(token, title, message)));
    }
}
