package com.methaltech.sacco.identity;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();
    private final int maxFailures;
    private final Duration window;

    LoginAttemptService(
            @Value("${sacco.auth.rate-limit.max-failures:6}") int maxFailures,
            @Value("${sacco.auth.rate-limit.window-seconds:60}") long windowSeconds) {
        this.maxFailures = maxFailures;
        this.window = Duration.ofSeconds(windowSeconds);
    }

    public boolean isLimited(String key) {
        AttemptWindow attemptWindow = activeWindow(key);
        return attemptWindow.failures >= maxFailures;
    }

    public void recordFailure(String key) {
        Instant now = Instant.now();
        attempts.compute(key, (ignored, existing) -> {
            if (existing == null || existing.expiresAt.isBefore(now)) {
                return new AttemptWindow(1, now.plus(window));
            }
            return new AttemptWindow(existing.failures + 1, existing.expiresAt);
        });
    }

    public void clear(String key) {
        attempts.remove(key);
    }

    public long retryAfterSeconds(String key) {
        AttemptWindow attemptWindow = activeWindow(key);
        if (attemptWindow.failures < maxFailures) return 0;
        return Math.max(1, Duration.between(Instant.now(), attemptWindow.expiresAt).toSeconds());
    }

    private AttemptWindow activeWindow(String key) {
        AttemptWindow attemptWindow = attempts.get(key);
        if (attemptWindow == null) return new AttemptWindow(0, Instant.now());
        if (attemptWindow.expiresAt.isBefore(Instant.now())) {
            attempts.remove(key);
            return new AttemptWindow(0, Instant.now());
        }
        return attemptWindow;
    }

    private record AttemptWindow(int failures, Instant expiresAt) {
    }
}
