package com.methaltech.sacco.privacy;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public final class PiiCrypto {

    public static final String PREFIX = "enc:v1:";
    private static final String KEY_ENV = "SACCO_PII_ENCRYPTION_KEY";
    private static final String KEY_PROPERTY = "sacco.pii.encryption-key";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private PiiCrypto() {
    }

    public static String encryptNullable(String value) {
        if (value == null || value.isBlank()) return value == null ? null : "";
        if (value.startsWith(PREFIX)) return value;
        try {
            byte[] iv = new byte[IV_BYTES];
            SECURE_RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);
            return PREFIX + Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception error) {
            throw new IllegalStateException("Could not encrypt PII value.", error);
        }
    }

    public static String decryptNullable(String value) {
        if (value == null || value.isBlank()) return value == null ? null : "";
        if (!value.startsWith(PREFIX)) return value;
        try {
            byte[] payload = Base64.getDecoder().decode(value.substring(PREFIX.length()));
            ByteBuffer buffer = ByteBuffer.wrap(payload);
            byte[] iv = new byte[IV_BYTES];
            buffer.get(iv);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception error) {
            throw new IllegalStateException("Could not decrypt PII value.", error);
        }
    }

    static SecretKeySpec key() {
        String configured = configuredKey();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(configured.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(digest, "AES");
        } catch (Exception error) {
            throw new IllegalStateException("Could not prepare PII encryption key.", error);
        }
    }

    static String configuredKey() {
        String property = System.getProperty(KEY_PROPERTY, "");
        if (!property.isBlank()) return property.trim();
        String env = System.getenv(KEY_ENV);
        if (env != null && !env.isBlank()) return env.trim();
        return "local-development-pii-encryption-key-2026";
    }
}
