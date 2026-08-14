import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  deployment: await readFile(new URL("docs/deployment.md", root), "utf8"),
  hetzner: await readFile(new URL("docs/hetzner-cx22-deployment.md", root), "utf8"),
  staging: await readFile(new URL("docs/staging-environment.md", root), "utf8"),
  handoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  readiness: await readFile(new URL("docs/staging-readiness.md", root), "utf8"),
  workflow: await readFile(new URL(".github/workflows/ci.yml", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
};

const checks = [
  [files.deployment, "npm.cmd run deploy:evidence", "deployment guide exposes deployment evidence command"],
  [files.deployment, "JAVA_API_BASE", "deployment guide documents Java API proxy path"],
  [files.hetzner, "tereka.online", "Hetzner runbook targets Tereka domain"],
  [files.hetzner, "Caddy obtains and renews HTTPS certificates automatically", "Hetzner runbook documents automatic HTTPS"],
  [files.hetzner, "npm run staging:preflight", "Hetzner runbook requires staging preflight"],
  [files.hetzner, "npm run staging:handoff-check", "Hetzner runbook requires handoff contract"],
  [files.hetzner, "npm run release:evidence", "Hetzner runbook requires release evidence"],
  [files.hetzner, "SACCO_BOOTSTRAP_PLATFORM_ADMIN_PASSWORD", "Hetzner runbook covers first platform owner bootstrap"],
  [files.hetzner, "rotate or", "Hetzner runbook requires bootstrap credential rotation"],
  [files.hetzner, "## Rollback", "Hetzner runbook includes rollback section"],
  [files.hetzner, "previous-good-commit", "Hetzner runbook includes previous commit rollback"],
  [files.hetzner, "Name a restore owner", "Hetzner runbook requires restore owner"],
  [files.hetzner, "Do not paste", "Hetzner runbook warns against secret leakage in evidence"],
  [files.staging, "SACCO_DEMO_LOGINS_ENABLED", "staging guide documents demo login gate"],
  [files.staging, "SACCO_MOBILE_MONEY_CALLBACK_SECRET", "staging guide documents callback secret"],
  [files.handoff, "Staging UI URL is reachable over HTTPS", "handoff checklist includes HTTPS UI"],
  [files.handoff, "Restore owner is named", "handoff checklist includes restore owner"],
  [files.handoff, "No unaccepted P0/P1 findings remain", "handoff checklist blocks severe UAT findings"],
  [files.release, "Do not paste secrets or passwords", "release template blocks secret leakage"],
  [files.release, "Backup restore rehearsal", "release template includes backup gate"],
  [files.release, "CI release gate", "release template includes CI gate"],
  [files.release, "sacco_app_backup_rehearsal-20260814-164712.dump", "release template references latest local backup evidence"],
  [files.readiness, "Backup restore rehearsal", "staging readiness tracks backup gate"],
  [files.readiness, "Passed on 2026-08-14", "staging readiness references latest backup evidence date"],
  [files.workflow, "Run backup restore rehearsal", "CI release gate runs backup rehearsal"],
  [files.workflow, "Run production readiness gate", "CI release gate runs production readiness"],
  [files.packageJson, "\"deploy:evidence\"", "package exposes deploy evidence command"],
  [files.packageJson, "scripts/deployment-evidence.mjs", "package syntax-checks deployment evidence"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length) {
  throw new Error(`Deployment contract check failed:\n${failures.join("\n")}`);
}

console.log(`Deployment contract check passed (${checks.length} markers).`);
