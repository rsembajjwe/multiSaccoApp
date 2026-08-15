import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  decision: await readFile(new URL("docs/pilot-launch-decision.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  handoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
  uat: await readFile(new URL("docs/uat-findings-template.md", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
};

const checks = [
  [files.decision, "## Decision Inputs", "launch decision has input section"],
  [files.decision, "Release evidence pack from `npm.cmd run release:evidence`", "launch decision includes release evidence"],
  [files.decision, "Hosted staging handoff checklist", "launch decision includes staging handoff"],
  [files.decision, "Hosted operations evidence", "launch decision includes hosted operations evidence"],
  [files.decision, "Provider sandbox readiness evidence", "launch decision includes provider evidence"],
  [files.decision, "Migration evidence for pilot SACCO data", "launch decision includes migration evidence"],
  [files.decision, "UAT findings tracker and role sign-off", "launch decision includes UAT sign-off"],
  [files.decision, "Security audit readiness or final penetration-test report", "launch decision includes security audit path"],
  [files.decision, "Accessibility audit readiness or final WCAG audit report", "launch decision includes accessibility audit path"],
  [files.decision, "Compliance readiness and legal/regulatory owner sign-off", "launch decision includes compliance sign-off"],
  [files.decision, "## Go/No-Go Owners", "launch decision has owners section"],
  [files.decision, "Provider owner", "launch decision has provider owner"],
  [files.decision, "UAT owner", "launch decision has UAT owner"],
  [files.decision, "Proceed to supervised pilot", "launch decision defines pilot rule"],
  [files.decision, "Proceed to production launch", "launch decision defines production rule"],
  [files.decision, "Only P2/P3 findings may be accepted", "launch decision limits accepted findings"],
  [files.decision, "unaccepted P0/P1 finding", "launch decision blocks severe findings"],
  [files.decision, "No rollback owner, restore owner, or incident contact is named", "launch decision blocks missing owners"],
  [files.release, "## Release Decision", "release template has decision section"],
  [files.release, "Approved with accepted findings", "release template supports accepted findings"],
  [files.staging, "Release evidence and findings tracker are completed", "staging checklist requires release evidence"],
  [files.handoff, "No unaccepted P0/P1 findings remain", "handoff blocks severe findings"],
  [files.uat, "acceptance owner", "UAT tracker records acceptance owner"],
  [files.packageJson, "\"pilot:launch-check\"", "package exposes pilot launch command"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Pilot launch decision check failed:\n${failures.join("\n")}`);
}

console.log(`Pilot launch decision check passed (${checks.length} markers).`);
