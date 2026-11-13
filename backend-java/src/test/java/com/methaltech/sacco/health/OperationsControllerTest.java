package com.methaltech.sacco.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class OperationsControllerTest {

    @Test
    void convertsInstantToPostgresSupportedUtcTimestamp() {
        Instant instant = Instant.parse("2026-11-10T12:00:00Z");

        assertEquals(
                OffsetDateTime.ofInstant(instant, ZoneOffset.UTC),
                OperationsController.jdbcArgument(instant));
    }

    @Test
    void preservesOtherJdbcArguments() {
        String argument = "tenant_green";

        assertSame(argument, OperationsController.jdbcArgument(argument));
    }
}
