import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "backup-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `backup-evidence-${stamp}.md`);

const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm.cmd", "run", "backup:rehearse"]
  : ["run", "backup:rehearse"];

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

console.log(`Backup evidence written to ${reportPath}`);
if ((result.status ?? 1) !== 0) {
  console.error("Backup evidence failed.");
  process.exit(result.status ?? 1);
}
console.log("Backup evidence check passed.");

function renderReport(run) {
  return [
    "# Tereka Online Backup Restore Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    `- Backup restore rehearsal: ${run.status === 0 ? "PASS" : "FAIL"}`,
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
