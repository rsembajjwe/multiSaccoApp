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
const allowedFinancialProductTypes = new Set(["savings", "shares", "welfare"]);
const allowedTransactionTypes = new Set(["savings_deposit", "share_purchase", "welfare_contribution", "withdrawal"]);
const allowedTransactionChannels = new Set(["mobile_money", "cash", "bank", "payroll_deduction"]);
const allowedTransactionDecisionStatuses = new Set(["posted", "rejected"]);
const allowedWelfareClaimDecisionStatuses = new Set(["approved", "rejected"]);
const allowedWelfareClaimPaymentChannels = new Set(["mobile_money", "cash", "bank"]);
const allowedStatementChannels = new Set(["mobile_money", "cash", "bank", "payroll_deduction"]);
const allowedAccountingPeriodStatuses = new Set(["open", "closed"]);
const allowedExpenseChannels = new Set(["mobile_money", "cash", "bank", "payroll_deduction"]);
const allowedExpenseAccountCodes = new Set(["5000", "5010", "5020", "5030", "5040", "6100"]);
const allowedAssetChannels = new Set(["mobile_money", "cash", "bank", "payroll_deduction"]);
const allowedAssetCategories = new Set(["equipment", "furniture", "vehicle", "building", "technology", "other"]);
const allowedMobileMoneyPurposes = new Set(["savings_deposit", "share_purchase", "welfare_contribution", "loan_repayment"]);
const allowedLoanProducts = new Set(["Development Loan", "Emergency Loan", "Agriculture Loan", "School Fees Loan"]);
const allowedGuarantorStatuses = new Set(["accepted", "rejected"]);
const allowedLoanDecisionStatuses = new Set(["approved", "rejected"]);
const allowedRepaymentChannels = new Set(["mobile_money", "cash", "bank", "payroll_deduction"]);
const allowedMeetingTypes = new Set(["board", "agm", "credit_committee", "audit_committee", "management"]);
const allowedGovernanceStatuses = new Set(["scheduled", "completed", "cancelled"]);
const allowedResolutionStatuses = new Set(["open", "in_progress", "closed"]);
const allowedComplaintCategories = new Set(["statement", "loan", "savings", "shares", "service", "other"]);
const allowedComplaintPriorities = new Set(["low", "medium", "high"]);
const allowedComplaintStatuses = new Set(["open", "in_progress", "resolved", "closed"]);
const rateLimitBuckets = new Map();
const rateLimitPolicies = {
  staffLogin: { max: 5, windowMs: 60_000 },
  memberLogin: { max: 5, windowMs: 60_000 },
  mobileMoneyCallback: { max: 20, windowMs: 60_000 }
};

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

    if (method === "POST" && path === "/auth/login") {
      if (!allowRequest(request, response, correlationId, "staffLogin")) return;
      return login(request, response, correlationId);
    }
    if (method === "POST" && path === "/member-auth/login") {
      if (!allowRequest(request, response, correlationId, "memberLogin")) return;
      return memberLogin(request, response, correlationId);
    }
    if (method === "POST" && path === "/integrations/mobile-money/callback") {
      if (!allowRequest(request, response, correlationId, "mobileMoneyCallback")) return;
      return receiveMobileMoneyCallback(request, response, correlationId);
    }

    if (path.startsWith("/member-auth/")) {
      const memberAuth = requireMemberAuth(request, response, correlationId);
      if (!memberAuth) return;
      if (method === "GET" && path === "/member-auth/me") return getMemberSession(response, memberAuth);
      if (method === "GET" && path === "/member-auth/mobile-dashboard") return getMemberMobileDashboard(response, memberAuth);
      if (method === "POST" && path === "/member-auth/mobile-loans") return createMemberMobileLoan(request, response, memberAuth, correlationId);
      if (method === "POST" && path === "/member-auth/mobile-complaints") return createMemberMobileComplaint(request, response, memberAuth, correlationId);
      if (method === "GET" && path === "/member-auth/notifications") return listMemberNotifications(response, memberAuth);
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
    if (method === "GET" && path.startsWith("/tenants/") && path.endsWith("/profile")) {
      return getSaccoProfile(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "PATCH" && path.startsWith("/tenants/") && path.endsWith("/profile")) {
      return updateSaccoProfile(request, response, auth, path.split("/")[2], correlationId);
    }
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
    if (method === "GET" && path === "/accounting-periods") return listAccountingPeriods(response, auth, url);
    if (method === "PATCH" && path.startsWith("/accounting-periods/") && path.endsWith("/status")) {
      return updateAccountingPeriodStatus(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/chart-of-accounts") return listChartOfAccounts(response);
    if (method === "GET" && path === "/journal-entries") return listJournalEntries(response, auth, url);
    if (method === "GET" && path === "/statement-lines") return listStatementLines(response, auth, url);
    if (method === "POST" && path === "/statement-lines") return createStatementLine(request, response, auth, correlationId);
    if (method === "GET" && path === "/reconciliation") return getReconciliation(response, auth, url);
    if (method === "GET" && path === "/regulatory-report") return getRegulatoryReport(response, auth, url);
    if (method === "GET" && path === "/integrations/mobile-money/callbacks") return listMobileMoneyCallbacks(response, auth, url);
    if (method === "GET" && path === "/notifications/deliveries") return listNotificationDeliveries(response, auth, url);
    if (method === "GET" && path === "/suppliers") return listSuppliers(response, auth, url);
    if (method === "POST" && path === "/suppliers") return createSupplier(request, response, auth, correlationId);
    if (method === "GET" && path === "/expenses") return listExpenses(response, auth, url);
    if (method === "POST" && path === "/expenses") return createExpense(request, response, auth, correlationId);
    if (method === "GET" && path === "/assets") return listAssets(response, auth, url);
    if (method === "POST" && path === "/assets") return createAsset(request, response, auth, correlationId);
    if (method === "GET" && path === "/governance-meetings") return listGovernanceMeetings(response, auth, url);
    if (method === "POST" && path === "/governance-meetings") return createGovernanceMeeting(request, response, auth, correlationId);
    if (method === "POST" && path.startsWith("/governance-meetings/") && path.endsWith("/resolutions")) {
      return createGovernanceResolution(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/complaints") return listComplaints(response, auth, url);
    if (method === "POST" && path === "/complaints") return createComplaint(request, response, auth, correlationId);
    if (method === "PATCH" && path.startsWith("/complaints/") && path.endsWith("/status")) {
      return updateComplaintStatus(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/subscription-packages") return sendData(response, db.subscriptionPackages);
    if (method === "GET" && path === "/subscriptions") return listSubscriptions(response, auth, url);
    if (method === "POST" && path.startsWith("/subscriptions/") && path.endsWith("/payments")) {
      return recordSubscriptionPayment(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/branches") return listBranches(response, auth, url);
    if (method === "POST" && path === "/branches") return createBranch(request, response, auth, correlationId);
    if (method === "GET" && path === "/members") return listMembers(response, auth, url);
    if (method === "POST" && path === "/members") return createMember(request, response, auth, correlationId);
    if (method === "GET" && path.startsWith("/members/") && path.endsWith("/statement")) {
      return getMemberStatement(response, auth, path.split("/")[2], url, correlationId);
    }
    if (method === "GET" && path === "/financial-products") return listFinancialProducts(response, auth, url, correlationId);
    if (method === "POST" && path === "/financial-products") return createFinancialProduct(request, response, auth, correlationId);
    if (method === "GET" && path === "/financial-accounts") return listFinancialAccounts(response, auth, url, correlationId);
    if (method === "POST" && path === "/financial-accounts") return openFinancialAccount(request, response, auth, correlationId);
    if (method === "GET" && path === "/financial-transactions") return listFinancialTransactions(response, auth, url);
    if (method === "POST" && path === "/financial-transactions") return createFinancialTransaction(request, response, auth, correlationId);
    if (method === "GET" && path.startsWith("/financial-transactions/") && path.endsWith("/receipt")) {
      return getFinancialTransactionReceipt(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/financial-transactions/") && path.endsWith("/reversal")) {
      return reverseFinancialTransaction(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/welfare-claims") return listWelfareClaims(response, auth, url, correlationId);
    if (method === "POST" && path === "/welfare-claims") return createWelfareClaim(request, response, auth, correlationId);
    if (method === "PATCH" && path.startsWith("/welfare-claims/") && path.endsWith("/status")) {
      return updateWelfareClaimStatus(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/welfare-claims/") && path.endsWith("/payment")) {
      return payWelfareClaim(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path === "/loans") return listLoans(response, auth, url);
    if (method === "POST" && path === "/loans") return createLoan(request, response, auth, correlationId);
    if (method === "PATCH" && path.startsWith("/loans/") && path.endsWith("/status")) {
      return updateLoanStatus(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/loans/") && path.endsWith("/disburse")) {
      return disburseLoan(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path.startsWith("/loans/") && path.endsWith("/repayments")) {
      return listLoanRepayments(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/loans/") && path.endsWith("/repayments")) {
      return recordLoanRepayment(request, response, auth, path.split("/")[2], correlationId);
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
    if (method === "GET" && path.startsWith("/members/") && path.endsWith("/next-of-kin")) {
      return listMemberNextOfKin(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/members/") && path.endsWith("/next-of-kin")) {
      return createMemberNextOfKin(request, response, auth, path.split("/")[2], correlationId);
    }
    if (method === "GET" && path.startsWith("/members/") && path.endsWith("/beneficiaries")) {
      return listMemberBeneficiaries(response, auth, path.split("/")[2], correlationId);
    }
    if (method === "POST" && path.startsWith("/members/") && path.endsWith("/beneficiaries")) {
      return createMemberBeneficiary(request, response, auth, path.split("/")[2], correlationId);
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

function allowRequest(request, response, correlationId, policyName) {
  const policy = rateLimitPolicies[policyName];
  const now = Date.now();
  const key = `${policyName}:${requestIp(request)}`;
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    return true;
  }

  bucket.count += 1;
  if (bucket.count <= policy.max) return true;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  sendError(response, 429, "RATE_LIMITED", "Too many requests. Please try again later.", correlationId, {
    "Retry-After": String(retryAfter)
  });
  return false;
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

function getMemberMobileDashboard(response, auth) {
  const member = auth.member;
  const balances = memberBalances(member.id);
  const loans = db.loans
    .filter((loan) => loan.memberId === member.id)
    .map(publicLoan);
  const notifications = db.notifications
    .filter((notification) => notification.memberId === member.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const guarantorRequests = db.loanGuarantors
    .filter((request) => request.memberId === member.id && request.status === "pending")
    .map((request) => publicMemberGuarantorRequest(request, member.id));
  const transactionTimes = db.financialTransactions
    .filter((transaction) => transaction.memberId === member.id && transaction.status === "posted")
    .map((transaction) => transaction.postedAt || transaction.updatedAt || transaction.createdAt);
  const repaymentTimes = db.loanRepayments
    .filter((repayment) => repayment.memberId === member.id)
    .map((repayment) => repayment.receivedAt || repayment.updatedAt || repayment.createdAt);
  const lastUpdatedAt = [...transactionTimes, ...repaymentTimes, ...notifications.map((notification) => notification.createdAt)]
    .filter(Boolean)
    .sort()
    .at(-1) || new Date().toISOString();

  return sendData(response, {
    member: publicMember(member),
    tenant: publicTenant(db.tenants.find((tenant) => tenant.id === member.tenantId)),
    branch: db.branches.find((branch) => branch.id === member.branchId) || null,
    balances,
    loans,
    notifications: notifications.slice(0, 5),
    pendingGuarantorRequests: guarantorRequests,
    lastUpdatedAt,
    serverConfirmed: true
  });
}

function listMemberNotifications(response, auth) {
  return sendData(response, db.notifications
    .filter((notification) => notification.memberId === auth.member.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
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
  db.saccoProfiles.push({
    id: newId("profile"),
    tenantId: tenant.id,
    legalName: tenant.name,
    tin: "",
    umraLicenseNo: "",
    cooperativeRegistrationNo: tenant.registrationNo,
    address: "",
    email: "",
    phone: "",
    website: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
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

function getSaccoProfile(response, auth, tenantId, correlationId) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  if (!tenant) return sendError(response, 404, "TENANT_NOT_FOUND", "Tenant not found.", correlationId);
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;
  const profile = db.saccoProfiles.find((item) => item.tenantId === tenantId);
  if (!profile) return sendError(response, 404, "SACCO_PROFILE_NOT_FOUND", "SACCO profile not found.", correlationId);
  return sendData(response, profile);
}

async function updateSaccoProfile(request, response, auth, tenantId, correlationId) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  if (!tenant) return sendError(response, 404, "TENANT_NOT_FOUND", "Tenant not found.", correlationId);
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;
  const body = await readJson(request);
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return sendError(response, 400, "VALIDATION_ERROR", "Email must be a well-formed email address.", correlationId);
  }

  let profile = db.saccoProfiles.find((item) => item.tenantId === tenantId);
  if (!profile) {
    profile = {
      id: newId("profile"),
      tenantId,
      legalName: tenant.name,
      tin: "",
      umraLicenseNo: "",
      cooperativeRegistrationNo: tenant.registrationNo,
      address: "",
      email: "",
      phone: "",
      website: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.saccoProfiles.push(profile);
  }

  const assignOptional = (key) => {
    if (body[key] !== undefined) profile[key] = String(body[key]).trim();
  };
  if (body.legalName && String(body.legalName).trim()) profile.legalName = String(body.legalName).trim();
  if (body.cooperativeRegistrationNo && String(body.cooperativeRegistrationNo).trim()) {
    profile.cooperativeRegistrationNo = String(body.cooperativeRegistrationNo).trim();
  }
  assignOptional("tin");
  assignOptional("umraLicenseNo");
  assignOptional("address");
  assignOptional("email");
  assignOptional("phone");
  assignOptional("website");
  profile.updatedAt = new Date().toISOString();

  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Updated SACCO profile ${profile.legalName}`,
    resourceType: "sacco_profile",
    resourceId: profile.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, profile);
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

function listAccountingPeriods(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const periods = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.accountingPeriods
    : db.accountingPeriods.filter((period) => period.tenantId === tenantId);
  return sendData(response, periods.sort((a, b) => b.period.localeCompare(a.period)));
}

async function updateAccountingPeriodStatus(request, response, auth, periodId, correlationId) {
  const period = db.accountingPeriods.find((item) => item.id === periodId);
  if (!period) return sendError(response, 404, "ACCOUNTING_PERIOD_NOT_FOUND", "Accounting period not found.", correlationId);
  if (!assertTenantAccess(auth, period.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedAccountingPeriodStatuses.has(status)) {
    return sendError(response, 400, "INVALID_ACCOUNTING_PERIOD_STATUS", "Accounting period can only be open or closed.", correlationId);
  }

  period.status = status;
  period.closedByUserId = status === "closed" ? auth.user.id : null;
  period.closedAt = status === "closed" ? new Date().toISOString() : null;
  period.updatedAt = new Date().toISOString();
  createAuditEvent({
    tenantId: period.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `${status === "closed" ? "Closed" : "Reopened"} accounting period ${period.period}`,
    resourceType: "accounting_period",
    resourceId: period.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, period);
}

function assertAccountingPeriodOpen(tenantId, postingDate, response, correlationId) {
  const periodKey = String(postingDate || new Date().toISOString()).slice(0, 7);
  const period = db.accountingPeriods.find((item) => item.tenantId === tenantId && item.period === periodKey);
  if (period?.status === "closed") {
    sendError(response, 409, "ACCOUNTING_PERIOD_CLOSED", `Accounting period ${period.period} is closed.`, correlationId);
    return false;
  }
  return true;
}

function listChartOfAccounts(response) {
  return sendData(response, db.chartOfAccounts);
}

function listJournalEntries(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const entries = buildJournalEntries()
    .filter((entry) => (isPlatform(auth) && !url.searchParams.get("tenantId")) || entry.tenantId === tenantId)
    .sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
  return sendData(response, entries);
}

function listStatementLines(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const lines = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.statementLines
    : db.statementLines.filter((line) => line.tenantId === tenantId);
  return sendData(response, lines);
}

async function createStatementLine(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const channel = String(body.channel || "");
  const amount = Number(body.amount);
  const externalReference = String(body.externalReference || "").trim();
  const statementDate = String(body.statementDate || new Date().toISOString().slice(0, 10));
  if (!allowedStatementChannels.has(channel)) return sendError(response, 400, "INVALID_STATEMENT_CHANNEL", "Unsupported statement channel.", correlationId);
  if (!Number.isFinite(amount) || amount === 0) return sendError(response, 400, "INVALID_STATEMENT_AMOUNT", "Statement amount cannot be zero.", correlationId);
  if (!externalReference) return sendError(response, 400, "INVALID_STATEMENT_REFERENCE", "Statement reference is required.", correlationId);
  if (db.statementLines.some((line) => line.tenantId === tenantId && line.externalReference === externalReference)) {
    return sendError(response, 409, "STATEMENT_LINE_EXISTS", "A statement line with that reference already exists for this tenant.", correlationId);
  }
  if (!assertAccountingPeriodOpen(tenantId, statementDate, response, correlationId)) return;

  const now = new Date().toISOString();
  const line = {
    id: newId("statement"),
    tenantId,
    accountCode: accountForChannel(channel),
    channel,
    amount,
    externalReference,
    description: String(body.description || ""),
    statementDate,
    importedByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.statementLines.push(line);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Imported statement line ${line.externalReference}`,
    resourceType: "statement_line",
    resourceId: line.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, line, 201);
}

function getReconciliation(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const tenantIds = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.tenants.filter((tenant) => tenant.id !== "tenant_platform").map((tenant) => tenant.id)
    : [tenantId];
  return sendData(response, reconciliationForTenantIds(tenantIds));
}

function reconciliationForTenantIds(tenantIds) {
  const entries = buildJournalEntries().filter((entry) => tenantIds.includes(entry.tenantId));
  const statementLines = db.statementLines.filter((line) => tenantIds.includes(line.tenantId));
  const ledgerLines = cashLedgerLines(entries);
  const matches = [];
  const matchedStatementIds = new Set();
  const matchedLedgerIds = new Set();

  for (const statementLine of statementLines) {
    const ledgerLine = ledgerLines.find((line) => {
      return !matchedLedgerIds.has(line.id)
        && line.tenantId === statementLine.tenantId
        && line.accountCode === statementLine.accountCode
        && line.reference === statementLine.externalReference
        && line.amount === statementLine.amount;
    });
    if (!ledgerLine) continue;
    matchedStatementIds.add(statementLine.id);
    matchedLedgerIds.add(ledgerLine.id);
    matches.push({ statementLine, ledgerLine });
  }

  const unmatchedStatementLines = statementLines.filter((line) => !matchedStatementIds.has(line.id));
  const unmatchedLedgerLines = ledgerLines.filter((line) => !matchedLedgerIds.has(line.id));
  return {
    summary: {
      statementLines: statementLines.length,
      ledgerLines: ledgerLines.length,
      matched: matches.length,
      unmatchedStatementLines: unmatchedStatementLines.length,
      unmatchedLedgerLines: unmatchedLedgerLines.length,
      matchedAmount: matches.reduce((sum, item) => sum + Math.abs(item.statementLine.amount), 0),
      unmatchedStatementAmount: unmatchedStatementLines.reduce((sum, item) => sum + Math.abs(item.amount), 0),
      unmatchedLedgerAmount: unmatchedLedgerLines.reduce((sum, item) => sum + Math.abs(item.amount), 0)
    },
    matches,
    unmatchedStatementLines,
    unmatchedLedgerLines
  };
}

function getRegulatoryReport(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const tenantIds = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.tenants.filter((tenant) => tenant.id !== "tenant_platform").map((tenant) => tenant.id)
    : [tenantId];
  const reports = tenantIds.map((id) => buildTenantRegulatoryReport(id));
  const consolidated = consolidateRegulatoryReports(reports);
  return sendData(response, {
    generatedAt: new Date().toISOString(),
    period: url.searchParams.get("period") || new Date().toISOString().slice(0, 7),
    reports,
    consolidated,
    csv: regulatoryReportCsv(reports)
  });
}

function listMobileMoneyCallbacks(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const callbacks = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.mobileMoneyCallbacks
    : db.mobileMoneyCallbacks.filter((callback) => callback.tenantId === tenantId);
  return sendData(response, callbacks.sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))));
}

function listNotificationDeliveries(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const deliveries = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.notificationDeliveries
    : db.notificationDeliveries.filter((delivery) => delivery.tenantId === tenantId);
  return sendData(response, deliveries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
}

async function receiveMobileMoneyCallback(request, response, correlationId) {
  const body = await readJson(request);
  const tenantId = String(body.tenantId || "").trim();
  const externalReference = String(body.externalReference || body.transactionId || "").trim();
  const amount = Number(body.amount);
  const purpose = String(body.purpose || "savings_deposit");
  const receivedAt = String(body.receivedAt || new Date().toISOString());

  if (!tenantId || !db.tenants.some((tenant) => tenant.id === tenantId)) {
    return sendError(response, 400, "INVALID_TENANT", "A valid tenantId is required.", correlationId);
  }
  if (!externalReference) return sendError(response, 400, "INVALID_CALLBACK_REFERENCE", "A mobile-money reference is required.", correlationId);
  if (!Number.isFinite(amount) || amount <= 0) return sendError(response, 400, "INVALID_CALLBACK_AMOUNT", "Callback amount must be greater than zero.", correlationId);
  if (!allowedMobileMoneyPurposes.has(purpose)) return sendError(response, 400, "INVALID_CALLBACK_PURPOSE", "Unsupported mobile-money purpose.", correlationId);

  const existing = db.mobileMoneyCallbacks.find((callback) => callback.tenantId === tenantId && callback.externalReference === externalReference);
  if (existing) return sendData(response, { callback: existing, result: callbackResult(existing), idempotent: true });

  const member = findCallbackMember(tenantId, body);
  if (!member) return sendError(response, 400, "INVALID_MEMBER", "Callback member was not found for this tenant.", correlationId);
  if (!assertAccountingPeriodOpen(tenantId, receivedAt, response, correlationId)) return;

  const callback = {
    id: newId("mm_callback"),
    tenantId,
    memberId: member.id,
    purpose,
    amount,
    externalReference,
    provider: String(body.provider || "demo_mobile_money"),
    providerPayload: body,
    status: "posted",
    receivedAt,
    createdAt: new Date().toISOString(),
    resourceType: null,
    resourceId: null
  };

  if (purpose === "loan_repayment") {
    const loan = body.loanId
      ? db.loans.find((item) => item.id === String(body.loanId) && item.tenantId === tenantId && item.memberId === member.id)
      : db.loans.find((item) => item.tenantId === tenantId && item.memberId === member.id && item.status === "active");
    if (!loan) return sendError(response, 400, "INVALID_LOAN", "No active loan was found for this repayment callback.", correlationId);
    if (loan.status !== "active") return sendError(response, 409, "LOAN_NOT_ACTIVE", "Only active loans can receive mobile-money repayments.", correlationId);
    if (amount > loan.balance) return sendError(response, 409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment cannot exceed the outstanding loan balance.", correlationId);

    const repayment = postLoanRepayment({ loan, amount, channel: "mobile_money", externalReference, receivedAt, recordedByUserId: null });
    callback.resourceType = "loan_repayment";
    callback.resourceId = repayment.id;
    var notification = createMemberNotification({
      tenantId,
      memberId: member.id,
      eventType: "loan_repayment_received",
      resourceType: "loan_repayment",
      resourceId: repayment.id,
      body: `Mobile money loan repayment ${externalReference} for UGX ${amount} was posted.`
    });
  } else {
    const transaction = postMemberCollection({ tenantId, member, purpose, amount, externalReference, receivedAt });
    callback.resourceType = "financial_transaction";
    callback.resourceId = transaction.id;
    var notification = createMemberNotification({
      tenantId,
      memberId: member.id,
      eventType: "payment_received",
      resourceType: "financial_transaction",
      resourceId: transaction.id,
      body: `Mobile money ${purpose.replace(/_/g, " ")} ${externalReference} for UGX ${amount} was posted.`
    });
  }

  db.mobileMoneyCallbacks.push(callback);
  db.statementLines.push({
    id: newId("statement"),
    tenantId,
    accountCode: "1020",
    channel: "mobile_money",
    amount,
    externalReference,
    description: `Mobile money callback for ${purpose.replace(/_/g, " ")}`,
    statementDate: receivedAt.slice(0, 10),
    importedByUserId: null,
    createdAt: callback.createdAt,
    updatedAt: callback.createdAt
  });
  createAuditEvent({
    tenantId,
    actorUserId: null,
    actorName: callback.provider,
    action: `Processed mobile-money callback ${externalReference}`,
    resourceType: callback.resourceType,
    resourceId: callback.resourceId,
    ipAddress: requestIp(request)
  });
  return sendData(response, { callback, result: callbackResult(callback), notification, deliveries: notification?.deliveries || [], idempotent: false }, 201);
}

function findCallbackMember(tenantId, body) {
  const memberId = body.memberId ? String(body.memberId) : "";
  const membershipNo = body.membershipNo ? String(body.membershipNo).toLowerCase().trim() : "";
  const phone = body.phone ? String(body.phone).toLowerCase().trim() : "";
  return db.members.find((member) => {
    if (member.tenantId !== tenantId) return false;
    if (memberId && member.id === memberId) return true;
    if (membershipNo && member.membershipNo.toLowerCase() === membershipNo) return true;
    if (phone && member.phone.toLowerCase() === phone) return true;
    return false;
  });
}

function postMemberCollection({ tenantId, member, purpose, amount, externalReference, receivedAt }) {
  const transaction = {
    id: newId("txn"),
    tenantId,
    branchId: member.branchId,
    memberId: member.id,
    type: purpose,
    channel: "mobile_money",
    amount,
    status: "posted",
    reference: externalReference,
    narration: "Mobile-money callback collection",
    makerUserId: null,
    checkerUserId: null,
    postedAt: receivedAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.financialTransactions.push(transaction);
  return transaction;
}

function postLoanRepayment({ loan, amount, channel, externalReference, receivedAt, recordedByUserId }) {
  const now = new Date().toISOString();
  const repayment = {
    id: newId("loan_repayment"),
    tenantId: loan.tenantId,
    loanId: loan.id,
    memberId: loan.memberId,
    amount,
    channel,
    externalReference,
    receivedAt,
    recordedByUserId,
    createdAt: now,
    updatedAt: now
  };
  db.loanRepayments.push(repayment);
  loan.balance = Math.max(0, loan.balance - amount);
  loan.status = loan.balance === 0 ? "closed" : loan.status;
  loan.stage = loan.balance === 0 ? "Closed" : "Disbursed";
  loan.updatedAt = now;
  return repayment;
}

function createMemberNotification({ tenantId, memberId, eventType, resourceType, resourceId, body }) {
  const template = db.notificationTemplates.find((item) => item.eventType === eventType && item.status === "active");
  const member = db.members.find((item) => item.id === memberId);
  const notification = {
    id: newId("notification"),
    tenantId,
    memberId,
    channel: template?.channel || "in_app",
    eventType,
    title: template?.title || "Notification",
    body: body || template?.body || "",
    status: "unread",
    resourceType,
    resourceId,
    createdAt: new Date().toISOString(),
    readAt: null
  };
  db.notifications.unshift(notification);
  notification.deliveries = createNotificationDeliveries(notification, member);
  return notification;
}

function createNotificationDeliveries(notification, member) {
  const recipients = [
    member?.phone ? { channel: "sms", provider: "demo_sms", recipient: member.phone } : null,
    member?.email ? { channel: "email", provider: "demo_email", recipient: member.email } : null
  ].filter(Boolean);
  const deliveries = recipients.map((recipient) => ({
    id: newId("delivery"),
    tenantId: notification.tenantId,
    notificationId: notification.id,
    memberId: notification.memberId,
    channel: recipient.channel,
    provider: recipient.provider,
    recipient: recipient.recipient,
    status: "sent",
    message: notification.body,
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }));
  db.notificationDeliveries.unshift(...deliveries);
  return deliveries;
}

function callbackResult(callback) {
  return {
    resourceType: callback.resourceType,
    resourceId: callback.resourceId,
    status: callback.status
  };
}

function listSuppliers(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const suppliers = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.suppliers
    : db.suppliers.filter((supplier) => supplier.tenantId === tenantId);
  return sendData(response, suppliers);
}

async function createSupplier(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const name = String(body.name || "").trim();
  if (!name) return sendError(response, 400, "VALIDATION_ERROR", "Supplier name is required.", correlationId);
  if (db.suppliers.some((supplier) => supplier.tenantId === tenantId && supplier.name.toLowerCase() === name.toLowerCase())) {
    return sendError(response, 409, "SUPPLIER_EXISTS", "A supplier with that name already exists.", correlationId);
  }

  const now = new Date().toISOString();
  const supplier = {
    id: newId("supplier"),
    tenantId,
    name,
    phone: String(body.phone || ""),
    email: String(body.email || ""),
    taxId: String(body.taxId || ""),
    status: "active",
    createdByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.suppliers.push(supplier);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created supplier ${supplier.name}`,
    resourceType: "supplier",
    resourceId: supplier.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, supplier, 201);
}

function listExpenses(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const expenses = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.expenses
    : db.expenses.filter((expense) => expense.tenantId === tenantId);
  return sendData(response, expenses.map(publicExpense));
}

async function createExpense(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const amount = Number(body.amount);
  const accountCode = String(body.accountCode || "5000");
  const channel = String(body.channel || "bank");
  const reference = String(body.reference || "").trim();
  const expenseDate = String(body.expenseDate || new Date().toISOString().slice(0, 10));
  const supplierId = body.supplierId ? String(body.supplierId) : null;
  if (!Number.isFinite(amount) || amount <= 0) return sendError(response, 400, "INVALID_EXPENSE_AMOUNT", "Expense amount must be greater than zero.", correlationId);
  if (!allowedExpenseAccountCodes.has(accountCode)) return sendError(response, 400, "INVALID_EXPENSE_ACCOUNT", "Unsupported expense account.", correlationId);
  if (!allowedExpenseChannels.has(channel)) return sendError(response, 400, "INVALID_EXPENSE_CHANNEL", "Unsupported expense channel.", correlationId);
  if (!reference) return sendError(response, 400, "INVALID_EXPENSE_REFERENCE", "Expense reference is required.", correlationId);
  if (db.expenses.some((expense) => expense.tenantId === tenantId && expense.reference === reference)) {
    return sendError(response, 409, "EXPENSE_EXISTS", "An expense with that reference already exists.", correlationId);
  }
  if (supplierId && !db.suppliers.some((supplier) => supplier.id === supplierId && supplier.tenantId === tenantId)) {
    return sendError(response, 400, "INVALID_SUPPLIER", "Supplier does not exist for this tenant.", correlationId);
  }
  if (!assertAccountingPeriodOpen(tenantId, expenseDate, response, correlationId)) return;

  const now = new Date().toISOString();
  const expense = {
    id: newId("expense"),
    tenantId,
    supplierId,
    accountCode,
    amount,
    channel,
    reference,
    description: String(body.description || ""),
    expenseDate,
    status: "posted",
    recordedByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.expenses.push(expense);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Recorded expense ${expense.reference}`,
    resourceType: "expense",
    resourceId: expense.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicExpense(expense), 201);
}

function publicExpense(expense) {
  return {
    ...expense,
    supplier: expense.supplierId ? db.suppliers.find((supplier) => supplier.id === expense.supplierId) || null : null,
    accountName: db.chartOfAccounts.find((account) => account.code === expense.accountCode)?.name || expense.accountCode
  };
}

function listAssets(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const assets = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.assets
    : db.assets.filter((asset) => asset.tenantId === tenantId);
  return sendData(response, assets.map(publicAsset));
}

async function createAsset(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const name = String(body.name || "").trim();
  const category = String(body.category || "equipment");
  const cost = Number(body.cost);
  const salvageValue = Number(body.salvageValue || 0);
  const usefulLifeMonths = Number(body.usefulLifeMonths || 36);
  const purchaseDate = String(body.purchaseDate || new Date().toISOString().slice(0, 10));
  const depreciationStartDate = String(body.depreciationStartDate || purchaseDate);
  const channel = String(body.channel || "bank");
  const reference = String(body.reference || "").trim();
  if (!name) return sendError(response, 400, "VALIDATION_ERROR", "Asset name is required.", correlationId);
  if (!allowedAssetCategories.has(category)) return sendError(response, 400, "INVALID_ASSET_CATEGORY", "Unsupported asset category.", correlationId);
  if (!Number.isFinite(cost) || cost <= 0) return sendError(response, 400, "INVALID_ASSET_COST", "Asset cost must be greater than zero.", correlationId);
  if (!Number.isFinite(salvageValue) || salvageValue < 0 || salvageValue >= cost) return sendError(response, 400, "INVALID_SALVAGE_VALUE", "Salvage value must be less than asset cost.", correlationId);
  if (!Number.isFinite(usefulLifeMonths) || usefulLifeMonths <= 0) return sendError(response, 400, "INVALID_USEFUL_LIFE", "Useful life must be greater than zero months.", correlationId);
  if (!allowedAssetChannels.has(channel)) return sendError(response, 400, "INVALID_ASSET_CHANNEL", "Unsupported asset payment channel.", correlationId);
  if (!reference) return sendError(response, 400, "INVALID_ASSET_REFERENCE", "Asset reference is required.", correlationId);
  if (db.assets.some((asset) => asset.tenantId === tenantId && asset.reference === reference)) {
    return sendError(response, 409, "ASSET_EXISTS", "An asset with that reference already exists.", correlationId);
  }
  if (!assertAccountingPeriodOpen(tenantId, purchaseDate, response, correlationId)) return;

  const now = new Date().toISOString();
  const asset = {
    id: newId("asset"),
    tenantId,
    name,
    category,
    assetAccountCode: "1300",
    cost,
    salvageValue,
    usefulLifeMonths,
    purchaseDate,
    depreciationStartDate,
    channel,
    reference,
    location: String(body.location || ""),
    custodianUserId: String(body.custodianUserId || auth.user.id),
    status: "active",
    recordedByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.assets.push(asset);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Registered asset ${asset.reference}`,
    resourceType: "asset",
    resourceId: asset.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicAsset(asset), 201);
}

function publicAsset(asset) {
  const accumulatedDepreciation = assetDepreciation(asset);
  return {
    ...asset,
    accountName: db.chartOfAccounts.find((account) => account.code === asset.assetAccountCode)?.name || asset.assetAccountCode,
    monthlyDepreciation: monthlyDepreciation(asset),
    accumulatedDepreciation,
    netBookValue: Math.max(asset.salvageValue || 0, asset.cost - accumulatedDepreciation)
  };
}

function monthlyDepreciation(asset) {
  return Math.round((asset.cost - (asset.salvageValue || 0)) / asset.usefulLifeMonths);
}

function assetDepreciation(asset, asOf = new Date()) {
  if (asset.status !== "active") return 0;
  const start = new Date(`${asset.depreciationStartDate || asset.purchaseDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || start > asOf) return 0;
  const elapsedMonths = (asOf.getUTCFullYear() - start.getUTCFullYear()) * 12 + asOf.getUTCMonth() - start.getUTCMonth() + 1;
  const depreciableMonths = Math.min(Math.max(elapsedMonths, 0), asset.usefulLifeMonths);
  const depreciableAmount = asset.cost - (asset.salvageValue || 0);
  return Math.min(depreciableAmount, Math.round(monthlyDepreciation(asset) * depreciableMonths));
}

function buildTenantRegulatoryReport(tenantId) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const members = db.members.filter((member) => member.tenantId === tenantId);
  const activeMembers = members.filter((member) => member.status === "active");
  const balances = members.reduce((totals, member) => {
    const memberBalance = memberBalances(member.id);
    totals.savings += memberBalance.savings;
    totals.shares += memberBalance.shares;
    totals.welfare += memberBalance.welfare;
    return totals;
  }, { savings: 0, shares: 0, welfare: 0 });
  const tenantLoans = db.loans.filter((loan) => loan.tenantId === tenantId);
  const activeLoans = tenantLoans.filter((loan) => loan.status === "active");
  const loanPortfolio = activeLoans.reduce((sum, loan) => sum + loan.balance, 0);
  const loansAtRisk = activeLoans.filter((loan) => loan.dsr >= 40).reduce((sum, loan) => sum + loan.balance, 0);
  const parPercent = loanPortfolio ? Math.round((loansAtRisk / loanPortfolio) * 100) : 0;
  const entries = buildJournalEntries().filter((entry) => entry.tenantId === tenantId);
  const expenses = db.expenses.filter((expense) => expense.tenantId === tenantId && expense.status === "posted");
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const assets = db.assets.filter((asset) => asset.tenantId === tenantId && asset.status === "active");
  const assetCost = assets.reduce((sum, asset) => sum + asset.cost, 0);
  const assetNetBookValue = assets.reduce((sum, asset) => sum + publicAsset(asset).netBookValue, 0);
  const reconciliationData = reconciliationForTenantIds([tenantId]);
  const openComplaints = db.complaints.filter((complaint) => complaint.tenantId === tenantId && !["resolved", "closed"].includes(complaint.status)).length;
  const openResolutions = db.governanceResolutions.filter((resolution) => resolution.tenantId === tenantId && resolution.status !== "closed").length;

  return {
    tenantId,
    tenantName: tenant?.name || tenantId,
    memberCount: members.length,
    activeMembers: activeMembers.length,
    savings: balances.savings,
    shares: balances.shares,
    welfare: balances.welfare,
    loanPortfolio,
    activeLoans: activeLoans.length,
    loansAtRisk,
    parPercent,
    expenseTotal,
    assetCost,
    assetNetBookValue,
    journalEntries: entries.length,
    unbalancedJournalEntries: entries.filter((entry) => !entry.isBalanced).length,
    reconciliationExceptions: reconciliationData.summary.unmatchedStatementLines + reconciliationData.summary.unmatchedLedgerLines,
    openComplaints,
    openResolutions,
    complianceStatus: entries.every((entry) => entry.isBalanced) && reconciliationData.summary.unmatchedStatementLines === 0 ? "review" : "action_required"
  };
}

function consolidateRegulatoryReports(reports) {
  return reports.reduce((totals, report) => {
    totals.memberCount += report.memberCount;
    totals.activeMembers += report.activeMembers;
    totals.savings += report.savings;
    totals.shares += report.shares;
    totals.welfare += report.welfare;
    totals.loanPortfolio += report.loanPortfolio;
    totals.activeLoans += report.activeLoans;
    totals.loansAtRisk += report.loansAtRisk;
    totals.expenseTotal += report.expenseTotal;
    totals.assetCost += report.assetCost;
    totals.assetNetBookValue += report.assetNetBookValue;
    totals.journalEntries += report.journalEntries;
    totals.unbalancedJournalEntries += report.unbalancedJournalEntries;
    totals.reconciliationExceptions += report.reconciliationExceptions;
    totals.openComplaints += report.openComplaints;
    totals.openResolutions += report.openResolutions;
    totals.parPercent = totals.loanPortfolio ? Math.round((totals.loansAtRisk / totals.loanPortfolio) * 100) : 0;
    totals.complianceStatus = totals.unbalancedJournalEntries === 0 && totals.reconciliationExceptions === 0 ? "clear" : "review";
    return totals;
  }, {
    memberCount: 0,
    activeMembers: 0,
    savings: 0,
    shares: 0,
    welfare: 0,
    loanPortfolio: 0,
    activeLoans: 0,
    loansAtRisk: 0,
    expenseTotal: 0,
    assetCost: 0,
    assetNetBookValue: 0,
    parPercent: 0,
    journalEntries: 0,
    unbalancedJournalEntries: 0,
    reconciliationExceptions: 0,
    openComplaints: 0,
    openResolutions: 0,
    complianceStatus: "clear"
  });
}

function regulatoryReportCsv(reports) {
  const headers = [
    "tenant",
    "members",
    "active_members",
    "savings",
    "shares",
    "welfare",
    "loan_portfolio",
    "active_loans",
    "expenses",
    "fixed_assets",
    "net_assets",
    "par_percent",
    "reconciliation_exceptions",
    "open_complaints",
    "open_resolutions",
    "compliance_status"
  ];
  const rows = reports.map((report) => [
    report.tenantName,
    report.memberCount,
    report.activeMembers,
    report.savings,
    report.shares,
    report.welfare,
    report.loanPortfolio,
    report.activeLoans,
    report.expenseTotal,
    report.assetCost,
    report.assetNetBookValue,
    report.parPercent,
    report.reconciliationExceptions,
    report.openComplaints,
    report.openResolutions,
    report.complianceStatus
  ]);
  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function listGovernanceMeetings(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const meetings = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.governanceMeetings
    : db.governanceMeetings.filter((meeting) => meeting.tenantId === tenantId);
  return sendData(response, meetings.map(publicGovernanceMeeting));
}

async function createGovernanceMeeting(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const title = String(body.title || "").trim();
  const meetingType = String(body.meetingType || "management");
  if (!title) return sendError(response, 400, "VALIDATION_ERROR", "Meeting title is required.", correlationId);
  if (!allowedMeetingTypes.has(meetingType)) return sendError(response, 400, "INVALID_MEETING_TYPE", "Unsupported meeting type.", correlationId);

  const now = new Date().toISOString();
  const meeting = {
    id: newId("meeting"),
    tenantId,
    title,
    meetingType,
    scheduledAt: String(body.scheduledAt || now),
    chairUserId: String(body.chairUserId || auth.user.id),
    status: allowedGovernanceStatuses.has(String(body.status || "scheduled")) ? String(body.status || "scheduled") : "scheduled",
    minutes: String(body.minutes || ""),
    createdByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.governanceMeetings.push(meeting);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created governance meeting ${meeting.title}`,
    resourceType: "governance_meeting",
    resourceId: meeting.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicGovernanceMeeting(meeting), 201);
}

async function createGovernanceResolution(request, response, auth, meetingId, correlationId) {
  const meeting = db.governanceMeetings.find((item) => item.id === meetingId);
  if (!meeting) return sendError(response, 404, "MEETING_NOT_FOUND", "Governance meeting not found.", correlationId);
  if (!assertTenantAccess(auth, meeting.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const title = String(body.title || "").trim();
  if (!title) return sendError(response, 400, "VALIDATION_ERROR", "Resolution title is required.", correlationId);
  const status = String(body.status || "open");
  if (!allowedResolutionStatuses.has(status)) return sendError(response, 400, "INVALID_RESOLUTION_STATUS", "Unsupported resolution status.", correlationId);

  const now = new Date().toISOString();
  const resolution = {
    id: newId("resolution"),
    tenantId: meeting.tenantId,
    meetingId: meeting.id,
    title,
    decision: String(body.decision || ""),
    ownerUserId: String(body.ownerUserId || auth.user.id),
    dueDate: String(body.dueDate || ""),
    status,
    createdByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.governanceResolutions.push(resolution);
  meeting.updatedAt = now;
  createAuditEvent({
    tenantId: meeting.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Recorded governance resolution ${resolution.title}`,
    resourceType: "governance_resolution",
    resourceId: resolution.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, resolution, 201);
}

function publicGovernanceMeeting(meeting) {
  const resolutions = db.governanceResolutions.filter((resolution) => resolution.meetingId === meeting.id);
  return {
    ...meeting,
    resolutions,
    openResolutions: resolutions.filter((resolution) => resolution.status !== "closed").length
  };
}

function listComplaints(response, auth, url) {
  const tenantId = requestedTenant(auth, url);
  const complaints = isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.complaints
    : db.complaints.filter((complaint) => complaint.tenantId === tenantId);
  return sendData(response, complaints.map(publicComplaint));
}

async function createComplaint(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const subject = String(body.subject || "").trim();
  const category = String(body.category || "other");
  const priority = String(body.priority || "medium");
  const memberId = body.memberId ? String(body.memberId) : null;
  if (!subject) return sendError(response, 400, "VALIDATION_ERROR", "Complaint subject is required.", correlationId);
  if (!allowedComplaintCategories.has(category)) return sendError(response, 400, "INVALID_COMPLAINT_CATEGORY", "Unsupported complaint category.", correlationId);
  if (!allowedComplaintPriorities.has(priority)) return sendError(response, 400, "INVALID_COMPLAINT_PRIORITY", "Unsupported complaint priority.", correlationId);
  if (memberId && !db.members.some((member) => member.id === memberId && member.tenantId === tenantId)) {
    return sendError(response, 400, "INVALID_MEMBER", "Complaint member does not exist for this tenant.", correlationId);
  }

  const now = new Date().toISOString();
  const complaint = {
    id: newId("complaint"),
    tenantId,
    memberId,
    category,
    subject,
    description: String(body.description || ""),
    priority,
    status: "open",
    assignedUserId: String(body.assignedUserId || auth.user.id),
    resolution: "",
    createdByUserId: auth.user.id,
    resolvedByUserId: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now
  };
  db.complaints.push(complaint);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created complaint ${complaint.subject}`,
    resourceType: "complaint",
    resourceId: complaint.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicComplaint(complaint), 201);
}

async function updateComplaintStatus(request, response, auth, complaintId, correlationId) {
  const complaint = db.complaints.find((item) => item.id === complaintId);
  if (!complaint) return sendError(response, 404, "COMPLAINT_NOT_FOUND", "Complaint not found.", correlationId);
  if (!assertTenantAccess(auth, complaint.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedComplaintStatuses.has(status)) return sendError(response, 400, "INVALID_COMPLAINT_STATUS", "Unsupported complaint status.", correlationId);

  complaint.status = status;
  complaint.resolution = String(body.resolution || complaint.resolution || "");
  complaint.updatedAt = new Date().toISOString();
  if (["resolved", "closed"].includes(status)) {
    complaint.resolvedByUserId = auth.user.id;
    complaint.resolvedAt = complaint.updatedAt;
  }
  createAuditEvent({
    tenantId: complaint.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Updated complaint status to ${status}`,
    resourceType: "complaint",
    resourceId: complaint.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicComplaint(complaint));
}

function publicComplaint(complaint) {
  return {
    ...complaint,
    member: complaint.memberId ? publicMember(db.members.find((member) => member.id === complaint.memberId)) : null
  };
}

function cashLedgerLines(entries) {
  const cashAccounts = new Set(["1000", "1010", "1020", "1030"]);
  return entries.flatMap((entry) => entry.lines
    .map((line, index) => ({ entry, line, index }))
    .filter(({ line }) => cashAccounts.has(line.accountCode))
    .map(({ entry, line, index }) => ({
      id: `${entry.id}_${index}`,
      tenantId: entry.tenantId,
      journalEntryId: entry.id,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      reference: entry.reference,
      description: entry.description,
      postedAt: entry.postedAt,
      accountCode: line.accountCode,
      accountName: line.accountName,
      amount: line.debit - line.credit
    })));
}

function buildJournalEntries() {
  const entries = [];

  for (const transaction of db.financialTransactions.filter((item) => item.status === "posted")) {
    const cashAccount = accountForChannel(transaction.channel);
    const reversal = Boolean(transaction.originalTransactionId);
    if (transaction.type === "withdrawal") {
      entries.push(journalEntry({
        id: `je_${transaction.id}`,
        tenantId: transaction.tenantId,
        sourceType: reversal ? "financial_transaction_reversal" : "financial_transaction",
        sourceId: transaction.id,
        reference: transaction.reference,
        description: transaction.narration || `Posted ${transaction.type.replace(/_/g, " ")}`,
        postedAt: transaction.postedAt || transaction.updatedAt,
        lines: reversal ? [
          journalLine(cashAccount, transaction.amount, 0, transaction.memberId),
          journalLine("2000", 0, transaction.amount, transaction.memberId)
        ] : [
          journalLine("2000", transaction.amount, 0, transaction.memberId),
          journalLine(cashAccount, 0, transaction.amount, transaction.memberId)
        ]
      }));
    } else {
      entries.push(journalEntry({
        id: `je_${transaction.id}`,
        tenantId: transaction.tenantId,
        sourceType: reversal ? "financial_transaction_reversal" : "financial_transaction",
        sourceId: transaction.id,
        reference: transaction.reference,
        description: transaction.narration || `Posted ${transaction.type.replace(/_/g, " ")}`,
        postedAt: transaction.postedAt || transaction.updatedAt,
        lines: reversal ? [
          journalLine(accountForTransactionType(transaction.type), transaction.amount, 0, transaction.memberId),
          journalLine(cashAccount, 0, transaction.amount, transaction.memberId)
        ] : [
          journalLine(cashAccount, transaction.amount, 0, transaction.memberId),
          journalLine(accountForTransactionType(transaction.type), 0, transaction.amount, transaction.memberId)
        ]
      }));
    }
  }

  for (const loan of db.loans.filter((item) => item.disbursedAt)) {
    entries.push(journalEntry({
      id: `je_disbursement_${loan.id}`,
      tenantId: loan.tenantId,
      sourceType: "loan_disbursement",
      sourceId: loan.id,
      reference: loan.id,
      description: `Disbursed ${loan.product}`,
      postedAt: loan.disbursedAt,
      lines: [
        journalLine("1100", loan.amount, 0, loan.memberId),
        journalLine("1010", 0, loan.amount, loan.memberId)
      ]
    }));
  }

  for (const repayment of db.loanRepayments) {
    entries.push(journalEntry({
      id: `je_${repayment.id}`,
      tenantId: repayment.tenantId,
      sourceType: "loan_repayment",
      sourceId: repayment.id,
      reference: repayment.externalReference,
      description: "Recorded loan repayment",
      postedAt: repayment.receivedAt,
      lines: [
        journalLine(accountForChannel(repayment.channel), repayment.amount, 0, repayment.memberId),
        journalLine("1100", 0, repayment.amount, repayment.memberId)
      ]
    }));
  }

  for (const payment of db.subscriptionPayments) {
    entries.push(journalEntry({
      id: `je_${payment.id}`,
      tenantId: payment.tenantId,
      sourceType: "subscription_payment",
      sourceId: payment.id,
      reference: payment.externalReference,
      description: "Recorded platform subscription payment",
      postedAt: payment.receivedAt,
      lines: [
        journalLine("6100", payment.amount, 0, null),
        journalLine(accountForChannel(payment.channel), 0, payment.amount, null)
      ]
    }));
  }

  for (const expense of db.expenses.filter((item) => item.status === "posted")) {
    entries.push(journalEntry({
      id: `je_${expense.id}`,
      tenantId: expense.tenantId,
      sourceType: "expense",
      sourceId: expense.id,
      reference: expense.reference,
      description: expense.description || "Recorded operating expense",
      postedAt: expense.expenseDate,
      lines: [
        journalLine(expense.accountCode, expense.amount, 0, null),
        journalLine(accountForChannel(expense.channel), 0, expense.amount, null)
      ]
    }));
  }

  for (const claim of db.welfareClaims.filter((item) => item.status === "paid")) {
    entries.push(journalEntry({
      id: `je_${claim.id}`,
      tenantId: claim.tenantId,
      sourceType: "welfare_claim",
      sourceId: claim.id,
      reference: claim.reference,
      description: claim.description || "Paid welfare claim",
      postedAt: claim.paidAt,
      lines: [
        journalLine("2200", claim.amount, 0, claim.memberId),
        journalLine(accountForChannel(claim.channel), 0, claim.amount, claim.memberId)
      ]
    }));
  }

  for (const asset of db.assets.filter((item) => item.status === "active")) {
    entries.push(journalEntry({
      id: `je_acquisition_${asset.id}`,
      tenantId: asset.tenantId,
      sourceType: "asset_acquisition",
      sourceId: asset.id,
      reference: asset.reference,
      description: `Registered fixed asset ${asset.name}`,
      postedAt: asset.purchaseDate,
      lines: [
        journalLine(asset.assetAccountCode, asset.cost, 0, null),
        journalLine(accountForChannel(asset.channel), 0, asset.cost, null)
      ]
    }));

    const depreciation = assetDepreciation(asset);
    if (depreciation > 0) {
      entries.push(journalEntry({
        id: `je_depreciation_${asset.id}`,
        tenantId: asset.tenantId,
        sourceType: "asset_depreciation",
        sourceId: asset.id,
        reference: `${asset.reference}-DEP`,
        description: `Accumulated depreciation for ${asset.name}`,
        postedAt: new Date().toISOString(),
        lines: [
          journalLine("5050", depreciation, 0, null),
          journalLine("1310", 0, depreciation, null)
        ]
      }));
    }
  }

  return entries;
}

function journalEntry({ id, tenantId, sourceType, sourceId, reference, description, postedAt, lines }) {
  const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0);
  const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0);
  return {
    id,
    tenantId,
    sourceType,
    sourceId,
    reference,
    description,
    postedAt,
    debitTotal,
    creditTotal,
    isBalanced: debitTotal === creditTotal,
    lines
  };
}

function journalLine(accountCode, debit, credit, memberId) {
  const account = db.chartOfAccounts.find((item) => item.code === accountCode);
  return {
    accountCode,
    accountName: account?.name || accountCode,
    accountType: account?.type || "unknown",
    memberId,
    debit,
    credit
  };
}

function accountForChannel(channel) {
  return {
    bank: "1010",
    cash: "1000",
    mobile_money: "1020",
    payroll_deduction: "1030",
    manual: "1010"
  }[channel] || "1010";
}

function accountForTransactionType(type) {
  return {
    savings_deposit: "2000",
    share_purchase: "2100",
    welfare_contribution: "2200"
  }[type] || "2000";
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
  const receivedAt = String(body.receivedAt || new Date().toISOString());
  if (!assertAccountingPeriodOpen(subscription.tenantId, receivedAt, response, correlationId)) return;

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
    receivedAt,
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

function listMemberNextOfKin(response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  return sendData(response, db.memberNextOfKin.filter((kin) => kin.memberId === memberId).toReversed());
}

async function createMemberNextOfKin(request, response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  const body = await readJson(request);
  if (!body.fullName || !body.relationship || !body.phone) {
    return sendError(response, 400, "VALIDATION_ERROR", "Full name, relationship, and phone are required.", correlationId);
  }
  const nextOfKin = {
    id: newId("kin"),
    tenantId: member.tenantId,
    memberId,
    fullName: String(body.fullName).trim(),
    relationship: String(body.relationship).trim().toLowerCase(),
    phone: String(body.phone).trim(),
    address: String(body.address || "").trim(),
    primaryContact: Boolean(body.primaryContact),
    createdByUserId: auth.user.id,
    createdAt: new Date().toISOString()
  };
  db.memberNextOfKin.push(nextOfKin);
  createAuditEvent({
    tenantId: member.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Added next of kin for member ${member.membershipNo}`,
    resourceType: "member_next_of_kin",
    resourceId: nextOfKin.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, nextOfKin, 201);
}

function listMemberBeneficiaries(response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  return sendData(response, db.memberBeneficiaries.filter((beneficiary) => beneficiary.memberId === memberId).toReversed());
}

async function createMemberBeneficiary(request, response, auth, memberId, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;
  const body = await readJson(request);
  const allocationPercent = Number(body.allocationPercent);
  if (!body.fullName || !body.relationship) {
    return sendError(response, 400, "VALIDATION_ERROR", "Full name and relationship are required.", correlationId);
  }
  if (!Number.isFinite(allocationPercent) || allocationPercent <= 0 || allocationPercent > 100) {
    return sendError(response, 400, "INVALID_ALLOCATION", "Beneficiary allocation must be greater than 0 and not exceed 100.", correlationId);
  }
  const allocated = db.memberBeneficiaries
    .filter((beneficiary) => beneficiary.memberId === memberId)
    .reduce((sum, beneficiary) => sum + Number(beneficiary.allocationPercent || 0), 0);
  if (allocated + allocationPercent > 100) {
    return sendError(response, 400, "ALLOCATION_EXCEEDED", "Beneficiary allocations cannot exceed 100 percent.", correlationId);
  }
  const beneficiary = {
    id: newId("beneficiary"),
    tenantId: member.tenantId,
    memberId,
    fullName: String(body.fullName).trim(),
    relationship: String(body.relationship).trim().toLowerCase(),
    phone: String(body.phone || "").trim(),
    allocationPercent,
    createdByUserId: auth.user.id,
    createdAt: new Date().toISOString()
  };
  db.memberBeneficiaries.push(beneficiary);
  createAuditEvent({
    tenantId: member.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Added beneficiary for member ${member.membershipNo}`,
    resourceType: "member_beneficiary",
    resourceId: beneficiary.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, beneficiary, 201);
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
  if (status === "posted" && !assertAccountingPeriodOpen(transaction.tenantId, now, response, correlationId)) return;
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

function getFinancialTransactionReceipt(response, auth, transactionId, correlationId) {
  const transaction = db.financialTransactions.find((item) => item.id === transactionId);
  if (!transaction) return sendError(response, 404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.", correlationId);
  if (!assertTenantAccess(auth, transaction.tenantId, response, correlationId)) return;
  if (transaction.status !== "posted") {
    return sendError(response, 409, "RECEIPT_NOT_AVAILABLE", "Receipts are only available for posted transactions.", correlationId);
  }
  const tenant = db.tenants.find((item) => item.id === transaction.tenantId);
  const branch = db.branches.find((item) => item.id === transaction.branchId);
  const member = db.members.find((item) => item.id === transaction.memberId);
  if (!tenant || !branch || !member) {
    return sendError(response, 409, "RECEIPT_DATA_MISSING", "Receipt source data is incomplete.", correlationId);
  }
  const receiptNo = `RCT-${transaction.reference}`;
  return sendData(response, {
    receiptNo,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantRegistrationNo: tenant.registrationNo,
    branchId: branch.id,
    branchName: branch.name,
    memberId: member.id,
    membershipNo: member.membershipNo,
    memberName: member.fullName,
    transactionId: transaction.id,
    transactionType: transaction.type,
    channel: transaction.channel,
    amount: transaction.amount,
    reference: transaction.reference,
    narration: transaction.narration,
    postedByUserId: transaction.checkerUserId,
    postedAt: transaction.postedAt,
    issuedAt: new Date().toISOString(),
    printableText: `${tenant.name}\nReceipt: ${receiptNo}\nMember: ${member.fullName} (${member.membershipNo})\nBranch: ${branch.name}\nTransaction: ${transaction.type} via ${transaction.channel}\nAmount: UGX ${transaction.amount}\nReference: ${transaction.reference}\nPosted at: ${transaction.postedAt}`
  });
}

async function reverseFinancialTransaction(request, response, auth, transactionId, correlationId) {
  const original = db.financialTransactions.find((item) => item.id === transactionId);
  if (!original) return sendError(response, 404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.", correlationId);
  if (!assertTenantAccess(auth, original.tenantId, response, correlationId)) return;
  if (original.status !== "posted" || original.originalTransactionId) {
    return sendError(response, 409, "REVERSAL_NOT_AVAILABLE", "Only posted original financial transactions can be reversed.", correlationId);
  }
  if (db.financialTransactions.some((item) => item.originalTransactionId === original.id)) {
    return sendError(response, 409, "TRANSACTION_ALREADY_REVERSED", "This transaction already has a reversal.", correlationId);
  }
  const now = new Date().toISOString();
  if (!assertAccountingPeriodOpen(original.tenantId, now, response, correlationId)) return;
  const memberBalance = memberBalances(original.memberId);
  if (original.type === "savings_deposit" && memberBalance.savings < original.amount) {
    return sendError(response, 409, "INSUFFICIENT_BALANCE_FOR_REVERSAL", "Member savings balance is too low to reverse this transaction.", correlationId);
  }
  if (original.type === "share_purchase" && memberBalance.shares < original.amount) {
    return sendError(response, 409, "INSUFFICIENT_BALANCE_FOR_REVERSAL", "Member shares balance is too low to reverse this transaction.", correlationId);
  }
  if (original.type === "welfare_contribution" && memberBalance.welfare < original.amount) {
    return sendError(response, 409, "INSUFFICIENT_BALANCE_FOR_REVERSAL", "Member welfare balance is too low to reverse this transaction.", correlationId);
  }

  const body = await readJson(request);
  const reason = String(body.reason || "").trim();
  if (!reason) return sendError(response, 400, "REVERSAL_REASON_REQUIRED", "A reversal reason is required.", correlationId);
  const reversal = {
    ...original,
    id: newId("txn"),
    reference: `${original.reference}-REV`,
    status: "posted",
    makerUserId: auth.user.id,
    checkerUserId: auth.user.id,
    postedAt: now,
    rejectionReason: null,
    originalTransactionId: original.id,
    reversalReason: reason,
    createdAt: now,
    updatedAt: now
  };
  db.financialTransactions.push(reversal);
  createAuditEvent({
    tenantId: reversal.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Reversed financial transaction ${original.reference}`,
    resourceType: "financial_transaction",
    resourceId: reversal.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, reversal, 201);
}

function getMemberStatement(response, auth, memberId, url, correlationId) {
  const member = db.members.find((item) => item.id === memberId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (!assertTenantAccess(auth, member.tenantId, response, correlationId)) return;

  const from = url.searchParams.get("from") || null;
  const to = url.searchParams.get("to") || null;
  if (from && to && from > to) {
    return sendError(response, 400, "INVALID_STATEMENT_RANGE", "Statement start date must be before end date.", correlationId);
  }
  const movements = db.financialTransactions
    .filter((transaction) => transaction.memberId === member.id && transaction.status === "posted")
    .filter((transaction) => !from || String(transaction.postedAt || transaction.createdAt).slice(0, 10) >= from)
    .filter((transaction) => !to || String(transaction.postedAt || transaction.createdAt).slice(0, 10) <= to)
    .sort((a, b) => String(a.postedAt || a.createdAt).localeCompare(String(b.postedAt || b.createdAt)));
  const balances = { savings: 0, shares: 0, welfare: 0 };
  const lines = movements.map((transaction) => {
    const movement = transactionMovement(transaction);
    balances.savings += movement.savings;
    balances.shares += movement.shares;
    balances.welfare += movement.welfare;
    return {
      transactionId: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      channel: transaction.channel,
      amount: transaction.amount,
      savingsMovement: movement.savings,
      sharesMovement: movement.shares,
      welfareMovement: movement.welfare,
      savingsBalance: balances.savings,
      sharesBalance: balances.shares,
      welfareBalance: balances.welfare,
      narration: transaction.narration || "",
      originalTransactionId: transaction.originalTransactionId || null,
      postedAt: transaction.postedAt
    };
  });
  const csvRows = [
    "postedAt,reference,type,channel,amount,savingsMovement,sharesMovement,welfareMovement,savingsBalance,sharesBalance,welfareBalance",
    ...lines.map((line) => [line.postedAt, line.reference, line.type, line.channel, line.amount, line.savingsMovement, line.sharesMovement, line.welfareMovement, line.savingsBalance, line.sharesBalance, line.welfareBalance].join(","))
  ];
  return sendData(response, {
    tenantId: member.tenantId,
    memberId: member.id,
    membershipNo: member.membershipNo,
    memberName: member.fullName,
    from,
    to,
    openingBalances: { savings: 0, shares: 0, welfare: 0 },
    closingBalances: { ...balances },
    lines,
    csv: csvRows.join("\n")
  });
}

function transactionMovement(transaction) {
  const direction = transaction.originalTransactionId ? -1 : 1;
  return {
    savings: transaction.type === "savings_deposit" ? transaction.amount * direction : transaction.type === "withdrawal" ? -transaction.amount * direction : 0,
    shares: transaction.type === "share_purchase" ? transaction.amount * direction : 0,
    welfare: transaction.type === "welfare_contribution" ? transaction.amount * direction : 0
  };
}

function listFinancialProducts(response, auth, url, correlationId) {
  const tenantId = requestedTenant(auth, url);
  const type = url.searchParams.get("type");
  if (type && !allowedFinancialProductTypes.has(type)) {
    return sendError(response, 400, "INVALID_PRODUCT_TYPE", "Product type must be savings, shares, or welfare.", correlationId);
  }
  const products = (isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.financialProducts
    : db.financialProducts.filter((product) => product.tenantId === tenantId))
    .filter((product) => !type || product.productType === type)
    .sort((a, b) => `${a.tenantId}:${a.productType}:${a.code}`.localeCompare(`${b.tenantId}:${b.productType}:${b.code}`));
  return sendData(response, products);
}

async function createFinancialProduct(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const productType = String(body.productType || "").toLowerCase();
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const contributionAmount = Number(body.contributionAmount || 0);
  const minimumBalance = Number(body.minimumBalance || 0);
  const interestRate = Number(body.interestRate || 0);
  if (!allowedFinancialProductTypes.has(productType)) return sendError(response, 400, "INVALID_PRODUCT_TYPE", "Product type must be savings, shares, or welfare.", correlationId);
  if (!code || !name) return sendError(response, 400, "VALIDATION_ERROR", "Product code and name are required.", correlationId);
  if ([contributionAmount, minimumBalance, interestRate].some((amount) => !Number.isFinite(amount) || amount < 0)) {
    return sendError(response, 400, "INVALID_PRODUCT_AMOUNT", "Product amounts and rates cannot be negative.", correlationId);
  }
  if (db.financialProducts.some((product) => product.tenantId === tenantId && product.code.toLowerCase() === code.toLowerCase())) {
    return sendError(response, 409, "FINANCIAL_PRODUCT_EXISTS", "A product with that code already exists for this tenant.", correlationId);
  }
  const now = new Date().toISOString();
  const product = {
    id: newId("product"),
    tenantId,
    productType,
    code,
    name,
    contributionAmount,
    minimumBalance,
    interestRate,
    status: "active",
    createdByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.financialProducts.push(product);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Created ${productType} product ${code}`,
    resourceType: "financial_product",
    resourceId: product.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, product, 201);
}

function listFinancialAccounts(response, auth, url, correlationId) {
  const tenantId = requestedTenant(auth, url);
  const memberId = url.searchParams.get("memberId");
  const type = url.searchParams.get("type");
  if (type && !allowedFinancialProductTypes.has(type)) {
    return sendError(response, 400, "INVALID_ACCOUNT_TYPE", "Account type must be savings, shares, or welfare.", correlationId);
  }
  if (memberId && !db.members.some((member) => member.id === memberId && member.tenantId === tenantId)) {
    return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found for this tenant.", correlationId);
  }
  const accounts = (isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.financialAccounts
    : db.financialAccounts.filter((account) => account.tenantId === tenantId))
    .filter((account) => !memberId || account.memberId === memberId)
    .filter((account) => !type || account.accountType === type)
    .sort((a, b) => `${a.tenantId}:${a.memberId}:${a.accountType}`.localeCompare(`${b.tenantId}:${b.memberId}:${b.accountType}`));
  return sendData(response, accounts.map(publicFinancialAccount));
}

async function openFinancialAccount(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const member = db.members.find((item) => item.id === String(body.memberId || "") && item.tenantId === tenantId);
  if (!member) return sendError(response, 400, "INVALID_MEMBER", "Member does not exist for this tenant.", correlationId);
  if (member.status !== "active") return sendError(response, 409, "MEMBER_NOT_ACTIVE", "Only active members can open financial accounts.", correlationId);

  const product = db.financialProducts.find((item) => item.id === String(body.productId || "") && item.tenantId === tenantId);
  if (!product) return sendError(response, 400, "INVALID_FINANCIAL_PRODUCT", "Product does not exist for this tenant.", correlationId);
  const accountType = String(body.accountType || "").toLowerCase();
  if (!allowedFinancialProductTypes.has(accountType) || accountType !== product.productType) {
    return sendError(response, 400, "ACCOUNT_PRODUCT_MISMATCH", "Account type must match the financial product type.", correlationId);
  }
  if (db.financialAccounts.some((account) => account.memberId === member.id && account.productId === product.id)) {
    return sendError(response, 409, "FINANCIAL_ACCOUNT_EXISTS", "Member already has an account for this product.", correlationId);
  }
  const accountNo = String(body.accountNo || nextFinancialAccountNo(tenantId, accountType)).trim().toUpperCase();
  if (db.financialAccounts.some((account) => account.tenantId === tenantId && account.accountNo.toLowerCase() === accountNo.toLowerCase())) {
    return sendError(response, 409, "FINANCIAL_ACCOUNT_NO_EXISTS", "Account number already exists for this tenant.", correlationId);
  }
  const now = new Date().toISOString();
  const account = {
    id: newId("account"),
    tenantId,
    memberId: member.id,
    productId: product.id,
    accountType,
    accountNo,
    status: "active",
    openedByUserId: auth.user.id,
    openedAt: now,
    updatedAt: now
  };
  db.financialAccounts.push(account);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Opened ${accountType} account ${accountNo} for ${member.membershipNo}`,
    resourceType: "financial_account",
    resourceId: account.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicFinancialAccount(account), 201);
}

function publicFinancialAccount(account) {
  const member = db.members.find((item) => item.id === account.memberId);
  const product = db.financialProducts.find((item) => item.id === account.productId);
  return {
    ...account,
    membershipNo: member?.membershipNo || null,
    memberName: member?.fullName || null,
    productCode: product?.code || null,
    productName: product?.name || null
  };
}

function nextFinancialAccountNo(tenantId, accountType) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const typePrefix = { savings: "SAV", shares: "SHR", welfare: "WEL" }[accountType] || "ACC";
  const next = db.financialAccounts.filter((account) => account.tenantId === tenantId && account.accountType === accountType).length + 1;
  return `${tenant?.abbreviation || "SACCO"}-${typePrefix}-${String(next).padStart(4, "0")}`;
}

function listWelfareClaims(response, auth, url, correlationId) {
  const tenantId = requestedTenant(auth, url);
  const memberId = url.searchParams.get("memberId");
  if (memberId) {
    const member = db.members.find((item) => item.id === memberId && item.tenantId === tenantId);
    if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  }
  const claims = (isPlatform(auth) && !url.searchParams.get("tenantId")
    ? db.welfareClaims
    : db.welfareClaims.filter((claim) => claim.tenantId === tenantId))
    .filter((claim) => !memberId || claim.memberId === memberId)
    .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  return sendData(response, claims.map(publicWelfareClaim));
}

async function createWelfareClaim(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const memberId = String(body.memberId || "");
  const member = db.members.find((item) => item.id === memberId && item.tenantId === tenantId);
  if (!member) return sendError(response, 404, "MEMBER_NOT_FOUND", "Member not found.", correlationId);
  if (member.status !== "active") return sendError(response, 409, "MEMBER_NOT_ACTIVE", "Only active members can receive welfare claims.", correlationId);

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return sendError(response, 400, "INVALID_WELFARE_CLAIM_AMOUNT", "Claim amount must be greater than zero.", correlationId);

  const count = db.welfareClaims.filter((claim) => claim.tenantId === tenantId).length + 1;
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const reference = String(body.reference || `${tenant?.abbreviation || "SACCO"}-WCL-${String(count).padStart(4, "0")}`).trim();
  if (db.welfareClaims.some((claim) => claim.tenantId === tenantId && claim.reference.toLowerCase() === reference.toLowerCase())) {
    return sendError(response, 409, "WELFARE_CLAIM_REFERENCE_EXISTS", "A welfare claim with that reference already exists.", correlationId);
  }

  const now = new Date().toISOString();
  const claim = {
    id: newId("welfare_claim"),
    tenantId,
    memberId,
    claimType: String(body.claimType || "other"),
    amount,
    channel: null,
    reference,
    description: String(body.description || ""),
    status: "submitted",
    submittedByUserId: auth.user.id,
    decidedByUserId: null,
    paidByUserId: null,
    rejectionReason: null,
    submittedAt: now,
    decidedAt: null,
    paidAt: null,
    updatedAt: now
  };
  db.welfareClaims.push(claim);
  createAuditEvent({
    tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Submitted welfare claim ${claim.reference}`,
    resourceType: "welfare_claim",
    resourceId: claim.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicWelfareClaim(claim), 201);
}

async function updateWelfareClaimStatus(request, response, auth, claimId, correlationId) {
  const claim = db.welfareClaims.find((item) => item.id === claimId);
  if (!claim) return sendError(response, 404, "WELFARE_CLAIM_NOT_FOUND", "Welfare claim not found.", correlationId);
  if (!assertTenantAccess(auth, claim.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const status = String(body.status || "");
  if (!allowedWelfareClaimDecisionStatuses.has(status)) {
    return sendError(response, 400, "INVALID_WELFARE_CLAIM_STATUS", "Unsupported welfare claim status.", correlationId);
  }
  if (claim.status !== "submitted") {
    return sendError(response, 409, "WELFARE_CLAIM_ALREADY_DECIDED", "Only submitted welfare claims can be decided.", correlationId);
  }
  const reason = String(body.reason || "").trim();
  if (status === "rejected" && !reason) {
    return sendError(response, 400, "WELFARE_REJECTION_REASON_REQUIRED", "A rejection reason is required.", correlationId);
  }

  const now = new Date().toISOString();
  claim.status = status;
  claim.decidedByUserId = auth.user.id;
  claim.rejectionReason = status === "rejected" ? reason : null;
  claim.decidedAt = now;
  claim.updatedAt = now;
  createAuditEvent({
    tenantId: claim.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `${status === "approved" ? "Approved" : "Rejected"} welfare claim ${claim.reference}`,
    resourceType: "welfare_claim",
    resourceId: claim.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicWelfareClaim(claim));
}

async function payWelfareClaim(request, response, auth, claimId, correlationId) {
  const claim = db.welfareClaims.find((item) => item.id === claimId);
  if (!claim) return sendError(response, 404, "WELFARE_CLAIM_NOT_FOUND", "Welfare claim not found.", correlationId);
  if (!assertTenantAccess(auth, claim.tenantId, response, correlationId)) return;
  if (claim.status !== "approved") {
    return sendError(response, 409, "WELFARE_CLAIM_NOT_PAYABLE", "Only approved welfare claims can be paid.", correlationId);
  }

  const body = await readJson(request);
  const channel = String(body.channel || "cash");
  if (!allowedWelfareClaimPaymentChannels.has(channel)) {
    return sendError(response, 400, "INVALID_WELFARE_PAYMENT_CHANNEL", "Unsupported welfare payment channel.", correlationId);
  }
  const now = new Date().toISOString();
  if (!assertAccountingPeriodOpen(claim.tenantId, now, response, correlationId)) return;
  if (memberBalances(claim.memberId).welfare < claim.amount) {
    return sendError(response, 409, "INSUFFICIENT_WELFARE", "Member welfare balance is insufficient for this claim.", correlationId);
  }

  claim.status = "paid";
  claim.channel = channel;
  claim.paidByUserId = auth.user.id;
  claim.paidAt = now;
  claim.updatedAt = now;
  createAuditEvent({
    tenantId: claim.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: `Paid welfare claim ${claim.reference}`,
    resourceType: "welfare_claim",
    resourceId: claim.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicWelfareClaim(claim));
}

function publicWelfareClaim(claim) {
  const member = db.members.find((item) => item.id === claim.memberId);
  return {
    ...claim,
    membershipNo: member?.membershipNo || "",
    memberName: member?.fullName || "Unknown member"
  };
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
  const repayments = db.loanRepayments.filter((item) => item.loanId === loan.id);
  return {
    ...loan,
    guarantors: guarantors.filter((item) => item.status === "accepted").length || loan.guarantors,
    guarantorRequests: guarantors.length,
    pendingGuarantors: guarantors.filter((item) => item.status === "pending").length,
    repayments: repayments.length,
    repaymentTotal: repayments.reduce((sum, item) => sum + item.amount, 0)
  };
}

async function createLoan(request, response, auth, correlationId) {
  const body = await readJson(request);
  const tenantId = visibleTenantId(auth, String(body.tenantId || auth.user.tenantId));
  if (!assertTenantAccess(auth, tenantId, response, correlationId)) return;

  const member = db.members.find((item) => item.id === String(body.memberId) && item.tenantId === tenantId);
  if (!member) return sendError(response, 400, "INVALID_MEMBER", "Member does not exist for this tenant.", correlationId);
  const loan = createLoanForMember({ body, member, actorUserId: auth.user.id, response, correlationId });
  if (!loan) return;

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

async function createMemberMobileLoan(request, response, auth, correlationId) {
  const body = await readJson(request);
  const loan = createLoanForMember({ body, member: auth.member, actorUserId: null, response, correlationId });
  if (!loan) return;

  createMemberNotification({
    tenantId: auth.member.tenantId,
    memberId: auth.member.id,
    eventType: "loan_application_submitted",
    resourceType: "loan",
    resourceId: loan.id,
    body: `Mobile loan application ${loan.product} for UGX ${loan.amount} was submitted.`
  });
  createAuditEvent({
    tenantId: auth.member.tenantId,
    actorUserId: null,
    actorName: auth.member.fullName,
    action: `Submitted mobile loan application for ${auth.member.membershipNo}`,
    resourceType: "loan",
    resourceId: loan.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicLoan(loan), 201);
}

async function createMemberMobileComplaint(request, response, auth, correlationId) {
  const body = await readJson(request);
  const subject = String(body.subject || "").trim();
  const category = String(body.category || "other");
  const priority = String(body.priority || "medium");
  if (!subject) return sendError(response, 400, "VALIDATION_ERROR", "Complaint subject is required.", correlationId);
  if (!allowedComplaintCategories.has(category)) return sendError(response, 400, "INVALID_COMPLAINT_CATEGORY", "Unsupported complaint category.", correlationId);
  if (!allowedComplaintPriorities.has(priority)) return sendError(response, 400, "INVALID_COMPLAINT_PRIORITY", "Unsupported complaint priority.", correlationId);

  const now = new Date().toISOString();
  const complaint = {
    id: newId("complaint"),
    tenantId: auth.member.tenantId,
    memberId: auth.member.id,
    category,
    subject,
    description: String(body.description || ""),
    priority,
    status: "open",
    assignedUserId: null,
    resolution: "",
    createdByUserId: null,
    resolvedByUserId: null,
    resolvedAt: null,
    channel: "mobile_offline_sync",
    createdAt: now,
    updatedAt: now
  };
  db.complaints.push(complaint);
  createMemberNotification({
    tenantId: auth.member.tenantId,
    memberId: auth.member.id,
    eventType: "complaint_synced",
    resourceType: "complaint",
    resourceId: complaint.id,
    body: `Complaint draft ${complaint.subject} was synced to the SACCO.`
  });
  createAuditEvent({
    tenantId: auth.member.tenantId,
    actorUserId: null,
    actorName: auth.member.fullName,
    action: `Synced mobile complaint ${complaint.subject}`,
    resourceType: "complaint",
    resourceId: complaint.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, publicComplaint(complaint), 201);
}

function createLoanForMember({ body, member, actorUserId, response, correlationId }) {
  if (member.status !== "active") {
    sendError(response, 400, "MEMBER_NOT_ACTIVE", "Only active members can apply for loans.", correlationId);
    return null;
  }
  const product = String(body.product || "");
  const amount = Number(body.amount);
  const repaymentMonths = Number(body.repaymentMonths || 12);
  if (!allowedLoanProducts.has(product)) {
    sendError(response, 400, "INVALID_LOAN_PRODUCT", "Unsupported loan product.", correlationId);
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    sendError(response, 400, "INVALID_LOAN_AMOUNT", "Loan amount must be greater than zero.", correlationId);
    return null;
  }
  if (!Number.isInteger(repaymentMonths) || repaymentMonths < 1 || repaymentMonths > 60) {
    sendError(response, 400, "INVALID_REPAYMENT_PERIOD", "Repayment period must be between 1 and 60 months.", correlationId);
    return null;
  }

  const balances = memberBalances(member.id);
  const dsr = Math.min(65, Math.round((amount / Math.max(balances.savings * 3, 1)) * 35));
  const loan = {
    id: newId("loan"),
    tenantId: member.tenantId,
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
    channel: actorUserId ? "staff" : "mobile",
    submittedByMemberId: actorUserId ? null : member.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.loans.push(loan);
  return loan;
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

function listLoanRepayments(response, auth, loanId, correlationId) {
  const loan = db.loans.find((item) => item.id === loanId);
  if (!loan) return sendError(response, 404, "LOAN_NOT_FOUND", "Loan not found.", correlationId);
  if (!assertTenantAccess(auth, loan.tenantId, response, correlationId)) return;
  return sendData(response, db.loanRepayments.filter((item) => item.loanId === loan.id));
}

async function recordLoanRepayment(request, response, auth, loanId, correlationId) {
  const loan = db.loans.find((item) => item.id === loanId);
  if (!loan) return sendError(response, 404, "LOAN_NOT_FOUND", "Loan not found.", correlationId);
  if (!assertTenantAccess(auth, loan.tenantId, response, correlationId)) return;

  const body = await readJson(request);
  const amount = Number(body.amount);
  const channel = String(body.channel || "");
  const externalReference = String(body.externalReference || "").trim();
  if (!externalReference) {
    return sendError(response, 400, "INVALID_REPAYMENT_REFERENCE", "External repayment reference is required.", correlationId);
  }

  const existing = db.loanRepayments.find((item) => item.tenantId === loan.tenantId && item.externalReference === externalReference);
  if (existing) {
    const existingLoan = db.loans.find((item) => item.id === existing.loanId);
    return sendData(response, { repayment: existing, loan: publicLoan(existingLoan), idempotent: true });
  }

  if (loan.status !== "active") {
    return sendError(response, 409, "LOAN_NOT_ACTIVE", "Only active loans can receive repayments.", correlationId);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return sendError(response, 400, "INVALID_REPAYMENT_AMOUNT", "Repayment amount must be greater than zero.", correlationId);
  }
  if (amount > loan.balance) {
    return sendError(response, 409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment cannot exceed the outstanding loan balance.", correlationId);
  }
  if (!allowedRepaymentChannels.has(channel)) {
    return sendError(response, 400, "INVALID_REPAYMENT_CHANNEL", "Unsupported repayment channel.", correlationId);
  }

  const now = new Date().toISOString();
  const receivedAt = String(body.receivedAt || now);
  if (!assertAccountingPeriodOpen(loan.tenantId, receivedAt, response, correlationId)) return;
  const repayment = {
    id: newId("loan_repayment"),
    tenantId: loan.tenantId,
    loanId: loan.id,
    memberId: loan.memberId,
    amount,
    channel,
    externalReference,
    receivedAt,
    recordedByUserId: auth.user.id,
    createdAt: now,
    updatedAt: now
  };
  db.loanRepayments.push(repayment);

  loan.balance = Math.max(0, loan.balance - amount);
  if (loan.balance === 0) {
    loan.status = "closed";
    loan.stage = "Closed";
  } else {
    loan.stage = "Disbursed";
  }
  loan.updatedAt = now;

  createAuditEvent({
    tenantId: loan.tenantId,
    actorUserId: auth.user.id,
    actorName: auth.user.fullName,
    action: "Recorded loan repayment",
    resourceType: "loan_repayment",
    resourceId: repayment.id,
    ipAddress: requestIp(request)
  });
  return sendData(response, { repayment, loan: publicLoan(loan) }, 201);
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
    .map((item) => publicMemberGuarantorRequest(item, auth.member.id));
  return sendData(response, requests);
}

function publicMemberGuarantorRequest(requestRecord, memberId) {
  const loan = db.loans.find((item) => item.id === requestRecord.loanId);
  return {
    ...requestRecord,
    loan: publicLoan(loan),
    borrower: publicMember(db.members.find((member) => member.id === loan?.memberId)),
    capacity: guaranteeCapacity(memberId, requestRecord.id)
  };
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
