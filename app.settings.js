// SACCO and platform settings rendering and collection-mode actions extracted from app.js.

function settingsView() {
  if (isPlatform()) return platformSettingsView();
  const branches = dataRows("branches");
  const products = dataRows("financialProducts");
  const accounts = dataRows("financialAccounts");
  const activeBranches = branches.filter((branch) => normal(branch.status) === "active");
  const activeProducts = products.filter((product) => normal(product.status) === "active");
  const productTypes = ["savings", "shares", "welfare"];
  const missingProducts = productTypes.filter((type) => !products.some((product) => normal(product.productType) === type));
  const tab = state.saccoSettingsTab || "overview";
  const security = state.data.securitySummary || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("activeBranches"), activeBranches.length, "Service points ready for use", "Manage")}
      ${summary(t("activeProducts"), activeProducts.length, t("savingsSharesWelfare"), "Configure")}
      ${summary(t("productCoverage"), missingProducts.length ? `${productTypes.length - missingProducts.length}/${productTypes.length}` : "Complete", missingProducts.length ? `Missing ${missingProducts.map(labelize).join(", ")}` : "Core contribution types ready", t("review"))}
      ${summary(t("roles"), dataRows("roles").length, "Access profiles", t("review"))}
    </div>
    ${saccoSettingsTabs(tab)}
    ${tab === "overview" ? `
      ${paymentCollectionSettingsPanel(dataRows("tenants").find((item) => item.id === state.user?.tenantId) || {})}
      ${saccoSettingsControlPanel(branches, products, accounts, missingProducts)}
      ${settingsReadinessPanel(branches, products, accounts)}
    ` : ""}
    ${tab === "branches" ? branchSetupPanel() : ""}
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
  const inactiveBranches = branches.filter((branch) => normal(branch.status) !== "active").length;
  const inactiveProducts = products.filter((product) => normal(product.status) !== "active").length;
  return rolePriorityPanel(t("saccoSettingsControl"), [
    ["Branch readiness", `${branches.length} branch record(s), with ${inactiveBranches} inactive service point(s).`, inactiveBranches ? "Review" : "Ready"],
    ["Contribution setup", missingProducts.length ? `Missing ${missingProducts.map(labelize).join(", ")} product setup.` : "Savings, shares and welfare product coverage is configured.", missingProducts.length ? "Configure" : "Ready"],
    ["Ledger linkage", `${accounts.length} financial account(s) support product and reporting setup; ${inactiveProducts} product(s) are inactive.`, accounts.length ? "Linked" : "Setup"]
  ]);
}

function settingsReadinessPanel(branches, products, accounts) {
  const activeBranches = branches.filter((branch) => normal(branch.status) === "active").length;
  const savingsProducts = products.filter((product) => normal(product.productType) === "savings").length;
  const sharesProducts = products.filter((product) => normal(product.productType) === "shares").length;
  const welfareProducts = products.filter((product) => normal(product.productType) === "welfare").length;
  const inactiveProducts = products.filter((product) => normal(product.status) !== "active").length;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO operating settings</h2>
          <p>Controls used by member onboarding, transactions, product accounts and branch reporting.</p>
        </div>
        <span class="status ${activeBranches && savingsProducts && sharesProducts && welfareProducts ? "active" : "pending"}">${activeBranches && savingsProducts && sharesProducts && welfareProducts ? "Ready" : "Setup needed"}</span>
      </div>
      <div class="source-grid">
        ${mini("Active branches", activeBranches)}
        ${mini("Savings products", savingsProducts)}
        ${mini("Share products", sharesProducts)}
        ${mini("Welfare products", welfareProducts)}
        ${mini("Open accounts", accounts.length)}
        ${mini("Inactive products", inactiveProducts)}
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
        <label><span>Product type</span><select data-product-field="productType" ${canManage ? "" : "disabled"}><option value="savings">Savings</option><option value="shares">Shares</option><option value="welfare">Welfare</option></select></label>
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
  const rows = providers.map((provider) => {
    const live = statusRows.find((row) => normal(row.channel) === normal(provider.channel));
    const missing = (provider.settings || []).filter((setting) => !setting.configured).map((setting) => setting.key).join(", ") || "None";
    return {
      channel: provider.channel,
      provider: provider.provider,
      activeProvider: provider.activeProvider,
      active: provider.active ? "Active" : "Not active",
      liveStatus: live ? labelize(live.status) : "Not checked",
      balance: live?.balance ? `${live.balance} SMS credits` : "-",
      missingSettings: missing
    };
  });
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
        ${mini("SMS provider", providers.find((row) => normal(row.channel) === "sms")?.activeProvider || "Not configured")}
        ${mini("Email provider", providers.find((row) => normal(row.channel) === "email")?.activeProvider || "Not configured")}
        ${mini("Last status check", state.notificationProviderStatusCheckedAt ? formatDateTime(state.notificationProviderStatusCheckedAt) : "Not checked")}
        ${mini("Live risks", notificationProviderRiskRows().length)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Notification provider setup", rows, ["channel", "provider", "activeProvider", "active", "liveStatus", "balance", "missingSettings"])}
      ${recordTable("Required notification environment variables", providers.flatMap((provider) => (provider.settings || []).map((setting) => ({
        channel: provider.channel,
        key: setting.key,
        configured: setting.configured ? "Yes" : "Missing",
        secret: setting.secret ? "Secret" : "Visible",
        value: setting.secret ? (setting.configured ? "Configured" : "Missing") : setting.value
      }))), ["channel", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformMobileMoneyIntegrationPanel() {
  const config = state.data.mobileMoneyIntegrationConfig || {};
  const providers = Array.isArray(config.providers) ? config.providers : [];
  const callbacks = dataRows("mobileMoneyCallbacks");
  const requests = dataRows("mobileMoneyPaymentRequests");
  const rows = providers.map((provider) => {
    const missing = (provider.settings || []).filter((setting) => !setting.configured).map((setting) => setting.key).join(", ") || "None";
    return {
      channel: provider.channel,
      provider: provider.provider,
      activeProvider: provider.activeProvider,
      active: provider.active ? "Active" : "Not active",
      missingSettings: missing
    };
  });
  const callbackSecret = providers
    .flatMap((provider) => provider.settings || [])
    .find((setting) => setting.key === "SACCO_MOBILE_MONEY_CALLBACK_SECRET");
  const signedCallbacks = providers
    .flatMap((provider) => provider.settings || [])
    .find((setting) => setting.key === "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile money integrations</h2>
          <p>Super Admin readiness for MTN MoMo and Airtel Money. M-Pesa is intentionally excluded.</p>
        </div>
        <span class="status ${providers.some((provider) => provider.active) ? "active" : "pending"}">${providers.some((provider) => provider.active) ? "Provider selected" : "Setup needed"}</span>
      </div>
      ${config.updatePolicy ? `<p class="helper-text">${escapeHtml(config.updatePolicy)}</p>` : ""}
      <div class="source-grid">
        ${mini("Active provider", providers.find((provider) => provider.active)?.provider || "Not configured")}
        ${mini("Signed callbacks", signedCallbacks?.value === "true" ? "Required" : "Not required")}
        ${mini("Callback secret", callbackSecret?.configured ? "Configured" : "Missing")}
        ${mini("Payment requests", requests.length)}
        ${mini("Provider callbacks", callbacks.length)}
        ${mini("Failed callbacks", callbacks.filter((row) => normal(row.status).includes("failed")).length)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Mobile-money provider setup", rows, ["channel", "provider", "activeProvider", "active", "missingSettings"])}
      ${recordTable("Required mobile-money environment variables", providers.flatMap((provider) => (provider.settings || []).map((setting) => ({
        provider: provider.provider,
        key: setting.key,
        configured: setting.configured ? "Yes" : "Missing",
        secret: setting.secret ? "Secret" : "Visible",
        value: setting.secret ? (setting.configured ? "Configured" : "Missing") : setting.value
      }))), ["provider", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformSettingsControlPanel(packages, roles, permissions, templates, canManage) {
  const inactivePackages = packages.filter((item) => normal(item.status) !== "active").length;
  const inactiveTemplates = templates.filter((item) => normal(item.status) !== "active").length;
  return rolePriorityPanel(t("platformSettingsControl"), [
    ["Billing readiness", `${packages.length} subscription package(s), with ${inactivePackages} inactive plan(s).`, inactivePackages ? "Review" : "Ready"],
    ["Administrator roles", `${roles.length} platform role(s) mapped to ${permissions.length} permission control(s).`, roles.length && permissions.length ? "Ready" : "Configure"],
    ["Protected changes", canManage ? "Current role can update protected platform configuration with audit trail." : "Current role is view-only for protected platform configuration.", canManage ? "Allowed" : "Restricted"],
    ["Global messages", `${templates.length} global template(s), with ${inactiveTemplates} inactive template(s).`, inactiveTemplates ? "Review" : "Ready"]
  ]);
}

function staffSecuritySettingsPanel(security, platformScope) {
  const sessions = Array.isArray(security.activeSessions) ? security.activeSessions : [];
  const resets = Array.isArray(security.recentPasswordResets) ? security.recentPasswordResets : [];
  const policy = state.data.platformSecurityPolicy || defaultPlatformSecurityPolicy();
  const currentExpiry = security.currentSessionExpiresAt || state.sessionExpiresAt;
  const activeCount = security.activeSessionCount ?? sessions.length;
  const resetCount = security.passwordResetRequestCount ?? resets.length;
  const sessionRows = sessions.map((session) => ({
    id: session.id,
    createdAt: formatDateTime(session.createdAt),
    expiresAt: formatDateTime(session.expiresAt),
    status: new Date(session.expiresAt).getTime() > Date.now() ? "active" : "expired"
  }));
  const resetRows = resets.map((request) => ({
    id: request.id,
    status: request.status,
    createdAt: formatDateTime(request.createdAt),
    expiresAt: formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? formatDateTime(request.usedAt) : "-"
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Active sessions", activeCount, "Current administrator login devices", "Review")}
      ${summary("MFA status", security.mfaEnabled ? "Enabled" : "Not enabled", "Step-up verification for sensitive login", "Manage")}
      ${summary("Password resets", resetCount, "Requests recorded for this administrator", "Audit")}
      ${summary("Session expiry", currentExpiry ? formatDateTime(currentExpiry) : "Not reported", "Current token lifetime", "Extend")}
    </div>
    ${rolePriorityPanel(platformScope ? "Platform security settings" : "SACCO security settings", [
      ["Active sessions", `${activeCount} active staff session(s) are server-side and expire automatically.`, activeCount ? "Monitor" : "None"],
      ["MFA posture", security.mfaEnabled ? "MFA is enabled for this administrator account." : "MFA is not yet enabled for this administrator account.", security.mfaEnabled ? "Ready" : "Improve"],
      ["Password reset evidence", `${resetCount} password reset request(s) are available in the audit trail for this account.`, resetCount ? "Trace" : "No resets"],
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
        ${mini("Current expiry", currentExpiry ? formatDateTime(currentExpiry) : "Not reported")}
        ${mini("Active sessions", activeCount)}
        ${mini("Password resets", resetCount)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Active administrator sessions", sessionRows, ["id", "createdAt", "expiresAt", "status"])}
      ${recordTable("Password reset history", resetRows, ["id", "status", "createdAt", "expiresAt", "usedAt"])}
    </div>
    ${platformScope ? platformPasswordPolicyPanel(policy) : ""}
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
  const accounts = dataRows("saccoPaymentAccounts");
  const row = (a) => `
    <div class="collection-account-row">
      <div>
        <strong>${escapeHtml(a.channel === "bank" ? (a.bankName || "Bank") : (a.network || "Mobile money").toUpperCase())}</strong>
        <span>${escapeHtml(a.accountName || "")} / ${escapeHtml(a.accountNumber || "")}${a.branch ? " / " + escapeHtml(a.branch) : ""}</span>
        <small>${escapeHtml(labelize(a.channel || ""))}${a.active ? "" : " / inactive"}${a.instructions ? " / " + escapeHtml(a.instructions) : ""}</small>
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

