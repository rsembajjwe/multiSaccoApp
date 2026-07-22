package com.methaltech.sacco.accounting;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Verifies the authenticity of inbound mobile-money provider callbacks.
 *
 * <p>Production mobile-money providers sign each callback with a shared secret. This component
 * recomputes an HMAC-SHA256 over the raw request body (optionally prefixed with the provider
 * timestamp for replay protection) and compares it against the signature the provider sent, using a
 * constant-time comparison.</p>
 *
 * <p>Backward compatibility: when no secret is configured the endpoint keeps its previous unsigned
 * behaviour so local and demo flows are unaffected. In production the {@code require-signed-callbacks}
 * flag defaults to {@code true} so the endpoint fails closed if the secret is ever missing.</p>
 */
@Component
public class MobileMoneyCallbackVerifier {

    static final String SIGNATURE_HEADER = "X-Mobile-Money-Signature";
    static final String TIMESTAMP_HEADER = "X-Mobile-Money-Timestamp";
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secret;
    private final boolean requireSignedCallbacks;
    private final long timestampToleranceSeconds;

    MobileMoneyCallbackVerifier(
            @Value("${sacco.integrations.mobile-money.callback-secret:}") String secret,
            @Value("${sacco.integrations.mobile-money.require-signed-callbacks:false}") boolean requireSignedCallbacks,
            @Value("${sacco.integrations.mobile-money.callback-timestamp-tolerance-seconds:300}") long timestampToleranceSeconds) {
        this.secret = secret == null ? "" : secret.trim();
        this.requireSignedCallbacks = requireSignedCallbacks;
        this.timestampToleranceSeconds = timestampToleranceSeconds;
    }

    /** Verifies a callback using the current wall-clock for timestamp freshness checks. */
    Outcome verify(byte[] rawBody, String signatureHeader, String timestampHeader) {
        return verify(rawBody, signatureHeader, timestampHeader, Instant.now());
    }

    /** Package-visible overload that accepts a fixed instant for deterministic unit testing. */
    Outcome verify(byte[] rawBody, String signatureHeader, String timestampHeader, Instant now) {
        if (secret.isBlank()) {
            return requireSignedCallbacks ? Outcome.NOT_CONFIGURED : Outcome.SKIPPED_UNSIGNED;
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return Outcome.SIGNATURE_MISSING;
        }

        String timestamp = timestampHeader == null ? "" : timestampHeader.trim();
        if (!timestamp.isBlank()) {
            Outcome timestampOutcome = validateTimestamp(timestamp, now);
            if (timestampOutcome != null) {
                return timestampOutcome;
            }
        }

        String expected = hmacHex(timestamp, rawBody == null ? new byte[0] : rawBody);
        String provided = signatureHeader.trim().toLowerCase(Locale.ROOT);
        boolean matches = MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8));
        return matches ? Outcome.VERIFIED : Outcome.SIGNATURE_INVALID;
    }

    private Outcome validateTimestamp(String timestamp, Instant now) {
        long provided;
        try {
            provided = Long.parseLong(timestamp);
        } catch (NumberFormatException notEpochSeconds) {
            return Outcome.TIMESTAMP_INVALID;
        }
        long skew = Math.abs(now.getEpochSecond() - provided);
        return skew > timestampToleranceSeconds ? Outcome.TIMESTAMP_INVALID : null;
    }

    private String hmacHex(String timestamp, byte[] body) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            if (!timestamp.isBlank()) {
                mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
            }
            return HexFormat.of().formatHex(mac.doFinal(body));
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Mobile-money callback signing is unavailable", exception);
        }
    }

    /** Result of a verification attempt. Accepted outcomes let the request reach the controller. */
    enum Outcome {
        VERIFIED(true),
        SKIPPED_UNSIGNED(true),
        NOT_CONFIGURED(false),
        SIGNATURE_MISSING(false),
        SIGNATURE_INVALID(false),
        TIMESTAMP_INVALID(false);

        private final boolean accepted;

        Outcome(boolean accepted) {
            this.accepted = accepted;
        }

        boolean accepted() {
            return accepted;
        }
    }
}
