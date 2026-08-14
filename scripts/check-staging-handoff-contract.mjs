import { readFile } from "node:fs/promises";

const files = {
  handoff: await readFile(new URL("../docs/staging-handoff-checklist.md", import.meta.url), "utf8"),
  staging: await readFile(new URL("../docs/staging-environment.md", import.meta.url), "utf8"),
  release: await readFile(new URL("../docs/release-evidence-template.md", import.meta.url), "utf8"),
  hetzner: await readFile(new URL("../docs/hetzner-cx22-deployment.md", import.meta.url), "utf8"),
};

const checks = [
  [files.handoff, "## Environment", "handoff checklist has environment section"],
  [files.handoff, "Staging UI URL is reachable over HTTPS", "handoff requires HTTPS UI evidence"],
  [files.handoff, "Java API URL is reachable over HTTPS", "handoff requires HTTPS/API routing evidence"],
  [files.handoff, "Reverse proxy forwards `/api/v1`", "handoff requires Java API proxy evidence"],
  [files.handoff, "SPRING_PROFILES_ACTIVE=prod", "handoff requires production profile evidence"],
  [files.handoff, "## Secrets", "handoff checklist has secrets section"],
  [files.handoff, "SACCO_DEMO_LOGINS_ENABLED=false", "handoff requires demo-login-disabled evidence"],
  [files.handoff, "Staging preflight passes", "handoff requires staging preflight"],
  [files.handoff, "## Release Gates", "handoff checklist has release gates section"],
  [files.handoff, "Local verification passed", "handoff requires local verification"],
  [files.handoff, "Production readiness passed", "handoff requires production readiness"],
  [files.handoff, "PostgreSQL/Flyway verified", "handoff requires PostgreSQL/Flyway proof"],
  [files.handoff, "Backup restore rehearsal passed", "handoff requires restore proof"],
  [files.handoff, "Load test passed", "handoff requires load evidence"],
  [files.handoff, "Browser regression passed", "handoff requires browser regression"],
  [files.handoff, "## Operations", "handoff checklist has operations section"],
  [files.handoff, "Restore owner is named", "handoff requires restore owner"],
  [files.handoff, "Incident runbook is available", "handoff requires incident runbook"],
  [files.handoff, "## UAT Readiness", "handoff checklist has UAT section"],
  [files.handoff, "Automated browser UAT has passed", "handoff requires automated browser UAT"],
  [files.handoff, "No unaccepted P0/P1 findings remain", "handoff blocks severe open findings"],
  [files.handoff, "Do not hand off for external UAT", "handoff has explicit blocker rule"],
  [files.staging, "Complete `docs/staging-handoff-checklist.md`", "staging guide points to handoff checklist"],
  [files.release, "Release evidence pack", "release template includes evidence pack"],
  [files.hetzner, "curl -fsS https://tereka.online/api/v1/health", "Hetzner runbook includes hosted health check"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Staging handoff contract check failed:\n${failures.join("\n")}`);
}

console.log(`Staging handoff contract check passed (${checks.length} markers).`);
