import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "type-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `type-evidence-${stamp}.md`);

const checks = [
  {
    name: "SPA TypeScript checkJs gate",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "type:ui"]
      : ["run", "type:ui"],
  },
  {
    name: "SPA type contract markers",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "type:check"]
      : ["run", "type:check"],
  },
  {
    name: "Strict TypeScript domain module",
    command: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm",
    args: process.platform === "win32"
      ? ["/d", "/s", "/c", "npm.cmd", "run", "type:src"]
      : ["run", "type:src"],
  },
];

const results = checks.map(runCheck);
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results));

console.log(`Type-safety evidence written to ${reportPath}`);
if (failed.length > 0) {
  console.error(`Type-safety evidence failed: ${failed.map((result) => result.name).join(", ")}`);
  process.exit(1);
}
console.log("Type-safety evidence checks passed.");

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
    "# Tereka Online Type-Safety Evidence",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    ...results.map((result) => `- ${result.name}: ${result.status === 0 ? "PASS" : "FAIL"}`),
    "",
    "## Scope",
    "",
    "- Confirms the SPA passes the TypeScript `checkJs` gate in `tsconfig.ui.json`.",
    "- Confirms the strict TypeScript source boundary in `src/types/domain.ts` passes `tsconfig.src.json`.",
    "- Confirms stricter TypeScript options, key domain declarations and global-state type wiring are still present.",
    "- Confirms shared declarations cover runtime state, member portal, platform/SACCO admin, operations, integration, reconciliation, and regulatory-report data contracts.",
    "- Does not mean the frontend has completed native TypeScript source conversion or ES module migration.",
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
