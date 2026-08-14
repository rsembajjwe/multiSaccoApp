import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  load: await readFile(new URL("docs/load-soak-readiness.md", root), "utf8"),
  ha: await readFile(new URL("docs/high-availability.md", root), "utf8"),
  db: await readFile(new URL("docs/database-performance.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
  loadScript: await readFile(new URL("scripts/load-test.mjs", root), "utf8"),
  loadEvidence: await readFile(new URL("scripts/load-evidence.mjs", root), "utf8"),
};

const checks = [
  [files.load, "## Test Environment", "load readiness has environment section"],
  [files.load, "Backend instance count", "load readiness captures backend instance count"],
  [files.load, "Redis/shared-state mode", "load readiness captures Redis mode"],
  [files.load, "PostgreSQL pool size", "load readiness captures DB pool"],
  [files.load, "## Required Commands", "load readiness has required commands"],
  [files.load, "npm.cmd run release:evidence", "load readiness includes release evidence"],
  [files.load, "npm.cmd run db:evidence", "load readiness includes DB evidence"],
  [files.load, "npm.cmd run ha:evidence", "load readiness includes HA evidence"],
  [files.load, "npm.cmd run load:evidence", "load readiness includes load evidence"],
  [files.load, "## Load Scenarios", "load readiness has scenario section"],
  [files.load, "Provider operational evidence", "load readiness covers provider evidence"],
  [files.load, "Member search and paginated member lists", "load readiness covers member search"],
  [files.load, "Transaction lists and payment queues", "load readiness covers transactions"],
  [files.load, "Loan queues and repayment review", "load readiness covers loans"],
  [files.load, "## Targets", "load readiness has target section"],
  [files.load, "100 total requests minimum", "load readiness defines starter request target"],
  [files.load, "10 concurrent users minimum", "load readiness defines starter concurrency"],
  [files.load, "2,000 total requests minimum", "load readiness defines enterprise request target"],
  [files.load, "50 concurrent users minimum", "load readiness defines enterprise concurrency"],
  [files.load, "Run for at least 2 hours", "load readiness defines soak target"],
  [files.load, "## Evidence To Record", "load readiness has evidence fields"],
  [files.load, "p95 latency", "load readiness records p95"],
  [files.load, "Database pool pending count", "load readiness records DB pressure"],
  [files.load, "Provider exception count", "load readiness records provider exceptions"],
  [files.load, "## Blockers", "load readiness has blocker section"],
  [files.load, "post-test health check fails", "load readiness blocks failed post-test health"],
  [files.ha, "Load and soak test evidence", "HA runbook references load/soak evidence"],
  [files.db, "N+1 / Query Review", "DB runbook includes query review"],
  [files.release, "Load/soak readiness", "release template includes load readiness gate"],
  [files.staging, "Load/soak readiness", "staging readiness includes load readiness gate"],
  [files.packageJson, "\"load:readiness\"", "package exposes load readiness command"],
  [files.loadScript, "LOAD_P95_MS", "load test exposes p95 threshold"],
  [files.loadScript, "LOAD_P99_MS", "load test exposes p99 threshold"],
  [files.loadScript, "LOAD_SUMMARY_JSON", "load test emits structured summary"],
  [files.loadEvidence, "reports", "load evidence writes report output"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Load/soak readiness check failed:\n${failures.join("\n")}`);
}

console.log(`Load/soak readiness check passed (${checks.length} markers).`);
