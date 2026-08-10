import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "vite-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `vite-evidence-${stamp}.md`);

const checks = [
  {
    name: "Vite readiness",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "vite:check"]
      : ["run", "vite:check"],
  },
  {
    name: "Vite bridge build",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "build:vite"]
      : ["run", "build:vite"],
  },
];

const results = checks.map(runCheck);
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`Vite evidence written to ${reportPath}`);
if (failed.length > 0) {
  console.error(`Vite evidence failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("Vite evidence checks passed.");

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
    "# Tereka Online Vite Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : "FAIL"}`),
    "",
    "## Scope",
    "",
    "- Confirms Vite is installed and the bridge configuration is present.",
    "- Confirms the current classic-script bridge can build `dist-vite/`.",
    "- Does not mean the SPA has completed ES module import/export conversion yet.",
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
