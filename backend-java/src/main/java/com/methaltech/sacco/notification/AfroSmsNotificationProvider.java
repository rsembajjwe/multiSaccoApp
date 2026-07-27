package com.methaltech.sacco.notification;

import com.methaltech.sacco.member.Member;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
@ConditionalOnProperty(name = "sacco.providers.sms", havingValue = "afrosms")
class AfroSmsNotificationProvider implements NotificationProvider {

    private final RestClient restClient;
    private final String baseUrl;
    private final String sendPath;
    private final String apiKey;
    private final String senderId;
    private final String authHeader;
    private final String phoneField;
    private final String messageField;
    private final String senderField;

    AfroSmsNotificationProvider(
            RestClient.Builder restClientBuilder,
            @Value("${sacco.integrations.sms.afrosms.base-url:https://www.afrosms.ug}") String baseUrl,
            @Value("${sacco.integrations.sms.afrosms.send-path:/api/sms/send}") String sendPath,
            @Value("${sacco.integrations.sms.afrosms.api-key:}") String apiKey,
            @Value("${sacco.integrations.sms.afrosms.sender-id:Tereka}") String senderId,
            @Value("${sacco.integrations.sms.afrosms.auth-header:Authorization}") String authHeader,
            @Value("${sacco.integrations.sms.afrosms.phone-field:to}") String phoneField,
            @Value("${sacco.integrations.sms.afrosms.message-field:message}") String messageField,
            @Value("${sacco.integrations.sms.afrosms.sender-field:sender}") String senderField) {
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.sendPath = ensureLeadingSlash(sendPath);
        this.apiKey = apiKey;
        this.senderId = senderId;
        this.authHeader = authHeader;
        this.phoneField = phoneField;
        this.messageField = messageField;
        this.senderField = senderField;
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
        assertConfigured();
        String phone = recipient(member);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(phoneField, msisdn(phone));
        body.put(messageField, message);
        body.put(senderField, senderId);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restClient.post()
                    .uri(sendPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(authHeader, bearer(apiKey))
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            return NotificationSendResult.sent(providerReference(response), "AfroSMS accepted the SMS.");
        } catch (RestClientResponseException exception) {
            return NotificationSendResult.failed("AfroSMS rejected the SMS: HTTP " + exception.getStatusCode().value());
        } catch (RestClientException exception) {
            return NotificationSendResult.failed("AfroSMS SMS could not be sent.");
        }
    }

    private void assertConfigured() {
        if (apiKey == null || apiKey.isBlank()
                || senderId == null || senderId.isBlank()
                || authHeader == null || authHeader.isBlank()
                || phoneField == null || phoneField.isBlank()
                || messageField == null || messageField.isBlank()
                || senderField == null || senderField.isBlank()) {
            throw new NotificationProviderException("AfroSMS provider is not fully configured.");
        }
    }

    private String providerReference(Map<String, Object> response) {
        if (response == null) return null;
        for (String key : new String[]{"id", "messageId", "message_id", "reference", "transactionId"}) {
            Object value = response.get(key);
            if (value != null && !value.toString().isBlank()) return value.toString();
        }
        return null;
    }

    private String bearer(String value) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.toLowerCase().startsWith("bearer ") ? trimmed : "Bearer " + trimmed;
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
