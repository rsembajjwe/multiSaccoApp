package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
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
                "/smskings/api.php",
                "/smskings/balance_api.php",
                "sms@example.com",
                "sms-password",
                "Tereka");

        server.expect(once(), requestTo("https://afrosms.test/smskings/api.php?email=sms@example.com&password=sms-password&destination=256700000001&source=Tereka&message=Your%20deposit%20was%20posted.&call=sendsms"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("sms-ref-1", MediaType.TEXT_PLAIN));

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
                "/smskings/api.php",
                "/smskings/balance_api.php",
                "sms@example.com",
                "sms-password",
                "Tereka");

        server.expect(once(), requestTo("https://afrosms.test/smskings/api.php?email=sms@example.com&password=sms-password&destination=256700000001&source=Tereka&message=Your%20deposit%20was%20posted.&call=sendsms"))
                .andRespond(org.springframework.test.web.client.response.MockRestResponseCreators.withUnauthorizedRequest());

        NotificationSendResult result = provider.send(member(), "Payment received", "Your deposit was posted.");

        assertEquals("failed", result.status());
        assertTrue(result.providerMessage().contains("AfroSMS rejected"));
        server.verify();
    }

    @Test
    void balanceReturnsNumericCreditsFromAfroSms() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AfroSmsNotificationProvider provider = new AfroSmsNotificationProvider(
                builder,
                "https://afrosms.test",
                "/smskings/api.php",
                "/smskings/balance_api.php",
                "sms@example.com",
                "sms-password",
                "Tereka");

        server.expect(once(), requestTo("https://afrosms.test/smskings/balance_api.php?email=sms@example.com&password=sms-password&call=credits"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("Credits: 1250", MediaType.TEXT_PLAIN));

        assertEquals("1250", provider.balance());
        server.verify();
    }

    @Test
    void statusReportsReadyWithAfroSmsCredits() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AfroSmsNotificationProvider provider = new AfroSmsNotificationProvider(
                builder,
                "https://afrosms.test",
                "/smskings/api.php",
                "/smskings/balance_api.php",
                "sms@example.com",
                "sms-password",
                "Tereka");

        server.expect(once(), requestTo("https://afrosms.test/smskings/balance_api.php?email=sms@example.com&password=sms-password&call=credits"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("Credits: 1250", MediaType.TEXT_PLAIN));

        NotificationProviderStatusResponse status = provider.status();

        assertEquals("ready", status.status());
        assertEquals("1250", status.balance());
        server.verify();
    }

    @Test
    void statusReportsUnavailableWhenAfroSmsBalanceFails() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AfroSmsNotificationProvider provider = new AfroSmsNotificationProvider(
                builder,
                "https://afrosms.test",
                "/smskings/api.php",
                "/smskings/balance_api.php",
                "sms@example.com",
                "sms-password",
                "Tereka");

        server.expect(once(), requestTo("https://afrosms.test/smskings/balance_api.php?email=sms@example.com&password=sms-password&call=credits"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withServerError());

        NotificationProviderStatusResponse status = provider.status();

        assertEquals("unavailable", status.status());
        assertTrue(status.message().contains("AfroSMS"));
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
