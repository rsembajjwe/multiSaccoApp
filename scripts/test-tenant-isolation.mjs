// Tenant-isolation regression suite for the Node API (backend/api.mjs).
//
// Multi-tenancy is the platform's core security boundary: a SACCO must never read or
// write another SACCO's data. This suite logs in as a tenant_green admin and attempts
// to reach tenant_lake resources by id (and via a spoofed ?tenantId= / body.tenantId).
// Every attempt must be denied (403/404) or safely coerced to the caller's own tenant.
//
// Self-contained: spawns the server on an ephemeral port, no dependencies.
// Run: npm run test:isolation   (or: node scripts/test-tenant-isolation.mjs)

import { spawn } from "node:child_process";

const externalBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");
const port = Number(process.env.ISOLATION_TEST_PORT || 5253);
const baseUrl = externalBaseUrl || `http://127.0.0.1:${port}/api/v1`;

const server = externalBaseUrl
  ? null
  : spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PORT: String(port), SACCO_NODE_API_ENABLED: "true", SACCO_DEMO_FALLBACK_REASON: "test-tenant-isolation" },
      stdio: ["ignore", "pipe", "pipe"]
    });

let out = "";
server?.stdout.on("data", (d) => { out += d; });
server?.stderr.on("data", (d) => { out += d; });

const raw = (method, path, body, token) => fetch(`${baseUrl}${path}`, {
  method,
  headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: body ? JSON.stringify(body) : undefined
});
async function api(method, path, body, token) {
  const r = await raw(method, path, body, token);
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j)}`);
  return j;
}
async function login(email, password) { return (await api("POST", "/auth/login", { email, username: email, password })).data.token; }
async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try { if ((await fetch(`${baseUrl}/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Server did not start.\n${out}`);
}

let passed = 0;
const failures = [];
function record(label, ok, status) {
  if (ok) { passed += 1; console.log(`  ok   [${status}] ${label}`); }
  else { failures.push(label); console.log(`  LEAK [${status}] ${label}`); }
}
async function mustDeny(label, method, path, body, token) {
  const r = await raw(method, path, body, token);
  record(label, r.status === 403 || r.status === 404, r.status);
}

try {
  await waitForServer();
  const green = await login("admin@greenvalley.local", "Sacco@12345"); // tenant_green admin

  // Direct by-id access to tenant_lake resources must be denied.
  await mustDeny("read lake member", "GET", "/members/member_lake_peter", null, green);
  await mustDeny("edit lake member", "PATCH", "/members/member_lake_peter", { fullName: "X" }, green);
  await mustDeny("change lake member status", "PATCH", "/members/member_lake_peter/status", { status: "active" }, green);
  await mustDeny("change lake member KYC", "PATCH", "/members/member_lake_peter/kyc-status", { kycStatus: "verified" }, green);
  await mustDeny("read lake member statement", "GET", "/members/member_lake_peter/statement", null, green);
  await mustDeny("read lake member documents", "GET", "/members/member_lake_peter/documents", null, green);
  await mustDeny("read lake loan schedule", "GET", "/loans/loan_lake_0001/schedule", null, green);
  await mustDeny("approve lake loan", "PATCH", "/loans/loan_lake_0001/status", { status: "approved" }, green);
  await mustDeny("disburse lake loan", "POST", "/loans/loan_lake_0001/disburse", null, green);
  await mustDeny("repay lake loan", "POST", "/loans/loan_lake_0001/repayments", { amount: 1000, channel: "cash", externalReference: "ISO-X" }, green);
  await mustDeny("guarantee lake loan", "POST", "/loans/loan_lake_0001/guarantors", { memberId: "member_lake_peter", guaranteedAmount: 1000 }, green);
  await mustDeny("read lake tenant", "GET", "/tenants/tenant_lake", null, green);
  await mustDeny("read lake tenant profile", "GET", "/tenants/tenant_lake/profile", null, green);

  // A spoofed tenant param must never create/read tenant_lake data — it is coerced to the caller's tenant.
  {
    const r = await raw("POST", "/financial-transactions", { tenantId: "tenant_lake", memberId: "member_lake_peter", branchId: "branch_lake_main", type: "savings_deposit", channel: "cash", amount: 1000 }, green);
    let safe = [400, 403, 404].includes(r.status);
    if (r.status === 201) safe = ((await r.json()).data ?? {}).tenantId === "tenant_green";
    record("txn with tenant_lake param never targets lake", safe, r.status);
  }
  {
    const r = await raw("POST", "/branches", { tenantId: "tenant_lake", code: "ISOPROBE", name: "Iso Probe" }, green);
    let safe = [403, 404].includes(r.status);
    if (r.status === 201) safe = ((await r.json()).data ?? {}).tenantId === "tenant_green";
    record("branch with tenant_lake param never targets lake", safe, r.status);
  }
  {
    const r = await raw("GET", "/members?tenantId=tenant_lake", null, green);
    let safe = [403, 404].includes(r.status);
    if (r.status === 200) { const rows = (await r.json()).data ?? []; safe = Array.isArray(rows) && rows.every((m) => m.tenantId === "tenant_green"); }
    record("member list with tenant_lake param stays own-tenant", safe, r.status);
  }

  if (failures.length) {
    console.error(`\nTenant isolation FAILED: ${failures.length} leak(s): ${failures.join("; ")}`);
    server?.kill();
    process.exit(1);
  }
  console.log(`\nTenant isolation: ${passed} checks passed, 0 leaks.`);
  server?.kill();
  process.exit(0);
} catch (error) {
  console.error(`\nTenant isolation ERROR: ${error.message}`);
  if (out) console.error(`\n--- server output ---\n${out}`);
  server?.kill();
  process.exit(2);
}
