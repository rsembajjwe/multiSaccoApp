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
    private final Map<String, String> afroSmsSettings;
    private final Map<String, String> gmailSmtpSettings;
    private final Map<String, String> mtnMomoSettings;
    private final Map<String, String> airtelMoneySettings;
    private final Map<String, String> mpesaDarajaSettings;

    IntegrationProviderReadinessValidator(
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${sacco.providers.sms:}") String smsProvider,
            @Value("${sacco.providers.email:}") String emailProvider,
            @Value("${sacco.providers.mobile-money:}") String mobileMoneyProvider,
            @Value("${sacco.integrations.sms.afrosms.api-key:}") String afroSmsApiKey,
            @Value("${sacco.integrations.sms.afrosms.sender-id:}") String afroSmsSenderId,
            @Value("${spring.mail.username:}") String gmailUsername,
            @Value("${spring.mail.password:}") String gmailPassword,
            @Value("${sacco.integrations.email.gmail.from-address:}") String gmailFromAddress,
            @Value("${sacco.integrations.mobile-money.mtn.subscription-key:}") String mtnSubscriptionKey,
            @Value("${sacco.integrations.mobile-money.mtn.api-user-id:}") String mtnApiUserId,
            @Value("${sacco.integrations.mobile-money.mtn.api-key:}") String mtnApiKey,
            @Value("${sacco.integrations.mobile-money.mtn.target-environment:}") String mtnTargetEnvironment,
            @Value("${sacco.integrations.mobile-money.airtel.client-id:}") String airtelClientId,
            @Value("${sacco.integrations.mobile-money.airtel.client-secret:}") String airtelClientSecret,
            @Value("${sacco.integrations.mobile-money.airtel.country-code:}") String airtelCountryCode,
            @Value("${sacco.integrations.mobile-money.mpesa.consumer-key:}") String mpesaConsumerKey,
            @Value("${sacco.integrations.mobile-money.mpesa.consumer-secret:}") String mpesaConsumerSecret,
            @Value("${sacco.integrations.mobile-money.mpesa.business-short-code:}") String mpesaBusinessShortCode,
            @Value("${sacco.integrations.mobile-money.mpesa.passkey:}") String mpesaPasskey,
            @Value("${sacco.integrations.mobile-money.mpesa.callback-url:}") String mpesaCallbackUrl) {
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.providers = new LinkedHashMap<>();
        this.providers.put("SACCO_SMS_PROVIDER", smsProvider);
        this.providers.put("SACCO_EMAIL_PROVIDER", emailProvider);
        this.providers.put("SACCO_MOBILE_MONEY_PROVIDER", mobileMoneyProvider);
        this.afroSmsSettings = new LinkedHashMap<>();
        this.afroSmsSettings.put("SACCO_AFROSMS_API_KEY", afroSmsApiKey);
        this.afroSmsSettings.put("SACCO_AFROSMS_SENDER_ID", afroSmsSenderId);
        this.gmailSmtpSettings = new LinkedHashMap<>();
        this.gmailSmtpSettings.put("SACCO_GMAIL_SMTP_USERNAME", gmailUsername);
        this.gmailSmtpSettings.put("SACCO_GMAIL_SMTP_PASSWORD", gmailPassword);
        this.gmailSmtpSettings.put("SACCO_GMAIL_FROM_ADDRESS", gmailFromAddress);
        this.mtnMomoSettings = new LinkedHashMap<>();
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_SUBSCRIPTION_KEY", mtnSubscriptionKey);
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_API_USER_ID", mtnApiUserId);
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_API_KEY", mtnApiKey);
        this.mtnMomoSettings.put("SACCO_MTN_MOMO_TARGET_ENVIRONMENT", mtnTargetEnvironment);
        this.airtelMoneySettings = new LinkedHashMap<>();
        this.airtelMoneySettings.put("SACCO_AIRTEL_MONEY_CLIENT_ID", airtelClientId);
        this.airtelMoneySettings.put("SACCO_AIRTEL_MONEY_CLIENT_SECRET", airtelClientSecret);
        this.airtelMoneySettings.put("SACCO_AIRTEL_MONEY_COUNTRY_CODE", airtelCountryCode);
        this.mpesaDarajaSettings = new LinkedHashMap<>();
        this.mpesaDarajaSettings.put("SACCO_MPESA_DARAJA_CONSUMER_KEY", mpesaConsumerKey);
        this.mpesaDarajaSettings.put("SACCO_MPESA_DARAJA_CONSUMER_SECRET", mpesaConsumerSecret);
        this.mpesaDarajaSettings.put("SACCO_MPESA_DARAJA_BUSINESS_SHORT_CODE", mpesaBusinessShortCode);
        this.mpesaDarajaSettings.put("SACCO_MPESA_DARAJA_PASSKEY", mpesaPasskey);
        this.mpesaDarajaSettings.put("SACCO_MPESA_DARAJA_CALLBACK_URL", mpesaCallbackUrl);
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
        String smsProvider = providers.get("SACCO_SMS_PROVIDER");
        if (!"afrosms".equalsIgnoreCase(smsProvider)) {
            throw new IllegalStateException(
                    "Production startup requires an implemented SMS adapter: SACCO_SMS_PROVIDER=afrosms");
        }
        requireSettings("AfroSMS", afroSmsSettings);

        String emailProvider = providers.get("SACCO_EMAIL_PROVIDER");
        if (!"gmail_smtp".equalsIgnoreCase(emailProvider)) {
            throw new IllegalStateException(
                    "Production startup requires an implemented email adapter: SACCO_EMAIL_PROVIDER=gmail_smtp");
        }
        requireSettings("Gmail SMTP", gmailSmtpSettings);

        String mobileMoneyProvider = providers.get("SACCO_MOBILE_MONEY_PROVIDER");
        if (!"mtn_momo".equalsIgnoreCase(mobileMoneyProvider)
                && !"airtel_money".equalsIgnoreCase(mobileMoneyProvider)
                && !"mpesa_daraja".equalsIgnoreCase(mobileMoneyProvider)) {
            throw new IllegalStateException(
                    "Production startup requires an implemented mobile-money adapter: SACCO_MOBILE_MONEY_PROVIDER=mtn_momo, airtel_money, or mpesa_daraja");
        }
        if ("mtn_momo".equalsIgnoreCase(mobileMoneyProvider)) {
            requireSettings("MTN MoMo", mtnMomoSettings);
        }
        if ("airtel_money".equalsIgnoreCase(mobileMoneyProvider)) {
            requireSettings("Airtel Money", airtelMoneySettings);
        }
        if ("mpesa_daraja".equalsIgnoreCase(mobileMoneyProvider)) {
            requireSettings("M-PESA Daraja", mpesaDarajaSettings);
        }
    }

    private void requireSettings(String providerName, Map<String, String> settings) {
        String missingSettings = settings.entrySet().stream()
                .filter((entry) -> isBlank(entry.getValue()))
                .map(Map.Entry::getKey)
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
        if (!missingSettings.isBlank()) {
            throw new IllegalStateException(
                    "Production startup requires " + providerName + " configuration for: " + missingSettings);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
