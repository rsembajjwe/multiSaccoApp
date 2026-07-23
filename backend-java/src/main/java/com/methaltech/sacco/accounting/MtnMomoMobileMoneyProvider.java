package com.methaltech.sacco.accounting;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@Primary
@ConditionalOnProperty(name = "sacco.providers.mobile-money", havingValue = "mtn_momo")
class MtnMomoMobileMoneyProvider implements MobileMoneyProvider {

    private final RestClient restClient;
    private final String baseUrl;
    private final String subscriptionKey;
    private final String apiUserId;
    private final String apiKey;
    private final String targetEnvironment;

    MtnMomoMobileMoneyProvider(
            RestClient.Builder restClientBuilder,
            @Value("${sacco.integrations.mobile-money.mtn.base-url:https://sandbox.momodeveloper.mtn.com}") String baseUrl,
            @Value("${sacco.integrations.mobile-money.mtn.subscription-key:}") String subscriptionKey,
            @Value("${sacco.integrations.mobile-money.mtn.api-user-id:}") String apiUserId,
            @Value("${sacco.integrations.mobile-money.mtn.api-key:}") String apiKey,
            @Value("${sacco.integrations.mobile-money.mtn.target-environment:sandbox}") String targetEnvironment) {
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.subscriptionKey = subscriptionKey;
        this.apiUserId = apiUserId;
        this.apiKey = apiKey;
        this.targetEnvironment = targetEnvironment;
        this.restClient = restClientBuilder.baseUrl(this.baseUrl).build();
    }

    @Override
    public String providerId() {
        return "mtn_momo";
    }

    @Override
    public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
        String providerReference = UUID.randomUUID().toString();
        String token = collectionToken();
        restClient.post()
                .uri("/collection/v1_0/requesttopay")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token)
                .header("X-Reference-Id", providerReference)
                .header("X-Target-Environment", targetEnvironment)
                .header("Ocp-Apim-Subscription-Key", subscriptionKey)
                .body(Map.of(
                        "amount", request.amount().toPlainString(),
                        "currency", request.currencyCode(),
                        "externalId", request.externalReference(),
                        "payer", Map.of("partyIdType", "MSISDN", "partyId", msisdn(request.payerPhone())),
                        "payerMessage", "Tereka Online " + request.purpose().replace('_', ' '),
                        "payeeNote", request.tenantId() + " " + request.memberIdentifier()))
                .retrieve()
                .toBodilessEntity();
        return new MobileMoneyPaymentResult(
                "payment_request_" + providerReference,
                request.tenantId(),
                request.memberId(),
                request.purpose(),
                request.amount(),
                request.currencyCode(),
                providerId(),
                request.externalReference(),
                providerReference,
                "pending_provider_callback",
                "MTN MoMo payment request accepted. Posting waits for the provider callback.",
                "Approve the MTN Mobile Money prompt on the member phone.",
                true,
                Instant.now());
    }

    private String collectionToken() {
        String basicToken = Base64.getEncoder()
                .encodeToString((apiUserId + ":" + apiKey).getBytes(StandardCharsets.UTF_8));
        @SuppressWarnings("unchecked")
        Map<String, Object> body = restClient.post()
                .uri("/collection/token/")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Basic " + basicToken)
                .header("Ocp-Apim-Subscription-Key", subscriptionKey)
                .header("X-Target-Environment", targetEnvironment)
                .retrieve()
                .body(Map.class);
        Object token = body == null ? null : body.get("access_token");
        if (token == null || token.toString().isBlank()) {
            throw new IllegalStateException("MTN MoMo did not return an access token.");
        }
        return token.toString();
    }

    private String msisdn(String phone) {
        return phone == null ? "" : phone.replace("+", "").replace(" ", "").trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://sandbox.momodeveloper.mtn.com";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
