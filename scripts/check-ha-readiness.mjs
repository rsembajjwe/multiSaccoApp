import { readFile } from "node:fs/promises";

const files = {
  runbook: "docs/high-availability.md",
  prodProperties: "backend-java/src/main/resources/application-prod.properties",
  validator: "backend-java/src/main/java/com/methaltech/sacco/config/ScaleReadinessValidator.java",
  validatorTest: "backend-java/src/test/java/com/methaltech/sacco/config/ScaleReadinessValidatorTest.java",
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
  [contents.prodProperties, "sacco.redis.url=${SACCO_REDIS_URL:}", "prod properties expose Redis URL"],
  [contents.validator, "expectedBackendInstances > 1", "startup guard detects multi-instance mode"],
  [contents.validator, "SACCO_RATE_LIMIT_STORE=redis", "startup guard requires Redis rate-limit store"],
  [contents.validator, "SACCO_IDEMPOTENCY_STORE=redis", "startup guard requires Redis idempotency store"],
  [contents.validator, "SACCO_REDIS_URL", "startup guard requires Redis URL"],
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
