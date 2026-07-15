import { hashPassword, newId, verifyPassword } from "./security.mjs";
import {
  createAuditEvent,
  createSession,
  db,
  findSessionByToken,
  publicTenant,
  publicUser,
  removeSession
} from "./store.mjs";
import { authToken, readJson, requestIp, sendData, sendError } from "./http.mjs";

const allowedTenantStatuses = new Set(["pending_review", "approved", "active", "suspended", "terminated"]);

export async function handleApi(request, response, url) {
  const correlationId = request.headers["x-correlation-id"] || newId("req");
  const path = url.pathname.replace(/^\/api\/v1/, "") || "/";
  const method = request.method || "GET";

  try {
    if (method === "GET" && path === "/health") {
      return sendData(response, {
        ok: true,
        service: "multiSaccoApp API",
        version: "0.1.0",
        timestamp: new Date().toISOString()
      });
    }

    if (method === "POST" && path === "/auth/login") return login(request, response, correlationId);

    const auth = requireAuth(request, response, correlationId);
    if (!auth) return;

    if (method === "GET" && path === "/auth/me") {
      return sendData(response, {
        user: publicUser(auth.user),
        tenant: publicTenant(db.tenants.find((tenant) => tenant.id === auth.user.tenantId))
      });
    }

    if (method === "POST" && path === "/auth/logout") {
      removeSession(auth.token);
      return sendData(response, { loggedOut: true });
    }

    if (method === "GET" && path === "/tenants") return listTenants(response, auth);
    if (method === "GET" && path.startsWith("/tenants/")) return getTenant(response, auth, path.split("/")[2], correlationId);
    if (method === "POST" && path === "/tenants") return createTenant(request, response, auth, correlationId);
    if (method === "PATCH" && path.startsWith("/tenants/") && path.endsWith("/status")) {
      return updateTenantStatus(request, response, auth, path.split("/")[2], correlationId);
    }

    if (method === "GET" && path === "/users") return listUsers(response, auth);
    if (method === "POST" && path === "/users") return createUser(request, response, auth, correlationId);
    if (method === "GET" && path === "/roles") return listRoles(response, auth);
    if (method === "GET" && path === "/permissions") return sendData(response, db.permissions);
    if (method === "GET" && path === "/audit-events") return listAuditEvents(response, auth);
    if (method === "POST" && path === "/audit-events") return createAudit(request, response, auth, correlationId);

    return sendError(response, 404, "NOT_FOUND", "API route not found.", correlationId);
  } catch (error) {
    return sendError(response, 500, "INTERNAL_ERROR", error.message || "Unexpected server error.", correlationId);
  }
}

async function login(request, response, correlationId) {
  const body = await readJson(request);
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const tenantId = String(body.tenantId || "").trim();

  if (!email || !password) return sendError(response, 400, "VALIDATION_ERROR", "Email and password are required.", correlationId);

  const user = db.users.find((item) => item.email.toLowerCase() === email && (!tenantId || item.tenantId === tenantId));
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return sendError(response, 401, "INVALID_CREDENTIALS", "Invalid email or password.", correlationId);
  }

  const { token, session } = createSession(user);
  createAuditEvent({
    tenantId: user.tenantId,
    actorUserId: user.id,
    actorName: user.fullName,
    action: "User logged in",
    resourceType: "session",
    resourceId: session.id,
    ipAddress: requestIp(request)
  });

  return sendData(response, { token, user: publicUser(user), expiresAt: session.expiresAt });
}

function requireAuth(request, response, correlationId) {
  const token = authToken(request);
  const auth = findSessionByToken(token);
  if (!auth) {
    sendError(response, 401, "AUTH_REQUIRED", "A valid bearer token is required.", correlationId);
    return null;
  }
  return { ...auth, token };
}

function isPlatform(auth) {
  return auth.user.tenantId === "tenant_platform";
}

function visibleTenantId(auth, requestedTenantId) {
  if (isPlatform(auth)) return requestedTenantId;
  return auth.user.tenantId;
}

function listTenants(response, auth) {
  const tenants = isPlatform(auth) ? db.tenants : db.tenants.filter((tenant) => tenant.id === auth.user.tenantId);
  return sendData(response, tenants.map(publicTenant));
}

function getTenant(response, auth, tenantId, correlationId) {
  const allowedTenantId = visibleTenantId(auth, tenantId);
  if (allowedTenantId !== tenantId) return sendError(response, 403, "TENANT_ACCESS_DENIED", "Cross-tenant access is not allowed.", correlationId);
  const tenant = db.tenants.find((item) => item.id === tenantId);
  if (!tenant) return sendError(response, 404, "TENANT_NOT_FOUND", "Tenant not found.", correlationId);
  return sendData(response, publicTenant(tenant));
}

async function createTenant(request, response, auth, correlationId) {
  if (!isPlatform(auth)) return sendError(response, 403, "PLATFORM_ADMIN_REQUIRED", "Only platform administrators can create tenants here.", correlationId);
  const body = await readJson(request);
  if (!body.name || !body.abbreviation) return sendError(response, 400, "VALIDATION_ERROR", "Tenant name and abbreviation are required.", correlationId);

  const tenant = {
    id: newId("tenant"),
    name: String(body.name),
    abbreviation: String(body.abbreviation).toUpperCase(),
    status: "pending_review",
    registrationNo: String(body.registrationNo || ""),
    district: String(body.district || ""),
    licenseExpiry: String(body.licenseExpiry || ""),
    packageId: String(body.packageId || ""),
    onboardingPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.tenants.push(tenant);
  createAuditEvent({
    tenantId: tenant.id,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created tenant ${tenant.name}`,
    resourceType: "tenant",
    resourceId: tenant.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, tenant, 201);
}

async function updateTenantStatus(request, response, auth, tenantId, correlationId) {
  if (!isPlatform(auth)) return sendError(response, 403, "PLATFORM_ADMIN_REQUIRED", "Only platform administrators can update tenant status.", correlationId);
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedTenantStatuses.has(status)) return sendError(response, 400, "INVALID_TENANT_STATUS", "Unsupported tenant status.", correlationId);
  const tenant = db.tenants.find((item) => item.id === tenantId);
  if (!tenant) return sendError(response, 404, "TENANT_NOT_FOUND", "Tenant not found.", correlationId);
  tenant.status = status;
  tenant.updatedAt = new Date().toISOString();
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Updated tenant status to ${status}`,
    resourceType: "tenant",
    resourceId: tenantId,
    ipAddress: requestIp(request)
  });
  return sendData(response, tenant);
}

function listUsers(response, auth) {
  const users = db.users.filter((user) => (isPlatform(auth) ? true : user.tenantId === auth.user.tenantId)).map(publicUser);
  return sendData(response, users);
}

async function createUser(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (tenantId !== String(body.tenantId || auth.user.tenantId)) {
    return sendError(response, 403, "TENANT_ACCESS_DENIED", "Cannot create a user in another tenant.", correlationId);
  }
  if (!body.fullName || !body.email || !body.password) {
    return sendError(response, 400, "VALIDATION_ERROR", "Full name, email, and password are required.", correlationId);
  }
  const email = String(body.email).toLowerCase().trim();
  if (db.users.some((user) => user.tenantId === tenantId && user.email.toLowerCase() === email)) {
    return sendError(response, 409, "USER_EXISTS", "A user with that email already exists in this tenant.", correlationId);
  }
  const password = hashPassword(String(body.password));
  const user = {
    id: newId("user"),
    tenantId,
    fullName: String(body.fullName),
    email,
    phone: String(body.phone || ""),
    passwordHash: password.hash,
    passwordSalt: password.salt,
    status: "active",
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created user ${user.email}`,
    resourceType: "user",
    resourceId: user.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicUser(user), 201);
}

function listRoles(response, auth) {
  const roles = db.roles.filter((role) => (isPlatform(auth) ? true : role.tenantId === auth.user.tenantId));
  return sendData(response, roles);
}

function listAuditEvents(response, auth) {
  const events = db.auditEvents.filter((event) => (isPlatform(auth) ? true : event.tenantId === auth.user.tenantId));
  return sendData(response, events);
}

async function createAudit(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (tenantId !== String(body.tenantId || auth.user.tenantId)) {
    return sendError(response, 403, "TENANT_ACCESS_DENIED", "Cannot write audit events for another tenant.", correlationId);
  }
  if (!body.action) return sendError(response, 400, "VALIDATION_ERROR", "Action is required.", correlationId);
  const event = createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: String(body.action),
    resourceType: body.resourceType ? String(body.resourceType) : null,
    resourceId: body.resourceId ? String(body.resourceId) : null,
    ipAddress: requestIp(request)
  });
  return sendData(response, event, 201);
}
