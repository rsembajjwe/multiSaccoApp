import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const containerName = `tereka-alert-routing-${process.pid}-${Date.now()}`;
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "tereka-alert-routing-"));
const webhookSecretPath = path.join(temporaryDirectory, "alertmanager-webhook-url");
const notifications = [];

const receiver = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/alerts") {
    response.writeHead(404).end();
    return;
  }
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    try {
      notifications.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      response.writeHead(200, { "Content-Type": "application/json" }).end("{}");
    } catch {
      response.writeHead(400).end();
    }
  });
});

try {
  await new Promise((resolve, reject) => {
    receiver.once("error", reject);
    receiver.listen(0, "0.0.0.0", resolve);
  });
  const receiverPort = receiver.address().port;
  await writeFile(webhookSecretPath, `http://host.docker.internal:${receiverPort}/alerts`, { mode: 0o600 });

  await docker([
    "run", "--detach", "--rm", "--name", containerName,
    "--publish", "127.0.0.1::9093",
    "--add-host", "host.docker.internal:host-gateway",
    "--volume", `${path.join(root, "deploy", "alertmanager.yml")}:/etc/alertmanager/alertmanager.yml:ro`,
    "--volume", `${webhookSecretPath}:/run/secrets/alertmanager_webhook_url:ro`,
    "prom/alertmanager:v0.28.1",
    "--config.file=/etc/alertmanager/alertmanager.yml",
    "--storage.path=/alertmanager"
  ]);

  const portOutput = await waitForDockerPort();
  const alertmanagerPort = Number(portOutput.trim().match(/:(\d+)$/)?.[1]);
  assert.ok(alertmanagerPort, `Could not determine Alertmanager host port from: ${portOutput}`);
  const alertmanagerUrl = `http://127.0.0.1:${alertmanagerPort}`;
  await waitForReady(`${alertmanagerUrl}/-/ready`);

  const startsAt = new Date().toISOString();
  const endsAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const response = await fetch(`${alertmanagerUrl}/api/v2/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([
      syntheticAlert("SyntheticFleetBulkJobRecovery", "critical", "fleet-routing-critical", startsAt, endsAt),
      syntheticAlert("SyntheticFleetBulkJobOrganizationFailure", "warning", "fleet-routing-warning", startsAt, endsAt)
    ])
  });
  assert.equal(response.status, 200, `Alertmanager rejected synthetic alerts: ${await response.text()}`);

  await waitForNotifications(2, 45_000);
  const receivers = new Set(notifications.map((notification) => notification.receiver));
  assert.ok(receivers.has("platform-critical"), "Critical fleet alert did not reach platform-critical.");
  assert.ok(receivers.has("platform-warning"), "Warning fleet alert did not reach platform-warning.");
  assert.ok(notifications.every((notification) => notification.status === "firing"), "Expected firing notifications only.");

  console.log("Alertmanager routing test passed (critical and warning fleet alerts reached the local webhook receiver).");
} finally {
  receiver.close();
  await docker(["rm", "--force", containerName], true);
  await rm(temporaryDirectory, { recursive: true, force: true });
}

function syntheticAlert(alertname, severity, service, startsAt, endsAt) {
  return {
    labels: { alertname, severity, service },
    annotations: { summary: `${alertname} synthetic routing test` },
    startsAt,
    endsAt,
    generatorURL: "https://tereka.invalid/synthetic-alert-test"
  };
}

async function waitForDockerPort() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await docker(["port", containerName, "9093/tcp"], true);
    if (result.trim()) return result;
    await delay(500);
  }
  throw new Error("Alertmanager did not publish a host port.");
}

async function waitForReady(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Container startup can briefly refuse connections.
    }
    await delay(500);
  }
  throw new Error("Alertmanager did not become ready within 20 seconds.");
}

async function waitForNotifications(expected, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (notifications.length >= expected) return;
    await delay(250);
  }
  throw new Error(`Received ${notifications.length} of ${expected} expected webhook notifications.`);
}

async function docker(args, ignoreFailure = false) {
  try {
    const result = await execFileAsync("docker", args, { windowsHide: true });
    return result.stdout;
  } catch (error) {
    if (ignoreFailure) return "";
    throw new Error(`Docker command failed: ${error.stderr || error.message}`);
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
