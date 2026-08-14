import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "accessibility-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `accessibility-evidence-${stamp}.md`);

const checks = [
  {
    name: "Accessibility contract",
    command: process.execPath,
    args: ["scripts/check-accessibility-contracts.mjs"],
  },
];

const results = checks.map(runCheck);
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`Accessibility evidence written to ${reportPath}`);
if (failed.length > 0) {
  console.error(`Accessibility evidence failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("Accessibility evidence checks passed.");

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
    "# Tereka Online Accessibility Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : "FAIL"}`),
    "",
    "## Scope",
    "",
    "- Confirms login and authenticated skip links.",
    "- Confirms named navigation landmarks and current-page markers.",
    "- Confirms accessible topbar menu labels.",
    "- Confirms auth errors use assertive live regions.",
    "- Confirms field helper text is linked to inputs with aria-describedby.",
    "- Confirms visible keyboard focus styling.",
    "- Confirms reduced-motion support and coarse-pointer touch target sizing.",
    "- Does not replace a manual WCAG 2.1 AA screen-reader, contrast, and keyboard audit.",
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
