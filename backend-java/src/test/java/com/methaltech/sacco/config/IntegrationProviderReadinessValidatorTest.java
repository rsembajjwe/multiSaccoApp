package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class IntegrationProviderReadinessValidatorTest {

    @Test
    void demoModeAllowsDemoProviders() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                true,
                "demo_sms",
                "demo_email",
                "demo_mobile_money");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsDemoProviders() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "demo_sms",
                "real_email_gateway",
                "demo_mobile_money");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_SMS_PROVIDER"));
        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER"));
    }

    @Test
    void productionRejectsMissingProviders() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "",
                "real_email_gateway",
                " ");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_SMS_PROVIDER"));
        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER"));
    }

    @Test
    void productionAllowsRealProviders() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "africas_talking",
                "smtp",
                "mtn_momo");

        assertDoesNotThrow(validator::validate);
    }
}
