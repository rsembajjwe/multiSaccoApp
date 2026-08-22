import type { TerekaPasswordResetRecord, TerekaPermission, TerekaPlatformUser, TerekaRecord, TerekaRole, TerekaSecuritySession } from "../types/domain";

export interface TerekaAccessUserRow extends TerekaPlatformUser, TerekaRecord {
  accessPurpose: string;
  action: string;
  actionId?: string;
  actionLabel: string;
  activeSessions: number | string;
  mfa: string;
  moduleScope: string;
  role: string;
  status: string;
}

export interface TerekaAccessSummary {
  activeUsers: number;
  configuredRoles: number;
  roleCoverage: string;
  totalUsers: number;
}

export interface TerekaRoleCoverageRow {
  accessPurpose: string;
  assignedUsers: number;
  moduleScope: string;
  roleName?: string;
  scope: string;
  status: string;
}

export interface TerekaSaccoStaffGuideRow {
  accessPurpose: string;
  configured: string;
  moduleScope: string;
  roleName: string;
}

export interface TerekaPermissionMatrixRow {
  actions: string[];
  moduleId: string;
  moduleName: string;
}

export interface TerekaUserDetailRoleModel {
  assignedRoleIds: string[];
  assignedRoleNamesText: string;
  assignedRoles: Array<TerekaRole & TerekaRecord>;
  primaryRole: TerekaRole & TerekaRecord;
  roleSummaryText: string;
}

export interface TerekaUserSessionRow {
  action: string;
  actionId?: string;
  actionLabel: string;
  createdAt: string;
  device: string;
  expiresAt: string;
  id?: string;
  ipAddress: string;
}

export interface TerekaPasswordResetRow {
  createdAt: string;
  expiresAt: string;
  id?: string;
  status: string;
  usedAt: string;
}

export function buildAccessUserRows(input: {
  platformOnly: boolean;
  roles: Array<TerekaRole & TerekaRecord>;
  users: Array<TerekaPlatformUser & TerekaRecord>;
}): TerekaAccessUserRow[] {
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
      actionId: user.id,
    };
  });
}

export function buildAccessSummary(users: Array<TerekaPlatformUser & TerekaRecord>, roles: Array<TerekaRole & TerekaRecord>): TerekaAccessSummary {
  return {
    activeUsers: users.filter((user) => normalizeAccessText(user.status) === "active").length,
    configuredRoles: roles.length,
    roleCoverage: roleCoverageFor(users, roles),
    totalUsers: users.length,
  };
}

export function filterAccessUsersForScope(users: Array<TerekaPlatformUser & TerekaRecord>, platformOnly: boolean, tenantId?: string): Array<TerekaPlatformUser & TerekaRecord> {
  const scopeTenantId = platformOnly ? "tenant_platform" : tenantId;
  return scopeTenantId ? users.filter((user) => user.tenantId === scopeTenantId) : users;
}

export function filterRolesForScope(roles: Array<TerekaRole & TerekaRecord>, platformOnly: boolean, tenantId?: string): Array<TerekaRole & TerekaRecord> {
  const scopeTenantId = platformOnly ? "tenant_platform" : tenantId;
  const scopedRoles = scopeTenantId ? roles.filter((role) => role.tenantId === scopeTenantId) : roles;
  const preferred = platformOnly ? [
    "Platform Super Admin",
    "Platform Operations Officer",
    "Platform Billing Officer",
    "Platform Compliance Officer",
    "Platform Support Officer",
  ] : [];
  const filtered = preferred.length ? scopedRoles.filter((role) => preferred.includes(String(role.name || ""))) : scopedRoles;
  if (filtered.length) return filtered;
  return [{ id: platformOnly ? "role_platform_support_officer" : "", name: platformOnly ? "Platform Support Officer" : "Default staff role" }];
}

export function buildRoleCoverageRows(input: {
  platformOnly: boolean;
  roles: Array<TerekaRole & TerekaRecord>;
  users: Array<TerekaPlatformUser & TerekaRecord>;
}): TerekaRoleCoverageRow[] {
  return input.roles.map((role) => {
    const assignedUsers = input.users.filter((user) => accessUserHasRole(user, role)).length;
    return {
      roleName: role.name,
      scope: input.platformOnly ? "Platform administration" : "SACCO staff",
      assignedUsers,
      accessPurpose: rolePurposeFor(role.name, input.platformOnly),
      moduleScope: roleModuleScopeFor(role.name, input.platformOnly),
      status: String(role.status || "active"),
    };
  });
}

export function roleCoverageFor(users: Array<TerekaPlatformUser & TerekaRecord>, roles: Array<TerekaRole & TerekaRecord>): string {
  if (!users.length) return "0%";
  const assigned = users.filter((user) => user.role || user.roleId || roles.some((role) => accessUserHasRole(user, role))).length;
  return `${Math.round((assigned / users.length) * 100)}%`;
}

export function rolePurposeFor(roleName: unknown, platformOnly: boolean): string {
  const name = normalizeAccessText(roleName);
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

export function roleModuleScopeFor(roleName: unknown, platformOnly: boolean): string {
  const name = normalizeAccessText(roleName);
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
  if (name.includes("secretary")) return "Members, membership subscriptions, approvals, reports, governance, complaints";
  if (name.includes("chair")) return "Loans, guarantors, approvals, reports, governance";
  if (name.includes("accountant")) return "Transactions, accounting, reconciliation, reports";
  if (name.includes("teller")) return "Transactions and receipts";
  if (name.includes("auditor")) return "Read-only reports and audit";
  if (name.includes("loan")) return "Members, loans, guarantors, approvals, reports";
  return "Configured SACCO modules";
}

export function buildUserDetailRoleModel(input: {
  platformOnly: boolean;
  roleIds: string[];
  roles: Array<TerekaRole & TerekaRecord>;
  user: TerekaPlatformUser & TerekaRecord;
}): TerekaUserDetailRoleModel {
  const assignedRoleIds = input.roleIds.length ? input.roleIds : Array.isArray(input.user.roleIds) ? input.user.roleIds.map(String) : [String(input.user.roleId || "")].filter(Boolean);
  const assignedRoles = input.roles.filter((role) => assignedRoleIds.includes(String(role.id || "")));
  const primaryRole = assignedRoles[0] || input.roles[0] || {};
  return {
    assignedRoleIds,
    assignedRoles,
    primaryRole,
    assignedRoleNamesText: assignedRoles.length ? assignedRoles.map((role) => String(role.name || "")).filter(Boolean).join(", ") : "Unassigned",
    roleSummaryText: roleSummaryTextFor(assignedRoleIds, input.roles, input.platformOnly),
  };
}

export function buildUserSessionRows(input: {
  canManageUser: boolean;
  currentUserId?: string;
  deviceLabel: (userAgent: unknown) => string;
  formatDateTime: (value: unknown) => string;
  sessions: Array<TerekaSecuritySession & TerekaRecord>;
  userId?: string;
}): TerekaUserSessionRow[] {
  return input.sessions.map((session) => ({
    id: session.id,
    ipAddress: String(session.ipAddress || "Not captured"),
    device: input.deviceLabel(session.userAgent),
    createdAt: input.formatDateTime(session.createdAt),
    expiresAt: input.formatDateTime(session.expiresAt),
    action: input.canManageUser && input.userId !== input.currentUserId ? "user-session-revoke" : "none",
    actionLabel: "Revoke",
    actionId: `${input.userId || ""}|${session.id || ""}`,
  }));
}

export function buildPasswordResetRows(input: {
  formatDateTime: (value: unknown) => string;
  resets: Array<TerekaPasswordResetRecord & TerekaRecord>;
}): TerekaPasswordResetRow[] {
  return input.resets.map((request) => ({
    id: request.id,
    status: String(request.status || ""),
    createdAt: input.formatDateTime(request.createdAt),
    expiresAt: input.formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? input.formatDateTime(request.usedAt) : "-",
  }));
}

export function deviceLabelFor(userAgent: unknown): string {
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

export function buildSaccoStaffGuideRows(roles: Array<TerekaRole & TerekaRecord>): TerekaSaccoStaffGuideRow[] {
  const preferred = ["SACCO Chairperson", "SACCO Treasurer", "SACCO Secretary", "Loans Officer", "Accountant", "Teller", "Auditor"];
  return preferred.map((name) => {
    const configured = roles.find((role) => normalizeAccessText(role.name) === normalizeAccessText(name) || normalizeAccessText(role.name).includes(normalizeAccessText(name.replace("SACCO ", ""))));
    const roleName = String(configured?.name || name);
    return {
      roleName,
      accessPurpose: rolePurposeFor(roleName, false),
      moduleScope: roleModuleScopeFor(roleName, false),
      configured: configured ? "Available" : "Template",
    };
  });
}

export function buildPermissionMatrixRows(modules: Array<[string, string] | string[]>, permissions: TerekaPermission[] = []): TerekaPermissionMatrixRow[] {
  const defaultActions = ["View", "Create", "Edit", "Approve", "Export", "Manage"];
  return modules.slice(0, 10).map((item) => {
    const moduleId = String(item[0] || "");
    const moduleName = String(item[1] || item[0] || "");
    const modulePermissions = permissions
      .filter((permission) => normalizeAccessText(permission.module) === normalizeAccessText(moduleId) || normalizeAccessText(permission.module) === normalizeAccessText(moduleName))
      .map((permission) => String(permission.name || permission.id || ""))
      .filter(Boolean);
    return {
      moduleId,
      moduleName,
      actions: modulePermissions.length ? modulePermissions : defaultActions,
    };
  });
}

export function roleSummaryTextFor(roleIds: string[], roles: Array<TerekaRole & TerekaRecord>, platformOnly: boolean): string {
  const selectedRoles = roles.filter((role) => roleIds.includes(String(role.id || "")));
  if (!selectedRoles.length) return "Select at least one role.";
  return selectedRoles
    .map((role) => `${role.name}: ${rolePurposeFor(role.name, platformOnly)} / ${roleModuleScopeFor(role.name, platformOnly)}`)
    .join(" | ");
}

function accessRoleName(user: TerekaPlatformUser & TerekaRecord, roles: Array<TerekaRole & TerekaRecord>): string {
  return String(user.role || user.roleName || roles.find((role) => role.id === user.roleId)?.name || "");
}

function accessUserHasRole(user: TerekaPlatformUser & TerekaRecord, role: TerekaRole & TerekaRecord): boolean {
  const roleName = normalizeAccessText(role.name);
  const roleId = String(role.id || "");
  return normalizeAccessText(user.role).includes(roleName) || user.roleId === roleId || (Array.isArray(user.roleIds) && user.roleIds.includes(roleId));
}

function normalizeAccessText(value: unknown): string {
  return String(value || "").toLowerCase();
}
