package com.methaltech.sacco.notification;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
class AfroSmsCreditService {

    private final String baseUrl;
    private final String balancePath;
    private final String email;
    private final String password;

    AfroSmsCreditService(
            @Value("${sacco.integrations.sms.afrosms.base-url:https://www.afrosms.ug}") String baseUrl,
            @Value("${sacco.integrations.sms.afrosms.balance-path:/smskings/balance_api.php}") String balancePath,
            @Value("${sacco.integrations.sms.afrosms.email:}") String email,
            @Value("${sacco.integrations.sms.afrosms.password:}") String password) {
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.balancePath = ensureLeadingSlash(balancePath);
        this.email = email;
        this.password = password;
    }

    NotificationProviderStatusResponse platformCreditStatus() {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return NotificationProviderStatusResponse.unavailable(
                    "sms",
                    "afrosms",
                    "AfroSMS credit cannot be read until SACCO_AFROSMS_EMAIL and SACCO_AFROSMS_PASSWORD are configured.");
        }
        try {
            String balanceUrl = baseUrl + balancePath
                    + "?email=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                    + "&password=" + URLEncoder.encode(password, StandardCharsets.UTF_8)
                    + "&call=credits";
            String line = readFirstLine(balanceUrl);
            String balance = line == null ? "0" : line.replaceAll("[^0-9]", "");
            return NotificationProviderStatusResponse.ready(
                    "sms",
                    "afrosms",
                    balance.isBlank() ? "0" : balance,
                    "AfroSMS credit read from balance_api.php.");
        } catch (MalformedURLException exception) {
            throw new IllegalStateException(exception);
        } catch (Exception exception) {
            return NotificationProviderStatusResponse.unavailable(
                    "sms",
                    "afrosms",
                    "Check your Internet Connection to see the Account balance: " + exception.getClass().getSimpleName());
        }
    }

    private String readFirstLine(String balanceUrl) throws Exception {
        try {
            return readFirstLineDefaultTls(balanceUrl);
        } catch (SSLHandshakeException exception) {
            return readFirstLineWithProviderTlsFallback(balanceUrl);
        }
    }

    private String readFirstLineDefaultTls(String balanceUrl) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(URI.create(balanceUrl).toURL().openStream(), StandardCharsets.UTF_8))) {
            return reader.readLine();
        }
    }

    private String readFirstLineWithProviderTlsFallback(String balanceUrl) throws Exception {
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, new TrustManager[]{new X509TrustManager() {
            @Override
            public void checkClientTrusted(X509Certificate[] chain, String authType) {
            }

            @Override
            public void checkServerTrusted(X509Certificate[] chain, String authType) {
            }

            @Override
            public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
            }
        }}, new SecureRandom());
        HttpsURLConnection connection = (HttpsURLConnection) URI.create(balanceUrl).toURL().openConnection();
        connection.setSSLSocketFactory(context.getSocketFactory());
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.readLine();
        } finally {
            connection.disconnect();
        }
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) return "https://www.afrosms.ug";
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String ensureLeadingSlash(String value) {
        if (value == null || value.isBlank()) return "/smskings/balance_api.php";
        return value.startsWith("/") ? value : "/" + value;
    }
}
