package com.methaltech.sacco.config;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuthService;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-integrations")
class NotificationIntegrationConfigController {

    private final AuthService authService;
    private final String smsProvider;
    private final String emailProvider;
    private final String afroSmsEmail;
    private final String afroSmsPassword;
    private final String afroSmsSource;
    private final String gmailUsername;
    private final String gmailPassword;
    private final String gmailFromAddress;
    private final String gmailFromName;

    NotificationIntegrationConfigController(
            AuthService authService,
            @Value("${sacco.providers.sms:}") String smsProvider,
            @Value("${sacco.providers.email:}") String emailProvider,
            @Value("${sacco.integrations.sms.afrosms.email:}") String afroSmsEmail,
            @Value("${sacco.integrations.sms.afrosms.password:}") String afroSmsPassword,
            @Value("${sacco.integrations.sms.afrosms.source:}") String afroSmsSource,
            @Value("${spring.mail.username:}") String gmailUsername,
            @Value("${spring.mail.password:}") String gmailPassword,
            @Value("${sacco.integrations.email.gmail.from-address:}") String gmailFromAddress,
            @Value("${sacco.integrations.email.gmail.from-name:Tereka Online}") String gmailFromName) {
        this.authService = authService;
        this.smsProvider = smsProvider;
        this.emailProvider = emailProvider;
        this.afroSmsEmail = afroSmsEmail;
        this.afroSmsPassword = afroSmsPassword;
        this.afroSmsSource = afroSmsSource;
        this.gmailUsername = gmailUsername;
        this.gmailPassword = gmailPassword;
        this.gmailFromAddress = gmailFromAddress;
        this.gmailFromName = gmailFromName;
    }

    @GetMapping("/notification-config")
    ResponseEntity<?> notificationConfig(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_ONLY", "Only platform administrators can view notification integration configuration."));
        }
        if (!authService.hasPermission(currentSession.user(), "roles:create")) {
            return authService.permissionRequired("roles:create");
        }

        NotificationIntegrationConfigResponse response = new NotificationIntegrationConfigResponse(
                List.of(
                        new ProviderConfig(
                                "SMS",
                                "AfroSMS",
                                valueOrMissing(smsProvider),
                                "afrosms".equalsIgnoreCase(smsProvider),
                                settings(
                                        setting("SACCO_SMS_PROVIDER", smsProvider, false),
                                        setting("SACCO_AFROSMS_EMAIL", afroSmsEmail, false),
                                        setting("SACCO_AFROSMS_PASSWORD", afroSmsPassword, true),
                                        setting("SACCO_AFROSMS_SOURCE", afroSmsSource, false))),
                        new ProviderConfig(
                                "Email",
                                "Gmail SMTP",
                                valueOrMissing(emailProvider),
                                "gmail_smtp".equalsIgnoreCase(emailProvider),
                                settings(
                                        setting("SACCO_EMAIL_PROVIDER", emailProvider, false),
                                        setting("SACCO_GMAIL_SMTP_USERNAME", gmailUsername, false),
                                        setting("SACCO_GMAIL_SMTP_PASSWORD", gmailPassword, true),
                                        setting("SACCO_GMAIL_FROM_ADDRESS", gmailFromAddress, false),
                                        setting("SACCO_GMAIL_FROM_NAME", gmailFromName, false)))),
                Instant.now(),
                "Notification credentials are environment-backed. Update the server environment or secrets manager, then restart the backend.");
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    private List<ProviderSetting> settings(ProviderSetting... settings) {
        return List.of(settings);
    }

    private ProviderSetting setting(String key, String value, boolean secret) {
        boolean configured = value != null && !value.isBlank();
        return new ProviderSetting(key, configured, secret, secret ? null : valueOrMissing(value));
    }

    private String valueOrMissing(String value) {
        return value == null || value.isBlank() ? "Not configured" : value;
    }

    record NotificationIntegrationConfigResponse(
            List<ProviderConfig> providers,
            Instant checkedAt,
            String updatePolicy) {
    }

    record ProviderConfig(
            String channel,
            String provider,
            String activeProvider,
            boolean active,
            List<ProviderSetting> settings) {
    }

    record ProviderSetting(
            String key,
            boolean configured,
            boolean secret,
            String value) {
    }
}
