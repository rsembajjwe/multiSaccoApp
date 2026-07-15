package com.methaltech.sacco.security;

import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.util.HexFormat;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {

    private static final int ITERATIONS = 210_000;
    private static final int KEY_LENGTH_BITS = 256;

    public boolean matches(String password, String salt, String expectedHash) {
        return hash(password, salt).equalsIgnoreCase(expectedHash);
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
}
