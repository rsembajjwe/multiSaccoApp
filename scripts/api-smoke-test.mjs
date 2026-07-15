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

  const tenant = await api("POST", "/tenants", {
    name: `Smoke SACCO ${Date.now()}`,
    abbreviation: "SMS",
    registrationNo: `COOP-SMOKE-${Date.now()}`,
    district: "Kampala",
    licenseExpiry: "2027-12-31",
    packageId: "starter"
  }, platformToken);
  assert(tenant.data.id, "Tenant creation should return a tenant");
  assert(tenant.data.status === "pending_review", "New tenant should start pending review");

  const approvedTenant = await api("PATCH", `/tenants/${tenant.data.id}/status`, { status: "approved" }, platformToken);
  assert(approvedTenant.data.status === "approved", "Tenant status should update to approved");

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

  const branches = await api("GET", "/branches", null, saccoToken);
  assert(branches.data.length >= 2, "SACCO admin should list own branches");
  assert(branches.data.every((branch) => branch.tenantId === "tenant_green"), "SACCO branch list must be tenant-scoped");

  const branch = await api("POST", "/branches", {
    code: `SM${Date.now().toString().slice(-5)}`,
    name: "Smoke Test Branch",
    address: "Temporary test location"
  }, saccoToken);
  assert(branch.data.id, "Branch creation should return a branch");
  assert(branch.data.tenantId === "tenant_green", "Branch should be created in authenticated tenant");

  const member = await api("POST", "/members", {
    branchId: branch.data.id,
    fullName: "Smoke Test Member",
    phone: "+256700123456",
    email: "member-smoke@example.local",
    nationalId: `SMOKE-${Date.now()}`,
    memberType: "individual",
    kycStatus: "pending_verification"
  }, saccoToken);
  assert(member.data.id, "Member creation should return a member");
  assert(member.data.status === "pending_approval", "New member should start pending approval");

  const status = await api("PATCH", `/members/${member.data.id}/status`, { status: "active" }, saccoToken);
  assert(status.data.status === "active", "Member status should update");

  const document = await api("POST", `/members/${member.data.id}/documents`, {
    documentType: "national_id",
    storageKey: `tenant_green/members/${member.data.id}/national-id.pdf`
  }, saccoToken);
  assert(document.data.id, "Member document metadata should be created");

  const lakeMemberDenied = await raw("GET", "/members/member_lake_peter", null, saccoToken);
  assert(lakeMemberDenied.status === 403, "SACCO admin should be blocked from another tenant member");

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
