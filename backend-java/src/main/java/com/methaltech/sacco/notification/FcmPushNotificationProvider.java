package com.methaltech.sacco.notification;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.methaltech.sacco.member.Member;
import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Real mobile push via Firebase Cloud Messaging. Active when
 * {@code sacco.providers.push=fcm} (set {@code SACCO_PUSH_PROVIDER=fcm}); otherwise the
 * demo stub stays in charge. The member app subscribes to the topic {@code member_<id>}
 * at sign-in, so this sends to that topic — no per-device tokens are stored server-side.
 */
@Component
@ConditionalOnProperty(name = "sacco.providers.push", havingValue = "fcm")
class FcmPushNotificationProvider implements NotificationProvider {

    private final String providerId;
    private final String credentialsResource;
    private volatile boolean initialised;

    FcmPushNotificationProvider(
            @Value("${sacco.providers.push:fcm}") String providerId,
            @Value("${sacco.providers.push.fcm.credentials:firebase-service-account.json}")
                    String credentialsResource) {
        this.providerId = providerId;
        this.credentialsResource = credentialsResource;
    }

    private synchronized void ensureInitialised() {
        if (initialised) {
            return;
        }
        if (FirebaseApp.getApps().isEmpty()) {
            try (InputStream in = new ClassPathResource(credentialsResource).getInputStream()) {
                FirebaseApp.initializeApp(FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(in))
                        .build());
            } catch (Exception exception) {
                throw new IllegalStateException(
                        "Failed to initialise Firebase from classpath:" + credentialsResource, exception);
            }
        }
        initialised = true;
    }

    @Override
    public String channel() {
        return "push";
    }

    @Override
    public String providerId() {
        return providerId;
    }

    @Override
    public String recipient(Member member) {
        return member.getId();
    }

    @Override
    public NotificationSendResult sendTo(String recipient, String title, String message) {
        if (recipient == null || recipient.isBlank()) {
            return NotificationSendResult.failed("No member id for push delivery.");
        }
        return sendToTopic("member_" + recipient, title, message);
    }

    /** Sends a notification-type push to an arbitrary FCM topic (e.g. a staff topic). */
    NotificationSendResult sendToTopic(String topic, String title, String message) {
        if (topic == null || topic.isBlank()) {
            return NotificationSendResult.failed("No topic for push delivery.");
        }
        try {
            ensureInitialised();
            Message push = Message.builder()
                    .setTopic(topic)
                    .setNotification(Notification.builder()
                            .setTitle(title == null || title.isBlank() ? "SACCO" : title)
                            .setBody(message == null ? "" : message)
                            .build())
                    .build();
            String id = FirebaseMessaging.getInstance().send(push);
            return NotificationSendResult.sent(id, "FCM push sent to topic " + topic);
        } catch (Exception exception) {
            return NotificationSendResult.failed("FCM push failed: " + exception.getMessage());
        }
    }

    NotificationSendResult sendToToken(String token, String title, String message) {
        if (token == null || token.isBlank()) {
            return NotificationSendResult.failed("No device token for push delivery.");
        }
        try {
            ensureInitialised();
            Message push = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title == null || title.isBlank() ? "SACCO" : title)
                            .setBody(message == null ? "" : message)
                            .build())
                    .build();
            String id = FirebaseMessaging.getInstance().send(push);
            return NotificationSendResult.sent(id, "FCM push sent to registered device");
        } catch (Exception exception) {
            return NotificationSendResult.failed("FCM push failed: " + exception.getMessage());
        }
    }

    @Override
    public NotificationProviderStatusResponse status() {
        try {
            ensureInitialised();
            return NotificationProviderStatusResponse.ready(channel(), providerId(), null,
                    "Firebase Cloud Messaging is configured.");
        } catch (Exception exception) {
            return NotificationProviderStatusResponse.ready(channel(), providerId(), null,
                    "Firebase not initialised: " + exception.getMessage());
        }
    }
}
