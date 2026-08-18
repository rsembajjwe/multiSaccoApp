// SACCO and platform settings rendering and collection-mode actions extracted from app.js.

function settingsView() {
  if (isPlatform()) return platformSettingsView();
  const branches = dataRows("branches");
  const products = dataRows("financialProducts");
  const accounts = dataRows("financialAccounts");
  const model = buildSaccoSettingsModel({ accounts, branches, labelize, products });
  const tab = state.saccoSettingsTab || "overview";
  const security = state.data.securitySummary || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("activeBranches"), model.activeBranches, "Service points ready for use", "Manage")}
      ${summary(t("activeProducts"), model.activeProducts, t("savingsSharesWelfare"), "Configure")}
      ${summary(t("productCoverage"), model.productCoverage, model.productCoverageDetail, t("review"))}
      ${summary(t("roles"), dataRows("roles").length, "Access profiles", t("review"))}
    </div>
    ${saccoSettingsTabs(tab)}
    ${tab === "overview" ? `
      ${paymentCollectionSettingsPanel(dataRows("tenants").find((item) => item.id === state.user?.tenantId) || {})}
      ${saccoSettingsControlPanel(branches, products, accounts, model.missingProducts)}
      ${settingsReadinessPanel(model.readiness)}
    ` : ""}
    ${tab === "branches" ? branchSetupPanel() : ""}
    ${tab === "funds" ? fundTypesSetupPanel() : ""}
    ${tab === "products" ? financialProductSetupPanel() : ""}
    ${tab === "records" ? `
      ${recordTable("Branch setup", branches.map((branch) => ({ ...branch, manager: userName(branch.managerUserId) })), ["code", "name", "manager", "address", "status", "createdAt"])}
      ${recordTable("Financial product setup", products, ["productType", "code", "name", "contributionAmount", "minimumBalance", "interestRate", "status"])}
    ` : ""}
    ${tab === "security" ? staffSecuritySettingsPanel(security, false) : ""}
  `;
}

function saccoSettingsTabs(activeTab) {
  const tabs = [
    ["overview", t("settingsOverview")],
    ["branches", t("branchSetup")],
    ["funds", "Fund sources"],
    ["products", t("productSetup")],
    ["records", t("setupRecords")],
    ["security", t("security")]
  ];
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-sacco-settings-tab="${id}">${label}</button>`).join("")}
    </div>
  `;
}

function saccoSettingsControlPanel(branches, products, accounts, missingProducts) {
  return compactControlPanel(t("saccoSettingsControl"), "Confirm branches, contribution products and collection accounts before members transact.", buildSaccoSettingsControlRows({ accounts, branches, labelize, missingProducts, products }));
}

function settingsReadinessPanel(readiness) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO operating settings</h2>
          <p>Controls used by member onboarding, transactions, product accounts and branch reporting.</p>
        </div>
        <span class="status ${readiness.ready ? "active" : "pending"}">${readiness.ready ? "Ready" : "Setup needed"}</span>
      </div>
      <div class="source-grid">
        ${mini("Active branches", readiness.activeBranches)}
        ${mini("Savings products", readiness.savingsProducts)}
        ${mini("Share products", readiness.sharesProducts)}
        ${mini("Welfare products", readiness.welfareProducts)}
        ${mini("Open accounts", readiness.openAccounts)}
        ${mini("Inactive products", readiness.inactiveProducts)}
      </div>
    </section>
  `;
}

function branchSetupPanel() {
  const canManage = hasPermission("roles:create") || roleKind() === "admin";
  const tenantId = state.user?.tenantId || state.currentTenantId || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Branch setup</h2>
          <p>Create service points used by member registration, transactions and reports.</p>
        </div>
      </div>
      ${state.branchFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.branchFormMessage)}</strong></div>` : ""}
      ${state.branchFormError ? `<div class="notice warning"><strong>Branch setup failed.</strong><span>${escapeHtml(state.branchFormError)}</span></div>` : ""}
      <form class="form-grid" id="branchSetupForm">
        <input type="hidden" id="newBranchTenantId" value="${escapeHtml(tenantId)}">
        <label><span>Branch code</span><input id="newBranchCode" placeholder="HQ" required ${canManage ? "" : "disabled"}></label>
        <label><span>Branch name</span><input id="newBranchName" placeholder="Main branch" required ${canManage ? "" : "disabled"}></label>
        <label><span>Address</span><input id="newBranchAddress" placeholder="Town, district or street" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="newBranchStatus" ${canManage ? "" : "disabled"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <div class="form-actions"><button class="button primary" type="submit" ${canManage ? "" : "disabled"}>Create branch</button></div>
      </form>
    </section>
  `;
}

function fundTypeOptions() {
  const rows = dataRows("fundTypes").filter((fund) => fund.active !== false);
  const list = rows.length ? rows : [{ code: "savings", name: "Savings" }, { code: "shares", name: "Shares" }, { code: "welfare", name: "Welfare" }];
  return list.map((fund) => `<option value="${escapeHtml(fund.code)}">${escapeHtml(fund.name || labelize(fund.code))}</option>`).join("");
}

function fundTypesSetupPanel() {
  const canManage = hasPermission("fund-types:manage");
  const funds = dataRows("fundTypes").slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const editing = state.selectedFundTypeId ? funds.find((fund) => fund.id === state.selectedFundTypeId) : null;
  const value = editing || {};
  const basisOptions = ["savings", "shares", "welfare"]
    .map((basis) => `<option value="${basis}" ${value.basis === basis ? "selected" : ""}>${escapeHtml(labelize(basis))}</option>`)
    .join("");
  const rowItem = (fund) => `
    <div class="collection-account-row">
      <div>
        <strong>${escapeHtml(fund.name || labelize(fund.code))}</strong>
        <span>Code: ${escapeHtml(fund.code)} / behaves like ${escapeHtml(labelize(fund.basis || ""))}${fund.system ? " / built-in" : ""}${fund.active === false ? " / inactive" : ""}</span>
        ${fund.description ? `<small>${escapeHtml(fund.description)}</small>` : ""}
      </div>
      ${canManage ? `<button class="button ghost" type="button" data-edit-fund-type="${escapeHtml(fund.id)}">Edit</button>` : ""}
    </div>`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Fund sources</h2>
          <p>Savings, Shares and Welfare are built in. Add custom funds (Burial, Education, ...) — each behaves like a base fund and gives members a separate balance.</p>
        </div>
        ${editing ? `<button class="button ghost" type="button" data-cancel-fund-type="1">Cancel edit</button>` : ""}
      </div>
      ${state.fundTypeMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fundTypeMessage)}</strong></div>` : ""}
      ${state.fundTypeError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.fundTypeError)}</span></div>` : ""}
      <div class="collection-account-list">
        ${funds.length ? funds.map(rowItem).join("") : `<div class="notice compact"><span>No fund types yet.</span></div>`}
      </div>
      ${canManage ? `
      <form id="fundTypeForm" class="form-grid">
        <label><span>Fund name</span><input id="ftName" value="${escapeHtml(value.name || "")}" placeholder="e.g. Burial Fund"></label>
        <label><span>Code</span><input id="ftCode" value="${escapeHtml(value.code || "")}" placeholder="burial" ${editing ? "disabled" : ""}></label>
        <label><span>Behaves like</span><select id="ftBasis" ${editing && editing.system ? "disabled" : ""}>${basisOptions}</select></label>
        <label><span>Active</span><select id="ftActive"><option value="true" ${value.active === false ? "" : "selected"}>Active</option><option value="false" ${value.active === false ? "selected" : ""}>Inactive</option></select></label>
        <label class="wide"><span>Description (optional)</span><input id="ftDescription" value="${escapeHtml(value.description || "")}" placeholder="Purpose of this fund"></label>
        <div class="form-actions inline">
          <button class="button primary" type="button" data-save-fund-type="${escapeHtml(editing ? editing.id : "")}">${editing ? "Update fund" : "Add fund"}</button>
        </div>
      </form>` : `<div class="notice compact"><span>You have review-only access to fund sources.</span></div>`}
    </section>
  `;
}

function financialProductSetupPanel() {
  const canManage = hasPermission("transactions:create") || roleKind() === "admin";
  const tenantId = state.user?.tenantId || state.currentTenantId || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Contribution product setup</h2>
          <p>Configure the savings, shares and welfare products members can use.</p>
        </div>
      </div>
      ${state.productFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.productFormMessage)}</strong></div>` : ""}
      ${state.productFormError ? `<div class="notice warning"><strong>Product setup failed.</strong><span>${escapeHtml(state.productFormError)}</span></div>` : ""}
      <form class="form-grid" data-product-form>
        <input type="hidden" data-product-field="tenantId" value="${escapeHtml(tenantId)}">
        <label><span>Fund / product type</span><select data-product-field="productType" ${canManage ? "" : "disabled"}>${fundTypeOptions()}</select></label>
        <label><span>Product code</span><input data-product-field="code" placeholder="SAV-MONTHLY" required ${canManage ? "" : "disabled"}></label>
        <label><span>Product name</span><input data-product-field="name" placeholder="Monthly savings" required ${canManage ? "" : "disabled"}></label>
        <label><span>Contribution amount</span><input data-product-field="contributionAmount" type="number" min="0" value="5000" required ${canManage ? "" : "disabled"}></label>
        <label><span>Minimum balance</span><input data-product-field="minimumBalance" type="number" min="0" value="0" required ${canManage ? "" : "disabled"}></label>
        <label><span>Interest rate</span><input data-product-field="interestRate" type="number" min="0" step="0.1" value="0" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions"><button class="button primary" type="submit" ${canManage ? "" : "disabled"}>Create product</button></div>
      </form>
    </section>
  `;
}

function platformSettingsView() {
  const packages = dataRows("subscriptionPackages");
  const roles = dataRows("roles").filter((role) => role.tenantId === "tenant_platform");
  const permissions = dataRows("permissions");
  const templates = dataRows("notificationTemplates").filter((template) => !template.tenantId);
  const canManage = hasPermission("roles:create") || roleKind() === "super";
  const settingsTabs = [["configuration", t("configuration")], ["integrations", "Integrations"], ["security", t("security")]];
  const tab = activeModuleTab("settings", settingsTabs);
  const security = state.data.securitySummary || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("subscriptionPackages"), packages.length, "Platform billing plans", t("review"))}
      ${summary(t("platformRoles"), roles.length, "Administrator access profiles", "Manage")}
      ${summary(t("permissionControls"), permissions.length, "Route and action permissions", "Audit")}
      ${summary(t("globalTemplates"), templates.length, "Default notification content", "Edit")}
    </div>
    ${moduleTabs("settings", settingsTabs, tab)}
    ${tab === "configuration" ? `
      ${platformSettingsControlPanel(packages, roles, permissions, templates, canManage)}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("protectedPlatformConfiguration")}</h2>
          <p>System-level settings are restricted to Platform Super Admin users and should be changed with audit review.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin controls</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("App name", "Tereka Online")}
        ${mini("Default platform code", "PLATFORM")}
        ${mini("Production demo access", "Disabled outside dev/demo")}
        ${mini("SACCO code login", "Required")}
        ${mini("SACCO isolation", "Role and token enforced")}
        ${mini("Audit coverage", `${dataRows("auditEvents").length} events`)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Platform subscription packages", packages, ["name", "code", "price", "amount", "maxMembers", "maxBranches", "status"])}
      ${recordTable("Platform role catalogue", roles, ["name", "description", "status", "createdAt"])}
    </div>
    <div class="grid two">
      ${recordTable("Platform permission catalogue", permissions, ["id", "name", "description", "module"])}
      ${recordTable("Global notification templates", templates, ["eventType", "channel", "title", "status", "updatedAt"])}
    </div>
    ` : ""}
    ${tab === "integrations" ? `${platformNotificationIntegrationPanel(canManage)}${platformMobileMoneyIntegrationPanel()}` : ""}
    ${tab === "security" ? staffSecuritySettingsPanel(security, true) : ""}
  `;
}

function platformNotificationIntegrationPanel(canManage) {
  const config = state.data.notificationIntegrationConfig || {};
  const providers = Array.isArray(config.providers) ? config.providers : [];
  const statusRows = state.notificationProviderStatus || [];
  const rows = buildNotificationProviderRows({ providers, statusRows, labelize });
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Notification integrations</h2>
          <p>Super Admin visibility for AfroSMS and Gmail SMTP setup. Secrets stay in the server environment.</p>
        </div>
        <div class="table-actions">
          <button class="button secondary" type="button" data-action="check-notification-provider-status" ${canManage ? "" : "disabled"}>Check provider status</button>
        </div>
      </div>
      ${config.updatePolicy ? `<p class="helper-text">${escapeHtml(config.updatePolicy)}</p>` : ""}
      <div class="source-grid">
        ${mini("SMS provider", notificationProviderNameFor(config, "sms"))}
        ${mini("Email provider", notificationProviderNameFor(config, "email"))}
        ${mini("Last status check", state.notificationProviderStatusCheckedAt ? formatDateTime(state.notificationProviderStatusCheckedAt) : "Not checked")}
        ${mini("Live risks", notificationProviderRiskRows().length)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Notification provider setup", rows, ["channel", "provider", "activeProvider", "active", "liveStatus", "balance", "missingSettings"])}
      ${recordTable("Required notification environment variables", buildProviderEnvironmentRows(providers, "channel"), ["channel", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformMobileMoneyIntegrationPanel() {
  const config = state.data.mobileMoneyIntegrationConfig || {};
  const providers = Array.isArray(config.providers) ? config.providers : [];
  const callbacks = dataRows("mobileMoneyCallbacks");
  const requests = dataRows("mobileMoneyPaymentRequests");
  const rows = buildMobileMoneyProviderRows(providers);
  const integration = buildMobileMoneyIntegrationSummary({ callbacks, providers, requests });
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile money integrations</h2>
          <p>Super Admin readiness for MTN MoMo and Airtel Money. M-Pesa is intentionally excluded.</p>
        </div>
        <span class="status ${integration.providerSelected ? "active" : "pending"}">${integration.providerSelected ? "Provider selected" : "Setup needed"}</span>
      </div>
      ${config.updatePolicy ? `<p class="helper-text">${escapeHtml(config.updatePolicy)}</p>` : ""}
      <div class="source-grid">
        ${mini("Active provider", integration.activeProvider)}
        ${mini("Signed callbacks", integration.signedCallbacks)}
        ${mini("Callback secret", integration.callbackSecret)}
        ${mini("Payment requests", integration.paymentRequests)}
        ${mini("Provider callbacks", integration.providerCallbacks)}
        ${mini("Failed callbacks", integration.failedCallbacks)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Mobile-money provider setup", rows, ["channel", "provider", "activeProvider", "active", "missingSettings"])}
      ${recordTable("Required mobile-money environment variables", buildProviderEnvironmentRows(providers, "provider"), ["provider", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformSettingsControlPanel(packages, roles, permissions, templates, canManage) {
  return compactControlPanel(t("platformSettingsControl"), "Manage protected platform configuration for packages, roles, permissions and global templates.", buildPlatformSettingsControlRows({ canManage, packages, permissions, roles, templates }));
}

function staffSecuritySettingsPanel(security, platformScope) {
  const policy = state.data.platformSecurityPolicy || defaultPlatformSecurityPolicy();
  const model = buildStaffSecuritySettingsModel({ currentSessionExpiresAt: state.sessionExpiresAt, formatDateTime, security });
  return `
    <div class="dashboard-grid">
      ${summary("Active sessions", model.activeCount, "Current administrator login devices", "Review")}
      ${summary("MFA status", security.mfaEnabled ? "Enabled" : "Not enabled", "Step-up verification for sensitive login", "Manage")}
      ${summary("Password resets", model.resetCount, "Requests recorded for this administrator", "Audit")}
      ${summary("Session expiry", model.currentExpiry ? formatDateTime(model.currentExpiry) : "Not reported", "Current token lifetime", "Extend")}
    </div>
    ${compactControlPanel(platformScope ? "Platform security settings" : "SACCO security settings", "Review administrator sessions, MFA, password resets and lockout policy evidence.", [
      ["Active sessions", `${model.activeCount} active staff session(s) are server-side and expire automatically.`, model.activeCount ? "Monitor" : "None"],
      ["MFA posture", security.mfaEnabled ? "MFA is enabled for this administrator account." : "MFA is not yet enabled for this administrator account.", security.mfaEnabled ? "Ready" : "Improve"],
      ["Password reset evidence", `${model.resetCount} password reset request(s) are available in the audit trail for this account.`, model.resetCount ? "Trace" : "No resets"],
      ["Session lifecycle audit", "Login, logout and session extension events are recorded under access control audit evidence.", "Audited"]
    ])}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Security Settings</h2>
          <p>Administrator session, MFA and password-reset evidence for the current login.</p>
        </div>
        <div class="table-actions">
          <button class="button secondary" type="button" data-action="toggle-current-mfa" data-mfa-enabled="${security.mfaEnabled ? "false" : "true"}">${security.mfaEnabled ? "Disable MFA" : "Enable MFA"}</button>
          <button class="button secondary" type="button" data-action="extend-session">Extend session</button>
        </div>
      </div>
      <div class="source-grid">
        ${mini("Signed in as", state.user?.email || state.user?.fullName || "Administrator")}
        ${mini("Role", state.roleNames.join(", ") || "Assigned role")}
        ${mini("MFA", security.mfaEnabled ? "Enabled" : "Not enabled")}
        ${mini("Current expiry", model.currentExpiry ? formatDateTime(model.currentExpiry) : "Not reported")}
        ${mini("Active sessions", model.activeCount)}
        ${mini("Password resets", model.resetCount)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Active administrator sessions", model.sessionRows, ["id", "createdAt", "expiresAt", "status"])}
      ${recordTable("Password reset history", model.resetRows, ["id", "status", "createdAt", "expiresAt", "usedAt"])}
    </div>
    ${platformScope ? platformPasswordPolicyPanel(policy) : ""}
  `;
}

function compactControlPanel(title, copy, rows) {
  const needsReview = rows.some((row) => ["review", "configure", "setup needed", "improve", "incomplete"].includes(normal(row[2])));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(copy)}</p>
        </div>
        <span class="status ${needsReview ? "pending" : "active"}">${needsReview ? "Review" : "Ready"}</span>
      </div>
      <div class="mini-grid">
        ${rows.map(([label, detail, status]) => mini(label, `${detail} ${status ? `(${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}

function platformPasswordPolicyPanel(policy) {
  const canManage = hasPermission("roles:create") || roleKind() === "super";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Password and lockout policy</h2>
          <p>Controls staff password strength, reset validation and failed-login lockout thresholds.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin editable</span>` : `<span class="status pending">View only</span>`}
      </div>
      ${state.platformPolicyMessage ? `<div class="notice compact"><strong>${escapeHtml(state.platformPolicyMessage)}</strong></div>` : ""}
      ${state.platformPolicyError ? `<div class="notice warning"><strong>Policy update failed.</strong><span>${escapeHtml(state.platformPolicyError)}</span></div>` : ""}
      <form id="platformSecurityPolicyForm" class="form-grid">
        <label><span>Minimum password length</span><input id="policyMinimumPasswordLength" type="number" min="8" max="64" value="${escapeHtml(policy.minimumPasswordLength ?? 10)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Password expiry days</span><input id="policyPasswordExpiryDays" type="number" min="0" max="365" value="${escapeHtml(policy.passwordExpiryDays ?? 90)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Failed attempts before lockout</span><input id="policyLockoutFailedAttempts" type="number" min="3" max="20" value="${escapeHtml(policy.lockoutFailedAttempts ?? 5)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Lockout minutes</span><input id="policyLockoutMinutes" type="number" min="1" max="1440" value="${escapeHtml(policy.lockoutMinutes ?? 15)}" ${canManage ? "" : "disabled"}></label>
        <label class="check-row"><input id="policyRequireUppercase" type="checkbox" ${policy.requireUppercase ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require uppercase letter</span></label>
        <label class="check-row"><input id="policyRequireLowercase" type="checkbox" ${policy.requireLowercase ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require lowercase letter</span></label>
        <label class="check-row"><input id="policyRequireNumber" type="checkbox" ${policy.requireNumber ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require number</span></label>
        <label class="check-row"><input id="policyRequireSymbol" type="checkbox" ${policy.requireSymbol ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require symbol</span></label>
        <div class="mini-fact wide">
          <span>Last updated</span>
          <strong>${policy.updatedAt ? formatDateTime(policy.updatedAt) : "Not recorded"}</strong>
        </div>
        <div class="form-actions wide">
          ${canManage ? `<button class="button primary" type="submit">Save security policy</button>` : `<span class="status pending">Only Platform Super Admin can save policy changes</span>`}
        </div>
      </form>
    </section>
  `;
}

function defaultPlatformSecurityPolicy() {
  return {
    minimumPasswordLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: false,
    passwordExpiryDays: 90,
    lockoutFailedAttempts: 5,
    lockoutMinutes: 15,
    updatedAt: ""
  };
}



const COLLECTION_MODE_LABELS = {
  NONE: "Not allowed (NONE)",
  MOBILE_MONEY_ONLY: "Mobile money only",
  BANK_ONLY: "Bank only",
  BOTH: "Mobile money and bank"
};

function platformCollectionModePanel(tenant) {
  const mode = tenant.allowedCollectionMode || "NONE";
  return `
    <div class="collection-mode-setup">
      <h3>Allowed payment collection methods</h3>
      ${state.collectionModeMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionModeMessage)}</strong></div>` : ""}
      ${state.collectionModeError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.collectionModeError)}</span></div>` : ""}
      <form id="collectionModeForm" class="form-grid single">
        <label>
          <span>Methods this SACCO may collect through Tereka</span>
          <select id="allowedCollectionMode">
            ${Object.entries(COLLECTION_MODE_LABELS).map(([value, label]) => `<option value="${value}" ${mode === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <p class="hint">The SACCO can only switch on methods allowed here.</p>
        <div class="form-actions inline"><button class="button primary" type="button" data-save-collection-mode="${escapeHtml(tenant.id || "")}">Save allowed methods</button></div>
      </form>
    </div>
  `;
}

async function saveCollectionMode(tenantId) {
  const select = document.getElementById("allowedCollectionMode");
  if (!select || !tenantId) return;
  state.collectionModeMessage = "";
  state.collectionModeError = "";
  try {
    await api(`/tenants/${encodeURIComponent(tenantId)}/collection-mode`, {
      method: "PATCH",
      body: JSON.stringify({ allowedCollectionMode: select.value })
    });
    await refreshAll();
    state.collectionModeMessage = "Allowed payment collection methods updated.";
  } catch (error) {
    state.collectionModeError = error.message || "Unable to update allowed collection methods.";
  }
  renderShell();
}

function paymentCollectionSettingsPanel(tenant) {
  const mode = tenant.allowedCollectionMode || "NONE";
  const allowsMM = mode === "MOBILE_MONEY_ONLY" || mode === "BOTH";
  const allowsBank = mode === "BANK_ONLY" || mode === "BOTH";
  const modeLabel = COLLECTION_MODE_LABELS[mode] || mode;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Payment collection</h2>
          <p>Choose which allowed methods your SACCO switches on. The platform controls what is allowed.</p>
        </div>
        <span class="status ${mode === "NONE" ? "pending" : "active"}">${escapeHtml(modeLabel)}</span>
      </div>
      ${state.collectionSettingsMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionSettingsMessage)}</strong></div>` : ""}
      ${state.collectionSettingsError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.collectionSettingsError)}</span></div>` : ""}
      <div class="notice compact"><span>Allowed by platform: <strong>${escapeHtml(modeLabel)}</strong> (read-only)</span></div>
      <div class="collection-methods">
        <label class="collection-method${allowsMM ? "" : " disabled"}">
          <input type="checkbox" data-collection-toggle="mobileMoney" ${tenant.mobileMoneyCollectionActive ? "checked" : ""} ${allowsMM ? "" : "disabled"}>
          <span><b>Mobile money</b><small>${allowsMM ? "Let members pay by MTN / Airtel." : "Not allowed by the platform."}</small></span>
        </label>
        <label class="collection-method${allowsBank ? "" : " disabled"}">
          <input type="checkbox" data-collection-toggle="bank" ${tenant.bankCollectionActive ? "checked" : ""} ${allowsBank ? "" : "disabled"}>
          <span><b>Bank collection</b><small>${allowsBank ? "Record bank-led collections." : "Not allowed by the platform."}</small></span>
        </label>
      </div>
      <div class="form-actions inline"><button class="button primary" type="button" data-save-collection-settings="${escapeHtml(tenant.id || state.user?.tenantId || "")}">Save collection settings</button></div>
      ${saccoCollectionAccountsPanel(allowsMM, allowsBank)}
    </section>
  `;
}

function saccoCollectionAccountsPanel(allowsMM, allowsBank) {
  const accounts = buildCollectionAccountDisplayRows(dataRows("saccoPaymentAccounts"), labelize);
  const row = (a) => `
    <div class="collection-account-row">
      <div>
        <strong>${escapeHtml(a.title)}</strong>
        <span>${escapeHtml(a.detail)}</span>
        <small>${escapeHtml(a.channelLabel)}${a.active ? "" : " / inactive"}${a.instructions ? " / " + escapeHtml(a.instructions) : ""}</small>
      </div>
      <button class="button ghost" type="button" data-remove-collection-account="${escapeHtml(a.id)}">Remove</button>
    </div>`;
  return `
    <div class="collection-accounts-setup">
      <h3>Your collection accounts</h3>
      <p class="hint">Add the SACCO's own mobile-money numbers and bank accounts. Members pay into these directly; you record and reconcile the deposits.</p>
      ${state.collectionAccountMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionAccountMessage)}</strong></div>` : ""}
      ${state.collectionAccountError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.collectionAccountError)}</span></div>` : ""}
      <div class="collection-account-list">
        ${accounts.length ? accounts.map(row).join("") : `<div class="notice compact"><span>No collection accounts yet.</span></div>`}
      </div>
      <form id="collectionAccountForm" class="form-grid">
        <label><span>Type</span>
          <select id="caChannel">
            ${allowsMM ? `<option value="mobile_money">Mobile money</option>` : ""}
            ${allowsBank ? `<option value="bank">Bank account</option>` : ""}
          </select>
        </label>
        <label><span>Network (mobile money)</span>
          <select id="caNetwork"><option value="mtn">MTN</option><option value="airtel">Airtel</option></select>
        </label>
        <label><span>Account name</span><input id="caAccountName" placeholder="SACCO account holder name"></label>
        <label><span>Number</span><input id="caAccountNumber" placeholder="MoMo number / merchant code, or bank account no."></label>
        <label><span>Bank name (bank only)</span><input id="caBankName" placeholder="e.g. Stanbic"></label>
        <label><span>Branch (bank only)</span><input id="caBranch" placeholder="Branch"></label>
        <label class="wide"><span>Instructions (optional)</span><input id="caInstructions" placeholder="e.g. Use your membership number as the reference"></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-add-collection-account="1">Add account</button></div>
      </form>
    </div>
  `;
}

async function saveCollectionSettings(tenantId) {
  if (!tenantId) return;
  const mm = document.querySelector('[data-collection-toggle="mobileMoney"]');
  const bank = document.querySelector('[data-collection-toggle="bank"]');
  state.collectionSettingsMessage = "";
  state.collectionSettingsError = "";
  try {
    await api(`/tenants/${encodeURIComponent(tenantId)}/collection-settings`, {
      method: "PATCH",
      body: JSON.stringify({ mobileMoneyActive: !!(mm && mm.checked), bankActive: !!(bank && bank.checked) })
    });
    await refreshAll();
    state.collectionSettingsMessage = "Payment collection settings saved.";
  } catch (error) {
    state.collectionSettingsError = error.code === "COLLECTION_METHOD_NOT_ALLOWED"
      ? (error.message || "That method is not allowed for this SACCO.")
      : (error.message || "Unable to save collection settings.");
  }
  renderShell();
}

async function saveCollectionAccount() {
  const channel = document.getElementById("caChannel")?.value || "";
  const payload = {
    channel,
    network: channel === "mobile_money" ? (document.getElementById("caNetwork")?.value || "") : null,
    accountName: (document.getElementById("caAccountName")?.value || "").trim(),
    accountNumber: (document.getElementById("caAccountNumber")?.value || "").trim(),
    bankName: (document.getElementById("caBankName")?.value || "").trim(),
    branch: (document.getElementById("caBranch")?.value || "").trim(),
    instructions: (document.getElementById("caInstructions")?.value || "").trim()
  };
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  if (!channel) { state.collectionAccountError = "Select an account type."; renderShell(); return; }
  if (!payload.accountName || !payload.accountNumber) { state.collectionAccountError = "Account name and number are required."; renderShell(); return; }
  try {
    await api("/sacco-payment-accounts", { method: "POST", body: JSON.stringify(payload) });
    await refreshAll();
    state.collectionAccountMessage = "Collection account added.";
  } catch (error) {
    state.collectionAccountError = error.code === "COLLECTION_METHOD_NOT_ALLOWED"
      ? (error.message || "That channel is not allowed for this SACCO.")
      : (error.message || "Unable to add the collection account.");
  }
  renderShell();
}

async function removeCollectionAccount(accountId) {
  if (!accountId) return;
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  try {
    await api(`/sacco-payment-accounts/${encodeURIComponent(accountId)}`, { method: "DELETE" });
    await refreshAll();
    state.collectionAccountMessage = "Collection account removed.";
  } catch (error) {
    state.collectionAccountError = error.message || "Unable to remove the collection account.";
  }
  renderShell();
}

