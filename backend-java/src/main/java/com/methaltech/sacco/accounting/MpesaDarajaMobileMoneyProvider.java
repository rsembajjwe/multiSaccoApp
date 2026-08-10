package com.methaltech.sacco.accounting;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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
class MpesaDarajaMobileMoneyProvider implements MobileMoneyProvider {

    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String CIRCUIT = "mpesa_daraja";

    private final RestClient restClient;
    private final ProviderResilience resilience;
    private final String baseUrl;
    private final String consumerKey;
    private final String consumerSecret;
    private final String businessShortCode;
    private final String passkey;
    private final String callbackUrl;
    private final String transactionType;
    private final String partyB;
    private final String tokenPath;
    private final String stkPushPath;
    private final String stkQueryPath;

    MpesaDarajaMobileMoneyProvider(
            RestClient.Builder restClientBuilder,
            ProviderResilience resilience,
            @Value("${sacco.integrations.mobile-money.mpesa.base-url:https://sandbox.safaricom.co.ke}") String baseUrl,
            @Value("${sacco.integrations.mobile-money.mpesa.consumer-key:}") String consumerKey,
            @Value("${sacco.integrations.mobile-money.mpesa.consumer-secret:}") String consumerSecret,
            @Value("${sacco.integrations.mobile-money.mpesa.business-short-code:}") String businessShortCode,
            @Value("${sacco.integrations.mobile-money.mpesa.passkey:}") String passkey,
            @Value("${sacco.integrations.mobile-money.mpesa.callback-url:}") String callbackUrl,
            @Value("${sacco.integrations.mobile-money.mpesa.transaction-type:CustomerPayBillOnline}") String transactionType,
            @Value("${sacco.integrations.mobile-money.mpesa.party-b:}") String partyB,
            @Value("${sacco.integrations.mobile-money.mpesa.token-path:/oauth/v1/generate?grant_type=client_credentials}") String tokenPath,
            @Value("${sacco.integrations.mobile-money.mpesa.stk-push-path:/mpesa/stkpush/v1/processrequest}") String stkPushPath,
            @Value("${sacco.integrations.mobile-money.mpesa.stk-query-path:/mpesa/stkpushquery/v1/query}") String stkQueryPath) {
        this.resilience = resilience;
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
        this.businessShortCode = businessShortCode;
        this.passkey = passkey;
        this.callbackUrl = callbackUrl;
        this.transactionType = transactionType;
        this.partyB = partyB == null || partyB.isBlank() ? businessShortCode : partyB;
        this.tokenPath = ensureLeadingSlash(tokenPath);
        this.stkPushPath = ensureLeadingSlash(stkPushPath);
        this.stkQueryPath = ensureLeadingSlash(stkQueryPath);
        this.restClient = restClientBuilder.baseUrl(this.baseUrl).build();
    }

    @Override
    public String providerId() {
        return "mpesa_daraja";
    }

    @Override
    public boolean isConfigured() {
        return consumerKey != null && !consumerKey.isBlank()
                && consumerSecret != null && !consumerSecret.isBlank()
                && businessShortCode != null && !businessShortCode.isBlank()
                && passkey != null && !passkey.isBlank()
                && callbackUrl != null && !callbackUrl.isBlank()
                && partyB != null && !partyB.isBlank();
    }

    @Override
    public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
        assertConfigured();
        String timestamp = darajaTimestamp();
        String password = stkPassword(timestamp);
        String accountReference = accountReference(request);
        String token = accessToken();
        Map<String, Object> response;
        try {
            // STK Push initiates a charge and is not idempotent: circuit-break only (never retry).
            @SuppressWarnings("unchecked")
            Map<String, Object> body = resilience.protect(CIRCUIT, () -> restClient.post()
                    .uri(stkPushPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + token)
                    .body(Map.ofEntries(
                            Map.entry("BusinessShortCode", businessShortCode),
                            Map.entry("Password", password),
                            Map.entry("Timestamp", timestamp),
                            Map.entry("TransactionType", transactionType),
                            Map.entry("Amount", request.amount().toBigInteger().toString()),
                            Map.entry("PartyA", msisdn(request.payerPhone())),
                            Map.entry("PartyB", partyB),
                            Map.entry("PhoneNumber", msisdn(request.payerPhone())),
                            Map.entry("CallBackURL", callbackUrl),
                            Map.entry("AccountReference", accountReference),
                            Map.entry("TransactionDesc", "Tereka Online " + request.purpose().replace('_', ' '))))
                    .retrieve()
                    .body(Map.class));
            response = body;
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("M-PESA Daraja rejected the STK Push request: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("M-PESA Daraja STK Push request could not be completed.", exception);
        }
        String providerReference = value(response, "CheckoutRequestID");
        if (providerReference.isBlank()) providerReference = UUID.randomUUID().toString();
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
                "M-PESA STK Push request accepted. Posting waits for the provider callback.",
                "Enter your M-PESA PIN on the member phone to approve payment.",
                true,
                Instant.now());
    }

    @Override
    public MobileMoneyProviderStatusResult queryPaymentStatus(MobileMoneyPaymentRequestEntity request) {
        assertConfigured();
        if (request.getProviderReference() == null || request.getProviderReference().isBlank()) {
            throw new MobileMoneyProviderException("M-PESA Daraja payment request has no checkout reference.");
        }
        String timestamp = darajaTimestamp();
        String token = accessToken();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = resilience.protectIdempotent(CIRCUIT, () -> restClient.post()
                    .uri(stkQueryPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + token)
                    .body(Map.of(
                            "BusinessShortCode", businessShortCode,
                            "Password", stkPassword(timestamp),
                            "Timestamp", timestamp,
                            "CheckoutRequestID", request.getProviderReference()))
                    .retrieve()
                    .body(Map.class));
            return mapProviderStatus(request, body);
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("M-PESA Daraja STK status check failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("M-PESA Daraja STK status check could not be completed.", exception);
        }
    }

    private String accessToken() {
        assertConfigured();
        String basicToken = Base64.getEncoder()
                .encodeToString((consumerKey + ":" + consumerSecret).getBytes(StandardCharsets.UTF_8));
        Map<String, Object> body;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = resilience.protectIdempotent(CIRCUIT, () -> restClient.get()
                    .uri(tokenPath)
                    .header("Authorization", "Basic " + basicToken)
                    .retrieve()
                    .body(Map.class));
            body = response;
        } catch (RestClientResponseException exception) {
            throw new MobileMoneyProviderException("M-PESA Daraja token request failed: HTTP " + exception.getStatusCode().value(), exception);
        } catch (RestClientException exception) {
            throw new MobileMoneyProviderException("M-PESA Daraja token request could not be completed.", exception);
        }
        String token = value(body, "access_token");
        if (token.isBlank()) {
            throw new MobileMoneyProviderException("M-PESA Daraja did not return an access token.");
        }
        return token;
    }

    private MobileMoneyProviderStatusResult mapProviderStatus(MobileMoneyPaymentRequestEntity request, Map<String, Object> body) {
        String resultCode = value(body, "ResultCode");
        String resultDescription = value(body, "ResultDesc");
        Instant now = Instant.now();
        if ("0".equals(resultCode)) {
            return new MobileMoneyProviderStatusResult(
                    "paid_pending_callback",
                    "M-PESA confirms successful payment. Awaiting verified callback posting.",
                    request.getProviderReference(),
                    resultCode,
                    true,
                    now);
        }
        if (!resultCode.isBlank()) {
            return new MobileMoneyProviderStatusResult(
                    "failed",
                    resultDescription.isBlank() ? "M-PESA returned result code " + resultCode + "." : resultDescription,
                    request.getProviderReference(),
                    resultCode,
                    false,
                    now);
        }
        String responseCode = value(body, "ResponseCode");
        return new MobileMoneyProviderStatusResult(
                "pending_provider_confirmation",
                "M-PESA STK Push is waiting for customer confirmation.",
                request.getProviderReference(),
                responseCode.isBlank() ? "PENDING" : responseCode,
                true,
                now);
    }

    private void assertConfigured() {
        if (consumerKey == null || consumerKey.isBlank()
                || consumerSecret == null || consumerSecret.isBlank()
                || businessShortCode == null || businessShortCode.isBlank()
                || passkey == null || passkey.isBlank()
                || callbackUrl == null || callbackUrl.isBlank()
                || partyB == null || partyB.isBlank()) {
            throw new MobileMoneyProviderException("M-PESA Daraja provider is not fully configured.");
        }
    }

    private String stkPassword(String timestamp) {
        return Base64.getEncoder()
                .encodeToString((businessShortCode + passkey + timestamp).getBytes(StandardCharsets.UTF_8));
    }

    private String darajaTimestamp() {
        return LocalDateTime.now(ZoneId.of("Africa/Nairobi")).format(TIMESTAMP_FORMAT);
    }

    private String accountReference(MobileMoneyPaymentRequest request) {
        String reference = request.externalReference() == null || request.externalReference().isBlank()
                ? request.tenantId()
                : request.externalReference();
        return reference.length() > 12 ? reference.substring(0, 12) : reference;
    }

    private String msisdn(String phone) {
        String digits = phone == null ? "" : phone.replace("+", "").replace(" ", "").trim();
        if (digits.startsWith("0") && digits.length() == 10) return "254" + digits.substring(1);
        if (digits.startsWith("7") && digits.length() == 9) return "254" + digits;
        return digits;
    }

    private String value(Map<String, Object> body, String key) {
        Object value = body == null ? null : body.get(key);
        return value == null ? "" : value.toString();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://sandbox.safaricom.co.ke";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String ensureLeadingSlash(String value) {
        if (value == null || value.isBlank()) return "/";
        return value.startsWith("/") ? value : "/" + value;
    }
}
