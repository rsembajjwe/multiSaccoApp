import { readFile } from "node:fs/promises";

const files = {
  runbook: "docs/high-availability.md",
  prodProperties: "backend-java/src/main/resources/application-prod.properties",
  validator: "backend-java/src/main/java/com/methaltech/sacco/config/ScaleReadinessValidator.java",
  validatorTest: "backend-java/src/test/java/com/methaltech/sacco/config/ScaleReadinessValidatorTest.java",
  rateLimiter: "backend-java/src/main/java/com/methaltech/sacco/config/RateLimiter.java",
  rateLimiterTest: "backend-java/src/test/java/com/methaltech/sacco/config/RateLimiterTest.java",
  idempotencyGuard: "backend-java/src/main/java/com/methaltech/sacco/config/IdempotencyGuard.java",
  idempotencyGuardTest: "backend-java/src/test/java/com/methaltech/sacco/config/IdempotencyGuardTest.java",
};

const contents = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file, "utf8")]))
);

const checks = [
  [contents.runbook, "RPO", "HA runbook defines recovery point target"],
  [contents.runbook, "RTO", "HA runbook defines recovery time target"],
  [contents.runbook, "load balancer", "HA runbook covers load balancing"],
  [contents.runbook, "point-in-time recovery", "HA runbook covers PostgreSQL PITR"],
  [contents.runbook, "Redis", "HA runbook covers shared Redis state"],
  [contents.runbook, "failover rehearsal", "HA runbook covers failover rehearsal"],
  [contents.prodProperties, "sacco.scale.expected-backend-instances=${SACCO_EXPECTED_BACKEND_INSTANCES:1}", "prod properties expose expected backend instances"],
  [contents.prodProperties, "sacco.rate-limit.store=${SACCO_RATE_LIMIT_STORE:memory}", "prod properties expose rate-limit store"],
  [contents.prodProperties, "sacco.idempotency.store=${SACCO_IDEMPOTENCY_STORE:memory}", "prod properties expose idempotency store"],
  [contents.prodProperties, "sacco.idempotency.ttl=${SACCO_IDEMPOTENCY_TTL:PT24H}", "prod properties expose idempotency ttl"],
  [contents.prodProperties, "sacco.redis.url=${SACCO_REDIS_URL:}", "prod properties expose Redis URL"],
  [contents.validator, "expectedBackendInstances > 1", "startup guard detects multi-instance mode"],
  [contents.validator, "SACCO_RATE_LIMIT_STORE=redis", "startup guard requires Redis rate-limit store"],
  [contents.validator, "SACCO_IDEMPOTENCY_STORE=redis", "startup guard requires Redis idempotency store"],
  [contents.validator, "SACCO_REDIS_URL", "startup guard requires Redis URL"],
  [contents.rateLimiter, "interface RateLimitStore", "rate limiter has a shared-store boundary"],
  [contents.rateLimiter, "InMemoryRateLimitStore", "rate limiter keeps current single-node memory store"],
  [contents.rateLimiter, "RedisFixedWindowRateLimitStore", "rate limiter has Redis shared-store implementation"],
  [contents.rateLimiter, "INCREMENT_WITH_TTL", "rate limiter uses one Redis script for counter and expiry"],
  [contents.rateLimiterTest, "redisStoreUsesSharedCommandCounter", "rate limiter test covers Redis shared-store path"],
  [contents.idempotencyGuard, "interface IdempotencyStore", "idempotency guard has a shared-store boundary"],
  [contents.idempotencyGuard, "InMemoryIdempotencyStore", "idempotency guard keeps current single-node memory store"],
  [contents.idempotencyGuard, "RedisIdempotencyStore", "idempotency guard has Redis shared-store implementation"],
  [contents.idempotencyGuard, "SACCO_IDEMPOTENCY_STORE=redis requires SACCO_REDIS_URL", "idempotency Redis store fails fast without Redis URL"],
  [contents.idempotencyGuardTest, "redisStoreUsesSharedSetIfAbsentCommand", "idempotency guard test covers Redis shared-store path"],
  [contents.validatorTest, "productionRejectsMultiInstanceWithoutRedisStore", "validator test rejects missing Redis store"],
  [contents.validatorTest, "productionRejectsMultiInstanceWithoutSharedIdempotencyStore", "validator test rejects missing shared idempotency store"],
  [contents.validatorTest, "productionAllowsMultiInstanceWithRedisConfiguration", "validator test allows complete Redis configuration"],
];

for (const [source, marker, label] of checks) {
  if (!source.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

console.log(`HA readiness contract check passed (${checks.length} markers).`);
