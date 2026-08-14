import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  audit: await readFile(new URL("docs/security-audit-readiness.md", root), "utf8"),
  securityReview: await readFile(new URL("docs/security-review.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
};

const checks = [
  [files.audit, "## Audit Scope", "audit readiness has scope section"],
  [files.audit, "Staff login, member login, password reset, MFA", "audit scope covers auth"],
  [files.audit, "Platform/SACCO/member separation", "audit scope covers identity separation"],
  [files.audit, "Role-based access control", "audit scope covers RBAC"],
  [files.audit, "Financial posting, maker-checker approvals", "audit scope covers money controls"],
  [files.audit, "Mobile-money callbacks, signed callback verification", "audit scope covers callbacks"],
  [files.audit, "Bank statement import", "audit scope covers bank imports"],
  [files.audit, "PII masking, National ID encryption", "audit scope covers PII protection"],
  [files.audit, "Browser security headers, CSP, CORS", "audit scope covers browser/API edge"],
  [files.audit, "Docker/Hetzner deployment", "audit scope covers deployment"],
  [files.audit, "## Evidence To Prepare", "audit readiness has evidence section"],
  [files.audit, "npm.cmd run release:evidence", "audit evidence includes release pack"],
  [files.audit, "npm.cmd run security:check", "audit evidence includes security check"],
  [files.audit, "JaCoCo coverage summary", "audit evidence includes coverage"],
  [files.audit, "OpenAPI specification", "audit evidence includes API docs"],
  [files.audit, "never secret values", "audit evidence blocks secret leakage"],
  [files.audit, "## Test Accounts", "audit readiness has test accounts section"],
  [files.audit, "All auditor accounts must be disabled or rotated", "audit readiness covers account cleanup"],
  [files.audit, "## Rules Of Engagement", "audit readiness has rules of engagement"],
  [files.audit, "Allowed attack types", "audit readiness requires allowed test scope"],
  [files.audit, "Backup/restore owner", "audit readiness requires restore owner"],
  [files.audit, "Finding severity model", "audit readiness requires severity model"],
  [files.audit, "## Finding Triage", "audit readiness has triage section"],
  [files.audit, "Cross-SACCO data exposure", "audit triage defines critical tenant exposure"],
  [files.audit, "High findings are closed or explicitly accepted", "audit closure handles high findings"],
  [files.audit, "Temporary auditor accounts are disabled", "audit closure requires account cleanup"],
  [files.securityReview, "No unresolved critical security finding", "security review tracks critical findings"],
  [files.securityReview, "Concrete Pass/Fail Checks", "security review has automated pass/fail checks"],
  [files.release, "Security audit readiness", "release template includes security audit gate"],
  [files.staging, "Security audit readiness", "staging readiness includes security audit gate"],
  [files.packageJson, "\"security:audit-check\"", "package exposes security audit readiness command"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Security audit readiness check failed:\n${failures.join("\n")}`);
}

console.log(`Security audit readiness check passed (${checks.length} markers).`);
