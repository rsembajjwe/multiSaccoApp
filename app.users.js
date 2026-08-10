function usersView() {
  const platformOnly = isPlatform();
  const users = platformOnly ? dataRows("users").filter((user) => user.tenantId === "tenant_platform") : dataRows("users");
  const canCreate = hasPermission("users:create") || hasPermission("roles:create");
  const rows = users.map((user) => ({ ...staffAccessRow(user, platformOnly), action: "user-detail", actionLabel: "Manage access", actionId: user.id }));
  const roles = userRoleOptions(platformOnly);
  const listPanel = recordTable(platformOnly ? "Platform administrator list" : "SACCO staff access list", rows, ["fullName", "email", "phone", "role", "mfa", "activeSessions", "accessPurpose", "moduleScope", "lastLogin", "status"]);
  const detailPanel = userDetailPanel(users, canCreate) || emptyState("User detail and role assignment", "Select Manage access from the administrator list to review roles and module access.");
  if (platformOnly) {
    return `
      <div class="dashboard-grid">
        ${summary(t("platformUsers"), users.length, "Administrators only", t("review"))}
        ${summary(t("activeUsers"), users.filter((user) => normal(user.status) === "active").length, "Can sign in", "Monitor")}
        ${summary(t("configuredRoles"), roles.length, "Available assignments", "Manage")}
        ${summary(t("roleCoverage"), roleCoverage(users, roles), "Users with assigned roles", "Audit")}
      </div>
      ${userManagementTabs(canCreate)}
      ${platformUserTabContent({
        activeTab: state.userAdminTab,
        canCreate,
        addPanel: canCreate ? addUserPanel(true) : emptyState(t("addPlatformUser"), "Only Platform Super Admin users can add platform administrators."),
        detailPanel,
        coveragePanel: roleCoveragePanel(users, roles, true),
        listPanel,
        permissionPanel: permissionMatrix()
      })}
    `;
  }
  return `
    <div class="dashboard-grid">
      ${summary("SACCO staff users", users.length, "Staff accounts only, not members", "Review")}
      ${summary("Active users", users.filter((user) => normal(user.status) === "active").length, "Can sign in", "Monitor")}
      ${summary("Configured roles", roles.length, "Available assignments", "Manage")}
      ${summary("Role coverage", roleCoverage(users, roles), "Users with assigned roles", "Audit")}
    </div>
    ${!platformOnly ? saccoStaffAccessGuide(roles) : ""}
    ${canCreate ? addUserPanel(platformOnly) : ""}
    ${userDetailPanel(users, canCreate)}
    ${roleCoveragePanel(users, roles, platformOnly)}
    ${listPanel}
    ${permissionMatrix()}
  `;
}

function userManagementTabs(canCreate) {
  const tabs = [
    ["add", t("addPlatformUser"), canCreate],
    ["detail", t("userDetailRoleAssignment"), true],
    ["coverage", t("platformRoleCoverage"), true],
    ["list", t("platformAdministratorList"), true],
    ["matrix", t("permissionMatrix"), true]
  ];
  if (!tabs.some(([id]) => id === state.userAdminTab)) state.userAdminTab = "list";
  if (state.userAdminTab === "add" && !canCreate) state.userAdminTab = "list";
  return `
    <section class="panel compact-panel">
      <div class="tabs management-tabs">
        ${tabs.map(([id, label, enabled]) => `<button class="${state.userAdminTab === id ? "active" : ""}" type="button" data-user-tab="${id}" ${enabled ? "" : "disabled"}>${label}</button>`).join("")}
      </div>
    </section>
  `;
}

function platformUserTabContent({ activeTab, addPanel, detailPanel, coveragePanel, listPanel, permissionPanel }) {
  if (activeTab === "add") return addPanel;
  if (activeTab === "detail") return detailPanel;
  if (activeTab === "coverage") return coveragePanel;
  if (activeTab === "matrix") return permissionPanel;
  return listPanel;
}

function addUserPanel(platformOnly) {
  const roles = userRoleOptions(platformOnly);
  const defaultRole = roles[0] || {};
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${platformOnly ? "Add platform user" : "Add SACCO staff user"}</h2>
          <p>${platformOnly ? "Create a platform administrator and assign the role that controls their views." : "Create a SACCO staff login for Treasurer, Secretary, Chairperson or another staff role. Members are managed in the Members screen."}</p>
        </div>
      </div>
      ${state.userFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.userFormMessage)}</strong></div>` : ""}
      ${state.userFormError ? `<div class="notice warning"><strong>Could not create user.</strong><span>${escapeHtml(state.userFormError)}</span></div>` : ""}
      <form id="addUserForm" class="form-grid">
        <input type="hidden" id="newUserTenantId" value="${platformOnly ? "tenant_platform" : escapeHtml(state.user?.tenantId || "")}">
        <label><span>Full name</span><input id="newUserFullName" required placeholder="${platformOnly ? "e.g. Platform Support Officer" : "e.g. Branch Teller"}"></label>
        <label><span>Email / username</span><input id="newUserEmail" type="email" required placeholder="name@tereka.online"></label>
        <label><span>Phone</span><input id="newUserPhone" placeholder="+256..."></label>
        <label><span>Temporary password</span><input id="newUserPassword" type="password" required minlength="10" placeholder="At least 10 characters"></label>
        <div class="wide">
          <span class="field-label">Roles</span>
          <div class="role-checkbox-grid">
            ${roles.map((role, index) => `
              <label class="check-row">
                <input type="checkbox" name="newUserRoleIds" value="${escapeHtml(role.id)}" data-role-checkbox="new" ${index === 0 ? "checked" : ""}>
                <span>${escapeHtml(role.name)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="mini-fact wide">
          <span>Role access preview</span>
          <strong id="newUserRolePreview">${escapeHtml(roleSummaryText(defaultRole.id ? [defaultRole.id] : [], platformOnly))}</strong>
        </div>
        <div class="form-actions inline">
          <button class="button primary" type="submit">Create user</button>
          <button class="button secondary" type="button" data-action="refresh">Refresh list</button>
        </div>
      </form>
    </section>
  `;
}

function userDetailPanel(users, canManageRoles) {
  const selected = users.find((user) => user.id === state.selectedUserId);
  if (!selected) return "";
  const roles = userRoleOptions(selected.tenantId === "tenant_platform");
  const assignedRoleIds = state.selectedUserRoles || [];
  const assignedRoles = roles.filter((role) => assignedRoleIds.includes(role.id));
  const primaryRole = assignedRoles[0] || roles[0] || {};
  const platformUser = selected.tenantId === "tenant_platform";
  const canManageUser = canManageRoles && (!platformUser || roleKind() === "super");
  const nextStatus = normal(selected.status) === "active" ? "suspended" : "active";
  const sessionRows = (state.selectedUserSessions || []).map((session) => ({
    id: session.id,
    ipAddress: session.ipAddress || "Not captured",
    device: deviceLabel(session.userAgent),
    createdAt: formatDateTime(session.createdAt),
    expiresAt: formatDateTime(session.expiresAt),
    action: canManageUser && selected.id !== state.user?.id ? "user-session-revoke" : "none",
    actionLabel: "Revoke",
    actionId: `${selected.id}|${session.id}`
  }));
  const resetRows = (state.selectedUserPasswordResets || []).map((request) => ({
    id: request.id,
    status: request.status,
    createdAt: formatDateTime(request.createdAt),
    expiresAt: formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? formatDateTime(request.usedAt) : "-"
  }));
  const latestReset = resetRows[0];
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>User detail and role assignment</h2>
          <p>${escapeHtml(selected.fullName || selected.email)} - ${escapeHtml(selected.email || "No email")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-user-detail">Close</button>
      </div>
      ${state.selectedUserMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedUserMessage)}</strong></div>` : ""}
      ${state.selectedUserResetToken ? `<div class="notice compact"><strong>Development reset token</strong><span>${escapeHtml(state.selectedUserResetToken)} expires ${escapeHtml(formatDateTime(state.selectedUserResetExpiresAt))}</span></div>` : ""}
      ${state.selectedUserError ? `<div class="notice warning"><strong>User update failed.</strong><span>${escapeHtml(state.selectedUserError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("SACCO", platformUser ? "Platform Administration" : selected.tenantId)}
        ${mini("Status", selected.status)}
        ${mini("Phone", selected.phone)}
        ${mini("User ID", selected.id)}
        ${mini("Current roles", assignedRoles.length ? assignedRoles.map((role) => role.name).join(", ") : "Unassigned")}
        ${mini("MFA", selected.mfaEnabled ? "Enabled" : "Not enabled")}
        ${mini("Login reset required", selected.passwordResetRequired ? "Yes" : "No")}
        ${mini("Password reset", latestReset ? `${latestReset.status} until ${latestReset.expiresAt}` : "No pending reset")}
        ${mini("Active sessions", selected.activeSessionCount || 0)}
        ${mini("Access purpose", rolePurpose(primaryRole.name || selected.role || "", platformUser))}
        ${mini("Module scope", roleModuleScope(primaryRole.name || selected.role || "", platformUser))}
        ${mini("User type", platformUser ? "Platform administrator" : "SACCO staff")}
      </div>
      <form id="userProfileForm" class="form-grid">
        <input type="hidden" id="profileUserId" value="${escapeHtml(selected.id)}">
        <label><span>Full name</span><input id="profileUserFullName" value="${escapeHtml(selected.fullName || "")}" ${canManageUser ? "" : "disabled"} required></label>
        <label><span>Email / username</span><input id="profileUserEmail" type="email" value="${escapeHtml(selected.email || "")}" ${canManageUser ? "" : "disabled"} required></label>
        <label><span>Phone</span><input id="profileUserPhone" value="${escapeHtml(selected.phone || "")}" ${canManageUser ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManageUser ? `<button class="button primary" type="submit">Save user details</button>` : `<span class="status pending">Profile view only</span>`}
        </div>
      </form>
      <form id="userRoleForm" class="form-grid single">
        <input type="hidden" id="selectedUserId" value="${escapeHtml(selected.id)}">
        <div>
          <span class="field-label">${platformUser ? "Assigned platform roles" : "Assigned SACCO staff roles"}</span>
          <div class="role-checkbox-grid">
            ${roles.map((role) => `
              <label class="check-row">
                <input type="checkbox" name="selectedUserRoleIds" value="${escapeHtml(role.id)}" data-role-checkbox="selected" ${assignedRoleIds.includes(role.id) ? "checked" : ""} ${canManageUser ? "" : "disabled"}>
                <span>${escapeHtml(role.name)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="mini-fact">
          <span>Selected access</span>
          <strong id="selectedUserRolePreview">${escapeHtml(roleSummaryText(assignedRoleIds, platformUser))}</strong>
        </div>
        <div class="form-actions">
          ${canManageUser ? `<button class="button primary" type="submit">Save role</button>` : `<span class="status pending">Role view only</span>`}
        </div>
      </form>
      <div class="danger-zone">
        <div>
          <strong>Administrator status</strong>
          <span>${canManageUser ? "Suspend, reactivate or delete this login while preserving audit history." : "Only Platform Super Admin can manage platform administrator status."}</span>
        </div>
        <div class="table-actions">
          ${canManageUser ? `
            <button class="table-action" type="button" data-user-mfa="${selected.mfaEnabled ? "false" : "true"}" data-row-id="${escapeHtml(selected.id)}">${selected.mfaEnabled ? "Disable MFA" : "Enable MFA"}</button>
            <button class="table-action" type="button" data-user-password-reset="${escapeHtml(selected.id)}">Request password reset</button>
            ${selected.id !== state.user?.id ? `<button class="table-action" type="button" data-user-revoke-sessions="${escapeHtml(selected.id)}">Force logout sessions</button>` : ""}
            <button class="table-action" type="button" data-user-status="${nextStatus}" data-row-id="${escapeHtml(selected.id)}">${normal(selected.status) === "active" ? "Suspend user" : "Reactivate user"}</button>
            <button class="table-action danger" type="button" data-user-delete="${escapeHtml(selected.id)}">Delete user</button>
          ` : `<span class="status pending">Restricted</span>`}
        </div>
      </div>
      ${canManageUser ? recordTable("Active session detail", sessionRows, ["ipAddress", "device", "createdAt", "expiresAt"]) : ""}
      ${canManageUser ? recordTable("Password reset history", resetRows, ["status", "createdAt", "expiresAt", "usedAt"]) : ""}
    </section>
  `;
}

function roleCoveragePanel(users, roles, platformOnly) {
  const rows = roles.map((role) => {
    const assignedUsers = users.filter((user) => normal(user.role).includes(normal(role.name)) || user.roleId === role.id);
    return {
      roleName: role.name,
      scope: platformOnly ? "Platform administration" : "SACCO staff",
      assignedUsers: assignedUsers.length,
      accessPurpose: rolePurpose(role.name, platformOnly),
      moduleScope: roleModuleScope(role.name, platformOnly),
      status: role.status || "active"
    };
  });
  return recordTable(platformOnly ? "Platform role coverage" : "SACCO staff role coverage", rows, ["roleName", "scope", "assignedUsers", "accessPurpose", "moduleScope", "status"]);
}

function roleCoverage(users, roles) {
  if (!users.length) return "0%";
  const assigned = users.filter((user) => user.role || user.roleId || roles.some((role) => normal(user.role).includes(normal(role.name)))).length;
  return `${Math.round((assigned / users.length) * 100)}%`;
}

function rolePurpose(roleName, platformOnly) {
  const name = normal(roleName);
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

function roleModuleScope(roleName, platformOnly) {
  const name = normal(roleName);
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

function staffAccessRow(user, platformOnly) {
  const role = user.role || user.roleName || roleNameFromId(user.roleId, platformOnly) || "Unassigned";
  return {
    ...user,
    role,
    mfa: user.mfaEnabled ? "Enabled" : "Not enabled",
    activeSessions: user.activeSessionCount || 0,
    accessPurpose: rolePurpose(role, platformOnly),
    moduleScope: roleModuleScope(role, platformOnly),
    status: user.status || "active"
  };
}

function deviceLabel(userAgent) {
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

function roleNameFromId(roleId, platformOnly) {
  return userRoleOptions(platformOnly).find((role) => role.id === roleId)?.name || "";
}

function saccoStaffAccessGuide(roles) {
  const preferred = ["SACCO Chairperson", "SACCO Treasurer", "SACCO Secretary", "Loans Officer", "Accountant", "Teller", "Auditor"];
  const rows = preferred.map((name) => {
    const configured = roles.find((role) => normal(role.name) === normal(name) || normal(role.name).includes(normal(name.replace("SACCO ", ""))));
    return {
      roleName: configured?.name || name,
      accessPurpose: rolePurpose(configured?.name || name, false),
      moduleScope: roleModuleScope(configured?.name || name, false),
      configured: configured ? "Available" : "Template"
    };
  });
  return recordTable("SACCO staff role guide", rows, ["roleName", "accessPurpose", "moduleScope", "configured"]);
}

function permissionMatrix() {
  const modules = isPlatform() ? platformModules : saccoModules;
  return `<section class="panel"><h2>Permission matrix</h2><div class="permission-grid">${modules.slice(0, 10).map((item) => `<div><strong>${item[1]}</strong>${["View", "Create", "Edit", "Approve", "Export", "Manage"].map((action) => `<span>${action}</span>`).join("")}</div>`).join("")}</div></section>`;
}

function userRoleOptions(platformOnly) {
  const tenantId = platformOnly ? "tenant_platform" : state.user?.tenantId;
  const roles = dataRows("roles").filter((role) => role.tenantId === tenantId);
  const preferred = platformOnly ? [
    "Platform Super Admin",
    "Platform Operations Officer",
    "Platform Billing Officer",
    "Platform Compliance Officer",
    "Platform Support Officer"
  ] : [];
  const filtered = preferred.length ? roles.filter((role) => preferred.includes(role.name)) : roles;
  return filtered.length ? filtered : [{ id: platformOnly ? "role_platform_support_officer" : "", name: platformOnly ? "Platform Support Officer" : "Default staff role" }];
}

function rolePreviewText(roleId, platformOnly) {
  const role = userRoleOptions(platformOnly).find((item) => item.id === roleId) || {};
  const roleName = role.name || "Staff";
  return `${rolePurpose(roleName, platformOnly)} - ${roleModuleScope(roleName, platformOnly)}`;
}

function roleSummaryText(roleIds, platformOnly) {
  const roles = userRoleOptions(platformOnly).filter((role) => (roleIds || []).includes(role.id));
  if (!roles.length) return "Select at least one role.";
  return roles
    .map((role) => `${role.name}: ${rolePurpose(role.name, platformOnly)} / ${roleModuleScope(role.name, platformOnly)}`)
    .join(" | ");
}

function checkedRoleIds(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

