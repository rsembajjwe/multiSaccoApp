package com.methaltech.sacco.accounting;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Selects the mobile-money provider for a request by the payer's network, so several providers (e.g.
 * MTN and Airtel) can be active at once. A request names a network ("mtn", "airtel", "mpesa"); the
 * router returns the matching configured provider, otherwise the configured default (or the demo
 * provider when nothing real is configured).
 */
@Component
public class MobileMoneyProviderRouter {

    private final Map<String, MobileMoneyProvider> providersById = new HashMap<>();
    private final MobileMoneyProvider defaultProvider;

    MobileMoneyProviderRouter(
            List<MobileMoneyProvider> providers,
            @Value("${sacco.providers.mobile-money:demo_mobile_money}") String defaultProviderId) {
        MobileMoneyProvider demo = null;
        for (MobileMoneyProvider provider : providers) {
            // The demo provider mirrors whatever provider id is configured, so it must not be indexed
            // by id (it would collide with a real provider). It is kept only as the fallback.
            if (provider instanceof DemoMobileMoneyProvider) {
                demo = provider;
                continue;
            }
            providersById.put(provider.providerId(), provider);
        }
        this.defaultProvider = resolveDefault(defaultProviderId, demo, providers);
    }

    /** Provider for the requested network; falls back to the default when the network is unknown or
     *  its provider is not configured. */
    MobileMoneyProvider resolve(String requestedNetwork) {
        String id = canonicalId(requestedNetwork);
        if (id != null) {
            MobileMoneyProvider provider = providersById.get(id);
            if (provider != null && provider.isConfigured()) {
                return provider;
            }
        }
        return defaultProvider;
    }

    public List<PaymentProviderOption> availablePaymentOptions() {
        List<PaymentProviderOption> configured = providersById.values().stream()
                .filter(MobileMoneyProvider::isConfigured)
                .map(provider -> new PaymentProviderOption(networkId(provider.providerId()), providerLabel(provider.providerId()), provider.providerId(), true))
                .sorted(java.util.Comparator.comparing(PaymentProviderOption::network))
                .toList();
        if (!configured.isEmpty()) return configured;
        if (defaultProvider == null) return List.of();
        return List.of(new PaymentProviderOption("default", "Mobile money", defaultProvider.providerId(), true));
    }

    MobileMoneyProvider defaultProvider() {
        return defaultProvider;
    }

    public record PaymentProviderOption(String network, String label, String providerId, boolean available) {
    }

    private MobileMoneyProvider resolveDefault(String preferredId, MobileMoneyProvider demo, List<MobileMoneyProvider> all) {
        MobileMoneyProvider preferred = providersById.get(preferredId);
        if (preferred != null && preferred.isConfigured()) {
            return preferred;
        }
        MobileMoneyProvider firstConfiguredReal = providersById.values().stream()
                .filter(MobileMoneyProvider::isConfigured)
                .findFirst()
                .orElse(null);
        if (firstConfiguredReal != null) {
            return firstConfiguredReal;
        }
        return demo != null ? demo : (all.isEmpty() ? null : all.get(0));
    }

    private static String canonicalId(String network) {
        if (network == null || network.isBlank()) {
            return null;
        }
        return switch (network.trim().toLowerCase(Locale.ROOT)) {
            case "mtn", "mtn_momo", "momo" -> "mtn_momo";
            case "airtel", "airtel_money" -> "airtel_money";
            case "mpesa", "m-pesa", "mpesa_daraja" -> "mpesa_daraja";
            case "demo", "demo_mobile_money" -> "demo_mobile_money";
            default -> null;
        };
    }

    private static String networkId(String providerId) {
        return switch (providerId) {
            case "mtn_momo" -> "mtn";
            case "airtel_money" -> "airtel";
            case "mpesa_daraja" -> "mpesa";
            default -> "default";
        };
    }

    private static String providerLabel(String providerId) {
        return switch (providerId) {
            case "mtn_momo" -> "MTN MoMo";
            case "airtel_money" -> "Airtel Money";
            case "mpesa_daraja" -> "M-Pesa";
            default -> "Mobile money";
        };
    }
}
