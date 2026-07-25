package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class MpesaDarajaMobileMoneyProviderTest {

    @Test
    void requestPaymentCallsDarajaStkPushAndReturnsPendingCallbackResult() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MpesaDarajaMobileMoneyProvider provider = provider(builder);

        expectToken(server);
        server.expect(once(), requestTo("https://daraja.test/mpesa/stkpush/v1/processrequest"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer access-token"))
                .andRespond(withSuccess("{\"CheckoutRequestID\":\"checkout-ref-1\",\"ResponseCode\":\"0\"}", MediaType.APPLICATION_JSON));

        MobileMoneyPaymentResult result = provider.requestPayment(new MobileMoneyPaymentRequest(
                "tenant_kenya",
                "member_kenya_amina",
                "KYS-0001",
                null,
                "savings_deposit",
                BigDecimal.valueOf(5000),
                "KES",
                "0712345678",
                "MM-MPESA-0001",
                "mpesa",
                null));

        assertEquals("mpesa_daraja", result.provider());
        assertEquals("checkout-ref-1", result.providerReference());
        assertEquals("pending_provider_callback", result.status());
        assertTrue(result.callbackPosting());
        assertTrue(result.checkoutPrompt().contains("M-PESA"));
        server.verify();
    }

    @Test
    void queryPaymentStatusMapsSuccessfulDarajaStatusToAwaitingCallbackPosting() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MpesaDarajaMobileMoneyProvider provider = provider(builder);
        MobileMoneyPaymentRequestEntity request = request("checkout-ref-2");

        expectToken(server);
        server.expect(once(), requestTo("https://daraja.test/mpesa/stkpushquery/v1/query"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer access-token"))
                .andRespond(withSuccess("{\"ResultCode\":\"0\",\"ResultDesc\":\"The service request is processed successfully.\"}", MediaType.APPLICATION_JSON));

        MobileMoneyProviderStatusResult result = provider.queryPaymentStatus(request);

        assertEquals("paid_pending_callback", result.status());
        assertEquals("0", result.providerStatus());
        assertTrue(result.callbackPosting());
        server.verify();
    }

    @Test
    void queryPaymentStatusMapsFailedDarajaStatusToFailedOperationalStatus() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        MpesaDarajaMobileMoneyProvider provider = provider(builder);
        MobileMoneyPaymentRequestEntity request = request("checkout-ref-3");

        expectToken(server);
        server.expect(once(), requestTo("https://daraja.test/mpesa/stkpushquery/v1/query"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"ResultCode\":\"1032\",\"ResultDesc\":\"Request cancelled by user.\"}", MediaType.APPLICATION_JSON));

        MobileMoneyProviderStatusResult result = provider.queryPaymentStatus(request);

        assertEquals("failed", result.status());
        assertEquals("1032", result.providerStatus());
        assertEquals(false, result.callbackPosting());
        server.verify();
    }

    private MpesaDarajaMobileMoneyProvider provider(RestClient.Builder builder) {
        return new MpesaDarajaMobileMoneyProvider(
                builder,
                "https://daraja.test",
                "consumer-key",
                "consumer-secret",
                "174379",
                "passkey",
                "https://example.com/mpesa/callback",
                "CustomerPayBillOnline",
                "174379",
                "/oauth/v1/generate?grant_type=client_credentials",
                "/mpesa/stkpush/v1/processrequest",
                "/mpesa/stkpushquery/v1/query");
    }

    private MobileMoneyPaymentRequestEntity request(String providerReference) {
        return MobileMoneyPaymentRequestEntity.from(
                new MobileMoneyPaymentResult(
                        "payment_request_" + providerReference,
                        "tenant_kenya",
                        "member_kenya_amina",
                        "savings_deposit",
                        BigDecimal.valueOf(5000),
                        "KES",
                        "mpesa_daraja",
                        "MM-MPESA-0002",
                        providerReference,
                        "pending_provider_callback",
                        "Waiting for callback.",
                        "Approve the prompt.",
                        true,
                        java.time.Instant.now()),
                null,
                "0712345678",
                "{}");
    }

    private void expectToken(MockRestServiceServer server) {
        server.expect(once(), requestTo("https://daraja.test/oauth/v1/generate?grant_type=client_credentials"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Basic Y29uc3VtZXIta2V5OmNvbnN1bWVyLXNlY3JldA=="))
                .andRespond(withSuccess("{\"access_token\":\"access-token\"}", MediaType.APPLICATION_JSON));
    }
}
