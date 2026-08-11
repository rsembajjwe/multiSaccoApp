import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportDir = join(repoRoot, "reports", "type-evidence");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const reportPath = join(reportDir, `type-evidence-${stamp}.md`);
const remainingClassicBridgeHelpers = [
  { file: "app.core.js", marker: "function filterRows(rows)", purpose: "global table filtering by current search text" },
  { file: "app.core.js", marker: "function tableStateKey(title)", purpose: "stable table state key generation" },
  { file: "app.users.js", marker: "function userRoleOptions(platformOnly)", purpose: "role filtering for platform/SACCO user-management forms" },
  { file: "app.transactions.js", marker: "function transactionRows()", purpose: "shared transaction display rows for transactions, approvals, and performance" },
  { file: "app.operations.js", marker: "function notificationProviderRiskRows()", purpose: "shared notification-provider risk rows for operations/settings alerts" },
  { file: "app.operations.js", marker: "function loginRiskEvents()", purpose: "shared login-risk events for operations and audit/reporting views" },
];

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

const bridgeInventory = remainingClassicBridgeHelpers.map(readBridgeMarker);
const results = checks.map(runCheck);
const missingBridgeMarkers = bridgeInventory.filter((item) => !item.present);
const failed = results.filter((result) => result.status !== 0);

mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, renderReport(results, bridgeInventory));

console.log(`Type-safety evidence written to ${reportPath}`);
if (failed.length > 0 || missingBridgeMarkers.length > 0) {
  if (failed.length > 0) console.error(`Type-safety evidence failed: ${failed.map((result) => result.name).join(", ")}`);
  if (missingBridgeMarkers.length > 0) console.error(`Bridge inventory failed: ${missingBridgeMarkers.map((item) => item.marker).join(", ")}`);
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

function renderReport(results, bridgeInventory) {
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
    "## Remaining Classic Bridge Inventory",
    "",
    "These helpers are still intentionally global while the classic scripts are converted to ES modules:",
    "",
    ...bridgeInventory.map((item) => `- ${item.present ? "PASS" : "FAIL"}: \`${item.marker}\` in \`${item.file}\` - ${item.purpose}`),
    "",
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

function readBridgeMarker(item) {
  const source = readFileSync(join(repoRoot, item.file), "utf8");
  return {
    ...item,
    present: source.includes(item.marker),
  };
}
