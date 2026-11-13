// Member lifecycle regression suite for the Node API (backend/api.mjs).
//
// Covers the onboarding controls: creation defaults, the phone-or-email
// contact rule, the members:approve permission gate on status and KYC
// changes, and the approve / reject / reactivate / verify-KYC transitions.
//
// Self-contained: spawns the Node API server on an ephemeral port (unless
// API_BASE_URL points at an already-running instance), runs assertions, and
// exits non-zero on the first failure. No external dependencies.
//
// Run: npm run test:members   (or: node scripts/test-member-lifecycle.mjs)

import { spawn } from "node:child_process";

const externalBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");
const port = Number(process.env.MEMBER_TEST_PORT || 5223);
const baseUrl = externalBaseUrl || `http://127.0.0.1:${port}/api/v1`;

const server = externalBaseUrl
  ? null
  : spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: {
        ...process.env,
        PORT: String(port),
        SACCO_NODE_API_ENABLED: "true",
        SACCO_DEMO_FALLBACK_REASON: "test-member-lifecycle"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

let serverOutput = "";
server?.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server?.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed++;
  console.log(`  ok  ${message}`);
}

const uniq = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function waitForServer() {
  const started = Date.now();
  const timeoutMs = Number(process.env.MEMBER_TEST_WAIT_MS || 8000);
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Server did not start. Output:\n${serverOutput}`);
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

async function api(method, path, body, token) {
  const response = await raw(method, path, body, token);
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(json)}`);
  return json;
}

async function login(email, password) {
  const res = await api("POST", "/auth/login", { email, username: email, password });
  return res.data.token;
}

try {
  await waitForServer();

  // admin@platform.local  -> platform admin (has members:approve)
  // secretary@greenvalley.local -> SACCO secretary (has members:approve)
  // treasurer@greenvalley.local -> SACCO treasurer (NO members:approve)
  const adminToken = await login("admin@platform.local", "Admin@12345");
  const secretaryToken = await login("secretary@greenvalley.local", "Secretary@12345");
  const treasurerToken = await login("treasurer@greenvalley.local", "Treasurer@12345");
  assert(adminToken && secretaryToken && treasurerToken, "Platform admin, secretary and treasurer can all authenticate");

  // Resolve a branch for tenant_green.
  const branches = await api("GET", "/branches?tenantId=tenant_green", null, adminToken);
  const branch = branches.data.find((b) => /main/i.test(`${b.name} ${b.code}`)) || branches.data[0];
  assert(!!branch?.id, "A branch is available for tenant_green");
  const branchId = branch.id;

  // --- Creation defaults ---
  const member = await api("POST", "/members", {
    tenantId: "tenant_green", branchId,
    fullName: "Lifecycle Member", phone: "+256700000001",
    membershipNo: `LC-${uniq()}`
  }, adminToken);
  assert(member.data.status === "pending_approval", "New member starts pending_approval");
  assert(member.data.kycStatus === "pending_verification", "New member starts KYC pending_verification");
  assert(!("passwordHash" in member.data), "Member response never exposes passwordHash");
  const memberId = member.data.id;

  // --- Contact rule: at least one of phone or email ---
  const emailOnly = await api("POST", "/members", {
    tenantId: "tenant_green", branchId,
    fullName: "Email Only", email: `eo-${uniq()}@example.local`,
    membershipNo: `EO-${uniq()}`
  }, adminToken);
  assert(emailOnly.data.id && !emailOnly.data.phone, "Member with email only (no phone) is accepted");

  const noContact = await raw("POST", "/members", {
    tenantId: "tenant_green", branchId,
    fullName: "No Contact", membershipNo: `NC-${uniq()}`
  }, adminToken);
  assert(noContact.status === 400, "Member with neither phone nor email is rejected (400)");

  // --- Permission gate: status change requires members:approve ---
  const statusDenied = await raw("PATCH", `/members/${memberId}/status`, { status: "active" }, treasurerToken);
  assert(statusDenied.status === 403, "Treasurer (no members:approve) cannot change member status (403)");
  const statusDeniedBody = await statusDenied.json();
  assert(JSON.stringify(statusDeniedBody).includes("members:approve"), "Status 403 cites members:approve");

  // --- Permission gate: KYC change requires members:approve ---
  const kycDenied = await raw("PATCH", `/members/${memberId}/kyc-status`, { kycStatus: "verified" }, treasurerToken);
  assert(kycDenied.status === 403, "Treasurer cannot change member KYC status (403)");

  // --- Validation: invalid KYC value ---
  const badKyc = await raw("PATCH", `/members/${memberId}/kyc-status`, { kycStatus: "not-a-status" }, adminToken);
  assert(badKyc.status === 400, "Invalid KYC status is rejected (400)");

  const badStatus = await raw("PATCH", `/members/${memberId}/status`, { status: "not-a-status" }, adminToken);
  assert(badStatus.status === 400, "Invalid member status is rejected (400)");

  // --- Authorised transitions ---
  const approved = await api("PATCH", `/members/${memberId}/status`, { status: "active" }, secretaryToken);
  assert(approved.data.status === "active", "Secretary (has members:approve) approves member to active");

  const verified = await api("PATCH", `/members/${memberId}/kyc-status`, { kycStatus: "verified" }, secretaryToken);
  assert(verified.data.kycStatus === "verified", "Secretary verifies member KYC");

  const rejected = await api("PATCH", `/members/${memberId}/status`, { status: "exited" }, adminToken);
  assert(rejected.data.status === "exited", "Member can be rejected (exited)");

  const reactivated = await api("PATCH", `/members/${memberId}/status`, { status: "active" }, adminToken);
  assert(reactivated.data.status === "active", "Exited member can be reactivated");

  // --- Audit trail records the transitions ---
  const audit = await api("GET", "/audit-events", null, adminToken);
  const events = Array.isArray(audit.data) ? audit.data : [];
  assert(events.some((e) => /status from .* to active/i.test(e.action || "")), "Audit trail records the status approval");
  assert(events.some((e) => /KYC status from .* to verified/i.test(e.action || "")), "Audit trail records the KYC verification");

  console.log(`\nMember lifecycle regression: ${passed} checks passed.`);
  server?.kill();
  process.exit(0);
} catch (error) {
  console.error(`\nMember lifecycle regression FAILED: ${error.message}`);
  if (serverOutput) console.error(`\n--- server output ---\n${serverOutput}`);
  server?.kill();
  process.exit(1);
}
