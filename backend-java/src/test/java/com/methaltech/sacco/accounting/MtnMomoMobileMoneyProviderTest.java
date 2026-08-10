package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withAccepted;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class MtnMomoMobileMoneyProviderTest {

    @Test
    void requestPaymentCallsMtnRequestToPayAndReturnsPendingCallbackResult() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MtnMomoMobileMoneyProvider provider = provider(builder);

        expectToken(server);
        server.expect(once(), requestTo("https://momo.test/collection/v1_0/requesttopay"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Target-Environment", "sandbox"))
                .andExpect(header("Ocp-Apim-Subscription-Key", "subscription-key"))
                .andRespond(withAccepted());

        MobileMoneyPaymentResult result = provider.requestPayment(new MobileMoneyPaymentRequest(
                "tenant_green",
                "member_green_amina",
                "GVS-0001",
                null,
                "savings_deposit",
                BigDecimal.valueOf(5000),
                "UGX",
                "+256700000001",
                "MM-TEST-0001",
                "mtn",
                null));

        assertEquals("mtn_momo", result.provider());
        assertEquals("pending_provider_callback", result.status());
        assertTrue(result.callbackPosting());
        assertTrue(result.checkoutPrompt().contains("MTN Mobile Money"));
        server.verify();
    }

    @Test
    void queryPaymentStatusMapsSuccessfulMtnStatusToAwaitingCallbackPosting() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MtnMomoMobileMoneyProvider provider = provider(builder);
        MobileMoneyPaymentRequestEntity request = MobileMoneyPaymentRequestEntity.from(
                new MobileMoneyPaymentResult(
                        "payment_request_provider-ref-1",
                        "tenant_green",
                        "member_green_amina",
                        "savings_deposit",
                        BigDecimal.valueOf(5000),
                        "UGX",
                        "mtn_momo",
                        "MM-TEST-0002",
                        "provider-ref-1",
                        "pending_provider_callback",
                        "Waiting for callback.",
                        "Approve the prompt.",
                        true,
                        java.time.Instant.now()),
                null,
                "+256700000001",
                "{}");

        expectToken(server);
        server.expect(once(), requestTo("https://momo.test/collection/v1_0/requesttopay/provider-ref-1"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Target-Environment", "sandbox"))
                .andRespond(withSuccess("{\"status\":\"SUCCESSFUL\"}", MediaType.APPLICATION_JSON));

        MobileMoneyProviderStatusResult result = provider.queryPaymentStatus(request);

        assertEquals("paid_pending_callback", result.status());
        assertEquals("SUCCESSFUL", result.providerStatus());
        assertTrue(result.callbackPosting());
        server.verify();
    }

    @Test
    void queryPaymentStatusMapsFailedMtnStatusToFailedOperationalStatus() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MtnMomoMobileMoneyProvider provider = provider(builder);
        MobileMoneyPaymentRequestEntity request = MobileMoneyPaymentRequestEntity.from(
                new MobileMoneyPaymentResult(
                        "payment_request_provider-ref-2",
                        "tenant_green",
                        "member_green_amina",
                        "savings_deposit",
                        BigDecimal.valueOf(5000),
                        "UGX",
                        "mtn_momo",
                        "MM-TEST-0003",
                        "provider-ref-2",
                        "pending_provider_callback",
                        "Waiting for callback.",
                        "Approve the prompt.",
                        true,
                        java.time.Instant.now()),
                null,
                "+256700000001",
                "{}");

        expectToken(server);
        server.expect(once(), requestTo("https://momo.test/collection/v1_0/requesttopay/provider-ref-2"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Target-Environment", "sandbox"))
                .andRespond(withSuccess("{\"status\":\"FAILED\"}", MediaType.APPLICATION_JSON));

        MobileMoneyProviderStatusResult result = provider.queryPaymentStatus(request);

        assertEquals("failed", result.status());
        assertEquals("FAILED", result.providerStatus());
        assertEquals(false, result.callbackPosting());
        server.verify();
    }

    private MtnMomoMobileMoneyProvider provider(RestClient.Builder builder) {
        return new MtnMomoMobileMoneyProvider(
                builder,
                new com.methaltech.sacco.config.ProviderResilience(),
                "https://momo.test",
                "subscription-key",
                "api-user-id",
                "api-key",
                "sandbox");
    }

    private void expectToken(MockRestServiceServer server) {
        server.expect(once(), requestTo("https://momo.test/collection/token/"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Ocp-Apim-Subscription-Key", "subscription-key"))
                .andRespond(withSuccess("{\"access_token\":\"access-token\"}", MediaType.APPLICATION_JSON));
    }
}
