package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class MobileMoneyCallbackVerifierTest {

    private static final String SECRET = "test_shared_secret_123";
    private static final byte[] BODY = "{\"amount\":1000}".getBytes(StandardCharsets.UTF_8);
    private static final Instant NOW = Instant.parse("2026-07-22T10:00:00Z");

    @Test
    void unsignedCallbacksAreAllowedWhenNoSecretConfigured() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier("", false, 300);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, null, null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.SKIPPED_UNSIGNED, outcome);
        assertTrue(outcome.accepted());
    }

    @Test
    void callbacksAreRejectedWhenSecretMissingButSigningRequired() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier("", true, 300);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, null, null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.NOT_CONFIGURED, outcome);
        assertFalse(outcome.accepted());
    }

    @Test
    void missingSignatureIsRejectedWhenSecretConfigured() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, "  ", null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.SIGNATURE_MISSING, outcome);
    }

    @Test
    void validSignatureWithoutTimestampIsVerified() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String signature = sign(SECRET, null, BODY);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, signature, null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.VERIFIED, outcome);
        assertTrue(outcome.accepted());
    }

    @Test
    void uppercaseSignatureIsAcceptedCaseInsensitively() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String signature = sign(SECRET, null, BODY).toUpperCase(Locale.ROOT);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, signature, null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.VERIFIED, outcome);
    }

    @Test
    void tamperedBodyIsRejected() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String signature = sign(SECRET, null, BODY);
        byte[] tampered = "{\"amount\":999999}".getBytes(StandardCharsets.UTF_8);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(tampered, signature, null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.SIGNATURE_INVALID, outcome);
    }

    @Test
    void wrongSecretIsRejected() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String signature = sign("a_different_secret", null, BODY);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, signature, null, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.SIGNATURE_INVALID, outcome);
    }

    @Test
    void freshTimestampWithValidSignatureIsVerified() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String timestamp = String.valueOf(NOW.getEpochSecond() - 120);
        String signature = sign(SECRET, timestamp, BODY);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, signature, timestamp, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.VERIFIED, outcome);
    }

    @Test
    void staleTimestampIsRejected() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String timestamp = String.valueOf(NOW.getEpochSecond() - 4000);
        String signature = sign(SECRET, timestamp, BODY);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, signature, timestamp, NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.TIMESTAMP_INVALID, outcome);
    }

    @Test
    void nonNumericTimestampIsRejected() {
        MobileMoneyCallbackVerifier verifier = new MobileMoneyCallbackVerifier(SECRET, true, 300);
        String signature = sign(SECRET, "not-a-timestamp", BODY);

        MobileMoneyCallbackVerifier.Outcome outcome = verifier.verify(BODY, signature, "not-a-timestamp", NOW);

        assertEquals(MobileMoneyCallbackVerifier.Outcome.TIMESTAMP_INVALID, outcome);
    }

    private static String sign(String secret, String timestamp, byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            if (timestamp != null && !timestamp.isBlank()) {
                mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
            }
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
