package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class IntegrationProviderReadinessValidatorTest {

    @Test
    void demoModeAllowsDemoProviders() {
        IntegrationProviderReadinessValidator validator = validator(true, "demo_sms", "demo_email", "demo_mobile_money");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsDemoProviders() {
        IntegrationProviderReadinessValidator validator = validator(false, "demo_sms", "real_email_gateway", "demo_mobile_money");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_SMS_PROVIDER"));
        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER"));
    }

    @Test
    void productionRejectsMissingProviders() {
        IntegrationProviderReadinessValidator validator = validator(false, "", "real_email_gateway", " ");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_SMS_PROVIDER"));
        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER"));
    }

    @Test
    void productionAllowsMtnMomoProvider() {
        IntegrationProviderReadinessValidator validator = validator(false, "africas_talking", "smtp", "mtn_momo");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsUnsupportedMobileMoneyAdapter() {
        IntegrationProviderReadinessValidator validator = validator(false, "africas_talking", "smtp", "unsupported_money");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER=mtn_momo, airtel_money, or mpesa_daraja"));
    }

    @Test
    void productionAllowsAirtelMoneyProvider() {
        IntegrationProviderReadinessValidator validator = validator(false, "africas_talking", "smtp", "airtel_money");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsAirtelMoneyWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "africas_talking",
                "smtp",
                "airtel_money",
                "",
                "",
                "",
                "",
                "",
                "airtel-client-secret",
                "",
                "",
                "",
                "",
                "",
                "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_AIRTEL_MONEY_CLIENT_ID"));
        assertTrue(error.getMessage().contains("SACCO_AIRTEL_MONEY_COUNTRY_CODE"));
    }

    @Test
    void productionAllowsMpesaDarajaProvider() {
        IntegrationProviderReadinessValidator validator = validator(false, "africas_talking", "smtp", "mpesa_daraja");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsMpesaDarajaWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "africas_talking",
                "smtp",
                "mpesa_daraja",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "daraja-consumer-key",
                "",
                "174379",
                "",
                "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_MPESA_DARAJA_CONSUMER_SECRET"));
        assertTrue(error.getMessage().contains("SACCO_MPESA_DARAJA_PASSKEY"));
        assertTrue(error.getMessage().contains("SACCO_MPESA_DARAJA_CALLBACK_URL"));
    }

    @Test
    void productionRejectsMtnMomoWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "africas_talking",
                "smtp",
                "mtn_momo",
                "",
                "api_user_id",
                "",
                "mtnuganda",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_MTN_MOMO_SUBSCRIPTION_KEY"));
        assertTrue(error.getMessage().contains("SACCO_MTN_MOMO_API_KEY"));
    }

    private IntegrationProviderReadinessValidator validator(boolean demoLoginsEnabled, String smsProvider, String emailProvider, String mobileMoneyProvider) {
        return new IntegrationProviderReadinessValidator(
                demoLoginsEnabled,
                smsProvider,
                emailProvider,
                mobileMoneyProvider,
                "subscription_key",
                "api_user_id",
                "api_key",
                "mtnuganda",
                "airtel-client-id",
                "airtel-client-secret",
                "UG",
                "daraja-consumer-key",
                "daraja-consumer-secret",
                "174379",
                "daraja-passkey",
                "https://example.com/mpesa/callback");
    }
}
