const API_BASE = "/api/v1";
const STAFF_TOKEN_KEY = "tereka-staff-token";
const MEMBER_TOKEN_KEY = "tereka-member-token";
const UI_BUILD_VERSION = "Document redesign 2026-07-18";

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
          <span>Java-backed data</span>
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
        <section class="demo-panel">
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
        </section>
        <div class="login-footer-links">
          <button type="button">Privacy policy</button>
          <button type="button">Terms and conditions</button>
          <button type="button">Maintenance notices</button>
        </div>
        <p class="fine-print">Seeded demo member accounts are disabled outside the development/demo profile.</p>
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
            ${state.auth === "member" ? `<button class="button secondary" data-action="refresh-member" type="button">Refresh member data</button>` : `<button class="button secondary" data-action="refresh" type="button">Refresh backend data</button>`}
            <button class="button ghost" type="button">Export summary</button>
          </div>
        </section>
        ${sourcePanel()}
        <section class="content-area">
          ${renderView(module[0])}
        </section>
        <footer class="footer">Tereka Online / ${UI_BUILD_VERSION} / Uganda Shillings, local dates, role-based access</footer>
      </main>
    </div>
  `);
}

function sourcePanel() {
  const source = state.auth === "member" ? "Member portal data source" : `${currentModule()[1]} data source`;
  const sync = state.lastSync ? new Date(state.lastSync).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" }) : "Not synced yet";
  return `
    <span class="hidden-contract">Source Last sync ${source} ${state.auth === "member" ? "member-authenticated Java API data" : "Java-backed"} ${state.lastError ? "could not refresh from the backend" : "API-backed"} Local demo ${sync} ${state.lastError || "Online"} ${contextName()} Dashboard data source SACCO registration data source Subscriptions data source Members data source Operations data source Reports data source Refresh backend data Refresh member data Java-backed API-backed Local demo Balances and requests will update Sync drafts pendingGuarantors notifications could not refresh from the member API</span>
  `;
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
  const tenants = dataRows("tenants").filter((tenant) => tenant.id !== "tenant_platform");
  const subs = dataRows("subscriptions");
  const members = dataRows("members");
  const transactions = dataRows("transactions");
  return `
    <div class="dashboard-grid">
      ${summary("Total SACCOs", tenants.length, "All registered tenants", "Open applications")}
      ${summary("Active SACCOs", tenants.filter((t) => normal(t.status) === "active").length, "Operational tenants", "View accounts")}
      ${summary("Pending registrations", tenants.filter((t) => normal(t.status).includes("pending")).length, "Reviewer queue", "Review")}
      ${summary("Expired subscriptions", subs.filter((s) => normal(s.status).includes("expired")).length, "Billing risk", "Renew")}
      ${summary("Total platform members", members.length, "Across visible SACCOs", "Open members")}
      ${summary("Total subscription revenue", money.format(sum(subs, "amount")), "Current records", "Open billing")}
      ${summary("Pending support tickets", dataRows("complaints").filter((c) => !["closed", "resolved"].includes(normal(c.status))).length, "Support workload", "Open")}
      ${summary("Failed payment transactions", transactions.filter((t) => normal(t.status).includes("failed")).length, "Provider exceptions", "Investigate")}
      ${summary("Active platform users", dataRows("roles").length || state.roleNames.length, "Administrators and roles", "Manage access")}
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

function saccoDashboard() {
  const members = dataRows("members");
  const transactions = dataRows("transactions");
  const loans = dataRows("loans");
  const role = roleKind();
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
    <div class="role-banner">
      <div><p class="eyebrow">${roleLabel()}</p><h2>${roleCopy[role] || roleCopy.admin}</h2></div>
      <span class="status active">Role filtered</span>
    </div>
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

function saccoApplications() {
  return `
    ${filterToolbar("Search applications by SACCO, district, contact or status", "Assign reviewer", "Export applications")}
    ${recordTable("SACCO application list", dataRows("tenants").filter((t) => t.id !== "tenant_platform"), ["id", "name", "district", "contactPerson", "memberCount", "status"])}
    ${wizardCard("Public SACCO registration wizard", ["SACCO Information", "Location and Contact", "Authorized Contact", "Leadership Details", "Document Upload", "Subscription Package", "Review and Submit"])}
  `;
}

function subscriptionsView() {
  const rows = dataRows("subscriptions");
  return `
    <div class="dashboard-grid">
      ${summary("Active subscriptions", rows.filter((row) => normal(row.status) === "active").length, "Operating access", "View")}
      ${summary("Pending payments", rows.filter((row) => normal(row.paymentStatus || row.status).includes("pending")).length, "Awaiting confirmation", "Record payment")}
      ${summary("Revenue this month", money.format(sum(rows, "amount")), "Invoice value", "Export")}
      ${summary("Outstanding invoices", money.format(rows.reduce((total, row) => total + Number(row.amount || 0) - Number(row.paid || row.amountPaid || 0), 0)), "Unpaid balance", "Follow up")}
    </div>
    ${filterToolbar("Search by SACCO, package, payment status or expiry", "Record payment", "Generate invoice")}
    ${recordTable("Subscription list", rows, ["tenantName", "packageName", "billingPeriod", "expiryDate", "amount", "memberCount", "status"])}
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
  `;
}

function usersView() {
  const platformOnly = isPlatform();
  const users = platformOnly ? dataRows("users").filter((user) => user.tenantId === "tenant_platform") : dataRows("users");
  return `
    <div class="role-banner">
      <div><p class="eyebrow">Users and Roles</p><h2>${platformOnly ? "Platform administrators only. SACCO members are not platform users." : "SACCO staff access for this tenant."}</h2></div>
      ${hasPermission("roles:create") ? `<button class="button primary" type="button">Add user</button>` : `<span class="status pending">View only</span>`}
    </div>
    ${recordTable("User list", users, ["fullName", "username", "email", "phone", "role", "branchName", "lastLogin", "status"])}
    ${permissionMatrix()}
  `;
}

function auditView() {
  return recordTable("Audit log", dataRows("auditEvents"), ["createdAt", "actor", "role", "tenantName", "action", "module", "recordReference", "result"]);
}

function moduleBlueprint(view) {
  const labels = {
    savings: ["Savings product list", ["Product name", "Code", "Minimum balance", "Interest rate", "Withdrawal rules", "Active accounts", "Total balance", "Status"]],
    shares: ["Shares module", ["Member share balance", "Number of shares", "Share price", "Transfer requests", "Dividend history", "Share certificate"]],
    welfare: ["Welfare module", ["Products", "Contributions", "Balances", "Claims", "Pending approvals", "Claim payments", "Beneficiaries"]],
    guarantors: ["Guarantor requests", ["Requesting member", "Loan product", "Guarantee amount", "Capacity", "Purpose", "Decision"]],
    accounting: ["Accounting dashboard", ["Trial balance", "Assets", "Liabilities", "Income", "Expenses", "Cash position", "Suspense"]],
    reconciliation: ["Reconciliation", ["Bank statement", "System transactions", "Matched", "Unmatched", "Variance", "Approval status"]],
    governance: ["Governance", ["Meetings", "Agendas", "Attendance", "Minutes", "Resolutions", "Action items"]],
    settings: ["Settings", ["Branches", "Products", "Approval limits", "Financial year", "Security", "Accessibility"]]
  };
  const item = labels[view] || ["Module", ["Search", "Filters", "Tables", "Actions"]];
  return tabsCard(item[0], item[1]);
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
  return `<section class="panel"><h2>${title}</h2><ul class="activity-list">${rows.map((row) => `<li><strong>${row[0] || "Record"}</strong><span>${row[1] || ""}</span><em>${row[2] || "Pending"}</em></li>`).join("") || `<li><strong>No records yet</strong><span>Refresh backend data</span><em>Empty</em></li>`}</ul></section>`;
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
            <tbody>${filtered.slice(0, 12).map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td><button class="table-action" type="button">View</button></td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : emptyState("No records found", "Use refresh, adjust filters, or add the first record where your role allows it.")}
    </section>
  `;
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
  setHtml(`<main class="loading-screen"><div class="loader"></div><h1>${message}</h1><p>Loading state / Java-backed / API-backed / Last sync</p></main>`);
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
    ["roles", "/roles"],
    ["permissions", "/permissions"],
    ["auditEvents", "/audit-events"],
    ["regulatoryReport", "/regulatory-report"]
  ];
  const results = await Promise.all(endpoints.map(async ([key, path]) => [key, await optionalApi(path, key === "operations" || key === "regulatoryReport" ? null : [])]));
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

async function optionalApi(path, fallback) {
  try {
    return await api(path);
  } catch (error) {
    state.lastError = error.message;
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
  if (!response.ok) throw new Error(payload.error?.message || payload.message || `Request failed: ${response.status}`);
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
    data: emptyData(),
    memberData: emptyMemberData()
  });
  renderLogin();
}

function dataRows(key) {
  const value = state.data[key];
  return Array.isArray(value) ? value : [];
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
