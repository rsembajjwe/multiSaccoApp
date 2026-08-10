package com.methaltech.sacco.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RedisSharedStateSmokeTest {

    @Test
    void rateLimitAndIdempotencyStateIsSharedThroughRedis() {
        String redisUrl = System.getProperty("sacco.redis.url", "");
        assumeTrue(!redisUrl.isBlank(), "Set -Dsacco.redis.url=redis://host:port/db to run this Redis smoke test.");

        String key = "ha-smoke-" + UUID.randomUUID();

        RateLimitStore firstLimiter = new RedisFixedWindowRateLimitStore(new RespRedisRateLimitCommands(redisUrl));
        RateLimitStore secondLimiter = new RedisFixedWindowRateLimitStore(new RespRedisRateLimitCommands(redisUrl));
        assertTrue(firstLimiter.tryAcquire(key + ":rate", 1, Duration.ofSeconds(30)));
        assertFalse(secondLimiter.tryAcquire(key + ":rate", 1, Duration.ofSeconds(30)));

        IdempotencyStore firstIdempotency = new RedisIdempotencyStore(new RespRedisIdempotencyCommands(redisUrl));
        IdempotencyStore secondIdempotency = new RedisIdempotencyStore(new RespRedisIdempotencyCommands(redisUrl));
        assertTrue(firstIdempotency.reserve(key + ":idempotency", Duration.ofSeconds(30)));
        assertFalse(secondIdempotency.reserve(key + ":idempotency", Duration.ofSeconds(30)));
    }
}
