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
        IntegrationProviderReadinessValidator validator = validator(false, "", "gmail_smtp", " ");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_SMS_PROVIDER"));
        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER"));
    }

    @Test
    void productionAllowsAfroSmsGmailAndMtnMomoProviders() {
        IntegrationProviderReadinessValidator validator = validator(false, "afrosms", "gmail_smtp", "mtn_momo");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsUnsupportedSmsAdapter() {
        IntegrationProviderReadinessValidator validator = validator(false, "africas_talking", "gmail_smtp", "mtn_momo");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_SMS_PROVIDER=afrosms"));
    }

    @Test
    void productionRejectsUnsupportedEmailAdapter() {
        IntegrationProviderReadinessValidator validator = validator(false, "afrosms", "smtp", "mtn_momo");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_EMAIL_PROVIDER=gmail_smtp"));
    }

    @Test
    void productionRejectsAfroSmsWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = validator(
                false,
                "afrosms",
                "gmail_smtp",
                "mtn_momo",
                "",
                "",
                "",
                "tereka.online@gmail.com",
                "gmail-password",
                "no-reply@tereka.online");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_AFROSMS_EMAIL"));
        assertTrue(error.getMessage().contains("SACCO_AFROSMS_PASSWORD"));
        assertTrue(error.getMessage().contains("SACCO_AFROSMS_SOURCE"));
    }

    @Test
    void productionRejectsGmailSmtpWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = validator(
                false,
                "afrosms",
                "gmail_smtp",
                "mtn_momo",
                "sms@example.com",
                "sms-password",
                "Tereka",
                "",
                "",
                "");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_GMAIL_SMTP_USERNAME"));
        assertTrue(error.getMessage().contains("SACCO_GMAIL_SMTP_PASSWORD"));
        assertTrue(error.getMessage().contains("SACCO_GMAIL_FROM_ADDRESS"));
    }

    @Test
    void productionRejectsUnsupportedMobileMoneyAdapter() {
        IntegrationProviderReadinessValidator validator = validator(false, "afrosms", "gmail_smtp", "unsupported_money");

        IllegalStateException error = assertThrows(IllegalStateException.class, validator::validate);

        assertTrue(error.getMessage().contains("SACCO_MOBILE_MONEY_PROVIDER=mtn_momo, airtel_money, or mpesa_daraja"));
    }

    @Test
    void productionAllowsAirtelMoneyProvider() {
        IntegrationProviderReadinessValidator validator = validator(false, "afrosms", "gmail_smtp", "airtel_money");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsAirtelMoneyWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "afrosms",
                "gmail_smtp",
                "airtel_money",
                "sms@example.com",
                "sms-password",
                "Tereka",
                "tereka.online@gmail.com",
                "gmail-password",
                "no-reply@tereka.online",
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
        IntegrationProviderReadinessValidator validator = validator(false, "afrosms", "gmail_smtp", "mpesa_daraja");

        assertDoesNotThrow(validator::validate);
    }

    @Test
    void productionRejectsMpesaDarajaWithoutCredentials() {
        IntegrationProviderReadinessValidator validator = new IntegrationProviderReadinessValidator(
                false,
                "afrosms",
                "gmail_smtp",
                "mpesa_daraja",
                "sms@example.com",
                "sms-password",
                "Tereka",
                "tereka.online@gmail.com",
                "gmail-password",
                "no-reply@tereka.online",
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
                "afrosms",
                "gmail_smtp",
                "mtn_momo",
                "sms@example.com",
                "sms-password",
                "Tereka",
                "tereka.online@gmail.com",
                "gmail-password",
                "no-reply@tereka.online",
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
        return validator(
                demoLoginsEnabled,
                smsProvider,
                emailProvider,
                mobileMoneyProvider,
                "sms@example.com",
                "sms-password",
                "Tereka",
                "tereka.online@gmail.com",
                "gmail-password",
                "no-reply@tereka.online");
    }

    private IntegrationProviderReadinessValidator validator(
            boolean demoLoginsEnabled,
            String smsProvider,
            String emailProvider,
            String mobileMoneyProvider,
            String afroSmsEmail,
            String afroSmsPassword,
            String afroSmsSource,
            String gmailUsername,
            String gmailPassword,
            String gmailFromAddress) {
        return new IntegrationProviderReadinessValidator(
                demoLoginsEnabled,
                smsProvider,
                emailProvider,
                mobileMoneyProvider,
                afroSmsEmail,
                afroSmsPassword,
                afroSmsSource,
                gmailUsername,
                gmailPassword,
                gmailFromAddress,
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
