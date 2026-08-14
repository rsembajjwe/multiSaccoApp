import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "backup-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `backup-evidence-${stamp}.md`);

const checks = [
  {
    name: "Disaster recovery contract",
    command: process.execPath,
    args: ["scripts/check-disaster-recovery.mjs"],
  },
  {
    name: "Docker availability",
    run: checkDockerAvailability,
  },
  {
    name: "Backup restore rehearsal",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "backup:rehearse"]
      : ["run", "backup:rehearse"],
  },
];

const results = [];
let dockerAvailable = true;
for (const check of checks) {
  if (check.name === "Backup restore rehearsal" && !dockerAvailable) {
    results.push(skippedCheck(check, "Skipped because Docker engine is not reachable in this environment."));
    continue;
  }
  const result = runCheck(check);
  results.push(result);
  if (check.name === "Docker availability" && result.status !== 0) {
    dockerAvailable = false;
  }
}
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`Backup evidence written to ${reportPath}`);
const blockingFailures = failed.filter((result) => !result.optional);
if (blockingFailures.length > 0) {
  console.error(`Backup evidence failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("Backup evidence check passed.");

function runCheck(check) {
  const startedAt = new Date();
  const result = check.run
    ? check.run()
    : spawnSync(check.command, check.args, {
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
  const now = new Date();
  console.log(`SKIP ${check.name}: ${reason}`);
  return {
    ...check,
    startedAt: now,
    endedAt: now,
    status: 1,
    stdout: `SKIP ${reason}`,
    stderr: "",
    error: "",
    optional: true,
  };
}

function checkDockerAvailability() {
  const result = spawnSync("docker", ["info"], {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf8",
    timeout: 20000,
  });
  if ((result.status ?? 1) === 0) {
    return {
      status: 0,
      stdout: "Docker engine is reachable.",
      stderr: result.stderr || "",
    };
  }
  return {
    status: 1,
    stdout: "",
    stderr: result.stderr || result.stdout || "Docker engine is not reachable.",
    optional: true,
  };
}

function renderReport(results) {
  return [
    "# Tereka Online Backup Restore Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : result.optional ? "SKIPPED/BLOCKED" : "FAIL"}`),
    "",
    "## Scope",
    "",
    "- Confirms the disaster recovery runbook defines RPO/RTO targets, restore-owner evidence, local rehearsal, hosted restore, emergency recovery, and release-gate controls.",
    "- Runs the disposable PostgreSQL backup/restore rehearsal when Docker is available.",
    "- Confirms the rehearsal creates a marker row, backs it up, drops it, restores it, and verifies the marker row returned.",
    "- Does not prove managed PostgreSQL PITR or off-server backup storage; that remains hosted deployment evidence.",
    "",
    "## Checks",
    "",
    ...results.flatMap((result) => [
      `### ${result.name}`,
      "",
      `Command: \`${result.command ? [result.command, ...(result.args || [])].join(" ") : "internal check"}\``,
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
