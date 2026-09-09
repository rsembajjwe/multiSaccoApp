package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SmsMessageSegmentsTest {

    @Test
    void emptyMessageUsesNoCredits() {
        assertEquals(0, SmsMessageSegments.count(null));
        assertEquals(0, SmsMessageSegments.count("   "));
    }

    @Test
    void standardSmsUsesOneCreditUpToOneHundredSixtyCharacters() {
        assertEquals(1, SmsMessageSegments.count("Hello members"));
        assertEquals(1, SmsMessageSegments.count("x".repeat(160)));
    }

    @Test
    void longSmsUsesConcatenatedSegmentCredits() {
        assertEquals(2, SmsMessageSegments.count("x".repeat(161)));
        assertEquals(2, SmsMessageSegments.count("x".repeat(306)));
        assertEquals(3, SmsMessageSegments.count("x".repeat(307)));
    }
}
