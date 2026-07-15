import { hashPassword, newId, verifyPassword } from "./security.mjs";
import {
  calculateSubscriptionBilling,
  createAuditEvent,
  createMemberSession,
  createSession,
  db,
  findMemberSessionByToken,
  findSessionByToken,
  guaranteeCapacity,
  memberBalances,
  publicMember,
  publicTenant,
  publicUser,
  removeMemberSession,
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
const allowedLoanProducts = new Set(["Development Loan", "Emergency Loan", "Agriculture Loan", "School Fees Loan"]);
const allowedGuarantorStatuses = new Set(["accepted", "rejected"]);
const allowedLoanDecisionStatuses = new Set(["approved", "rejected"]);

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
    if (method === "POST" && path === "/member-auth/login") return memberLogin(request, response, correlationId);

    if (path.startsWith("/member-auth/")) {
      const memberAuth = requireMemberAuth(request, response, correlationId);
      if (!memberAuth) return;
      if (method === "GET" && path === "/member-auth/me") return getMemberSession(response, memberAuth);
      if (method === "GET" && path === "/member-auth/guarantor-requests") return listMemberGuarantorRequests(response, memberAuth);
      if (method === "PATCH" && path.startsWith("/member-auth/guarantor-requests/") && path.endsWith("/status")) {
        return updateMemberGuarantorRequest(request, response, memberAuth, path.split("/")[3], correlationId);
      }
      if (method === "POST" && path === "/member-auth/logout") {
        removeMemberSession(memberAuth.token);
        return sendData(response, { loggedOut: true });
      }
    }

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
    if (method === "GET" && path === "/loans") return listLoans(response, auth, url);
    if (method === "POST" && path === "/loans") return createLoan(request, response, auth, correlationId);
    if (method === "PATCH" && path.startsWith("/loans/") && path.endsWith("/status")) {
      return updateLoanStatus(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/loans/") && path.endsWith("/disburse")) {
      return disburseLoan(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path.startsWith("/loans/") && path.endsWith("/guarantors")) {
      return listLoanGuarantors(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/loans/") && path.endsWith("/guarantors")) {
      return createLoanGuarantor(request, response, auth, path.split("/")[2], correlationId);
    }
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

async function memberLogin(request, response, correlationId) {
  const body = await readJson(request);
  const identifier = String(body.identifier || "").toLowerCase().trim();
  const password = String(body.password || "");

  if (!identifier || !password) return sendError(response, 400, "VALIDATION_ERROR", "Membership number, phone, email, and password are required.", correlationId);

  const member = db.members.find((item) => {
    const candidates = [item.membershipNo, item.phone, item.email].filter(Boolean).map((value) => String(value).toLowerCase());
    return candidates.includes(identifier);
  });
  if (!member || member.status !== "active" || !verifyPassword(password, member.passwordSalt, member.passwordHash)) {
    return sendError(response, 401, "INVALID_MEMBER_CREDENTIALS", "Invalid member credentials or inactive member account.", correlationId);
  }

  const { token, session } = createMemberSession(member);
  createAuditEvent({
    tenantId: member.tenantId,
    actorUserId: null,
    actorName: member.fullName,
    action: "Member logged in",
    resourceType: "member_session",
    resourceId: session.id,
    ipAddress: requestIp(request)
  });

  return sendData(response, {
    token,
    member: publicMember(member),
    tenant: publicTenant(db.tenants.find((tenant) => tenant.id === member.tenantId)),
    branch: db.branches.find((branch) => branch.id === member.branchId) || null,
    balances: memberBalances(member.id),
    expiresAt: session.expiresAt
  });
}

function getMemberSession(response, auth) {
  return sendData(response, {
    member: publicMember(auth.member),
    tenant: publicTenant(db.tenants.find((tenant) => tenant.id === auth.member.tenantId)),
    branch: db.branches.find((branch) => branch.id === auth.member.branchId) || null,
    balances: memberBalances(auth.member.id)
  });
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

function requireMemberAuth(request, response, correlationId) {
  const token = authToken(request);
  const auth = findMemberSessionByToken(token);
  if (!auth) {
    sendError(response, 401, "MEMBER_AUTH_REQUIRED", "A valid member bearer token is required.", correlationId);
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
  const billing = calculateSubscriptionBilling(memberCount);
  subscription.memberCount = billing.memberCount;
  subscription.billableMembers = billing.billableMembers;
  subscription.unitPrice = billing.unitPrice;
  subscription.tierId = billing.tierId;
  subscription.tierLabel = billing.tierLabel;
  subscription.billingDescription = billing.billingDescription;
  subscription.amount = billing.amount;
  subscription.paid = Math.min(subscription.paid, billing.amount);
  if (subscription.status === "active" && subscription.paid < billing.amount) subscription.status = "pending_payment";
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

  const password = hashPassword(String(body.password || "Member@12345"));
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
    passwordHash: password.hash,
    passwordSalt: password.salt,
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

function listLoans(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const loans = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.loans
    : db.loans.filter((loan) => loan.tenantId === tenantId);
  return sendData(response, loans.map(publicLoan));
}

function publicLoan(loan) {
  if (!loan) return null;
  const guarantors = db.loanGuarantors.filter((item) => item.loanId === loan.id);
  return {
    ...loan,
    guarantors: guarantors.filter((item) => item.status === "accepted").length || loan.guarantors,
    guarantorRequests: guarantors.length,
    pendingGuarantors: guarantors.filter((item) => item.status === "pending").length
  };
}

async function createLoan(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const member = db.members.find((item) => item.id === String(body.memberId) && item.tenantId === tenantId);
  if (!member) return sendError(response, 400, "INVALID_MEMBER", "Member does not exist for this tenant.", correlationId);
  if (member.status !== "active") return sendError(response, 400, "MEMBER_NOT_ACTIVE", "Only active members can apply for loans.", correlationId);

  const product = String(body.product || "");
  const amount = Number(body.amount);
  const repaymentMonths = Number(body.repaymentMonths || 12);
  if (!allowedLoanProducts.has(product)) return sendError(response, 400, "INVALID_LOAN_PRODUCT", "Unsupported loan product.", correlationId);
  if (!Number.isFinite(amount) || amount <= 0) return sendError(response, 400, "INVALID_LOAN_AMOUNT", "Loan amount must be greater than zero.", correlationId);
  if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 60) {
    return sendError(response, 400, "INVALID_REPAYMENT_PERIOD", "Repayment period must be between 1 and 60 months.", correlationId);
  }

  const balances = memberBalances(member.id);
  const dsr = Math.min(65, Math.round((amount / Math.max(balances.savings * 3, 1)) * 35));
  const loan = {
    id: newId("loan"),
    tenantId,
    memberId: member.id,
    product,
    amount,
    balance: 0,
    status: "submitted",
    stage: "Credit Appraisal",
    guarantors: 0,
    dsr,
    repaymentMonths,
    purpose: String(body.purpose || ""),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.loans.push(loan);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Submitted loan application for ${member.membershipNo}`,
    resourceType: "loan",
    resourceId: loan.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicLoan(loan), 201);
}

async function updateLoanStatus(request, response, auth, loanId, correlationId) {
  const loan = db.loans.find((item) => item.id === loanId);
  if (!loan) return sendError(response, 404, "LOAN_NOT_FOUND", "Loan not found.", correlationId);
  if (!assertTenantAccess(auth, loan.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedLoanDecisionStatuses.has(status)) {
    return sendError(response, 400, "INVALID_LOAN_STATUS", "Loans can only be approved or rejected from this endpoint.", correlationId);
  }
  if (!["submitted", "under_review"].includes(loan.status)) {
    return sendError(response, 409, "LOAN_ALREADY_DECIDED", "Only submitted or under-review loans can be decided.", correlationId);
  }
  const acceptedGuarantors = db.loanGuarantors.filter((item) => item.loanId === loan.id && item.status === "accepted");
  if (status === "approved" && acceptedGuarantors.length < 1) {
    return sendError(response, 409, "GUARANTOR_REQUIRED", "At least one accepted guarantor is required before loan approval.", correlationId);
  }

  loan.status = status;
  loan.stage = status === "approved" ? "Ready for Disbursement" : "Rejected";
  loan.approvedByUserId = status === "approved" ? auth.user.id : null;
  loan.approvedAt = status === "approved" ? new Date().toISOString() : null;
  loan.rejectionReason = status === "rejected" ? String(body.reason || "") : "";
  loan.updatedAt = new Date().toISOString();
  createAuditEvent({
    tenantId: loan.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `${status === "approved" ? "Approved" : "Rejected"} loan application`,
    resourceType: "loan",
    resourceId: loan.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicLoan(loan));
}

async function disburseLoan(request, response, auth, loanId, correlationId) {
  const loan = db.loans.find((item) => item.id === loanId);
  if (!loan) return sendError(response, 404, "LOAN_NOT_FOUND", "Loan not found.", correlationId);
  if (!assertTenantAccess(auth, loan.tenantId, response, correlationId)) return;
  if (loan.status !== "approved") {
    return sendError(response, 409, "LOAN_NOT_APPROVED", "A loan must be approved before disbursement.", correlationId);
  }

  loan.status = "active";
  loan.stage = "Disbursed";
  loan.balance = loan.amount;
  loan.disbursedByUserId = auth.user.id;
  loan.disbursedAt = new Date().toISOString();
  loan.updatedAt = loan.disbursedAt;
  createAuditEvent({
    tenantId: loan.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: "Disbursed loan",
    resourceType: "loan",
    resourceId: loan.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicLoan(loan));
}

function listLoanGuarantors(response, auth, loanId, correlationId) {
  const loan = db.loans.find((item) => item.id === loanId);
  if (!loan) return sendError(response, 404, "LOAN_NOT_FOUND", "Loan not found.", correlationId);
  if (!assertTenantAccess(auth, loan.tenantId, response, correlationId)) return;
  return sendData(response, db.loanGuarantors.filter((item) => item.loanId === loan.id));
}

async function createLoanGuarantor(request, response, auth, loanId, correlationId) {
  const loan = db.loans.find((item) => item.id === loanId);
  if (!loan) return sendError(response, 404, "LOAN_NOT_FOUND", "Loan not found.", correlationId);
  if (!assertTenantAccess(auth, loan.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const guarantor = db.members.find((item) => item.id === String(body.memberId) && item.tenantId === loan.tenantId);
  if (!guarantor) return sendError(response, 400, "INVALID_GUARANTOR", "Guarantor member does not exist for this tenant.", correlationId);
  if (guarantor.status !== "active") return sendError(response, 400, "GUARANTOR_NOT_ACTIVE", "Only active members can guarantee a loan.", correlationId);
  if (guarantor.id === loan.memberId) return sendError(response, 409, "BORROWER_CANNOT_GUARANTEE", "A borrower cannot guarantee their own loan.", correlationId);
  if (db.loanGuarantors.some((item) => item.loanId === loan.id && item.memberId === guarantor.id && item.status !== "rejected")) {
    return sendError(response, 409, "GUARANTOR_ALREADY_REQUESTED", "This guarantor already has an active request for the loan.", correlationId);
  }

  const guaranteedAmount = Number(body.guaranteedAmount || Math.ceil(loan.amount / 2));
  if (!Number.isFinite(guaranteedAmount) || guaranteedAmount <= 0) {
    return sendError(response, 400, "INVALID_GUARANTEE_AMOUNT", "Guarantee amount must be greater than zero.", correlationId);
  }
  if (guaranteedAmount > guaranteeCapacity(guarantor.id)) {
    return sendError(response, 409, "GUARANTEE_CAPACITY_EXCEEDED", "Requested guarantee exceeds the member's available guarantee capacity.", correlationId);
  }

  const requestRecord = {
    id: newId("guarantor"),
    tenantId: loan.tenantId,
    loanId: loan.id,
    memberId: guarantor.id,
    guaranteedAmount,
    status: "pending",
    requestedByUserId: auth.user.id,
    decidedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.loanGuarantors.push(requestRecord);
  loan.stage = "Guarantor Review";
  loan.updatedAt = new Date().toISOString();
  createAuditEvent({
    tenantId: loan.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Requested loan guarantor ${guarantor.membershipNo}`,
    resourceType: "loan_guarantor",
    resourceId: requestRecord.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, requestRecord, 201);
}

function listMemberGuarantorRequests(response, auth) {
  const requests = db.loanGuarantors
    .filter((item) => item.memberId === auth.member.id)
    .map((item) => ({
      ...item,
      loan: publicLoan(db.loans.find((loan) => loan.id === item.loanId)),
      borrower: publicMember(db.members.find((member) => member.id === db.loans.find((loan) => loan.id === item.loanId)?.memberId)),
      capacity: guaranteeCapacity(auth.member.id, item.id)
    }));
  return sendData(response, requests);
}

async function updateMemberGuarantorRequest(request, response, auth, guarantorId, correlationId) {
  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedGuarantorStatuses.has(status)) {
    return sendError(response, 400, "INVALID_GUARANTOR_STATUS", "Guarantor requests can only be accepted or rejected.", correlationId);
  }
  const requestRecord = db.loanGuarantors.find((item) => item.id === guarantorId && item.memberId === auth.member.id);
  if (!requestRecord) return sendError(response, 404, "GUARANTOR_REQUEST_NOT_FOUND", "Guarantor request not found.", correlationId);
  if (requestRecord.status !== "pending") return sendError(response, 409, "GUARANTOR_ALREADY_DECIDED", "Only pending guarantor requests can be decided.", correlationId);
  if (status === "accepted" && requestRecord.guaranteedAmount > guaranteeCapacity(auth.member.id, requestRecord.id)) {
    return sendError(response, 409, "GUARANTEE_CAPACITY_EXCEEDED", "Guarantee exceeds your available guarantee capacity.", correlationId);
  }

  requestRecord.status = status;
  requestRecord.decidedAt = new Date().toISOString();
  requestRecord.updatedAt = requestRecord.decidedAt;
  const loan = db.loans.find((item) => item.id === requestRecord.loanId);
  if (loan) {
    loan.guarantors = db.loanGuarantors.filter((item) => item.loanId === loan.id && item.status === "accepted").length;
    loan.stage = loan.guarantors > 0 ? "Loan Committee" : loan.stage;
    loan.updatedAt = new Date().toISOString();
  }
  createAuditEvent({
    tenantId: requestRecord.tenantId,
    actorUserId: null,
    actorName: auth.member.fullName,
    action: `${status === "accepted" ? "Accepted" : "Rejected"} loan guarantee request`,
    resourceType: "loan_guarantor",
    resourceId: requestRecord.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, requestRecord);
}
