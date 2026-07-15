import { hashPassword, newId, verifyPassword } from "./security.mjs";
import {
  MINIMUM_BILLABLE_MEMBERS,
  SUBSCRIPTION_UNIT_PRICE,
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
const allowedBranchStatuses = new Set(["active", "inactive"]);
const allowedMemberStatuses = new Set(["applicant", "pending_approval", "active", "inactive", "dormant", "suspended", "exited"]);
const allowedKycStatuses = new Set(["not_verified", "pending_verification", "verified", "rejected", "expired"]);
const allowedMemberTypes = new Set(["individual", "group", "institutional", "corporate"]);
const allowedTransactionTypes = new Set(["savings_deposit", "share_purchase", "welfare_contribution", "withdrawal"]);
const allowedTransactionChannels = new Set(["mobile_money", "cash", "bank", "payroll_deduction"]);
const allowedTransactionDecisionStatuses = new Set(["posted", "rejected"]);

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
    if (method === "GET" && path === "/subscription-packages") return sendData(response, db.subscriptionPackages);
    if (method === "GET" && path === "/subscriptions") return listSubscriptions(response, auth, url);
    if (method === "POST" && path.startsWith("/subscriptions/") && path.endsWith("/payments")) {
      return recordSubscriptionPayment(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/branches") return listBranches(response, auth, url);
    if (method === "POST" && path === "/branches") return createBranch(request, response, auth, correlationId);
    if (method === "GET" && path === "/members") return listMembers(response, auth, url);
    if (method === "POST" && path === "/members") return createMember(request, response, auth, correlationId);
    if (method === "GET" && path === "/financial-transactions") return listFinancialTransactions(response, auth, url);
    if (method === "POST" && path === "/financial-transactions") return createFinancialTransaction(request, response, auth, correlationId);
    if (method === "PATCH" && path.startsWith("/financial-transactions/") && path.endsWith("/status")) {
      return updateFinancialTransactionStatus(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path.startsWith("/members/") && path.endsWith("/documents")) {
      return listMemberDocuments(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/members/") && path.endsWith("/documents")) {
      return createMemberDocument(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path.startsWith("/members/")) return getMember(response, auth, path.split("/")[2], correlationId);
    if (method === "PATCH" && path.startsWith("/members/") && path.endsWith("/status")) {
      return updateMemberStatus(request, response, auth, path.split("/")[2], correlationId);
    }

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

function requestedTenant(auth, url) {
  return visibleTenantId(auth, url.searchParams.get("tenantId") || auth.user.tenantId);
}

function assertTenantAccess(auth, tenantId, response, correlationId) {
  if (visibleTenantId(auth, tenantId) !== tenantId) {
    sendError(response, 403, "TENANT_ACCESS_DENIED", "Cross-tenant access is not allowed.", correlationId);
    return false;
  }
  return true;
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

function listSubscriptions(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const subscriptions = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.subscriptions
    : db.subscriptions.filter((subscription) => subscription.tenantId === tenantId);
  return sendData(response, subscriptions.map(refreshSubscriptionBilling));
}

function refreshSubscriptionBilling(subscription) {
  const memberCount = db.members.filter((member) => member.tenantId === subscription.tenantId).length;
  const billableMembers = Math.max(memberCount, MINIMUM_BILLABLE_MEMBERS);
  const amount = billableMembers * SUBSCRIPTION_UNIT_PRICE;
  subscription.memberCount = memberCount;
  subscription.billableMembers = billableMembers;
  subscription.unitPrice = SUBSCRIPTION_UNIT_PRICE;
  subscription.amount = amount;
  subscription.paid = Math.min(subscription.paid, amount);
  if (subscription.status === "active" && subscription.paid < amount) subscription.status = "pending_payment";
  return subscription;
}

async function recordSubscriptionPayment(request, response, auth, subscriptionId, correlationId) {
  if (!isPlatform(auth)) {
    return sendError(response, 403, "PLATFORM_ADMIN_REQUIRED", "Only platform administrators can record subscription payments.", correlationId);
  }
  const subscription = db.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return sendError(response, 404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.", correlationId);
  refreshSubscriptionBilling(subscription);

  const body = await readJson(request);
  const amount = Number(body.amount || subscription.amount - subscription.paid);
  if (!Number.isFinite(amount) || amount <= 0) return sendError(response, 400, "INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero.", correlationId);

  const existing = body.externalReference
    ? db.subscriptionPayments.find((payment) => payment.externalReference === String(body.externalReference))
    : null;
  if (existing) return sendData(response, { subscription, payment: existing, idempotent: true });

  const payment = {
    id: newId("subscription_payment"),
    subscriptionId,
    tenantId: subscription.tenantId,
    amount,
    channel: String(body.channel || "manual"),
    externalReference: String(body.externalReference || newId("manual_ref")),
    receivedAt: new Date().toISOString(),
    recordedBy: auth.user.id
  };
  db.subscriptionPayments.push(payment);
  subscription.paid = Math.min(subscription.amount, subscription.paid + amount);
  subscription.status = subscription.paid >= subscription.amount ? "active" : "pending_payment";
  subscription.expiry = subscription.status === "active" ? "2027-07-15" : subscription.expiry;
  subscription.updatedAt = new Date().toISOString();

  createAuditEvent({
    tenantId: subscription.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Recorded subscription payment ${payment.externalReference}`,
    resourceType: "subscription",
    resourceId: subscription.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, { subscription, payment }, 201);
}

function listBranches(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const branches = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.branches
    : db.branches.filter((branch) => branch.tenantId === tenantId);
  return sendData(response, branches);
}

async function createBranch(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;
  if (!body.code || !body.name) return sendError(response, 400, "VALIDATION_ERROR", "Branch code and name are required.", correlationId);
  const code = String(body.code).toUpperCase().trim();
  if (db.branches.some((branch) => branch.tenantId === tenantId && branch.code.toUpperCase() === code)) {
    return sendError(response, 409, "BRANCH_EXISTS", "A branch with that code already exists in this tenant.", correlationId);
  }
  const branch = {
    id: newId("branch"),
    tenantId,
    code,
    name: String(body.name),
    address: String(body.address || ""),
    managerUserId: body.managerUserId ? String(body.managerUserId) : null,
    status: allowedBranchStatuses.has(String(body.status || "active")) ? String(body.status || "active") : "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.branches.push(branch);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created branch ${branch.code}`,
    resourceType: "branch",
    resourceId: branch.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, branch, 201);
}

function listMembers(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const members = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.members
    : db.members.filter((member) => member.tenantId === tenantId);
  return sendData(response, members);
}

async function createMember(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  if (!body.branchId || !body.fullName || !body.phone) {
    return sendError(response, 400, "VALIDATION_ERROR", "Branch, full name, and phone are required.", correlationId);
  }
  const branch = db.branches.find((item) => item.id === String(body.branchId) && item.tenantId === tenantId);
  if (!branch) return sendError(response, 400, "INVALID_BRANCH", "Branch does not exist for this tenant.", correlationId);

  const memberType = String(body.memberType || "individual");
  const kycStatus = String(body.kycStatus || "pending_verification");
  if (!allowedMemberTypes.has(memberType)) return sendError(response, 400, "INVALID_MEMBER_TYPE", "Unsupported member type.", correlationId);
  if (!allowedKycStatuses.has(kycStatus)) return sendError(response, 400, "INVALID_KYC_STATUS", "Unsupported KYC status.", correlationId);

  const tenant = db.tenants.find((item) => item.id === tenantId);
  const count = db.members.filter((member) => member.tenantId === tenantId).length + 1;
  const membershipNo = String(body.membershipNo || `${tenant?.abbreviation || "SACCO"}-${String(count).padStart(4, "0")}`);

  if (db.members.some((member) => member.tenantId === tenantId && member.membershipNo.toUpperCase() === membershipNo.toUpperCase())) {
    return sendError(response, 409, "MEMBER_EXISTS", "A member with that membership number already exists.", correlationId);
  }

  const member = {
    id: newId("member"),
    tenantId,
    branchId: branch.id,
    membershipNo,
    fullName: String(body.fullName),
    memberType,
    phone: String(body.phone),
    email: String(body.email || ""),
    nationalId: String(body.nationalId || ""),
    status: "pending_approval",
    kycStatus,
    joiningDate: String(body.joiningDate || new Date().toISOString().slice(0, 10)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.members.push(member);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Registered member ${member.membershipNo}`,
    resourceType: "member",
    resourceId: member.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, member, 201);
}

function getMember(response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  return sendData(response, member);
}

async function updateMemberStatus(request, response, auth, memberId, correlationId) {
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedMemberStatuses.has(status)) return sendError(response, 400, "INVALID_MEMBER_STATUS", "Unsupported member status.", correlationId);
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  member.status = status;
  member.updatedAt = new Date().toISOString();
  createAuditEvent({
    tenantId: member.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Updated member ${member.membershipNo} status to ${status}`,
    resourceType: "member",
    resourceId: member.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, member);
}

function listMemberDocuments(response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  return sendData(response, db.memberDocuments.filter((document) => document.memberId === memberId));
}

async function createMemberDocument(request, response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  const body = await readJson(request);
  if (!body.documentType || !body.storageKey) {
    return sendError(response, 400, "VALIDATION_ERROR", "Document type and storage key are required.", correlationId);
  }
  const verificationStatus = String(body.verificationStatus || "pending_verification");
  if (!allowedKycStatuses.has(verificationStatus)) return sendError(response, 400, "INVALID_VERIFICATION_STATUS", "Unsupported verification status.", correlationId);
  const document = {
    id: newId("doc"),
    tenantId: member.tenantId,
    memberId,
    documentType: String(body.documentType),
    storageKey: String(body.storageKey),
    verificationStatus,
    createdAt: new Date().toISOString()
  };
  db.memberDocuments.push(document);
  createAuditEvent({
    tenantId: member.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Registered ${document.documentType} document for ${member.membershipNo}`,
    resourceType: "member_document",
    resourceId: document.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, document, 201);
}

function listFinancialTransactions(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const transactions = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.financialTransactions
    : db.financialTransactions.filter((transaction) => transaction.tenantId === tenantId);
  return sendData(response, transactions);
}

async function createFinancialTransaction(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const member = db.members.find((item) => item.id === String(body.memberId) && item.tenantId === tenantId);
  if (!member) return sendError(response, 400, "INVALID_MEMBER", "Member does not exist for this tenant.", correlationId);

  const branchId = String(body.branchId || member.branchId);
  const branch = db.branches.find((item) => item.id === branchId && item.tenantId === tenantId);
  if (!branch) return sendError(response, 400, "INVALID_BRANCH", "Branch does not exist for this tenant.", correlationId);

  const type = String(body.type || "");
  const channel = String(body.channel || "");
  const amount = Number(body.amount);
  if (!allowedTransactionTypes.has(type)) return sendError(response, 400, "INVALID_TRANSACTION_TYPE", "Unsupported transaction type.", correlationId);
  if (!allowedTransactionChannels.has(channel)) return sendError(response, 400, "INVALID_PAYMENT_CHANNEL", "Unsupported payment channel.", correlationId);
  if (!Number.isFinite(amount) || amount <= 0) return sendError(response, 400, "INVALID_TRANSACTION_AMOUNT", "Amount must be greater than zero.", correlationId);

  const tenant = db.tenants.find((item) => item.id === tenantId);
  const count = db.financialTransactions.filter((transaction) => transaction.tenantId === tenantId).length + 1;
  const reference = `${tenant?.abbreviation || "SACCO"}-TX-${String(count).padStart(4, "0")}`;
  const transaction = {
    id: newId("txn"),
    tenantId,
    branchId,
    memberId: member.id,
    type,
    channel,
    amount,
    status: "pending_approval",
    reference,
    narration: String(body.narration || ""),
    makerUserId: auth.user.id,
    checkerUserId: null,
    postedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.financialTransactions.push(transaction);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Submitted financial transaction ${reference}`,
    resourceType: "financial_transaction",
    resourceId: transaction.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, transaction, 201);
}

async function updateFinancialTransactionStatus(request, response, auth, transactionId, correlationId) {
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedTransactionDecisionStatuses.has(status)) {
    return sendError(response, 400, "INVALID_TRANSACTION_STATUS", "Financial transactions can only be posted or rejected from the approval queue.", correlationId);
  }

  const transaction = db.financialTransactions.find((item) => item.id === transactionId);
  if (!transaction) return sendError(response, 404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.", correlationId);
  if (!assertTenantAccess(auth, transaction.tenantId, response, correlationId)) return;
  if (transaction.status !== "pending_approval") {
    return sendError(response, 409, "TRANSACTION_ALREADY_DECIDED", "Only pending financial transactions can be decided.", correlationId);
  }
  if (transaction.makerUserId === auth.user.id) {
    return sendError(response, 409, "MAKER_CHECKER_REQUIRED", "The maker cannot approve or reject their own financial transaction.", correlationId);
  }

  const now = new Date().toISOString();
  transaction.status = status;
  transaction.checkerUserId = auth.user.id;
  transaction.updatedAt = now;
  if (status === "posted") transaction.postedAt = now;
  if (status === "rejected") {
    transaction.postedAt = null;
    transaction.rejectionReason = String(body.reason || "");
  }

  createAuditEvent({
    tenantId: transaction.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `${status === "posted" ? "Posted" : "Rejected"} financial transaction ${transaction.reference}`,
    resourceType: "financial_transaction",
    resourceId: transaction.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, transaction);
}
