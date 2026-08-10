package com.methaltech.sacco.config;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * A small, dependency-free, thread-safe token-bucket rate limiter facade.
 *
 * <p>The default store is memory, which matches the current single-node deployment. The store
 * boundary is explicit so horizontal scale can move the same caller contract to Redis without
 * changing filters/controllers.
 */
@Component
public class RateLimiter {

    private final RateLimitStore store;

    @Autowired
    public RateLimiter(@Value("${sacco.rate-limit.store:memory}") String storeName) {
        this(storeFor(storeName, System::nanoTime));
    }

    // Visible for testing: lets tests drive virtual time deterministically.
    RateLimiter(LongSupplier nanoClock) {
        this(new InMemoryRateLimitStore(nanoClock));
    }

    RateLimiter(RateLimitStore store) {
        this.store = store;
    }

    /**
     * Attempts to consume a single token for {@code key}.
     *
     * @return {@code true} if the request is allowed, {@code false} if the limit is exceeded.
     */
    public boolean tryAcquire(String key, int capacity, Duration refillPeriod) {
        return store.tryAcquire(key, capacity, refillPeriod);
    }

    private static RateLimitStore storeFor(String storeName, LongSupplier nanoClock) {
        String normalized = storeName == null ? "memory" : storeName.trim().toLowerCase();
        if (normalized.isBlank() || "memory".equals(normalized)) {
            return new InMemoryRateLimitStore(nanoClock);
        }
        if ("redis".equals(normalized)) {
            throw new IllegalStateException(
                    "SACCO_RATE_LIMIT_STORE=redis is configured, but the Redis rate-limit adapter is not implemented yet.");
        }
        throw new IllegalStateException("Unsupported SACCO_RATE_LIMIT_STORE: " + storeName);
    }
}

interface RateLimitStore {
    boolean tryAcquire(String key, int capacity, Duration refillPeriod);
}

class InMemoryRateLimitStore implements RateLimitStore {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier nanoClock;

    InMemoryRateLimitStore(LongSupplier nanoClock) {
        this.nanoClock = nanoClock;
    }

    @Override
    public boolean tryAcquire(String key, int capacity, Duration refillPeriod) {
        if (capacity <= 0) {
            return true;
        }
        if (buckets.size() > CLEANUP_THRESHOLD) {
            evictIdleBuckets();
        }
        long nanosPerToken = Math.max(1L, refillPeriod.toNanos() / capacity);
        Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, nanoClock.getAsLong()));
        return bucket.tryAcquire(capacity, nanosPerToken, nanoClock.getAsLong());
    }

    private void evictIdleBuckets() {
        buckets.forEach((key, bucket) -> {
            if (bucket.isFull()) {
                buckets.remove(key, bucket);
            }
        });
    }

    private static final class Bucket {
        private double tokens;
        private long lastRefillNanos;

        Bucket(int capacity, long now) {
            this.tokens = capacity;
            this.lastRefillNanos = now;
        }

        synchronized boolean tryAcquire(int capacity, long nanosPerToken, long now) {
            refill(capacity, nanosPerToken, now);
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }

        synchronized boolean isFull() {
            return tokens >= 0.999;
        }

        private void refill(int capacity, long nanosPerToken, long now) {
            long elapsed = now - lastRefillNanos;
            if (elapsed <= 0) {
                return;
            }
            double refilled = (double) elapsed / (double) nanosPerToken;
            if (refilled > 0) {
                tokens = Math.min(capacity, tokens + refilled);
                lastRefillNanos = now;
            }
        }
    }
}
