import { spawn } from "node:child_process";

const port = Number(process.env.NODE_API_GUARD_PORT || 5190);
const baseUrl = `http://127.0.0.1:${port}`;

let server = null;

try {
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      JAVA_API_BASE: "",
      SACCO_NODE_API_ENABLED: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  await waitForUi();

  const response = await fetch(`${baseUrl}/api/v1/health`);
  const payload = await response.json();
  if (response.status !== 503 || payload.error?.code !== "JAVA_API_REQUIRED") {
    throw new Error(`Expected production API guard 503/JAVA_API_REQUIRED, got ${response.status}: ${JSON.stringify(payload)}`);
  }

  console.log("PASS production server refuses legacy Node API without JAVA_API_BASE");
} finally {
  if (server) server.kill();
}

async function waitForUi() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Wait for the local server.
    }
    await delay(300);
  }
  throw new Error(`Server did not become available at ${baseUrl}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
