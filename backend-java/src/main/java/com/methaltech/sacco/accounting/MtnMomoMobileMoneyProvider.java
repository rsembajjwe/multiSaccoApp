package com.methaltech.sacco.accounting;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import com.methaltech.sacco.config.ProviderResilience;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
class MtnMomoMobileMoneyProvider implements MobileMoneyProvider {

    private static final String CIRCUIT = "mtn_momo";

    private final RestClient restClient;
    private final ProviderResilience resilience;
    private final String baseUrl;
    private final String subscriptionKey;
    private final String apiUserId;
    private final String apiKey;
    private final String targetEnvironment;

    MtnMomoMobileMoneyProvider(
            RestClient.Builder restClientBuilder,
            ProviderResilience resilience,
            @Value("${sacco.integrations.mobile-money.mtn.base-url:https://sandbox.momodeveloper.mtn.com}") String baseUrl,
            @Value("${sacco.integrations.mobile-money.mtn.subscription-key:}") String subscriptionKey,
            @Value("${sacco.integrations.mobile-money.mtn.api-user-id:}") String apiUserId,
            @Value("${sacco.integrations.mobile-money.mtn.api-key:}") String apiKey,
            @Value("${sacco.integrations.mobile-money.mtn.target-environment:sandbox}") String targetEnvironment) {
        this.resilience = resilience;
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
    public boolean isConfigured() {
        return subscriptionKey != null && !subscriptionKey.isBlank()
                && apiUserId != null && !apiUserId.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && targetEnvironment != null && !targetEnvironment.isBlank();
    }

    @Override
    public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
        assertConfigured();
        String providerReference = UUID.randomUUID().toString();
        String token = collectionToken();
        try {
            // Payment initiation is not idempotent: circuit-break only (never retry) so a repeated
            // provider failure fails fast instead of risking a double charge.
            resilience.protect(CIRCUIT, () -> restClient.post()
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
                    .toBodilessEntity());
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("MTN MoMo rejected the payment request: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("MTN MoMo payment request could not be completed.", exception);
        }
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

    @Override
    public MobileMoneyProviderStatusResult queryPaymentStatus(MobileMoneyPaymentRequestEntity request) {
        assertConfigured();
        if (request.getProviderReference() == null || request.getProviderReference().isBlank()) {
            throw new MobileMoneyProviderException("MTN MoMo payment request has no provider reference.");
        }
        String token = collectionToken();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = resilience.protectIdempotent(CIRCUIT, () -> restClient.get()
                    .uri("/collection/v1_0/requesttopay/{reference}", request.getProviderReference())
                    .header("Authorization", "Bearer " + token)
                    .header("X-Target-Environment", targetEnvironment)
                    .header("Ocp-Apim-Subscription-Key", subscriptionKey)
                    .retrieve()
                    .body(Map.class));
            return mapProviderStatus(request, body);
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("MTN MoMo status check failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("MTN MoMo status check could not be completed.", exception);
        }
    }

    private String collectionToken() {
        assertConfigured();
        String basicToken = Base64.getEncoder()
                .encodeToString((apiUserId + ":" + apiKey).getBytes(StandardCharsets.UTF_8));
        Map<String, Object> body;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = resilience.protectIdempotent(CIRCUIT, () -> restClient.post()
                    .uri("/collection/token/")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Basic " + basicToken)
                    .header("Ocp-Apim-Subscription-Key", subscriptionKey)
                    .header("X-Target-Environment", targetEnvironment)
                    .retrieve()
                    .body(Map.class));
            body = response;
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("MTN MoMo token request failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("MTN MoMo token request could not be completed.", exception);
        }
        Object token = body == null ? null : body.get("access_token");
        if (token == null || token.toString().isBlank()) {
            throw new MobileMoneyProviderException("MTN MoMo did not return an access token.");
        }
        return token.toString();
    }

    private MobileMoneyProviderStatusResult mapProviderStatus(MobileMoneyPaymentRequestEntity request, Map<String, Object> body) {
        String providerStatus = body == null || body.get("status") == null ? "UNKNOWN" : body.get("status").toString();
        String normalized = providerStatus.trim().toUpperCase(Locale.ROOT);
        Instant now = Instant.now();
        return switch (normalized) {
            case "SUCCESSFUL" -> new MobileMoneyProviderStatusResult(
                    "paid_pending_callback",
                    "MTN MoMo confirms successful payment. Awaiting verified callback posting.",
                    request.getProviderReference(),
                    normalized,
                    true,
                    now);
            case "FAILED", "REJECTED" -> new MobileMoneyProviderStatusResult(
                    "failed",
                    "MTN MoMo returned " + normalized.toLowerCase(Locale.ROOT) + ".",
                    request.getProviderReference(),
                    normalized,
                    false,
                    now);
            case "PENDING" -> new MobileMoneyProviderStatusResult(
                    "pending_provider_confirmation",
                    "MTN MoMo payment is still waiting for member confirmation.",
                    request.getProviderReference(),
                    normalized,
                    true,
                    now);
            default -> new MobileMoneyProviderStatusResult(
                    "provider_unknown",
                    "MTN MoMo returned status " + providerStatus + ".",
                    request.getProviderReference(),
                    providerStatus,
                    true,
                    now);
        };
    }

    private void assertConfigured() {
        if (subscriptionKey == null || subscriptionKey.isBlank()
                || apiUserId == null || apiUserId.isBlank()
                || apiKey == null || apiKey.isBlank()
                || targetEnvironment == null || targetEnvironment.isBlank()) {
            throw new MobileMoneyProviderException("MTN MoMo provider is not fully configured.");
        }
    }

    private String msisdn(String phone) {
        return phone == null ? "" : phone.replace("+", "").replace(" ", "").trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://sandbox.momodeveloper.mtn.com";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
