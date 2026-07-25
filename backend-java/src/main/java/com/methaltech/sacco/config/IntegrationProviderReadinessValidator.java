package com.methaltech.sacco.config;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
class IntegrationProviderReadinessValidator implements ApplicationRunner {

    private final boolean demoLoginsEnabled;
    private final Map<String, String> providers;
    private final Map<String, String> mtnMomoSettings;
    private final Map<String, String> airtelMoneySettings;

    IntegrationProviderReadinessValidator(
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${sacco.providers.sms:}") String smsProvider,
            @Value("${sacco.providers.email:}") String emailProvider,
            @Value("${sacco.providers.mobile-money:}") String mobileMoneyProvider,
            @Value("${sacco.integrations.mobile-money.mtn.subscription-key:}") String mtnSubscriptionKey,
            @Value("${sacco.integrations.mobile-money.mtn.api-user-id:}") String mtnApiUserId,
            @Value("${sacco.integrations.mobile-money.mtn.api-key:}") String mtnApiKey,
            @Value("${sacco.integrations.mobile-money.mtn.target-environment:}") String mtnTargetEnvironment,
            @Value("${sacco.integrations.mobile-money.airtel.client-id:}") String airtelClientId,
            @Value("${sacco.integrations.mobile-money.airtel.client-secret:}") String airtelClientSecret,
            @Value("${sacco.integrations.mobile-money.airtel.country-code:}") String airtelCountryCode) {
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.providers = new LinkedHashMap<>();
        this.providers.put("SACCO_SMS_PROVIDER", smsProvider);
        this.providers.put("SACCO_EMAIL_PROVIDER", emailProvider);
        this.providers.put("SACCO_MOBILE_MONEY_PROVIDER", mobileMoneyProvider);
        this.mtnMomoSettings = new LinkedHashMap<>();
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_SUBSCRIPTION_KEY", mtnSubscriptionKey);
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_API_USER_ID", mtnApiUserId);
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_API_KEY", mtnApiKey);
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_TARGET_ENVIRONMENT", mtnTargetEnvironment);
        this.airtelMoneySettings = new LinkedHashMap<>();
        this.airtelMoneySettings.put("SACCO_AIRTEL_MONEY_CLIENT_ID", airtelClientId);
        this.airtelMoneySettings.put("SACCO_AIRTEL_MONEY_CLIENT_SECRET", airtelClientSecret);
        this.airtelMoneySettings.put("SACCO_AIRTEL_MONEY_COUNTRY_CODE", airtelCountryCode);
    }

    @Override
    public void run(ApplicationArguments args) {
        validate();
    }

    void validate() {
        if (demoLoginsEnabled) {
            return;
        }
        String invalidProviders = providers.entrySet().stream()
                .filter((entry) -> isBlank(entry.getValue()) || entry.getValue().trim().toLowerCase().startsWith("demo_"))
                .map(Map.Entry::getKey)
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
        if (!invalidProviders.isBlank()) {
            throw new IllegalStateException(
                    "Production startup requires real integration provider configuration for: " + invalidProviders);
        }
        String mobileMoneyProvider = providers.get("SACCO_MOBILE_MONEY_PROVIDER");
        if (!"mtn_momo".equalsIgnoreCase(mobileMoneyProvider) && !"airtel_money".equalsIgnoreCase(mobileMoneyProvider)) {
            throw new IllegalStateException(
                    "Production startup requires an implemented mobile-money adapter: SACCO_MOBILE_MONEY_PROVIDER=mtn_momo or airtel_money");
        }
        if ("mtn_momo".equalsIgnoreCase(mobileMoneyProvider)) {
            String missingMtnSettings = mtnMomoSettings.entrySet().stream()
                    .filter((entry) -> isBlank(entry.getValue()))
                    .map(Map.Entry::getKey)
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("");
            if (!missingMtnSettings.isBlank()) {
                throw new IllegalStateException(
                        "Production startup requires MTN MoMo configuration for: " + missingMtnSettings);
            }
        }
        if ("airtel_money".equalsIgnoreCase(mobileMoneyProvider)) {
            String missingAirtelSettings = airtelMoneySettings.entrySet().stream()
                    .filter((entry) -> isBlank(entry.getValue()))
                    .map(Map.Entry::getKey)
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("");
            if (!missingAirtelSettings.isBlank()) {
                throw new IllegalStateException(
                        "Production startup requires Airtel Money configuration for: " + missingAirtelSettings);
            }
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
