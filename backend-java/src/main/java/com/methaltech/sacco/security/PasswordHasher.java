package com.methaltech.sacco.security;

import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.security.spec.InvalidKeySpecException;
import java.util.HexFormat;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {

    private static final int ITERATIONS = 210_000;
    private static final int KEY_LENGTH_BITS = 256;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordHash hash(String password) {
        byte[] saltBytes = new byte[16];
        secureRandom.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes);
        return new PasswordHash(hash(password, salt), salt);
    }

    public boolean matches(String password, String salt, String expectedHash) {
        if (expectedHash == null) {
            return false;
        }
        // Constant-time comparison to avoid leaking hash bytes via timing. hash() emits
        // lowercase hex, so the stored value is lowercased to preserve case-insensitive matching.
        byte[] actual = hash(password, salt).getBytes(StandardCharsets.UTF_8);
        byte[] expected = expectedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(actual, expected);
    }

    private String hash(String password, String salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt.getBytes(), ITERATIONS, KEY_LENGTH_BITS);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return HexFormat.of().formatHex(factory.generateSecret(spec).getEncoded());
        } catch (NoSuchAlgorithmException | InvalidKeySpecException exception) {
            throw new IllegalStateException("Password hashing is unavailable", exception);
        }
    }

    public record PasswordHash(String hash, String salt) {
    }
}
