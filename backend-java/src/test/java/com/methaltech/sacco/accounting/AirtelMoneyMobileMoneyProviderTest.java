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

class AirtelMoneyMobileMoneyProviderTest {

    @Test
    void requestPaymentCallsAirtelPaymentEndpointAndReturnsPendingCallbackResult() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AirtelMoneyMobileMoneyProvider provider = provider(builder);

        expectToken(server);
        server.expect(once(), requestTo("https://airtel.test/merchant/v1/payments/"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer access-token"))
                .andExpect(header("X-Country", "UG"))
                .andExpect(header("X-Currency", "UGX"))
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
                "MM-AIRTEL-0001",
                "airtel",
                null));

        assertEquals("airtel_money", result.provider());
        assertEquals("pending_provider_callback", result.status());
        assertTrue(result.callbackPosting());
        assertTrue(result.checkoutPrompt().contains("Airtel Money"));
        server.verify();
    }

    @Test
    void queryPaymentStatusMapsSuccessfulAirtelStatusToAwaitingCallbackPosting() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AirtelMoneyMobileMoneyProvider provider = provider(builder);
        MobileMoneyPaymentRequestEntity request = request("airtel-provider-ref-1");

        expectToken(server);
        server.expect(once(), requestTo("https://airtel.test/standard/v1/payments/airtel-provider-ref-1"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer access-token"))
                .andExpect(header("X-Country", "UG"))
                .andExpect(header("X-Currency", "UGX"))
                .andRespond(withSuccess("{\"data\":{\"transaction\":{\"status\":\"TS\"}}}", MediaType.APPLICATION_JSON));

        MobileMoneyProviderStatusResult result = provider.queryPaymentStatus(request);

        assertEquals("paid_pending_callback", result.status());
        assertEquals("TS", result.providerStatus());
        assertTrue(result.callbackPosting());
        server.verify();
    }

    @Test
    void queryPaymentStatusMapsFailedAirtelStatusToFailedOperationalStatus() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AirtelMoneyMobileMoneyProvider provider = provider(builder);
        MobileMoneyPaymentRequestEntity request = request("airtel-provider-ref-2");

        expectToken(server);
        server.expect(once(), requestTo("https://airtel.test/standard/v1/payments/airtel-provider-ref-2"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"data\":{\"transaction\":{\"status\":\"TF\"}}}", MediaType.APPLICATION_JSON));

        MobileMoneyProviderStatusResult result = provider.queryPaymentStatus(request);

        assertEquals("failed", result.status());
        assertEquals("TF", result.providerStatus());
        assertEquals(false, result.callbackPosting());
        server.verify();
    }

    private AirtelMoneyMobileMoneyProvider provider(RestClient.Builder builder) {
        return new AirtelMoneyMobileMoneyProvider(
                builder,
                "https://airtel.test",
                "client-id",
                "client-secret",
                "UG",
                "/auth/oauth2/token",
                "/merchant/v1/payments/",
                "/standard/v1/payments/{transactionId}");
    }

    private MobileMoneyPaymentRequestEntity request(String providerReference) {
        return MobileMoneyPaymentRequestEntity.from(
                new MobileMoneyPaymentResult(
                        "payment_request_" + providerReference,
                        "tenant_green",
                        "member_green_amina",
                        "savings_deposit",
                        BigDecimal.valueOf(5000),
                        "UGX",
                        "airtel_money",
                        "MM-AIRTEL-0002",
                        providerReference,
                        "pending_provider_callback",
                        "Waiting for callback.",
                        "Approve the prompt.",
                        true,
                        java.time.Instant.now()),
                null,
                "+256700000001",
                "{}");
    }

    private void expectToken(MockRestServiceServer server) {
        server.expect(once(), requestTo("https://airtel.test/auth/oauth2/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"access_token\":\"access-token\"}", MediaType.APPLICATION_JSON));
    }
}
