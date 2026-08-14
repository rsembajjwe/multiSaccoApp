import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "release-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `release-evidence-pack-${stamp}.md`);

const checks = [
  ["Deployment contract", "scripts/check-deployment-contract.mjs"],
  ["Staging handoff contract", "scripts/check-staging-handoff-contract.mjs"],
  ["Incident readiness contract", "scripts/check-incident-readiness.mjs"],
  ["Compliance readiness contract", "scripts/check-compliance-readiness.mjs"],
  ["Disaster recovery contract", "scripts/check-disaster-recovery.mjs"],
  ["Secrets management contract", "scripts/check-secrets-management.mjs"],
  ["Database tuning contract", "scripts/check-db-tuning.mjs"],
  ["HA readiness contract", "scripts/check-ha-readiness.mjs"],
  ["Data protection contract", "scripts/check-data-protection.mjs"],
  ["Vite readiness contract", "scripts/check-vite-readiness.mjs"],
  ["i18n contract", "scripts/check-i18n-contracts.mjs"],
  ["Accessibility contract", "scripts/check-accessibility-contracts.mjs"],
  ["Repository hygiene contract", "scripts/check-repo-hygiene.mjs"],
].map(([name, script]) => ({
  name,
  command: process.execPath,
  args: [script],
}));

const results = checks.map(runCheck);
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`Release evidence pack written to ${reportPath}`);
if (failed.length > 0) {
  console.error(`Release evidence pack failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("Release evidence pack checks passed.");

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
    "# Tereka Online Release Evidence Pack",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : "FAIL"}`),
    "",
    "## Local Scope",
    "",
    "- Confirms documented release contracts for deployment, staging handoff, incident readiness, compliance readiness, DR, secrets, database tuning, HA, data protection, Vite, i18n, accessibility, and repository hygiene.",
    "- Gives a release owner one timestamped local evidence pack before hosted staging or production handoff.",
    "- Does not replace heavy gates such as `npm.cmd run ready:check`, `npm.cmd run backup:evidence`, `npm.cmd run ha:evidence`, `npm.cmd run load:evidence`, or hosted `npm.cmd run deploy:evidence` with real staging variables.",
    "- Does not prove third-party provider credentials, live mobile-money settlement, bank integration, external UAT, pen-test sign-off, or legal/regulatory approval.",
    "",
    "## Hosted Evidence Still Required",
    "",
    "- `tereka.online` DNS and HTTPS certificate evidence.",
    "- Hosted UI and Java API health evidence.",
    "- Managed production/staging secrets and rotation evidence.",
    "- Hosted PostgreSQL backup/PITR restore evidence.",
    "- Hosted Redis and load-balancer failover evidence.",
    "- Staging load/soak evidence using realistic SACCO data.",
    "- External UAT, security audit, legal, and regulatory sign-off.",
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
