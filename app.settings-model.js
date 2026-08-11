function buildSaccoSettingsModel(input) {
  const productTypes = ["savings", "shares", "welfare"];
  const activeBranches = input.branches.filter((branch) => normalizeSettingsModelText(branch.status) === "active").length;
  const activeProducts = input.products.filter((product) => normalizeSettingsModelText(product.status) === "active").length;
  const missingProducts = productTypes.filter((type) => !input.products.some((product) => normalizeSettingsModelText(product.productType) === type));
  const productCoverage = missingProducts.length ? `${productTypes.length - missingProducts.length}/${productTypes.length}` : "Complete";
  return {
    activeBranches,
    activeProducts,
    missingProducts,
    productCoverage,
    productCoverageDetail: missingProducts.length ? `Missing ${missingProducts.map(input.labelize).join(", ")}` : "Core contribution types ready",
    readiness: buildSaccoSettingsReadiness(input.branches, input.products, input.accounts)
  };
}

function buildSaccoSettingsControlRows(input) {
  const inactiveBranches = input.branches.filter((branch) => normalizeSettingsModelText(branch.status) !== "active").length;
  const inactiveProducts = input.products.filter((product) => normalizeSettingsModelText(product.status) !== "active").length;
  return [
    ["Branch readiness", `${input.branches.length} branch record(s), with ${inactiveBranches} inactive service point(s).`, inactiveBranches ? "Review" : "Ready"],
    ["Contribution setup", input.missingProducts.length ? `Missing ${input.missingProducts.map(input.labelize).join(", ")} product setup.` : "Savings, shares and welfare product coverage is configured.", input.missingProducts.length ? "Configure" : "Ready"],
    ["Ledger linkage", `${input.accounts.length} financial account(s) support product and reporting setup; ${inactiveProducts} product(s) are inactive.`, input.accounts.length ? "Linked" : "Setup"]
  ];
}

function buildSaccoSettingsReadiness(branches, products, accounts) {
  const activeBranches = branches.filter((branch) => normalizeSettingsModelText(branch.status) === "active").length;
  const savingsProducts = products.filter((product) => normalizeSettingsModelText(product.productType) === "savings").length;
  const sharesProducts = products.filter((product) => normalizeSettingsModelText(product.productType) === "shares").length;
  const welfareProducts = products.filter((product) => normalizeSettingsModelText(product.productType) === "welfare").length;
  return {
    activeBranches,
    savingsProducts,
    sharesProducts,
    welfareProducts,
    openAccounts: accounts.length,
    inactiveProducts: products.filter((product) => normalizeSettingsModelText(product.status) !== "active").length,
    ready: Boolean(activeBranches && savingsProducts && sharesProducts && welfareProducts)
  };
}

function buildPlatformSettingsControlRows(input) {
  const inactivePackages = input.packages.filter((item) => normalizeSettingsModelText(item.status) !== "active").length;
  const inactiveTemplates = input.templates.filter((item) => normalizeSettingsModelText(item.status) !== "active").length;
  return [
    ["Billing readiness", `${input.packages.length} subscription package(s), with ${inactivePackages} inactive plan(s).`, inactivePackages ? "Review" : "Ready"],
    ["Administrator roles", `${input.roles.length} platform role(s) mapped to ${input.permissions.length} permission control(s).`, input.roles.length && input.permissions.length ? "Ready" : "Configure"],
    ["Protected changes", input.canManage ? "Current role can update protected platform configuration with audit trail." : "Current role is view-only for protected platform configuration.", input.canManage ? "Allowed" : "Restricted"],
    ["Global messages", `${input.templates.length} global template(s), with ${inactiveTemplates} inactive template(s).`, inactiveTemplates ? "Review" : "Ready"]
  ];
}

function buildNotificationProviderRows(input) {
  return input.providers.map((provider) => {
    const live = input.statusRows.find((row) => normalizeSettingsModelText(row.channel) === normalizeSettingsModelText(provider.channel));
    return {
      channel: provider.channel,
      provider: provider.provider,
      activeProvider: provider.activeProvider,
      active: provider.active ? "Active" : "Not active",
      liveStatus: live ? input.labelize(live.status) : "Not checked",
      balance: live?.balance ? `${live.balance} SMS credits` : "-",
      missingSettings: missingSettingsModelKeys(provider)
    };
  });
}

function buildMobileMoneyProviderRows(providers) {
  return providers.map((provider) => ({
    channel: provider.channel,
    provider: provider.provider,
    activeProvider: provider.activeProvider,
    active: provider.active ? "Active" : "Not active",
    missingSettings: missingSettingsModelKeys(provider)
  }));
}

function buildProviderEnvironmentRows(providers, providerColumn) {
  return providers.flatMap((provider) => (provider.settings || []).map((setting) => {
    const row = {
      configured: setting.configured ? "Yes" : "Missing",
      key: setting.key,
      secret: setting.secret ? "Secret" : "Visible",
      value: setting.secret ? (setting.configured ? "Configured" : "Missing") : setting.value
    };
    if (providerColumn === "channel") row.channel = provider.channel;
    if (providerColumn === "provider") row.provider = provider.provider;
    return row;
  }));
}

function buildMobileMoneyIntegrationSummary(input) {
  const allSettings = input.providers.flatMap((provider) => provider.settings || []);
  const callbackSecret = allSettings.find((setting) => setting.key === "SACCO_MOBILE_MONEY_CALLBACK_SECRET");
  const signedCallbacks = allSettings.find((setting) => setting.key === "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS");
  return {
    activeProvider: input.providers.find((provider) => provider.active)?.provider || "Not configured",
    callbackSecret: callbackSecret?.configured ? "Configured" : "Missing",
    failedCallbacks: input.callbacks.filter((row) => normalizeSettingsModelText(row.status).includes("failed")).length,
    paymentRequests: input.requests.length,
    providerCallbacks: input.callbacks.length,
    providerSelected: input.providers.some((provider) => provider.active),
    signedCallbacks: signedCallbacks?.value === "true" ? "Required" : "Not required"
  };
}

function notificationProviderNameFor(config, channel) {
  const providers = Array.isArray(config?.providers) ? config.providers : [];
  return providers.find((provider) => normalizeSettingsModelText(provider.channel) === normalizeSettingsModelText(channel))?.activeProvider || "Not configured";
}

function buildStaffSecuritySettingsModel(input) {
  const sessions = Array.isArray(input.security?.activeSessions) ? input.security.activeSessions : [];
  const resets = Array.isArray(input.security?.recentPasswordResets) ? input.security.recentPasswordResets : [];
  return {
    activeCount: input.security?.activeSessionCount ?? sessions.length,
    currentExpiry: input.security?.currentSessionExpiresAt || input.currentSessionExpiresAt,
    resetCount: input.security?.passwordResetRequestCount ?? resets.length,
    sessionRows: sessions.map((session) => ({
      id: session.id,
      createdAt: input.formatDateTime(session.createdAt),
      expiresAt: input.formatDateTime(session.expiresAt),
      status: new Date(String(session.expiresAt || "")).getTime() > Date.now() ? "active" : "expired"
    })),
    resetRows: resets.map((request) => ({
      id: request.id,
      status: request.status,
      createdAt: input.formatDateTime(request.createdAt),
      expiresAt: input.formatDateTime(request.expiresAt),
      usedAt: request.usedAt ? input.formatDateTime(request.usedAt) : "-"
    }))
  };
}

function buildCollectionAccountDisplayRows(accounts, labelize) {
  return accounts.map((account) => ({
    active: Boolean(account.active),
    channelLabel: labelize(account.channel || ""),
    detail: `${account.accountName || ""} / ${account.accountNumber || ""}${account.branch ? ` / ${account.branch}` : ""}`,
    id: account.id,
    instructions: account.instructions,
    title: account.channel === "bank" ? (account.bankName || "Bank") : String(account.network || "Mobile money").toUpperCase()
  }));
}

function missingSettingsModelKeys(provider) {
  return (provider.settings || [])
    .filter((setting) => !setting.configured)
    .map((setting) => setting.key)
    .filter(Boolean)
    .join(", ") || "None";
}

function normalizeSettingsModelText(value) {
  return String(value || "").toLowerCase();
}
