package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class IdempotencyGuardTest {

    @Test
    void blankKeysDoNotBlockRequests() {
        IdempotencyGuard guard = new IdempotencyGuard(new InMemoryIdempotencyStore(), Duration.ofMinutes(5));

        assertTrue(guard.reserve("payments", ""));
        assertTrue(guard.reserve("payments", null));
    }

    @Test
    void repeatedMemoryKeyIsRejectedWithinTtl() {
        IdempotencyGuard guard = new IdempotencyGuard(new InMemoryIdempotencyStore(), Duration.ofMinutes(5));

        assertTrue(guard.reserve("payments", "ABC-123"));
        assertFalse(guard.reserve("payments", "ABC-123"));
    }

    @Test
    void expiredMemoryKeyCanBeReservedAgain() throws Exception {
        IdempotencyGuard guard = new IdempotencyGuard(new InMemoryIdempotencyStore(), Duration.ofNanos(1));

        assertTrue(guard.reserve("payments", "SHORT-LIVED"));
        Thread.sleep(2);
        assertTrue(guard.reserve("payments", "SHORT-LIVED"));
    }

    @Test
    void redisStoreUsesSharedSetIfAbsentCommand() {
        AtomicBoolean first = new AtomicBoolean(true);
        AtomicInteger calls = new AtomicInteger(0);
        IdempotencyGuard guard = new IdempotencyGuard("redis", (key, ttl) -> {
            calls.incrementAndGet();
            return first.getAndSet(false);
        }, Duration.ofHours(24));

        assertTrue(guard.reserve("callbacks", "MM-001"));
        assertFalse(guard.reserve("callbacks", "MM-001"));
        assertTrue(calls.get() == 2);
    }

    @Test
    void redisStoreRequiresRedisUrlOutsideTests() {
        assertThrows(IllegalStateException.class, () -> new IdempotencyGuard("redis", "", Duration.ofHours(24)));
    }

    @Test
    void unknownStoreFailsFast() {
        assertThrows(IllegalStateException.class, () -> new IdempotencyGuard("database", (key, ttl) -> true, Duration.ofHours(24)));
    }
}
