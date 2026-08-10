package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ProductionSecretReadinessValidatorTest {

    @Test
    void demoModeAllowsLocalSecrets() {
        ProductionSecretReadinessValidator validator = new ProductionSecretReadinessValidator(
                true,
                "sacco_dev_password",
                "",
                false,
                "");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsPlaceholderDatabasePassword() {
        ProductionSecretReadinessValidator validator = new ProductionSecretReadinessValidator(
                false,
                "change_this_password",
                "strong_pii_encryption_key_2026_value",
                true,
                "strong_callback_secret_2026_value");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("POSTGRES_PASSWORD"));
    }

    @Test
    void productionRejectsUnsignedCallbacksAndWeakSecret() {
        ProductionSecretReadinessValidator validator = new ProductionSecretReadinessValidator(
                false,
                "strong_database_password_2026",
                "short",
                false,
                "short");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS"));
        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_CALLBACK_SECRET"));
        assertTrue(error.getMessage().contains("SACCO_PII_ENCRYPTION_KEY"));
    }

    @Test
    void productionAllowsStrongSecrets() {
        ProductionSecretReadinessValidator validator = new ProductionSecretReadinessValidator(
                false,
                "strong_database_password_2026",
                "strong_pii_encryption_key_2026_value",
                true,
                "strong_callback_secret_2026_value");

        assertDoesNotThrow(validator::validate);
    }
}
