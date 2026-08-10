package com.methaltech.sacco.config;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.stereotype.Component;

/**
 * A small, dependency-free, thread-safe token-bucket rate limiter kept in memory.
 *
 * <p>It matches the current single-node deployment; when the platform scales horizontally the same
 * interface can be backed by a shared store (e.g. Redis) without changing callers. Each key gets its
 * own bucket that refills smoothly to {@code capacity} over {@code refillPeriod}. Idle full buckets
 * are evicted opportunistically so memory stays bounded under many distinct keys (e.g. per-IP).
 */
@Component
public class RateLimiter {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final LongSupplier nanoClock;

    public RateLimiter() {
        this(System::nanoTime);
    }

    // Visible for testing: lets tests drive virtual time deterministically.
    RateLimiter(LongSupplier nanoClock) {
        this.nanoClock = nanoClock;
    }

    /**
     * Attempts to consume a single token for {@code key}.
     *
     * @return {@code true} if the request is allowed, {@code false} if the limit is exceeded.
     */
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
