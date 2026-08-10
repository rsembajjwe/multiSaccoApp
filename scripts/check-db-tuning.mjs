import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const prod = await readFile(new URL("backend-java/src/main/resources/application-prod.properties", root), "utf8");
const docs = await readFile(new URL("docs/database-performance.md", root), "utf8");

const checks = [
  [prod, "spring.datasource.hikari.maximum-pool-size=${SACCO_DB_POOL_MAX_SIZE:20}", "max pool size"],
  [prod, "spring.datasource.hikari.minimum-idle=${SACCO_DB_POOL_MIN_IDLE:5}", "minimum idle"],
  [prod, "spring.datasource.hikari.connection-timeout=${SACCO_DB_POOL_CONNECTION_TIMEOUT_MS:30000}", "connection timeout"],
  [prod, "spring.datasource.hikari.idle-timeout=${SACCO_DB_POOL_IDLE_TIMEOUT_MS:600000}", "idle timeout"],
  [prod, "spring.datasource.hikari.max-lifetime=${SACCO_DB_POOL_MAX_LIFETIME_MS:1800000}", "max lifetime"],
  [prod, "spring.datasource.hikari.validation-timeout=${SACCO_DB_POOL_VALIDATION_TIMEOUT_MS:5000}", "validation timeout"],
  [prod, "spring.datasource.hikari.leak-detection-threshold=${SACCO_DB_POOL_LEAK_DETECTION_MS:60000}", "leak detection threshold"],
  [docs, "total_backend_pool = instance_count * SACCO_DB_POOL_MAX_SIZE", "multi-instance pool formula"],
  [docs, "N+1 / Query Review", "N+1 review guidance"],
  [docs, "Hetzner CX22", "small-server tuning guidance"]
];

for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

console.log(`DB tuning contract check passed (${checks.length} markers).`);
