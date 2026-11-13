import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const files = {
  monitoring: await readFile(new URL("docs/monitoring.md", root), "utf8"),
  deployment: await readFile(new URL("docs/hetzner-cx22-deployment.md", root), "utf8"),
  handoff: await readFile(new URL("docs/staging-handoff-checklist.md", root), "utf8"),
  alerts: await readFile(new URL("deploy/prometheus-alerts.yml", root), "utf8"),
  alertTests: await readFile(new URL("deploy/prometheus-alerts.test.yml", root), "utf8"),
  prometheus: await readFile(new URL("deploy/prometheus.yml", root), "utf8"),
  alertmanager: await readFile(new URL("deploy/alertmanager.yml", root), "utf8"),
  fleetDashboard: await readFile(new URL("deploy/grafana/dashboards/fleet-operations.json", root), "utf8"),
  alertRoutingTest: await readFile(new URL("scripts/test-alertmanager-routing.mjs", root), "utf8"),
  prometheusAlertTest: await readFile(new URL("scripts/test-prometheus-alerts.mjs", root), "utf8"),
  productionCompose: await readFile(new URL("docker-compose.prod.yml", root), "utf8"),
  release: await readFile(new URL("docs/release-evidence-template.md", root), "utf8"),
};

const checks = [
  [files.monitoring, "## Operations Runbook", "monitoring guide has operations runbook"],
  [files.monitoring, "correlationId", "monitoring guide documents correlation IDs"],
  [files.monitoring, "Query strings", "monitoring guide documents log privacy boundary"],
  [files.monitoring, "callbackExceptions", "monitoring guide covers payment callback exceptions"],
  [files.monitoring, "deliveryExceptions", "monitoring guide covers notification exceptions"],
  [files.monitoring, "providerEvidence.mobileMoney.reconciliationSummary", "monitoring guide covers reconciliation evidence"],
  [files.monitoring, "## Fleet Bulk-Job Recovery Runbook", "monitoring guide covers fleet job recovery"],
  [files.monitoring, "repeatedFleetJobRecoveries", "monitoring guide covers repeated fleet recovery"],
  [files.monitoring, "Backup restore rehearsal", "monitoring guide includes backup rehearsal"],
  [files.monitoring, "Critical immediately", "monitoring guide defines critical thresholds"],
  [files.monitoring, "Every minute", "monitoring guide defines health cadence"],
  [files.alerts, "TerekaApiDown", "Prometheus rules include API down alert"],
  [files.alerts, "TerekaApiHighErrorRate", "Prometheus rules include 5xx alert"],
  [files.alerts, "TerekaApiHighLatency", "Prometheus rules include latency alert"],
  [files.alerts, "TerekaDatabasePoolPressure", "Prometheus rules include DB pool alert"],
  [files.alerts, "TerekaJvmHeapPressure", "Prometheus rules include heap alert"],
  [files.alerts, "TerekaFleetBulkJobRepeatedRecovery", "Prometheus rules include fleet recovery alert"],
  [files.alerts, "TerekaFleetBulkJobOrganizationFailures", "Prometheus rules include fleet failure alert"],
  [files.alerts, "runbook:", "Prometheus alerts include runbook links"],
  [files.alertTests, "fleet alerts fire after sustained threshold", "Prometheus fixtures cover firing fleet alerts"],
  [files.alertTests, "one recovery and no failures remain quiet", "Prometheus fixtures cover quiet fleet alerts"],
  [files.prometheus, "rule_files:", "Prometheus configuration loads rule files"],
  [files.prometheus, "backend:8080", "Prometheus configuration scrapes the backend"],
  [files.productionCompose, "prom/prometheus:v3.5.0", "production Compose pins Prometheus"],
  [files.productionCompose, "prometheus-alerts.yml:/etc/prometheus/rules/prometheus-alerts.yml:ro", "production Compose mounts alert rules"],
  [files.productionCompose, "alertmanager_webhook_url", "production Compose mounts Alertmanager webhook secret"],
  [files.productionCompose, "grafana_admin_password", "production Compose mounts Grafana password secret"],
  [files.alertmanager, "url_file: /run/secrets/alertmanager_webhook_url", "Alertmanager reads webhook from a secret file"],
  [files.alertmanager, "receiver: platform-critical", "Alertmanager routes critical alerts"],
  [files.fleetDashboard, "Tereka Fleet Operations", "Grafana fleet dashboard is provisioned"],
  [files.fleetDashboard, "sacco_fleet_bulk_job_recoveries_total", "Grafana dashboard charts fleet recoveries"],
  [files.alertRoutingTest, "platform-critical", "synthetic test verifies critical routing"],
  [files.alertRoutingTest, "platform-warning", "synthetic test verifies warning routing"],
  [files.prometheusAlertTest, "prometheus-alerts.test.yml", "Prometheus rule test launcher is wired"],
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
