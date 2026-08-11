import type { TerekaPermission, TerekaPlatformUser, TerekaRecord, TerekaRole } from "../types/domain";

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
  if (name.includes("treasurer")) return "Transactions, savings, shares, welfare, approvals, accounting, reconciliation, reports";
  if (name.includes("secretary")) return "Members, shares, welfare, approvals, reports, governance, complaints";
  if (name.includes("chair")) return "Loans, guarantors, approvals, reports, governance";
  if (name.includes("accountant")) return "Transactions, accounting, reconciliation, reports";
  if (name.includes("teller")) return "Transactions and receipts";
  if (name.includes("auditor")) return "Read-only reports and audit";
  if (name.includes("loan")) return "Members, loans, guarantors, approvals, reports";
  return "Configured SACCO modules";
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
