package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.methaltech.sacco.member.Member;
import java.lang.reflect.Constructor;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class AfroSmsNotificationProviderTest {

    @Test
    void sendPostsSmsToConfiguredAfroSmsEndpoint() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AfroSmsNotificationProvider provider = new AfroSmsNotificationProvider(
                builder,
                "https://afrosms.test",
                "/api/sms/send",
                "afrosms-key",
                "Tereka",
                "Authorization",
                "to",
                "message",
                "sender");

        server.expect(once(), requestTo("https://afrosms.test/api/sms/send"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer afrosms-key"))
                .andRespond(withSuccess("{\"messageId\":\"sms-ref-1\"}", MediaType.APPLICATION_JSON));

        NotificationSendResult result = provider.send(member(), "Payment received", "Your deposit was posted.");

        assertEquals("sent", result.status());
        assertEquals("sms-ref-1", result.providerReference());
        server.verify();
    }

    @Test
    void sendReturnsFailedWhenAfroSmsRejectsRequest() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AfroSmsNotificationProvider provider = new AfroSmsNotificationProvider(
                builder,
                "https://afrosms.test",
                "/api/sms/send",
                "afrosms-key",
                "Tereka",
                "Authorization",
                "to",
                "message",
                "sender");

        server.expect(once(), requestTo("https://afrosms.test/api/sms/send"))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest());

        NotificationSendResult result = provider.send(member(), "Payment received", "Your deposit was posted.");

        assertEquals("failed", result.status());
        assertTrue(result.providerMessage().contains("AfroSMS rejected"));
        server.verify();
    }

    private Member member() {
        try {
            Constructor<Member> constructor = Member.class.getDeclaredConstructor(
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    String.class,
                    LocalDate.class);
            constructor.setAccessible(true);
            return constructor.newInstance(
                    "member_green_amina",
                    "tenant_green",
                    "branch_green_main",
                    "GVS-0001",
                    "Amina Green",
                    "individual",
                    "+256700000001",
                    "amina@example.com",
                    "CM0001",
                    "hash",
                    "salt",
                    "active",
                    "verified",
                    LocalDate.now());
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }
}
