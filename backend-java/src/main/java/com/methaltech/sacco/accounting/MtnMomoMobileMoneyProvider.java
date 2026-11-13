package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import com.methaltech.sacco.config.ProviderCredentialService;
import com.methaltech.sacco.config.ProviderResilience;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
class MtnMomoMobileMoneyProvider implements MobileMoneyProvider {

    private static final String CIRCUIT = "mtn_momo";
    private static final String PARTY_ID_TYPE_MSISDN = "MSISDN";
    private static final String SANDBOX_ENVIRONMENT = "sandbox";
    private static final String SANDBOX_CURRENCY = "EUR";
    private static final Logger log = LoggerFactory.getLogger(MtnMomoMobileMoneyProvider.class);

    private final RestClient restClient;
    private final ProviderResilience resilience;
    private final ProviderCredentialService credentialService;
    private final String baseUrl;
    private final String subscriptionKey;
    private final String apiUserId;
    private final String apiKey;
    private final String targetEnvironment;

    MtnMomoMobileMoneyProvider(
            RestClient.Builder restClientBuilder,
            ProviderResilience resilience,
            ProviderCredentialService credentialService,
            @Value("${sacco.integrations.mobile-money.mtn.base-url:https://sandbox.momodeveloper.mtn.com}") String baseUrl,
            @Value("${sacco.integrations.mobile-money.mtn.subscription-key:}") String subscriptionKey,
            @Value("${sacco.integrations.mobile-money.mtn.api-user-id:}") String apiUserId,
            @Value("${sacco.integrations.mobile-money.mtn.api-key:}") String apiKey,
            @Value("${sacco.integrations.mobile-money.mtn.target-environment:sandbox}") String targetEnvironment) {
        this.resilience = resilience;
        this.credentialService = credentialService;
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
    public String label() {
        return "MTN MoMo";
    }

    @Override
    public MobileMoneyBalanceResult queryBalance() {
        Credentials credentials = credentials(ProviderCredentialService.PLATFORM_SCOPE);
        String token = collectionToken(credentials);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = resilience.protectIdempotent(CIRCUIT, () -> restClient.get()
                    .uri("/collection/v1_0/account/balance")
                    .header("Authorization", "Bearer " + token)
                    .header("X-Target-Environment", credentials.targetEnvironment())
                    .header("Ocp-Apim-Subscription-Key", credentials.subscriptionKey())
                    .retrieve()
                    .body(Map.class));
            Object rawAmount = body == null ? null : body.get("availableBalance");
            Object rawCurrency = body == null ? null : body.get("currency");
            BigDecimal amount = rawAmount == null ? null : new BigDecimal(rawAmount.toString());
            String currency = rawCurrency == null ? null : rawCurrency.toString();
            return MobileMoneyBalanceResult.ok(providerId(), label(), amount, currency);
        } catch (RestClientResponseException exception) {
            return MobileMoneyBalanceResult.error(providerId(), label(),
                    "MTN MoMo balance check failed: HTTP " + exception.getStatusCode().value());
        } catch (RestClientException | NumberFormatException exception) {
            return MobileMoneyBalanceResult.error(providerId(), label(),
                    "MTN MoMo balance check could not be completed.");
        }
    }

    @Override
    public boolean isConfigured() {
        return credentials(ProviderCredentialService.PLATFORM_SCOPE).configured();
    }

    @Override
    public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
        Credentials credentials = credentials(request.tenantId());
        assertConfigured(credentials);
        String providerReference = UUID.randomUUID().toString();
        String token = collectionToken(credentials);
        try {
            // Payment initiation is not idempotent: circuit-break only (never retry) so a repeated
            // provider failure fails fast instead of risking a double charge.
            resilience.protect(CIRCUIT, () -> restClient.post()
                    .uri("/collection/v1_0/requesttopay")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + token)
                    .header("X-Reference-Id", providerReference)
                    .header("X-Target-Environment", credentials.targetEnvironment())
                    .header("Ocp-Apim-Subscription-Key", credentials.subscriptionKey())
                    .body(new RequestToPayPayload(
                            request.amount().toPlainString(),
                            providerCurrency(request.currencyCode(), credentials.targetEnvironment()),
                            request.externalReference(),
                            new Payer(PARTY_ID_TYPE_MSISDN, msisdn(request.payerPhone())),
                            "Tereka Online " + request.purpose().replace('_', ' '),
                            request.tenantId() + " " + request.memberIdentifier()))
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
        Credentials credentials = credentials(request.getTenantId());
        assertConfigured(credentials);
        if (request.getProviderReference() == null || request.getProviderReference().isBlank()) {
            throw new MobileMoneyProviderException("MTN MoMo payment request has no provider reference.");
        }
        String token = collectionToken(credentials);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = resilience.protectIdempotent(CIRCUIT, () -> restClient.get()
                    .uri("/collection/v1_0/requesttopay/{reference}", request.getProviderReference())
                    .header("Authorization", "Bearer " + token)
                    .header("X-Target-Environment", credentials.targetEnvironment())
                    .header("Ocp-Apim-Subscription-Key", credentials.subscriptionKey())
                    .retrieve()
                    .body(Map.class));
            return mapProviderStatus(request, body);
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("MTN MoMo status check failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("MTN MoMo status check could not be completed.", exception);
        }
    }

    private String collectionToken(Credentials credentials) {
        assertConfigured(credentials);
        String basicToken = Base64.getEncoder()
                .encodeToString((credentials.apiUserId() + ":" + credentials.apiKey()).getBytes(StandardCharsets.UTF_8));
        Map<String, Object> body;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = resilience.protectIdempotent(CIRCUIT, () -> restClient.post()
                    .uri("/collection/token/")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Basic " + basicToken)
                    .header("Ocp-Apim-Subscription-Key", credentials.subscriptionKey())
                    .header("X-Target-Environment", credentials.targetEnvironment())
                    .body("")
                    .retrieve()
                    .body(Map.class));
            body = response;
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("MTN MoMo token request failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            log.warn("MTN MoMo token transport failed: {}", transportFailure(exception));
            throw new MobileMoneyProviderException("MTN MoMo token request could not be completed.", exception);
        }
        Object token = body == null ? null : body.get("access_token");
        if (token == null || token.toString().isBlank()) {
            throw new MobileMoneyProviderException("MTN MoMo did not return an access token.");
        }
        return token.toString();
    }

    private String transportFailure(Throwable failure) {
        Throwable cause = failure;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        String message = cause.getMessage();
        return cause.getClass().getSimpleName() + (message == null || message.isBlank() ? "" : ": " + message);
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

    private void assertConfigured(Credentials credentials) {
        if (!credentials.configured()) {
            throw new MobileMoneyProviderException("MTN MoMo provider is not fully configured.");
        }
    }

    private Credentials credentials(String scopeId) {
        return new Credentials(
                setting(scopeId, "subscription_key", subscriptionKey),
                setting(scopeId, "api_user_id", apiUserId),
                setting(scopeId, "api_key", apiKey),
                setting(scopeId, "target_environment", targetEnvironment));
    }

    private String setting(String scopeId, String key, String envValue) {
        String stored = credentialService.resolve(scopeId, providerId(), key);
        return stored != null ? stored : envValue;
    }

    private record Credentials(String subscriptionKey, String apiUserId, String apiKey, String targetEnvironment) {
        boolean configured() {
            return subscriptionKey != null && !subscriptionKey.isBlank()
                    && apiUserId != null && !apiUserId.isBlank()
                    && apiKey != null && !apiKey.isBlank()
                    && targetEnvironment != null && !targetEnvironment.isBlank();
        }
    }

    private String msisdn(String phone) {
        return phone == null ? "" : phone.replace("+", "").replace(" ", "").trim();
    }

    private String providerCurrency(String currencyCode, String environment) {
        return SANDBOX_ENVIRONMENT.equalsIgnoreCase(environment) ? SANDBOX_CURRENCY : currencyCode;
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://sandbox.momodeveloper.mtn.com";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private record RequestToPayPayload(
            String amount,
            String currency,
            String externalId,
            Payer payer,
            String payerMessage,
            String payeeNote) {
    }

    private record Payer(String partyIdType, String partyId) {
    }
}
