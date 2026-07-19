const API_BASE = "/api/v1";
const STAFF_TOKEN_KEY = "tereka-staff-token";
const MEMBER_TOKEN_KEY = "tereka-member-token";
const MEMBER_DRAFTS_KEY = "tereka-member-offline-drafts-v1";
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
  memberFormMessage: "",
  memberFormError: "",
  selectedMemberId: "",
  selectedMember: null,
  selectedMemberStatement: null,
  selectedMemberNextOfKin: [],
  selectedMemberBeneficiaries: [],
  selectedMemberDocuments: [],
  selectedMemberMessage: "",
  selectedMemberError: "",
  transactionFormMessage: "",
  transactionFormError: "",
  selectedTransactionId: "",
  selectedTransactionReceipt: null,
  selectedTransactionMessage: "",
  selectedTransactionError: "",
  loanFormMessage: "",
  loanFormError: "",
  selectedLoanId: "",
  selectedLoanGuarantors: [],
  selectedLoanRepayments: [],
  selectedLoanMessage: "",
  selectedLoanError: "",
  complaintFormMessage: "",
  complaintFormError: "",
  selectedComplaintId: "",
  selectedComplaintMessage: "",
  selectedComplaintError: "",
  notificationTemplateMessage: "",
  notificationTemplateError: "",
  selectedTemplateId: "",
  selectedTemplateMessage: "",
  selectedTemplateError: "",
  branchFormMessage: "",
  branchFormError: "",
  productFormMessage: "",
  productFormError: "",
  accountFormMessage: "",
  accountFormError: "",
  memberLoanMessage: "",
  memberLoanError: "",
  memberPaymentMessage: "",
  memberPaymentError: "",
  memberComplaintMessage: "",
  memberComplaintError: "",
  memberGuarantorMessage: "",
  memberGuarantorError: "",
  welfareClaimMessage: "",
  welfareClaimError: "",
  selectedWelfareClaimId: "",
  selectedWelfareClaimMessage: "",
  selectedWelfareClaimError: "",
  expenseFormMessage: "",
  expenseFormError: "",
  assetFormMessage: "",
  assetFormError: "",
  governanceMeetingMessage: "",
  governanceMeetingError: "",
  selectedMeetingId: "",
  selectedMeetingMessage: "",
  selectedMeetingError: "",
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
  ["governance", "Governance", "Meetings, minutes and resolutions", "governance:view", ["admin", "chairperson", "secretary"]],
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
    governanceMeetings: [],
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
    drafts: [],
    sessionExpiresAt: ""
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

function canAccessView(view) {
  return visibleModules().some((item) => item[0] === view);
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
    state.memberData.sessionExpiresAt = session.expiresAt || "";
    state.memberData.drafts = loadMemberDrafts(session.member);
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
    <div class="dashboard-grid">
      ${summaryLink("Total SACCOs", tenants.length, "All registered tenants", "Open applications", "sacco-applications")}
      ${summaryLink("Active SACCOs", tenants.filter((t) => normal(t.status) === "active").length, "Operational tenants", "View accounts", "sacco-accounts")}
      ${summaryLink("Pending registrations", tenants.filter((t) => normal(t.status).includes("pending")).length, "Reviewer queue", "Review", "sacco-applications")}
      ${summaryLink("Expired subscriptions", subs.filter((s) => normal(s.status).includes("expired")).length, "Billing risk", "Renew", "subscriptions")}
      ${summaryLink("Total platform members", members.length, "Across visible SACCOs", "Open members", "members")}
      ${summaryLink("Total subscription revenue", money.format(sum(subs, "amount")), "Current records", "Open billing", "subscriptions")}
      ${summaryLink("Pending support tickets", dataRows("complaints").filter((c) => !["closed", "resolved"].includes(normal(c.status))).length, "Support workload", "Open", "complaints")}
      ${summaryLink("Failed payment transactions", transactions.filter((t) => normal(t.status).includes("failed")).length, "Provider exceptions", "Investigate", "operations")}
      ${summaryLink("Active platform users", users.filter((user) => normal(user.status) === "active").length || users.length, "Administrators and roles", "Manage access", "users")}
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
    ${roleAccessPanel("SACCO role access")}
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
  const members = dataRows("members");
  const approvalLoans = loans.filter((row) => ["pending", "review", "approval", "submitted"].some((word) => normal(`${row.status} ${row.stage}`).includes(word)));
  const arrearsLoans = loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normal(`${row.status} ${row.riskLevel}`).includes(word)));
  const highValueTransactions = transactions.filter((row) => Number(row.amount || row.credit || row.debit || 0) >= 1000000);
  const governance = dataRows("governanceMeetings");
  return `
    ${dashboardIntro("SACCO Chairperson", "Oversight dashboard for approvals, portfolio health, governance actions and high-value exceptions.")}
    ${roleAccessPanel("Chairperson access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", members.length, "SACCO membership base", "Open", "members")}
      ${summaryLink("Loans awaiting approval", approvalLoans.length, "Chairperson approval queue", "Decide", "approvals")}
      ${summaryLink("Outstanding portfolio", money.format(sum(loans, "outstandingBalance", "balance")), "Credit exposure", "Review", "loans")}
      ${summaryLink("Arrears watch", arrearsLoans.length, "Loans requiring board attention", "Assess", "loans")}
      ${summaryLink("High-value transactions", highValueTransactions.length, "Large movements to review", "Review", "approvals")}
      ${summaryLink("Governance actions", governance.length, "Meetings and resolutions", "Open", "governance")}
    </div>
    ${rolePriorityPanel("Chairperson decision focus", [
      ["Approval discipline", `${approvalLoans.length} loan item(s) require board-level review before disbursement.`, approvalLoans.length ? "Pending" : "Clear"],
      ["Portfolio risk", `${arrearsLoans.length} loan account(s) are marked for arrears or default follow-up.`, arrearsLoans.length ? "Review" : "Healthy"],
      ["Member confidence", `${openComplaints().length} open complaint(s) may need leadership escalation.`, openComplaints().length ? "Follow up" : "Stable"]
    ])}
    <div class="grid two">
      ${recordTable("Chairperson approval queue", [...approvalLoans, ...pendingTransactions()], ["reference", "applicationNo", "memberName", "type", "requestedAmount", "amount", "status"])}
      ${recordTable("Board risk watch", [...arrearsLoans, ...highValueTransactions], ["applicationNo", "reference", "memberName", "product", "amount", "outstandingBalance", "status"])}
    </div>
  `;
}

function saccoTreasurerDashboard() {
  const transactions = dataRows("transactions");
  const callbacks = dataRows("mobileMoneyCallbacks");
  const accounts = dataRows("financialAccounts");
  const reconciliation = state.data.reconciliation || {};
  const expenses = dataRows("expenses");
  const cashAccounts = accounts.filter((row) => ["cash", "bank", "mobile"].some((word) => normal(`${row.accountType} ${row.productType} ${row.name}`).includes(word)));
  const failedCallbacks = callbacks.filter((row) => ["failed", "exception", "pending"].some((word) => normal(row.status).includes(word)));
  return `
    ${dashboardIntro("SACCO Treasurer", "Cash, collections, withdrawals, reconciliation and finance approvals for daily control.")}
    ${roleAccessPanel("Treasurer access")}
    <div class="dashboard-grid">
      ${summaryLink("Total savings", money.format(sum(dataRows("members"), "savingsBalance", "savings")), "Member deposits", "Statements", "savings")}
      ${summaryLink("Collections", money.format(sum(transactions.filter((row) => Number(row.credit || 0) > 0), "credit", "amount")), "Posted inflows", "Open", "transactions")}
      ${summaryLink("Withdrawals", money.format(sum(transactions.filter((row) => Number(row.debit || 0) > 0), "debit", "amount")), "Posted outflows", "Review", "transactions")}
      ${summaryLink("Pending finance approvals", pendingTransactions().length, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money exceptions", failedCallbacks.length, "Provider callbacks needing action", "Reconcile", "reconciliation")}
      ${summaryLink("Expenses posted", money.format(sum(expenses, "amount", "totalAmount")), "Operating spend", "Review", "accounting")}
    </div>
    ${rolePriorityPanel("Treasurer daily control", [
      ["Cash position", `${cashAccounts.length || accounts.length} account(s) available for cash, bank or mobile-money review.`, cashAccounts.length ? "Review" : "Setup"],
      ["Reconciliation", `${Number(reconciliation.unmatchedBankLines || reconciliation.unmatchedLedgerLines || 0)} unmatched item(s) reported by reconciliation data.`, Number(reconciliation.unmatchedBankLines || reconciliation.unmatchedLedgerLines || 0) ? "Match" : "Clear"],
      ["Payment exceptions", `${failedCallbacks.length} mobile-money callback(s) need follow-up before reports are final.`, failedCallbacks.length ? "Investigate" : "Clear"]
    ])}
    <div class="grid two">
      ${recordTable("Finance approval queue", pendingTransactions(), ["reference", "memberName", "type", "amount", "channel", "status"])}
      ${recordTable("Treasurer reconciliation watch", [...failedCallbacks, ...callbacks].slice(0, 12), ["externalReference", "provider", "purpose", "amount", "status", "receivedAt"])}
    </div>
  `;
}

function saccoSecretaryDashboard() {
  const members = dataRows("members");
  const pendingKyc = members.filter((row) => normal(row.kycStatus).includes("pending") || normal(row.status).includes("pending"));
  const governance = dataRows("governanceMeetings");
  const recentNotifications = dataRows("notifications");
  return `
    ${dashboardIntro("SACCO Secretary", "Membership, KYC, records, complaints and governance follow-up for the SACCO office.")}
    ${roleAccessPanel("Secretary access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", members.length, "Member register", "Open", "members")}
      ${summaryLink("Pending KYC", pendingKyc.length, "Needs verification", "Review", "members")}
      ${summaryLink("Open complaints", openComplaints().length, "Member support queue", "Assign", "complaints")}
      ${summaryLink("Governance records", governance.length, "Meetings and minutes", "Open", "governance")}
      ${summaryLink("Branches", dataRows("branches").length, "Service points", "View", "operations")}
      ${summaryLink("Notifications", recentNotifications.length, "Member communication", "Open", "reports")}
    </div>
    ${rolePriorityPanel("Secretary office focus", [
      ["KYC completion", `${pendingKyc.length} member profile(s) need verification or follow-up documents.`, pendingKyc.length ? "Pending" : "Clear"],
      ["Member cases", `${openComplaints().length} open complaint(s) require tracking notes or assignment.`, openComplaints().length ? "Follow up" : "Stable"],
      ["Governance records", `${governance.length} meeting record(s) are available for minutes and resolutions.`, governance.length ? "Maintain" : "Schedule"]
    ])}
    <div class="grid two">
      ${recordTable("Member follow-up list", pendingKyc.length ? pendingKyc : members, ["membershipNo", "fullName", "phone", "branchName", "kycStatus", "status"])}
      ${recordTable("Secretary governance and complaint follow-up", [...openComplaints(), ...governance], ["id", "memberName", "category", "subject", "scheduledAt", "priority", "status"])}
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
  const subscriptions = dataRows("subscriptions");
  const rows = tenantRows().map((tenant) => {
    const subscription = subscriptionForTenant(tenant.id);
    return {
      ...tenant,
      saccoCode: tenant.abbreviation || tenant.code || tenant.id,
      accountHealth: tenantAccountHealth(tenant, subscription),
      subscriptionStatus: subscription?.status || "No subscription",
      packageName: subscription?.tierLabel || subscription?.packageName || subscription?.packageId || "Not assigned",
      expiry: subscription?.expiry || subscription?.expiryDate || "",
      billableMembers: subscription?.billableMembers || subscription?.memberCount || tenant.memberCount || 0,
      action: "tenant-detail",
      actionLabel: "Open",
      actionId: tenant.id
    };
  });
  return `
    <div class="dashboard-grid">
      ${summary("Active accounts", rows.filter((row) => normal(row.status) === "active").length, "SACCOs allowed to operate", "Monitor")}
      ${summary("Suspended accounts", rows.filter((row) => normal(row.status).includes("suspended")).length, "Access disabled", "Review")}
      ${summary("Without subscription", rows.filter((row) => !subscriptions.some((sub) => sub.tenantId === row.id)).length, "Needs billing setup", "Assign")}
      ${summary("Expiring soon", rows.filter((row) => normal(row.subscriptionStatus).includes("expired") || normal(row.accountHealth).includes("risk")).length, "Billing and access risk", "Renew")}
    </div>
    ${filterToolbar("Search SACCO code, name, district, status, subscription or package", "Activate SACCO", "Export accounts")}
    ${tenantDetailPanel()}
    ${recordTable("SACCO account health", rows, ["saccoCode", "name", "district", "status", "accountHealth", "subscriptionStatus", "packageName", "billableMembers", "expiry"])}
  `;
}

function membersView() {
  const members = dataRows("members");
  const pendingKyc = members.filter((member) => normal(member.kycStatus).includes("pending") || normal(member.status).includes("pending"));
  const active = members.filter((member) => normal(member.status) === "active");
  const rows = members.map((member) => ({
    ...member,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    kycReadiness: memberKycReadiness(member),
    action: "member-detail",
    actionLabel: "Open profile",
    actionId: member.id
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Registered members", members.length, "Member register only, not staff users", "Review")}
      ${summary("Active members", active.length, "Can transact and use portal", "Monitor")}
      ${summary("Pending KYC", pendingKyc.length, "Needs document or approval follow-up", "Review")}
      ${summary("Total balances", money.format(sum(rows, "totalBalance")), "Savings, shares and welfare", "Statements")}
      ${summary("Portal-ready", rows.filter((member) => normal(member.status) === "active" && normal(member.kycStatus) === "verified").length, "Can use member login", "Audit")}
    </div>
    ${rolePriorityPanel("Member management focus", [
      ["Member and staff separation", "Members are managed here. SACCO staff logins are managed under Users and Roles.", "Clear"],
      ["KYC workflow", `${pendingKyc.length} member profile(s) need verification, document review or approval action.`, pendingKyc.length ? "Pending" : "Clear"],
      ["Balances and statements", "Open a member profile to review balances, contacts, beneficiaries, documents and statement lines.", "Ready"]
    ])}
    ${filterToolbar("Search by member number, name, phone, branch, KYC or status", "Register member", "Download statement")}
    ${memberRegistrationPanel()}
    ${memberDetailPanel()}
    ${recordTable("Member list", rows, ["membershipNo", "fullName", "phone", "email", "totalBalance", "kycReadiness", "kycStatus", "status"])}
  `;
}

function transactionsView() {
  const rows = transactionRows();
  const pending = rows.filter((row) => normal(row.status).includes("pending"));
  const posted = rows.filter((row) => normal(row.status) === "posted");
  const reversed = rows.filter((row) => row.originalTransactionId || normal(row.status).includes("reversed"));
  return `
    <div class="dashboard-grid">
      ${summary("Transactions", rows.length, "Deposits, withdrawals and corrections", "Review")}
      ${summary("Pending approval", pending.length, "Maker-checker queue", "Approve")}
      ${summary("Posted value", money.format(sum(posted, "amount")), "Receipt-ready transactions", "Receipts")}
      ${summary("Reversals", reversed.length, "Corrections with reason trail", "Audit")}
      ${summary("Mobile money", money.format(sum(rows.filter((row) => normal(row.channel).includes("mobile")), "amount")), "Provider channel", "Reconcile")}
    </div>
    ${rolePriorityPanel("Transaction control focus", [
      ["Maker-checker", `${pending.length} transaction(s) are waiting for Treasurer/Admin approval.`, pending.length ? "Pending" : "Clear"],
      ["Receipts", `${posted.length} posted transaction(s) can produce member receipts.`, posted.length ? "Ready" : "Pending"],
      ["Reversals", "Posted original transactions require a reason before reversal is created.", "Controlled"]
    ])}
    ${filterToolbar("Search by reference, member, channel, status, amount or user", "New transaction", "Print receipt")}
    ${transactionFormPanel()}
    ${transactionDetailPanel(rows)}
    ${recordTable("Transaction list", rows, ["reference", "postedAt", "memberName", "type", "channel", "amount", "approvalReadiness", "receiptStatus", "reversalStatus", "status"])}
  `;
}

function loansView() {
  const loans = dataRows("loans").map((loan) => ({
    ...loan,
    memberName: loan.memberName || memberName(loan.memberId),
    requestedAmount: loan.requestedAmount || loan.amount,
    outstandingBalance: loan.outstandingBalance || loan.balance,
    action: "loan-detail",
    actionLabel: "Review",
    actionId: loan.id
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Active loans", loans.filter((l) => normal(l.status) === "active").length, "Current portfolio", "Open")}
      ${summary("Outstanding principal", money.format(sum(loans, "outstandingBalance", "balance")), "Portfolio balance", "Review")}
      ${summary("Awaiting approval", loans.filter((l) => normal(l.status).includes("review") || normal(l.status).includes("submitted")).length, "Decision queue", "Approve")}
      ${summary("Portfolio at risk", "Review", "Arrears and DSR risk", "Report")}
    </div>
    ${loanApplicationPanel()}
    ${loanDetailPanel(loans)}
    ${recordTable("Loan application list", loans, ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "repaymentMonths", "guarantors", "stage", "status"])}
  `;
}

function approvalsView() {
  const transactions = transactionRows().filter((row) => normal(row.status).includes("pending"));
  const loans = isPlatform() ? [] : dataRows("loans").filter((row) => normal(row.status).includes("review") || normal(row.status).includes("submitted")).map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Review loan", actionId: row.id }));
  const members = isPlatform() ? [] : dataRows("members").filter((row) => normal(row.status).includes("pending")).map((row) => ({ ...row, type: "member_kyc", amount: 0, memberName: row.fullName, action: "member-detail", actionLabel: "Review member", actionId: row.id }));
  const queue = [...transactions, ...loans, ...members];
  return `
    <div class="dashboard-grid">
      ${summary("Pending member approvals", members.length, "KYC and onboarding", "Review")}
      ${summary(isPlatform() ? "Pending platform approvals" : "Pending loan approvals", loans.length, isPlatform() ? "Tenant and support workflow" : "Credit workflow", "Review")}
      ${summary("Pending transactions", transactions.length, "Finance maker-checker", "Review")}
      ${summary("Total approval queue", queue.length, "Role-filtered work list", "Open")}
    </div>
    ${rolePriorityPanel("Approval decision center", [
      ["Transaction approvals", `${transactions.length} transaction(s) require finance review before posting.`, transactions.length ? "Pending" : "Clear"],
      ["Loan approvals", `${loans.length} loan application(s) require credit or chairperson decision.`, loans.length ? "Pending" : "Clear"],
      ["Member approvals", `${members.length} member profile(s) require KYC or activation decision.`, members.length ? "Pending" : "Clear"]
    ])}
    ${recordTable("Approval queue", queue, ["reference", "applicationNo", "membershipNo", "memberName", "type", "amount", "stage", "approvalReadiness", "status"])}
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
  const platform = isPlatform();
  const rows = regulatoryReportRows(platform);
  const consolidated = regulatoryConsolidated(rows);
  const catalogue = reportCatalogue(platform);
  return `
    <div class="dashboard-grid">
      ${summary(platform ? "Reporting SACCOs" : "Members in report", platform ? rows.length : consolidated.memberCount, platform ? "Regulatory rows available" : "Active and inactive members", "Review")}
      ${summary("Savings reported", money.format(consolidated.savings || 0), "Member deposit balances", "Export")}
      ${summary(platform ? "Subscription revenue" : "Loan portfolio", money.format(platform ? sum(dataRows("subscriptions"), "amount") : consolidated.loanPortfolio || 0), platform ? "Billing reports" : "Credit exposure", "Open")}
      ${summary("Compliance exceptions", Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0), "Reconciliation and journal checks", "Investigate")}
    </div>
    ${filterToolbar(platform ? "Search reports by SACCO, module, compliance status or export type" : "Search reports by module, member group, product or compliance status", "Export report", "Schedule report")}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report catalogue</h2>
          <p>${platform ? "Platform reports focus on tenants, subscriptions, operations, compliance and audit evidence." : "SACCO reports focus on members, finance, accounting, governance and statutory evidence."}</p>
        </div>
        <span>${catalogue.length} report group(s)</span>
      </div>
      <div class="report-grid">
        ${catalogue.map((report) => `
          <article class="report-card">
            <h3>${escapeHtml(report.title)}</h3>
            <p>${escapeHtml(report.copy)}</p>
            <div class="mini-grid">
              ${mini("Owner", report.owner)}
              ${mini("Output", report.output)}
            </div>
            <button class="button secondary" type="button">${escapeHtml(report.action)}</button>
          </article>
        `).join("")}
      </div>
    </section>
    ${reportReadinessPanel(consolidated)}
    ${recordTable(platform ? "Platform regulatory report" : "SACCO regulatory report", rows, platform
      ? ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "loanPortfolio", "reconciliationExceptions", "openComplaints", "complianceStatus"]
      : ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "loanPortfolio", "activeLoans", "expenseTotal", "assetNetBookValue", "complianceStatus"])}
  `;
}

function regulatoryReportRows(platform) {
  const report = state.data.regulatoryReport || {};
  const rawRows = Array.isArray(report.reports) ? report.reports : [];
  const rows = rawRows.length ? rawRows : tenantRows().map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    memberCount: dataRows("members").filter((member) => member.tenantId === tenant.id).length,
    activeMembers: dataRows("members").filter((member) => member.tenantId === tenant.id && normal(member.status) === "active").length,
    savings: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "savingsBalance", "savings"),
    shares: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "sharesBalance", "shares"),
    welfare: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "welfareBalance", "welfare"),
    loanPortfolio: sum(dataRows("loans").filter((loan) => loan.tenantId === tenant.id), "outstandingBalance", "balance", "amount"),
    activeLoans: dataRows("loans").filter((loan) => loan.tenantId === tenant.id && !["rejected", "closed"].includes(normal(loan.status))).length,
    expenseTotal: sum(dataRows("expenses").filter((expense) => expense.tenantId === tenant.id), "amount"),
    assetNetBookValue: sum(dataRows("assets").filter((asset) => asset.tenantId === tenant.id), "netBookValue", "cost"),
    reconciliationExceptions: 0,
    openComplaints: dataRows("complaints").filter((complaint) => complaint.tenantId === tenant.id && !["resolved", "closed"].includes(normal(complaint.status))).length,
    complianceStatus: "local fallback"
  }));
  const scopedRows = platform ? rows : rows.filter((row) => !row.tenantId || row.tenantId === state.currentTenantId);
  return scopedRows.map((row) => ({
    ...row,
    tenantName: row.tenantName || tenantName(row.tenantId)
  }));
}

function regulatoryConsolidated(rows) {
  const report = state.data.regulatoryReport || {};
  if (report.consolidated && (isPlatform() || report.consolidated.tenantId === state.currentTenantId || report.reports?.length === 1)) {
    return report.consolidated;
  }
  return {
    memberCount: sum(rows, "memberCount"),
    activeMembers: sum(rows, "activeMembers"),
    savings: sum(rows, "savings"),
    shares: sum(rows, "shares"),
    welfare: sum(rows, "welfare"),
    loanPortfolio: sum(rows, "loanPortfolio"),
    activeLoans: sum(rows, "activeLoans"),
    expenseTotal: sum(rows, "expenseTotal"),
    assetNetBookValue: sum(rows, "assetNetBookValue"),
    journalEntries: sum(rows, "journalEntries"),
    unbalancedJournalEntries: sum(rows, "unbalancedJournalEntries"),
    reconciliationExceptions: sum(rows, "reconciliationExceptions"),
    openComplaints: sum(rows, "openComplaints"),
    openResolutions: sum(rows, "openResolutions"),
    complianceStatus: rows.some((row) => normal(row.complianceStatus) !== "clear") ? "review" : "clear"
  };
}

function reportCatalogue(platform) {
  if (platform) {
    return [
      { title: "SACCO registration", copy: "Applications, approval turnaround, active tenants and onboarding exceptions.", owner: "Operations", output: "PDF / Excel", action: "Open applications" },
      { title: "Subscriptions", copy: "Packages, billable members, received payments, arrears and renewal risk.", owner: "Billing", output: "Invoice pack", action: "Open billing" },
      { title: "Transactions", copy: "Platform-wide transaction monitoring without exposing SACCO-only loan workflows.", owner: "Operations", output: "Excel", action: "Open transactions" },
      { title: "Operations", copy: "Health checks, provider callbacks, scheduled jobs and support workload.", owner: "Support", output: "Dashboard export", action: "Open operations" },
      { title: "Compliance", copy: "Regulatory consolidation, reconciliation exceptions and tenant evidence status.", owner: "Compliance", output: "Regulatory file", action: "Open evidence" },
      { title: "Audit", copy: "Sensitive activity, login history, password reset requests and role changes.", owner: "Compliance", output: "Audit pack", action: "Open audit" }
    ];
  }
  return [
    { title: "Membership", copy: "Member register, KYC status, contacts, beneficiaries and branch distribution.", owner: "Secretary", output: "Excel / PDF", action: "Open members" },
    { title: "Savings", copy: "Savings products, member deposits, withdrawals and dormant account positions.", owner: "Treasurer", output: "Statement pack", action: "Open savings" },
    { title: "Shares", copy: "Share capital, member share accounts, contribution cycles and ownership totals.", owner: "Treasurer", output: "Share register", action: "Open shares" },
    { title: "Welfare", copy: "Welfare contributions, claims, approvals, payment status and fund exposure.", owner: "Committee", output: "Claims report", action: "Open welfare" },
    { title: "Loans", copy: "Applications, guarantors, repayments, arrears, PAR and portfolio balances.", owner: "Credit", output: "Portfolio report", action: "Open loans" },
    { title: "Accounting", copy: "Chart of accounts, expenses, assets, journals and trial-balance readiness.", owner: "Accountant", output: "Ledger pack", action: "Open accounting" },
    { title: "Governance", copy: "Meetings, resolutions, action owners and committee follow-up status.", owner: "Chairperson", output: "Governance pack", action: "Open governance" },
    { title: "Audit", copy: "User activity, approvals, reversals and high-risk operational events.", owner: "Auditor", output: "Audit pack", action: "Open audit" }
  ];
}

function reportReadinessPanel(consolidated) {
  const exceptions = Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report readiness</h2>
          <p>Evidence checks before exporting board, regulator or management reports.</p>
        </div>
        <span class="status ${exceptions ? "pending" : "active"}">${exceptions ? "Review needed" : "Ready"}</span>
      </div>
      <div class="source-grid">
        ${mini("Ledger entries", consolidated.journalEntries || 0)}
        ${mini("Unbalanced journals", consolidated.unbalancedJournalEntries || 0)}
        ${mini("Reconciliation exceptions", consolidated.reconciliationExceptions || 0)}
        ${mini("Open complaints", consolidated.openComplaints || 0)}
        ${mini("Open resolutions", consolidated.openResolutions || 0)}
        ${mini("Compliance status", consolidated.complianceStatus || "review")}
      </div>
    </section>
  `;
}

function complaintsView() {
  const rows = dataRows("complaints").map((complaint) => ({
    ...complaint,
    tenantName: tenantName(complaint.tenantId),
    memberName: complaint.memberId ? memberName(complaint.memberId) : "SACCO-level case",
    assignedOfficer: userName(complaint.assignedUserId),
    action: "complaint-detail",
    actionLabel: "Review",
    actionId: complaint.id
  }));
  const open = rows.filter((row) => !["closed", "resolved"].includes(normal(row.status)));
  return `
    <div class="dashboard-grid">
      ${summary("Open complaints", open.length, "Support workload", "Assign")}
      ${summary("Urgent complaints", rows.filter((row) => normal(row.priority) === "urgent").length, "Needs same-day action", "Escalate")}
      ${summary("In progress", rows.filter((row) => normal(row.status) === "in_progress").length, "Being handled", "Track")}
      ${summary("Resolved", rows.filter((row) => normal(row.status) === "resolved" || normal(row.status) === "closed").length, "Closed support cases", "Review")}
    </div>
    ${filterToolbar("Search complaints by SACCO, member, category, priority, status or officer", "New complaint", "Assign officer")}
    ${complaintCapturePanel()}
    ${complaintDetailPanel(rows)}
    ${recordTable(isPlatform() ? "Platform support desk" : "Complaint list", rows, ["tenantName", "memberName", "category", "subject", "assignedOfficer", "priority", "status", "createdAt"])}
  `;
}

function notificationsView() {
  const deliveries = dataRows("notifications").map((delivery) => ({
    ...delivery,
    tenantName: tenantName(delivery.tenantId),
    memberName: delivery.memberId ? memberName(delivery.memberId) : "SACCO broadcast"
  }));
  const templates = dataRows("notificationTemplates").map((template) => ({
    ...template,
    tenantName: template.tenantId ? tenantName(template.tenantId) : "Global template",
    action: "template-detail",
    actionLabel: "Edit",
    actionId: template.id
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Deliveries", deliveries.length, "SMS, email and in-app events", "Monitor")}
      ${summary("Failed deliveries", deliveries.filter((row) => normal(row.status).includes("failed")).length, "Provider exceptions", "Investigate")}
      ${summary("Active templates", templates.filter((row) => normal(row.status) === "active").length, "Reusable message rules", "Edit")}
      ${summary("Global templates", templates.filter((row) => !row.tenantId).length, "Platform defaults", "Review")}
    </div>
    ${filterToolbar("Search by SACCO, member, provider, recipient, channel, status or event", "New template", "Export delivery log")}
    ${notificationTemplatePanel()}
    ${notificationTemplateDetailPanel(templates)}
    ${recordTable("Notification delivery monitor", deliveries, ["tenantName", "memberName", "channel", "provider", "recipient", "status", "message", "sentAt", "createdAt"])}
    ${recordTable("Notification templates", templates, ["tenantName", "eventType", "channel", "title", "status", "updatedAt"])}
  `;
}

function usersView() {
  const platformOnly = isPlatform();
  const users = platformOnly ? dataRows("users").filter((user) => user.tenantId === "tenant_platform") : dataRows("users");
  const canCreate = hasPermission("users:create") || hasPermission("roles:create");
  const rows = users.map((user) => ({ ...staffAccessRow(user, platformOnly), action: "user-detail", actionLabel: "Manage access", actionId: user.id }));
  const roles = userRoleOptions(platformOnly);
  return `
    <div class="role-banner">
      <div><p class="eyebrow">Users and Roles</p><h2>${platformOnly ? "Platform administrators only. SACCO members are not platform users." : "SACCO staff access for this tenant."}</h2></div>
      ${canCreate ? `<span class="status active">Super Admin</span>` : `<span class="status pending">View only</span>`}
    </div>
    <div class="dashboard-grid">
      ${summary(platformOnly ? "Platform users" : "SACCO staff users", users.length, platformOnly ? "Administrators only" : "Staff accounts only, not members", "Review")}
      ${summary("Active users", users.filter((user) => normal(user.status) === "active").length, "Can sign in", "Monitor")}
      ${summary("Configured roles", roles.length, "Available assignments", "Manage")}
      ${summary("Role coverage", roleCoverage(users, roles), "Users with assigned roles", "Audit")}
    </div>
    ${!platformOnly ? saccoStaffAccessGuide(roles) : ""}
    ${canCreate ? addUserPanel(platformOnly) : ""}
    ${userDetailPanel(users, canCreate)}
    ${roleCoveragePanel(users, roles, platformOnly)}
    ${recordTable(platformOnly ? "Platform administrator list" : "SACCO staff access list", rows, ["fullName", "email", "phone", "role", "accessPurpose", "moduleScope", "lastLogin", "status"])}
    ${permissionMatrix()}
  `;
}

function auditView() {
  const rows = dataRows("auditEvents").map((event) => ({
    ...event,
    tenantName: tenantName(event.tenantId),
    actor: event.actorName || userName(event.actorUserId),
    module: event.resourceType || event.module || "system",
    recordReference: event.resourceId || event.recordReference || event.recordId || "",
    category: auditCategory(event),
    riskLevel: auditRiskLevel(event),
    result: event.result || "Recorded"
  }));
  const sensitive = rows.filter((event) => event.riskLevel !== "Normal");
  const highRisk = rows.filter((event) => event.riskLevel === "High");
  const approvals = rows.filter((event) => event.category === "Approvals");
  const reversals = rows.filter((event) => event.category === "Reversals");
  const access = rows.filter((event) => event.category === "Access control");
  const finance = rows.filter((event) => event.category === "Financial activity");
  return `
    <div class="dashboard-grid">
      ${summary("Audit events", rows.length, "Immutable activity trail", "Inspect")}
      ${summary("High-risk events", highRisk.length, "Roles, sessions and reversals", "Review")}
      ${summary(isPlatform() ? "Tenants affected" : "Actors involved", isPlatform() ? uniqueCount(rows, "tenantId") : uniqueCount(rows, "actorUserId"), isPlatform() ? "Across visible SACCOs" : "Within this SACCO", "Filter")}
      ${summary("Actors", uniqueCount(rows, "actorUserId"), "Users and system actions", "Trace")}
    </div>
    ${filterToolbar("Search audit logs by SACCO, actor, action, module, IP address or record ID", "Export audit log", "Print report")}
    ${auditEvidencePanel(rows, sensitive, approvals, reversals, access, finance)}
    ${recordTable("Sensitive audit queue", sensitive, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "riskLevel"])}
    ${recordTable(isPlatform() ? "Platform audit trail" : "SACCO audit trail", rows, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "result"])}
  `;
}

function auditEvidencePanel(rows, sensitive, approvals, reversals, access, finance) {
  const recent = rows[0]?.createdAt || "No event yet";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${isPlatform() ? "Platform audit evidence" : "SACCO audit evidence"}</h2>
          <p>${isPlatform() ? "System-wide oversight for administrator actions, tenant changes and sensitive access." : "Read-only evidence for SACCO approvals, finance actions, reversals, role changes and session activity."}</p>
        </div>
        <span class="status ${sensitive.length ? "pending" : "active"}">${sensitive.length ? "Review queue" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Latest event", recent)}
        ${mini("Approval events", approvals.length)}
        ${mini("Reversal events", reversals.length)}
        ${mini("Access events", access.length)}
        ${mini("Finance events", finance.length)}
        ${mini("Sensitive queue", sensitive.length)}
      </div>
    </section>
    <div class="report-grid">
      ${auditCategoryCard("Approvals", approvals, "Maker-checker decisions, status changes and review outcomes.")}
      ${auditCategoryCard("Reversals", reversals, "Financial corrections that require follow-up evidence.")}
      ${auditCategoryCard("Access control", access, "Logins, sessions, password, role and permission changes.")}
      ${auditCategoryCard("Financial activity", finance, "Transactions, repayments, expenses, assets and contribution setup.")}
    </div>
  `;
}

function auditCategoryCard(title, rows, copy) {
  const latest = rows[0]?.createdAt || "No events";
  return `
    <article class="report-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      <div class="mini-grid">
        ${mini("Events", rows.length)}
        ${mini("Latest", latest)}
      </div>
      <button class="button secondary" type="button">Review</button>
    </article>
  `;
}

function moduleBlueprint(view) {
  if (view === "savings") return savingsView();
  if (view === "shares") return sharesView();
  if (view === "welfare") return welfareView();
  if (view === "accounting") return accountingView();
  if (view === "reconciliation") return reconciliationView();
  if (view === "governance") return governanceView();
  if (view === "settings") return settingsView();
  if (view === "guarantors") return guarantorsView();
  const labels = {
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
    ${financialProductPanel("savings")}
    ${financialAccountPanel("savings", products)}
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
    ${financialProductPanel("shares")}
    ${financialAccountPanel("shares", products)}
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
    ${financialProductPanel("welfare")}
    ${financialAccountPanel("welfare", products)}
    ${welfareClaimPanel()}
    ${welfareClaimDetailPanel(claims)}
    ${recordTable("Welfare product list", products, ["name", "code", "contributionAmount", "status"])}
    ${recordTable("Welfare claims", claims.map((claim) => ({ ...claim, action: "welfare-claim-detail", actionLabel: "Review", actionId: claim.id })), ["membershipNo", "memberName", "claimType", "amount", "channel", "reference", "status", "submittedAt"])}
  `;
}

function financialProductPanel(type) {
  const canCreate = hasPermission("transactions:create");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialProductTitle(type)}</h2>
          <p>Create Java-backed ${labelize(type).toLowerCase()} products for this SACCO.</p>
        </div>
      </div>
      ${state.productFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.productFormMessage)}</strong></div>` : ""}
      ${state.productFormError ? `<div class="notice warning"><strong>Product setup failed.</strong><span>${escapeHtml(state.productFormError)}</span></div>` : ""}
      <form class="form-grid" data-product-form="${escapeHtml(type)}">
        <input type="hidden" data-product-field="tenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <input type="hidden" data-product-field="productType" value="${escapeHtml(type)}">
        <label><span>Code</span><input data-product-field="code" required placeholder="${type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}" ${canCreate ? "" : "disabled"}></label>
        <label><span>Name</span><input data-product-field="name" required placeholder="${labelize(type)} product name" ${canCreate ? "" : "disabled"}></label>
        <label><span>Contribution amount</span><input data-product-field="contributionAmount" type="number" min="0" step="1" value="${type === "shares" ? "5000" : "10000"}" ${canCreate ? "" : "disabled"}></label>
        <label><span>Minimum balance</span><input data-product-field="minimumBalance" type="number" min="0" step="1" value="0" ${canCreate ? "" : "disabled"}></label>
        <label><span>Interest rate</span><input data-product-field="interestRate" type="number" min="0" step="0.01" value="0" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Create ${labelize(type)} product</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function financialAccountPanel(type, products) {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members").filter((member) => normal(member.status) === "active");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialAccountTitle(type)}</h2>
          <p>Link an active member to a configured ${labelize(type).toLowerCase()} product.</p>
        </div>
      </div>
      ${state.accountFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.accountFormMessage)}</strong></div>` : ""}
      ${state.accountFormError ? `<div class="notice warning"><strong>Account opening failed.</strong><span>${escapeHtml(state.accountFormError)}</span></div>` : ""}
      <form class="form-grid" data-account-form="${escapeHtml(type)}">
        <input type="hidden" data-account-field="tenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <input type="hidden" data-account-field="accountType" value="${escapeHtml(type)}">
        <label><span>Member</span><select data-account-field="memberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Product</span><select data-account-field="productId" ${canCreate ? "" : "disabled"}>${products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.code)} - ${escapeHtml(product.name)}</option>`).join("")}</select></label>
        <label><span>Account number</span><input data-account-field="accountNo" placeholder="Auto if blank" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button secondary" type="submit">Open ${labelize(type)} account</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function welfareClaimPanel() {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members").filter((member) => normal(member.status) === "active");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Welfare claim submission</h2>
          <p>Submit member welfare claims for approval and payment.</p>
        </div>
      </div>
      ${state.welfareClaimMessage ? `<div class="notice compact"><strong>${escapeHtml(state.welfareClaimMessage)}</strong></div>` : ""}
      ${state.welfareClaimError ? `<div class="notice warning"><strong>Welfare claim failed.</strong><span>${escapeHtml(state.welfareClaimError)}</span></div>` : ""}
      <form id="welfareClaimForm" class="form-grid">
        <input type="hidden" id="newWelfareTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newWelfareMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Claim type</span><input id="newWelfareClaimType" required value="medical" ${canCreate ? "" : "disabled"}></label>
        <label><span>Amount</span><input id="newWelfareAmount" type="number" min="1" step="1" value="50000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Reference</span><input id="newWelfareReference" placeholder="Auto if blank" ${canCreate ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><textarea id="newWelfareDescription" placeholder="Claim reason and supporting details" ${canCreate ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit welfare claim</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function welfareClaimDetailPanel(claims) {
  const claim = claims.find((item) => item.id === state.selectedWelfareClaimId);
  if (!claim) return "";
  const canApprove = hasPermission("transactions:approve");
  const canPost = hasPermission("accounting:post");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Welfare claim decision</h2>
          <p>${escapeHtml(claim.reference || claim.id)} - ${escapeHtml(claim.memberName || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-welfare-claim-detail">Close</button>
      </div>
      ${state.selectedWelfareClaimMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedWelfareClaimMessage)}</strong></div>` : ""}
      ${state.selectedWelfareClaimError ? `<div class="notice warning"><strong>Welfare action failed.</strong><span>${escapeHtml(state.selectedWelfareClaimError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Member", `${claim.membershipNo || ""} ${claim.memberName || ""}`)}
        ${mini("Amount", money.format(claim.amount || 0))}
        ${mini("Claim type", claim.claimType)}
        ${mini("Status", claim.status)}
        ${mini("Paid channel", claim.channel)}
        ${mini("Submitted", claim.submittedAt)}
      </div>
      <form id="welfareClaimDecisionForm" class="form-grid">
        <input type="hidden" id="selectedWelfareClaimId" value="${escapeHtml(claim.id)}">
        <label class="wide"><span>Decision reason</span><input id="welfareClaimReason" placeholder="Required for rejection"></label>
        <label><span>Payment channel</span><select id="welfarePaymentChannel"><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option></select></label>
        <div class="form-actions inline">
          ${canApprove ? `<button class="button secondary" type="button" data-welfare-claim-action="approve">Approve claim</button><button class="button ghost" type="button" data-welfare-claim-action="reject">Reject claim</button>` : ""}
          ${canPost ? `<button class="button primary" type="button" data-welfare-claim-action="pay">Pay claim</button>` : ""}
          ${!canApprove && !canPost ? `<span class="status pending">View only</span>` : ""}
        </div>
      </form>
    </section>
  `;
}

function financialProductTitle(type) {
  if (type === "savings") return "Savings product setup";
  if (type === "shares") return "Shares product setup";
  if (type === "welfare") return "Welfare product setup";
  return `${labelize(type)} product setup`;
}

function financialAccountTitle(type) {
  if (type === "savings") return "Open Savings account";
  if (type === "shares") return "Open Shares account";
  if (type === "welfare") return "Open Welfare account";
  return `Open ${labelize(type)} account`;
}

function expenseCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const expenseAccounts = dataRows("chartOfAccounts").filter((account) => normal(account.type) === "expense");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Expense capture</h2>
          <p>Post operating expenses into the SACCO accounting ledger.</p>
        </div>
      </div>
      ${state.expenseFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.expenseFormMessage)}</strong></div>` : ""}
      ${state.expenseFormError ? `<div class="notice warning"><strong>Expense posting failed.</strong><span>${escapeHtml(state.expenseFormError)}</span></div>` : ""}
      <form id="expenseForm" class="form-grid">
        <input type="hidden" id="newExpenseTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Expense account</span><select id="newExpenseAccountCode" ${canPost ? "" : "disabled"}>${expenseAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} - ${escapeHtml(account.name)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="newExpenseAmount" type="number" min="1" step="1" value="25000" ${canPost ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="newExpenseChannel" ${canPost ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Expense date</span><input id="newExpenseDate" type="date" value="${new Date().toISOString().slice(0, 10)}" ${canPost ? "" : "disabled"}></label>
        <label><span>Reference</span><input id="newExpenseReference" placeholder="Auto if blank" ${canPost ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><input id="newExpenseDescription" placeholder="Expense purpose" ${canPost ? "" : "disabled"}></label>
        <div class="form-actions inline">${canPost ? `<button class="button primary" type="submit">Post expense</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function assetCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const assetAccounts = dataRows("chartOfAccounts").filter((account) => normal(account.type) === "asset" && account.code !== "1310");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Fixed asset register</h2>
          <p>Register SACCO assets with depreciation inputs and acquisition journals.</p>
        </div>
      </div>
      ${state.assetFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.assetFormMessage)}</strong></div>` : ""}
      ${state.assetFormError ? `<div class="notice warning"><strong>Asset registration failed.</strong><span>${escapeHtml(state.assetFormError)}</span></div>` : ""}
      <form id="assetForm" class="form-grid">
        <input type="hidden" id="newAssetTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Asset name</span><input id="newAssetName" required placeholder="Laptop, printer, motorcycle..." ${canPost ? "" : "disabled"}></label>
        <label><span>Category</span><select id="newAssetCategory" ${canPost ? "" : "disabled"}>${assetCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Asset account</span><select id="newAssetAccountCode" ${canPost ? "" : "disabled"}>${assetAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} - ${escapeHtml(account.name)}</option>`).join("")}</select></label>
        <label><span>Cost</span><input id="newAssetCost" type="number" min="1" step="1" value="1500000" ${canPost ? "" : "disabled"}></label>
        <label><span>Salvage value</span><input id="newAssetSalvageValue" type="number" min="0" step="1" value="0" ${canPost ? "" : "disabled"}></label>
        <label><span>Useful life months</span><input id="newAssetLifeMonths" type="number" min="1" step="1" value="36" ${canPost ? "" : "disabled"}></label>
        <label><span>Purchase date</span><input id="newAssetPurchaseDate" type="date" value="${new Date().toISOString().slice(0, 10)}" ${canPost ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="newAssetChannel" ${canPost ? "" : "disabled"}><option value="bank">Bank</option><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Reference</span><input id="newAssetReference" placeholder="Auto if blank" ${canPost ? "" : "disabled"}></label>
        <label><span>Location</span><input id="newAssetLocation" placeholder="Branch or office" ${canPost ? "" : "disabled"}></label>
        <div class="form-actions inline">${canPost ? `<button class="button primary" type="submit">Register asset</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function assetCategoryOptions() {
  return ["equipment", "furniture", "vehicle", "building", "technology", "other"];
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
  const unbalanced = journals.filter((journal) => journal.isBalanced === false || Number(journal.debitTotal || 0) !== Number(journal.creditTotal || 0));
  return `
    <div class="dashboard-grid">
      ${summary("Chart accounts", accounts.length, "Ledger structure", "Open")}
      ${summary("Accounting periods", periods.length, "Financial years", "View")}
      ${summary("Journal entries", journals.length, "Posted entries", "Review")}
      ${summary("Unbalanced journals", unbalanced.length, "Must remain zero", "Investigate")}
      ${summary("Expenses", money.format(sum(expenses, "amount")), "Supplier and operating costs", "Open")}
      ${summary("Assets", money.format(sum(assets, "netBookValue", "cost")), "Fixed asset register", "View")}
    </div>
    <div class="grid two">
      ${expenseCapturePanel()}
      ${assetCapturePanel()}
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
  const summaryData = reconciliation.summary || {};
  const matches = Array.isArray(reconciliation.matches) ? reconciliation.matches : [];
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines : [];
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines : [];
  const callbackExceptions = callbacks.filter((row) => !normal(row.status).includes("posted") || row.duplicate);
  return `
    <div class="dashboard-grid">
      ${summary("Provider callbacks", callbacks.length, "Mobile money events", "Open")}
      ${summary("Matched records", summaryData.matched ?? matches.length, money.format(summaryData.matchedAmount || 0), "Review")}
      ${summary("Unmatched statement lines", summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length, money.format(summaryData.unmatchedStatementAmount || 0), "Investigate")}
      ${summary("Unmatched ledger lines", summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length, money.format(summaryData.unmatchedLedgerAmount || 0), "Investigate")}
      ${summary("Callback exceptions", callbackExceptions.length, "Failed or duplicate provider events", "Resolve")}
    </div>
    ${reconciliationControlPanel(summaryData)}
    <div class="grid two">
      ${recordTable("Bank and mobile-money matching", reconciliationMatchRows(matches), ["externalReference", "statementAmount", "ledgerAmount", "accountCode", "sourceType", "postedAt"])}
      ${recordTable("Provider callback exceptions", callbackExceptions, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"])}
    </div>
    <div class="grid two">
      ${recordTable("Unmatched bank statement lines", unmatchedStatementLines, ["externalReference", "accountCode", "channel", "amount", "description", "statementDate"])}
      ${recordTable("Unmatched ledger lines", unmatchedLedgerLines, ["reference", "accountCode", "accountName", "sourceType", "amount", "postedAt"])}
    </div>
    ${recordTable("Provider callbacks", callbacks, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"])}
  `;
}

function reconciliationControlPanel(summaryData) {
  const statementTotal = Number(summaryData.statementLines || 0);
  const ledgerTotal = Number(summaryData.ledgerLines || 0);
  const matched = Number(summaryData.matched || 0);
  const coverage = Math.round((matched / Math.max(statementTotal, ledgerTotal, 1)) * 100);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Reconciliation command center</h2>
          <p>Review backend-matched bank statement lines against cash ledger lines before period close.</p>
        </div>
        <span class="status ${coverage >= 90 ? "active" : "pending"}">${coverage}% matched</span>
      </div>
      <div class="source-grid">
        ${mini("Statement lines", statementTotal)}
        ${mini("Cash ledger lines", ledgerTotal)}
        ${mini("Matched lines", matched)}
        ${mini("Unmatched statement amount", money.format(summaryData.unmatchedStatementAmount || 0))}
        ${mini("Unmatched ledger amount", money.format(summaryData.unmatchedLedgerAmount || 0))}
        ${mini("Matched amount", money.format(summaryData.matchedAmount || 0))}
      </div>
    </section>
  `;
}

function reconciliationMatchRows(matches) {
  return (matches || []).map((match) => ({
    externalReference: match.statementLine?.externalReference || match.ledgerLine?.reference,
    statementAmount: match.statementLine?.amount,
    ledgerAmount: match.ledgerLine?.amount,
    accountCode: match.statementLine?.accountCode || match.ledgerLine?.accountCode,
    sourceType: match.ledgerLine?.sourceType,
    postedAt: match.ledgerLine?.postedAt || match.statementLine?.statementDate
  }));
}

function governanceView() {
  const meetings = dataRows("governanceMeetings").map((meeting) => ({
    ...meeting,
    chairName: userName(meeting.chairUserId),
    action: "governance-meeting-detail",
    actionLabel: "Open",
    actionId: meeting.id
  }));
  const resolutions = meetings.flatMap((meeting) => (meeting.resolutions || []).map((resolution) => ({
    ...resolution,
    meetingTitle: meeting.title,
    ownerName: userName(resolution.ownerUserId)
  })));
  return `
    <div class="dashboard-grid">
      ${summary("Meetings", meetings.length, "Board, AGM and committee records", "Open")}
      ${summary("Scheduled meetings", meetings.filter((row) => normal(row.status) === "scheduled").length, "Upcoming governance events", "Prepare")}
      ${summary("Open resolutions", resolutions.filter((row) => normal(row.status) !== "closed").length, "Action items needing follow-up", "Track")}
      ${summary("Completed meetings", meetings.filter((row) => normal(row.status) === "completed").length, "Minutes and decisions", "Review")}
    </div>
    ${governanceMeetingPanel()}
    ${governanceMeetingDetailPanel(meetings)}
    ${recordTable("Governance meeting register", meetings, ["title", "meetingType", "scheduledAt", "chairName", "status", "openResolutions"])}
    ${recordTable("Resolution action list", resolutions, ["meetingTitle", "title", "ownerName", "dueDate", "status", "createdAt"])}
  `;
}

function governanceMeetingPanel() {
  const canManage = hasPermission("governance:manage");
  const users = dataRows("users").filter((user) => user.tenantId === state.user?.tenantId);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Governance meeting setup</h2>
          <p>Create board, AGM, committee, and management meetings with minutes.</p>
        </div>
      </div>
      ${state.governanceMeetingMessage ? `<div class="notice compact"><strong>${escapeHtml(state.governanceMeetingMessage)}</strong></div>` : ""}
      ${state.governanceMeetingError ? `<div class="notice warning"><strong>Meeting setup failed.</strong><span>${escapeHtml(state.governanceMeetingError)}</span></div>` : ""}
      <form id="governanceMeetingForm" class="form-grid">
        <input type="hidden" id="newMeetingTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Title</span><input id="newMeetingTitle" required placeholder="Monthly board meeting" ${canManage ? "" : "disabled"}></label>
        <label><span>Meeting type</span><select id="newMeetingType" ${canManage ? "" : "disabled"}>${meetingTypeOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Scheduled time</span><input id="newMeetingScheduledAt" type="datetime-local" value="${localDateTimeValue()}" ${canManage ? "" : "disabled"}></label>
        <label><span>Chairperson</span><select id="newMeetingChairUserId" ${canManage ? "" : "disabled"}><option value="">Use current user</option>${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName || user.email)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="newMeetingStatus" ${canManage ? "" : "disabled"}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label class="wide"><span>Minutes / agenda</span><textarea id="newMeetingMinutes" placeholder="Agenda, attendance notes, or minutes summary" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create governance meeting</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function governanceMeetingDetailPanel(meetings) {
  const meeting = meetings.find((item) => item.id === state.selectedMeetingId);
  if (!meeting) return "";
  const canManage = hasPermission("governance:manage");
  const users = dataRows("users").filter((user) => user.tenantId === state.user?.tenantId);
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Governance meeting detail</h2>
          <p>${escapeHtml(meeting.title)} - ${escapeHtml(labelize(meeting.meetingType || ""))}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-governance-meeting-detail">Close</button>
      </div>
      ${state.selectedMeetingMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMeetingMessage)}</strong></div>` : ""}
      ${state.selectedMeetingError ? `<div class="notice warning"><strong>Resolution update failed.</strong><span>${escapeHtml(state.selectedMeetingError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Chairperson", meeting.chairName)}
        ${mini("Status", meeting.status)}
        ${mini("Scheduled", meeting.scheduledAt)}
        ${mini("Open resolutions", meeting.openResolutions || 0)}
        ${mini("Minutes", meeting.minutes ? "Captured" : "Pending")}
      </div>
      <form id="governanceResolutionForm" class="form-grid">
        <input type="hidden" id="selectedMeetingId" value="${escapeHtml(meeting.id)}">
        <label><span>Resolution title</span><input id="newResolutionTitle" required placeholder="Resolution or action item" ${canManage ? "" : "disabled"}></label>
        <label><span>Owner</span><select id="newResolutionOwnerUserId" ${canManage ? "" : "disabled"}><option value="">Use current user</option>${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName || user.email)}</option>`).join("")}</select></label>
        <label><span>Due date</span><input id="newResolutionDueDate" type="date" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="newResolutionStatus" ${canManage ? "" : "disabled"}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
        <label class="wide"><span>Decision</span><textarea id="newResolutionDecision" placeholder="Decision text, follow-up requirement, or governance action" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Record resolution</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      ${recordTable("Meeting resolutions", (meeting.resolutions || []).map((resolution) => ({ ...resolution, ownerName: userName(resolution.ownerUserId) })), ["title", "ownerName", "dueDate", "status", "createdAt"])}
    </section>
  `;
}

function meetingTypeOptions() {
  return ["board", "agm", "credit_committee", "audit_committee", "management"];
}

function localDateTimeValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function settingsView() {
  if (isPlatform()) return platformSettingsView();
  const branches = dataRows("branches");
  const products = dataRows("financialProducts");
  const accounts = dataRows("financialAccounts");
  const activeBranches = branches.filter((branch) => normal(branch.status) === "active");
  const activeProducts = products.filter((product) => normal(product.status) === "active");
  const productTypes = ["savings", "shares", "welfare"];
  const missingProducts = productTypes.filter((type) => !products.some((product) => normal(product.productType) === type));
  return `
    <div class="dashboard-grid">
      ${summary("Active branches", activeBranches.length, "Service points ready for use", "Manage")}
      ${summary("Active products", activeProducts.length, "Savings, shares and welfare", "Configure")}
      ${summary("Product coverage", missingProducts.length ? `${productTypes.length - missingProducts.length}/${productTypes.length}` : "Complete", missingProducts.length ? `Missing ${missingProducts.map(labelize).join(", ")}` : "Core contribution types ready", "Review")}
      ${summary("Roles", dataRows("roles").length, "Access profiles", "Review")}
    </div>
    ${settingsReadinessPanel(branches, products, accounts)}
    <div class="two-column">
      ${branchSetupPanel()}
      ${financialProductSetupPanel()}
    </div>
    ${recordTable("Branch setup", branches.map((branch) => ({ ...branch, manager: userName(branch.managerUserId) })), ["code", "name", "manager", "address", "status", "createdAt"])}
    ${recordTable("Financial product setup", products, ["productType", "code", "name", "contributionAmount", "minimumBalance", "interestRate", "status"])}
  `;
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
  return `
    <div class="dashboard-grid">
      ${summary("Subscription packages", packages.length, "Platform billing plans", "Review")}
      ${summary("Platform roles", roles.length, "Administrator access profiles", "Manage")}
      ${summary("Permission controls", permissions.length, "Route and action permissions", "Audit")}
      ${summary("Global templates", templates.length, "Default notification content", "Edit")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Protected platform configuration</h2>
          <p>System-level settings are restricted to Platform Super Admin users and should be changed with audit review.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin controls</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("App name", "Tereka Online")}
        ${mini("Default platform code", "PLATFORM")}
        ${mini("Production demo access", "Disabled outside dev/demo")}
        ${mini("SACCO code login", "Required")}
        ${mini("Tenant isolation", "Role and token enforced")}
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
  if (view === "accounts") return memberAccountsView(balances);
  if (view === "loans") return memberLoansView();
  if (view === "guarantor-requests") return memberGuarantorRequestsView();
  if (view === "payments") return memberPaymentsView();
  if (view === "notifications") return recordTable("Notifications", state.memberData.notifications, ["title", "message", "channel", "status", "createdAt"]);
  if (view === "complaints") return memberComplaintsView();
  if (view === "statements") return memberStatementsView(dash, balances);
  if (view === "receipts") return memberReceiptsView(dash);
  if (view === "profile") return memberProfileView(balances);
  if (view === "security") return memberSecurityView();
  return moduleBlueprint(view);
}

function memberAccountsView(balances) {
  const accounts = [
    { account: "Savings", accountType: "savings", balance: balances.savings || 0, purpose: "Regular member deposits", action: "Deposit" },
    { account: "Shares", accountType: "shares", balance: balances.shares || 0, purpose: "Share capital contributions", action: "Buy shares" },
    { account: "Welfare", accountType: "welfare", balance: balances.welfare || 0, purpose: "Welfare fund contributions", action: "Contribute" }
  ];
  return `
    <div class="dashboard-grid">
      ${summary("Savings", money.format(balances.savings || 0), "Available member deposits", "Deposit")}
      ${summary("Shares", money.format(balances.shares || 0), "Member share capital", "Buy shares")}
      ${summary("Welfare", money.format(balances.welfare || 0), "Welfare contribution balance", "Contribute")}
      ${summary("Total balance", money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)), "All member balances", "Statement")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member account overview</h2>
          <p>Savings, shares and welfare balances are confirmed by the Java member API.</p>
        </div>
        <span class="status active">Server-confirmed</span>
      </div>
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("SACCO", contextName())}
        ${mini("Account groups", accounts.length)}
        ${mini("Last sync", state.lastSync || "Pending")}
        ${mini("Statements", "Available")}
        ${mini("Receipts", "Posted transactions")}
      </div>
    </section>
    ${recordTable("Member account balances", accounts, ["account", "accountType", "balance", "purpose", "action"])}
  `;
}

function memberLoansView() {
  const loans = state.memberData.loans || [];
  const activeLoans = loans.filter((loan) => ["active", "approved", "disbursed"].includes(normal(loan.status)));
  return `
    <div class="dashboard-grid">
      ${summary("Loan files", loans.length, "Applications and active loans", "Review")}
      ${summary("Active loans", activeLoans.length, "Repayment expected", "Pay")}
      ${summary("Outstanding", money.format(sum(loans, "outstandingBalance", "balance")), "Portfolio balance", "Statement")}
      ${summary("Guarantee requests", state.memberData.pendingGuarantors.length, "Pending guarantor decisions", "Respond")}
    </div>
    ${memberLoanApplicationPanel()}
    ${recordTable("Member loans", loans, ["product", "requestedAmount", "outstandingBalance", "nextDueDate", "status"])}
  `;
}

function memberLoanApplicationPanel() {
  const memberActive = normal(state.member?.status) === "active";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile loan application</h2>
          <p>Submit a loan request directly to the SACCO credit workflow.</p>
        </div>
        <span class="status ${memberActive ? "active" : "pending"}">${memberActive ? "Eligible to submit" : "Member not active"}</span>
      </div>
      ${state.memberLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberLoanMessage)}</strong></div>` : ""}
      ${state.memberLoanError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.memberLoanError)}</span></div>` : ""}
      <form id="memberLoanForm" class="form-grid">
        <label><span>Loan product</span><select id="memberLoanProduct" ${memberActive ? "" : "disabled"}>${loanProductOptions().map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="memberLoanAmount" type="number" min="1" step="1" value="100000" ${memberActive ? "" : "disabled"}></label>
        <label><span>Repayment months</span><input id="memberLoanMonths" type="number" min="1" max="60" value="12" ${memberActive ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><textarea id="memberLoanPurpose" placeholder="Business, school fees, farming input, emergency..." ${memberActive ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${memberActive ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">Contact SACCO office</span>`}</div>
      </form>
    </section>
  `;
}

function memberPaymentsView() {
  const loans = state.memberData.loans || [];
  const payableLoans = loans.filter((loan) => ["active", "disbursed"].includes(normal(loan.status)));
  const paymentDrafts = memberDraftRows("payment");
  return `
    <div class="dashboard-grid">
      ${summary("Payment options", 4, "Savings, shares, welfare and loans", "Pay")}
      ${summary("Payable loans", payableLoans.length, "Active loan balances", "Repay")}
      ${summary("Mobile money", "Enabled", "Provider callback posting", "Use")}
      ${summary("Payment drafts", paymentDrafts.length, "Saved locally before sync", "Sync")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member payment center</h2>
          <p>Post mobile-money payments for deposits, shares, welfare and active loan repayments.</p>
        </div>
        <span class="status active">Java-backed posting</span>
      </div>
      ${state.memberPaymentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPaymentMessage)}</strong></div>` : ""}
      ${state.memberPaymentError ? `<div class="notice warning"><strong>Payment failed.</strong><span>${escapeHtml(state.memberPaymentError)}</span></div>` : ""}
      <form id="memberPaymentForm" class="form-grid">
        <label><span>Payment purpose</span><select id="memberPaymentPurpose"><option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="loan_repayment">Loan repayment</option></select></label>
        <label><span>Amount</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>Provider</span><select id="memberPaymentProvider"><option value="mtn">MTN Mobile Money</option><option value="airtel">Airtel Money</option><option value="demo">Demo provider</option></select></label>
        <label><span>Reference</span><input id="memberPaymentReference" value="MM-${Date.now()}"></label>
        <label class="wide"><span>Loan for repayment</span><select id="memberPaymentLoanId"><option value="">Not a loan repayment</option>${payableLoans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(loan.product || loan.applicationNo || loan.id)} - ${money.format(loan.outstandingBalance || loan.balance || 0)}</option>`).join("")}</select></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">Save draft</button><button class="button primary" type="submit">Post payment</button></div>
      </form>
    </section>
    ${memberDraftPanel("Payment offline drafts", paymentDrafts)}
    ${recordTable("Payable loans", payableLoans, ["product", "outstandingBalance", "nextDueDate", "status"])}
  `;
}

function memberGuarantorRequestsView() {
  const requests = memberGuarantorRows();
  const pending = requests.filter((row) => normal(row.status) === "pending");
  const accepted = requests.filter((row) => normal(row.status) === "accepted");
  const totalGuarantee = sum(requests, "guaranteedAmount");
  const availableCapacity = requests.length ? Math.max(...requests.map((row) => Number(row.capacity || 0))) : 0;
  return `
    <div class="dashboard-grid">
      ${summary("Pending requests", pending.length, "Awaiting your decision", "Review")}
      ${summary("Accepted guarantees", accepted.length, "Active obligations", "Track")}
      ${summary("Guarantee exposure", money.format(totalGuarantee), "Requested and accepted amount", "Assess")}
      ${summary("Available capacity", money.format(availableCapacity), "Based on savings balance", "Confirm")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member guarantor decision center</h2>
          <p>Accept or reject guarantor requests after reviewing loan purpose, amount and your guarantee capacity.</p>
        </div>
        <span class="status ${pending.length ? "pending" : "active"}">${pending.length ? "Decision needed" : "No pending requests"}</span>
      </div>
      ${state.memberGuarantorMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorMessage)}</strong></div>` : ""}
      ${state.memberGuarantorError ? `<div class="notice warning"><strong>Guarantor decision failed.</strong><span>${escapeHtml(state.memberGuarantorError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("Savings balance", money.format(state.memberData.balances?.savings || 0))}
        ${mini("Pending decisions", pending.length)}
        ${mini("Accepted amount", money.format(sum(accepted, "guaranteedAmount")))}
        ${mini("Rejected requests", requests.filter((row) => normal(row.status) === "rejected").length)}
        ${mini("Last sync", state.lastSync || "Pending")}
      </div>
    </section>
    ${recordTable("Member guarantor requests", requests, ["borrower", "product", "requestedAmount", "guaranteedAmount", "capacity", "status"])}
  `;
}

function memberGuarantorRows() {
  return (state.memberData.pendingGuarantors || []).map((request) => ({
    ...request,
    borrower: request.loan?.memberName || request.loan?.membershipNo || request.loan?.memberId || "Borrower",
    product: request.loan?.product || request.product || "Loan",
    requestedAmount: request.loan?.amount || request.loan?.requestedAmount || 0,
    action: normal(request.status) === "pending" ? "member-guarantor" : "",
    actionLabel: normal(request.status) === "pending" ? "Decide" : "View",
    actionId: request.id
  }));
}

function memberStatementsView(dash, balances) {
  const lines = memberStatementLines(dash);
  return `
    <div class="dashboard-grid">
      ${summary("Statement lines", lines.length, "Posted member ledger activity", "Review")}
      ${summary("Savings balance", money.format(balances.savings || 0), "Server-confirmed balance", "Download")}
      ${summary("Share balance", money.format(balances.shares || 0), "Server-confirmed balance", "Download")}
      ${summary("Welfare balance", money.format(balances.welfare || 0), "Server-confirmed balance", "Download")}
    </div>
    ${filterToolbar("Filter by reference, account, channel, narration or date", "Download PDF", "Download Excel")}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member statement readiness</h2>
          <p>Balances and statement lines are refreshed from the Java member API.</p>
        </div>
        <span class="status active">Server-confirmed</span>
      </div>
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("SACCO", contextName())}
        ${mini("Last sync", state.lastSync || "Pending")}
        ${mini("Opening balance", money.format(lines[0]?.runningBalance || 0))}
        ${mini("Closing balance", money.format(lines.at(-1)?.runningBalance || Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)))}
        ${mini("Export formats", "PDF / Excel")}
      </div>
    </section>
    ${recordTable("Member statement", lines, ["reference", "description", "debit", "credit", "runningBalance", "postedAt"])}
  `;
}

function memberReceiptsView(dash) {
  const receipts = memberStatementLines(dash)
    .filter((line) => line.reference && (Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0))
    .map((line) => ({
      ...line,
      receiptNo: `RCT-${line.reference}`,
      receiptStatus: "Available",
      amount: Number(line.credit || 0) || Number(line.debit || 0)
    }))
    .sort((a, b) => new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0));
  return `
    <div class="dashboard-grid">
      ${summary("Receipts", receipts.length, "Posted transactions with evidence", "View")}
      ${summary("Total received", money.format(sum(receipts.filter((row) => Number(row.credit || 0) > 0), "credit")), "Deposits and repayments", "Export")}
      ${summary("Withdrawals", money.format(sum(receipts.filter((row) => Number(row.debit || 0) > 0), "debit")), "Cash-out evidence", "Review")}
      ${summary("Receipt status", receipts.length ? "Available" : "Pending", "Only posted transactions", "Refresh")}
    </div>
    ${filterToolbar("Search receipts by number, reference, narration or date", "Download receipt", "Print")}
    ${recordTable("Member receipts", receipts, ["receiptNo", "reference", "description", "amount", "receiptStatus", "postedAt"])}
  `;
}

function memberComplaintsView() {
  const complaints = state.memberData.complaints || [];
  const open = complaints.filter((row) => !["closed", "resolved"].includes(normal(row.status)));
  const complaintDrafts = memberDraftRows("complaint");
  return `
    <div class="dashboard-grid">
      ${summary("My complaints", complaints.length, "Submitted support cases", "Track")}
      ${summary("Open cases", open.length, "Awaiting action", "Follow up")}
      ${summary("Resolved cases", complaints.length - open.length, "Closed support history", "Review")}
      ${summary("Offline drafts", complaintDrafts.length, "Saved before sync", "Sync")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint center</h2>
          <p>Submit service issues, save offline drafts, sync to the SACCO support desk and track status.</p>
        </div>
        <span class="status ${open.length ? "pending" : "active"}">${open.length ? "Follow-up active" : "No open cases"}</span>
      </div>
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("SACCO", contextName())}
        ${mini("Sync state", state.lastError ? "Retry needed" : "Ready")}
        ${mini("Attachments", "Supported")}
        ${mini("Priority", "Low / Medium / High")}
        ${mini("Tracking", "Status history")}
      </div>
    </section>
    ${memberComplaintForm()}
    ${memberDraftPanel("Complaint offline drafts", complaintDrafts)}
    ${recordTable("My complaints", complaints, ["id", "category", "subject", "priority", "status", "createdAt"])}
  `;
}

function memberComplaintForm() {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint submission</h2>
          <p>Send a member case directly to the SACCO support queue from the member portal.</p>
        </div>
        <span class="status active">Java-backed sync</span>
      </div>
      ${state.memberComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberComplaintMessage)}</strong></div>` : ""}
      ${state.memberComplaintError ? `<div class="notice warning"><strong>Complaint submission failed.</strong><span>${escapeHtml(state.memberComplaintError)}</span></div>` : ""}
      <form id="memberComplaintForm" class="form-grid">
        <label><span>Category</span><select id="memberComplaintCategory">${complaintCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Priority</span><select id="memberComplaintPriority"><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
        <label class="wide"><span>Subject</span><input id="memberComplaintSubject" required placeholder="Short complaint title"></label>
        <label class="wide"><span>Message</span><textarea id="memberComplaintDescription" required placeholder="Describe the issue, date, amount/reference if any, and expected help"></textarea></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="complaint">Save draft</button><button class="button primary" type="submit">Submit complaint</button></div>
      </form>
    </section>
  `;
}

function memberDraftPanel(title, drafts) {
  const filtered = filterRows(drafts || []);
  const columns = ["type", "title", "amount", "details", "status", "updatedAt"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>Drafts are saved on this device and can be synced when the backend is reachable.</p>
        </div>
        <span class="status ${drafts.some((draft) => normal(draft.status) === "failed") ? "danger" : drafts.length ? "pending" : "active"}">${drafts.length ? "Drafts available" : "No drafts"}</span>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${labelize(column)}</th>`).join("")}<th>Actions</th></tr></thead>
            <tbody>${filtered.slice(0, 12).map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : emptyState("No offline drafts", "Use Save draft to keep a payment or complaint on this device before syncing.")}
    </section>
  `;
}

function memberDraftRows(type = "") {
  return (state.memberData.drafts || [])
    .filter((draft) => !type || draft.type === type)
    .map((draft) => ({
      ...draft,
      amount: draft.payload?.amount || 0,
      details: draft.type === "payment"
        ? `${labelize(draft.payload?.purpose || "payment")} / ${draft.payload?.provider || "provider"} / ${draft.payload?.externalReference || "no reference"}`
        : draft.payload?.description || "Complaint case",
      action: "member-draft",
      actionId: draft.id,
      actionLabel: "Sync"
    }));
}

function memberProfileView(balances) {
  const member = state.member || {};
  return `
    <div class="dashboard-grid">
      ${summary("Membership No", member.membershipNo || "-", "Unique SACCO member identity", "Copy")}
      ${summary("Member status", labelize(member.status || "pending"), "Operating access", "Review")}
      ${summary("KYC status", labelize(member.kycStatus || "pending"), "Profile verification", "Open")}
      ${summary("Total balance", money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)), "Savings, shares and welfare", "View")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member profile and KYC</h2>
          <p>Personal details shown here come from the Java member session and SACCO KYC record.</p>
        </div>
        <span class="status ${normal(member.kycStatus) === "approved" ? "active" : "pending"}">${labelize(member.kycStatus || "pending")}</span>
      </div>
      <div class="source-grid">
        ${mini("Full name", member.fullName)}
        ${mini("Member type", labelize(member.memberType || "member"))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Joining date", member.joiningDate)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Profile contacts", [member], ["fullName", "membershipNo", "phone", "email", "nationalId", "status"])}
      ${recordTable("Balance summary", [{ account: "Savings", balance: balances.savings || 0 }, { account: "Shares", balance: balances.shares || 0 }, { account: "Welfare", balance: balances.welfare || 0 }], ["account", "balance"])}
    </div>
  `;
}

function memberSecurityView() {
  const expiresAt = state.memberData.sessionExpiresAt || state.memberData.dashboard?.sessionExpiresAt || "Current browser session";
  return `
    <div class="dashboard-grid">
      ${summary("Session", state.token ? "Active" : "Signed out", "Bearer token stored on this device", "Review")}
      ${summary("Login code", contextCode(), "Required with username and password", "Confirm")}
      ${summary("Password", "Protected", "Never displayed by Tereka Online", "Change")}
      ${summary("Demo access", SHOW_DEMO_TOOLS ? "Visible" : "Hidden", "Disabled outside dev/demo", "Audit")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member security center</h2>
          <p>Review login requirements, device session state and account safety reminders.</p>
        </div>
        <span class="status active">Protected</span>
      </div>
      <div class="source-grid">
        ${mini("SACCO code", contextCode())}
        ${mini("Username", state.member?.membershipNo || state.member?.email || state.member?.phone)}
        ${mini("Session expiry", expiresAt)}
        ${mini("Token storage", "Local device")}
        ${mini("Password reset", "Staff-assisted")}
        ${mini("Last sync", state.lastSync || "Pending")}
      </div>
    </section>
    ${tabsCard("Security actions", ["Change password request", "Logout current device", "Report suspicious access", "Update phone/email", "Review login code"])}
  `;
}

function dashboardIntro(title, copy) {
  return `
    <div class="role-banner">
      <div><p class="eyebrow">${escapeHtml(title)}</p><h2>${escapeHtml(copy)}</h2></div>
      <span class="status active">Role filtered</span>
    </div>
  `;
}

function rolePriorityPanel(title, rows) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>Role-specific work areas based on the current Java-backed records and permissions.</p>
        </div>
        <span class="status active">Role dashboard</span>
      </div>
      <ul class="activity-list">
        ${rows.map((row) => `<li><strong>${escapeHtml(row[0])}</strong><span>${escapeHtml(row[1])}</span><em>${escapeHtml(row[2])}</em></li>`).join("")}
      </ul>
    </section>
  `;
}

function roleAccessPanel(title = "My role access") {
  const visible = visibleModules();
  const source = state.auth === "member" ? memberModules : isPlatform() ? platformModules : saccoModules;
  const hidden = source.filter((item) => !visible.some((allowed) => allowed[0] === item[0]));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>${escapeHtml(roleLabel())} can use ${visible.length} module(s). Protected modules are hidden from the menu and dashboard actions.</p>
        </div>
        <span class="status active">Access filtered</span>
      </div>
      <div class="access-grid">
        ${visible.map((item) => `<div><strong>${escapeHtml(item[1])}</strong><span>${escapeHtml(item[2])}</span></div>`).join("")}
      </div>
      ${hidden.length ? `<p class="muted-note">Hidden for this role: ${hidden.map((item) => escapeHtml(item[1])).join(", ")}.</p>` : ""}
    </section>
  `;
}

function summary(label, value, detail, action) {
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button">${action}</button></article>`;
}

function summaryLink(label, value, detail, action, view) {
  const allowed = canAccessView(view);
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button" ${allowed ? `data-summary-view="${escapeHtml(view)}"` : "disabled"}>${allowed ? action : "Dashboard only"}</button></article>`;
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
  if (row.action === "member-draft" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-member-draft-sync="${escapeHtml(row.actionId)}">Sync</button>
        <button class="table-action danger" type="button" data-member-draft-discard="${escapeHtml(row.actionId)}">Discard</button>
      </div>
    `;
  }
  if (row.action === "member-guarantor" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-member-guarantor-action="accepted" data-row-id="${escapeHtml(row.actionId)}">Accept</button>
        <button class="table-action danger" type="button" data-member-guarantor-action="rejected" data-row-id="${escapeHtml(row.actionId)}">Reject</button>
      </div>
    `;
  }
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
        <label><span>Role</span><select id="newUserRoleId" required>${roles.map((role) => `<option value="${escapeHtml(role.id)}">${escapeHtml(role.name)}</option>`).join("")}</select></label>
        <div class="mini-fact wide">
          <span>Role access preview</span>
          <strong id="newUserRolePreview">${escapeHtml(rolePurpose(defaultRole.name || "SACCO staff", platformOnly))} - ${escapeHtml(roleModuleScope(defaultRole.name || "SACCO staff", platformOnly))}</strong>
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
  const assigned = state.selectedUserRoles[0] || "";
  const selectedRole = roles.find((role) => role.id === assigned) || roles[0] || {};
  const platformUser = selected.tenantId === "tenant_platform";
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
        ${mini("Tenant", platformUser ? "Platform Administration" : selected.tenantId)}
        ${mini("Status", selected.status)}
        ${mini("Phone", selected.phone)}
        ${mini("User ID", selected.id)}
        ${mini("Current role", selectedRole.name || "Unassigned")}
        ${mini("Access purpose", rolePurpose(selectedRole.name || selected.role || "", platformUser))}
        ${mini("Module scope", roleModuleScope(selectedRole.name || selected.role || "", platformUser))}
        ${mini("User type", platformUser ? "Platform administrator" : "SACCO staff")}
      </div>
      <form id="userRoleForm" class="form-grid single">
        <input type="hidden" id="selectedUserId" value="${escapeHtml(selected.id)}">
        <label>
          <span>${platformUser ? "Assigned platform role" : "Assigned SACCO staff role"}</span>
          <select id="selectedUserRoleId" ${canManageRoles ? "" : "disabled"}>
            ${roles.map((role) => `<option value="${escapeHtml(role.id)}" ${role.id === assigned ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}
          </select>
        </label>
        <div class="mini-fact">
          <span>Selected access</span>
          <strong id="selectedUserRolePreview">${escapeHtml(rolePurpose(selectedRole.name || "Staff", platformUser))} - ${escapeHtml(roleModuleScope(selectedRole.name || "Staff", platformUser))}</strong>
        </div>
        <div class="form-actions">
          ${canManageRoles ? `<button class="button primary" type="submit">Save role</button>` : `<span class="status pending">View only</span>`}
        </div>
      </form>
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
    if (name.includes("support")) return "Tenant support";
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
    if (name.includes("compliance")) return "Dashboard, reports, operations, audit";
    if (name.includes("support")) return "Dashboard, SACCOs, members, complaints";
    if (name.includes("operations")) return "Dashboard, SACCOs, operations, reports";
    return "Platform administration";
  }
  if (name.includes("administrator") || name.includes("admin")) return "All SACCO modules";
  if (name.includes("treasurer")) return "Transactions, savings, shares, welfare, approvals, accounting, reconciliation, reports";
  if (name.includes("secretary")) return "Members, shares, welfare, approvals, reports, governance, complaints";
  if (name.includes("chair")) return "Loans, guarantors, approvals, operations, reports, governance";
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
    accessPurpose: rolePurpose(role, platformOnly),
    moduleScope: roleModuleScope(role, platformOnly),
    status: user.status || "active"
  };
}

function roleNameFromId(roleId, platformOnly) {
  return userRoleOptions(platformOnly).find((role) => role.id === roleId)?.name || "";
}

function saccoStaffAccessGuide(roles) {
  const preferred = ["SACCO Administrator", "SACCO Chairperson", "SACCO Treasurer", "SACCO Secretary", "Loans Officer", "Accountant", "Teller", "Auditor"];
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

function memberRegistrationPanel() {
  const branches = dataRows("branches");
  const defaultBranch = branches[0]?.id || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member registration</h2>
          <p>Create a member profile, login credential and KYC starting state.</p>
        </div>
      </div>
      ${state.memberFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberFormMessage)}</strong></div>` : ""}
      ${state.memberFormError ? `<div class="notice warning"><strong>Member registration failed.</strong><span>${escapeHtml(state.memberFormError)}</span></div>` : ""}
      <form id="memberRegistrationForm" class="form-grid">
        <input type="hidden" id="newMemberTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Membership number</span><input id="newMemberNo" placeholder="Auto if blank"></label>
        <label><span>Branch</span><select id="newMemberBranchId">${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === defaultBranch ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Full name</span><input id="newMemberFullName" required placeholder="Member full name"></label>
        <label><span>Member type</span><select id="newMemberType"><option value="individual">Individual</option><option value="group">Group</option><option value="institutional">Institutional</option><option value="corporate">Corporate</option></select></label>
        <label><span>Phone</span><input id="newMemberPhone" required placeholder="+256..."></label>
        <label><span>Email</span><input id="newMemberEmail" type="email" placeholder="member@example.com"></label>
        <label><span>National ID</span><input id="newMemberNationalId" placeholder="CM..."></label>
        <label><span>Temporary password</span><input id="newMemberPassword" type="password" value="Member@12345"></label>
        <label><span>KYC status</span><select id="newMemberKycStatus"><option value="pending_verification">Pending verification</option><option value="not_verified">Not verified</option><option value="verified">Verified</option></select></label>
        <label><span>Joining date</span><input id="newMemberJoiningDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <div class="form-actions inline"><button class="button primary" type="submit">Create member</button></div>
      </form>
    </section>
  `;
}

function memberDetailPanel() {
  const member = state.selectedMember || dataRows("members").find((item) => item.id === state.selectedMemberId);
  if (!member) return "";
  const canManage = hasPermission("members:approve") || roleKind() === "admin" || roleKind() === "secretary";
  const statementLines = state.selectedMemberStatement?.lines || [];
  const totalBalance = Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0);
  const lastMovement = statementLines[0]?.postedAt || statementLines[0]?.createdAt || "No statement activity";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Member detail and KYC approval</h2>
          <p>${escapeHtml(member.membershipNo || "")} - ${escapeHtml(member.fullName || "")}. This is a SACCO member profile, not a staff login.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-member-detail">Close</button>
      </div>
      ${state.selectedMemberMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMemberMessage)}</strong></div>` : ""}
      ${state.selectedMemberError ? `<div class="notice warning"><strong>Member update failed.</strong><span>${escapeHtml(state.selectedMemberError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Total balance", money.format(totalBalance), "Savings, shares and welfare", "View")}
        ${summary("Statement lines", statementLines.length, "Java-backed ledger activity", "Review")}
        ${summary("Documents", state.selectedMemberDocuments.length, "KYC evidence files", "Verify")}
        ${summary("Contacts", state.selectedMemberNextOfKin.length, "Next-of-kin records", "Review")}
        ${summary("Beneficiaries", state.selectedMemberBeneficiaries.length, "Allocation records", "Review")}
      </div>
      <div class="source-grid">
        ${mini("Status", member.status)}
        ${mini("KYC", member.kycStatus)}
        ${mini("KYC readiness", memberKycReadiness(member))}
        ${mini("Savings", money.format(member.savingsBalance || 0))}
        ${mini("Shares", money.format(member.sharesBalance || 0))}
        ${mini("Welfare", money.format(member.welfareBalance || 0))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Last movement", lastMovement)}
      </div>
      ${memberKycChecklist(member)}
      <form id="memberStatusForm" class="form-grid single">
        <input type="hidden" id="selectedMemberId" value="${escapeHtml(member.id)}">
        <label><span>Member status</span><select id="selectedMemberStatus" ${canManage ? "" : "disabled"}>${memberStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.status ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
        <label><span>KYC decision</span><select id="selectedMemberKycStatus" ${canManage ? "" : "disabled"}>${kycStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.kycStatus ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
        <div class="form-actions">
          ${canManage ? `
            <button class="button primary" type="submit">Save KYC decision</button>
            <button class="button secondary" type="button" data-member-decision="approve">Approve member</button>
            <button class="button secondary" type="button" data-member-decision="changes">Request changes</button>
            <button class="button ghost" type="button" data-member-decision="suspend">Suspend member</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      <div class="grid two">
        ${recordTable("Member KYC documents", state.selectedMemberDocuments, ["documentType", "storageKey", "verificationStatus", "createdAt"])}
        ${recordTable("Member contacts and next of kin", state.selectedMemberNextOfKin, ["fullName", "relationship", "phone", "address", "primaryContact"])}
      </div>
      <div class="grid two">
        ${recordTable("Member beneficiaries", state.selectedMemberBeneficiaries, ["fullName", "relationship", "phone", "allocationPercent"])}
        ${recordTable("Member balance statement", statementLines, ["reference", "type", "channel", "amount", "savingsBalance", "sharesBalance", "welfareBalance", "postedAt"])}
      </div>
    </section>
  `;
}

function memberStatusOptions() {
  return [
    { value: "applicant", label: "Applicant" },
    { value: "pending_approval", label: "Pending approval" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "dormant", label: "Dormant" },
    { value: "suspended", label: "Suspended" },
    { value: "exited", label: "Exited" }
  ];
}

function memberKycReadiness(member) {
  const missing = [];
  if (!member.phone) missing.push("phone");
  if (!member.nationalId) missing.push("national ID");
  if (!member.fullName) missing.push("name");
  if (normal(member.kycStatus) === "verified" && normal(member.status) === "active") return "Portal ready";
  if (missing.length) return `Missing ${missing.join(", ")}`;
  if (normal(member.kycStatus).includes("pending")) return "Ready for review";
  if (normal(member.status).includes("pending")) return "Approval needed";
  return "Review";
}

function memberKycChecklist(member) {
  const checks = [
    ["Identity", member.nationalId ? "National ID captured" : "National ID missing", member.nationalId ? "Complete" : "Pending"],
    ["Contact", member.phone ? "Phone number captured" : "Phone number missing", member.phone ? "Complete" : "Pending"],
    ["KYC decision", labelize(member.kycStatus || "pending"), normal(member.kycStatus) === "verified" ? "Complete" : "Review"],
    ["Member status", labelize(member.status || "pending"), normal(member.status) === "active" ? "Active" : "Review"],
    ["Portal login", normal(member.status) === "active" ? "Member can access portal after credential setup" : "Activate member before portal access", normal(member.status) === "active" ? "Ready" : "Pending"]
  ];
  return rolePriorityPanel("Member KYC checklist", checks);
}

function kycStatusOptions() {
  return [
    { value: "not_verified", label: "Not verified" },
    { value: "pending_verification", label: "Pending verification" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "expired", label: "Expired" }
  ];
}

function transactionFormPanel() {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members");
  const branches = dataRows("branches");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>New transaction screen</h2>
          <p>Submit savings, shares, welfare or withdrawal transactions for approval.</p>
        </div>
      </div>
      ${state.transactionFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.transactionFormMessage)}</strong></div>` : ""}
      ${state.transactionFormError ? `<div class="notice warning"><strong>Transaction failed.</strong><span>${escapeHtml(state.transactionFormError)}</span></div>` : ""}
      <form id="transactionForm" class="form-grid">
        <input type="hidden" id="newTransactionTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newTransactionMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Branch</span><select id="newTransactionBranchId" ${canCreate ? "" : "disabled"}><option value="">Use member branch</option>${branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Transaction type</span><select id="newTransactionType" ${canCreate ? "" : "disabled"}><option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="withdrawal">Withdrawal</option></select></label>
        <label><span>Payment channel</span><select id="newTransactionChannel" ${canCreate ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Amount</span><input id="newTransactionAmount" type="number" min="1" step="1" required value="10000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Narration</span><input id="newTransactionNarration" placeholder="Reason or receipt note" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit transaction</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function transactionRows() {
  return dataRows("transactions").map((transaction) => {
    const status = normal(transaction.status);
    const original = Boolean(transaction.originalTransactionId);
    const postedOriginal = status === "posted" && !original;
    return {
      ...transaction,
      memberName: memberName(transaction.memberId),
      approvalReadiness: status.includes("pending") ? "Awaiting approval" : status === "posted" ? "Posted" : status.includes("rejected") ? "Rejected" : "Review",
      receiptStatus: status === "posted" ? "Receipt ready" : "Post first",
      reversalStatus: postedOriginal ? "Reversible with reason" : original ? "Reversal entry" : "Not available",
      action: "transaction-detail",
      actionLabel: status.includes("pending") ? "Approve" : "Review",
      actionId: transaction.id
    };
  });
}

function transactionDetailPanel(rows) {
  const transaction = rows.find((item) => item.id === state.selectedTransactionId);
  if (!transaction) return "";
  const canApprove = hasPermission("transactions:approve");
  const pending = normal(transaction.status).includes("pending");
  const postedOriginal = normal(transaction.status) === "posted" && !transaction.originalTransactionId;
  const receiptReady = normal(transaction.status) === "posted";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Transaction detail and reversal</h2>
          <p>${escapeHtml(transaction.reference || transaction.id)} - ${escapeHtml(transaction.type || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-transaction-detail">Close</button>
      </div>
      ${state.selectedTransactionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTransactionMessage)}</strong></div>` : ""}
      ${state.selectedTransactionError ? `<div class="notice warning"><strong>Transaction action failed.</strong><span>${escapeHtml(state.selectedTransactionError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Approval state", transaction.approvalReadiness || labelize(transaction.status || "review"), "Maker-checker status", "Review")}
        ${summary("Receipt", transaction.receiptStatus || "Post first", "Available after posting", "Load")}
        ${summary("Reversal", transaction.reversalStatus || "Not available", "Requires reason and balance check", "Control")}
        ${summary("Amount", money.format(transaction.amount || 0), labelize(transaction.type || "transaction"), "Verify")}
      </div>
      <div class="source-grid">
        ${mini("Member", transaction.memberName || transaction.memberId)}
        ${mini("Amount", money.format(transaction.amount || 0))}
        ${mini("Status", transaction.status)}
        ${mini("Channel", transaction.channel)}
        ${mini("Posted at", transaction.postedAt)}
        ${mini("Original transaction", transaction.originalTransactionId)}
        ${mini("Reversal reason", transaction.reversalReason)}
        ${mini("Rejection reason", transaction.rejectionReason)}
      </div>
      ${rolePriorityPanel("Transaction decision checklist", [
        ["Approval", pending ? "Review member, amount, channel and narration before posting or rejecting." : "Approval action is only available while pending.", pending ? "Pending" : "Done"],
        ["Receipt", receiptReady ? "Posted transaction can generate an official receipt preview." : "Receipt becomes available after posting.", receiptReady ? "Ready" : "Waiting"],
        ["Reversal", postedOriginal ? "Enter a reason before reversing this original posted transaction." : "Reversal is only available for posted original transactions.", postedOriginal ? "Available" : "Locked"]
      ])}
      <form id="transactionDecisionForm" class="form-grid single">
        <input type="hidden" id="selectedTransactionId" value="${escapeHtml(transaction.id)}">
        <label><span>Decision / reversal reason</span><input id="transactionDecisionReason" placeholder="Required for rejection or reversal" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions">
          ${canApprove ? `
            <button class="button secondary" type="button" data-transaction-action="post" ${pending ? "" : "disabled"}>Approve/post transaction</button>
            <button class="button ghost" type="button" data-transaction-action="reject" ${pending ? "" : "disabled"}>Reject transaction</button>
            <button class="button secondary" type="button" data-transaction-action="receipt" ${receiptReady ? "" : "disabled"}>Load receipt</button>
            <button class="button ghost" type="button" data-transaction-action="reverse" ${postedOriginal ? "" : "disabled"}>Reverse posted transaction</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      ${state.selectedTransactionReceipt ? `<section class="receipt-box"><h3>Receipt preview</h3><pre>${escapeHtml(state.selectedTransactionReceipt.printableText || "")}</pre></section>` : ""}
    </section>
  `;
}

function loanApplicationPanel() {
  const canCreate = hasPermission("loans:create");
  const activeMembers = dataRows("members").filter((member) => normal(member.status) === "active");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Loan application form</h2>
          <p>Create a SACCO loan application with member eligibility checks handled by the Java backend.</p>
        </div>
      </div>
      ${state.loanFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.loanFormMessage)}</strong></div>` : ""}
      ${state.loanFormError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.loanFormError)}</span></div>` : ""}
      <form id="loanApplicationForm" class="form-grid">
        <input type="hidden" id="newLoanTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Borrower</span><select id="newLoanMemberId" ${canCreate ? "" : "disabled"}>${activeMembers.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Loan product</span><select id="newLoanProduct" ${canCreate ? "" : "disabled"}>${loanProductOptions().map((product) => `<option value="${escapeHtml(product)}">${escapeHtml(product)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="newLoanAmount" type="number" min="1" step="1" required value="500000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Repayment period</span><input id="newLoanRepaymentMonths" type="number" min="1" max="60" step="1" required value="12" ${canCreate ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><input id="newLoanPurpose" placeholder="Business expansion, school fees, farming inputs..." ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function loanDetailPanel(rows) {
  const loan = rows.find((item) => item.id === state.selectedLoanId) || rows[0];
  if (!loan) return "";
  const canCreate = hasPermission("loans:create");
  const canApprove = hasPermission("loans:approve");
  const borrowerId = loan.memberId;
  const guarantorOptions = dataRows("members").filter((member) => normal(member.status) === "active" && member.id !== borrowerId);
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Loan detail and guarantors</h2>
          <p>${escapeHtml(loan.applicationNo || loan.id)} - ${escapeHtml(loan.memberName || loan.memberId || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-loan-detail">Close</button>
      </div>
      ${state.selectedLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedLoanMessage)}</strong></div>` : ""}
      ${state.selectedLoanError ? `<div class="notice warning"><strong>Loan action failed.</strong><span>${escapeHtml(state.selectedLoanError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Product", loan.product)}
        ${mini("Amount", money.format(loan.amount || loan.requestedAmount || 0))}
        ${mini("Outstanding", money.format(loan.balance || loan.outstandingBalance || 0))}
        ${mini("Status", loan.status)}
        ${mini("Stage", loan.stage)}
        ${mini("Guarantors", loan.guarantors || 0)}
        ${mini("Repayments", loan.repayments || 0)}
        ${mini("DSR", `${loan.dsr || 0}%`)}
      </div>
      <div class="grid two">
      <form id="loanGuarantorForm" class="form-grid single">
          <input type="hidden" id="selectedLoanId" value="${escapeHtml(loan.id)}">
          <h3>Add guarantor request</h3>
          <label><span>Guarantor member</span><select id="newGuarantorMemberId" ${canCreate ? "" : "disabled"}>${guarantorOptions.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
          <label><span>Guaranteed amount</span><input id="newGuarantorAmount" type="number" min="1" step="1" value="${Math.ceil(Number(loan.amount || loan.requestedAmount || 0) / 2)}" ${canCreate ? "" : "disabled"}></label>
          <div class="form-actions">${canCreate ? `<button class="button secondary" type="submit">Add guarantor request</button>` : `<span class="status pending">View only</span>`}</div>
        </form>
        <form id="loanDecisionForm" class="form-grid single">
          <h3>Decision and servicing</h3>
          <label><span>Decision reason</span><input id="loanDecisionReason" placeholder="Decision note or rejection reason" ${canApprove ? "" : "disabled"}></label>
          <div class="form-actions">
            ${canApprove ? `
              <button class="button secondary" type="button" data-loan-action="approve">Approve loan</button>
              <button class="button ghost" type="button" data-loan-action="reject">Reject loan</button>
              <button class="button primary" type="button" data-loan-action="disburse">Disburse loan</button>
            ` : `<span class="status pending">View only</span>`}
          </div>
        </form>
      </div>
      <form id="loanRepaymentForm" class="form-grid">
        <h3 class="wide">Record loan repayment</h3>
        <label><span>Amount</span><input id="loanRepaymentAmount" type="number" min="1" step="1" value="50000" ${canApprove ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="loanRepaymentChannel" ${canApprove ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Reference</span><input id="loanRepaymentReference" value="LR-${Date.now()}" ${canApprove ? "" : "disabled"}></label>
        <label><span>Narration</span><input id="loanRepaymentNarration" placeholder="Repayment note" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions inline">${canApprove ? `<button class="button secondary" type="submit">Record repayment</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      <div class="grid two">
        ${recordTable("Loan guarantor requests", state.selectedLoanGuarantors.map((request) => ({ ...request, memberName: memberName(request.memberId) })), ["memberName", "guaranteedAmount", "capacity", "status", "createdAt"])}
        ${recordTable("Loan repayment history", state.selectedLoanRepayments, ["reference", "amount", "channel", "narration", "receivedAt"])}
      </div>
    </section>
  `;
}

function loanProductOptions() {
  return ["Development Loan", "Emergency Loan"];
}

function complaintCapturePanel() {
  const canManage = hasPermission("complaints:manage");
  const tenants = tenantRows();
  const tenantId = isPlatform() ? tenants[0]?.id || "" : state.user?.tenantId || "";
  const members = dataRows("members").filter((member) => !tenantId || member.tenantId === tenantId || !isPlatform());
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Support ticket capture</h2>
          <p>Create a Java-backed complaint for a SACCO or a specific member.</p>
        </div>
      </div>
      ${state.complaintFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.complaintFormMessage)}</strong></div>` : ""}
      ${state.complaintFormError ? `<div class="notice warning"><strong>Complaint capture failed.</strong><span>${escapeHtml(state.complaintFormError)}</span></div>` : ""}
      <form id="complaintForm" class="form-grid">
        <label><span>SACCO</span><select id="newComplaintTenantId" ${isPlatform() && canManage ? "" : "disabled"}>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${tenant.id === tenantId ? "selected" : ""}>${escapeHtml(tenant.abbreviation || tenant.code || tenant.name)} - ${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        <label><span>Member</span><select id="newComplaintMemberId" ${canManage ? "" : "disabled"}><option value="">SACCO-level case</option>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Category</span><select id="newComplaintCategory" ${canManage ? "" : "disabled"}>${complaintCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Priority</span><select id="newComplaintPriority" ${canManage ? "" : "disabled"}><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
        <label><span>Channel</span><select id="newComplaintChannel" ${canManage ? "" : "disabled"}><option value="branch">Branch</option><option value="phone">Phone</option><option value="email">Email</option><option value="web">Web</option><option value="mobile">Mobile</option></select></label>
        <label><span>Subject</span><input id="newComplaintSubject" required placeholder="Short complaint title" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><textarea id="newComplaintDescription" placeholder="What happened, when, and what action is expected" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create support ticket</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function complaintDetailPanel(rows) {
  const complaint = rows.find((item) => item.id === state.selectedComplaintId);
  if (!complaint) return "";
  const canManage = hasPermission("complaints:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint review</h2>
          <p>${escapeHtml(complaint.subject || complaint.id)} - ${escapeHtml(complaint.tenantName || complaint.tenantId || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-complaint-detail">Close</button>
      </div>
      ${state.selectedComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedComplaintMessage)}</strong></div>` : ""}
      ${state.selectedComplaintError ? `<div class="notice warning"><strong>Complaint update failed.</strong><span>${escapeHtml(state.selectedComplaintError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("SACCO", complaint.tenantName || complaint.tenantId)}
        ${mini("Member", complaint.memberName)}
        ${mini("Category", labelize(complaint.category))}
        ${mini("Priority", complaint.priority)}
        ${mini("Status", complaint.status)}
        ${mini("Channel", complaint.channel)}
        ${mini("Assigned officer", complaint.assignedOfficer)}
        ${mini("Created", complaint.createdAt)}
      </div>
      <form id="complaintStatusForm" class="form-grid single">
        <input type="hidden" id="selectedComplaintId" value="${escapeHtml(complaint.id)}">
        <label><span>Status</span><select id="selectedComplaintStatus" ${canManage ? "" : "disabled"}>${complaintStatusOptions().map((status) => `<option value="${escapeHtml(status)}" ${status === complaint.status ? "selected" : ""}>${labelize(status)}</option>`).join("")}</select></label>
        <label><span>Resolution notes</span><textarea id="selectedComplaintNotes" placeholder="Action taken, follow-up notes, or closure reason" ${canManage ? "" : "disabled"}>${escapeHtml(complaint.resolutionNotes || "")}</textarea></label>
        <div class="form-actions">
          ${canManage ? `
            <button class="button primary" type="submit">Save complaint status</button>
            <button class="button secondary" type="button" data-complaint-status="in_progress">Mark in progress</button>
            <button class="button secondary" type="button" data-complaint-status="resolved">Resolve</button>
            <button class="button ghost" type="button" data-complaint-status="closed">Close</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function complaintCategoryOptions() {
  return ["statement", "loan", "savings", "shares", "service", "other"];
}

function complaintStatusOptions() {
  return ["open", "in_progress", "resolved", "closed"];
}

function notificationTemplatePanel() {
  const canManage = hasPermission("notifications:manage");
  const tenants = tenantRows();
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template setup</h2>
          <p>Create global platform templates or SACCO-specific overrides for Java notification delivery.</p>
        </div>
      </div>
      ${state.notificationTemplateMessage ? `<div class="notice compact"><strong>${escapeHtml(state.notificationTemplateMessage)}</strong></div>` : ""}
      ${state.notificationTemplateError ? `<div class="notice warning"><strong>Template setup failed.</strong><span>${escapeHtml(state.notificationTemplateError)}</span></div>` : ""}
      <form id="notificationTemplateForm" class="form-grid">
        <label><span>Template scope</span><select id="newTemplateTenantId" ${canManage ? "" : "disabled"}><option value="">Global platform template</option>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}">${escapeHtml(tenant.abbreviation || tenant.name)} - ${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        <label><span>Event type</span><select id="newTemplateEventType" ${canManage ? "" : "disabled"}>${notificationEventOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Channel</span><select id="newTemplateChannel" ${canManage ? "" : "disabled"}>${notificationChannelOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="newTemplateStatus" ${canManage ? "" : "disabled"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label><span>Title</span><input id="newTemplateTitle" required placeholder="Message title" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message body</span><textarea id="newTemplateBody" required placeholder="Use clear plain language for SMS, email or in-app messages" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create template</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function notificationTemplateDetailPanel(rows) {
  const template = rows.find((item) => item.id === state.selectedTemplateId);
  if (!template) return "";
  const canManage = hasPermission("notifications:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template editor</h2>
          <p>${escapeHtml(template.eventType)} - ${escapeHtml(template.channel)} - ${escapeHtml(template.tenantName || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-template-detail">Close</button>
      </div>
      ${state.selectedTemplateMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTemplateMessage)}</strong></div>` : ""}
      ${state.selectedTemplateError ? `<div class="notice warning"><strong>Template update failed.</strong><span>${escapeHtml(state.selectedTemplateError)}</span></div>` : ""}
      <form id="notificationTemplateEditForm" class="form-grid">
        <input type="hidden" id="selectedTemplateId" value="${escapeHtml(template.id)}">
        <label><span>Event type</span><select id="selectedTemplateEventType" ${canManage ? "" : "disabled"}>${notificationEventOptions(template.eventType).map((item) => `<option value="${escapeHtml(item)}" ${item === template.eventType ? "selected" : ""}>${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Channel</span><select id="selectedTemplateChannel" ${canManage ? "" : "disabled"}>${notificationChannelOptions().map((item) => `<option value="${escapeHtml(item)}" ${item === template.channel ? "selected" : ""}>${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="selectedTemplateStatus" ${canManage ? "" : "disabled"}><option value="active" ${template.status === "active" ? "selected" : ""}>Active</option><option value="inactive" ${template.status === "inactive" ? "selected" : ""}>Inactive</option></select></label>
        <label><span>Title</span><input id="selectedTemplateTitle" value="${escapeHtml(template.title || "")}" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message body</span><textarea id="selectedTemplateBody" ${canManage ? "" : "disabled"}>${escapeHtml(template.body || "")}</textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Save template</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function notificationEventOptions(extra = "") {
  return Array.from(new Set(["payment_posted", "loan_application_submitted", "complaint_synced", "subscription_due", "sacco_approved", extra].filter(Boolean)));
}

function notificationChannelOptions() {
  return ["in_app", "sms", "email"];
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
    state.memberData.sessionExpiresAt = member.expiresAt || "";
    state.memberData.drafts = loadMemberDrafts(member.member);
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
    ["governanceMeetings", "/governance-meetings"],
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
  state.memberData.drafts = loadMemberDrafts();
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

async function createMemberFromForm(event) {
  event.preventDefault();
  state.memberFormMessage = "";
  state.memberFormError = "";
  try {
    const created = await api("/members", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMemberTenantId"),
        branchId: value("newMemberBranchId"),
        membershipNo: value("newMemberNo"),
        fullName: value("newMemberFullName"),
        memberType: value("newMemberType"),
        phone: value("newMemberPhone"),
        email: value("newMemberEmail"),
        nationalId: value("newMemberNationalId"),
        password: value("newMemberPassword") || "Member@12345",
        kycStatus: value("newMemberKycStatus"),
        joiningDate: value("newMemberJoiningDate")
      })
    });
    state.memberFormMessage = `Created member ${created.membershipNo} - ${created.fullName}.`;
    await refreshAll();
  } catch (error) {
    state.memberFormError = error.message;
    renderShell();
  }
}

async function openMemberDetail(memberId) {
  state.selectedMemberId = memberId;
  state.selectedMember = null;
  state.selectedMemberStatement = null;
  state.selectedMemberNextOfKin = [];
  state.selectedMemberBeneficiaries = [];
  state.selectedMemberDocuments = [];
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  renderShell();
  try {
    const [member, statement, nextOfKin, beneficiaries, documents] = await Promise.all([
      api(`/members/${encodeURIComponent(memberId)}`),
      optionalApi(`/members/${encodeURIComponent(memberId)}/statement`, null),
      optionalApi(`/members/${encodeURIComponent(memberId)}/next-of-kin`, []),
      optionalApi(`/members/${encodeURIComponent(memberId)}/beneficiaries`, []),
      optionalApi(`/members/${encodeURIComponent(memberId)}/documents`, [])
    ]);
    state.selectedMember = member;
    state.selectedMemberStatement = statement;
    state.selectedMemberNextOfKin = nextOfKin || [];
    state.selectedMemberBeneficiaries = beneficiaries || [];
    state.selectedMemberDocuments = documents || [];
  } catch (error) {
    state.selectedMemberError = error.message;
  }
  renderShell();
}

async function saveMemberDecision(memberId, memberStatus, kycStatus) {
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  try {
    let member = await api(`/members/${encodeURIComponent(memberId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: memberStatus })
    });
    if (kycStatus) {
      await api("/members/metadata-import", {
        method: "POST",
        body: JSON.stringify({
          tenantId: member.tenantId,
          dryRun: false,
          rows: [{ recordType: "kyc_status", membershipNo: member.membershipNo, kycStatus }]
        })
      });
      member = await api(`/members/${encodeURIComponent(memberId)}`);
    }
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Member updated: ${member.status}, KYC ${member.kycStatus}.`;
    await refreshAll();
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Member updated: ${member.status}, KYC ${member.kycStatus}.`;
    renderShell();
  } catch (error) {
    state.selectedMemberError = error.message;
    renderShell();
  }
}

function runMemberDecision(action) {
  const memberId = value("selectedMemberId") || state.selectedMemberId;
  if (!memberId) return;
  if (action === "approve") {
    saveMemberDecision(memberId, "active", "verified");
    return;
  }
  if (action === "changes") {
    saveMemberDecision(memberId, "pending_approval", "pending_verification");
    return;
  }
  if (action === "suspend") {
    saveMemberDecision(memberId, "suspended", state.selectedMember?.kycStatus || value("selectedMemberKycStatus"));
    return;
  }
  saveMemberDecision(memberId, value("selectedMemberStatus"), value("selectedMemberKycStatus"));
}

async function createTransactionFromForm(event) {
  event.preventDefault();
  state.transactionFormMessage = "";
  state.transactionFormError = "";
  try {
    const transaction = await api("/financial-transactions", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newTransactionTenantId"),
        branchId: value("newTransactionBranchId"),
        memberId: value("newTransactionMemberId"),
        type: value("newTransactionType"),
        channel: value("newTransactionChannel"),
        amount: Number(value("newTransactionAmount")),
        narration: value("newTransactionNarration")
      })
    });
    state.transactionFormMessage = `Submitted transaction ${transaction.reference} for approval.`;
    await refreshAll();
  } catch (error) {
    state.transactionFormError = error.message;
    renderShell();
  }
}

function openTransactionDetail(transactionId) {
  state.selectedTransactionId = transactionId;
  state.selectedTransactionReceipt = null;
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  renderShell();
}

async function runTransactionAction(action) {
  const transactionId = value("selectedTransactionId") || state.selectedTransactionId;
  if (!transactionId) return;
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  state.selectedTransactionReceipt = action === "receipt" ? state.selectedTransactionReceipt : null;
  try {
    if (action === "receipt") {
      state.selectedTransactionReceipt = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/receipt`);
      state.selectedTransactionMessage = "Receipt loaded.";
    } else if (action === "reverse") {
      const reversal = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/reversal`, {
        method: "POST",
        body: JSON.stringify({ reason: value("transactionDecisionReason") || "Reversal requested from Tereka Online" })
      });
      state.selectedTransactionId = reversal.id;
      state.selectedTransactionMessage = `Reversal created: ${reversal.reference}.`;
      await refreshAll();
    } else {
      const status = action === "post" ? "posted" : "rejected";
      const transaction = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("transactionDecisionReason") || "Reviewed in Tereka Online" })
      });
      state.selectedTransactionId = transaction.id;
      state.selectedTransactionMessage = `Transaction ${transaction.reference} ${status}.`;
      await refreshAll();
    }
    renderShell();
  } catch (error) {
    state.selectedTransactionError = error.message;
    renderShell();
  }
}

async function createLoanFromForm(event) {
  event.preventDefault();
  state.loanFormMessage = "";
  state.loanFormError = "";
  try {
    const loan = await api("/loans", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newLoanTenantId"),
        memberId: value("newLoanMemberId"),
        product: value("newLoanProduct"),
        amount: Number(value("newLoanAmount")),
        repaymentMonths: Number(value("newLoanRepaymentMonths")),
        purpose: value("newLoanPurpose")
      })
    });
    state.loanFormMessage = `Submitted loan ${loan.applicationNo || loan.id} for review.`;
    state.selectedLoanId = loan.id;
    await refreshAll();
    state.selectedLoanId = loan.id;
    state.loanFormMessage = `Submitted loan ${loan.applicationNo || loan.id} for review.`;
    await openLoanDetail(loan.id, false);
  } catch (error) {
    state.loanFormError = error.message;
    renderShell();
  }
}

async function openLoanDetail(loanId, shouldRender = true) {
  state.selectedLoanId = loanId;
  state.selectedLoanGuarantors = [];
  state.selectedLoanRepayments = [];
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (shouldRender) renderShell();
  try {
    const [guarantors, repayments] = await Promise.all([
      optionalApi(`/loans/${encodeURIComponent(loanId)}/guarantors`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/repayments`, [])
    ]);
    state.selectedLoanGuarantors = guarantors || [];
    state.selectedLoanRepayments = repayments || [];
  } catch (error) {
    state.selectedLoanError = error.message;
  }
  renderShell();
}

async function addLoanGuarantor(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/guarantors`, {
      method: "POST",
      body: JSON.stringify({
        memberId: value("newGuarantorMemberId"),
        guaranteedAmount: Number(value("newGuarantorAmount"))
      })
    });
    state.selectedLoanMessage = "Guarantor request added.";
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = "Guarantor request added.";
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function runLoanAction(action) {
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    if (action === "disburse") {
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/disburse`, { method: "POST" });
      state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} disbursed.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("loanDecisionReason") || "Reviewed in Tereka Online" })
      });
      state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} ${status}.`;
    }
    const message = state.selectedLoanMessage;
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function recordLoanRepayment(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/repayments`, {
      method: "POST",
      body: JSON.stringify({
        amount: Number(value("loanRepaymentAmount")),
        channel: value("loanRepaymentChannel"),
        reference: value("loanRepaymentReference") || `LR-${Date.now()}`,
        narration: value("loanRepaymentNarration") || "Loan repayment"
      })
    });
    state.selectedLoanMessage = "Loan repayment recorded.";
    const message = state.selectedLoanMessage;
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function createComplaintFromForm(event) {
  event.preventDefault();
  state.complaintFormMessage = "";
  state.complaintFormError = "";
  try {
    const complaint = await api("/complaints", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newComplaintTenantId") || state.user?.tenantId,
        memberId: value("newComplaintMemberId"),
        category: value("newComplaintCategory"),
        subject: value("newComplaintSubject"),
        description: value("newComplaintDescription"),
        channel: value("newComplaintChannel"),
        priority: value("newComplaintPriority")
      })
    });
    state.complaintFormMessage = `Created support ticket ${complaint.id}.`;
    state.selectedComplaintId = complaint.id;
    await refreshAll();
    state.selectedComplaintId = complaint.id;
    state.complaintFormMessage = `Created support ticket ${complaint.id}.`;
    renderShell();
  } catch (error) {
    state.complaintFormError = error.message;
    renderShell();
  }
}

async function createFinancialProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.productFormMessage = "";
  state.productFormError = "";
  try {
    const product = await api("/financial-products", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "product", "tenantId"),
        productType: scopedValue(form, "product", "productType"),
        code: scopedValue(form, "product", "code"),
        name: scopedValue(form, "product", "name"),
        contributionAmount: Number(scopedValue(form, "product", "contributionAmount")),
        minimumBalance: Number(scopedValue(form, "product", "minimumBalance")),
        interestRate: Number(scopedValue(form, "product", "interestRate"))
      })
    });
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    await refreshAll();
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    renderShell();
  } catch (error) {
    state.productFormError = error.message;
    renderShell();
  }
}

async function createBranchFromForm(event) {
  event.preventDefault();
  state.branchFormMessage = "";
  state.branchFormError = "";
  try {
    const branch = await api("/branches", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newBranchTenantId"),
        code: value("newBranchCode"),
        name: value("newBranchName"),
        address: value("newBranchAddress"),
        status: value("newBranchStatus")
      })
    });
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    await refreshAll();
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    renderShell();
  } catch (error) {
    state.branchFormError = error.message;
    renderShell();
  }
}

async function openFinancialAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.accountFormMessage = "";
  state.accountFormError = "";
  try {
    const account = await api("/financial-accounts", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "account", "tenantId"),
        memberId: scopedValue(form, "account", "memberId"),
        productId: scopedValue(form, "account", "productId"),
        accountType: scopedValue(form, "account", "accountType"),
        accountNo: scopedValue(form, "account", "accountNo")
      })
    });
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    await refreshAll();
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    renderShell();
  } catch (error) {
    state.accountFormError = error.message;
    renderShell();
  }
}

async function submitMemberLoan(event) {
  event.preventDefault();
  state.memberLoanMessage = "";
  state.memberLoanError = "";
  try {
    const loan = await api("/member-auth/mobile-loans", {
      method: "POST",
      body: JSON.stringify({
        product: value("memberLoanProduct"),
        amount: Number(value("memberLoanAmount")),
        repaymentMonths: Number(value("memberLoanMonths")),
        purpose: value("memberLoanPurpose")
      })
    });
    state.memberLoanMessage = `Submitted loan application ${loan.applicationNo || loan.id}.`;
    await refreshMember();
    state.memberLoanMessage = `Submitted loan application ${loan.applicationNo || loan.id}.`;
    renderShell();
  } catch (error) {
    state.memberLoanError = error.message;
    renderShell();
  }
}

async function postMemberPayment(event) {
  event.preventDefault();
  state.memberPaymentMessage = "";
  state.memberPaymentError = "";
  try {
    const callback = await submitMemberPaymentPayload(memberPaymentPayload());
    state.memberPaymentMessage = `Payment posted: ${callback.externalReference || callback.id}.`;
    await refreshMember();
    state.memberPaymentMessage = `Payment posted: ${callback.externalReference || callback.id}.`;
    renderShell();
  } catch (error) {
    state.memberPaymentError = error.message;
    renderShell();
  }
}

async function submitMemberComplaint(event) {
  event.preventDefault();
  state.memberComplaintMessage = "";
  state.memberComplaintError = "";
  try {
    const complaint = await submitMemberComplaintPayload(memberComplaintPayload());
    state.memberComplaintMessage = `Submitted complaint ${complaint.id}.`;
    await refreshMember();
    state.memberComplaintMessage = `Submitted complaint ${complaint.id}.`;
    renderShell();
  } catch (error) {
    state.memberComplaintError = error.message;
    renderShell();
  }
}

function memberPaymentPayload() {
  const purpose = value("memberPaymentPurpose");
  return {
    tenantId: state.member?.tenantId,
    memberId: state.member?.id,
    memberIdentifier: state.member?.membershipNo,
    loanId: purpose === "loan_repayment" ? value("memberPaymentLoanId") : "",
    purpose,
    amount: Number(value("memberPaymentAmount")),
    externalReference: value("memberPaymentReference"),
    provider: value("memberPaymentProvider"),
    providerPayload: {
      source: "member_portal",
      member: state.member?.membershipNo
    }
  };
}

function memberComplaintPayload() {
  return {
    category: value("memberComplaintCategory"),
    subject: value("memberComplaintSubject"),
    description: value("memberComplaintDescription"),
    priority: value("memberComplaintPriority")
  };
}

async function submitMemberPaymentPayload(payload) {
  return api("/integrations/mobile-money/callback", {
    method: "POST",
    body: JSON.stringify(payload)
  }, "");
}

async function submitMemberComplaintPayload(payload) {
  return api("/member-auth/mobile-complaints", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function saveMemberDraftFromForm(type) {
  const payload = type === "payment" ? memberPaymentPayload() : memberComplaintPayload();
  const timestamp = formatDateTime(new Date().toISOString());
  const draft = {
    id: `draft-${Date.now()}`,
    type,
    title: type === "payment" ? `${labelize(payload.purpose)} ${money.format(payload.amount || 0)}` : payload.subject || "Complaint draft",
    payload,
    status: "Draft",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state.memberData.drafts = [draft, ...loadMemberDrafts()];
  persistMemberDrafts();
  if (type === "payment") state.memberPaymentMessage = "Payment draft saved on this device.";
  if (type === "complaint") state.memberComplaintMessage = "Complaint draft saved on this device.";
  renderShell();
}

async function syncMemberDraft(draftId) {
  const draft = state.memberData.drafts.find((item) => item.id === draftId);
  if (!draft) return;
  updateMemberDraft(draftId, { status: "Syncing", updatedAt: formatDateTime(new Date().toISOString()) });
  renderShell();
  try {
    const result = draft.type === "payment"
      ? await submitMemberPaymentPayload(draft.payload)
      : await submitMemberComplaintPayload(draft.payload);
    updateMemberDraft(draftId, {
      status: "Synced",
      serverReference: result.externalReference || result.id || "Synced",
      updatedAt: formatDateTime(new Date().toISOString())
    });
    if (draft.type === "payment") state.memberPaymentMessage = `Draft synced: ${result.externalReference || result.id}.`;
    if (draft.type === "complaint") state.memberComplaintMessage = `Draft synced: ${result.id}.`;
    await refreshMember();
    renderShell();
  } catch (error) {
    updateMemberDraft(draftId, { status: "Failed", error: error.message, updatedAt: formatDateTime(new Date().toISOString()) });
    if (draft.type === "payment") state.memberPaymentError = error.message;
    if (draft.type === "complaint") state.memberComplaintError = error.message;
    renderShell();
  }
}

function discardMemberDraft(draftId) {
  state.memberData.drafts = state.memberData.drafts.filter((draft) => draft.id !== draftId);
  persistMemberDrafts();
  renderShell();
}

async function decideMemberGuarantor(guarantorId, status) {
  state.memberGuarantorMessage = "";
  state.memberGuarantorError = "";
  try {
    const request = await api(`/member-auth/guarantor-requests/${encodeURIComponent(guarantorId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.memberGuarantorMessage = `Guarantor request ${request.status}.`;
    await refreshMember();
    state.memberGuarantorMessage = `Guarantor request ${request.status}.`;
    renderShell();
  } catch (error) {
    state.memberGuarantorError = error.message;
    renderShell();
  }
}

async function submitWelfareClaim(event) {
  event.preventDefault();
  state.welfareClaimMessage = "";
  state.welfareClaimError = "";
  try {
    const claim = await api("/welfare-claims", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newWelfareTenantId"),
        memberId: value("newWelfareMemberId"),
        claimType: value("newWelfareClaimType"),
        amount: Number(value("newWelfareAmount")),
        reference: value("newWelfareReference"),
        description: value("newWelfareDescription")
      })
    });
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    state.selectedWelfareClaimId = claim.id;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    renderShell();
  } catch (error) {
    state.welfareClaimError = error.message;
    renderShell();
  }
}

function openWelfareClaimDetail(claimId) {
  state.selectedWelfareClaimId = claimId;
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  renderShell();
}

async function runWelfareClaimAction(action) {
  const claimId = value("selectedWelfareClaimId") || state.selectedWelfareClaimId;
  if (!claimId) return;
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  try {
    let claim;
    if (action === "pay") {
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/payment`, {
        method: "POST",
        body: JSON.stringify({ channel: value("welfarePaymentChannel") || "cash" })
      });
      state.selectedWelfareClaimMessage = `Paid welfare claim ${claim.reference}.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("welfareClaimReason") || "Reviewed in Tereka Online" })
      });
      state.selectedWelfareClaimMessage = `Welfare claim ${claim.reference} ${status}.`;
    }
    const message = state.selectedWelfareClaimMessage;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.selectedWelfareClaimMessage = message;
    renderShell();
  } catch (error) {
    state.selectedWelfareClaimError = error.message;
    renderShell();
  }
}

function scopedValue(form, group, field) {
  return form.querySelector(`[data-${group}-field='${field}']`)?.value || "";
}

async function postExpense(event) {
  event.preventDefault();
  state.expenseFormMessage = "";
  state.expenseFormError = "";
  try {
    const expense = await api("/expenses", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newExpenseTenantId"),
        accountCode: value("newExpenseAccountCode"),
        amount: Number(value("newExpenseAmount")),
        channel: value("newExpenseChannel"),
        reference: value("newExpenseReference"),
        description: value("newExpenseDescription"),
        expenseDate: value("newExpenseDate")
      })
    });
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    await refreshAll();
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    renderShell();
  } catch (error) {
    state.expenseFormError = error.message;
    renderShell();
  }
}

async function registerAsset(event) {
  event.preventDefault();
  state.assetFormMessage = "";
  state.assetFormError = "";
  try {
    const asset = await api("/assets", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newAssetTenantId"),
        name: value("newAssetName"),
        category: value("newAssetCategory"),
        assetAccountCode: value("newAssetAccountCode"),
        cost: Number(value("newAssetCost")),
        salvageValue: Number(value("newAssetSalvageValue")),
        usefulLifeMonths: Number(value("newAssetLifeMonths")),
        purchaseDate: value("newAssetPurchaseDate"),
        depreciationStartDate: value("newAssetPurchaseDate"),
        channel: value("newAssetChannel"),
        reference: value("newAssetReference"),
        location: value("newAssetLocation")
      })
    });
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    await refreshAll();
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    renderShell();
  } catch (error) {
    state.assetFormError = error.message;
    renderShell();
  }
}

async function createGovernanceMeeting(event) {
  event.preventDefault();
  state.governanceMeetingMessage = "";
  state.governanceMeetingError = "";
  try {
    const meeting = await api("/governance-meetings", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMeetingTenantId"),
        title: value("newMeetingTitle"),
        meetingType: value("newMeetingType"),
        scheduledAt: new Date(value("newMeetingScheduledAt")).toISOString(),
        chairUserId: value("newMeetingChairUserId"),
        status: value("newMeetingStatus"),
        minutes: value("newMeetingMinutes")
      })
    });
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    state.selectedMeetingId = meeting.id;
    await refreshAll();
    state.selectedMeetingId = meeting.id;
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    renderShell();
  } catch (error) {
    state.governanceMeetingError = error.message;
    renderShell();
  }
}

function openGovernanceMeetingDetail(meetingId) {
  state.selectedMeetingId = meetingId;
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  renderShell();
}

async function createGovernanceResolution(event) {
  event.preventDefault();
  const meetingId = value("selectedMeetingId") || state.selectedMeetingId;
  if (!meetingId) return;
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  try {
    const resolution = await api(`/governance-meetings/${encodeURIComponent(meetingId)}/resolutions`, {
      method: "POST",
      body: JSON.stringify({
        title: value("newResolutionTitle"),
        decision: value("newResolutionDecision"),
        ownerUserId: value("newResolutionOwnerUserId"),
        dueDate: value("newResolutionDueDate") || null,
        status: value("newResolutionStatus")
      })
    });
    state.selectedMeetingMessage = `Recorded resolution ${resolution.title}.`;
    const message = state.selectedMeetingMessage;
    await refreshAll();
    state.selectedMeetingId = meetingId;
    state.selectedMeetingMessage = message;
    renderShell();
  } catch (error) {
    state.selectedMeetingError = error.message;
    renderShell();
  }
}

function openComplaintDetail(complaintId) {
  state.selectedComplaintId = complaintId;
  state.selectedComplaintMessage = "";
  state.selectedComplaintError = "";
  renderShell();
}

async function saveComplaintStatus(status = null) {
  const complaintId = value("selectedComplaintId") || state.selectedComplaintId;
  if (!complaintId) return;
  const nextStatus = status || value("selectedComplaintStatus");
  state.selectedComplaintMessage = "";
  state.selectedComplaintError = "";
  try {
    const complaint = await api(`/complaints/${encodeURIComponent(complaintId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: nextStatus,
        resolutionNotes: value("selectedComplaintNotes") || "Updated in Tereka Online"
      })
    });
    state.selectedComplaintMessage = `Complaint ${complaint.id} updated to ${labelize(complaint.status)}.`;
    const message = state.selectedComplaintMessage;
    await refreshAll();
    state.selectedComplaintId = complaint.id;
    state.selectedComplaintMessage = message;
    renderShell();
  } catch (error) {
    state.selectedComplaintError = error.message;
    renderShell();
  }
}

async function createNotificationTemplate(event) {
  event.preventDefault();
  state.notificationTemplateMessage = "";
  state.notificationTemplateError = "";
  try {
    const template = await api("/notification-templates", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newTemplateTenantId") || null,
        eventType: value("newTemplateEventType"),
        channel: value("newTemplateChannel"),
        title: value("newTemplateTitle"),
        body: value("newTemplateBody"),
        status: value("newTemplateStatus")
      })
    });
    state.notificationTemplateMessage = `Created template ${template.eventType} for ${labelize(template.channel)}.`;
    state.selectedTemplateId = template.id;
    await refreshAll();
    state.selectedTemplateId = template.id;
    state.notificationTemplateMessage = `Created template ${template.eventType} for ${labelize(template.channel)}.`;
    renderShell();
  } catch (error) {
    state.notificationTemplateError = error.message;
    renderShell();
  }
}

function openTemplateDetail(templateId) {
  state.selectedTemplateId = templateId;
  state.selectedTemplateMessage = "";
  state.selectedTemplateError = "";
  renderShell();
}

async function saveNotificationTemplate(event) {
  event.preventDefault();
  const templateId = value("selectedTemplateId") || state.selectedTemplateId;
  if (!templateId) return;
  state.selectedTemplateMessage = "";
  state.selectedTemplateError = "";
  try {
    const template = await api(`/notification-templates/${encodeURIComponent(templateId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        eventType: value("selectedTemplateEventType"),
        channel: value("selectedTemplateChannel"),
        title: value("selectedTemplateTitle"),
        body: value("selectedTemplateBody"),
        status: value("selectedTemplateStatus")
      })
    });
    state.selectedTemplateMessage = `Template ${template.eventType} saved.`;
    const message = state.selectedTemplateMessage;
    await refreshAll();
    state.selectedTemplateId = template.id;
    state.selectedTemplateMessage = message;
    renderShell();
  } catch (error) {
    state.selectedTemplateError = error.message;
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
  document.querySelectorAll("[data-summary-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.summaryView;
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
  document.querySelectorAll("[data-row-action='member-detail']").forEach((button) => {
    button.addEventListener("click", () => openMemberDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='transaction-detail']").forEach((button) => {
    button.addEventListener("click", () => openTransactionDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='loan-detail']").forEach((button) => {
    button.addEventListener("click", () => openLoanDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='complaint-detail']").forEach((button) => {
    button.addEventListener("click", () => openComplaintDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='template-detail']").forEach((button) => {
    button.addEventListener("click", () => openTemplateDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='welfare-claim-detail']").forEach((button) => {
    button.addEventListener("click", () => openWelfareClaimDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='governance-meeting-detail']").forEach((button) => {
    button.addEventListener("click", () => openGovernanceMeetingDetail(button.dataset.rowId));
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
  document.querySelector("[data-action='close-member-detail']")?.addEventListener("click", () => {
    state.selectedMemberId = "";
    state.selectedMember = null;
    state.selectedMemberStatement = null;
    state.selectedMemberNextOfKin = [];
    state.selectedMemberBeneficiaries = [];
    state.selectedMemberDocuments = [];
    state.selectedMemberMessage = "";
    state.selectedMemberError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-transaction-detail']")?.addEventListener("click", () => {
    state.selectedTransactionId = "";
    state.selectedTransactionReceipt = null;
    state.selectedTransactionMessage = "";
    state.selectedTransactionError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-loan-detail']")?.addEventListener("click", () => {
    state.selectedLoanId = "";
    state.selectedLoanGuarantors = [];
    state.selectedLoanRepayments = [];
    state.selectedLoanMessage = "";
    state.selectedLoanError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-complaint-detail']")?.addEventListener("click", () => {
    state.selectedComplaintId = "";
    state.selectedComplaintMessage = "";
    state.selectedComplaintError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-template-detail']")?.addEventListener("click", () => {
    state.selectedTemplateId = "";
    state.selectedTemplateMessage = "";
    state.selectedTemplateError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-welfare-claim-detail']")?.addEventListener("click", () => {
    state.selectedWelfareClaimId = "";
    state.selectedWelfareClaimMessage = "";
    state.selectedWelfareClaimError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-governance-meeting-detail']")?.addEventListener("click", () => {
    state.selectedMeetingId = "";
    state.selectedMeetingMessage = "";
    state.selectedMeetingError = "";
    renderShell();
  });
  document.querySelector("#addUserForm")?.addEventListener("submit", createUserFromForm);
  document.querySelector("#userRoleForm")?.addEventListener("submit", saveSelectedUserRole);
  document.querySelector("#newUserRoleId")?.addEventListener("change", (event) => {
    const preview = document.getElementById("newUserRolePreview");
    if (preview) preview.textContent = rolePreviewText(event.target.value, isPlatform());
  });
  document.querySelector("#selectedUserRoleId")?.addEventListener("change", (event) => {
    const selected = dataRows("users").find((user) => user.id === state.selectedUserId);
    const preview = document.getElementById("selectedUserRolePreview");
    if (preview) preview.textContent = rolePreviewText(event.target.value, selected?.tenantId === "tenant_platform");
  });
  document.querySelector("#memberRegistrationForm")?.addEventListener("submit", createMemberFromForm);
  document.querySelector("#transactionForm")?.addEventListener("submit", createTransactionFromForm);
  document.querySelector("#loanApplicationForm")?.addEventListener("submit", createLoanFromForm);
  document.querySelector("#loanGuarantorForm")?.addEventListener("submit", addLoanGuarantor);
  document.querySelector("#loanRepaymentForm")?.addEventListener("submit", recordLoanRepayment);
  document.querySelector("#complaintForm")?.addEventListener("submit", createComplaintFromForm);
  document.querySelector("#complaintStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveComplaintStatus();
  });
  document.querySelector("#notificationTemplateForm")?.addEventListener("submit", createNotificationTemplate);
  document.querySelector("#notificationTemplateEditForm")?.addEventListener("submit", saveNotificationTemplate);
  document.querySelector("#branchSetupForm")?.addEventListener("submit", createBranchFromForm);
  document.querySelectorAll("[data-product-form]").forEach((form) => form.addEventListener("submit", createFinancialProduct));
  document.querySelectorAll("[data-account-form]").forEach((form) => form.addEventListener("submit", openFinancialAccount));
  document.querySelector("#memberLoanForm")?.addEventListener("submit", submitMemberLoan);
  document.querySelector("#memberPaymentForm")?.addEventListener("submit", postMemberPayment);
  document.querySelector("#memberComplaintForm")?.addEventListener("submit", submitMemberComplaint);
  document.querySelector("#welfareClaimForm")?.addEventListener("submit", submitWelfareClaim);
  document.querySelector("#expenseForm")?.addEventListener("submit", postExpense);
  document.querySelector("#assetForm")?.addEventListener("submit", registerAsset);
  document.querySelector("#governanceMeetingForm")?.addEventListener("submit", createGovernanceMeeting);
  document.querySelector("#governanceResolutionForm")?.addEventListener("submit", createGovernanceResolution);
  document.querySelector("#memberStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    runMemberDecision("custom");
  });
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
  document.querySelectorAll("[data-member-decision]").forEach((button) => {
    button.addEventListener("click", () => runMemberDecision(button.dataset.memberDecision));
  });
  document.querySelectorAll("[data-transaction-action]").forEach((button) => {
    button.addEventListener("click", () => runTransactionAction(button.dataset.transactionAction));
  });
  document.querySelectorAll("[data-loan-action]").forEach((button) => {
    button.addEventListener("click", () => runLoanAction(button.dataset.loanAction));
  });
  document.querySelectorAll("[data-complaint-status]").forEach((button) => {
    button.addEventListener("click", () => saveComplaintStatus(button.dataset.complaintStatus));
  });
  document.querySelectorAll("[data-welfare-claim-action]").forEach((button) => {
    button.addEventListener("click", () => runWelfareClaimAction(button.dataset.welfareClaimAction));
  });
  document.querySelectorAll("[data-member-guarantor-action]").forEach((button) => {
    button.addEventListener("click", () => decideMemberGuarantor(button.dataset.rowId, button.dataset.memberGuarantorAction));
  });
  document.querySelectorAll("[data-member-draft-save]").forEach((button) => {
    button.addEventListener("click", () => saveMemberDraftFromForm(button.dataset.memberDraftSave));
  });
  document.querySelectorAll("[data-member-draft-sync]").forEach((button) => {
    button.addEventListener("click", () => syncMemberDraft(button.dataset.memberDraftSync));
  });
  document.querySelectorAll("[data-member-draft-discard]").forEach((button) => {
    button.addEventListener("click", () => discardMemberDraft(button.dataset.memberDraftDiscard));
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
    memberFormMessage: "",
    memberFormError: "",
    selectedMemberId: "",
    selectedMember: null,
    selectedMemberStatement: null,
    selectedMemberNextOfKin: [],
    selectedMemberBeneficiaries: [],
    selectedMemberDocuments: [],
    selectedMemberMessage: "",
    selectedMemberError: "",
    transactionFormMessage: "",
    transactionFormError: "",
    selectedTransactionId: "",
    selectedTransactionReceipt: null,
    selectedTransactionMessage: "",
    selectedTransactionError: "",
    loanFormMessage: "",
    loanFormError: "",
    selectedLoanId: "",
    selectedLoanGuarantors: [],
    selectedLoanRepayments: [],
    selectedLoanMessage: "",
    selectedLoanError: "",
    complaintFormMessage: "",
    complaintFormError: "",
    selectedComplaintId: "",
    selectedComplaintMessage: "",
    selectedComplaintError: "",
    notificationTemplateMessage: "",
    notificationTemplateError: "",
    selectedTemplateId: "",
    selectedTemplateMessage: "",
    selectedTemplateError: "",
    branchFormMessage: "",
    branchFormError: "",
    productFormMessage: "",
    productFormError: "",
    accountFormMessage: "",
    accountFormError: "",
    memberLoanMessage: "",
    memberLoanError: "",
    memberPaymentMessage: "",
    memberPaymentError: "",
    memberComplaintMessage: "",
    memberComplaintError: "",
    memberGuarantorMessage: "",
    memberGuarantorError: "",
    welfareClaimMessage: "",
    welfareClaimError: "",
    selectedWelfareClaimId: "",
    selectedWelfareClaimMessage: "",
    selectedWelfareClaimError: "",
    expenseFormMessage: "",
    expenseFormError: "",
    assetFormMessage: "",
    assetFormError: "",
    governanceMeetingMessage: "",
    governanceMeetingError: "",
    selectedMeetingId: "",
    selectedMeetingMessage: "",
    selectedMeetingError: "",
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

function auditRiskLevel(event) {
  const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["password", "role", "permission", "session", "reversal", "disbursed", "suspended", "terminated"].some((word) => text.includes(word))) return "High";
  if (["approved", "rejected", "status", "payment", "template", "complaint", "loan"].some((word) => text.includes(word))) return "Review";
  return "Normal";
}

function auditCategory(event) {
  const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["role", "permission", "password", "session", "login", "logout", "user"].some((word) => text.includes(word))) return "Access control";
  if (["reversal", "reverse", "corrected"].some((word) => text.includes(word))) return "Reversals";
  if (["approved", "rejected", "approval", "status", "decision", "submitted"].some((word) => text.includes(word))) return "Approvals";
  if (["transaction", "payment", "loan", "repayment", "expense", "asset", "product", "account", "branch"].some((word) => text.includes(word))) return "Financial activity";
  if (["complaint", "template", "notification"].some((word) => text.includes(word))) return "Operations";
  return "General";
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

function contextCode() {
  return state.tenant?.abbreviation || state.tenant?.registrationNo || state.tenant?.code || "GVS";
}

function memberStatementLines(dash) {
  const source = dash.statementLines || dash.recentTransactions || [];
  return source.map((line) => ({
    ...line,
    reference: line.reference || line.transactionReference || line.id,
    description: line.description || line.narration || line.type || "Member transaction",
    debit: line.debit ?? (Number(line.amount || 0) < 0 ? Math.abs(Number(line.amount || 0)) : 0),
    credit: line.credit ?? (Number(line.amount || 0) > 0 ? Number(line.amount || 0) : 0),
    runningBalance: line.runningBalance ?? Number(line.savingsBalance || 0) + Number(line.sharesBalance || 0) + Number(line.welfareBalance || 0),
    postedAt: line.postedAt || line.createdAt || line.date || ""
  }));
}

function initials(name) {
  return String(name || "TO").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function labelize(value) {
  return String(value).replace(/[_-]+/g, " ").replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").trim().replace(/^./, (char) => char.toUpperCase());
}

function normal(value) {
  return String(value || "").toLowerCase();
}

function sum(rows, ...keys) {
  return rows.reduce((total, row) => total + Number(keys.map((key) => row[key]).find((item) => item !== undefined) || 0), 0);
}

function formatValue(row, column) {
  const value = row[column] ?? row[snake(column)] ?? row[camelFallback(column)] ?? "";
  if (column.toLowerCase().includes("amount") || column.toLowerCase().includes("balance") || ["debit", "credit", "savings", "shares", "welfare", "loanPortfolio", "loansAtRisk", "expenseTotal", "assetCost", "assetNetBookValue"].includes(column)) return money.format(Number(value || 0));
  if (column.toLowerCase().includes("status") || column.toLowerCase().includes("severity")) return `<span class="status ${statusClass(value)}">${escapeHtml(String(value || "Pending"))}</span>`;
  return escapeHtml(String(value || "-"));
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
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
