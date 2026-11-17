package com.methaltech.sacco.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class ContactMaskerTest {

    @Test
    void masksRegisteredEmailAndPhoneDestinations() {
        assertEquals("o***@example.com", ContactMasker.mask("owner@example.com"));
        assertEquals("+256 ***3456", ContactMasker.mask("+256700123456"));
    }

    @Test
    void handlesMissingAndShortContacts() {
        assertNull(ContactMasker.mask(null));
        assertEquals("***", ContactMasker.mask("123"));
    }
}
