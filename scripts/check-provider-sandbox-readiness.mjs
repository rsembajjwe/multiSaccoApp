import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  provider: await readFile(new URL("docs/provider-sandbox-readiness.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  secrets: await readFile(new URL("docs/secrets-inventory.md", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
  paymentFilter: await readFile(new URL("scripts/check-payment-provider-filtering.mjs", root), "utf8"),
  bankCollection: await readFile(new URL("scripts/check-bank-collection-flow.mjs", root), "utf8"),
};

const checks = [
  [files.provider, "AfroSMS", "provider readiness covers AfroSMS"],
  [files.provider, "Gmail SMTP", "provider readiness covers Gmail SMTP"],
  [files.provider, "SACCO-owned bank collection", "provider readiness covers bank collection"],
  [files.provider, "MTN MoMo", "provider readiness covers MTN MoMo"],
  [files.provider, "Airtel Money", "provider readiness covers Airtel Money"],
  [files.provider, "M-Pesa is not a required launch provider", "provider readiness excludes M-Pesa from required scope"],
  [files.provider, "Provider credentials must come from environment variables or a hosted secret store", "provider readiness blocks hard-coded secrets"],
  [files.provider, "SACCO collection accounts must be SACCO-owned", "provider readiness enforces SACCO-owned settlement"],
  [files.provider, "Callback idempotency", "provider readiness covers callback idempotency"],
  [files.provider, "duplicate ledger posting", "provider readiness covers duplicate posting risk"],
  [files.provider, "Provider timeout", "provider readiness covers timeout handling"],
  [files.provider, "Callback signature verification is disabled", "provider readiness defines callback blocker"],
  [files.release, "Provider sandbox readiness", "release template includes provider sandbox gate"],
  [files.staging, "Provider sandbox readiness", "staging readiness includes provider sandbox gate"],
  [files.secrets, "AfroSMS", "secrets inventory includes AfroSMS"],
  [files.secrets, "Gmail/Workspace SMTP", "secrets inventory includes Gmail SMTP"],
  [files.paymentFilter, "M-Pesa remains hidden by product decision", "payment provider filter keeps M-Pesa hidden"],
  [files.bankCollection, "Bank collection flow contract check passed", "bank collection flow checker remains available"],
  [files.packageJson, "\"provider:sandbox-check\"", "package exposes provider sandbox command"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Provider sandbox readiness check failed:\n${failures.join("\n")}`);
}

console.log(`Provider sandbox readiness check passed (${checks.length} markers).`);
