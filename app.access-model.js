function buildAccessUserRows(input) {
  return input.users.map((user) => {
    const role = accessRoleName(user, input.roles) || "Unassigned";
    return {
      ...user,
      role,
      mfa: user.mfaEnabled ? "Enabled" : "Not enabled",
      activeSessions: user.activeSessionCount || 0,
      accessPurpose: rolePurposeFor(role, input.platformOnly),
      moduleScope: roleModuleScopeFor(role, input.platformOnly),
      status: String(user.status || "active"),
      action: "user-detail",
      actionLabel: "Manage access",
      actionId: user.id
    };
  });
}

function buildAccessSummary(users, roles) {
  return {
    activeUsers: users.filter((user) => normalizeAccessModelText(user.status) === "active").length,
    configuredRoles: roles.length,
    roleCoverage: roleCoverageFor(users, roles),
    totalUsers: users.length
  };
}

function filterAccessUsersForScope(users, platformOnly, tenantId) {
  const scopeTenantId = platformOnly ? "tenant_platform" : tenantId;
  return scopeTenantId ? users.filter((user) => user.tenantId === scopeTenantId) : users;
}

function filterRolesForScope(roles, platformOnly, tenantId) {
  const scopeTenantId = platformOnly ? "tenant_platform" : tenantId;
  const scopedRoles = scopeTenantId ? roles.filter((role) => role.tenantId === scopeTenantId) : roles;
  const preferred = platformOnly ? [
    "Platform Super Admin",
    "Platform Operations Officer",
    "Platform Billing Officer",
    "Platform Compliance Officer",
    "Platform Support Officer"
  ] : [];
  const filtered = preferred.length ? scopedRoles.filter((role) => preferred.includes(String(role.name || ""))) : scopedRoles;
  if (filtered.length) return filtered;
  return [{ id: platformOnly ? "role_platform_support_officer" : "", name: platformOnly ? "Platform Support Officer" : "Default staff role" }];
}

function buildRoleCoverageRows(input) {
  return input.roles.map((role) => {
    const assignedUsers = input.users.filter((user) => accessUserHasRole(user, role)).length;
    const functionRows = roleFunctionRowsFor(role.name, input.platformOnly);
    return {
      roleName: role.name,
      scope: input.platformOnly ? "Platform administration" : "SACCO staff",
      assignedUsers,
      accessPurpose: rolePurposeFor(role.name, input.platformOnly),
      moduleScope: roleModuleScopeFor(role.name, input.platformOnly),
      functionCount: functionRows.length,
      status: String(role.status || "active")
    };
  });
}

function roleCoverageFor(users, roles) {
  if (!users.length) return "0%";
  const assigned = users.filter((user) => user.role || user.roleId || roles.some((role) => accessUserHasRole(user, role))).length;
  return `${Math.round((assigned / users.length) * 100)}%`;
}

function rolePurposeFor(roleName, platformOnly) {
  const name = normalizeAccessModelText(roleName);
  if (platformOnly) {
    if (name.includes("super")) return "Full platform control";
    if (name.includes("billing")) return "Subscriptions and payments";
    if (name.includes("compliance")) return "Audit and oversight";
    if (name.includes("support")) return "SACCO support";
    if (name.includes("operations")) return "Monitoring and operations";
    return "Platform administration";
  }
  if (name.includes("treasurer")) return "Finance and cash control";
  if (name.includes("secretary")) return "Membership and governance";
  if (name.includes("chair")) return "Oversight and approvals";
  if (name.includes("accountant")) return "Accounting and reconciliation";
  if (name.includes("teller")) return "Transactions and cashiering";
  if (name.includes("auditor")) return "Read-only audit review";
  if (name.includes("loan")) return "Loan origination";
  return "SACCO administration";
}

function roleModuleScopeFor(roleName, platformOnly) {
  const name = normalizeAccessModelText(roleName);
  if (platformOnly) {
    if (name.includes("super")) return "All platform modules";
    if (name.includes("billing")) return "Dashboard, subscriptions, reports";
    if (name.includes("compliance")) return "Dashboard, reports, audit";
    if (name.includes("support")) return "Dashboard, SACCOs, complaints";
    if (name.includes("operations")) return "Dashboard, SACCOs, complaints, notifications";
    return "Platform administration";
  }
  if (name.includes("administrator") || name.includes("admin")) return "All SACCO modules";
  if (name.includes("treasurer")) return "Cash collections, receipts, member payments, approvals, reconciliation and reports";
  if (name.includes("secretary")) return "Members, shares, welfare, approvals, reports, governance, complaints";
  if (name.includes("chair")) return "Loans, guarantors, approvals, reports, governance";
  if (name.includes("accountant")) return "Transactions, accounting, reconciliation, reports";
  if (name.includes("teller")) return "Transactions and receipts";
  if (name.includes("auditor")) return "Read-only reports and audit";
  if (name.includes("loan")) return "Members, loans, guarantors, approvals, reports";
  return "Configured SACCO modules";
}

function buildUserDetailRoleModel(input) {
  const assignedRoleIds = input.roleIds.length ? input.roleIds : Array.isArray(input.user.roleIds) ? input.user.roleIds.map(String) : [String(input.user.roleId || "")].filter(Boolean);
  const assignedRoles = input.roles.filter((role) => assignedRoleIds.includes(String(role.id || "")));
  const primaryRole = assignedRoles[0] || input.roles[0] || {};
  return {
    assignedRoleIds,
    assignedRoles,
    primaryRole,
    assignedRoleNamesText: assignedRoles.length ? assignedRoles.map((role) => String(role.name || "")).filter(Boolean).join(", ") : "Unassigned",
    roleSummaryText: roleSummaryTextFor(assignedRoleIds, input.roles, input.platformOnly)
  };
}

function buildUserSessionRows(input) {
  return input.sessions.map((session) => ({
    id: session.id,
    ipAddress: String(session.ipAddress || "Not captured"),
    device: input.deviceLabel(session.userAgent),
    createdAt: input.formatDateTime(session.createdAt),
    expiresAt: input.formatDateTime(session.expiresAt),
    action: input.canManageUser && input.userId !== input.currentUserId ? "user-session-revoke" : "none",
    actionLabel: "Revoke",
    actionId: `${input.userId || ""}|${session.id || ""}`
  }));
}

function buildPasswordResetRows(input) {
  return input.resets.map((request) => ({
    id: request.id,
    status: String(request.status || ""),
    createdAt: input.formatDateTime(request.createdAt),
    expiresAt: input.formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? input.formatDateTime(request.usedAt) : "-"
  }));
}

function deviceLabelFor(userAgent) {
  const value = String(userAgent || "").trim();
  if (!value) return "Not captured";
  const browser = value.includes("Edg/") ? "Edge"
    : value.includes("Chrome/") ? "Chrome"
      : value.includes("Firefox/") ? "Firefox"
        : value.includes("Safari/") ? "Safari"
          : "Browser";
  const os = value.includes("Windows") ? "Windows"
    : value.includes("Android") ? "Android"
      : value.includes("iPhone") || value.includes("iPad") ? "iOS"
        : value.includes("Mac OS") ? "macOS"
          : value.includes("Linux") ? "Linux"
            : "Device";
  return `${browser} on ${os}`;
}

function buildSaccoStaffGuideRows(roles) {
  const preferred = ["SACCO Chairperson", "SACCO Treasurer", "SACCO Secretary", "Loans Officer", "Accountant", "Teller", "Auditor"];
  return preferred.map((name) => {
    const configured = roles.find((role) => normalizeAccessModelText(role.name) === normalizeAccessModelText(name) || normalizeAccessModelText(role.name).includes(normalizeAccessModelText(name.replace("SACCO ", ""))));
    const roleName = String(configured?.name || name);
    return {
      roleName,
      accessPurpose: rolePurposeFor(roleName, false),
      moduleScope: roleModuleScopeFor(roleName, false),
      configured: configured ? "Available" : "Template"
    };
  });
}

function roleFunctionCatalog(platformOnly) {
  return platformOnly ? platformRoleFunctionCatalog() : saccoRoleFunctionCatalog();
}

function roleFunctionRowsFor(roleName, platformOnly) {
  const normalizedRole = normalizeAccessModelText(roleName);
  const catalog = roleFunctionCatalog(platformOnly);
  const key = Object.keys(catalog).find((candidate) => {
    const normalizedCandidate = normalizeAccessModelText(candidate);
    return normalizedRole === normalizedCandidate
      || normalizedRole.includes(normalizedCandidate)
      || normalizedCandidate.includes(normalizedRole.replace("sacco ", ""));
  });
  return key ? catalog[key] : [];
}

function buildRoleFunctionMatrixRows(roles, platformOnly) {
  return roles.map((role) => {
    const functions = roleFunctionRowsFor(role.name, platformOnly);
    return {
      roleName: role.name,
      accessPurpose: rolePurposeFor(role.name, platformOnly),
      functionCount: functions.length,
      functions: functions.map((item) => item.functionName).join(", "),
      descriptions: functions.map((item) => `${item.functionName}: ${item.description}`).join(" | "),
      status: functions.length ? "Mapped" : "Review required"
    };
  });
}

function platformRoleFunctionCatalog() {
  return {
    "Platform Super Admin": [
      roleFunction("Dashboard", "View overall platform performance, alerts, SACCO activity and role-scoped metrics."),
      roleFunction("SACCO Registration", "Review SACCO self-registration applications, payment status and approval readiness."),
      roleFunction("SACCO Accounts", "Monitor SACCO account health, activation state, subscription status and expiry risk."),
      roleFunction("Subscriptions", "View and manage SACCO subscription packages, billing, renewals and payment records."),
      roleFunction("Transactions", "Record and monitor transactions between the platform and SACCOs."),
      roleFunction("Reports", "View platform-wide operational, financial and regulatory reports."),
      roleFunction("Complaints", "View, reply to and resolve SACCO support tickets and escalations."),
      roleFunction("Notifications", "View, create and manage notification templates and delivery records."),
      roleFunction("Users and Roles", "Create users, assign roles and manage platform or SACCO access permissions."),
      roleFunction("Audit Logs", "Review sensitive platform activity and access history."),
      roleFunction("System Settings", "Manage protected platform configuration and integration controls.")
    ],
    "Platform Administrator": [
      roleFunction("SACCO Registration", "Create and review SACCO onboarding records."),
      roleFunction("Users and Roles", "View and create staff users and custom roles."),
      roleFunction("Reports", "View platform reporting."),
      roleFunction("Transactions", "Create, view and approve platform financial transactions."),
      roleFunction("Accounting", "View and post accounting-affecting records."),
      roleFunction("Loans and Approvals", "View, create and decide platform-level loan and approval records."),
      roleFunction("Operations", "View operational health and exception indicators."),
      roleFunction("Notifications", "View and manage notification templates."),
      roleFunction("Governance", "View and manage governance records."),
      roleFunction("Complaints", "View and manage complaint queues."),
      roleFunction("Subscriptions", "View and manage SACCO subscriptions.")
    ],
    "Platform Operations Officer": [
      roleFunction("Dashboard", "Monitor platform operations, alerts and SACCO activity."),
      roleFunction("SACCO Registration", "Track SACCO onboarding and registration pipeline."),
      roleFunction("Complaints", "View SACCO support complaints and escalations."),
      roleFunction("Notifications", "View notification delivery status and operational messages."),
      roleFunction("Operations", "Monitor system health, exceptions and release-gate status."),
      roleFunction("Reports", "View operational reports."),
      roleFunction("Transactions View", "Review transaction activity without payment-management authority."),
      roleFunction("Loans View", "View SACCO loan activity for operational oversight."),
      roleFunction("Approvals View", "View approval workflows and pending decisions.")
    ],
    "Platform Billing Officer": [
      roleFunction("Dashboard", "View billing-focused platform metrics and account status summaries."),
      roleFunction("SACCO Registration", "View SACCO registration records for billing and payment follow-up."),
      roleFunction("SACCO Accounts", "Check SACCO subscription health, expiry, package and payment status."),
      roleFunction("Subscriptions", "Manage subscription payments, packages, invoices and access billing status."),
      roleFunction("Reports", "View billing and operational reports."),
      roleFunction("Operations", "View operational status related to billing and access risks.")
    ],
    "Platform Compliance Officer": [
      roleFunction("Dashboard", "View compliance-focused platform metrics."),
      roleFunction("SACCO Registration", "Review SACCO registration and onboarding status."),
      roleFunction("SACCO Accounts", "Monitor SACCO account health and compliance risk."),
      roleFunction("Transactions View", "Review platform and SACCO transaction records."),
      roleFunction("Accounting View", "View accounting records and reports for oversight."),
      roleFunction("Loans View", "Review loan files for compliance monitoring."),
      roleFunction("Approvals View", "Review approval workflows and decisions."),
      roleFunction("Governance View", "View governance meetings and resolutions."),
      roleFunction("Reports", "Access compliance and regulatory reports."),
      roleFunction("Audit Logs", "Review read-only platform audit activity."),
      roleFunction("Operations", "View operational health and exception indicators.")
    ],
    "Platform Support Officer": [
      roleFunction("Dashboard", "View support-related platform status and metrics."),
      roleFunction("SACCO Registration", "View SACCO registration records when assisting SACCO admins."),
      roleFunction("Complaints", "View, reply to and manage SACCO support tickets."),
      roleFunction("Notifications View", "View notification deliveries relevant to support."),
      roleFunction("Members View", "View member-related context when resolving SACCO support issues."),
      roleFunction("Reports", "View support and operational reports."),
      roleFunction("Operations", "View operational health and support exception counts.")
    ]
  };
}

function saccoRoleFunctionCatalog() {
  return {
    "SACCO Administrator": [
      roleFunction("Dashboard", "View full SACCO operating metrics and alerts."),
      roleFunction("Members", "Register members, view profiles, manage KYC and approve member status."),
      roleFunction("Payments", "Capture member deposits and loan repayments."),
      roleFunction("Loans", "Submit, view and manage loan applications."),
      roleFunction("Loan Approval", "Record or manage loan approval decisions."),
      roleFunction("Expenses", "Capture and review SACCO operating expenses."),
      roleFunction("Member Subscriptions", "Manage mandatory member dues and subscription expiry."),
      roleFunction("Transfers", "Create, manage and approve savings transfers or deductions."),
      roleFunction("Approvals", "View and decide maker-checker approval workflows."),
      roleFunction("Reconciliation", "Review bank and mobile money reconciliation records."),
      roleFunction("Reports", "View operational, financial and regulatory reports."),
      roleFunction("Transactions", "Create, view and approve SACCO financial transactions."),
      roleFunction("Settings", "Manage SACCO profile, products, branches and calendar policy."),
      roleFunction("Audit Logs", "Review sensitive SACCO activity.")
    ],
    "Chairperson": [
      roleFunction("Dashboard", "View leadership-level SACCO performance and alerts."),
      roleFunction("Loans", "Review loan files and loan status."),
      roleFunction("Loan Approval", "Record paper approval references and loan approver details."),
      roleFunction("Subscriptions", "View SACCO platform, SMS and USSD subscription status."),
      roleFunction("Reports", "View operational and financial reports."),
      roleFunction("Members", "View member profiles and balances."),
      roleFunction("Transactions", "View transaction records for oversight."),
      roleFunction("Governance", "View governance meetings and resolutions."),
      roleFunction("Complaints", "View member complaints and escalations."),
      roleFunction("Alerts", "View leadership notifications."),
      roleFunction("Documents", "View signed forms and member or loan files."),
      roleFunction("Settings", "Manage SACCO profile and membership calendar policy.")
    ],
    "Treasurer": [
      roleFunction("Dashboard", "View finance-focused SACCO metrics."),
      roleFunction("Finance", "Manage receipts, cash control, approvals and reconciliation."),
      roleFunction("Payments", "Capture member deposits and loan repayments."),
      roleFunction("Loans View", "View loans for repayment and balance context."),
      roleFunction("Expenses", "Capture and review operating expenses."),
      roleFunction("Member Subscriptions", "Track and manage member dues."),
      roleFunction("Transfers", "Create and manage savings transfers or deductions."),
      roleFunction("Approvals", "View finance approval queues."),
      roleFunction("Reconciliation", "Reconcile bank and mobile money collections."),
      roleFunction("Reports", "View financial and operational reports."),
      roleFunction("Transactions", "Create, view and approve financial transactions."),
      roleFunction("Accounting", "View and post accounting-affecting records.")
    ],
    "Secretary": [
      roleFunction("Dashboard", "View membership and governance-focused SACCO metrics."),
      roleFunction("Members", "Register members, view profiles and manage member status approval."),
      roleFunction("Member Subscriptions", "Track mandatory member dues and expiry."),
      roleFunction("Approvals", "View approval workflows relevant to secretary duties."),
      roleFunction("Reports", "View membership, governance and operational reports."),
      roleFunction("Shares", "View share register records."),
      roleFunction("Welfare", "View and manage welfare contribution and claim records."),
      roleFunction("Governance", "Create and manage meetings, minutes and resolutions."),
      roleFunction("Complaints", "Capture, view and resolve member complaints.")
    ],
    "Loans Officer": [
      roleFunction("Dashboard", "View loan-focused SACCO metrics."),
      roleFunction("Loans", "Submit and view loan applications."),
      roleFunction("Loan Approval", "View loan approval queue and approval status."),
      roleFunction("Members", "View member profiles for loan assessment."),
      roleFunction("Guarantors", "View guarantee requests and obligations."),
      roleFunction("Approvals", "View approval workflow status."),
      roleFunction("Reports", "View loan and operational reports."),
      roleFunction("Complaints", "View complaint records related to loan support.")
    ],
    "Accountant": [
      roleFunction("Dashboard", "View accounting and finance metrics."),
      roleFunction("Payments", "Capture member deposits and repayments."),
      roleFunction("Expenses", "Capture and review SACCO operating expenses."),
      roleFunction("Reconciliation", "Review bank and mobile money reconciliation."),
      roleFunction("Reports", "View accounting and operational reports."),
      roleFunction("Transactions", "Create and view financial transactions."),
      roleFunction("Savings", "View savings products, accounts and statements."),
      roleFunction("Accounting", "View and post accounting-affecting records."),
      roleFunction("Fund Types", "View configurable SACCO fund types."),
      roleFunction("Operations", "View operational health indicators.")
    ],
    "Teller / Cashier": [
      roleFunction("Dashboard", "View cashier-focused operating metrics."),
      roleFunction("Payments", "Capture member deposits and loan repayments."),
      roleFunction("Transactions", "Submit and view transaction or receipt records."),
      roleFunction("Members", "View member profiles needed for transaction capture.")
    ],
    "Auditor": [
      roleFunction("Dashboard", "View audit-focused SACCO metrics."),
      roleFunction("Members", "View member profiles and balances."),
      roleFunction("Transactions", "View financial transaction records."),
      roleFunction("Loans", "View loan files."),
      roleFunction("Accounting", "View accounting records and reports."),
      roleFunction("Reconciliation", "Review reconciliation evidence."),
      roleFunction("Reports", "View operational, financial and regulatory reports."),
      roleFunction("Savings", "View savings records."),
      roleFunction("Shares", "View share records."),
      roleFunction("Approvals", "View approval workflows and decisions."),
      roleFunction("Audit Logs", "Review sensitive activity history."),
      roleFunction("Operations", "View operational health indicators.")
    ]
  };
}

function roleFunction(functionName, description) {
  return { functionName, description };
}

function buildPermissionMatrixRows(modules, permissions = []) {
  const defaultActions = ["View", "Create", "Edit", "Approve", "Export", "Manage"];
  return modules.slice(0, 10).map((item) => {
    const moduleId = String(item[0] || "");
    const moduleName = String(item[1] || item[0] || "");
    const modulePermissions = permissions
      .filter((permission) => normalizeAccessModelText(permission.module) === normalizeAccessModelText(moduleId) || normalizeAccessModelText(permission.module) === normalizeAccessModelText(moduleName))
      .map((permission) => String(permission.name || permission.id || ""))
      .filter(Boolean);
    return {
      moduleId,
      moduleName,
      actions: modulePermissions.length ? modulePermissions : defaultActions
    };
  });
}

function roleSummaryTextFor(roleIds, roles, platformOnly) {
  const selectedRoles = roles.filter((role) => roleIds.includes(String(role.id || "")));
  if (!selectedRoles.length) return "Select at least one role.";
  return selectedRoles
    .map((role) => `${role.name}: ${rolePurposeFor(role.name, platformOnly)} / ${roleModuleScopeFor(role.name, platformOnly)}`)
    .join(" | ");
}

function accessRoleName(user, roles) {
  return String(user.role || user.roleName || roles.find((role) => role.id === user.roleId)?.name || "");
}

function accessUserHasRole(user, role) {
  const roleName = normalizeAccessModelText(role.name);
  const roleId = String(role.id || "");
  return normalizeAccessModelText(user.role).includes(roleName) || user.roleId === roleId || (Array.isArray(user.roleIds) && user.roleIds.includes(roleId));
}

function normalizeAccessModelText(value) {
  return String(value || "").toLowerCase();
}
