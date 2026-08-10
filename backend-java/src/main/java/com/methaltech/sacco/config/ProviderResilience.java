package com.methaltech.sacco.config;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig.SlidingWindowType;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import java.io.IOException;
import java.time.Duration;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;

/**
 * Centralised resilience for outbound provider calls (mobile-money and SMS). Uses the core
 * Resilience4j libraries directly rather than the Spring Boot starter, so there is no dependency on
 * Spring Boot auto-configuration or AOP.
 *
 * <p>Two guarantees are offered:
 * <ul>
 *   <li>{@link #protect} — circuit breaking only. Safe for non-idempotent calls such as payment
 *       initiation: the call is never duplicated; when a provider is repeatedly failing the breaker
 *       opens and further calls fail fast instead of piling up on request threads.</li>
 *   <li>{@link #protectIdempotent} — circuit breaking plus bounded retry with exponential backoff.
 *       Use only for idempotent calls (OAuth token fetch, payment status query); retries fire on
 *       transport failures/timeouts, never on provider business rejections.</li>
 * </ul>
 *
 * <p>An open circuit is surfaced as a {@link ResourceAccessException} (a {@code RestClientException}),
 * so each provider's existing transport-error handling treats an unhealthy provider as a transient
 * failure and degrades gracefully — no provider catch blocks need to change.
 */
@Component
public class ProviderResilience {

    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final RetryRegistry retryRegistry;

    public ProviderResilience() {
        CircuitBreakerConfig circuitBreakerConfig = CircuitBreakerConfig.custom()
                .slidingWindowType(SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(20)
                .minimumNumberOfCalls(10)
                .failureRateThreshold(50.0f)
                .slowCallRateThreshold(80.0f)
                .slowCallDurationThreshold(Duration.ofSeconds(15))
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .build();
        this.circuitBreakerRegistry = CircuitBreakerRegistry.of(circuitBreakerConfig);

        RetryConfig retryConfig = RetryConfig.custom()
                .maxAttempts(3)
                .intervalFunction(IntervalFunction.ofExponentialBackoff(Duration.ofMillis(300), 2.0))
                .retryExceptions(ResourceAccessException.class)
                .build();
        this.retryRegistry = RetryRegistry.of(retryConfig);
    }

    /** Circuit-breaker protection only. Safe for non-idempotent calls (e.g. payment initiation). */
    public <T> T protect(String name, Supplier<T> action) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker(name);
        try {
            return circuitBreaker.executeSupplier(action);
        } catch (CallNotPermittedException open) {
            throw providerUnavailable(name, open);
        }
    }

    /**
     * Circuit-breaker plus bounded retry with exponential backoff. Only for IDEMPOTENT calls (token
     * fetch, status query) — never payment initiation, to avoid double execution.
     */
    public <T> T protectIdempotent(String name, Supplier<T> action) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker(name);
        Retry retry = retryRegistry.retry(name);
        Supplier<T> guarded = Retry.decorateSupplier(retry, CircuitBreaker.decorateSupplier(circuitBreaker, action));
        try {
            return guarded.get();
        } catch (CallNotPermittedException open) {
            throw providerUnavailable(name, open);
        }
    }

    /** Current circuit state name (CLOSED/OPEN/HALF_OPEN) for a provider — used for tests/ops. */
    public String circuitState(String name) {
        return circuitBreakerRegistry.circuitBreaker(name).getState().name();
    }

    private ResourceAccessException providerUnavailable(String name, CallNotPermittedException open) {
        return new ResourceAccessException(
                "Provider '" + name + "' is temporarily unavailable (circuit open).",
                new IOException(open));
    }
}
