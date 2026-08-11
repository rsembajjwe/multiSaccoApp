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
    return {
      roleName: role.name,
      scope: input.platformOnly ? "Platform administration" : "SACCO staff",
      assignedUsers,
      accessPurpose: rolePurposeFor(role.name, input.platformOnly),
      moduleScope: roleModuleScopeFor(role.name, input.platformOnly),
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
  if (name.includes("treasurer")) return "Transactions, savings, shares, welfare, approvals, accounting, reconciliation, reports";
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
