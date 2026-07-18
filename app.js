const API_BASE = "/api/v1";
const STAFF_TOKEN_KEY = "tereka-staff-token";
const MEMBER_TOKEN_KEY = "tereka-member-token";
const SHOW_DEMO_TOOLS = new URLSearchParams(window.location.search).has("demo");

const money = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0
});

const demoAccounts = [
  { label: "Platform Super Admin", code: "PLATFORM", username: "admin@platform.local", password: "Admin@12345", portal: "Platform" },
  { label: "Platform Operations", code: "PLATFORM", username: "operations@platform.local", password: "Operations@12345", portal: "Platform" },
  { label: "Platform Billing", code: "PLATFORM", username: "billing@platform.local", password: "Billing@12345", portal: "Platform" },
  { label: "Platform Compliance", code: "PLATFORM", username: "compliance@platform.local", password: "Compliance@12345", portal: "Platform" },
  { label: "Platform Support", code: "PLATFORM", username: "support@platform.local", password: "Support@12345", portal: "Platform" },
  { label: "SACCO Administrator", code: "GVS", username: "admin@greenvalley.local", password: "Sacco@12345", portal: "SACCO" },
  { label: "Treasurer", code: "GVS", username: "treasurer@greenvalley.local", password: "Treasurer@12345", portal: "SACCO" },
  { label: "Secretary", code: "GVS", username: "secretary@greenvalley.local", password: "Secretary@12345", portal: "SACCO" },
  { label: "Chairperson", code: "GVS", username: "chairperson@greenvalley.local", password: "Chair@12345", portal: "SACCO" },
  { label: "Member", code: "GVS", username: "GVS-0001", password: "Member@12345", portal: "Member" }
];

const state = {
  auth: "none",
  token: "",
  user: null,
  member: null,
  tenant: null,
  roleNames: [],
  permissionIds: [],
  currentView: "dashboard",
  search: "",
  loading: false,
  lastSync: "",
  lastError: "",
  userFormMessage: "",
  userFormError: "",
  selectedUserId: "",
  selectedUserRoles: [],
  selectedUserLoading: false,
  selectedUserMessage: "",
  selectedUserError: "",
  selectedTenantId: "",
  selectedTenant: null,
  selectedTenantProfile: null,
  selectedTenantMessage: "",
  selectedTenantError: "",
  selectedSubscriptionId: "",
  selectedSubscriptionMessage: "",
  selectedSubscriptionError: "",
  data: emptyData(),
  memberData: emptyMemberData()
};

const platformModules = [
  ["dashboard", "Dashboard", "Platform performance and alerts", "dashboard:view", ["super", "operations", "billing", "compliance", "support"]],
  ["sacco-applications", "SACCO Registration", "Applications, reviewer queue, approvals", "tenants:view", ["super", "operations", "billing", "compliance", "support"]],
  ["subscriptions", "Subscriptions", "Packages, invoices, renewals", "subscriptions:view", ["super", "billing"]],
  ["sacco-accounts", "SACCO Accounts", "Tenant account health", "tenants:view", ["super", "billing", "compliance"]],
  ["members", "Members", "Read-only tenant member support", "members:view", ["super", "support"]],
  ["transactions", "Transactions", "Platform transaction monitoring", "transactions:view", ["super"]],
  ["loans", "Loans", "Loan portfolio monitoring", "loans:view", ["super"]],
  ["approvals", "Approvals", "Platform approval queues", "approvals:view", ["super"]],
  ["operations", "Operations", "Health, callbacks, jobs, support access", "operations:view", ["super", "operations", "compliance", "support"]],
  ["reports", "Reports", "Registration, billing, compliance exports", "reports:view", ["super", "operations", "billing", "compliance"]],
  ["complaints", "Complaints", "Support tickets and escalations", "complaints:view", ["super", "operations", "support"]],
  ["notifications", "Notifications", "SMS, email and push delivery", "notifications:view", ["super", "operations"]],
  ["users", "Users and Roles", "Platform administrators only", "roles:view", ["super"]],
  ["audit", "Audit Logs", "Read-only platform audit trail", "reports:view", ["super", "compliance"]],
  ["settings", "System Settings", "Protected platform configuration", "roles:create", ["super"]]
];

const saccoModules = [
  ["dashboard", "Dashboard", "Role-specific SACCO operating view", "dashboard:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "teller", "auditor"]],
  ["members", "Members", "KYC, approvals, profiles, statements", "members:view", ["admin", "secretary", "loans", "auditor"]],
  ["transactions", "Transactions", "Deposits, withdrawals, receipts, reversals", "transactions:view", ["admin", "treasurer", "accountant", "teller", "auditor"]],
  ["savings", "Savings", "Products, accounts and statements", "transactions:view", ["admin", "treasurer", "accountant", "auditor"]],
  ["shares", "Shares", "Share register and certificates", "transactions:view", ["admin", "treasurer", "secretary", "auditor"]],
  ["welfare", "Welfare", "Contributions, balances and claims", "transactions:view", ["admin", "treasurer", "secretary"]],
  ["loans", "Loans", "Applications, appraisal, guarantors, repayments", "loans:view", ["admin", "chairperson", "loans", "auditor"]],
  ["guarantors", "Guarantors", "Guarantee requests and obligations", "loans:view", ["admin", "chairperson", "loans"]],
  ["approvals", "Approvals", "Maker-checker decisions", "approvals:view", ["admin", "chairperson", "treasurer", "secretary", "loans"]],
  ["operations", "Operations", "Branch, import and service status", "operations:view", ["admin", "chairperson", "treasurer", "auditor"]],
  ["accounting", "Accounting", "Trial balance, journals and reports", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reconciliation", "Reconciliation", "Bank and mobile-money matching", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reports", "Reports", "Operational and financial reporting", "reports:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "auditor"]],
  ["governance", "Governance", "Meetings, minutes and resolutions", "reports:view", ["admin", "chairperson", "secretary"]],
  ["complaints", "Complaints", "Member cases and support", "complaints:view", ["admin", "secretary"]],
  ["users", "Users and Roles", "SACCO staff access", "roles:view", ["admin"]],
  ["settings", "Settings", "Products, branches and controls", "roles:create", ["admin"]],
  ["audit", "Audit Logs", "Read-only sensitive activity", "reports:view", ["admin", "auditor"]]
];

const memberModules = [
  ["home", "Home", "Balances, next repayment and alerts"],
  ["accounts", "My Accounts", "Savings, shares and welfare"],
  ["loans", "Loans", "Active loans and applications"],
  ["guarantor-requests", "Guarantor Requests", "Accept or reject requests"],
  ["payments", "Payments", "Deposit, repay, buy shares, pay welfare"],
  ["statements", "Statements", "Download PDF, Excel or print"],
  ["receipts", "Receipts", "Posted transaction receipts"],
  ["notifications", "Notifications", "Messages and alerts"],
  ["complaints", "Complaints", "Draft, submit and track cases"],
  ["profile", "Profile", "Personal details and KYC"],
  ["security", "Security", "Password and device settings"]
];

function emptyData() {
  return {
    tenants: [],
    subscriptions: [],
    subscriptionPackages: [],
    members: [],
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
    statementLines: [],
    reconciliation: null,
    mobileMoneyCallbacks: [],
    notificationTemplates: [],
    roles: [],
    permissions: [],
    auditEvents: [],
    regulatoryReport: null
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
    drafts: []
  };
}

function app() {
  return document.getElementById("app");
}

function setHtml(markup) {
  app().innerHTML = markup;
  bindEvents();
}

function hasPermission(permission) {
  if (!permission) return true;
  if (permission === "dashboard:view") return true;
  if (state.roleNames.join(" ").toLowerCase().includes("super admin")) return true;
  if (isPlatform() && roleKind() === "super") return true;
  return state.permissionIds.includes(permission);
}

function roleKind() {
  const roles = state.roleNames.join(" ").toLowerCase();
  if (state.auth === "member") return "member";
  if (state.user?.tenantId === "tenant_platform") {
    if (roles.includes("billing")) return "billing";
    if (roles.includes("compliance")) return "compliance";
    if (roles.includes("support")) return "support";
    if (roles.includes("operations")) return "operations";
    return "super";
  }
  if (roles.includes("chairperson")) return "chairperson";
  if (roles.includes("treasurer")) return "treasurer";
  if (roles.includes("secretary")) return "secretary";
  if (roles.includes("loan")) return "loans";
  if (roles.includes("accountant")) return "accountant";
  if (roles.includes("teller") || roles.includes("cashier")) return "teller";
  if (roles.includes("auditor")) return "auditor";
  return "admin";
}

function isPlatform() {
  return state.auth === "staff" && state.user?.tenantId === "tenant_platform";
}

function visibleModules() {
  if (state.auth === "member") return memberModules;
  const kind = roleKind();
  const source = isPlatform() ? platformModules : saccoModules;
  return source.filter((item) => item[4].includes(kind) && hasPermission(item[3]));
}

function currentModule() {
  return visibleModules().find((item) => item[0] === state.currentView) || visibleModules()[0];
}

function init() {
  state.token = localStorage.getItem(STAFF_TOKEN_KEY) || "";
  const memberToken = localStorage.getItem(MEMBER_TOKEN_KEY) || "";
  if (state.token) {
    restoreStaff();
  } else if (memberToken) {
    state.token = memberToken;
    restoreMember();
  } else {
    renderLogin();
  }
}

async function restoreStaff() {
  state.auth = "staff";
  renderLoading("Restoring staff session");
  try {
    const session = await api("/auth/me");
    applyStaffSession(session);
    await refreshAll();
  } catch {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    state.auth = "none";
    state.token = "";
    renderLogin();
  }
}

async function restoreMember() {
  state.auth = "member";
  renderLoading("Restoring member session");
  try {
    const session = await api("/member-auth/me");
    state.member = session.member;
    state.tenant = session.tenant;
    state.memberData.balances = session.balances;
    await refreshMember();
  } catch {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    state.auth = "none";
    state.token = "";
    renderLogin();
  }
}

function renderLogin() {
  document.body.className = "login-page";
  setHtml(`
    <main class="login-layout">
      <section class="login-hero">
        <div class="logo-lockup">
          ${logo("large")}
          <div>
            <p class="eyebrow">Tereka Online</p>
            <h1>Save Together. Grow Together.</h1>
          </div>
        </div>
        <p class="hero-copy">A secure, low-bandwidth SACCO operating platform for Uganda. One login directs each user to the correct platform, SACCO or member portal.</p>
        <div class="trust-list">
          <span>Role-based access</span>
          <span>Secure approvals</span>
          <span>UGX financial clarity</span>
        </div>
        <div class="login-links">
          <button type="button" data-auth-tab="login">Login</button>
          <button type="button" data-auth-tab="register">Register SACCO</button>
          <button type="button" data-auth-tab="forgot">Forgot password</button>
          <button type="button" data-auth-tab="support">Support</button>
        </div>
      </section>
      <section class="login-card">
        <div class="form-heading">
          <p class="eyebrow">Secure access</p>
          <h2>Login to your portal</h2>
          <p>Code identifies the SACCO or Platform Administration. Username and password identify the role: platform user, SACCO staff or member.</p>
        </div>
        <form id="loginForm" class="form-grid single">
          ${field("SACCO or platform code", "code", "text", "PLATFORM", "Use PLATFORM or a SACCO code such as GVS")}
          ${field("Username, email, phone or membership number", "username", "text", "admin@platform.local", "")}
          <label>
            <span>Password</span>
            <div class="password-row">
              <input id="password" type="password" placeholder="Enter password" autocomplete="current-password">
              <button type="button" data-action="toggle-password">Show</button>
            </div>
          </label>
          <label class="check-row"><input id="remember" type="checkbox" checked> <span>Remember this device</span></label>
          <div id="loginError" class="alert error" hidden></div>
          <button id="loginButton" class="button primary" type="submit">Login</button>
        </form>
        ${SHOW_DEMO_TOOLS ? `<section class="demo-panel">
          <div>
            <strong>Demo access</strong>
            <span>Choose a role to fill the login fields.</span>
          </div>
          <div class="demo-picker">
            <select id="demoAccountSelect">
              ${demoAccounts.map((account, index) => `<option value="${index}">${account.label} - ${account.portal}</option>`).join("")}
            </select>
            <button class="button secondary" type="button" data-action="fill-demo">Fill demo</button>
          </div>
        </section>` : ""}
        <div class="login-footer-links">
          <button type="button">Privacy policy</button>
          <button type="button">Terms and conditions</button>
          <button type="button">Maintenance notices</button>
        </div>
      </section>
    </main>
  `);
}

function renderShell() {
  document.body.className = "";
  const module = currentModule();
  const modules = visibleModules();
  const portal = state.auth === "member" ? "Member Self-Service Portal" : isPlatform() ? "Platform Administration Portal" : "SACCO Administration Portal";
  setHtml(`
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-top">
          <div class="logo-lockup compact">${logo()}<div><strong>Tereka Online</strong><span>${portal}</span></div></div>
          <button class="icon-button" type="button" data-action="toggle-sidebar" aria-label="Collapse sidebar">M</button>
        </div>
        <div class="context-card">
          <small>${state.auth === "member" ? "SACCO" : isPlatform() ? "Context" : "SACCO"}</small>
          <strong>${contextName()}</strong>
          <span>${roleLabel()}</span>
        </div>
        <nav class="nav-list">
          ${modules.map((item) => `
            <button class="nav-link ${item[0] === module[0] ? "active" : ""}" type="button" data-view="${item[0]}">
              <span>${item[1]}</span><small>${item[2]}</small>
            </button>
          `).join("")}
        </nav>
        <button class="logout-button" type="button" data-action="logout">Logout</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="icon-button mobile-only" type="button" data-action="toggle-sidebar" aria-label="Open menu">Menu</button>
          <div class="breadcrumbs">Home / ${portal} / <strong>${module[1]}</strong></div>
          <div class="topbar-actions">
            <label class="search-box"><span>Search</span><input id="globalSearch" value="${escapeHtml(state.search)}" placeholder="Search records, members, SACCOs"></label>
            <button class="icon-button" type="button" title="Notifications">!</button>
            <button class="icon-button" type="button" title="Help">?</button>
            <button class="profile-chip" type="button">${initials(displayName())}</button>
          </div>
        </header>
        <section class="page-header">
          <div>
            <p class="eyebrow">${portal}</p>
            <h1>${module[1]}</h1>
            <p>${module[2]}</p>
          </div>
          <div class="page-actions">
            ${state.auth === "member" ? `<button class="button secondary" data-action="refresh-member" type="button">Refresh</button>` : `<button class="button secondary" data-action="refresh" type="button">Refresh</button>`}
            <button class="button ghost" type="button">Export summary</button>
          </div>
        </section>
        <section class="content-area">
          ${runtimeNotice()}
          ${renderView(module[0])}
        </section>
        <footer class="footer">Tereka Online</footer>
      </main>
    </div>
  `);
}

function renderView(view) {
  if (state.auth === "member") return renderMemberView(view);
  if (view === "dashboard") return isPlatform() ? platformDashboard() : saccoDashboard();
  if (view === "sacco-applications") return saccoApplications();
  if (view === "subscriptions") return subscriptionsView();
  if (view === "sacco-accounts") return saccoAccounts();
  if (view === "members") return membersView();
  if (view === "transactions") return transactionsView();
  if (view === "loans") return loansView();
  if (view === "approvals") return approvalsView();
  if (view === "operations") return operationsView();
  if (view === "reports") return reportsView();
  if (view === "complaints") return complaintsView();
  if (view === "notifications") return notificationsView();
  if (view === "users") return usersView();
  if (view === "audit") return auditView();
  if (["savings", "shares", "welfare", "guarantors", "accounting", "reconciliation", "governance", "settings"].includes(view)) return moduleBlueprint(view);
  return emptyState("Module coming next", "This module has a document-driven shell and will be connected to deeper backend workflows next.");
}

function platformDashboard() {
  const role = roleKind();
  if (role === "operations") return platformOperationsDashboard();
  if (role === "billing") return platformBillingDashboard();
  if (role === "compliance") return platformComplianceDashboard();
  if (role === "support") return platformSupportDashboard();
  const tenants = dataRows("tenants").filter((tenant) => tenant.id !== "tenant_platform");
  const subs = dataRows("subscriptions");
  const members = dataRows("members");
  const transactions = dataRows("transactions");
  const users = platformUsers();
  return `
    ${dashboardIntro("Platform Super Admin", "Full ownership view for SACCO activation, subscriptions, platform users and system risk.")}
    <div class="dashboard-grid">
      ${summary("Total SACCOs", tenants.length, "All registered tenants", "Open applications")}
      ${summary("Active SACCOs", tenants.filter((t) => normal(t.status) === "active").length, "Operational tenants", "View accounts")}
      ${summary("Pending registrations", tenants.filter((t) => normal(t.status).includes("pending")).length, "Reviewer queue", "Review")}
      ${summary("Expired subscriptions", subs.filter((s) => normal(s.status).includes("expired")).length, "Billing risk", "Renew")}
      ${summary("Total platform members", members.length, "Across visible SACCOs", "Open members")}
      ${summary("Total subscription revenue", money.format(sum(subs, "amount")), "Current records", "Open billing")}
      ${summary("Pending support tickets", dataRows("complaints").filter((c) => !["closed", "resolved"].includes(normal(c.status))).length, "Support workload", "Open")}
      ${summary("Failed payment transactions", transactions.filter((t) => normal(t.status).includes("failed")).length, "Provider exceptions", "Investigate")}
      ${summary("Active platform users", users.filter((user) => normal(user.status) === "active").length || users.length, "Administrators and roles", "Manage access")}
    </div>
    <div class="split-layout">
      ${chartCard("SACCO registrations by month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], [2, 3, 4, 5, 7, tenants.length || 3])}
      ${activityPanel("Recent SACCO applications", tenants.slice(0, 5).map((tenant) => [tenant.name || tenant.legalName, tenant.district || "Uganda", tenant.status || "Pending"]))}
    </div>
    <div class="grid two">
      ${recordTable("Subscriptions expiring soon", subs, ["tenantName", "packageName", "expiryDate", "status"])}
      ${recordTable("System alerts", operationAlerts(), ["title", "severity", "status", "checkedAt"])}
    </div>
  `;
}

function platformOperationsDashboard() {
  const tenants = tenantRows();
  const complaints = openComplaints();
  return `
    ${dashboardIntro("Platform Operations Officer", "Monitor service health, onboarding queues, callbacks, incidents and tenant operational status.")}
    <div class="dashboard-grid">
      ${summary("Operating SACCOs", tenants.filter((t) => normal(t.status) === "active").length, "Live tenants", "Monitor")}
      ${summary("Pending onboarding", pendingTenants().length, "Applications needing follow-up", "Open queue")}
      ${summary("Open support tickets", complaints.length, "Operational workload", "Assign")}
      ${summary("Failed callbacks", dataRows("mobileMoneyCallbacks").filter((row) => normal(row.status).includes("failed")).length, "Provider exceptions", "Retry")}
      ${summary("System alerts", operationAlerts().length, "Health checks", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("Operations command center", operationAlerts(), ["title", "provider", "severity", "status", "checkedAt"])}
      ${recordTable("Open support tickets", complaints, ["id", "memberName", "category", "subject", "priority", "status"])}
    </div>
  `;
}

function platformBillingDashboard() {
  const subs = dataRows("subscriptions");
  return `
    ${dashboardIntro("Platform Billing Officer", "Control subscriptions, invoices, payment access and SACCO operating eligibility.")}
    <div class="dashboard-grid">
      ${summary("Active subscriptions", subs.filter((row) => normal(row.status) === "active").length, "Allowed to operate", "Review")}
      ${summary("Pending payments", subs.filter((row) => normal(row.paymentStatus || row.status).includes("pending")).length, "Awaiting confirmation", "Record")}
      ${summary("Expired subscriptions", subs.filter((row) => normal(row.status).includes("expired")).length, "Access risk", "Renew")}
      ${summary("Subscription revenue", money.format(sum(subs, "amount")), "Current records", "Export")}
      ${summary("Billable SACCOs", tenantRows().length, "Registered tenants", "Open")}
    </div>
    ${recordTable("Subscription list", subs, ["tenantName", "packageName", "billingPeriod", "expiryDate", "amount", "memberCount", "status"])}
    ${recordTable("SACCO billing access", tenantRows(), ["name", "district", "memberCount", "status"])}
  `;
}

function platformComplianceDashboard() {
  return `
    ${dashboardIntro("Platform Compliance Officer", "Oversight view for tenant approvals, audit events, reports and operating exceptions.")}
    <div class="dashboard-grid">
      ${summary("Pending registrations", pendingTenants().length, "Approval oversight", "Review")}
      ${summary("Audit events", dataRows("auditEvents").length, "Sensitive actions", "Inspect")}
      ${summary("Open complaints", openComplaints().length, "Compliance cases", "Open")}
      ${summary("Operations alerts", operationAlerts().length, "System exceptions", "Review")}
      ${summary("Regulatory report", state.data.regulatoryReport ? "Ready" : "Pending", "Export readiness", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("Audit log", dataRows("auditEvents"), ["createdAt", "actor", "role", "tenantName", "action", "module", "result"])}
      ${recordTable("Tenant approval oversight", tenantRows(), ["name", "district", "contactPerson", "memberCount", "status"])}
    </div>
  `;
}

function platformSupportDashboard() {
  return `
    ${dashboardIntro("Platform Support Officer", "Help SACCOs resolve member, onboarding and operating issues without platform administration rights.")}
    <div class="dashboard-grid">
      ${summary("Open complaints", openComplaints().length, "Support queue", "Open")}
      ${summary("Visible SACCOs", tenantRows().length, "Tenant support context", "View")}
      ${summary("Visible members", dataRows("members").length, "Read-only support", "Search")}
      ${summary("Pending onboarding", pendingTenants().length, "Applicant follow-up", "Assist")}
      ${summary("Notifications", dataRows("notifications").length, "Recent messages", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("Open support tickets", openComplaints(), ["id", "memberName", "category", "subject", "assignedOfficer", "priority", "status"])}
      ${recordTable("Tenant support list", tenantRows(), ["name", "district", "contactPerson", "phone", "status"])}
    </div>
  `;
}

function saccoDashboard() {
  const role = roleKind();
  if (role === "chairperson") return saccoChairpersonDashboard();
  if (role === "treasurer") return saccoTreasurerDashboard();
  if (role === "secretary") return saccoSecretaryDashboard();
  const members = dataRows("members");
  const transactions = dataRows("transactions");
  const loans = dataRows("loans");
  const roleCopy = {
    admin: "Full SACCO performance, new members, approvals, subscription status, branch activity and system alerts.",
    chairperson: "Loan portfolio, final approvals, arrears, governance meetings, high-value transactions and operational risks.",
    treasurer: "Cash position, bank balances, mobile-money collections, finance approvals, withdrawals and reconciliation status.",
    secretary: "Member applications, KYC documents, meetings, minutes, complaints and governance approvals.",
    loans: "New applications, appraisal queues, guarantors, arrears, repayments due and loan product performance.",
    accountant: "Trial balance, unposted transactions, reconciliation, suspense accounts, expenses and period closing.",
    teller: "Opening balance, daily collections, withdrawals, receipts, recent teller transactions and member lookup.",
    auditor: "Read-only financial summary, approvals, reversals, user activity and audit exceptions."
  };
  return `
    ${dashboardIntro(roleLabel(), roleCopy[role] || roleCopy.admin)}
    <div class="dashboard-grid">
      ${summary("Total members", members.length, "Membership register", "Open members")}
      ${summary("Active members", members.filter((m) => normal(m.status) === "active").length, "Can transact", "Review")}
      ${summary("Total savings", money.format(sum(members, "savingsBalance", "savings")), "Server-confirmed balances", "Statements")}
      ${summary("Total shares", money.format(sum(members, "sharesBalance", "shares")), "Share capital", "Share register")}
      ${summary("Welfare fund", money.format(sum(members, "welfareBalance", "welfare")), "Claims coverage", "Claims")}
      ${summary("Outstanding loans", money.format(sum(loans, "outstandingBalance", "balance")), "Loan portfolio", "Open loans")}
      ${summary("Pending approvals", dataRows("approvals").length || transactions.filter((t) => normal(t.status).includes("pending")).length, "Maker-checker", "Approve")}
      ${summary("Mobile-money collections", money.format(sum(transactions.filter((t) => normal(t.channel).includes("mobile")), "amount")), "Provider channel", "Reconcile")}
    </div>
    <div class="grid two">
      ${recordTable("Recent transactions", transactions, ["reference", "memberName", "type", "amount", "status"])}
      ${recordTable("Loan work queue", loans, ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
    </div>
  `;
}

function saccoChairpersonDashboard() {
  const loans = dataRows("loans");
  const transactions = dataRows("transactions");
  return `
    ${dashboardIntro("SACCO Chairperson", "Oversight dashboard for approvals, portfolio health, governance actions and high-value exceptions.")}
    <div class="dashboard-grid">
      ${summary("Total members", dataRows("members").length, "SACCO membership", "Open")}
      ${summary("Outstanding loans", money.format(sum(loans, "outstandingBalance", "balance")), "Portfolio exposure", "Review")}
      ${summary("Loans awaiting approval", loans.filter((row) => normal(row.status).includes("review") || normal(row.stage).includes("approval")).length, "Chairperson queue", "Decide")}
      ${summary("Pending transactions", pendingTransactions().length, "High-value controls", "Review")}
      ${summary("Open complaints", openComplaints().length, "Member issues", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("Chairperson approval queue", [...pendingTransactions(), ...loans], ["reference", "applicationNo", "memberName", "type", "requestedAmount", "amount", "status"])}
      ${recordTable("Recent transactions", transactions, ["reference", "memberName", "type", "amount", "status"])}
    </div>
  `;
}

function saccoTreasurerDashboard() {
  const transactions = dataRows("transactions");
  const callbacks = dataRows("mobileMoneyCallbacks");
  return `
    ${dashboardIntro("SACCO Treasurer", "Cash, collections, withdrawals, reconciliation and finance approvals for daily control.")}
    <div class="dashboard-grid">
      ${summary("Total savings", money.format(sum(dataRows("members"), "savingsBalance", "savings")), "Member deposits", "Statements")}
      ${summary("Collections", money.format(sum(transactions.filter((row) => Number(row.credit || 0) > 0), "credit", "amount")), "Posted inflows", "Open")}
      ${summary("Withdrawals", money.format(sum(transactions.filter((row) => Number(row.debit || 0) > 0), "debit", "amount")), "Posted outflows", "Review")}
      ${summary("Pending finance approvals", pendingTransactions().length, "Maker-checker", "Approve")}
      ${summary("Provider callbacks", callbacks.length, "Mobile money", "Reconcile")}
    </div>
    <div class="grid two">
      ${recordTable("Finance approval queue", pendingTransactions(), ["reference", "memberName", "type", "amount", "channel", "status"])}
      ${recordTable("Mobile-money callbacks", callbacks, ["externalReference", "provider", "purpose", "amount", "status", "receivedAt"])}
    </div>
  `;
}

function saccoSecretaryDashboard() {
  const members = dataRows("members");
  return `
    ${dashboardIntro("SACCO Secretary", "Membership, KYC, records, complaints and governance follow-up for the SACCO office.")}
    <div class="dashboard-grid">
      ${summary("Total members", members.length, "Member register", "Open")}
      ${summary("Pending KYC", members.filter((row) => normal(row.kycStatus).includes("pending") || normal(row.status).includes("pending")).length, "Needs verification", "Review")}
      ${summary("Open complaints", openComplaints().length, "Member support", "Assign")}
      ${summary("Branches", dataRows("branches").length, "Service points", "View")}
      ${summary("Notifications", dataRows("notifications").length, "Member communication", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("Member follow-up list", members, ["membershipNo", "fullName", "phone", "branchName", "kycStatus", "status"])}
      ${recordTable("Complaint follow-up", openComplaints(), ["id", "memberName", "category", "subject", "priority", "status"])}
    </div>
  `;
}

function saccoApplications() {
  const applications = tenantRows().map((tenant) => ({ ...tenant, action: "tenant-detail", actionLabel: "Review", actionId: tenant.id }));
  return `
    ${filterToolbar("Search applications by SACCO, district, contact or status", "Assign reviewer", "Export applications")}
    ${tenantDetailPanel()}
    ${recordTable("SACCO application list", applications, ["id", "name", "district", "registrationNo", "licenseExpiry", "onboarding", "status"])}
    ${wizardCard("Public SACCO registration wizard", ["SACCO Information", "Location and Contact", "Authorized Contact", "Leadership Details", "Document Upload", "Subscription Package", "Review and Submit"])}
  `;
}

function subscriptionsView() {
  const rows = dataRows("subscriptions");
  const tableRows = rows.map((subscription) => ({ ...subscription, action: "subscription-detail", actionLabel: "Manage", actionId: subscription.id }));
  return `
    <div class="dashboard-grid">
      ${summary("Active subscriptions", rows.filter((row) => normal(row.status) === "active").length, "Operating access", "View")}
      ${summary("Pending payments", rows.filter((row) => normal(row.paymentStatus || row.status).includes("pending")).length, "Awaiting confirmation", "Record payment")}
      ${summary("Revenue this month", money.format(sum(rows, "amount")), "Invoice value", "Export")}
      ${summary("Outstanding invoices", money.format(rows.reduce((total, row) => total + Number(row.amount || 0) - Number(row.paid || row.amountPaid || 0), 0)), "Unpaid balance", "Follow up")}
    </div>
    ${filterToolbar("Search by SACCO, package, payment status or expiry", "Record payment", "Generate invoice")}
    ${subscriptionDetailPanel(rows)}
    ${recordTable("Subscription list", tableRows, ["tenantName", "tenantId", "packageId", "tierLabel", "billingDescription", "amount", "paid", "expiry", "status"])}
    ${packageCards()}
  `;
}

function saccoAccounts() {
  return recordTable("SACCO account health", dataRows("tenants").filter((t) => t.id !== "tenant_platform"), ["name", "abbreviation", "district", "status", "registrationNo"]);
}

function membersView() {
  return `
    ${filterToolbar("Search by member number, name, phone, branch, KYC or status", "Register member", "Download statement")}
    ${recordTable("Member list", dataRows("members"), ["membershipNo", "fullName", "phone", "branchName", "savingsBalance", "loanBalance", "kycStatus", "status"])}
    ${tabsCard("Member registration form sections", ["Personal Information", "Contact Information", "Address", "Employment or Business", "Identification", "Next of Kin", "Beneficiaries", "Membership Details", "Bank and Mobile Money", "Documents", "Review"])}
  `;
}

function transactionsView() {
  return `
    ${filterToolbar("Search by reference, member, channel, status, amount or user", "New transaction", "Print receipt")}
    ${recordTable("Transaction list", dataRows("transactions"), ["reference", "postedAt", "memberName", "type", "channel", "debit", "credit", "amount", "status"])}
    ${formPreview("New transaction screen", ["Member search", "Member summary", "Transaction type", "Account", "Amount", "Payment method", "Reference", "Narration", "Charge preview", "Expected balance after transaction"])}
  `;
}

function loansView() {
  return `
    <div class="dashboard-grid">
      ${summary("Active loans", dataRows("loans").filter((l) => normal(l.status) === "active").length, "Current portfolio", "Open")}
      ${summary("Outstanding principal", money.format(sum(dataRows("loans"), "outstandingBalance", "balance")), "Portfolio balance", "Review")}
      ${summary("Awaiting approval", dataRows("loans").filter((l) => normal(l.status).includes("review") || normal(l.stage).includes("approval")).length, "Decision queue", "Approve")}
      ${summary("Portfolio at risk", "Review", "Arrears and DSR risk", "Report")}
    </div>
    ${recordTable("Loan application list", dataRows("loans"), ["applicationNo", "memberName", "product", "requestedAmount", "eligibleAmount", "stage", "riskLevel", "status"])}
    ${tabsCard("Loan details tabs", ["Overview", "Repayment Schedule", "Repayments", "Guarantors", "Collateral", "Charges", "Approval History", "Documents", "Accounting Entries", "Audit Trail"])}
  `;
}

function approvalsView() {
  const transactions = dataRows("transactions").filter((row) => normal(row.status).includes("pending"));
  const loans = dataRows("loans").filter((row) => normal(row.status).includes("review") || normal(row.status).includes("submitted"));
  return `
    <div class="dashboard-grid">
      ${summary("Pending member approvals", dataRows("members").filter((m) => normal(m.status).includes("pending")).length, "KYC and onboarding", "Review")}
      ${summary("Pending loan approvals", loans.length, "Credit workflow", "Review")}
      ${summary("Pending transactions", transactions.length, "Finance maker-checker", "Review")}
      ${summary("Pending reversals", "0", "Requires reason", "Review")}
    </div>
    ${recordTable("Approval queue", [...transactions, ...loans], ["reference", "memberName", "type", "amount", "stage", "status"])}
  `;
}

function operationsView() {
  const alerts = operationAlerts();
  return `
    <div class="dashboard-grid">
      ${summary("Platform health", state.data.operations?.health || "Healthy", "Service status", "Open")}
      ${summary("Failed callbacks", alerts.filter((a) => normal(a.status).includes("failed")).length, "Payment provider", "Retry")}
      ${summary("Notification delivery", dataRows("notifications").length, "SMS/email/push", "Open")}
      ${summary("User sessions", "Active", "Security monitor", "View")}
    </div>
    ${recordTable("Operations command center", alerts, ["title", "provider", "severity", "status", "checkedAt"])}
    ${tabsCard("Operations coverage", ["Payment monitoring", "Failed transactions", "Notification delivery", "Integration status", "Scheduled jobs", "Data-import monitoring", "User-session monitoring", "Maintenance notices"])}
  `;
}

function reportsView() {
  const groups = ["Membership", "Savings", "Shares", "Welfare", "Loans", "Transactions", "Accounting", "Reconciliation", "Governance", "Compliance", "Audit", "Subscriptions"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report catalogue</h2>
          <p>Grouped reports with filters, preview, export, print and scheduling support.</p>
        </div>
      </div>
    </section>
    <div class="report-grid">
      ${groups.map((group) => `<article class="report-card"><h3>${group}</h3><p>${group} report catalogue, filters, preview table, totals, exports and scheduled report support.</p><button class="button secondary" type="button">Open</button></article>`).join("")}
    </div>
  `;
}

function complaintsView() {
  return `
    ${filterToolbar("Search complaints by member, category, priority, status or due date", "New complaint", "Assign officer")}
    ${recordTable("Complaint list", dataRows("complaints"), ["id", "memberName", "category", "subject", "assignedOfficer", "priority", "status", "dueDate"])}
  `;
}

function notificationsView() {
  return `
    ${filterToolbar("Search messages by category, provider, status or related record", "New template", "Mark all as read")}
    ${recordTable("Notification centre", dataRows("notifications"), ["title", "recipient", "channel", "status", "createdAt"])}
    ${recordTable("Notification templates", dataRows("notificationTemplates"), ["title", "channel", "eventType", "status", "updatedAt"])}
  `;
}

function usersView() {
  const platformOnly = isPlatform();
  const users = platformOnly ? dataRows("users").filter((user) => user.tenantId === "tenant_platform") : dataRows("users");
  const canCreate = hasPermission("users:create") || hasPermission("roles:create");
  const rows = users.map((user) => ({ ...user, action: "user-detail", actionLabel: "View", actionId: user.id }));
  return `
    <div class="role-banner">
      <div><p class="eyebrow">Users and Roles</p><h2>${platformOnly ? "Platform administrators only. SACCO members are not platform users." : "SACCO staff access for this tenant."}</h2></div>
      ${canCreate ? `<span class="status active">Super Admin</span>` : `<span class="status pending">View only</span>`}
    </div>
    ${canCreate ? addUserPanel(platformOnly) : ""}
    ${userDetailPanel(users, canCreate)}
    ${recordTable("User list", rows, ["fullName", "username", "email", "phone", "role", "branchName", "lastLogin", "status"])}
    ${permissionMatrix()}
  `;
}

function auditView() {
  return recordTable("Audit log", dataRows("auditEvents"), ["createdAt", "actor", "role", "tenantName", "action", "module", "recordReference", "result"]);
}

function moduleBlueprint(view) {
  if (view === "savings") return savingsView();
  if (view === "shares") return sharesView();
  if (view === "welfare") return welfareView();
  if (view === "accounting") return accountingView();
  if (view === "reconciliation") return reconciliationView();
  if (view === "settings") return settingsView();
  if (view === "guarantors") return guarantorsView();
  const labels = {
    governance: ["Governance", ["Meetings", "Agendas", "Attendance", "Minutes", "Resolutions", "Action items"]],
  };
  const item = labels[view] || ["Module", ["Search", "Filters", "Tables", "Actions"]];
  return tabsCard(item[0], item[1]);
}

function savingsView() {
  const products = productsByType("savings");
  const accounts = accountsByType("savings");
  return `
    <div class="dashboard-grid">
      ${summary("Savings products", products.length, "Configured in Java API", "Manage")}
      ${summary("Savings accounts", accounts.length, "Member accounts", "Open")}
      ${summary("Active products", products.filter((row) => normal(row.status) === "active").length, "Available to members", "Review")}
      ${summary("Minimum contribution", money.format(sum(products, "contributionAmount", "minimumBalance")), "Configured product totals", "View")}
    </div>
    ${recordTable("Savings product list", products, ["name", "code", "contributionAmount", "minimumBalance", "interestRate", "status"])}
    ${recordTable("Savings accounts", accounts, ["membershipNo", "memberName", "productName", "accountNo", "status", "openedAt"])}
  `;
}

function sharesView() {
  const products = productsByType("share");
  const accounts = accountsByType("share");
  return `
    <div class="dashboard-grid">
      ${summary("Share products", products.length, "Share capital products", "Manage")}
      ${summary("Share accounts", accounts.length, "Member share ledgers", "Open")}
      ${summary("Active members", uniqueCount(accounts, "memberId"), "Holding shares", "View")}
      ${summary("Share contribution setup", money.format(sum(products, "contributionAmount")), "Configured value", "Review")}
    </div>
    ${recordTable("Share product list", products, ["name", "code", "contributionAmount", "minimumBalance", "status"])}
    ${recordTable("Share register", accounts, ["membershipNo", "memberName", "productName", "accountNo", "status", "openedAt"])}
  `;
}

function welfareView() {
  const products = productsByType("welfare");
  const claims = dataRows("welfareClaims");
  return `
    <div class="dashboard-grid">
      ${summary("Welfare products", products.length, "Contribution rules", "Manage")}
      ${summary("Claims", claims.length, "Submitted claims", "Open")}
      ${summary("Pending claims", claims.filter((row) => normal(row.status).includes("pending") || normal(row.status).includes("submitted")).length, "Decision queue", "Review")}
      ${summary("Claim value", money.format(sum(claims, "amount")), "Recorded claims", "Export")}
    </div>
    ${recordTable("Welfare product list", products, ["name", "code", "contributionAmount", "status"])}
    ${recordTable("Welfare claims", claims, ["membershipNo", "memberName", "claimType", "amount", "channel", "reference", "status", "submittedAt"])}
  `;
}

function guarantorsView() {
  const requests = dataRows("guarantorRequests");
  const loans = dataRows("loans").filter((loan) => normal(loan.stage).includes("guarant") || normal(loan.status).includes("guarant"));
  return `
    <div class="dashboard-grid">
      ${summary("Guarantor requests", requests.length || loans.length, "From loan workflow", "Open")}
      ${summary("Pending decisions", [...requests, ...loans].filter((row) => normal(row.status).includes("pending")).length, "Awaiting response", "Review")}
      ${summary("Loan files with guarantors", loans.length, "Credit workflow", "View")}
      ${summary("Member exposure", "Review", "Guarantee capacity", "Assess")}
    </div>
    ${recordTable("Guarantor requests", requests.length ? requests : loans, ["memberName", "product", "requestedAmount", "guaranteedAmount", "capacity", "status"])}
  `;
}

function accountingView() {
  const accounts = dataRows("chartOfAccounts");
  const periods = dataRows("accountingPeriods");
  const journals = dataRows("journalEntries");
  const expenses = dataRows("expenses");
  const assets = dataRows("assets");
  return `
    <div class="dashboard-grid">
      ${summary("Chart accounts", accounts.length, "Ledger structure", "Open")}
      ${summary("Accounting periods", periods.length, "Financial years", "View")}
      ${summary("Journal entries", journals.length, "Posted entries", "Review")}
      ${summary("Expenses", money.format(sum(expenses, "amount")), "Supplier and operating costs", "Open")}
      ${summary("Assets", money.format(sum(assets, "netBookValue", "cost")), "Fixed asset register", "View")}
    </div>
    <div class="grid two">
      ${recordTable("Chart of accounts", accounts, ["code", "name", "type", "normalBalance"])}
      ${recordTable("Accounting periods", periods, ["name", "startDate", "endDate", "status"])}
    </div>
    ${recordTable("Recent journal entries", journals, ["reference", "description", "amount", "status", "postedAt"])}
    <div class="grid two">
      ${recordTable("Expenses", expenses, ["supplierId", "accountCode", "amount", "channel", "reference", "status"])}
      ${recordTable("Assets", assets, ["name", "category", "cost", "netBookValue", "location", "status"])}
    </div>
  `;
}

function reconciliationView() {
  const callbacks = dataRows("mobileMoneyCallbacks");
  const reconciliation = state.data.reconciliation || {};
  const matches = Array.isArray(reconciliation.matches) ? reconciliation.matches : [];
  const unmatched = Array.isArray(reconciliation.unmatched) ? reconciliation.unmatched : callbacks.filter((row) => !normal(row.status).includes("posted"));
  return `
    <div class="dashboard-grid">
      ${summary("Provider callbacks", callbacks.length, "Mobile money events", "Open")}
      ${summary("Matched records", matches.length, "Bank/API matched", "Review")}
      ${summary("Unmatched records", unmatched.length, "Needs action", "Investigate")}
      ${summary("Duplicate callbacks", callbacks.filter((row) => row.duplicate).length, "Provider exceptions", "Resolve")}
    </div>
    ${recordTable("Bank and mobile-money matching", matches.length ? matches : callbacks, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"])}
    ${recordTable("Unmatched reconciliation items", unmatched, ["externalReference", "provider", "amount", "status", "receivedAt"])}
  `;
}

function settingsView() {
  return `
    <div class="dashboard-grid">
      ${summary("Branches", dataRows("branches").length, "Tenant service points", "Manage")}
      ${summary("Financial products", dataRows("financialProducts").length, "Savings, shares, welfare", "Configure")}
      ${summary("Notification templates", dataRows("notificationTemplates").length, "SMS/email/push content", "Open")}
      ${summary("Roles", dataRows("roles").length, "Access profiles", "Review")}
    </div>
    ${recordTable("Branch setup", dataRows("branches"), ["code", "name", "address", "status", "createdAt"])}
    ${recordTable("Financial product setup", dataRows("financialProducts"), ["productType", "code", "name", "contributionAmount", "minimumBalance", "interestRate", "status"])}
  `;
}

function renderMemberView(view) {
  const dash = state.memberData.dashboard || {};
  const balances = state.memberData.balances || dash.balances || {};
  if (view === "home") {
    return `
      <div class="member-hero">
        <div><p class="eyebrow">Member dashboard</p><h2>${displayName()}, welcome back</h2><p>SERVER-CONFIRMED BALANCES and requests will update after every refresh.</p></div>
        <span class="status active">Member portal</span>
      </div>
      <div class="dashboard-grid">
        ${summary("Total balance", money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)), "Savings, shares and welfare", "View accounts")}
        ${summary("Savings", money.format(balances.savings || 0), "Last transaction available in statement", "Details")}
        ${summary("Shares", money.format(balances.shares || 0), "Share balance", "Details")}
        ${summary("Welfare", money.format(balances.welfare || 0), "Welfare contributions", "Details")}
        ${summary("Loans", state.memberData.loans.length, "Active and pending loans", "Open")}
        ${summary("Notifications", state.memberData.notifications.length, "Unread and recent", "Read")}
        ${summary("Guarantee requests", state.memberData.pendingGuarantors.length, "PendingGuarantors", "Respond")}
        ${summary("Offline drafts", state.memberData.drafts.length, "Sync drafts", "Sync")}
      </div>
      ${recordTable("Recent transactions", dash.recentTransactions || [], ["reference", "description", "debit", "credit", "runningBalance"])}
    `;
  }
  if (view === "loans") return recordTable("Member loans", state.memberData.loans, ["product", "requestedAmount", "outstandingBalance", "nextDueDate", "status"]);
  if (view === "guarantor-requests") return recordTable("Guarantor requests", state.memberData.pendingGuarantors, ["memberName", "product", "guaranteedAmount", "capacity", "status"]);
  if (view === "notifications") return recordTable("Notifications", state.memberData.notifications, ["title", "message", "channel", "status", "createdAt"]);
  if (view === "complaints") return `${formPreview("Member complaint", ["Save draft", "Submit complaint", "Category", "Subject", "Message", "Attachments", "Track status"])}${recordTable("My complaints", state.memberData.complaints, ["id", "category", "subject", "priority", "status"])}`;
  if (view === "statements") return `${filterToolbar("Filter by date and account", "Download PDF", "Download Excel")}${recordTable("Member statement", dash.statementLines || [], ["reference", "description", "debit", "credit", "runningBalance"])}`;
  return moduleBlueprint(view);
}

function dashboardIntro(title, copy) {
  return `
    <div class="role-banner">
      <div><p class="eyebrow">${escapeHtml(title)}</p><h2>${escapeHtml(copy)}</h2></div>
      <span class="status active">Role filtered</span>
    </div>
  `;
}

function summary(label, value, detail, action) {
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button">${action}</button></article>`;
}

function mini(label, value) {
  return `<div class="mini-fact"><span>${label}</span><strong>${escapeHtml(String(value || "None"))}</strong></div>`;
}

function chartCard(title, labels, values) {
  const max = Math.max(...values, 1);
  return `<section class="panel"><h2>${title}</h2><div class="bar-chart">${labels.map((label, index) => `<div><span>${label}</span><b style="width:${Math.max(8, values[index] / max * 100)}%"></b><strong>${values[index]}</strong></div>`).join("")}</div></section>`;
}

function activityPanel(title, rows) {
  return `<section class="panel"><h2>${title}</h2><ul class="activity-list">${rows.map((row) => `<li><strong>${row[0] || "Record"}</strong><span>${row[1] || ""}</span><em>${row[2] || "Pending"}</em></li>`).join("") || `<li><strong>No records yet</strong><span>Refresh the page to try again.</span><em>Empty</em></li>`}</ul></section>`;
}

function recordTable(title, rows, columns) {
  const filtered = filterRows(rows || []);
  return `
    <section class="panel">
      <div class="panel-heading"><h2>${title}</h2><span>${filtered.length} record(s)</span></div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${labelize(column)}</th>`).join("")}<th>Actions</th></tr></thead>
            <tbody>${filtered.slice(0, 12).map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : emptyState("No records found", "Use refresh, adjust filters, or add the first record where your role allows it.")}
    </section>
  `;
}

function rowAction(row) {
  if (row.action && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="${escapeHtml(row.action)}" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "View")}</button>`;
  }
  return `<button class="table-action" type="button">View</button>`;
}

function filterToolbar(placeholder, primary, secondary) {
  return `
    <section class="filter-toolbar">
      <label><span>Search</span><input value="${escapeHtml(state.search)}" data-search-input placeholder="${placeholder}"></label>
      <label><span>Status</span><select><option>All statuses</option><option>Active</option><option>Pending</option><option>Failed</option></select></label>
      <label><span>Date range</span><input type="date"></label>
      <button class="button primary" type="button">${primary}</button>
      <button class="button secondary" type="button">${secondary}</button>
    </section>
  `;
}

function wizardCard(title, steps) {
  return `<section class="panel"><h2>${title}</h2><div class="stepper">${steps.map((step, index) => `<div><span>${index + 1}</span><strong>${step}</strong></div>`).join("")}</div></section>`;
}

function tabsCard(title, tabs) {
  return `<section class="panel"><h2>${title}</h2><div class="tabs">${tabs.map((tab, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</div><div class="blueprint">This screen follows the uploaded UI/UX requirement and is ready for deeper Java API actions, validation, confirmations and exports.</div></section>`;
}

function formPreview(title, fields) {
  return `<section class="panel"><h2>${title}</h2><div class="form-grid">${fields.map((item) => `<label><span>${item}</span><input placeholder="${item}"></label>`).join("")}</div><div class="form-actions"><button class="button secondary" type="button">Save draft</button><button class="button primary" type="button">Submit</button></div></section>`;
}

function addUserPanel(platformOnly) {
  const roles = userRoleOptions(platformOnly);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Add platform user</h2>
          <p>Create a platform administrator and assign the role that controls their views.</p>
        </div>
      </div>
      ${state.userFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.userFormMessage)}</strong></div>` : ""}
      ${state.userFormError ? `<div class="notice warning"><strong>Could not create user.</strong><span>${escapeHtml(state.userFormError)}</span></div>` : ""}
      <form id="addUserForm" class="form-grid">
        <input type="hidden" id="newUserTenantId" value="${platformOnly ? "tenant_platform" : escapeHtml(state.user?.tenantId || "")}">
        <label><span>Full name</span><input id="newUserFullName" required placeholder="e.g. Platform Support Officer"></label>
        <label><span>Email / username</span><input id="newUserEmail" type="email" required placeholder="name@tereka.online"></label>
        <label><span>Phone</span><input id="newUserPhone" placeholder="+256..."></label>
        <label><span>Temporary password</span><input id="newUserPassword" type="password" required minlength="10" placeholder="At least 10 characters"></label>
        <label><span>Role</span><select id="newUserRoleId" required>${roles.map((role) => `<option value="${escapeHtml(role.id)}">${escapeHtml(role.name)}</option>`).join("")}</select></label>
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
  const assigned = state.selectedUserRoles[0] || "";
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
      ${state.selectedUserError ? `<div class="notice warning"><strong>Role update failed.</strong><span>${escapeHtml(state.selectedUserError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Tenant", selected.tenantId === "tenant_platform" ? "Platform Administration" : selected.tenantId)}
        ${mini("Status", selected.status)}
        ${mini("Phone", selected.phone)}
        ${mini("User ID", selected.id)}
      </div>
      <form id="userRoleForm" class="form-grid single">
        <input type="hidden" id="selectedUserId" value="${escapeHtml(selected.id)}">
        <label>
          <span>Assigned platform role</span>
          <select id="selectedUserRoleId" ${canManageRoles ? "" : "disabled"}>
            ${roles.map((role) => `<option value="${escapeHtml(role.id)}" ${role.id === assigned ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}
          </select>
        </label>
        <div class="form-actions">
          ${canManageRoles ? `<button class="button primary" type="submit">Save role</button>` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function tenantDetailPanel() {
  const tenant = state.selectedTenant || tenantRows().find((item) => item.id === state.selectedTenantId);
  if (!tenant) return "";
  const profile = state.selectedTenantProfile || {};
  const canManage = hasPermission("tenants:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO application review</h2>
          <p>${escapeHtml(tenant.name || "Selected SACCO")} - code ${escapeHtml(tenant.abbreviation || tenant.id || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-tenant-detail">Close</button>
      </div>
      ${state.selectedTenantMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTenantMessage)}</strong></div>` : ""}
      ${state.selectedTenantError ? `<div class="notice warning"><strong>Application update failed.</strong><span>${escapeHtml(state.selectedTenantError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Activation state", tenantStatusLabel(tenant.status))}
        ${mini("SACCO code", tenant.abbreviation)}
        ${mini("District", tenant.district)}
        ${mini("Registration", tenant.registrationNo)}
        ${mini("License expiry", tenant.licenseExpiry)}
        ${mini("Onboarding", `${tenant.onboarding || 0}%`)}
        ${mini("Email", profile.email)}
        ${mini("Phone", profile.phone)}
      </div>
      <div class="grid two">
        ${recordTable("Registration profile", [profile], ["legalName", "tin", "umraLicenseNo", "cooperativeRegistrationNo", "address", "website"])}
        ${recordTable("Approval history", dataRows("auditEvents").filter((event) => event.recordReference === tenant.id || event.recordId === tenant.id), ["createdAt", "actor", "action", "module", "result"])}
      </div>
      <form id="tenantStatusForm" class="form-grid single">
        <input type="hidden" id="selectedTenantId" value="${escapeHtml(tenant.id)}">
        <label>
          <span>Approval decision</span>
          <select id="selectedTenantStatus" ${canManage ? "" : "disabled"}>
            ${tenantStatusOptions().map((option) => `<option value="${option.value}" ${option.value === tenant.status ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
        <div class="form-actions">
          ${canManage ? `
            <button class="button primary" type="submit">Save decision</button>
            <button class="button secondary" type="button" data-tenant-status="approved">Approve</button>
            <button class="button secondary" type="button" data-tenant-status="active">Activate</button>
            <button class="button secondary" type="button" data-tenant-status="pending_review">Request changes</button>
            <button class="button ghost" type="button" data-tenant-status="terminated">Reject</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function tenantStatusOptions() {
  return [
    { value: "pending_review", label: "Pending review / request changes" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active / operating" },
    { value: "suspended", label: "Suspended" },
    { value: "terminated", label: "Rejected / terminated" }
  ];
}

function tenantStatusLabel(status) {
  return tenantStatusOptions().find((option) => option.value === status)?.label || status || "Pending";
}

function subscriptionDetailPanel(rows) {
  const subscription = rows.find((item) => item.id === state.selectedSubscriptionId);
  if (!subscription) return "";
  const tenant = tenantRows().find((item) => item.id === subscription.tenantId) || {};
  const canManage = isPlatform() && (hasPermission("subscriptions:manage") || roleKind() === "super" || roleKind() === "billing");
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Subscription control</h2>
          <p>${escapeHtml(tenant.name || subscription.tenantId)} - invoice ${escapeHtml(subscription.invoice || subscription.id)}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-subscription-detail">Close</button>
      </div>
      ${state.selectedSubscriptionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedSubscriptionMessage)}</strong></div>` : ""}
      ${state.selectedSubscriptionError ? `<div class="notice warning"><strong>Subscription update failed.</strong><span>${escapeHtml(state.selectedSubscriptionError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Operating access", subscriptionAccessLabel(subscription, tenant))}
        ${mini("Subscription status", subscription.status)}
        ${mini("Package", subscription.tierLabel || subscription.packageId)}
        ${mini("Billable members", subscription.billableMembers || subscription.memberCount)}
        ${mini("Amount", money.format(subscription.amount || 0))}
        ${mini("Paid", money.format(subscription.paid || 0))}
        ${mini("Balance due", money.format(due))}
        ${mini("Expiry", subscription.expiry)}
      </div>
      <form id="subscriptionPaymentForm" class="form-grid">
        <input type="hidden" id="selectedSubscriptionId" value="${escapeHtml(subscription.id)}">
        <input type="hidden" id="selectedSubscriptionTenantId" value="${escapeHtml(subscription.tenantId)}">
        <label><span>Payment amount</span><input id="subscriptionPaymentAmount" type="number" min="1" step="1" value="${due || subscription.amount || 0}" ${canManage ? "" : "disabled"}></label>
        <label><span>Payment channel</span><select id="subscriptionPaymentChannel" ${canManage ? "" : "disabled"}><option value="manual">Manual</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option></select></label>
        <label><span>Reference</span><input id="subscriptionPaymentReference" value="PAY-${Date.now()}" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManage ? `
            <button class="button primary" type="submit">Record payment</button>
            <button class="button secondary" type="button" data-subscription-action="renew">Renew full year</button>
            <button class="button secondary" type="button" data-subscription-action="activate-tenant">Activate access</button>
            <button class="button ghost" type="button" data-subscription-action="suspend-tenant">Suspend access</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function subscriptionAccessLabel(subscription, tenant) {
  if (normal(tenant.status).includes("suspended")) return "Suspended";
  if (normal(subscription.status) === "active" && normal(tenant.status) === "active") return "Active";
  if (normal(subscription.status).includes("pending")) return "Payment pending";
  if (normal(subscription.status).includes("expired")) return "Expired";
  return subscription.status || tenant.status || "Pending";
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

function packageCards() {
  const packages = dataRows("subscriptionPackages");
  return `<section class="panel"><h2>Subscription package configuration</h2><div class="package-grid">${(packages.length ? packages : fallbackPackages()).map((pkg) => `<article><h3>${pkg.name}</h3><strong>${money.format(pkg.price || pkg.amount || 0)}</strong><p>${pkg.maxMembers || pkg.members || "Configured"} members / ${pkg.maxBranches || pkg.branches || "Configured"} branches</p><span>${pkg.modules || "Included modules, SMS, storage and support level"}</span><button class="button secondary" type="button">Configure</button></article>`).join("")}</div></section>`;
}

function permissionMatrix() {
  const modules = isPlatform() ? platformModules : saccoModules;
  return `<section class="panel"><h2>Permission matrix</h2><div class="permission-grid">${modules.slice(0, 10).map((item) => `<div><strong>${item[1]}</strong>${["View", "Create", "Edit", "Approve", "Export", "Manage"].map((action) => `<span>${action}</span>`).join("")}</div>`).join("")}</div></section>`;
}

function emptyState(title, detail) {
  return `<div class="empty-state"><strong>${title}</strong><p>${detail}</p></div>`;
}

function renderLoading(message) {
  setHtml(`<main class="loading-screen"><div class="loader"></div><h1>${message}</h1><p>Please wait while Tereka Online prepares your workspace.</p></main>`);
}

async function login(code, username, password) {
  state.loading = true;
  try {
    const staff = await tryStaffLogin(code, username, password);
    if (staff) {
      applyStaffSession(staff);
      localStorage.setItem(STAFF_TOKEN_KEY, staff.token);
      localStorage.removeItem(MEMBER_TOKEN_KEY);
      await refreshAll();
      return;
    }
    const member = await api("/member-auth/login", {
      method: "POST",
      body: JSON.stringify({ saccoCode: code, identifier: username, password })
    }, "");
    state.auth = "member";
    state.token = member.token;
    state.member = member.member;
    state.tenant = member.tenant;
    state.memberData.balances = member.balances;
    localStorage.setItem(MEMBER_TOKEN_KEY, member.token);
    localStorage.removeItem(STAFF_TOKEN_KEY);
    state.currentView = "home";
    await refreshMember();
  } finally {
    state.loading = false;
  }
}

async function tryStaffLogin(code, username, password) {
  try {
    return await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ saccoCode: code, username, password })
    }, "");
  } catch {
    return null;
  }
}

function applyStaffSession(session) {
  state.auth = "staff";
  state.token = session.token || state.token;
  state.user = session.user;
  state.roleNames = session.roleNames || [];
  state.permissionIds = session.permissionIds || [];
  state.tenant = session.tenant || null;
  state.currentView = visibleModules()[0]?.[0] || "dashboard";
}

async function refreshAll() {
  state.loading = true;
  state.lastError = "";
  renderShell();
  const endpoints = [
    ["tenants", "/tenants"],
    ["subscriptions", "/subscriptions"],
    ["subscriptionPackages", "/subscription-packages"],
    ["members", "/members"],
    ["transactions", "/financial-transactions"],
    ["loans", "/loans"],
    ["operations", "/operations/status"],
    ["notifications", "/notifications/deliveries"],
    ["complaints", "/complaints"],
    ["users", "/users"],
    ["branches", "/branches"],
    ["financialProducts", "/financial-products"],
    ["financialAccounts", "/financial-accounts"],
    ["welfareClaims", "/welfare-claims"],
    ["accountingPeriods", "/accounting-periods"],
    ["chartOfAccounts", "/chart-of-accounts"],
    ["journalEntries", "/journal-entries"],
    ["suppliers", "/suppliers"],
    ["expenses", "/expenses"],
    ["assets", "/assets"],
    ["statementLines", "/statement-lines"],
    ["reconciliation", "/reconciliation"],
    ["mobileMoneyCallbacks", "/integrations/mobile-money/callbacks"],
    ["notificationTemplates", "/notification-templates"],
    ["roles", "/roles"],
    ["permissions", "/permissions"],
    ["auditEvents", "/audit-events"],
    ["regulatoryReport", "/regulatory-report"]
  ];
  const objectKeys = new Set(["operations", "regulatoryReport", "reconciliation"]);
  const results = await Promise.all(endpoints.map(async ([key, path]) => [key, await optionalApi(path, objectKeys.has(key) ? null : [])]));
  results.forEach(([key, value]) => {
    state.data[key] = value;
  });
  state.lastSync = new Date().toISOString();
  state.loading = false;
  renderShell();
}

async function refreshMember() {
  state.loading = true;
  state.lastError = "";
  renderShell();
  const dashboard = await optionalApi("/member-auth/mobile-dashboard", null);
  state.memberData.dashboard = dashboard || {};
  state.memberData.balances = dashboard?.balances || state.memberData.balances;
  state.memberData.loans = dashboard?.loans || [];
  state.memberData.notifications = dashboard?.notifications || [];
  state.memberData.pendingGuarantors = dashboard?.pendingGuarantorRequests || dashboard?.pendingGuarantors || [];
  state.memberData.complaints = await optionalApi("/member-auth/complaints", []);
  state.lastSync = new Date().toISOString();
  state.loading = false;
  renderShell();
}

async function createUserFromForm(event) {
  event.preventDefault();
  state.userFormMessage = "";
  state.userFormError = "";
  const submit = event.currentTarget.querySelector("button[type='submit']");
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Creating...";
  }
  try {
    const roleId = value("newUserRoleId");
    const created = await api("/users", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newUserTenantId"),
        fullName: value("newUserFullName"),
        email: value("newUserEmail"),
        phone: value("newUserPhone"),
        password: value("newUserPassword")
      })
    });
    if (roleId) {
      try {
        await api(`/users/${encodeURIComponent(created.id)}/roles`, {
          method: "PUT",
          body: JSON.stringify({ roleIds: [roleId] })
        });
      } catch (roleError) {
        state.userFormError = `User was created, but role assignment needs review: ${roleError.message}`;
      }
    }
    state.userFormMessage = state.userFormError ? `Created ${created.fullName || created.email}.` : `Created ${created.fullName || created.email} and assigned role.`;
    await refreshAll();
  } catch (error) {
    state.userFormError = error.message;
    renderShell();
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Create user";
    }
  }
}

async function openUserDetail(userId) {
  state.selectedUserId = userId;
  state.selectedUserRoles = [];
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  state.selectedUserLoading = true;
  renderShell();
  try {
    const assignment = await api(`/users/${encodeURIComponent(userId)}/roles`);
    state.selectedUserRoles = assignment.roleIds || [];
  } catch (error) {
    state.selectedUserError = error.message;
  } finally {
    state.selectedUserLoading = false;
    renderShell();
  }
}

async function saveSelectedUserRole(event) {
  event.preventDefault();
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  const userId = value("selectedUserId");
  const roleId = value("selectedUserRoleId");
  try {
    const assignment = await api(`/users/${encodeURIComponent(userId)}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roleIds: [roleId] })
    });
    state.selectedUserRoles = assignment.roleIds || [roleId];
    state.selectedUserMessage = "Role assignment saved.";
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserRoles = assignment.roleIds || [roleId];
    state.selectedUserMessage = "Role assignment saved.";
    renderShell();
  } catch (error) {
    state.selectedUserError = error.message;
    renderShell();
  }
}

async function openTenantDetail(tenantId) {
  state.selectedTenantId = tenantId;
  state.selectedTenant = null;
  state.selectedTenantProfile = null;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  renderShell();
  try {
    const [tenant, profile] = await Promise.all([
      api(`/tenants/${encodeURIComponent(tenantId)}`),
      optionalApi(`/tenants/${encodeURIComponent(tenantId)}/profile`, null)
    ]);
    state.selectedTenant = tenant;
    state.selectedTenantProfile = profile || {};
  } catch (error) {
    state.selectedTenantError = error.message;
  }
  renderShell();
}

async function saveTenantStatus(status) {
  const tenantId = value("selectedTenantId") || state.selectedTenantId;
  if (!tenantId || !status) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const tenant = await api(`/tenants/${encodeURIComponent(tenantId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.selectedTenant = tenant;
    state.selectedTenantId = tenant.id;
    state.selectedTenantMessage = `SACCO status updated to ${tenantStatusLabel(tenant.status)}.`;
    await refreshAll();
    state.selectedTenant = tenant;
    state.selectedTenantId = tenant.id;
    state.selectedTenantMessage = `SACCO status updated to ${tenantStatusLabel(tenant.status)}.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = error.message;
    renderShell();
  }
}

function openSubscriptionDetail(subscriptionId) {
  state.selectedSubscriptionId = subscriptionId;
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  renderShell();
}

async function recordSubscriptionPayment(amountOverride = null) {
  const subscriptionId = value("selectedSubscriptionId") || state.selectedSubscriptionId;
  const subscription = dataRows("subscriptions").find((item) => item.id === subscriptionId);
  if (!subscription) return;
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  const amount = amountOverride ?? Number(value("subscriptionPaymentAmount") || due || subscription.amount || 0);
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  try {
    const result = await api(`/subscriptions/${encodeURIComponent(subscriptionId)}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        channel: value("subscriptionPaymentChannel") || "manual",
        externalReference: value("subscriptionPaymentReference") || `PAY-${Date.now()}`
      })
    });
    state.selectedSubscriptionMessage = `${result.idempotent ? "Existing payment found" : "Payment recorded"}: ${money.format(result.payment?.amount || amount)}.`;
    await refreshAll();
    state.selectedSubscriptionId = result.subscription?.id || subscriptionId;
    state.selectedSubscriptionMessage = `${result.idempotent ? "Existing payment found" : "Payment recorded"}: ${money.format(result.payment?.amount || amount)}.`;
    renderShell();
  } catch (error) {
    state.selectedSubscriptionError = error.message;
    renderShell();
  }
}

async function runSubscriptionAction(action) {
  const subscriptionId = state.selectedSubscriptionId;
  const subscription = dataRows("subscriptions").find((item) => item.id === subscriptionId);
  if (!subscription) return;
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  if (action === "renew") {
    await recordSubscriptionPayment(due || Number(subscription.amount || 0));
    return;
  }
  const tenantStatus = action === "suspend-tenant" ? "suspended" : "active";
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  try {
    await api(`/tenants/${encodeURIComponent(subscription.tenantId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: tenantStatus })
    });
    state.selectedSubscriptionMessage = tenantStatus === "active" ? "SACCO operating access activated." : "SACCO operating access suspended.";
    await refreshAll();
    state.selectedSubscriptionId = subscriptionId;
    state.selectedSubscriptionMessage = tenantStatus === "active" ? "SACCO operating access activated." : "SACCO operating access suspended.";
    renderShell();
  } catch (error) {
    state.selectedSubscriptionError = error.message;
    renderShell();
  }
}

async function optionalApi(path, fallback) {
  try {
    return await api(path);
  } catch (error) {
    if (![401, 403].includes(error.status)) state.lastError = error.message;
    return fallback;
  }
}

async function api(path, options = {}, token = state.token) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload.data ?? payload;
}

function bindEvents() {
  document.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("loginButton");
    const error = document.getElementById("loginError");
    button.disabled = true;
    button.textContent = "Checking...";
    error.hidden = true;
    try {
      await login(value("code"), value("username"), value("password"));
    } catch (loginError) {
      error.textContent = "Invalid code, username, or password.";
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = "Login";
    }
  });
  document.querySelectorAll("[data-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      const account = demoAccounts[Number(button.dataset.demo)];
      document.getElementById("code").value = account.code;
      document.getElementById("username").value = account.username;
      document.getElementById("password").value = account.password;
    });
  });
  document.querySelector("[data-action='fill-demo']")?.addEventListener("click", () => {
    const account = demoAccounts[Number(document.getElementById("demoAccountSelect")?.value || 0)];
    if (!account) return;
    document.getElementById("code").value = account.code;
    document.getElementById("username").value = account.username;
    document.getElementById("password").value = account.password;
  });
  document.querySelector("[data-action='toggle-password']")?.addEventListener("click", (event) => {
    const password = document.getElementById("password");
    if (!password) return;
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    event.currentTarget.textContent = showing ? "Show" : "Hide";
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.view;
      renderShell();
    });
  });
  document.querySelectorAll("[data-row-action='user-detail']").forEach((button) => {
    button.addEventListener("click", () => openUserDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='tenant-detail']").forEach((button) => {
    button.addEventListener("click", () => openTenantDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='subscription-detail']").forEach((button) => {
    button.addEventListener("click", () => openSubscriptionDetail(button.dataset.rowId));
  });
  document.querySelector("[data-action='close-user-detail']")?.addEventListener("click", () => {
    state.selectedUserId = "";
    state.selectedUserRoles = [];
    state.selectedUserMessage = "";
    state.selectedUserError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-tenant-detail']")?.addEventListener("click", () => {
    state.selectedTenantId = "";
    state.selectedTenant = null;
    state.selectedTenantProfile = null;
    state.selectedTenantMessage = "";
    state.selectedTenantError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-subscription-detail']")?.addEventListener("click", () => {
    state.selectedSubscriptionId = "";
    state.selectedSubscriptionMessage = "";
    state.selectedSubscriptionError = "";
    renderShell();
  });
  document.querySelector("#addUserForm")?.addEventListener("submit", createUserFromForm);
  document.querySelector("#userRoleForm")?.addEventListener("submit", saveSelectedUserRole);
  document.querySelector("#tenantStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveTenantStatus(value("selectedTenantStatus"));
  });
  document.querySelector("#subscriptionPaymentForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    recordSubscriptionPayment();
  });
  document.querySelectorAll("[data-tenant-status]").forEach((button) => {
    button.addEventListener("click", () => saveTenantStatus(button.dataset.tenantStatus));
  });
  document.querySelectorAll("[data-subscription-action]").forEach((button) => {
    button.addEventListener("click", () => runSubscriptionAction(button.dataset.subscriptionAction));
  });
  document.querySelectorAll("[data-action='refresh']").forEach((button) => button.addEventListener("click", refreshAll));
  document.querySelectorAll("[data-action='refresh-member']").forEach((button) => button.addEventListener("click", refreshMember));
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", logout));
  document.querySelectorAll("[data-action='toggle-sidebar']").forEach((button) => button.addEventListener("click", () => document.querySelector(".app-shell")?.classList.toggle("sidebar-open")));
  document.querySelectorAll("#globalSearch,[data-search-input]").forEach((input) => input.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderShell();
  }));
}

async function logout() {
  const staff = state.auth === "staff";
  try {
    if (state.token) await api(staff ? "/auth/logout" : "/member-auth/logout");
  } catch {}
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(MEMBER_TOKEN_KEY);
  Object.assign(state, {
    auth: "none",
    token: "",
    user: null,
    member: null,
    tenant: null,
    roleNames: [],
    permissionIds: [],
    currentView: "dashboard",
    userFormMessage: "",
    userFormError: "",
    selectedUserId: "",
    selectedUserRoles: [],
    selectedUserMessage: "",
    selectedUserError: "",
    selectedTenantId: "",
    selectedTenant: null,
    selectedTenantProfile: null,
    selectedTenantMessage: "",
    selectedTenantError: "",
    selectedSubscriptionId: "",
    selectedSubscriptionMessage: "",
    selectedSubscriptionError: "",
    data: emptyData(),
    memberData: emptyMemberData()
  });
  renderLogin();
}

function runtimeNotice() {
  if (state.loading) return `<section class="notice compact"><strong>Loading latest records...</strong><span>Please wait while Tereka Online refreshes this view.</span></section>`;
  if (state.lastError) return `<section class="notice warning"><strong>Some records could not be loaded.</strong><span>${escapeHtml(state.lastError)}</span><button class="button secondary" type="button" data-action="${state.auth === "member" ? "refresh-member" : "refresh"}">Retry</button></section>`;
  return "";
}

function dataRows(key) {
  const value = state.data[key];
  return Array.isArray(value) ? value : [];
}

function tenantRows() {
  return dataRows("tenants").filter((tenant) => tenant.id !== "tenant_platform");
}

function pendingTenants() {
  return tenantRows().filter((tenant) => normal(tenant.status).includes("pending") || normal(tenant.status).includes("review"));
}

function platformUsers() {
  return dataRows("users").filter((user) => user.tenantId === "tenant_platform");
}

function openComplaints() {
  return dataRows("complaints").filter((complaint) => !["closed", "resolved", "cancelled"].includes(normal(complaint.status)));
}

function pendingTransactions() {
  return dataRows("transactions").filter((transaction) => normal(transaction.status).includes("pending") || normal(transaction.stage).includes("approval"));
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
  const q = state.search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

function operationAlerts() {
  const operations = state.data.operations || {};
  const alerts = operations.alerts || operations.integrationStatuses || [];
  return Array.isArray(alerts) && alerts.length ? alerts : [
    { title: "Database", provider: "PostgreSQL", severity: "Healthy", status: "Healthy", checkedAt: state.lastSync },
    { title: "Java API", provider: "Spring Boot", severity: "Healthy", status: "Healthy", checkedAt: state.lastSync },
    { title: "Mobile money callbacks", provider: "Provider gateway", severity: "Warning", status: "Pending", checkedAt: state.lastSync }
  ];
}

function fallbackPackages() {
  return [
    { name: "100-250 members", price: 500000, maxMembers: 250, maxBranches: 1, modules: "UGX 5,000 per member annually, minimum 100 members" },
    { name: "251-500 members", price: 1200000, maxMembers: 500, maxBranches: 2, modules: "Starter fixed billing" },
    { name: "501-2,500 members", price: 3600000, maxMembers: 2500, maxBranches: 5, modules: "Growth SACCO operations" },
    { name: "2,501-10,000 members", price: 9000000, maxMembers: 10000, maxBranches: 25, modules: "Enterprise support" }
  ];
}

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function field(label, id, type, placeholder, hint) {
  return `<label><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder || ""}" autocomplete="${type === "password" ? "current-password" : "on"}">${hint ? `<small>${hint}</small>` : ""}</label>`;
}

function logo(size = "") {
  return `<div class="logo ${size}" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 9h34v8H28v22h-8V17H7z"></path><path d="M31 22h10v17H31z"></path></svg></div>`;
}

function displayName() {
  return state.member?.fullName || state.user?.fullName || "User";
}

function roleLabel() {
  return state.auth === "member" ? "Member" : state.roleNames.join(", ") || "Staff";
}

function contextName() {
  return state.tenant?.name || (isPlatform() ? "Platform Administration" : state.user?.tenantName) || "Tereka Online";
}

function initials(name) {
  return String(name || "TO").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function labelize(value) {
  return String(value).replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function normal(value) {
  return String(value || "").toLowerCase();
}

function sum(rows, ...keys) {
  return rows.reduce((total, row) => total + Number(keys.map((key) => row[key]).find((item) => item !== undefined) || 0), 0);
}

function formatValue(row, column) {
  const value = row[column] ?? row[snake(column)] ?? row[camelFallback(column)] ?? "";
  if (column.toLowerCase().includes("amount") || column.toLowerCase().includes("balance") || ["debit", "credit"].includes(column)) return money.format(Number(value || 0));
  if (column.toLowerCase().includes("status") || column.toLowerCase().includes("severity")) return `<span class="status ${statusClass(value)}">${escapeHtml(String(value || "Pending"))}</span>`;
  return escapeHtml(String(value || "-"));
}

function snake(column) {
  return column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function camelFallback(column) {
  const aliases = {
    tenantName: "tenant",
    packageName: "package",
    expiryDate: "expiry",
    postedAt: "date",
    applicationNo: "id",
    requestedAmount: "amount",
    fullName: "name",
    membershipNo: "no",
    kycStatus: "kyc",
    savingsBalance: "savings",
    sharesBalance: "shares",
    welfareBalance: "welfare"
  };
  return aliases[column] || column;
}

function statusClass(value) {
  const text = normal(value);
  if (["active", "approved", "paid", "healthy", "resolved", "completed", "posted"].some((item) => text.includes(item))) return "active";
  if (["failed", "rejected", "suspended", "expired", "overdue", "arrears"].some((item) => text.includes(item))) return "danger";
  return "pending";
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

init();
