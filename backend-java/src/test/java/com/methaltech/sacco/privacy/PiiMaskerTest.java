package com.methaltech.sacco.privacy;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class PiiMaskerTest {

    @Test
    void masksPhoneToLastFourDigits() {
        assertEquals("+********3456", PiiMasker.phone("+256700123456"));
        assertEquals("********3456", PiiMasker.phone("0700123456"));
    }

    @Test
    void masksEmailLocalPartOnly() {
        assertEquals("ri****@example.com", PiiMasker.email("richard@example.com"));
        assertEquals("r****@example.com", PiiMasker.email("r@example.com"));
    }

    @Test
    void masksNationalIdWithSmallVisibleEdges() {
        assertEquals("CM*******SMK", PiiMasker.nationalId("CM1234567SMK"));
    }

    @Test
    void blankValuesStayBlank() {
        assertEquals("", PiiMasker.phone(""));
        assertEquals("", PiiMasker.email(null));
        assertEquals("", PiiMasker.nationalId(" "));
    }
}
