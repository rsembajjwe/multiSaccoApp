function usersView() {
  const platformOnly = isPlatform();
  const users = filterAccessUsersForScope(dataRows("users"), platformOnly, state.user?.tenantId);
  const canCreate = hasPermission("users:create") || hasPermission("roles:create");
  const roles = userRoleOptions(platformOnly);
  const rows = buildAccessUserRows({ platformOnly, roles, users });
  const accessSummary = buildAccessSummary(users, roles);
  const listPanel = recordTable(platformOnly ? "Platform administrator list" : "SACCO staff access list", rows, ["fullName", "email", "phone", "role", "mfa", "activeSessions", "accessPurpose", "moduleScope", "lastLogin", "status"]);
  const detailPanel = userDetailPanel(users, canCreate) || emptyState("User detail and role assignment", "Select Manage access from the administrator list to review roles and module access.");
  if (platformOnly) {
    return `
      <div class="dashboard-grid">
        ${summary(t("platformUsers"), accessSummary.totalUsers, "Administrators only", t("review"))}
        ${summary(t("activeUsers"), accessSummary.activeUsers, "Can sign in", "Monitor")}
        ${summary(t("configuredRoles"), accessSummary.configuredRoles, "Available assignments", "Manage")}
        ${summary(t("roleCoverage"), accessSummary.roleCoverage, "Users with assigned roles", "Audit")}
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
      ${summary("SACCO staff users", accessSummary.totalUsers, "Staff accounts only, not members", "Review")}
      ${summary("Active users", accessSummary.activeUsers, "Can sign in", "Monitor")}
      ${summary("Configured roles", accessSummary.configuredRoles, "Available assignments", "Manage")}
      ${summary("Role coverage", accessSummary.roleCoverage, "Users with assigned roles", "Audit")}
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

function platformUserTabContent({ activeTab, canCreate, addPanel, detailPanel, coveragePanel, listPanel, permissionPanel }) {
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
  const platformUser = selected.tenantId === "tenant_platform";
  const canManageUser = canManageRoles && (!platformUser || roleKind() === "super");
  const nextStatus = normal(selected.status) === "active" ? "suspended" : "active";
  const roleModel = buildUserDetailRoleModel({
    platformOnly: platformUser,
    roleIds: state.selectedUserRoles || [],
    roles,
    user: selected
  });
  const sessionRows = buildUserSessionRows({
    canManageUser,
    currentUserId: state.user?.id,
    deviceLabel,
    formatDateTime,
    sessions: state.selectedUserSessions || [],
    userId: selected.id
  });
  const resetRows = buildPasswordResetRows({
    formatDateTime,
    resets: state.selectedUserPasswordResets || []
  });
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
        ${mini("Current roles", roleModel.assignedRoleNamesText)}
        ${mini("MFA", selected.mfaEnabled ? "Enabled" : "Not enabled")}
        ${mini("Login reset required", selected.passwordResetRequired ? "Yes" : "No")}
        ${mini("Password reset", latestReset ? `${latestReset.status} until ${latestReset.expiresAt}` : "No pending reset")}
        ${mini("Active sessions", selected.activeSessionCount || 0)}
        ${mini("Access purpose", rolePurpose(roleModel.primaryRole.name || selected.role || "", platformUser))}
        ${mini("Module scope", roleModuleScope(roleModel.primaryRole.name || selected.role || "", platformUser))}
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
                <input type="checkbox" name="selectedUserRoleIds" value="${escapeHtml(role.id)}" data-role-checkbox="selected" ${roleModel.assignedRoleIds.includes(role.id) ? "checked" : ""} ${canManageUser ? "" : "disabled"}>
                <span>${escapeHtml(role.name)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="mini-fact">
          <span>Selected access</span>
          <strong id="selectedUserRolePreview">${escapeHtml(roleModel.roleSummaryText)}</strong>
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
  const rows = buildRoleCoverageRows({ platformOnly, roles, users });
  return recordTable(platformOnly ? "Platform role coverage" : "SACCO staff role coverage", rows, ["roleName", "scope", "assignedUsers", "accessPurpose", "moduleScope", "status"]);
}

function roleCoverage(users, roles) {
  return roleCoverageFor(users, roles);
}

function rolePurpose(roleName, platformOnly) {
  return rolePurposeFor(roleName, platformOnly);
}

function roleModuleScope(roleName, platformOnly) {
  return roleModuleScopeFor(roleName, platformOnly);
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
  const rows = buildSaccoStaffGuideRows(roles);
  return recordTable("SACCO staff role guide", rows, ["roleName", "accessPurpose", "moduleScope", "configured"]);
}

function permissionMatrix() {
  const modules = isPlatform() ? platformModules : saccoModules;
  const rows = buildPermissionMatrixRows(modules, dataRows("permissions"));
  return `<section class="panel"><h2>Permission matrix</h2><div class="permission-grid">${rows.map((item) => `<div><strong>${escapeHtml(item.moduleName)}</strong>${item.actions.map((action) => `<span>${escapeHtml(action)}</span>`).join("")}</div>`).join("")}</div></section>`;
}

function userRoleOptions(platformOnly) {
  return filterRolesForScope(dataRows("roles"), platformOnly, state.user?.tenantId);
}

function rolePreviewText(roleId, platformOnly) {
  const role = userRoleOptions(platformOnly).find((item) => item.id === roleId) || {};
  const roleName = role.name || "Staff";
  return `${rolePurpose(roleName, platformOnly)} - ${roleModuleScope(roleName, platformOnly)}`;
}

function roleSummaryText(roleIds, platformOnly) {
  return roleSummaryTextFor(roleIds || [], userRoleOptions(platformOnly), platformOnly);
}

function checkedRoleIds(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

