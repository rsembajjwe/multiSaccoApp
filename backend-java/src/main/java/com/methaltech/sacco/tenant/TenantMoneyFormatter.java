package com.methaltech.sacco.tenant;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Currency;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class TenantMoneyFormatter {

    public String format(TenantResponse tenant, BigDecimal amount) {
        String localeCode = tenant == null || tenant.localeCode() == null || tenant.localeCode().isBlank()
                ? "en-UG"
                : tenant.localeCode();
        String currencyCode = tenant == null || tenant.currencyCode() == null || tenant.currencyCode().isBlank()
                ? "UGX"
                : tenant.currencyCode();
        int digits = tenant == null ? 0 : tenant.currencyDigits();
        Locale locale = Locale.forLanguageTag(localeCode);
        NumberFormat formatter = NumberFormat.getCurrencyInstance(locale);
        formatter.setCurrency(currency(currencyCode));
        formatter.setMinimumFractionDigits(digits);
        formatter.setMaximumFractionDigits(digits);
        return formatter.format(amount == null ? BigDecimal.ZERO : amount);
    }

    private Currency currency(String currencyCode) {
        try {
            return Currency.getInstance(currencyCode);
        } catch (IllegalArgumentException ignored) {
            return Currency.getInstance("UGX");
        }
    }
}
