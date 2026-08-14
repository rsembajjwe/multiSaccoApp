import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  monitoring: await readFile(new URL("docs/monitoring.md", root), "utf8"),
  deployment: await readFile(new URL("docs/hetzner-cx22-deployment.md", root), "utf8"),
  handoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
  alerts: await readFile(new URL("deploy/prometheus-alerts.yml", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
};

const checks = [
  [files.monitoring, "## Operations Runbook", "monitoring guide has operations runbook"],
  [files.monitoring, "correlationId", "monitoring guide documents correlation IDs"],
  [files.monitoring, "Query strings", "monitoring guide documents log privacy boundary"],
  [files.monitoring, "callbackExceptions", "monitoring guide covers payment callback exceptions"],
  [files.monitoring, "deliveryExceptions", "monitoring guide covers notification exceptions"],
  [files.monitoring, "providerEvidence.mobileMoney.reconciliationSummary", "monitoring guide covers reconciliation evidence"],
  [files.monitoring, "Backup restore rehearsal", "monitoring guide includes backup rehearsal"],
  [files.monitoring, "Critical immediately", "monitoring guide defines critical thresholds"],
  [files.monitoring, "Every minute", "monitoring guide defines health cadence"],
  [files.alerts, "TerekaApiDown", "Prometheus rules include API down alert"],
  [files.alerts, "TerekaApiHighErrorRate", "Prometheus rules include 5xx alert"],
  [files.alerts, "TerekaApiHighLatency", "Prometheus rules include latency alert"],
  [files.alerts, "TerekaDatabasePoolPressure", "Prometheus rules include DB pool alert"],
  [files.alerts, "TerekaJvmHeapPressure", "Prometheus rules include heap alert"],
  [files.alerts, "runbook:", "Prometheus alerts include runbook links"],
  [files.deployment, "## Rollback", "deployment runbook includes rollback"],
  [files.deployment, "Capture backend, Caddy, and PostgreSQL logs", "deployment runbook requires log capture"],
  [files.deployment, "Do not paste", "deployment runbook protects secrets in incident notes"],
  [files.handoff, "Monitoring alert destination is configured", "handoff requires alert destination"],
  [files.handoff, "Restore owner is named", "handoff requires restore owner"],
  [files.handoff, "Incident runbook is available", "handoff requires runbook availability"],
  [files.release, "Backup restore rehearsal", "release evidence includes backup gate"],
  [files.release, "Repository hygiene", "release evidence includes hygiene gate"],
];

const failures = [];
for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

if (failures.length > 0) {
  throw new Error(`Incident readiness check failed:\n${failures.join("\n")}`);
}

console.log(`Incident readiness check passed (${checks.length} markers).`);
