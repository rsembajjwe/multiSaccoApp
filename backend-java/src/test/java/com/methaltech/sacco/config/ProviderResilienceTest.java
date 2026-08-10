package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

/**
 * Unit tests for {@link ProviderResilience}. These validate the two guarantees the providers rely on:
 * idempotent calls retry transient transport failures, non-idempotent calls never retry, and an open
 * circuit is surfaced as a {@link ResourceAccessException} so existing provider error handling copes.
 */
class ProviderResilienceTest {

    private final ProviderResilience resilience = new ProviderResilience();

    @Test
    void protectReturnsValueOnSuccess() {
        String result = resilience.protect("success-cb", () -> "ok");
        assertEquals("ok", result);
    }

    @Test
    void idempotentCallRetriesTransientFailuresThenSucceeds() {
        AtomicInteger attempts = new AtomicInteger();
        String result = resilience.protectIdempotent("retry-cb", () -> {
            if (attempts.incrementAndGet() < 3) {
                throw new ResourceAccessException("temporary network glitch");
            }
            return "recovered";
        });
        assertEquals("recovered", result);
        assertEquals(3, attempts.get(), "should retry up to the third attempt");
    }

    @Test
    void nonIdempotentCallIsNotRetried() {
        AtomicInteger attempts = new AtomicInteger();
        assertThrows(ResourceAccessException.class, () ->
                resilience.protect("no-retry-cb", () -> {
                    attempts.incrementAndGet();
                    throw new ResourceAccessException("provider down");
                }));
        assertEquals(1, attempts.get(), "payment-style calls must run exactly once");
    }

    @Test
    void circuitOpensAfterRepeatedFailuresAndFailsFast() {
        String name = "opening-cb";
        // Drive enough failures to satisfy the minimum call count and trip the failure-rate threshold.
        for (int i = 0; i < 10; i++) {
            assertThrows(ResourceAccessException.class, () ->
                    resilience.protect(name, () -> {
                        throw new ResourceAccessException("provider down");
                    }));
        }
        assertEquals("OPEN", resilience.circuitState(name));

        AtomicInteger attempts = new AtomicInteger();
        ResourceAccessException open = assertThrows(ResourceAccessException.class, () ->
                resilience.protect(name, () -> {
                    attempts.incrementAndGet();
                    return "should-not-run";
                }));
        assertEquals(0, attempts.get(), "an open circuit must not invoke the provider");
        assertTrue(open.getMessage().contains("temporarily unavailable"),
                "open circuit should surface as a transient transport failure");
    }
}
