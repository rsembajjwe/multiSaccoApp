package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OnboardingNotificationServiceTest {

    @Test
    void convertsMainAccountUgandanShillingsToAvailableMessages() {
        OnboardingNotificationService service = new OnboardingNotificationService(List.of(
                provider(new NotificationProviderStatusResponse(
                        "sms", "afrosms", "ready", "23955", "Ready", Instant.now()))));

        OnboardingNotificationService.SmsAccountCapacity capacity =
                service.platformSmsCapacity(new BigDecimal("35"));

        assertEquals(new BigDecimal("23955"), capacity.balance());
        assertEquals(684, capacity.availableMessages());
    }

    @Test
    void rejectsUnavailableMainSmsBalance() {
        OnboardingNotificationService service = new OnboardingNotificationService(List.of(
                provider(new NotificationProviderStatusResponse(
                        "sms", "afrosms", "unavailable", null, "Offline", Instant.now()))));

        assertThrows(OnboardingNotificationService.OnboardingDeliveryException.class,
                () -> service.platformSmsCapacity(new BigDecimal("35")));
    }

    private NotificationProvider provider(NotificationProviderStatusResponse status) {
        return new NotificationProvider() {
            @Override
            public String channel() {
                return "sms";
            }

            @Override
            public String providerId() {
                return "afrosms";
            }

            @Override
            public String recipient(com.methaltech.sacco.member.Member member) {
                return member.getPhone();
            }

            @Override
            public NotificationProviderStatusResponse status() {
                return status;
            }
        };
    }
}
