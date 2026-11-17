package com.methaltech.sacco.security;

import java.util.LinkedHashSet;
import java.util.List;

public final class PhoneNumberNormalizer {

    private PhoneNumberNormalizer() {
    }

    public static String normalizeUgandan(String value) {
        if (value == null) return "";
        String trimmed = value.trim();
        if (!trimmed.matches("^[+0-9() -]+$")) return trimmed;
        String compact = trimmed.replaceAll("[() -]", "");
        if (compact.matches("^07\\d{8}$")) return "+256" + compact.substring(1);
        if (compact.matches("^2567\\d{8}$")) return "+" + compact;
        return compact;
    }

    public static List<String> loginVariants(String value) {
        String normalized = normalizeUgandan(value);
        LinkedHashSet<String> variants = new LinkedHashSet<>();
        if (!normalized.isBlank()) variants.add(normalized);
        if (normalized.matches("^\\+2567\\d{8}$")) {
            variants.add("0" + normalized.substring(4));
            variants.add(normalized.substring(1));
        }
        return List.copyOf(variants);
    }
}
