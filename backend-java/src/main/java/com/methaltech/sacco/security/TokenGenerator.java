package com.methaltech.sacco.security;

import java.security.SecureRandom;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class TokenGenerator {

    private static final String RESET_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int RESET_CODE_LENGTH = 8;
    private final SecureRandom secureRandom = new SecureRandom();

    public String createToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return UUID.randomUUID() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    public String createPasswordResetCode() {
        StringBuilder code = new StringBuilder(RESET_CODE_LENGTH);
        for (int index = 0; index < RESET_CODE_LENGTH; index++) {
            code.append(RESET_CODE_ALPHABET.charAt(secureRandom.nextInt(RESET_CODE_ALPHABET.length())));
        }
        return code.toString();
    }

    public String normalizePasswordResetCode(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() == RESET_CODE_LENGTH && normalized.chars().allMatch(Character::isLetterOrDigit)) {
            return normalized.toUpperCase(Locale.ROOT);
        }
        return normalized;
    }

    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes()));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Token hashing is unavailable", exception);
        }
    }
}
