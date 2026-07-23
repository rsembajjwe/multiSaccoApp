package com.methaltech.sacco.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
class ProductionSecretReadinessValidator implements ApplicationRunner {

    private static final Set<String> PLACEHOLDERS = Set.of(
            "sacco",
            "sacco_dev_password",
            "sacco_readiness_password",
            "sacco_check_password",
            "change_this_password",
            "change_this_callback_secret",
            "replace_with_a_unique_staging_password",
            "replace_with_a_unique_24_plus_character_password",
            "replace_with_strong_bootstrap_password",
            "password",
            "changeme",
            "change_me",
            "secret");

    private final boolean demoLoginsEnabled;
    private final String databasePassword;
    private final boolean signedCallbacksRequired;
    private final String callbackSecret;

    ProductionSecretReadinessValidator(
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${spring.datasource.password:}") String databasePassword,
            @Value("${sacco.integrations.mobile-money.require-signed-callbacks:false}") boolean signedCallbacksRequired,
            @Value("${sacco.integrations.mobile-money.callback-secret:}") String callbackSecret) {
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.databasePassword = databasePassword;
        this.signedCallbacksRequired = signedCallbacksRequired;
        this.callbackSecret = callbackSecret;
    }

    @Override
    public void run(ApplicationArguments args) {
        validate();
    }

    void validate() {
        if (demoLoginsEnabled) {
            return;
        }
        List<String> failures = new ArrayList<>();
        if (isWeakSecret(databasePassword, 16)) {
            failures.add("SPRING_DATASOURCE_PASSWORD/POSTGRES_PASSWORD");
        }
        if (!signedCallbacksRequired) {
            failures.add("SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS");
        }
        if (isWeakSecret(callbackSecret, 24)) {
            failures.add("SACCO_MOBILE_MONEY_CALLBACK_SECRET");
        }
        if (!failures.isEmpty()) {
            throw new IllegalStateException(
                    "Production startup requires strong non-placeholder secrets for: " + String.join(", ", failures));
        }
    }

    private boolean isWeakSecret(String value, int minimumLength) {
        String normalized = value == null ? "" : value.trim();
        String lower = normalized.toLowerCase(Locale.ROOT);
        return normalized.length() < minimumLength
                || PLACEHOLDERS.contains(lower)
                || lower.startsWith("replace_with_");
    }
}
