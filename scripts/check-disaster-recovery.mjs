import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const runbook = await readFile(new URL("docs/disaster-recovery.md", root), "utf8");
const deployment = await readFile(new URL("docs/deployment.md", root), "utf8");
const monitoring = await readFile(new URL("docs/monitoring.md", root), "utf8");
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));

const failures = [];
const runbookMarkers = [
  "## Recovery Targets",
  "RPO target",
  "RTO target",
  "Production small-start",
  "Production enterprise",
  "## Backup Controls",
  "## Restore Rehearsal Evidence",
  "Restore owner",
  "RPO measured",
  "RTO measured",
  "## Local Rehearsal Procedure",
  "npm.cmd run backup:evidence",
  "## Hosted Restore Procedure",
  "## Emergency Recovery",
  "## Release Gate",
  "Backups are stored only on the same server"
];

for (const marker of runbookMarkers) {
  if (!runbook.includes(marker)) {
    failures.push(`docs/disaster-recovery.md missing ${marker}`);
  }
}

for (const [label, content, marker] of [
  ["docs/deployment.md", deployment, "npm.cmd run backup:rehearse"],
  ["docs/monitoring.md", monitoring, "npm.cmd run backup:evidence"],
  ["package.json", JSON.stringify(packageJson.scripts || {}), "backup:evidence"]
]) {
  if (!content.includes(marker)) {
    failures.push(`${label} missing ${marker}`);
  }
}

if (failures.length) {
  throw new Error(`Disaster recovery contract check failed:\n${failures.join("\n")}`);
}

console.log(`Disaster recovery contract check passed (${runbookMarkers.length} runbook markers).`);
