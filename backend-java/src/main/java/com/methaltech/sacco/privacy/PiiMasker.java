package com.methaltech.sacco.privacy;

public final class PiiMasker {

    private PiiMasker() {
    }

    public static String phone(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) return "";
        String digits = normalized.replaceAll("\\D", "");
        if (digits.length() <= 4) return "****";
        String suffix = digits.substring(digits.length() - 4);
        return normalized.startsWith("+") ? "+********" + suffix : "********" + suffix;
    }

    public static String email(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) return "";
        int at = normalized.indexOf('@');
        if (at <= 0) return maskText(normalized, 1, 1);
        String local = normalized.substring(0, at);
        String domain = normalized.substring(at);
        String visibleLocal = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return visibleLocal + "****" + domain;
    }

    public static String nationalId(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) return "";
        return maskText(normalized, Math.min(2, normalized.length()), Math.min(3, normalized.length()));
    }

    private static String maskText(String value, int prefixLength, int suffixLength) {
        if (value.length() <= prefixLength + suffixLength) {
            return "*".repeat(Math.max(4, value.length()));
        }
        return value.substring(0, prefixLength)
                + "*".repeat(Math.max(4, value.length() - prefixLength - suffixLength))
                + value.substring(value.length() - suffixLength);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
