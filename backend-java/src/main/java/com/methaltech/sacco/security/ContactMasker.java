package com.methaltech.sacco.security;

public final class ContactMasker {

    private ContactMasker() {
    }

    public static String mask(String contact) {
        if (contact == null || contact.isBlank()) return null;
        String normalized = contact.trim();
        int at = normalized.indexOf('@');
        if (at > 0) {
            return normalized.substring(0, 1) + "***" + normalized.substring(at);
        }
        String digits = normalized.replaceAll("[^0-9]", "");
        if (digits.length() < 4) return "***";
        String prefix = normalized.startsWith("+") && digits.length() > 7
                ? "+" + digits.substring(0, Math.min(3, digits.length() - 4)) + " "
                : "";
        return prefix + "***" + digits.substring(digits.length() - 4);
    }
}
