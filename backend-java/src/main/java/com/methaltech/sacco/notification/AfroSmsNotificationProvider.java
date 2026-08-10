package com.methaltech.sacco.notification;

import com.methaltech.sacco.config.ProviderResilience;
import com.methaltech.sacco.member.Member;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
@ConditionalOnProperty(name = "sacco.providers.sms", havingValue = "afrosms")
class AfroSmsNotificationProvider implements NotificationProvider {

    private static final String CIRCUIT = "afrosms";

    private final RestClient restClient;
    private final ProviderResilience resilience;
    private final String baseUrl;
    private final String sendPath;
    private final String balancePath;
    private final String email;
    private final String password;
    private final String source;

    AfroSmsNotificationProvider(
            RestClient.Builder restClientBuilder,
            ProviderResilience resilience,
            @Value("${sacco.integrations.sms.afrosms.base-url:https://www.afrosms.ug}") String baseUrl,
            @Value("${sacco.integrations.sms.afrosms.send-path:/smskings/api.php}") String sendPath,
            @Value("${sacco.integrations.sms.afrosms.balance-path:/smskings/balance_api.php}") String balancePath,
            @Value("${sacco.integrations.sms.afrosms.email:}") String email,
            @Value("${sacco.integrations.sms.afrosms.password:}") String password,
            @Value("${sacco.integrations.sms.afrosms.source:Tereka}") String source) {
        this.resilience = resilience;
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.sendPath = ensureLeadingSlash(sendPath);
        this.balancePath = ensureLeadingSlash(balancePath);
        this.email = email;
        this.password = password;
        this.source = source;
        this.restClient = restClientBuilder.baseUrl(this.baseUrl).build();
    }

    @Override
    public String channel() {
        return "sms";
    }

    @Override
    public String providerId() {
        return "afrosms";
    }

    @Override
    public String recipient(Member member) {
        return member.getPhone();
    }

    @Override
    public NotificationSendResult send(Member member, String title, String message) {
        return sendTo(recipient(member), title, message);
    }

    @Override
    public NotificationSendResult sendTo(String recipient, String title, String message) {
        assertConfigured();
        try {
            // Sending an SMS is not safely repeatable: circuit-break only (never retry) to avoid
            // dispatching duplicate messages when the provider is flaky.
            String response = resilience.protect(CIRCUIT, () -> restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(sendPath)
                            .queryParam("email", email)
                            .queryParam("password", password)
                            .queryParam("destination", msisdn(recipient))
                            .queryParam("source", source)
                            .queryParam("message", message)
                            .queryParam("call", "sendsms")
                            .build())
                    .retrieve()
                    .body(String.class));
            return NotificationSendResult.sent(providerReference(response), "AfroSMS accepted the SMS.");
        } catch (RestClientResponseException exception) {
            return NotificationSendResult.failed("AfroSMS rejected the SMS: HTTP " + exception.getStatusCode().value());
        } catch (RestClientException exception) {
            return NotificationSendResult.failed("AfroSMS SMS could not be sent.");
        }
    }

    String balance() {
        try {
            return readBalance();
        } catch (RestClientException exception) {
            return "0";
        }
    }

    @Override
    public NotificationProviderStatusResponse status() {
        try {
            return NotificationProviderStatusResponse.ready(channel(), providerId(), readBalance(), "AfroSMS balance check completed.");
        } catch (RuntimeException exception) {
            return NotificationProviderStatusResponse.unavailable(channel(), providerId(), "AfroSMS status check failed.");
        }
    }

    private String readBalance() {
        assertConfigured();
        String response = resilience.protectIdempotent(CIRCUIT, () -> restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path(balancePath)
                        .queryParam("email", email)
                        .queryParam("password", password)
                        .queryParam("call", "credits")
                        .build())
                .retrieve()
                .body(String.class));
        if (response == null) return "0";
        String digits = response.replaceAll("[^0-9]", "");
        return digits.isBlank() ? "0" : digits;
    }

    private void assertConfigured() {
        if (email == null || email.isBlank()
                || password == null || password.isBlank()
                || source == null || source.isBlank()) {
            throw new NotificationProviderException("AfroSMS provider is not fully configured.");
        }
    }

    private String providerReference(String response) {
        if (response == null) return null;
        String trimmed = response.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String msisdn(String phone) {
        return phone == null ? "" : phone.replace("+", "").replace(" ", "").trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://www.afrosms.ug";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String ensureLeadingSlash(String value) {
        if (value == null || value.isBlank()) return "/";
        return value.startsWith("/") ? value : "/" + value;
    }
}
