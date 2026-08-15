import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  hosted: await readFile(new URL("docs/hosted-operations-evidence.md", root), "utf8"),
  monitoring: await readFile(new URL("docs/monitoring.md", root), "utf8"),
  disasterRecovery: await readFile(new URL("docs/disaster-recovery.md", root), "utf8"),
  stagingHandoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
  alerts: await readFile(new URL("deploy/prometheus-alerts.yml", root), "utf8"),
  packageJson: await readFile(new URL("package.json", root), "utf8"),
};

const checks = [
  [files.hosted, "## Required Hosted Evidence", "hosted evidence has required-evidence section"],
  [files.hosted, "Alert routing", "hosted evidence covers alert routing"],
  [files.hosted, "Monitoring dashboard", "hosted evidence covers dashboards"],
  [files.hosted, "Centralized logs", "hosted evidence covers centralized logs"],
  [files.hosted, "Off-server backups", "hosted evidence covers off-server backups"],
  [files.hosted, "Backup schedule", "hosted evidence covers backup schedule"],
  [files.hosted, "Restore drill", "hosted evidence covers restore drill"],
  [files.hosted, "Incident contact", "hosted evidence covers incident contact"],
  [files.hosted, "API down", "hosted evidence covers API alert"],
  [files.hosted, "Mobile-money callback exceptions", "hosted evidence covers callback alert"],
  [files.hosted, "Notification delivery exceptions", "hosted evidence covers notification alert"],
  [files.hosted, "Backup job failure", "hosted evidence covers backup alert"],
  [files.hosted, "24 hour RPO and 4 hour RTO", "hosted evidence covers small-start restore target"],
  [files.hosted, "15 minute or better RPO and 60 minute or better RTO", "hosted evidence covers enterprise restore target"],
  [files.hosted, "No alert destination is configured", "hosted evidence defines alert blocker"],
  [files.hosted, "Backups are stored only on the same server", "hosted evidence defines backup-location blocker"],
  [files.monitoring, "deploy/prometheus-alerts.yml", "monitoring guide links Prometheus rules"],
  [files.monitoring, "correlationId", "monitoring guide covers correlation IDs"],
  [files.disasterRecovery, "Production small-start", "DR runbook covers small-start target"],
  [files.disasterRecovery, "Production enterprise", "DR runbook covers enterprise target"],
  [files.stagingHandoff, "Monitoring alert destination is configured", "handoff requires alert destination"],
  [files.stagingHandoff, "Backup schedule and retention are documented", "handoff requires backup schedule"],
  [files.release, "Hosted operations evidence", "release template includes hosted operations gate"],
  [files.alerts, "TerekaApiDown", "alert rules include API down"],
  [files.alerts, "TerekaDatabasePoolPressure", "alert rules include database pool pressure"],
  [files.packageJson, "\"operations:hosted-check\"", "package exposes hosted operations command"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Hosted operations evidence check failed:\n${failures.join("\n")}`);
}

console.log(`Hosted operations evidence check passed (${checks.length} markers).`);
