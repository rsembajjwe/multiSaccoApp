// Shared configuration, data helpers and formatting utilities for Tereka Online.
// Loaded before feature modules; functions intentionally remain global for classic script compatibility.

const MEMBER_DRAFTS_KEY = "tereka-member-offline-drafts-v1";
const LOCALE_KEY = "tereka-locale";
const THEME_KEY = "tereka-theme";
const DEMO_TOOLS_REQUESTED = new URLSearchParams(window.location.search).has("demo");
const uiContractAliases = [
  "Complaint service control",
  "Member complaint intake",
  "Complaint review",
  "Save complaint status",
  "Member complaint submission"
];

const DEFAULT_REGION = Object.freeze({
  locale: "en-UG",
  currency: "UGX",
  currencyDigits: 0,
  direction: "ltr"
});

const COUNTRY_REGIONS = Object.freeze({
  uganda: DEFAULT_REGION,
  kenya: { locale: "en-KE", currency: "KES", currencyDigits: 0, direction: "ltr" },
  tanzania: { locale: "sw-TZ", currency: "TZS", currencyDigits: 0, direction: "ltr" },
  rwanda: { locale: "rw-RW", currency: "RWF", currencyDigits: 0, direction: "ltr" },
  nigeria: { locale: "en-NG", currency: "NGN", currencyDigits: 2, direction: "ltr" },
  ghana: { locale: "en-GH", currency: "GHS", currencyDigits: 2, direction: "ltr" },
  "south africa": { locale: "en-ZA", currency: "ZAR", currencyDigits: 2, direction: "ltr" },
  ethiopia: { locale: "am-ET", currency: "ETB", currencyDigits: 2, direction: "ltr" },
  mozambique: { locale: "pt-MZ", currency: "MZN", currencyDigits: 2, direction: "ltr" },
  angola: { locale: "pt-AO", currency: "AOA", currencyDigits: 2, direction: "ltr" },
  senegal: { locale: "fr-SN", currency: "XOF", currencyDigits: 0, direction: "ltr" },
  "cote d'ivoire": { locale: "fr-CI", currency: "XOF", currencyDigits: 0, direction: "ltr" },
  "ivory coast": { locale: "fr-CI", currency: "XOF", currencyDigits: 0, direction: "ltr" },
  cameroon: { locale: "fr-CM", currency: "XAF", currencyDigits: 0, direction: "ltr" },
  egypt: { locale: "ar-EG", currency: "EGP", currencyDigits: 2, direction: "rtl" },
  sudan: { locale: "ar-SD", currency: "SDG", currencyDigits: 2, direction: "rtl" },
  morocco: { locale: "ar-MA", currency: "MAD", currencyDigits: 2, direction: "rtl" }
});

const localeMetadata = Object.freeze({
  "en-UG": { label: "English", direction: "ltr", fallback: "en-UG" },
  "lg-UG": { label: "Luganda", direction: "ltr", fallback: "en-UG" },
  "fr-FR": { label: "Francais", direction: "ltr", fallback: "fr-FR" },
  "sw-TZ": { label: "Kiswahili", direction: "ltr", fallback: "en-UG" },
  "pt-MZ": { label: "Portugues", direction: "ltr", fallback: "en-UG" },
  "ar-EG": { label: "Arabic", direction: "rtl", fallback: "en-UG" },
  "am-ET": { label: "Amharic", direction: "ltr", fallback: "en-UG" }
});

const money = {
  format(value) {
    return TerekaFormatters.formatMoneyValue(value, currentRegion());
  }
};

const supportedLocales = [
  { code: "en-UG", label: localeMetadata["en-UG"].label },
  { code: "lg-UG", label: localeMetadata["lg-UG"].label },
  { code: "fr-FR", label: localeMetadata["fr-FR"].label },
  { code: "sw-TZ", label: localeMetadata["sw-TZ"].label },
  { code: "pt-MZ", label: localeMetadata["pt-MZ"].label },
  { code: "ar-EG", label: localeMetadata["ar-EG"].label },
  { code: "am-ET", label: localeMetadata["am-ET"].label }
];

const serverTableSearchTimers = {};
let platformQuickSearchTimer = 0;
let platformQuickSearchSequence = 0;

function preferredTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.style.colorScheme = selectedTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selectedTheme === "dark" ? "#0b1512" : "#0f4638");
}

function themeToggleButton() {
  const dark = state.theme === "dark";
  const label = dark ? "Use light theme" : "Use dark theme";
  const icon = dark
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>'
    : '<path d="M20.4 15.3A8.5 8.5 0 0 1 8.7 3.6 8.5 8.5 0 1 0 20.4 15.3Z"/>';
  return `<button class="icon-button theme-toggle" type="button" data-action="toggle-theme" title="${label}" aria-label="${label}" aria-pressed="${dark}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg></button>`;
}

function emptyData() {
  return {
    tenants: [],
    subscriptions: [],
    subscriptionPayments: [],
    subscriptionPackages: [],
    members: [],
    memberFundBalances: [],
    transactions: [],
    loans: [],
    operations: null,
    notifications: [],
    complaints: [],
    users: [],
    branches: [],
    financialProducts: [],
    financialAccounts: [],
    welfareClaims: [],
    accountingPeriods: [],
    chartOfAccounts: [],
    journalEntries: [],
    suppliers: [],
    expenses: [],
    assets: [],
    saccoProfile: null,
    saccoPaymentAccounts: [],
    platformPaymentAccounts: [],
    governanceMeetings: [],
    statementLines: [],
    reconciliation: null,
    mobileMoneyCallbacks: [],
    notificationTemplates: [],
    providerJobRuns: [],
    roles: [],
    permissions: [],
    auditEvents: [],
    regulatoryReport: null,
    securitySummary: null,
    platformSecurityPolicy: null,
    notificationIntegrationConfig: null,
    mobileMoneyIntegrationConfig: null,
    fleetApprovalQueue: [],
    fleetApprovalSummary: null,
    platformPaymentApprovalQueue: [],
    platformPaymentApprovalProcessed: [],
    platformPaymentApprovalSummary: null
  };
}

function emptyMemberData() {
  return {
    balances: null,
    dashboard: null,
    loans: [],
    notifications: [],
    pendingGuarantors: [],
    complaints: [],
    chatThreads: [],
    collectionAccounts: [],
    privacyRequests: [],
    notificationPreferences: {},
    membership: null,
    drafts: [],
    sessionExpiresAt: ""
  };
}

function dataRows(key) {
  const value = state.data[key];
  return Array.isArray(value) ? value : [];
}

function tenantRows() {
  return dataRows("tenants")
    .filter((tenant) => tenant.id !== "tenant_platform")
    .map((tenant) => ({ ...tenant, saccoCode: tenant.abbreviation || tenant.code || tenant.id }));
}

function pendingTenants() {
  return tenantRows().filter((tenant) => normal(tenant.status).includes("pending") || normal(tenant.status).includes("review"));
}

function subscriptionForTenant(tenantId) {
  return dataRows("subscriptions").find((subscription) => subscription.tenantId === tenantId);
}

function tenantAccountHealth(tenant, subscription) {
  const status = normal(tenant.status);
  const subscriptionStatus = normal(subscription?.status);
  if (status.includes("suspended") || status.includes("terminated")) return "Access blocked";
  if (!subscription) return "Billing setup needed";
  if (subscriptionStatus.includes("expired") || subscriptionStatus.includes("pending")) return "Billing risk";
  if (status === "active" && subscriptionStatus === "active") return "Operational";
  if (status.includes("pending") || status.includes("approved")) return "Activation pending";
  return "Review";
}

function platformUsers() {
  return dataRows("users").filter((user) => user.tenantId === "tenant_platform");
}

function openComplaints() {
  return dataRows("complaints").filter((complaint) => !["closed", "resolved", "cancelled"].includes(normal(complaint.status)));
}

function saccoSupportTickets() {
  return dataRows("complaints").filter((complaint) => !complaint.memberId && complaint.tenantId && complaint.tenantId !== "tenant_platform");
}

function openSaccoSupportTickets() {
  return saccoSupportTickets().filter((complaint) => !["closed", "resolved", "cancelled"].includes(normal(complaint.status)));
}

function pendingTransactions() {
  return dataRows("transactions").filter((transaction) => normal(transaction.status).includes("pending") || normal(transaction.stage).includes("approval"));
}

function memberName(memberId) {
  const member = dataRows("members").find((item) => item.id === memberId);
  return member ? `${member.membershipNo} - ${member.fullName}` : memberId;
}

function tenantName(tenantId) {
  const tenant = dataRows("tenants").find((item) => item.id === tenantId);
  return tenant ? tenant.name || tenant.legalName || tenant.abbreviation || tenant.id : tenantId;
}

function userName(userId) {
  const user = dataRows("users").find((item) => item.id === userId);
  return user ? user.fullName || user.email || user.username || user.id : userId || "Unassigned";
}

function productsByType(type) {
  const wanted = normal(type);
  return dataRows("financialProducts").filter((product) => normal(product.productType).includes(wanted) || normal(product.name).includes(wanted));
}

function accountsByType(type) {
  const wanted = normal(type);
  return dataRows("financialAccounts").filter((account) => normal(account.accountType).includes(wanted) || normal(account.productName).includes(wanted) || normal(account.productCode).includes(wanted));
}

function uniqueCount(rows, key) {
  return new Set((rows || []).map((row) => row[key]).filter(Boolean)).size;
}

function filterRows(rows) {
  return filterRecordRows(rows, state.search);
}

function tableStateKey(title) {
  return tableStateKeyFor(title);
}

function operationAlerts() {
  const operations = state.data.operations || {};
  const alerts = operations.alerts || operations.integrationStatuses || [];
  const baseAlerts = Array.isArray(alerts) && alerts.length ? alerts : [
    { title: "Database", provider: "PostgreSQL", severity: "Healthy", status: "Healthy", checkedAt: state.lastSync },
    { title: "Application service", provider: "Backend service", severity: "Healthy", status: "Healthy", checkedAt: state.lastSync },
    { title: "Mobile money callbacks", provider: "Provider gateway", severity: "Warning", status: "Pending", checkedAt: state.lastSync }
  ];
  return [...mobileMoneyOperationalRows().map((row) => ({
    title: row.type,
    provider: row.provider,
    severity: row.severity,
    status: row.status,
    checkedAt: row.checkedAt
  })), ...notificationProviderRiskRows(), ...baseAlerts];
}

function callbackSigningReadiness() {
  const providers = state.data.mobileMoneyIntegrationConfig?.providers || [];
  if (!providers.length) return { status: "Not checked", severity: "Healthy", nextAction: "Platform Super Admin can review callback signing in Settings" };
  const settings = providers.flatMap((provider) => provider.settings || []);
  const signedCallbacks = settings.find((setting) => setting.key === "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS");
  const callbackSecret = settings.find((setting) => setting.key === "SACCO_MOBILE_MONEY_CALLBACK_SECRET");
  const signed = signedCallbacks?.value === "true";
  const secretReady = Boolean(callbackSecret?.configured);
  if (signed && secretReady) return { status: "Ready", severity: "Healthy", nextAction: "Monitor callback posting" };
  if (signed && !secretReady) return { status: "Secret missing", severity: "Critical", nextAction: "Configure callback secret before accepting production callbacks" };
  return { status: "Unsigned allowed", severity: "Warning", nextAction: "Require signed callbacks before production payments" };
}

function mobileMoneyOperationalRows() {
  const signing = callbackSigningReadiness();
  const callbacks = dataRows("mobileMoneyCallbacks");
  const requests = dataRows("mobileMoneyPaymentRequests");
  const rows = [];
  if (normal(signing.severity) !== "healthy") {
    rows.push({
      type: "Callback signing readiness",
      provider: "Gateway security",
      reference: "Callback signature",
      severity: signing.severity,
      status: signing.status,
      owner: isPlatform() ? "Platform Super Admin" : "SACCO Admin",
      nextAction: signing.nextAction,
      checkedAt: state.lastSync || ""
    });
  }
  callbacks
    .filter((callback) => callback.duplicate || !normal(callback.status).includes("posted"))
    .forEach((callback) => {
      const failed = ["failed", "error", "rejected", "invalid"].some((word) => normal(callback.status).includes(word));
      rows.push({
        type: callback.duplicate ? "Duplicate callback" : "Callback exception",
        provider: labelize(callback.provider || "mobile_money"),
        reference: callback.externalReference || callback.id,
        severity: failed ? "Critical" : "Warning",
        status: callback.duplicate ? "Duplicate" : labelize(callback.status || "review"),
        owner: isPlatform() ? "Platform Operations" : "SACCO Treasurer",
        nextAction: callback.duplicate ? "Confirm no double posting occurred" : "Match provider payload to member ledger",
        checkedAt: callback.receivedAt || callback.createdAt || state.lastSync
      });
    });
  requests
    .filter((request) => !["posted", "failed", "cancelled", "expired"].includes(normal(request.status)))
    .forEach((request) => {
      rows.push({
        type: "Pending request callback",
        provider: labelize(request.provider || "mobile_money"),
        reference: request.externalReference || request.id,
        severity: "Warning",
        status: labelize(request.status || "pending"),
        owner: isPlatform() ? "Platform Operations" : "SACCO Treasurer",
        nextAction: "Check provider status or wait for signed callback",
        checkedAt: request.requestedAt || state.lastSync
      });
    });
  return rows;
}

function fallbackPackages() {
  return [
    { name: "20-250 members", price: 100000, maxMembers: 250, maxBranches: 1, modules: `${money.format(5000)} per member annually, minimum 20 members` },
    { name: "251-500 members", price: 1200000, maxMembers: 500, maxBranches: 2, modules: "Starter fixed billing" },
    { name: "501-1,000 members", price: 2500000, maxMembers: 1000, maxBranches: 5, modules: "Growth SACCO operations" },
    { name: "1,001-2,500 members", price: 5000000, maxMembers: 2500, maxBranches: 10, modules: "Scale SACCO operations" },
    { name: "2,501-5,000 members", price: 8000000, maxMembers: 5000, maxBranches: 20, modules: "Enterprise support" },
    { name: "5,001-10,000 members", price: 12000000, maxMembers: 10000, maxBranches: 25, modules: "Enterprise plus support" }
  ];
}

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function memberDraftScope(member = state.member) {
  return member?.id || member?.membershipNo || "anonymous";
}

function loadMemberDrafts(member = state.member) {
  try {
    const allDrafts = JSON.parse(localStorage.getItem(MEMBER_DRAFTS_KEY) || "{}");
    return Array.isArray(allDrafts[memberDraftScope(member)]) ? allDrafts[memberDraftScope(member)] : [];
  } catch {
    return [];
  }
}

function persistMemberDrafts() {
  let allDrafts = {};
  try {
    allDrafts = JSON.parse(localStorage.getItem(MEMBER_DRAFTS_KEY) || "{}");
  } catch {
    allDrafts = {};
  }
  allDrafts[memberDraftScope()] = state.memberData.drafts || [];
  localStorage.setItem(MEMBER_DRAFTS_KEY, JSON.stringify(allDrafts));
}

function updateMemberDraft(draftId, patch) {
  state.memberData.drafts = state.memberData.drafts.map((draft) => draft.id === draftId ? { ...draft, ...patch } : draft);
  persistMemberDrafts();
}

function field(label, id, type, placeholder, hint) {
  const hintId = hint ? `${id}Hint` : "";
  return `<label><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder || ""}" autocomplete="${type === "password" ? "current-password" : "on"}" ${hintId ? `aria-describedby="${hintId}"` : ""}>${hint ? `<small id="${hintId}">${hint}</small>` : ""}</label>`;
}

function logo(size = "", imageUrl = "") {
  const source = String(imageUrl || "").trim();
  if (source) {
    return `<div class="logo ${size} sacco-logo" aria-hidden="true"><img src="${escapeHtml(source)}" alt=""></div>`;
  }
  return `<div class="logo ${size}" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 9h34v8H28v22h-8V17H7z"></path><path d="M31 22h10v17H31z"></path></svg></div>`;
}

function displayName() {
  return state.member?.fullName || state.user?.fullName || "User";
}

function roleLabel() {
  if (state.auth === "member") return "Member";
  return state.roleNames.map((role) => {
    if (role === "SACCO Administrator") return "SACCO Admin";
    if (role === "Platform Super Admin" || role === "Platform Administrator") return "Administrator";
    return role;
  }).join(", ") || "Staff";
}

function contextName() {
  return state.tenant?.name || (isPlatform() ? "Administration" : state.user?.tenantName) || "Tereka Online";
}

function contextCode() {
  return state.tenant?.abbreviation || state.tenant?.registrationNo || state.tenant?.code || "GREE";
}

function paymentRoutePanel() {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member payment routes</h2>
          <p>Members can pay through SACCO office receipt routes or approved mobile-money channels.</p>
        </div>
        <span class="status active">Visible</span>
      </div>
      <div class="mini-grid">
        ${mini("Treasurer cash deposit", "Staff records office deposits and issues receipts after posting. (Staff receipting)")}
        ${mini("Mobile money self payment", "Member portal payments post after provider callback confirmation. (Self-service)")}
        ${mini("Monthly performance", "Admin and Treasurer review deposits, collections and repayments. (Visible)")}
      </div>
    </section>
  `;
}



function saccoMonthlyPerformancePanel(rows) {
  const membersReported = new Set(rows.map((row) => row.memberName).filter(Boolean)).size;
  const latestMonth = rows[0]?.month || "No posted month";
  const selected = rows.find((row) => row.performanceId === state.selectedMonthlyPerformanceId);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO monthly performance control</h2>
          <p>Compare member deposits by savings, shares, welfare, loan repayments, Treasurer cash and mobile money.</p>
        </div>
        ${selected ? `<button class="button ghost" type="button" data-action="close-monthly-performance-detail">Close detail</button>` : `<span class="status active">Staff reporting</span>`}
      </div>
      <div class="source-grid">
        ${mini("Latest month", latestMonth)}
        ${mini("Members reported", membersReported)}
        ${mini("Treasurer cash collections", money.format(sum(rows, "treasurerCash")))}
        ${mini("Mobile money collections", money.format(sum(rows, "mobileMoney")))}
        ${mini("Loan repayments", money.format(sum(rows, "loanRepayments")))}
        ${mini("Total deposits", money.format(sum(rows, "totalDeposits")))}
      </div>
      ${selected ? `
        <div class="divider"></div>
        <div class="panel-heading">
          <div>
            <h3>Selected member performance</h3>
            <p>${escapeHtml(selected.memberName)} for ${escapeHtml(selected.month)}.</p>
          </div>
          ${selected.memberId ? `<button class="button secondary" type="button" data-action="open-monthly-performance-member" data-member-id="${escapeHtml(selected.memberId)}">Open member statement</button>` : `<span class="status active">Reviewing</span>`}
        </div>
        <div class="source-grid">
          ${mini("Savings deposits", money.format(selected.savingsDeposits))}
          ${mini("Share deposits", money.format(selected.shareDeposits))}
          ${mini("Welfare deposits", money.format(selected.welfareDeposits))}
          ${mini("Loan repayments", money.format(selected.loanRepayments))}
          ${mini("Treasurer cash", money.format(selected.treasurerCash))}
          ${mini("Mobile money", money.format(selected.mobileMoney))}
          ${mini("Total deposits", money.format(selected.totalDeposits))}
          ${mini("Collection split", `${selected.mobileMoney ? "Mobile money used" : "Office cash only"}`)}
        </div>
      ` : `<p class="muted-note">Use Review on a monthly performance row to inspect one member and month.</p>`}
    </section>
  `;
}

function monthlyPerformanceId(row) {
  return performanceRowId(row);
}

function initials(name) {
  return String(name || "TO").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function labelize(value) {
  return TerekaFormatters.labelizeValue(value);
}

function normal(value) {
  return TerekaFormatters.normalizeValue(value);
}

function sum(rows, ...keys) {
  return TerekaFormatters.sumValues(rows, ...keys);
}

function formatValue(row, column) {
  return TerekaFormatters.formatTableValue(row, column, currentRegion());
}

function isDateColumn(column) {
  return TerekaFormatters.isDateColumnValue(column);
}

function formatTableDate(value, column) {
  return TerekaFormatters.formatTableDateValue(value, column, currentRegion());
}

function formatDate(value) {
  return TerekaFormatters.formatDateValue(value, currentRegion());
}

function formatDateTime(value) {
  return TerekaFormatters.formatDateTimeValue(value, currentRegion());
}

function shortDate(value) {
  return TerekaFormatters.formatShortDateValue(value, currentRegion());
}

function currentRegion() {
  const tenant = state.tenant || tenantRows().find((item) => item.id === state.user?.tenantId) || {};
  const country = normal(tenant.country || tenant.operatingCountry || tenant.countryName || "");
  const region = COUNTRY_REGIONS[country] || {};
  const locale = state.locale || tenant.locale || tenant.defaultLocale || region.locale || DEFAULT_REGION.locale;
  const localeInfo = localeMetadata[locale] || localeMetadata[DEFAULT_REGION.locale];
  const currency = tenant.currency || tenant.currencyCode || region.currency || DEFAULT_REGION.currency;
  return {
    locale,
    currency,
    currencyDigits: Number.isInteger(tenant.currencyDigits) ? tenant.currencyDigits : region.currencyDigits ?? DEFAULT_REGION.currencyDigits,
    direction: tenant.direction || tenant.textDirection || localeInfo.direction || region.direction || DEFAULT_REGION.direction
  };
}

function applyRegionalDocumentSettings() {
  const region = currentRegion();
  document.documentElement.lang = region.locale;
  document.documentElement.dir = region.direction;
}

function t(key) {
  const locale = state.locale || DEFAULT_REGION.locale;
  const localeInfo = localeMetadata[locale] || localeMetadata[DEFAULT_REGION.locale];
  const languageFallback = Object.keys(messages).find((messageLocale) => messageLocale.split("-")[0] === locale.split("-")[0]);
  return messages[locale]?.[key]
    || messages[localeInfo.fallback]?.[key]
    || messages[languageFallback]?.[key]
    || messages[DEFAULT_REGION.locale]?.[key]
    || key;
}

function translateOr(key, fallback) {
  const locale = state.locale || DEFAULT_REGION.locale;
  const localeInfo = localeMetadata[locale] || localeMetadata[DEFAULT_REGION.locale];
  const languageFallback = Object.keys(messages).find((messageLocale) => messageLocale.split("-")[0] === locale.split("-")[0]);
  return messages[locale]?.[key]
    || messages[localeInfo.fallback]?.[key]
    || messages[languageFallback]?.[key]
    || messages[DEFAULT_REGION.locale]?.[key]
    || fallback;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // The app remains fully usable when a browser or local environment blocks service workers.
    });
  });
}

function snake(column) {
  return TerekaFormatters.snakeColumn(column);
}

function camelFallback(column) {
  return TerekaFormatters.camelFallbackColumn(column);
}

function statusClass(value) {
  return TerekaFormatters.statusClassValue(value);
}

function escapeHtml(value) {
  return TerekaFormatters.escapeHtmlValue(value);
}

function loanApplicationCode(loan) {
  if (!loan) return "";
  const tenant = tenantRows().find((item) => item.id === loan.tenantId) || dataRows("tenants").find((item) => item.id === loan.tenantId) || {};
  const saccoCode = String(tenant.abbreviation || tenant.code || loan.saccoCode || "SACCO")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10) || "SACCO";
  const receivedAt = loan.createdAt || loan.submittedAt || loan.appliedAt || loan.receivedAt || loan.updatedAt || new Date().toISOString();
  const date = String(receivedAt).slice(0, 10).replace(/-/g, "") || "00000000";
  const uniqueSource = String(loan.id || loan.applicationNo || loan.reference || "");
  const digits = uniqueSource.replace(/\D/g, "");
  const suffix = (digits || loanApplicationHash(uniqueSource)).slice(-4).padStart(4, "0");
  return `${saccoCode}-${date}-${suffix}`;
}

function loanApplicationHash(value) {
  let hash = 0;
  String(value || "loan").split("").forEach((char) => {
    hash = ((hash * 31) + char.charCodeAt(0)) % 10000;
  });
  return String(hash).padStart(4, "0");
}

function financeLoanDisplayRows(rows = []) {
  return (rows || []).map((row) => ({
    ...row,
    applicationNo: loanApplicationCode(row)
  }));
}
