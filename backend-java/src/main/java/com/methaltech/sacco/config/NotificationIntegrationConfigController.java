package com.methaltech.sacco.config;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-integrations")
class NotificationIntegrationConfigController {

    private static final String MOBILE_MONEY_PROVIDER_GROUP = "mobile_money";
    private static final String MTN_PROVIDER = "mtn_momo";
    private static final String AIRTEL_PROVIDER = "airtel_money";
    private static final String DEMO_PROVIDER = "demo_mobile_money";
    private static final Set<String> SUPPORTED_MOBILE_MONEY_PROVIDERS = Set.of(
            MTN_PROVIDER,
            AIRTEL_PROVIDER,
            DEMO_PROVIDER);

    private final AuthService authService;
    private final ProviderCredentialService credentialService;
    private final AuditService auditService;
    private final String smsProvider;
    private final String emailProvider;
    private final String afroSmsEmail;
    private final String afroSmsPassword;
    private final String afroSmsSource;
    private final String gmailUsername;
    private final String gmailPassword;
    private final String gmailFromAddress;
    private final String gmailFromName;
    private final String mobileMoneyProvider;
    private final boolean signedCallbacksRequired;
    private final String callbackSecret;
    private final String mtnSubscriptionKey;
    private final String mtnApiUserId;
    private final String mtnApiKey;
    private final String mtnTargetEnvironment;
    private final String airtelClientId;
    private final String airtelClientSecret;
    private final String airtelCountryCode;

    NotificationIntegrationConfigController(
            AuthService authService,
            ProviderCredentialService credentialService,
            AuditService auditService,
            @Value("${sacco.providers.sms:}") String smsProvider,
            @Value("${sacco.providers.email:}") String emailProvider,
            @Value("${sacco.integrations.sms.afrosms.email:}") String afroSmsEmail,
            @Value("${sacco.integrations.sms.afrosms.password:}") String afroSmsPassword,
            @Value("${sacco.integrations.sms.afrosms.source:}") String afroSmsSource,
            @Value("${spring.mail.username:}") String gmailUsername,
            @Value("${spring.mail.password:}") String gmailPassword,
            @Value("${sacco.integrations.email.gmail.from-address:}") String gmailFromAddress,
            @Value("${sacco.integrations.email.gmail.from-name:Tereka Online}") String gmailFromName,
            @Value("${sacco.providers.mobile-money:}") String mobileMoneyProvider,
            @Value("${sacco.integrations.mobile-money.require-signed-callbacks:false}") boolean signedCallbacksRequired,
            @Value("${sacco.integrations.mobile-money.callback-secret:}") String callbackSecret,
            @Value("${sacco.integrations.mobile-money.mtn.subscription-key:}") String mtnSubscriptionKey,
            @Value("${sacco.integrations.mobile-money.mtn.api-user-id:}") String mtnApiUserId,
            @Value("${sacco.integrations.mobile-money.mtn.api-key:}") String mtnApiKey,
            @Value("${sacco.integrations.mobile-money.mtn.target-environment:}") String mtnTargetEnvironment,
            @Value("${sacco.integrations.mobile-money.airtel.client-id:}") String airtelClientId,
            @Value("${sacco.integrations.mobile-money.airtel.client-secret:}") String airtelClientSecret,
            @Value("${sacco.integrations.mobile-money.airtel.country-code:}") String airtelCountryCode) {
        this.authService = authService;
        this.credentialService = credentialService;
        this.auditService = auditService;
        this.smsProvider = smsProvider;
        this.emailProvider = emailProvider;
        this.afroSmsEmail = afroSmsEmail;
        this.afroSmsPassword = afroSmsPassword;
        this.afroSmsSource = afroSmsSource;
        this.gmailUsername = gmailUsername;
        this.gmailPassword = gmailPassword;
        this.gmailFromAddress = gmailFromAddress;
        this.gmailFromName = gmailFromName;
        this.mobileMoneyProvider = mobileMoneyProvider;
        this.signedCallbacksRequired = signedCallbacksRequired;
        this.callbackSecret = callbackSecret;
        this.mtnSubscriptionKey = mtnSubscriptionKey;
        this.mtnApiUserId = mtnApiUserId;
        this.mtnApiKey = mtnApiKey;
        this.mtnTargetEnvironment = mtnTargetEnvironment;
        this.airtelClientId = airtelClientId;
        this.airtelClientSecret = airtelClientSecret;
        this.airtelCountryCode = airtelCountryCode;
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

    @GetMapping("/mobile-money-config")
    ResponseEntity<?> mobileMoneyConfig(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_ONLY", "Only platform administrators can view mobile-money integration configuration."));
        }
        if (!authService.hasPermission(currentSession.user(), "roles:create")) {
            return authService.permissionRequired("roles:create");
        }

        return ResponseEntity.ok(ApiResponse.of(
                mobileMoneyConfigResponse(ProviderCredentialService.PLATFORM_SCOPE)));
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

    /** Store value at [scope], else platform, else the environment default. */
    private String effective(String scopeId, String provider, String key, String envDefault) {
        String stored = credentialService.resolve(scopeId, provider, key);
        return stored != null ? stored : envDefault;
    }

    private NotificationIntegrationConfigResponse mobileMoneyConfigResponse(String scopeId) {
        String provider = effective(scopeId, MOBILE_MONEY_PROVIDER_GROUP, "active_provider", mobileMoneyProvider);
        String cbSecret = effective(scopeId, MOBILE_MONEY_PROVIDER_GROUP, "callback_secret", callbackSecret);
        String signed = effective(scopeId, MOBILE_MONEY_PROVIDER_GROUP, "require_signed_callbacks",
                String.valueOf(signedCallbacksRequired));
        String mtnSub = effective(scopeId, MTN_PROVIDER, "subscription_key", mtnSubscriptionKey);
        String mtnUser = effective(scopeId, MTN_PROVIDER, "api_user_id", mtnApiUserId);
        String mtnKey = effective(scopeId, MTN_PROVIDER, "api_key", mtnApiKey);
        String mtnEnv = effective(scopeId, MTN_PROVIDER, "target_environment", mtnTargetEnvironment);
        String airId = effective(scopeId, AIRTEL_PROVIDER, "client_id", airtelClientId);
        String airSecret = effective(scopeId, AIRTEL_PROVIDER, "client_secret", airtelClientSecret);
        String airCountry = effective(scopeId, AIRTEL_PROVIDER, "country_code", airtelCountryCode);
        return new NotificationIntegrationConfigResponse(
                List.of(
                        new ProviderConfig(
                                "Mobile money",
                                "MTN MoMo",
                                valueOrMissing(provider),
                                MTN_PROVIDER.equalsIgnoreCase(provider),
                                settings(
                                        setting("SACCO_MOBILE_MONEY_PROVIDER", provider, false),
                                        setting("SACCO_MTN_MOMO_SUBSCRIPTION_KEY", mtnSub, true),
                                        setting("SACCO_MTN_MOMO_API_USER_ID", mtnUser, false),
                                        setting("SACCO_MTN_MOMO_API_KEY", mtnKey, true),
                                        setting("SACCO_MTN_MOMO_TARGET_ENVIRONMENT", mtnEnv, false),
                                        setting("SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS", signed, false),
                                        setting("SACCO_MOBILE_MONEY_CALLBACK_SECRET", cbSecret, true))),
                        new ProviderConfig(
                                "Mobile money",
                                "Airtel Money",
                                valueOrMissing(provider),
                                AIRTEL_PROVIDER.equalsIgnoreCase(provider),
                                settings(
                                        setting("SACCO_MOBILE_MONEY_PROVIDER", provider, false),
                                        setting("SACCO_AIRTEL_MONEY_CLIENT_ID", airId, false),
                                        setting("SACCO_AIRTEL_MONEY_CLIENT_SECRET", airSecret, true),
                                        setting("SACCO_AIRTEL_MONEY_COUNTRY_CODE", airCountry, false),
                                        setting("SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS", signed, false),
                                        setting("SACCO_MOBILE_MONEY_CALLBACK_SECRET", cbSecret, true)))),
                Instant.now(),
                "Mobile-money credentials are stored securely (secrets encrypted). "
                        + "Platform keys apply to every SACCO unless a SACCO sets its own.");
    }

    void applyMobileMoneyConfig(String scope, SaveMobileMoneyConfigRequest body, String uid) {
        String activeProvider = normalizedProvider(body.activeProvider());
        if (activeProvider != null) {
            credentialService.save(scope, MOBILE_MONEY_PROVIDER_GROUP, "active_provider",
                    activeProvider, false, uid);
        }
        if (body.requireSignedCallbacks() != null) {
            credentialService.save(scope, MOBILE_MONEY_PROVIDER_GROUP, "require_signed_callbacks",
                    String.valueOf(body.requireSignedCallbacks()), false, uid);
        }
        saveSecret(scope, MOBILE_MONEY_PROVIDER_GROUP, "callback_secret", body.callbackSecret(), uid);
        saveSecret(scope, MTN_PROVIDER, "subscription_key", body.mtnSubscriptionKey(), uid);
        savePlain(scope, MTN_PROVIDER, "api_user_id", body.mtnApiUserId(), uid);
        saveSecret(scope, MTN_PROVIDER, "api_key", body.mtnApiKey(), uid);
        savePlain(scope, MTN_PROVIDER, "target_environment", normalizedOptional(body.mtnTargetEnvironment()), uid);
        savePlain(scope, AIRTEL_PROVIDER, "client_id", body.airtelClientId(), uid);
        saveSecret(scope, AIRTEL_PROVIDER, "client_secret", body.airtelClientSecret(), uid);
        savePlain(scope, AIRTEL_PROVIDER, "country_code", normalizedCountryCode(body.airtelCountryCode()), uid);
    }

    private void saveSecret(String scope, String provider, String key, String value, String uid) {
        if (value != null && !value.isBlank()) {
            credentialService.save(scope, provider, key, value.trim(), true, uid);
        }
    }

    private void savePlain(String scope, String provider, String key, String value, String uid) {
        if (value != null) {
            credentialService.save(scope, provider, key, value.trim(), false, uid);
        }
    }

    @PutMapping("/mobile-money-config")
    ResponseEntity<?> saveMobileMoneyConfig(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody SaveMobileMoneyConfigRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_ONLY",
                            "Only platform administrators can update mobile-money integration configuration."));
        }
        if (!authService.hasPermission(currentSession.user(), "roles:create")) {
            return authService.permissionRequired("roles:create");
        }
        if (body == null) {
            return invalidMobileMoneyConfig("Mobile-money configuration body is required.");
        }
        String scope = ProviderCredentialService.PLATFORM_SCOPE;
        ResponseEntity<ApiErrorResponse> validation = validateMobileMoneyConfig(scope, body);
        if (validation != null) {
            return validation;
        }
        applyMobileMoneyConfig(scope, body, currentSession.user().getId());
        auditService.record(
                currentSession.user().getTenantId(),
                currentSession.user(),
                "Updated platform mobile-money integration keys",
                "provider_credentials",
                scope,
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(mobileMoneyConfigResponse(scope)));
    }

    record SaveMobileMoneyConfigRequest(
            String activeProvider,
            Boolean requireSignedCallbacks,
            String callbackSecret,
            String mtnSubscriptionKey,
            String mtnApiUserId,
            String mtnApiKey,
            String mtnTargetEnvironment,
            String airtelClientId,
            String airtelClientSecret,
            String airtelCountryCode) {
    }

    private ResponseEntity<ApiErrorResponse> validateMobileMoneyConfig(String scope, SaveMobileMoneyConfigRequest body) {
        String activeProvider = normalizedProvider(body.activeProvider());
        if (body.activeProvider() != null && activeProvider == null) {
            return invalidMobileMoneyConfig("Active provider must be one of mtn_momo, airtel_money or demo_mobile_money.");
        }
        String mtnEnvironment = normalizedOptional(body.mtnTargetEnvironment());
        if (mtnEnvironment != null && !mtnEnvironment.matches("[a-z0-9_-]{2,40}")) {
            return invalidMobileMoneyConfig("MTN target environment must use 2-40 lowercase letters, digits, underscores or hyphens.");
        }
        String country = normalizedCountryCode(body.airtelCountryCode());
        if (body.airtelCountryCode() != null && country == null) {
            return invalidMobileMoneyConfig("Airtel country code must be a two-letter ISO country code.");
        }
        boolean signedCallbacks = body.requireSignedCallbacks() != null
                ? body.requireSignedCallbacks()
                : Boolean.parseBoolean(effective(scope, MOBILE_MONEY_PROVIDER_GROUP, "require_signed_callbacks",
                        String.valueOf(signedCallbacksRequired)));
        if (signedCallbacks && isBlank(candidateSecret(scope, MOBILE_MONEY_PROVIDER_GROUP, "callback_secret",
                callbackSecret, body.callbackSecret()))) {
            return invalidMobileMoneyConfig("Callback signing cannot be required until a callback secret is configured.");
        }
        if (MTN_PROVIDER.equals(activeProvider)) {
            if (isBlank(candidateSecret(scope, MTN_PROVIDER, "subscription_key", mtnSubscriptionKey, body.mtnSubscriptionKey()))
                    || isBlank(candidatePlain(scope, MTN_PROVIDER, "api_user_id", mtnApiUserId, body.mtnApiUserId()))
                    || isBlank(candidateSecret(scope, MTN_PROVIDER, "api_key", mtnApiKey, body.mtnApiKey()))
                    || isBlank(candidatePlain(scope, MTN_PROVIDER, "target_environment", mtnTargetEnvironment, body.mtnTargetEnvironment()))) {
                return invalidMobileMoneyConfig("MTN MoMo requires subscription key, API user ID, API key and target environment before activation.");
            }
        }
        if (AIRTEL_PROVIDER.equals(activeProvider)) {
            if (isBlank(candidatePlain(scope, AIRTEL_PROVIDER, "client_id", airtelClientId, body.airtelClientId()))
                    || isBlank(candidateSecret(scope, AIRTEL_PROVIDER, "client_secret", airtelClientSecret, body.airtelClientSecret()))
                    || isBlank(candidatePlain(scope, AIRTEL_PROVIDER, "country_code", airtelCountryCode, body.airtelCountryCode()))) {
                return invalidMobileMoneyConfig("Airtel Money requires client ID, client secret and country code before activation.");
            }
        }
        return null;
    }

    private String candidateSecret(String scope, String provider, String key, String envDefault, String requestValue) {
        return isBlank(requestValue) ? effective(scope, provider, key, envDefault) : requestValue.trim();
    }

    private String candidatePlain(String scope, String provider, String key, String envDefault, String requestValue) {
        return requestValue == null ? effective(scope, provider, key, envDefault) : requestValue.trim();
    }

    private ResponseEntity<ApiErrorResponse> invalidMobileMoneyConfig(String message) {
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(400, "INVALID_MOBILE_MONEY_CONFIG", message));
    }

    private String normalizedProvider(String value) {
        String normalized = normalizedOptional(value);
        if (normalized == null) return null;
        return SUPPORTED_MOBILE_MONEY_PROVIDERS.contains(normalized) ? normalized : null;
    }

    private String normalizedCountryCode(String value) {
        String normalized = normalizedOptional(value);
        if (normalized == null) return null;
        normalized = normalized.toUpperCase(Locale.ROOT);
        return normalized.matches("[A-Z]{2}") ? normalized : null;
    }

    private String normalizedOptional(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isBlank() ? "" : normalized.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
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
