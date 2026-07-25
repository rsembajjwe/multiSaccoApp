package com.methaltech.sacco.accounting;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
@Primary
@ConditionalOnProperty(name = "sacco.providers.mobile-money", havingValue = "airtel_money")
class AirtelMoneyMobileMoneyProvider implements MobileMoneyProvider {

    private final RestClient restClient;
    private final String baseUrl;
    private final String clientId;
    private final String clientSecret;
    private final String countryCode;
    private final String tokenPath;
    private final String paymentPath;
    private final String statusPath;

    AirtelMoneyMobileMoneyProvider(
            RestClient.Builder restClientBuilder,
            @Value("${sacco.integrations.mobile-money.airtel.base-url:https://openapi.airtel.africa}") String baseUrl,
            @Value("${sacco.integrations.mobile-money.airtel.client-id:}") String clientId,
            @Value("${sacco.integrations.mobile-money.airtel.client-secret:}") String clientSecret,
            @Value("${sacco.integrations.mobile-money.airtel.country-code:UG}") String countryCode,
            @Value("${sacco.integrations.mobile-money.airtel.token-path:/auth/oauth2/token}") String tokenPath,
            @Value("${sacco.integrations.mobile-money.airtel.payment-path:/merchant/v1/payments/}") String paymentPath,
            @Value("${sacco.integrations.mobile-money.airtel.status-path:/standard/v1/payments/{transactionId}}") String statusPath) {
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.countryCode = countryCode;
        this.tokenPath = ensureLeadingSlash(tokenPath);
        this.paymentPath = ensureLeadingSlash(paymentPath);
        this.statusPath = ensureLeadingSlash(statusPath);
        this.restClient = restClientBuilder.baseUrl(this.baseUrl).build();
    }

    @Override
    public String providerId() {
        return "airtel_money";
    }

    @Override
    public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
        assertConfigured();
        String providerReference = UUID.randomUUID().toString();
        String token = accessToken();
        try {
            restClient.post()
                    .uri(paymentPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + token)
                    .header("X-Country", country())
                    .header("X-Currency", currency(request.currencyCode()))
                    .body(Map.of(
                            "reference", request.externalReference(),
                            "subscriber", Map.of(
                                    "country", country(),
                                    "currency", currency(request.currencyCode()),
                                    "msisdn", msisdn(request.payerPhone())),
                            "transaction", Map.of(
                                    "amount", request.amount().toPlainString(),
                                    "country", country(),
                                    "currency", currency(request.currencyCode()),
                                    "id", providerReference)))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("Airtel Money rejected the payment request: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("Airtel Money payment request could not be completed.", exception);
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
                "Airtel Money payment request accepted. Posting waits for the provider callback.",
                "Approve the Airtel Money prompt on the member phone.",
                true,
                Instant.now());
    }

    @Override
    public MobileMoneyProviderStatusResult queryPaymentStatus(MobileMoneyPaymentRequestEntity request) {
        assertConfigured();
        if (request.getProviderReference() == null || request.getProviderReference().isBlank()) {
            throw new MobileMoneyProviderException("Airtel Money payment request has no provider reference.");
        }
        String token = accessToken();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restClient.get()
                    .uri(statusPath, request.getProviderReference())
                    .header("Authorization", "Bearer " + token)
                    .header("X-Country", country())
                    .header("X-Currency", currency(request.getCurrencyCode()))
                    .retrieve()
                    .body(Map.class);
            return mapProviderStatus(request, body);
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("Airtel Money status check failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("Airtel Money status check could not be completed.", exception);
        }
    }

    private String accessToken() {
        assertConfigured();
        Map<String, Object> body;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(tokenPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "client_id", clientId,
                            "client_secret", clientSecret,
                            "grant_type", "client_credentials"))
                    .retrieve()
                    .body(Map.class);
            body = response;
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("Airtel Money token request failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("Airtel Money token request could not be completed.", exception);
        }
        Object token = body == null ? null : body.get("access_token");
        if (token == null || token.toString().isBlank()) {
            throw new MobileMoneyProviderException("Airtel Money did not return an access token.");
        }
        return token.toString();
    }

    private MobileMoneyProviderStatusResult mapProviderStatus(MobileMoneyPaymentRequestEntity request, Map<String, Object> body) {
        String providerStatus = providerStatus(body);
        String normalized = providerStatus.trim().toUpperCase(Locale.ROOT);
        Instant now = Instant.now();
        return switch (normalized) {
            case "TS", "SUCCESS", "SUCCESSFUL", "COMPLETED" -> new MobileMoneyProviderStatusResult(
                    "paid_pending_callback",
                    "Airtel Money confirms successful payment. Awaiting verified callback posting.",
                    request.getProviderReference(),
                    providerStatus,
                    true,
                    now);
            case "TF", "FAILED", "REJECTED", "DECLINED" -> new MobileMoneyProviderStatusResult(
                    "failed",
                    "Airtel Money returned " + providerStatus + ".",
                    request.getProviderReference(),
                    providerStatus,
                    false,
                    now);
            case "TIP", "PENDING", "IN_PROGRESS", "PROCESSING" -> new MobileMoneyProviderStatusResult(
                    "pending_provider_confirmation",
                    "Airtel Money payment is still waiting for confirmation.",
                    request.getProviderReference(),
                    providerStatus,
                    true,
                    now);
            default -> new MobileMoneyProviderStatusResult(
                    "provider_unknown",
                    "Airtel Money returned status " + providerStatus + ".",
                    request.getProviderReference(),
                    providerStatus,
                    true,
                    now);
        };
    }

    @SuppressWarnings("unchecked")
    private String providerStatus(Map<String, Object> body) {
        Object status = body == null ? null : body.get("status");
        if (status == null && body != null && body.get("data") instanceof Map<?, ?> data) {
            Object transaction = data.get("transaction");
            if (transaction instanceof Map<?, ?> transactionMap) {
                status = transactionMap.get("status");
            }
            if (status == null) status = data.get("status");
        }
        return status == null || status.toString().isBlank() ? "UNKNOWN" : status.toString();
    }

    private void assertConfigured() {
        if (clientId == null || clientId.isBlank()
                || clientSecret == null || clientSecret.isBlank()
                || countryCode == null || countryCode.isBlank()) {
            throw new MobileMoneyProviderException("Airtel Money provider is not fully configured.");
        }
    }

    private String country() {
        return countryCode.trim().toUpperCase(Locale.ROOT);
    }

    private String currency(String value) {
        return value == null || value.isBlank() ? "UGX" : value.trim().toUpperCase(Locale.ROOT);
    }

    private String msisdn(String phone) {
        return phone == null ? "" : phone.replace("+", "").replace(" ", "").trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://openapi.airtel.africa";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String ensureLeadingSlash(String value) {
        if (value == null || value.isBlank()) return "/";
        return value.startsWith("/") ? value : "/" + value;
    }
}
