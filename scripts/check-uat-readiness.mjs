import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  scripts: await readFile(new URL("docs/uat-scripts.md", root), "utf8"),
  findings: await readFile(new URL("docs/uat-findings-template.md", root), "utf8"),
  dataSetup: await readFile(new URL("docs/uat-data-setup.md", root), "utf8"),
  handoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
};

const checks = [
  [files.scripts, "## Test Evidence", "UAT scripts require evidence capture"],
  [files.scripts, "Environment URL", "UAT evidence captures environment"],
  [files.scripts, "Build or commit SHA", "UAT evidence captures build"],
  [files.scripts, "## Platform Admin Script", "UAT covers platform admin"],
  [files.scripts, "SACCO Registration", "platform UAT covers registration"],
  [files.scripts, "Subscriptions", "platform UAT covers subscriptions"],
  [files.scripts, "## SACCO Staff Script", "UAT covers SACCO staff"],
  [files.scripts, "Register or update a test member", "SACCO UAT covers member management"],
  [files.scripts, "Maker-checker", "SACCO UAT covers maker-checker"],
  [files.scripts, "Reverse an eligible posted transaction", "SACCO UAT covers reversals"],
  [files.scripts, "Create or review a loan application", "SACCO UAT covers loans"],
  [files.scripts, "## Member Portal Script", "UAT covers member portal"],
  [files.scripts, "Review balance cards", "member UAT covers balances"],
  [files.scripts, "Submit a member loan application", "member UAT covers loan self-service"],
  [files.scripts, "Save an offline complaint draft", "member UAT covers offline drafts"],
  [files.scripts, "Attempt to access another member record", "member UAT covers isolation"],
  [files.scripts, "## Sign-Off", "UAT scripts include sign-off"],
  [files.scripts, "Accepted with finding", "UAT scripts allow explicit accepted findings"],
  [files.findings, "## Severity Policy", "findings template has severity policy"],
  [files.findings, "P0 Blocker", "findings template defines P0"],
  [files.findings, "P1 High", "findings template defines P1"],
  [files.findings, "Accepted findings must name the acceptance owner", "findings template requires accepted owner"],
  [files.findings, "External UAT can start only when all P0 findings are closed", "findings template blocks open P0"],
  [files.dataSetup, "npm.cmd run uat:setup", "UAT data setup command is documented"],
  [files.dataSetup, "npm.cmd run uat:browser", "browser UAT command is documented"],
  [files.dataSetup, "Turn demo logins off again", "UAT data setup documents demo-login cleanup"],
  [files.handoff, "UAT data setup has run", "handoff requires UAT data setup"],
  [files.handoff, "Automated browser UAT has passed", "handoff requires browser UAT"],
  [files.handoff, "Defect capture process is agreed", "handoff requires defect process"],
  [files.release, "UAT Sign-Off", "release evidence includes UAT sign-off"],
  [files.release, "Findings Summary", "release evidence includes findings summary"],
  [files.release, "UAT readiness", "release evidence includes UAT readiness gate"],
  [files.packageJson, "\"uat:readiness\"", "package exposes UAT readiness command"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`UAT readiness check failed:\n${failures.join("\n")}`);
}

console.log(`UAT readiness check passed (${checks.length} markers).`);
