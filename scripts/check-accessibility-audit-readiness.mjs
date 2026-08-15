import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  audit: await readFile(new URL("docs/accessibility-audit-readiness.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
  staticCheck: await readFile(new URL("scripts/check-accessibility-contracts.mjs", root), "utf8"),
  browserCheck: await readFile(new URL("scripts/check-browser-accessibility.mjs", root), "utf8"),
};

const checks = [
  [files.audit, "not a substitute for an external WCAG audit", "audit readiness keeps external-audit boundary"],
  [files.audit, "WCAG 2.1 AA", "audit readiness names WCAG target"],
  [files.audit, "## Audit Scope", "audit readiness has scope"],
  [files.audit, "Login and password recovery", "audit readiness covers login"],
  [files.audit, "Public SACCO registration", "audit readiness covers public registration"],
  [files.audit, "Platform admin dashboards", "audit readiness covers platform admin"],
  [files.audit, "SACCO staff dashboards", "audit readiness covers SACCO staff"],
  [files.audit, "Member portal balances", "audit readiness covers member portal"],
  [files.audit, "Keyboard-only navigation", "audit readiness covers keyboard"],
  [files.audit, "Screen-reader smoke test", "audit readiness covers screen reader"],
  [files.audit, "Contrast review", "audit readiness covers contrast"],
  [files.audit, "200% zoom", "audit readiness covers zoom"],
  [files.audit, "Touch target review", "audit readiness covers touch targets"],
  [files.audit, "Reduced-motion review", "audit readiness covers reduced motion"],
  [files.audit, "NVDA", "audit readiness covers NVDA"],
  [files.audit, "VoiceOver", "audit readiness covers VoiceOver"],
  [files.audit, "TalkBack", "audit readiness covers TalkBack"],
  [files.audit, "npm.cmd run accessibility:evidence", "audit readiness includes static evidence command"],
  [files.audit, "npm.cmd run accessibility:browser", "audit readiness includes browser evidence command"],
  [files.audit, "Critical accessibility blocker", "audit readiness defines critical blockers"],
  [files.audit, "No Critical or High accessibility findings remain open", "audit readiness defines closure rule"],
  [files.release, "Accessibility audit readiness", "release template includes accessibility audit gate"],
  [files.staging, "Accessibility audit readiness", "staging readiness includes accessibility audit gate"],
  [files.packageJson, "\"accessibility:audit-check\"", "package exposes accessibility audit command"],
  [files.staticCheck, "Accessibility contract check passed", "static accessibility contract remains available"],
  [files.browserCheck, "Browser accessibility checks passed", "browser accessibility journey remains available"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Accessibility audit readiness check failed:\n${failures.join("\n")}`);
}

console.log(`Accessibility audit readiness check passed (${checks.length} markers).`);
