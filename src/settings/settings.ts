import type {
  TerekaBranch,
  TerekaCollectionAccount,
  TerekaFinancialAccount,
  TerekaFinancialProduct,
  TerekaIntegrationConfig,
  TerekaPasswordResetRecord,
  TerekaProviderConfig,
  TerekaRecord,
  TerekaSecuritySummary,
  TerekaSecuritySession,
} from "../types/domain";

const CORE_PRODUCT_TYPES = ["savings", "shares", "welfare"] as const;

export interface TerekaSaccoSettingsModel {
  activeBranches: number;
  activeProducts: number;
  missingProducts: string[];
  productCoverage: string;
  productCoverageDetail: string;
  readiness: TerekaSaccoSettingsReadiness;
}

export interface TerekaSaccoSettingsReadiness {
  activeBranches: number;
  savingsProducts: number;
  sharesProducts: number;
  welfareProducts: number;
  openAccounts: number;
  inactiveProducts: number;
  ready: boolean;
}

export type TerekaSettingsControlRow = [string, string, string];

export interface TerekaProviderSetupRow {
  active: string;
  activeProvider?: string;
  balance?: string;
  channel?: string;
  liveStatus?: string;
  missingSettings: string;
  provider?: string;
}

export interface TerekaProviderEnvironmentRow {
  channel?: string;
  configured: string;
  key?: string;
  provider?: string;
  secret: string;
  value?: string;
}

export interface TerekaMobileMoneyIntegrationSummary {
  activeProvider: string;
  callbackSecret: string;
  failedCallbacks: number;
  paymentRequests: number;
  providerCallbacks: number;
  providerSelected: boolean;
  signedCallbacks: string;
}

export interface TerekaStaffSecurityModel {
  activeCount: number;
  currentExpiry?: string;
  resetCount: number;
  resetRows: TerekaPasswordResetRow[];
  sessionRows: TerekaSecuritySessionRow[];
}

export interface TerekaSecuritySessionRow {
  createdAt: string;
  expiresAt: string;
  id?: string;
  status: string;
}

export interface TerekaPasswordResetRow {
  createdAt: string;
  expiresAt: string;
  id?: string;
  status?: string;
  usedAt: string;
}

export interface TerekaCollectionAccountDisplayRow {
  active: boolean;
  channelLabel: string;
  detail: string;
  id?: string;
  instructions?: string;
  title: string;
}

export function buildSaccoSettingsModel(input: {
  accounts: Array<TerekaFinancialAccount & TerekaRecord>;
  branches: Array<TerekaBranch & TerekaRecord>;
  labelize: (value: unknown) => string;
  products: Array<TerekaFinancialProduct & TerekaRecord>;
}): TerekaSaccoSettingsModel {
  const activeBranches = input.branches.filter((branch) => normalizeSettingsText(branch.status) === "active").length;
  const activeProducts = input.products.filter((product) => normalizeSettingsText(product.status) === "active").length;
  const missingProducts = CORE_PRODUCT_TYPES.filter((type) => !input.products.some((product) => normalizeSettingsText(product.productType) === type));
  const productCoverage = missingProducts.length ? `${CORE_PRODUCT_TYPES.length - missingProducts.length}/${CORE_PRODUCT_TYPES.length}` : "Complete";
  return {
    activeBranches,
    activeProducts,
    missingProducts,
    productCoverage,
    productCoverageDetail: missingProducts.length ? `Missing ${missingProducts.map(input.labelize).join(", ")}` : "Core contribution types ready",
    readiness: buildSaccoSettingsReadiness(input.branches, input.products, input.accounts),
  };
}

export function buildSaccoSettingsControlRows(input: {
  accounts: Array<TerekaFinancialAccount & TerekaRecord>;
  branches: Array<TerekaBranch & TerekaRecord>;
  labelize: (value: unknown) => string;
  missingProducts: string[];
  products: Array<TerekaFinancialProduct & TerekaRecord>;
}): TerekaSettingsControlRow[] {
  const inactiveBranches = input.branches.filter((branch) => normalizeSettingsText(branch.status) !== "active").length;
  const inactiveProducts = input.products.filter((product) => normalizeSettingsText(product.status) !== "active").length;
  return [
    ["Branch readiness", `${input.branches.length} branch record(s), with ${inactiveBranches} inactive service point(s).`, inactiveBranches ? "Review" : "Ready"],
    [
      "Contribution setup",
      input.missingProducts.length
        ? `Missing ${input.missingProducts.map(input.labelize).join(", ")} product setup.`
        : "Savings, shares and welfare product coverage is configured.",
      input.missingProducts.length ? "Configure" : "Ready",
    ],
    ["Ledger linkage", `${input.accounts.length} financial account(s) support product and reporting setup; ${inactiveProducts} product(s) are inactive.`, input.accounts.length ? "Linked" : "Setup"],
  ];
}

export function buildSaccoSettingsReadiness(
  branches: Array<TerekaBranch & TerekaRecord>,
  products: Array<TerekaFinancialProduct & TerekaRecord>,
  accounts: Array<TerekaFinancialAccount & TerekaRecord>,
): TerekaSaccoSettingsReadiness {
  const activeBranches = branches.filter((branch) => normalizeSettingsText(branch.status) === "active").length;
  const savingsProducts = products.filter((product) => normalizeSettingsText(product.productType) === "savings").length;
  const sharesProducts = products.filter((product) => normalizeSettingsText(product.productType) === "shares").length;
  const welfareProducts = products.filter((product) => normalizeSettingsText(product.productType) === "welfare").length;
  return {
    activeBranches,
    savingsProducts,
    sharesProducts,
    welfareProducts,
    openAccounts: accounts.length,
    inactiveProducts: products.filter((product) => normalizeSettingsText(product.status) !== "active").length,
    ready: Boolean(activeBranches && savingsProducts && sharesProducts && welfareProducts),
  };
}

export function buildPlatformSettingsControlRows(input: {
  canManage: boolean;
  packages: Array<TerekaRecord>;
  permissions: Array<TerekaRecord>;
  roles: Array<TerekaRecord>;
  templates: Array<TerekaRecord>;
}): TerekaSettingsControlRow[] {
  const inactivePackages = input.packages.filter((item) => normalizeSettingsText(item.status) !== "active").length;
  const inactiveTemplates = input.templates.filter((item) => normalizeSettingsText(item.status) !== "active").length;
  return [
    ["Billing readiness", `${input.packages.length} subscription package(s), with ${inactivePackages} inactive plan(s).`, inactivePackages ? "Review" : "Ready"],
    ["Administrator roles", `${input.roles.length} platform role(s) mapped to ${input.permissions.length} permission control(s).`, input.roles.length && input.permissions.length ? "Ready" : "Configure"],
    [
      "Protected changes",
      input.canManage
        ? "Current role can update protected platform configuration with audit trail."
        : "Current role is view-only for protected platform configuration.",
      input.canManage ? "Allowed" : "Restricted",
    ],
    ["Global messages", `${input.templates.length} global template(s), with ${inactiveTemplates} inactive template(s).`, inactiveTemplates ? "Review" : "Ready"],
  ];
}

export function buildNotificationProviderRows(input: {
  providers: Array<TerekaProviderConfig & TerekaRecord>;
  statusRows: Array<TerekaRecord>;
  labelize: (value: unknown) => string;
}): TerekaProviderSetupRow[] {
  return input.providers.map((provider) => {
    const live = input.statusRows.find((row) => normalizeSettingsText(row.channel) === normalizeSettingsText(provider.channel));
    return {
      channel: provider.channel,
      provider: provider.provider,
      activeProvider: provider.activeProvider,
      active: provider.active ? "Active" : "Not active",
      liveStatus: live ? input.labelize(live.status) : "Not checked",
      balance: live?.balance ? `${live.balance} SMS credits` : "-",
      missingSettings: missingSettingKeys(provider),
    };
  });
}

export function buildMobileMoneyProviderRows(providers: Array<TerekaProviderConfig & TerekaRecord>): TerekaProviderSetupRow[] {
  return providers.map((provider) => ({
    channel: provider.channel,
    provider: provider.provider,
    activeProvider: provider.activeProvider,
    active: provider.active ? "Active" : "Not active",
    missingSettings: missingSettingKeys(provider),
  }));
}

export function buildProviderEnvironmentRows(
  providers: Array<TerekaProviderConfig & TerekaRecord>,
  providerColumn: "channel" | "provider",
): TerekaProviderEnvironmentRow[] {
  return providers.flatMap((provider) => (provider.settings || []).map((setting) => {
    const value = setting.secret ? (setting.configured ? "Configured" : "Missing") : setting.value;
    const row: TerekaProviderEnvironmentRow = {
      configured: setting.configured ? "Yes" : "Missing",
      key: setting.key,
      secret: setting.secret ? "Secret" : "Visible",
      value,
    };
    if (providerColumn === "channel") row.channel = provider.channel;
    if (providerColumn === "provider") row.provider = provider.provider;
    return row;
  }));
}

export function buildMobileMoneyIntegrationSummary(input: {
  callbacks: Array<TerekaRecord>;
  providers: Array<TerekaProviderConfig & TerekaRecord>;
  requests: Array<TerekaRecord>;
}): TerekaMobileMoneyIntegrationSummary {
  const allSettings = input.providers.flatMap((provider) => provider.settings || []);
  const callbackSecret = allSettings.find((setting) => setting.key === "SACCO_MOBILE_MONEY_CALLBACK_SECRET");
  const signedCallbacks = allSettings.find((setting) => setting.key === "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS");
  const activeProvider = input.providers.find((provider) => provider.active)?.provider || "Not configured";
  return {
    activeProvider,
    callbackSecret: callbackSecret?.configured ? "Configured" : "Missing",
    failedCallbacks: input.callbacks.filter((row) => normalizeSettingsText(row.status).includes("failed")).length,
    paymentRequests: input.requests.length,
    providerCallbacks: input.callbacks.length,
    providerSelected: input.providers.some((provider) => provider.active),
    signedCallbacks: signedCallbacks?.value === "true" ? "Required" : "Not required",
  };
}

export function notificationProviderNameFor(config: TerekaIntegrationConfig | null | undefined, channel: string): string {
  const providers = Array.isArray(config?.providers) ? config.providers : [];
  return providers.find((provider) => normalizeSettingsText(provider.channel) === normalizeSettingsText(channel))?.activeProvider || "Not configured";
}

export function buildStaffSecuritySettingsModel(input: {
  currentSessionExpiresAt?: string;
  formatDateTime: (value: unknown) => string;
  security: TerekaSecuritySummary | null | undefined;
}): TerekaStaffSecurityModel {
  const sessions = Array.isArray(input.security?.activeSessions) ? input.security.activeSessions : [];
  const resets = Array.isArray(input.security?.recentPasswordResets) ? input.security.recentPasswordResets : [];
  const currentExpiry = input.security?.currentSessionExpiresAt || input.currentSessionExpiresAt;
  return {
    activeCount: input.security?.activeSessionCount ?? sessions.length,
    currentExpiry,
    resetCount: input.security?.passwordResetRequestCount ?? resets.length,
    sessionRows: sessions.map((session) => buildSecuritySessionRow(session, input.formatDateTime)),
    resetRows: resets.map((request) => buildPasswordResetRow(request, input.formatDateTime)),
  };
}

export function buildCollectionAccountDisplayRows(accounts: Array<TerekaCollectionAccount & TerekaRecord>, labelize: (value: unknown) => string): TerekaCollectionAccountDisplayRow[] {
  return accounts.map((account) => ({
    active: Boolean(account.active),
    channelLabel: labelize(account.channel || ""),
    detail: `${account.accountName || ""} / ${account.accountNumber || ""}${account.branch ? ` / ${account.branch}` : ""}`,
    id: account.id,
    instructions: account.instructions,
    title: account.channel === "bank" ? (account.bankName || "Bank") : String(account.network || "Mobile money").toUpperCase(),
  }));
}

function buildSecuritySessionRow(session: TerekaSecuritySession, formatDateTime: (value: unknown) => string): TerekaSecuritySessionRow {
  return {
    id: session.id,
    createdAt: formatDateTime(session.createdAt),
    expiresAt: formatDateTime(session.expiresAt),
    status: new Date(String(session.expiresAt || "")).getTime() > Date.now() ? "active" : "expired",
  };
}

function buildPasswordResetRow(request: TerekaPasswordResetRecord, formatDateTime: (value: unknown) => string): TerekaPasswordResetRow {
  return {
    id: request.id,
    status: request.status,
    createdAt: formatDateTime(request.createdAt),
    expiresAt: formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? formatDateTime(request.usedAt) : "-",
  };
}

function missingSettingKeys(provider: TerekaProviderConfig & TerekaRecord): string {
  return (provider.settings || [])
    .filter((setting) => !setting.configured)
    .map((setting) => setting.key)
    .filter(Boolean)
    .join(", ") || "None";
}

function normalizeSettingsText(value: unknown): string {
  return String(value || "").toLowerCase();
}
