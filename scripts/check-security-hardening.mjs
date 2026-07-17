import { readFileSync } from "node:fs";

const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8080/api/v1").replace(/\/$/, "");
const checks = [];

await check("prod profile disables demo logins by default", () => {
  const prodProperties = readFileSync("backend-java/src/main/resources/application-prod.properties", "utf8");
  assert(prodProperties.includes("sacco.demo-logins.enabled=${SACCO_DEMO_LOGINS_ENABLED:false}"));
});

await check("health endpoint exposes security headers", async () => {
  const response = await raw("GET", "/health");
  assert(response.ok, `health returned ${response.status}`);
  assert(response.headers.get("x-content-type-options") === "nosniff", "missing nosniff");
  assert(response.headers.get("x-frame-options") === "DENY", "missing frame denial");
  assert(response.headers.get("referrer-policy") === "no-referrer", "missing referrer policy");
  assert(response.headers.get("permissions-policy")?.includes("camera=()"), "missing permissions policy");
});

await check("staff-only routes require bearer tokens", async () => {
  await expectStatus("GET", "/auth/me", null, null, 401);
  await expectStatus("GET", "/tenants", null, null, 401);
  await expectStatus("GET", "/operations/status", null, null, 401);
  await expectStatus("GET", "/members", null, null, 401);
});

let platformToken = "";
let saccoToken = "";
let memberToken = "";

await check("staff login stores tokens server-side and hides password material", async () => {
  const login = await api("POST", "/auth/login", {
    email: "admin@platform.local",
    password: "Admin@12345"
  });
  platformToken = login.data.token;
  assert(platformToken && login.data.tokenType === "Bearer", "staff login did not return bearer token");
  assert(!JSON.stringify(login).includes("passwordHash"), "staff login leaked passwordHash");
  assert(!JSON.stringify(login).includes("passwordSalt"), "staff login leaked passwordSalt");

  const session = await api("GET", "/auth/me", null, platformToken);
  assert(session.data.user.email === "admin@platform.local", "auth/me did not return the platform user");
  assert(!JSON.stringify(session).includes("passwordHash"), "auth/me leaked passwordHash");
  assert(!JSON.stringify(session).includes("passwordSalt"), "auth/me leaked passwordSalt");
});

await check("logout revokes the active staff session", async () => {
  await api("POST", "/auth/logout", null, platformToken);
  await expectStatus("GET", "/auth/me", null, platformToken, 401);
  const login = await api("POST", "/auth/login", {
    email: "admin@platform.local",
    password: "Admin@12345"
  });
  platformToken = login.data.token;
});

await check("password reset does not enumerate unknown users", async () => {
  const reset = await api("POST", "/auth/password-reset/request", { email: "nobody@example.local" });
  assert(reset.data.accepted === true, "unknown reset request should be accepted generically");
  assert(reset.data.resetToken === null, "unknown reset request must not return a token");
});

await check("SACCO staff cannot cross tenant boundaries", async () => {
  const login = await api("POST", "/auth/login", {
    email: "admin@greenvalley.local",
    password: "Sacco@12345"
  });
  saccoToken = login.data.token;
  await expectStatus("GET", "/tenants/tenant_lake/profile", null, saccoToken, 403);
  await expectStatus("GET", "/operations/status?tenantId=tenant_lake", null, saccoToken, 403);
  await expectStatus("GET", "/members/import-template?tenantId=tenant_lake", null, saccoToken, 403);
});

await check("member sessions are isolated from staff APIs", async () => {
  const login = await api("POST", "/member-auth/login", {
    identifier: "GVS-0001",
    password: "Member@12345"
  });
  memberToken = login.data.token;
  assert(!JSON.stringify(login).includes("passwordHash"), "member login leaked passwordHash");
  assert(!JSON.stringify(login).includes("passwordSalt"), "member login leaked passwordSalt");
  const dashboard = await api("GET", "/member-auth/mobile-dashboard", null, memberToken);
  assert(dashboard.data.balances.savings >= 0, "member dashboard did not return balances");
  assert(Array.isArray(dashboard.data.loans), "member dashboard did not return loans");
  assert(Array.isArray(dashboard.data.notifications), "member dashboard did not return notifications");
  assert(Array.isArray(dashboard.data.pendingGuarantorRequests), "member dashboard did not return guarantor requests");
  await expectStatus("GET", "/users", null, memberToken, 401);
});

await check("repeated failed staff logins are rate limited", async () => {
  let limited = null;
  for (let index = 0; index < 8; index += 1) {
    const response = await raw("POST", "/auth/login", {
      email: `security-check-${Date.now()}-${index}@example.local`,
      password: "wrong-password"
    });
    if (response.status === 429) {
      limited = response;
      break;
    }
  }
  assert(limited?.status === 429, "login failures did not reach 429");
  assert(limited.headers.get("retry-after"), "429 response is missing Retry-After");
});

for (const result of checks) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` - ${result.detail}` : ""}`);
}

const failed = checks.filter((result) => !result.ok);
if (failed.length) {
  process.exitCode = 1;
} else {
  console.log(`Security hardening checks passed against ${baseUrl}`);
}

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
  }
}

async function api(method, path, body, token) {
  const response = await raw(method, path, body, token);
  const json = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function expectStatus(method, path, body, token, expectedStatus) {
  const response = await raw(method, path, body, token);
  assert(response.status === expectedStatus, `${method} ${path} returned ${response.status}, expected ${expectedStatus}`);
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
