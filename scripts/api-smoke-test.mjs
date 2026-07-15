import { spawn } from "node:child_process";

const port = 5199;
const baseUrl = `http://127.0.0.1:${port}/api/v1`;

const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  await waitForServer();

  const health = await api("GET", "/health");
  assert(health.data.ok === true, "Health endpoint should return ok=true");

  const login = await api("POST", "/auth/login", {
    email: "admin@platform.local",
    password: "Admin@12345"
  });
  assert(login.data.token, "Login should return a token");

  const platformToken = login.data.token;
  const tenants = await api("GET", "/tenants", null, platformToken);
  assert(tenants.data.length >= 3, "Platform admin should list all seeded tenants");

  const user = await api("POST", "/users", {
    tenantId: "tenant_green",
    fullName: "Sprint Smoke User",
    email: `smoke-${Date.now()}@greenvalley.local`,
    password: "Sacco@12345"
  }, platformToken);
  assert(user.data.id, "User creation should return a public user");
  assert(!("passwordHash" in user.data), "Public user should not expose password hash");

  const saccoLogin = await api("POST", "/auth/login", {
    email: "admin@greenvalley.local",
    password: "Sacco@12345"
  });
  const saccoToken = saccoLogin.data.token;

  const denied = await raw("GET", "/tenants/tenant_lake", null, saccoToken);
  assert(denied.status === 403, "SACCO admin should be blocked from another tenant");

  const audit = await api("POST", "/audit-events", {
    action: "Smoke test audit event",
    resourceType: "test",
    resourceId: "api-smoke-test"
  }, saccoToken);
  assert(audit.data.id, "Audit event should be created");

  console.log("API smoke test passed");
} finally {
  server.kill();
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Server did not start. Output:\n${output}`);
}

async function api(method, path, body, token) {
  const response = await raw(method, path, body, token);
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

function raw(method, path, body, token) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
