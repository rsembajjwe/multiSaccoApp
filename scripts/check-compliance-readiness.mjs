import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  compliance: await readFile(new URL("docs/compliance-readiness.md", root), "utf8"),
  dataProtection: await readFile(new URL("docs/data-protection.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  handoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
};

const checks = [
  [files.compliance, "not legal advice", "compliance checklist has legal-advice boundary"],
  [files.compliance, "country-specific addendum", "compliance checklist requires country addendum"],
  [files.compliance, "## Data Protection Evidence", "compliance checklist has data-protection section"],
  [files.compliance, "Lawful basis", "compliance checklist covers lawful basis"],
  [files.compliance, "Privacy notice", "compliance checklist covers privacy notice"],
  [files.compliance, "Subject-access", "compliance checklist covers data subject requests"],
  [files.compliance, "DPO or data-protection owner", "compliance checklist requires data-protection owner"],
  [files.compliance, "Breach/incident notification procedure", "compliance checklist covers breach procedure"],
  [files.compliance, "Cross-border data-transfer review", "compliance checklist covers provider/hosting transfers"],
  [files.compliance, "## SACCO And Regulatory Evidence", "compliance checklist has SACCO regulatory section"],
  [files.compliance, "UMRA, Bank of Uganda", "compliance checklist covers Uganda SACCO regulator review"],
  [files.compliance, "Maker-checker policy", "compliance checklist covers financial control policy"],
  [files.compliance, "Interest, fees, penalties, arrears", "compliance checklist covers credit policy"],
  [files.compliance, "Regulator-facing report review", "compliance checklist covers reporting review"],
  [files.compliance, "## Payment And Provider Evidence", "compliance checklist has payment/provider section"],
  [files.compliance, "SACCO-owned bank and mobile-money collection accounts", "compliance checklist covers SACCO-owned settlement"],
  [files.compliance, "Provider merchant/KYC approval documents", "compliance checklist covers provider onboarding"],
  [files.compliance, "Callback signing, idempotency, reconciliation", "compliance checklist covers payment controls"],
  [files.compliance, "money flows to the SACCO, not the platform", "compliance checklist covers settlement ownership"],
  [files.compliance, "## Legal Documents", "compliance checklist has legal documents section"],
  [files.compliance, "Platform Terms of Service", "compliance checklist covers terms"],
  [files.compliance, "Privacy Policy", "compliance checklist covers privacy policy"],
  [files.compliance, "Data-processing agreement", "compliance checklist covers DPA"],
  [files.compliance, "Member-facing payment disclaimer", "compliance checklist covers member payment disclaimer"],
  [files.compliance, "## Sign-Off", "compliance checklist has sign-off section"],
  [files.compliance, "Do not approve production release", "compliance checklist has release blocker rule"],
  [files.dataProtection, "Country compliance baseline", "data-protection runbook has country compliance baseline"],
  [files.dataProtection, "Incident response and breach-notification procedure", "data-protection runbook covers breach notification"],
  [files.release, "Compliance readiness", "release evidence template includes compliance gate"],
  [files.staging, "Compliance readiness", "staging readiness includes compliance gate"],
  [files.handoff, "UAT scripts are shared with testers", "handoff checklist covers tester scripts"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Compliance readiness check failed:\n${failures.join("\n")}`);
}

console.log(`Compliance readiness check passed (${checks.length} markers).`);
