import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "load-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `load-evidence-${stamp}.md`);

const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm.cmd", "run", "load:test"]
  : ["run", "load:test"];

const startedAt = new Date();
const result = spawnSync(command, args, {
  cwd: repoRoot,
  env: process.env,
  encoding: "utf8",
});
const endedAt = new Date();

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport({
  command,
  args,
  startedAt,
  endedAt,
  status: result.status ?? 1,
  stdout: result.stdout || "",
  stderr: result.stderr || "",
  error: result.error ? result.error.message : "",
}));

console.log(`Load evidence written to ${reportPath}`);
if ((result.status ?? 1) !== 0) {
  console.error("Load evidence failed.");
  process.exit(result.status ?? 1);
}
console.log("Load evidence check passed.");

function renderReport(run) {
  return [
    "# Tereka Online Load Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    `- Load test: ${run.status === 0 ? "PASS" : "FAIL"}`,
    "",
    "## Configuration",
    "",
    `- LOAD_BASE_URL: ${process.env.LOAD_BASE_URL || "http://127.0.0.1:8080"}`,
    `- LOAD_REQUESTS: ${process.env.LOAD_REQUESTS || "100"}`,
    `- LOAD_CONCURRENCY: ${process.env.LOAD_CONCURRENCY || "10"}`,
    `- LOAD_P95_MS: ${process.env.LOAD_P95_MS || "1000"}`,
    `- LOAD_P99_MS: ${process.env.LOAD_P99_MS || "2000"}`,
    `- LOAD_LOGIN_CODE: ${process.env.LOAD_LOGIN_CODE || "PLATFORM"}`,
    `- LOAD_LOGIN_USERNAME: ${process.env.LOAD_LOGIN_USERNAME || process.env.LOAD_LOGIN_EMAIL || "admin@platform.local"}`,
    "",
    "## Check",
    "",
    `Command: \`${[run.command, ...run.args].join(" ")}\``,
    `Started: ${run.startedAt.toISOString()}`,
    `Finished: ${run.endedAt.toISOString()}`,
    `Exit code: ${run.status}`,
    "",
    "```text",
    [run.stdout.trim(), run.stderr.trim(), run.error.trim()].filter(Boolean).join("\n"),
    "```",
    "",
  ].join("\n");
}
