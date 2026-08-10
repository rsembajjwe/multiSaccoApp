package com.methaltech.sacco.privacy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PiiCryptoTest {

    @Test
    void encryptsAndDecryptsNationalIdValues() {
        String encrypted = PiiCrypto.encryptNullable("CM1234567SMK");

        assertTrue(encrypted.startsWith(PiiCrypto.PREFIX));
        assertNotEquals("CM1234567SMK", encrypted);
        assertEquals("CM1234567SMK", PiiCrypto.decryptNullable(encrypted));
    }

    @Test
    void legacyPlaintextValuesRemainReadable() {
        assertEquals("CM1234567SMK", PiiCrypto.decryptNullable("CM1234567SMK"));
    }

    @Test
    void blankValuesRemainBlank() {
        assertEquals("", PiiCrypto.encryptNullable(""));
        assertEquals("", PiiCrypto.decryptNullable(""));
    }
}
