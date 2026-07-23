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

    IntegrationProviderReadinessValidator(
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${sacco.providers.sms:}") String smsProvider,
            @Value("${sacco.providers.email:}") String emailProvider,
            @Value("${sacco.providers.mobile-money:}") String mobileMoneyProvider) {
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.providers = new LinkedHashMap<>();
        this.providers.put("SACCO_SMS_PROVIDER", smsProvider);
        this.providers.put("SACCO_EMAIL_PROVIDER", emailProvider);
        this.providers.put("SACCO_MOBILE_MONEY_PROVIDER", mobileMoneyProvider);
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
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
