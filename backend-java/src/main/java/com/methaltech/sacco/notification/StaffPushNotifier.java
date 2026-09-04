package com.methaltech.sacco.notification;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * Best-effort push to a SACCO's staff topic ({@code staff_<saccoCode>}), which the staff app
 * subscribes to at sign-in. Delegates to the FCM provider when it is active
 * ({@code sacco.providers.push=fcm}); otherwise this is a no-op, so callers never need to know
 * whether push is configured.
 */
@Component
public class StaffPushNotifier {

    private final ObjectProvider<FcmPushNotificationProvider> fcm;

    StaffPushNotifier(ObjectProvider<FcmPushNotificationProvider> fcm) {
        this.fcm = fcm;
    }

    public void notifyStaff(String saccoCode, String title, String message) {
        if (saccoCode == null || saccoCode.isBlank()) {
            return;
        }
        fcm.ifAvailable(provider -> provider.sendToTopic("staff_" + saccoCode, title, message));
    }
}
