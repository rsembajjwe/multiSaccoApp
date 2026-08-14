import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "secrets-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `secrets-evidence-${stamp}.md`);

const checks = [
  {
    name: "Secrets management contract",
    command: process.execPath,
    args: ["scripts/check-secrets-management.mjs"],
  },
];

const results = checks.map(runCheck);
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`Secrets evidence written to ${reportPath}`);
if (failed.length > 0) {
  console.error(`Secrets evidence failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("Secrets evidence checks passed.");

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
  };
}

function renderReport(results) {
  return [
    "# Tereka Online Secrets Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : "FAIL"}`),
    "",
    "## Scope",
    "",
    "- Scans deployment example files for committed real-looking secret values.",
    "- Confirms the secrets runbook still documents rotation and emergency rotation.",
    "- Confirms the production secrets inventory covers required database, PII, bootstrap, notification, mobile-money, callback, and Redis secret names.",
    "- Confirms the staging guide documents required hosted-environment secret names.",
    "- Confirms production secret/provider readiness validators remain documented.",
    "- Does not prove a hosted Vault/KMS/secret-manager connection; that remains deployment evidence.",
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
