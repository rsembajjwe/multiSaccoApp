package com.methaltech.sacco.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class PhoneNumberNormalizerTest {

    @Test
    void normalizesSupportedUgandanPhoneFormats() {
        assertEquals("+256700123456", PhoneNumberNormalizer.normalizeUgandan("0700 123 456"));
        assertEquals("+256700123456", PhoneNumberNormalizer.normalizeUgandan("256700123456"));
        assertEquals("+256700123456", PhoneNumberNormalizer.normalizeUgandan("+256 700 123456"));
    }

    @Test
    void providesVariantsForExistingPhoneRecords() {
        assertEquals(
                List.of("+256700123456", "0700123456", "256700123456"),
                PhoneNumberNormalizer.loginVariants("0700 123 456"));
    }

    @Test
    void preservesEmailAndMembershipIdentifiers() {
        assertEquals(List.of("member@example.com"), PhoneNumberNormalizer.loginVariants("member@example.com"));
        assertEquals(List.of("SACCO-0001"), PhoneNumberNormalizer.loginVariants("SACCO-0001"));
    }
}
