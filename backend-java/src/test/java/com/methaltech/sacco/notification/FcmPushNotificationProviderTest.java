package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.Member;
import org.junit.jupiter.api.Test;

class FcmPushNotificationProviderTest {

    @Test
    void exposesProviderMetadataAndMemberRecipient() {
        FcmPushNotificationProvider provider = provider();
        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_green_001");

        assertEquals("push", provider.channel());
        assertEquals("fcm", provider.providerId());
        assertEquals("member_green_001", provider.recipient(member));
    }

    @Test
    void rejectsMissingRecipientsAndTopicsWithoutInitialisingFirebase() {
        FcmPushNotificationProvider provider = provider();

        assertFailed(provider.sendTo(null, "Title", "Message"), "No member id");
        assertFailed(provider.sendTo("  ", "Title", "Message"), "No member id");
        assertFailed(provider.sendToTopic(null, "Title", "Message"), "No topic");
        assertFailed(provider.sendToTopic("  ", "Title", "Message"), "No topic");
        assertFailed(provider.sendToToken(null, "Title", "Message"), "No device token");
        assertFailed(provider.sendToToken("  ", "Title", "Message"), "No device token");
    }

    @Test
    void reportsMissingFirebaseCredentialsWithoutThrowingOrLeaking() {
        FcmPushNotificationProvider provider = provider();

        NotificationSendResult send = provider.sendTo("member_green_001", null, null);
        assertFailed(send, "FCM push failed");
        assertTrue(send.providerMessage().contains("firebase-test-credentials-missing.json"));

        NotificationProviderStatusResponse status = provider.status();
        assertEquals("push", status.channel());
        assertEquals("fcm", status.provider());
        assertNotNull(status.message());
        assertTrue(status.message().contains("Firebase not initialised"));
    }

    private FcmPushNotificationProvider provider() {
        return new FcmPushNotificationProvider("fcm", "firebase-test-credentials-missing.json");
    }

    private void assertFailed(NotificationSendResult result, String expectedMessage) {
        assertEquals("failed", result.status());
        assertTrue(result.providerMessage().contains(expectedMessage));
    }
}
