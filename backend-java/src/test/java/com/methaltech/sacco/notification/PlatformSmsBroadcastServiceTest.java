package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.identity.StaffNotificationRecipient;
import com.methaltech.sacco.identity.StaffNotificationRecipientService;
import com.methaltech.sacco.tenant.Tenant;
import com.methaltech.sacco.tenant.TenantRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class PlatformSmsBroadcastServiceTest {

    private final TenantRepository tenantRepository = mock(TenantRepository.class);
    private final StaffNotificationRecipientService recipientService = mock(StaffNotificationRecipientService.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final NotificationDeliveryRepository deliveryRepository = mock(NotificationDeliveryRepository.class);
    private final NotificationProvider smsProvider = mock(NotificationProvider.class);
    private final PlatformSmsBroadcastService service = new PlatformSmsBroadcastService(
            tenantRepository, recipientService, notificationRepository, deliveryRepository, List.of(smsProvider));

    @Test
    void sendsOncePerUniqueVerifiedLeadershipPhoneAndAuditsFailures() {
        Tenant tenant = mock(Tenant.class);
        when(tenant.getId()).thenReturn("tenant_one");
        when(tenantRepository.findAllById(List.of("tenant_one"))).thenReturn(List.of(tenant));
        StaffNotificationRecipient chairperson = recipient("chair", "+256 700 000001");
        StaffNotificationRecipient duplicate = recipient("treasurer", "+256700000001");
        StaffNotificationRecipient secretary = recipient("secretary", "+256700000002");
        when(recipientService.verifiedSaccoLeadershipSmsRecipients("tenant_one"))
                .thenReturn(List.of(chairperson, duplicate, secretary));
        when(smsProvider.channel()).thenReturn("sms");
        when(smsProvider.providerId()).thenReturn("afrosms");
        when(smsProvider.enabledForRecipient(any())).thenReturn(true);
        when(smsProvider.sendTo("+256700000001", "Notice", "Message")).thenReturn(NotificationSendResult.sent("one", "Sent"));
        when(smsProvider.sendTo("+256700000002", "Notice", "Message")).thenReturn(NotificationSendResult.failed("Rejected"));
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(deliveryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PlatformSmsBroadcastService.PlatformSmsBroadcastResult result = service.send(
                false, List.of("tenant_one"), "Notice", "Message");

        assertEquals(1, result.saccosSelected());
        assertEquals(1, result.saccosReached());
        assertEquals(2, result.recipients());
        assertEquals(1, result.sent());
        assertEquals(1, result.failed());
        verify(smsProvider).sendTo("+256700000001", "Notice", "Message");
        verify(smsProvider).sendTo("+256700000002", "Notice", "Message");
    }

    @Test
    void requiresAnExplicitSelectionWhenAllIsFalse() {
        when(smsProvider.channel()).thenReturn("sms");
        assertThrows(IllegalArgumentException.class,
                () -> service.send(false, List.of(), "Notice", "Message"));
    }

    private StaffNotificationRecipient recipient(String userId, String phone) {
        return new StaffNotificationRecipient(
                userId, "tenant_one", userId, userId + "@example.com", phone, true, true);
    }
}
