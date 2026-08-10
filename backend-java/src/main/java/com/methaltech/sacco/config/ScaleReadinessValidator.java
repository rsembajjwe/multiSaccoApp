package com.methaltech.sacco.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
class ScaleReadinessValidator implements ApplicationRunner {

    private final boolean demoLoginsEnabled;
    private final int expectedBackendInstances;
    private final String rateLimitStore;
    private final String idempotencyStore;
    private final String redisUrl;

    ScaleReadinessValidator(
            @Value("${sacco.demo-logins.enabled:true}") boolean demoLoginsEnabled,
            @Value("${sacco.scale.expected-backend-instances:1}") int expectedBackendInstances,
            @Value("${sacco.rate-limit.store:memory}") String rateLimitStore,
            @Value("${sacco.idempotency.store:memory}") String idempotencyStore,
            @Value("${sacco.redis.url:}") String redisUrl) {
        this.demoLoginsEnabled = demoLoginsEnabled;
        this.expectedBackendInstances = expectedBackendInstances;
        this.rateLimitStore = rateLimitStore;
        this.idempotencyStore = idempotencyStore;
        this.redisUrl = redisUrl;
    }

    @Override
    public void run(ApplicationArguments args) {
        validate();
    }

    void validate() {
        if (demoLoginsEnabled) {
            return;
        }
        List<String> failures = new ArrayList<>();
        if (expectedBackendInstances < 1) {
            failures.add("SACCO_EXPECTED_BACKEND_INSTANCES must be at least 1");
        }
        if (expectedBackendInstances > 1 && !"redis".equalsIgnoreCase(trim(rateLimitStore))) {
            failures.add("SACCO_RATE_LIMIT_STORE=redis");
        }
        if (expectedBackendInstances > 1 && !"redis".equalsIgnoreCase(trim(idempotencyStore))) {
            failures.add("SACCO_IDEMPOTENCY_STORE=redis");
        }
        if (expectedBackendInstances > 1 && trim(redisUrl).isBlank()) {
            failures.add("SACCO_REDIS_URL");
        }
        if (!failures.isEmpty()) {
            throw new IllegalStateException(
                    "Production multi-instance startup requires shared scale configuration for: "
                            + String.join(", ", failures));
        }
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
