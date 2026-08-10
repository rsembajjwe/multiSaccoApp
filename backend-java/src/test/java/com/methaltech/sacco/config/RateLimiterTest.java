package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for the token-bucket {@link RateLimiter}, driven by a virtual clock so refill behaviour
 * is deterministic and fast.
 */
class RateLimiterTest {

    private final AtomicLong now = new AtomicLong(0);
    private final RateLimiter limiter = new RateLimiter(now::get);
    private static final Duration WINDOW = Duration.ofSeconds(60);

    private void advance(Duration duration) {
        now.addAndGet(duration.toNanos());
    }

    @Test
    void allowsUpToCapacityThenBlocks() {
        for (int i = 0; i < 3; i++) {
            assertTrue(limiter.tryAcquire("ip-1", 3, WINDOW), "request " + i + " should be allowed");
        }
        assertFalse(limiter.tryAcquire("ip-1", 3, WINDOW), "fourth request should be throttled");
    }

    @Test
    void refillsGraduallyOverTheWindow() {
        for (int i = 0; i < 3; i++) {
            limiter.tryAcquire("ip-2", 3, WINDOW);
        }
        assertFalse(limiter.tryAcquire("ip-2", 3, WINDOW));

        // One token is restored after a third of the window (capacity 3 over 60s => 1 per 20s).
        advance(Duration.ofSeconds(20));
        assertTrue(limiter.tryAcquire("ip-2", 3, WINDOW));
        assertFalse(limiter.tryAcquire("ip-2", 3, WINDOW));
    }

    @Test
    void fullWindowRestoresFullCapacity() {
        for (int i = 0; i < 3; i++) {
            limiter.tryAcquire("ip-3", 3, WINDOW);
        }
        assertFalse(limiter.tryAcquire("ip-3", 3, WINDOW));

        advance(WINDOW);
        for (int i = 0; i < 3; i++) {
            assertTrue(limiter.tryAcquire("ip-3", 3, WINDOW), "bucket should be full again");
        }
    }

    @Test
    void keysAreIsolated() {
        assertTrue(limiter.tryAcquire("ip-a", 1, WINDOW));
        assertFalse(limiter.tryAcquire("ip-a", 1, WINDOW));
        assertTrue(limiter.tryAcquire("ip-b", 1, WINDOW), "a different key has its own budget");
    }

    @Test
    void nonPositiveCapacityDisablesLimiting() {
        for (int i = 0; i < 100; i++) {
            assertTrue(limiter.tryAcquire("ip-unlimited", 0, WINDOW));
        }
    }

    @Test
    void redisStoreFailsFastUntilAdapterIsImplemented() {
        assertThrows(IllegalStateException.class, () -> new RateLimiter("redis"));
    }

    @Test
    void unknownStoreFailsFast() {
        assertThrows(IllegalStateException.class, () -> new RateLimiter("database"));
    }
}
