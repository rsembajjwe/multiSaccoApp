import { spawn } from "node:child_process";
import { createServer } from "node:http";

const host = "127.0.0.1";

async function main() {
  const upstream = await startMockJavaApi();
  const frontendPort = await getFreePort();
  const frontend = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(frontendPort),
      JAVA_API_BASE: `http://${host}:${upstream.port}`
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  frontend.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  frontend.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForServer(frontendPort, () => output);

    const health = await fetchJson(`http://${host}:${frontendPort}/api/v1/health?source=proxy`, {
      headers: {
        Authorization: "Bearer health-token"
      }
    });
    assertEqual(health.status, 200, "health status");
    assertEqual(health.headers.get("x-upstream-test"), "java-proxy", "upstream header");
    assertEqual(health.headers.get("x-content-type-options"), "nosniff", "security header");
    assertEqual(health.body.data.proxied, true, "health proxied flag");
    assertEqual(health.body.data.path, "/api/v1/health?source=proxy", "health path");
    assertEqual(health.body.data.authorization, "Bearer health-token", "health auth forwarding");

    const echo = await fetchJson(`http://${host}:${frontendPort}/api/v1/echo`, {
      method: "POST",
      headers: {
        Authorization: "Bearer echo-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ok: true, amount: 5000 })
    });
    assertEqual(echo.status, 201, "echo status");
    assertEqual(echo.body.data.method, "POST", "echo method");
    assertEqual(echo.body.data.authorization, "Bearer echo-token", "echo auth forwarding");
    assertEqual(echo.body.data.body.amount, 5000, "echo body forwarding");

    console.log("Java proxy mode check passed");
  } finally {
    await stopProcess(frontend);
    await closeServer(upstream.server);
  }
}

function startMockJavaApi() {
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url.startsWith("/api/v1/health")) {
      sendJson(response, 200, {
        data: {
          status: "UP",
          proxied: true,
          path: request.url,
          authorization: request.headers.authorization || ""
        }
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/v1/echo") {
      const rawBody = await readBody(request);
      sendJson(response, 201, {
        data: {
          method: request.method,
          path: request.url,
          authorization: request.headers.authorization || "",
          body: JSON.parse(rawBody || "{}")
        }
      });
      return;
    }

    sendJson(response, 404, {
      error: {
        status: 404,
        code: "NOT_FOUND",
        message: `No mock route for ${request.method} ${request.url}`
      }
    });
  });

  return listen(server);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Upstream-Test": "java-proxy"
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  return {
    server,
    port: address.port
  };
}

async function getFreePort() {
  const probe = createServer();
  const { port } = await listen(probe);
  await closeServer(probe);
  return port;
}

async function waitForServer(port, getOutput) {
  const deadline = Date.now() + 5000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://${host}:${port}/api/v1/health?source=proxy`);
      if (response.ok) {
        await response.arrayBuffer();
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }

  throw new Error(`Timed out waiting for proxied frontend. ${lastError?.message || ""}\n${getOutput()}`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  return {
    status: response.status,
    headers: response.headers,
    body
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function stopProcess(processHandle) {
  if (processHandle.exitCode !== null || processHandle.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    processHandle.once("exit", resolve);
    processHandle.kill();
    setTimeout(resolve, 1000).unref();
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
