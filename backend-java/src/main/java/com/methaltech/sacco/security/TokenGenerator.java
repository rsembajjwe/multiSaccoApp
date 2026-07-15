package com.methaltech.sacco.security;

import java.security.SecureRandom;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class TokenGenerator {

    private final SecureRandom secureRandom = new SecureRandom();

    public String createToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return UUID.randomUUID() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
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
