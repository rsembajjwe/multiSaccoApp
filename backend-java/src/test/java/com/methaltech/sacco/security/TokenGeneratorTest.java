package com.methaltech.sacco.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class TokenGeneratorTest {

    private final TokenGenerator tokenGenerator = new TokenGenerator();

    @Test
    void createsEightCharacterUnambiguousPasswordResetCodes() {
        String first = tokenGenerator.createPasswordResetCode();
        String second = tokenGenerator.createPasswordResetCode();

        assertTrue(first.matches("[2-9A-HJ-NP-Z]{8}"));
        assertTrue(second.matches("[2-9A-HJ-NP-Z]{8}"));
        assertNotEquals(first, second);
    }

    @Test
    void normalizesShortCodesWithoutChangingLegacyTokens() {
        assertEquals("ABCD2345", tokenGenerator.normalizePasswordResetCode(" abcd2345 "));
        assertEquals("legacy.Mixed-Case.Token", tokenGenerator.normalizePasswordResetCode(" legacy.Mixed-Case.Token "));
    }
}
