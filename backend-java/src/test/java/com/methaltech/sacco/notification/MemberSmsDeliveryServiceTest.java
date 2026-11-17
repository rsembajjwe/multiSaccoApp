package com.methaltech.sacco.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

class MemberSmsDeliveryServiceTest {

    @Test
    void startsWithoutSmsProviderAndFailsOnlyWhenSending() {
        MemberSmsDeliveryService service = new MemberSmsDeliveryService(List.of());

        assertThatThrownBy(() -> service.send("256700000000", "Reset code: 123456"))
                .isInstanceOf(NotificationProviderException.class)
                .hasMessage("SMS provider is not configured.");
    }

    @Test
    void sendsWithConfiguredSmsProvider() {
        MemberSmsDeliveryService service = new MemberSmsDeliveryService(List.of(new TestSmsProvider()));

        assertThat(service.send("256700000000", "Reset code: 123456")).isTrue();
    }

    private static final class TestSmsProvider implements NotificationProvider {

        @Override
        public String channel() {
            return "sms";
        }

        @Override
        public String providerId() {
            return "test_sms";
        }

        @Override
        public String recipient(com.methaltech.sacco.member.Member member) {
            return member.getPhone();
        }
    }
}
