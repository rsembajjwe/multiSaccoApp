import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "ha-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `ha-evidence-${stamp}.md`);

const checks = [
  {
    name: "HA readiness contract",
    command: process.execPath,
    args: ["scripts/check-ha-readiness.mjs"],
  },
  {
    name: "Docker engine availability",
    command: "docker",
    args: ["info", "--format", "{{.ServerVersion}}"],
  },
  {
    name: "Redis shared-state smoke",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args:
      process.platform === "win32"
        ? ["/d", "/s", "/c", "npm.cmd", "run", "ha:redis-check"]
        : ["run", "ha:redis-check"],
  },
];

const results = [];
for (const check of checks) {
  if (check.name === "Redis shared-state smoke" && results.some((result) => result.name === "Docker engine availability" && result.status !== 0)) {
    results.push(skippedCheck(check, "Docker engine is not running. Start Docker Desktop, then rerun npm.cmd run ha:evidence."));
    continue;
  }
  results.push(runCheck(check));
}
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`HA evidence written to ${reportPath}`);
const blockingFailures = failed.filter((result) => !result.optional);
if (blockingFailures.length > 0) {
  console.error(`HA evidence failed: ${blockingFailures.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("HA evidence checks passed.");

function runCheck(check) {
  const startedAt = new Date();
  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
  });
  const endedAt = new Date();

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    ...check,
    startedAt,
    endedAt,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error ? result.error.message : "",
    optional: Boolean(check.optional || result.optional),
  };
}

function skippedCheck(check, reason) {
  const timestamp = new Date();
  console.log(`SKIP ${check.name}: ${reason}`);
  return {
    ...check,
    startedAt: timestamp,
    endedAt: timestamp,
    status: 1,
    stdout: `SKIP ${reason}`,
    stderr: "",
    error: `Skipped: ${reason}`,
    optional: true,
  };
}

function renderReport(results) {
  return [
    "# Tereka Online HA Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : result.optional ? "SKIPPED/BLOCKED" : "FAIL"}`),
    "",
    "## Scope",
    "",
    "- Confirms the static HA readiness contract for small and enterprise deployment modes.",
    "- Confirms Docker availability before running Redis-dependent evidence.",
    "- Confirms Redis-backed shared state for rate limits and idempotency with `RedisSharedStateSmokeTest` when Docker is available.",
    "- Does not prove a hosted load balancer, multi-instance kill test, or managed Redis failover; that remains hosted deployment evidence.",
    "",
    "## Checks",
    "",
    ...results.flatMap((result) => [
      `### ${result.name}`,
      "",
      `Command: \`${[result.command, ...result.args].join(" ")}\``,
      `Started: ${result.startedAt.toISOString()}`,
      `Finished: ${result.endedAt.toISOString()}`,
      `Exit code: ${result.status}`,
      "",
      "```text",
      [result.stdout.trim(), result.stderr.trim(), result.error.trim()].filter(Boolean).join("\n"),
      "```",
      "",
    ]),
  ].join("\n");
}
