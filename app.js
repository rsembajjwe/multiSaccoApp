const STORAGE_KEY = "sacco-platform-demo-v1";
const API_SESSION_KEY = "sacco-platform-api-session-v1";
const MEMBER_SESSION_KEY = "sacco-platform-member-session-v1";
const OFFLINE_DRAFTS_KEY = "sacco-platform-offline-drafts-v1";
const API_BASE = "/api/v1";

const navItems = [
  ["dashboard", "Dashboard", "overview"],
  ["registrations", "SACCO Registration", "tenants"],
  ["subscriptions", "Subscriptions", "billing"],
  ["members", "Members", "kyc"],
  ["transactions", "Transactions", "finance"],
  ["loans", "Loans", "credit"],
  ["approvals", "Approvals", "workflow"],
  ["operations", "Operations", "monitor"],
  ["reports", "Reports", "audit"]
];

const money = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0
});

const SUBSCRIPTION_UNIT_PRICE = 5000;
const MINIMUM_BILLABLE_MEMBERS = 100;
const SUBSCRIPTION_BILLING_TIERS = [
  { id: "per_member", label: "100-250 members", minMembers: 100, maxMembers: 250, unitPrice: SUBSCRIPTION_UNIT_PRICE, amount: null },
  { id: "starter_fixed", label: "251-500 members", minMembers: 251, maxMembers: 500, unitPrice: null, amount: 1200000 },
  { id: "growth_fixed", label: "501-2,500 members", minMembers: 501, maxMembers: 2500, unitPrice: null, amount: 3600000 },
  { id: "enterprise_fixed", label: "2,501-10,000 members", minMembers: 2501, maxMembers: 10000, unitPrice: null, amount: 9000000 }
];
const today = new Date("2026-07-15T12:00:00+03:00");

const seedData = {
  currentView: "dashboard",
  tenantId: "platform",
  tenants: [
    {
      id: "platform",
      name: "Platform Administration",
      abbreviation: "HQ",
      status: "Active",
      packageId: "enterprise",
      onboarding: 100,
      licenseExpiry: "2027-06-30",
      district: "Kampala",
      registrationNo: "PLATFORM-001",
      branches: [{ id: "hq", code: "HQ", name: "Head Office", manager: "Platform Admin" }]
    },
    {
      id: "green",
      name: "Green Valley SACCO",
      abbreviation: "GVS",
      status: "Approved",
      packageId: "growth",
      onboarding: 78,
      licenseExpiry: "2026-12-31",
      district: "Mukono",
      registrationNo: "COOP-UG-2389",
      branches: [
        { id: "g-main", code: "GV001", name: "Mukono Main", manager: "Sarah Kigozi" },
        { id: "g-east", code: "GV002", name: "Seeta Branch", manager: "Isaac Wamala" }
      ]
    },
    {
      id: "lake",
      name: "Lake Farmers SACCO",
      abbreviation: "LFS",
      status: "Pending Review",
      packageId: "starter",
      onboarding: 42,
      licenseExpiry: "2026-08-15",
      district: "Jinja",
      registrationNo: "COOP-UG-8112",
      branches: [{ id: "l-main", code: "LF001", name: "Jinja Main", manager: "Grace Namutebi" }]
    }
  ],
  packages: [
    { id: "starter", name: "Starter", price: 1200000, members: 500, minMembers: MINIMUM_BILLABLE_MEMBERS, tierLabel: "251-500 members", users: 8, branches: 1, modules: "Members, savings, shares" },
    { id: "growth", name: "Growth", price: 3600000, members: 2500, minMembers: MINIMUM_BILLABLE_MEMBERS, tierLabel: "501-2,500 members", users: 25, branches: 5, modules: "Core finance, loans, approvals, reports" },
    { id: "enterprise", name: "Enterprise", price: 9000000, members: 10000, minMembers: MINIMUM_BILLABLE_MEMBERS, tierLabel: "2,501-10,000 members", users: 100, branches: 25, modules: "All modules, API, advanced support" }
  ],
  subscriptions: [
    { id: "sub-1", tenantId: "green", packageId: "growth", status: "Active", invoice: "INV-2026-001", memberCount: 3, billableMembers: MINIMUM_BILLABLE_MEMBERS, unitPrice: SUBSCRIPTION_UNIT_PRICE, tierId: "per_member", tierLabel: "100-250 members", billingDescription: "UGX 5,000 per member, minimum 100", amount: 500000, paid: 500000, expiry: "2027-07-14" },
    { id: "sub-2", tenantId: "lake", packageId: "starter", status: "Pending Payment", invoice: "INV-2026-002", memberCount: 1, billableMembers: MINIMUM_BILLABLE_MEMBERS, unitPrice: SUBSCRIPTION_UNIT_PRICE, tierId: "per_member", tierLabel: "100-250 members", billingDescription: "UGX 5,000 per member, minimum 100", amount: 500000, paid: 0, expiry: "2026-07-30" }
  ],
  members: [
    { id: "m-1", tenantId: "green", no: "GVS-0001", name: "Amina Nakitende", phone: "+256701234567", nin: "CM9000012K4PA", type: "Individual", status: "Active", branchId: "g-main", kyc: "Verified", savings: 2450000, shares: 850000, welfare: 180000 },
    { id: "m-2", tenantId: "green", no: "GVS-0002", name: "Daniel Ssekajja", phone: "+256772222118", nin: "CM9000455K8AB", type: "Individual", status: "Active", branchId: "g-east", kyc: "Pending Verification", savings: 1220000, shares: 350000, welfare: 90000 },
    { id: "m-3", tenantId: "green", no: "GVS-0003", name: "Mukono Women Group", phone: "+256756300101", nin: "GROUP-1044", type: "Group", status: "Pending Approval", branchId: "g-main", kyc: "Not Verified", savings: 640000, shares: 500000, welfare: 120000 },
    { id: "m-4", tenantId: "lake", no: "LFS-0001", name: "Peter Ocen", phone: "+256704111889", nin: "CM8800142K2RE", type: "Individual", status: "Applicant", branchId: "l-main", kyc: "Pending Verification", savings: 280000, shares: 120000, welfare: 40000 }
  ],
  transactions: [
    { id: "tx-1", tenantId: "green", memberId: "m-1", type: "Savings Deposit", channel: "Mobile Money", amount: 250000, status: "Posted", ref: "GVS-TX-0001", date: "2026-07-14", maker: "Cashier", checker: "Treasurer" },
    { id: "tx-2", tenantId: "green", memberId: "m-2", type: "Share Purchase", channel: "Cash", amount: 100000, status: "Posted", ref: "GVS-TX-0002", date: "2026-07-14", maker: "Cashier", checker: "Accountant" },
    { id: "tx-3", tenantId: "green", memberId: "m-3", type: "Welfare Contribution", channel: "Bank", amount: 60000, status: "Pending Approval", ref: "GVS-TX-0003", date: "2026-07-15", maker: "Cashier", checker: "" }
  ],
  loans: [
    { id: "ln-1", tenantId: "green", memberId: "m-1", product: "Development Loan", amount: 3000000, balance: 2150000, status: "Active", stage: "Disbursed", guarantors: 2, dsr: 31 },
    { id: "ln-2", tenantId: "green", memberId: "m-2", product: "Emergency Loan", amount: 800000, balance: 800000, status: "Under Review", stage: "Credit Appraisal", guarantors: 1, dsr: 44 },
    { id: "ln-3", tenantId: "lake", memberId: "m-4", product: "Agriculture Loan", amount: 1500000, balance: 0, status: "Submitted", stage: "Guarantor Review", guarantors: 0, dsr: 27 }
  ],
  approvals: [
    { id: "ap-1", tenantId: "platform", title: "Approve Lake Farmers SACCO registration", type: "Tenant Registration", status: "Pending", requester: "Grace Namutebi", risk: "Medium" },
    { id: "ap-2", tenantId: "green", title: "Approve GVS-TX-0003 welfare posting", type: "Financial Posting", status: "Pending", requester: "Cashier", risk: "Low" },
    { id: "ap-3", tenantId: "green", title: "Emergency Loan for Daniel Ssekajja", type: "Loan Committee", status: "Pending", requester: "Credit Officer", risk: "High" }
  ],
  audit: [
    { at: "2026-07-15 11:30", tenantId: "platform", actor: "Platform Admin", action: "Created subscription invoice INV-2026-002" },
    { at: "2026-07-15 10:15", tenantId: "green", actor: "Treasurer", action: "Approved savings deposit GVS-TX-0001" },
    { at: "2026-07-14 16:20", tenantId: "green", actor: "SACCO Admin", action: "Updated loan product approval workflow" }
  ]
};

let state = loadState();
let offlineDrafts = loadOfflineDrafts();
let apiState = {
  health: "checking",
  user: null,
  token: localStorage.getItem(API_SESSION_KEY) || "",
  tenants: [],
  users: [],
  roles: [],
  permissions: [],
  branches: [],
  members: [],
  subscriptionPackages: [],
  subscriptions: [],
  financialProducts: [],
  financialAccounts: [],
  financialTransactions: [],
  welfareClaims: [],
  loans: [],
  accountingPeriods: [],
  chartOfAccounts: [],
  journalEntries: [],
  statementLines: [],
  reconciliation: null,
  regulatoryReport: null,
  suppliers: [],
  expenses: [],
  assets: [],
  mobileMoneyCallbacks: [],
  notificationDeliveries: [],
  notificationTemplates: [],
  governanceMeetings: [],
  complaints: [],
  approvalWorkflows: [],
  approvalDecisions: [],
  auditEvents: [],
  operationsStatus: null,
  message: "Checking backend connection..."
};
let memberApiState = {
  token: localStorage.getItem(MEMBER_SESSION_KEY) || "",
  member: null,
  tenant: null,
  branch: null,
  balances: null,
  mobileDashboard: null,
  guarantorRequests: [],
  notifications: [],
  message: "Member portal not signed in."
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(seedData);
}

function loadOfflineDrafts() {
  const saved = localStorage.getItem(OFFLINE_DRAFTS_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveOfflineDrafts() {
  localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(offlineDrafts));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentTenant() {
  return state.tenants.find((tenant) => tenant.id === state.tenantId) || state.tenants[0];
}

function tenantScoped(collection) {
  if (state.tenantId === "platform") return collection;
  return collection.filter((item) => item.tenantId === state.tenantId);
}

function tenantName(id) {
  return [...apiState.tenants, ...state.tenants].find((tenant) => tenant.id === id)?.name || "Unknown tenant";
}

function memberName(id) {
  const apiMember = apiState.members.find((member) => member.id === id);
  if (apiMember) return apiMember.fullName;
  return state.members.find((member) => member.id === id)?.name || "Unknown member";
}

function packageName(id) {
  return [...apiState.subscriptionPackages, ...state.packages].find((pkg) => pkg.id === id)?.name || "Unassigned";
}

function currentApiTenantId() {
  if (!apiState.user) return "";
  if (apiState.user.tenantId !== "tenant_platform") return apiState.user.tenantId;
  const map = { platform: "tenant_platform", green: "tenant_green", lake: "tenant_lake" };
  return map[state.tenantId] || "tenant_platform";
}

function apiTenantQuery() {
  const tenantId = currentApiTenantId();
  return apiState.user?.tenantId === "tenant_platform" && tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
}

function apiSubscriptionQuery() {
  return apiState.user?.tenantId === "tenant_platform" ? "" : apiTenantQuery();
}

function apiOperationsQuery() {
  if (apiState.user?.tenantId !== "tenant_platform") return "";
  if (state.tenantId === "platform") return "";
  const tenantId = currentApiTenantId();
  return tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
}

function useApiMembers() {
  return Boolean(apiState.user);
}

function useApiTenants() {
  return Boolean(apiState.user);
}

function useApiSubscriptions() {
  return Boolean(apiState.user);
}

function useApiTransactions() {
  return Boolean(apiState.user);
}

function useApiWelfareClaims() {
  return Boolean(apiState.user);
}

function useApiLoans() {
  return Boolean(apiState.user);
}

function calculateSubscriptionBilling(memberCount) {
  const safeMemberCount = Math.max(0, Number(memberCount) || 0);
  const tier = SUBSCRIPTION_BILLING_TIERS.find((item) => safeMemberCount <= item.maxMembers) || SUBSCRIPTION_BILLING_TIERS[SUBSCRIPTION_BILLING_TIERS.length - 1];
  const billableMembers = tier.id === "per_member" ? Math.max(safeMemberCount, MINIMUM_BILLABLE_MEMBERS) : safeMemberCount;
  const amount = tier.id === "per_member" ? billableMembers * SUBSCRIPTION_UNIT_PRICE : tier.amount;
  return {
    memberCount: safeMemberCount,
    billableMembers,
    unitPrice: tier.unitPrice,
    amount,
    tierId: tier.id,
    tierLabel: tier.label,
    billingDescription: tier.id === "per_member"
      ? `UGX 5,000 per member, minimum ${MINIMUM_BILLABLE_MEMBERS}`
      : `Fixed annual tier for ${tier.label}`
  };
}

function subscriptionBillingDetails(subscription) {
  const memberCount = subscription.memberCount ?? state.members.filter((member) => member.tenantId === subscription.tenantId).length;
  const computed = calculateSubscriptionBilling(memberCount);
  return {
    memberCount,
    billableMembers: subscription.billableMembers ?? computed.billableMembers,
    unitPrice: subscription.unitPrice ?? computed.unitPrice,
    amount: computed.amount,
    paid: Math.min(subscription.paid || 0, computed.amount),
    tierId: subscription.tierId || computed.tierId,
    tierLabel: subscription.tierLabel || computed.tierLabel,
    billingDescription: subscription.billingDescription || computed.billingDescription
  };
}

function apiPackageToRow(pkg) {
  return {
    id: pkg.id,
    name: pkg.name,
    price: pkg.price,
    members: pkg.members,
    minMembers: pkg.minMembers || MINIMUM_BILLABLE_MEMBERS,
    tierLabel: pkg.tierLabel,
    users: pkg.users,
    branches: pkg.branches,
    modules: pkg.modules
  };
}

function apiSubscriptionToRow(subscription) {
  return {
    id: subscription.id,
    tenantId: subscription.tenantId,
    packageId: subscription.packageId,
    status: titleCase(subscription.status.replace(/_/g, " ")),
    invoice: subscription.invoice,
    amount: subscription.amount,
    paid: subscription.paid,
    memberCount: subscription.memberCount,
    billableMembers: subscription.billableMembers,
    unitPrice: subscription.unitPrice,
    tierId: subscription.tierId,
    tierLabel: subscription.tierLabel,
    billingDescription: subscription.billingDescription,
    expiry: subscription.expiry,
    source: "API"
  };
}

function apiTransactionToRow(transaction) {
  return {
    id: transaction.id,
    tenantId: transaction.tenantId,
    memberId: transaction.memberId,
    type: titleCase(transaction.type.replace(/_/g, " ")),
    channel: titleCase(transaction.channel.replace(/_/g, " ")),
    amount: transaction.amount,
    status: titleCase(transaction.status.replace(/_/g, " ")),
    ref: transaction.reference,
    date: transaction.createdAt?.slice(0, 10) || "",
    maker: apiState.users.find((user) => user.id === transaction.makerUserId)?.fullName || "Maker",
    checker: transaction.checkerUserId ? (apiState.users.find((user) => user.id === transaction.checkerUserId)?.fullName || "Checker") : "",
    postedAt: transaction.postedAt,
    originalTransactionId: transaction.originalTransactionId,
    reversalReason: transaction.reversalReason,
    source: "API"
  };
}

function apiWelfareClaimToRow(claim) {
  return {
    id: claim.id,
    tenantId: claim.tenantId,
    memberId: claim.memberId,
    memberName: claim.memberName || memberName(claim.memberId),
    membershipNo: claim.membershipNo || "",
    claimType: titleCase(String(claim.claimType || "").replace(/_/g, " ")),
    amount: claim.amount,
    channel: claim.channel ? titleCase(claim.channel.replace(/_/g, " ")) : "Pending",
    reference: claim.reference,
    description: claim.description || "",
    status: titleCase(String(claim.status || "").replace(/_/g, " ")),
    submittedAt: claim.submittedAt?.slice(0, 10) || "",
    decidedAt: claim.decidedAt?.slice(0, 10) || "",
    paidAt: claim.paidAt?.slice(0, 10) || "",
    rejectionReason: claim.rejectionReason || "",
    source: "API"
  };
}

function apiLoanToRow(loan) {
  return {
    id: loan.id,
    tenantId: loan.tenantId,
    memberId: loan.memberId,
    product: loan.product,
    amount: loan.amount,
    balance: loan.balance,
    status: titleCase(loan.status.replace(/_/g, " ")),
    stage: loan.stage,
    guarantors: loan.guarantors,
    dsr: loan.dsr,
    guarantorRequests: loan.guarantorRequests || 0,
    pendingGuarantors: loan.pendingGuarantors || 0,
    repayments: loan.repayments || 0,
    repaymentTotal: loan.repaymentTotal || 0,
    source: "API"
  };
}

function apiTransactionApprovalItems() {
  return apiState.financialTransactions
    .filter((transaction) => transaction.status === "pending_approval")
    .map((transaction) => ({
      id: transaction.id,
      tenantId: transaction.tenantId,
      title: `Post ${transaction.reference} ${titleCase(transaction.type.replace(/_/g, " "))}`,
      type: "Financial Posting",
      requester: apiState.users.find((user) => user.id === transaction.makerUserId)?.fullName || "Maker",
      risk: transaction.amount > 1000000 ? "High" : "Low",
      source: "API"
    }));
}

function apiProductTypeLabel(type) {
  return titleCase(String(type || "").replace(/_/g, " "));
}

function apiTenantToRow(tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    abbreviation: tenant.abbreviation,
    status: titleCase(tenant.status.replace(/_/g, " ")),
    packageId: tenant.packageId,
    onboarding: tenant.onboardingPercent,
    licenseExpiry: tenant.licenseExpiry,
    district: tenant.district,
    registrationNo: tenant.registrationNo,
    source: "API"
  };
}

function apiBranchName(id) {
  return apiState.branches.find((branch) => branch.id === id)?.name || "Unassigned";
}

function apiMemberToRow(member) {
  return {
    id: member.id,
    tenantId: member.tenantId,
    no: member.membershipNo,
    name: member.fullName,
    phone: member.phone,
    type: titleCase(member.memberType),
    status: titleCase(member.status.replace(/_/g, " ")),
    branchId: member.branchId,
    branchName: apiBranchName(member.branchId),
    kyc: titleCase(member.kycStatus.replace(/_/g, " ")),
    savings: Number(member.savingsBalance || 0),
    shares: Number(member.sharesBalance || 0),
    welfare: Number(member.welfareBalance || 0),
    source: "API"
  };
}

function titleCase(value) {
  return String(value).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function statusClass(status) {
  return String(status).toLowerCase().replace(/\s+/g, "-").replace("pending-payment", "pending").replace("pending-review", "review");
}

function init() {
  renderTenantSelect();
  renderNav();
  bindGlobalActions();
  render();
  refreshApiStatus();
  refreshMemberStatus();
}

function renderTenantSelect() {
  const select = document.getElementById("tenantSelect");
  select.innerHTML = state.tenants.map((tenant) => `<option value="${tenant.id}">${tenant.name}</option>`).join("");
  select.value = state.tenantId;
  select.addEventListener("change", () => {
    state.tenantId = select.value;
    saveState();
    render();
    if (apiState.user?.tenantId === "tenant_platform") refreshApiStatus();
  });
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = navItems.map(([id, label, hint]) => `
    <button class="nav-item" type="button" data-view="${id}">
      <span>${label}</span>
      <small>${hint}</small>
    </button>
  `).join("");

  nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    state.currentView = button.dataset.view;
    saveState();
    render();
  });
}

function bindGlobalActions() {
  document.getElementById("resetDemo").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(seedData);
    renderTenantSelect();
    render();
  });

  document.getElementById("newMemberBtn").addEventListener("click", openMemberForm);
  document.getElementById("memberPortalBtn").addEventListener("click", () => {
    if (!memberApiState.member) {
      openMemberLoginForm();
      return;
    }
    state.currentView = "memberPortal";
    saveState();
    render();
  });
  document.getElementById("apiLoginBtn").addEventListener("click", openApiLoginForm);
  document.getElementById("apiLogoutBtn").addEventListener("click", apiLogout);
}

function render() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
  });

  document.getElementById("tenantSelect").value = state.tenantId;
  document.getElementById("sessionRole").textContent = state.tenantId === "platform" ? "Platform Administrator" : "SACCO Administrator";
  renderApiChrome();

  const titles = {
    dashboard: ["Dashboard", "Command center"],
    registrations: ["Platform", "SACCO registrations"],
    subscriptions: ["Billing", "Subscription management"],
    members: ["SACCO", "Member management"],
    transactions: ["Finance", "Savings, shares and welfare"],
    loans: ["Credit", "Loan processing"],
    approvals: ["Governance", "Approval workflow"],
    operations: ["Operations", "Monitoring and release readiness"],
    reports: ["Controls", "Reports and audit trail"],
    memberPortal: ["Member Portal", "Self-service account"]
  };
  const [kicker, title] = titles[state.currentView] || titles.dashboard;
  document.getElementById("sectionKicker").textContent = kicker;
  document.getElementById("pageTitle").textContent = title;

  const routes = {
    dashboard: renderDashboard,
    registrations: renderRegistrations,
    subscriptions: renderSubscriptions,
    members: renderMembers,
    transactions: renderTransactions,
    loans: renderLoans,
    approvals: renderApprovals,
    operations: renderOperations,
    reports: renderReports,
    memberPortal: renderMemberPortal
  };

  document.getElementById("app").innerHTML = routes[state.currentView]();
  bindViewActions();
}

function renderDashboard() {
  const tenant = currentTenant();
  const usingApi = Boolean(apiState.user);
  const operations = apiState.operationsStatus || {};
  const operationCounts = operations.counts || {};
  const members = usingApi ? apiState.members.map(apiMemberToRow) : tenantScoped(state.members);
  const transactions = usingApi ? apiState.financialTransactions.map(apiTransactionToRow) : tenantScoped(state.transactions);
  const loans = usingApi ? apiState.loans.map(apiLoanToRow) : tenantScoped(state.loans);
  const approvals = usingApi ? apiTransactionApprovalItems() : tenantScoped(state.approvals).filter((item) => item.status === "Pending");
  const deposits = transactions.filter((tx) => tx.status === "Posted").reduce((sum, tx) => sum + tx.amount, 0);
  const portfolio = loans.reduce((sum, loan) => sum + (loan.balance || 0), 0);
  const activeMembers = usingApi ? (operationCounts.activeMembers || members.filter((m) => m.status === "Active").length) : members.filter((m) => m.status === "Active").length;
  const alertCount = operations.alerts?.length || 0;

  return `
    <div class="grid metrics">
      ${metric("Registered members", usingApi ? (operationCounts.members || members.length) : members.length, `${activeMembers} active`)}
      ${metric("Posted collections", money.format(deposits), usingApi ? "API-backed postings" : "tenant-filtered")}
      ${metric("Loan portfolio", money.format(portfolio), `${usingApi ? (operationCounts.openLoans || loans.length) : loans.filter((l) => l.status !== "Closed").length} open loan files`)}
      ${metric("Pending approvals", usingApi ? (operationCounts.pendingFinancialTransactions || approvals.length) : approvals.length, "maker-checker controls")}
    </div>

    <div class="grid two" style="margin-top:16px">
      <section class="card">
        <div class="toolbar">
          <div>
            <h2>${tenant.name}</h2>
            <p class="eyebrow">${tenant.status} tenant</p>
          </div>
          <span class="status ${statusClass(tenant.status)}">${tenant.status}</span>
        </div>
        <div class="grid three">
          ${miniFact("District", tenant.district)}
          ${miniFact("Registration", tenant.registrationNo)}
          ${miniFact("Package", packageName(tenant.packageId))}
        </div>
        <h3 style="margin-top:18px">Onboarding progress</h3>
        <div class="progress" aria-label="Onboarding progress"><span style="width:${tenant.onboarding}%"></span></div>
        <p style="margin-top:10px;color:var(--muted)">${tenant.onboarding}% complete. Live financial processing requires approved registration, active subscription, branches, products, roles, and opening balances.</p>
      </section>

      <section class="card">
        <h2>Control alerts</h2>
        <ul class="list">
          ${usingApi ? alertItem("Operations status", alertCount ? `${alertCount} alert(s)` : "Clear", alertCount ? "pending" : "active") : alertItem("Licence monitoring", daysTo(tenant.licenseExpiry) < 90 ? "Expiry attention needed" : "Valid", daysTo(tenant.licenseExpiry) < 90 ? "overdue" : "active")}
          ${alertItem("Tenant isolation", usingApi ? `${operations.scope === "platform" ? "Platform scope" : tenantName(operations.scope || currentApiTenantId())}` : "All tables are filtered by tenant in this demo", "active")}
          ${alertItem("Idempotency", "Payment and posting references are unique", "active")}
          ${alertItem("Audit events", `${usingApi ? apiState.auditEvents.length : state.audit.length} sensitive actions captured`, "trial")}
        </ul>
      </section>
    </div>

    <section class="card api-panel" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Backend connection</h2>
          <p class="eyebrow">Sprint 1 API foundation</p>
        </div>
        <span class="status ${apiState.health === "online" ? "active" : apiState.health === "offline" ? "overdue" : "trial"}">${apiState.health}</span>
      </div>
      <div class="grid three">
        ${miniFact("Authenticated user", apiState.user ? apiState.user.fullName : "Not logged in")}
        ${miniFact("Operations scope", operations.scope || "Not loaded")}
        ${miniFact("API members", String(operationCounts.members || apiState.members.length))}
      </div>
      <p class="muted">${apiState.message}</p>
      ${apiState.user ? `<div class="toolbar" style="margin-top:14px;margin-bottom:0"><button class="secondary-button" data-view-jump="operations" type="button">Open operations center</button><button class="secondary-button" data-action="refreshApi" type="button">Refresh backend data</button></div>` : ""}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Android member app</h2>
          <p class="eyebrow">Flutter foundation · mobile/member_app</p>
        </div>
        <button class="secondary-button" data-view-jump="memberPortal" type="button">Open member portal</button>
      </div>
      <div class="grid metrics">
        ${metric("Mobile auth", "Ready", "member token flow")}
        ${metric("Dashboard API", "Ready", "/member-auth/mobile-dashboard")}
        ${metric("Offline drafts", "Ready", "local save + sync")}
      </div>
      <div class="notice" style="margin-top:16px">Android emulator API base: <strong>http://10.0.2.2:5173/api/v1</strong>. Seed login: <strong>GVS-0001</strong> / <strong>Member@12345</strong>.</div>
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Security hardening</h2>
          <p class="eyebrow">Phase 7 production controls</p>
        </div>
        <span class="status active">enabled</span>
      </div>
      <div class="grid metrics">
        ${metric("Security headers", "On", "nosniff, frame deny, referrer policy")}
        ${metric("Rate limiting", "On", "staff login, member login, callbacks")}
        ${metric("API cache policy", "No-store", "JSON responses")}
      </div>
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Mobile money callbacks</h2>
          <p class="eyebrow">Provider posting monitor</p>
        </div>
        <button class="primary-button" data-action="simulateMobileMoneyCallback" type="button">Simulate callback</button>
      </div>
      <div class="grid metrics">
        ${metric("Callbacks", apiState.mobileMoneyCallbacks.length, `${money.format(apiState.mobileMoneyCallbacks.reduce((sum, item) => sum + item.amount, 0))} received`)}
        ${metric("SMS sent", apiState.notificationDeliveries.filter((item) => item.channel === "sms").length, "demo provider")}
        ${metric("Email sent", apiState.notificationDeliveries.filter((item) => item.channel === "email").length, "demo provider")}
      </div>
      ${mobileMoneyCallbackTable(apiState.mobileMoneyCallbacks.slice(0, 5))}
      ${notificationDeliveryTable(apiState.notificationDeliveries.slice(0, 5))}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <h2>Recent activity</h2>
        <button class="secondary-button" data-view-jump="reports" type="button">View audit</button>
      </div>
      ${auditTable(tenantScoped(state.audit).slice(0, 5))}
    </section>
  `;
}

function renderRegistrations() {
  const tenants = useApiTenants()
    ? apiState.tenants.filter((tenant) => tenant.id !== "tenant_platform").map(apiTenantToRow)
    : state.tenants.filter((tenant) => tenant.id !== "platform");
  const source = useApiTenants() ? "API-backed" : "Local demo";
  const canCreateOnApi = apiState.user?.tenantId === "tenant_platform";
  const approvedTenants = tenants.filter((tenant) => tenant.status === "Approved").length;
  const pendingTenants = tenants.filter((tenant) => tenant.status === "Pending Review").length;
  const suspendedTenants = tenants.filter((tenant) => tenant.status === "Suspended").length;
  const expiringTenants = tenants.filter((tenant) => daysTo(tenant.licenseExpiry) <= 60).length;
  const averageOnboarding = tenants.length ? Math.round(tenants.reduce((sum, tenant) => sum + (tenant.onboarding || 0), 0) / tenants.length) : 0;
  const packageCoverage = new Set(tenants.map((tenant) => tenant.packageId).filter(Boolean)).size;
  const districtCoverage = new Set(tenants.map((tenant) => tenant.district).filter(Boolean)).size;
  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>SACCO onboarding control center</h2>
          <p class="eyebrow">${source} &middot; applications, licence readiness, packages and tenant activation</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
      </div>
      <div class="grid metrics">
        ${metric("Applications", tenants.length, `${pendingTenants} pending review`)}
        ${metric("Approved", approvedTenants, `${suspendedTenants} suspended`)}
        ${metric("Licence watch", expiringTenants, "expiring within 60 days")}
        ${metric("Onboarding", `${averageOnboarding}%`, `${districtCoverage} district(s) covered`)}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${metric("Package coverage", packageCoverage, "subscription tiers in use")}
        ${metric("Backend source", useApiTenants() ? "Live" : "Demo", canCreateOnApi ? "platform approvals enabled" : "tenant-limited view")}
        ${metric("Activation gate", pendingTenants === 0 ? "Clear" : "Review", pendingTenants === 0 ? "no pending applications" : "applications need decision")}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>SACCO applications</h2>
          <p class="eyebrow">${source} · Self-registration, compliance checks and approval history</p>
        </div>
        ${apiState.user && !canCreateOnApi ? "" : `<button class="primary-button" data-action="newTenant" type="button">New SACCO application</button>`}
      </div>
      ${apiState.user ? `<div class="notice">${canCreateOnApi ? "Platform Admin is managing SACCO applications from the backend." : "Your API account can view only its own tenant."}</div>` : `<div class="notice">Login as Platform Admin to create and approve SACCO tenants through the backend.</div>`}
      <div class="table-wrap">
        <table>
          <thead><tr><th>SACCO</th><th>District</th><th>Licence expiry</th><th>Package</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${tenants.map((tenant) => `
              <tr>
                <td><strong>${tenant.name}</strong><br><span class="pill">${tenant.registrationNo}${tenant.source ? ` · ${tenant.source}` : ""}</span></td>
                <td>${tenant.district}</td>
                <td>${tenant.licenseExpiry}<br><small>${daysTo(tenant.licenseExpiry)} days remaining</small></td>
                <td>${packageName(tenant.packageId)}</td>
                <td><span class="status ${statusClass(tenant.status)}">${tenant.status}</span></td>
                <td><div class="filters">
                  ${apiState.user ? `<button class="secondary-button" data-tenant-profile="${tenant.id}" type="button">Profile</button>` : ""}
                  ${apiState.user && !canCreateOnApi ? "" : `<button class="secondary-button" data-approve-tenant="${tenant.id}" type="button">Approve</button>`}
                </div></td>
              </tr>
            `).join("") || `<tr><td colspan="6">No SACCO applications found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSubscriptions() {
  const packages = useApiSubscriptions() ? apiState.subscriptionPackages.map(apiPackageToRow) : state.packages;
  const subscriptions = useApiSubscriptions() ? apiState.subscriptions.map(apiSubscriptionToRow) : state.subscriptions;
  const canRecordApiPayment = apiState.user?.tenantId === "tenant_platform";
  const source = useApiSubscriptions() ? "API-backed" : "Local demo";
  const billingRows = subscriptions.map((subscription) => subscriptionBillingDetails(subscription));
  const invoiceTotal = billingRows.reduce((sum, billing) => sum + billing.amount, 0);
  const paidTotal = billingRows.reduce((sum, billing) => sum + billing.paid, 0);
  const outstandingTotal = Math.max(0, invoiceTotal - paidTotal);
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "Active").length;
  const pendingSubscriptions = subscriptions.filter((subscription) => subscription.status !== "Active").length;
  const perMemberSubscriptions = billingRows.filter((billing) => billing.tierId === "per_member").length;
  const fixedTierSubscriptions = billingRows.length - perMemberSubscriptions;
  const billableMembers = billingRows.reduce((sum, billing) => sum + billing.billableMembers, 0);
  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>Billing control center</h2>
          <p class="eyebrow">${source} &middot; invoices, payments, member counts and annual subscription tiers</p>
        </div>
        ${useApiSubscriptions() && !canRecordApiPayment ? "" : `<button class="primary-button" data-action="recordSubscriptionPayment" type="button">Record payment</button>`}
      </div>
      <div class="grid metrics">
        ${metric("Invoice total", money.format(invoiceTotal), `${subscriptions.length} subscription invoice(s)`)}
        ${metric("Paid", money.format(paidTotal), `${money.format(outstandingTotal)} outstanding`)}
        ${metric("Active", activeSubscriptions, `${pendingSubscriptions} pending or inactive`)}
        ${metric("Billable members", billableMembers, `${MINIMUM_BILLABLE_MEMBERS} member minimum applies`)}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${metric("Per-member tier", perMemberSubscriptions, `${money.format(SUBSCRIPTION_UNIT_PRICE)} per member up to 250`)}
        ${metric("Fixed tiers", fixedTierSubscriptions, "251-500, 501-2,500, 2,501-10,000")}
        ${metric("Payment access", canRecordApiPayment ? "Platform" : (apiState.user ? "View only" : "Demo"), canRecordApiPayment ? "backend payment posting enabled" : (apiState.user ? "tenant subscription view" : "local payment demo"))}
      </div>
    </section>
    <div class="grid three" style="margin-top:16px">
      <section class="card">
        <h2>100-250 members</h2>
        <p><strong>${money.format(SUBSCRIPTION_UNIT_PRICE)}</strong> per member / year</p>
        <ul class="list">
          <li><span>Minimum billable members</span><strong>${MINIMUM_BILLABLE_MEMBERS}</strong></li>
          <li><span>Minimum annual invoice</span><strong>${money.format(MINIMUM_BILLABLE_MEMBERS * SUBSCRIPTION_UNIT_PRICE)}</strong></li>
          <li><span>Applies up to</span><strong>250 members</strong></li>
        </ul>
      </section>
      ${packages.map((pkg) => `
        <section class="card">
          <h2>${pkg.name}</h2>
          <p><strong>${money.format(pkg.price)}</strong> per year</p>
          <ul class="list">
            <li><span>Billing band</span><strong>${pkg.tierLabel || `Up to ${pkg.members.toLocaleString()}`}</strong></li>
            <li><span>Member limit</span><strong>${pkg.members.toLocaleString()}</strong></li>
            <li><span>Users</span><strong>${pkg.users}</strong></li>
            <li><span>Branches</span><strong>${pkg.branches}</strong></li>
            <li><span>Modules</span><strong>${pkg.modules}</strong></li>
          </ul>
        </section>
      `).join("")}
    </div>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Invoices and payments</h2>
          <p class="eyebrow">${source} · Subscription lifecycle</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
      </div>
      ${useApiSubscriptions() ? `<div class="notice">${canRecordApiPayment ? "Platform Admin is managing subscription payments from the backend." : "Your API account can view only its own SACCO subscription."}</div>` : `<div class="notice">Login as Platform Admin to record subscription payments through the backend.</div>`}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>SACCO</th><th>Package</th><th>Members</th><th>Amount</th><th>Paid</th><th>Expiry</th><th>Status</th></tr></thead>
          <tbody>
            ${subscriptions.map(subscriptionRow).join("") || `<tr><td colspan="8">No subscriptions found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function subscriptionRow(sub) {
  const billing = subscriptionBillingDetails(sub);
  return `
    <tr>
      <td>${sub.invoice}${sub.source ? `<br><small>${sub.source}</small>` : ""}</td>
      <td>${tenantName(sub.tenantId)}</td>
      <td>${packageName(sub.packageId)}<br><small>${billing.tierLabel}</small></td>
      <td>${billing.memberCount.toLocaleString()} actual<br><small>${billing.billingDescription}</small></td>
      <td>${money.format(billing.amount)}</td>
      <td>${money.format(billing.paid)}</td>
      <td>${sub.expiry}</td>
      <td><span class="status ${statusClass(sub.status)}">${sub.status}</span></td>
    </tr>
  `;
}

function renderMembers() {
  const members = useApiMembers() ? apiState.members.map(apiMemberToRow) : tenantScoped(state.members);
  const source = useApiMembers() ? "API-backed" : "Local demo";
  const activeMembers = members.filter((member) => member.status === "Active").length;
  const verifiedMembers = members.filter((member) => member.kyc === "Verified").length;
  const totalSavings = members.reduce((sum, member) => sum + (member.savings || 0), 0);
  const totalShares = members.reduce((sum, member) => sum + (member.shares || 0), 0);
  const totalWelfare = members.reduce((sum, member) => sum + (member.welfare || 0), 0);
  const branchCount = new Set(members.map((member) => member.branchId).filter(Boolean)).size;
  return `
    <div class="grid metrics">
      ${metric("Members", members.length, `${activeMembers} active`)}
      ${metric("KYC verified", `${verifiedMembers}/${members.length}`, `${members.length - verifiedMembers} pending or expired`)}
      ${metric("Branch coverage", branchCount, useApiMembers() ? "backend branches represented" : "demo branches represented")}
      ${metric("Member funds", money.format(totalSavings + totalShares + totalWelfare), "savings + shares + welfare")}
    </div>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Member balance snapshot</h2>
          <p class="eyebrow">${source} &middot; Server-confirmed balances after API login</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-view-jump="operations" type="button">View operations health</button>` : ""}
      </div>
      <div class="grid three">
        ${metric("Savings", money.format(totalSavings), "member deposit balances")}
        ${metric("Shares", money.format(totalShares), "member share capital")}
        ${metric("Welfare", money.format(totalWelfare), "member welfare balances")}
      </div>
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Member register</h2>
          <p class="eyebrow">${source} · KYC, status, balances and branch access</p>
        </div>
        <div class="filters">
          <input class="input" id="memberSearch" placeholder="Search members">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="memberImportTemplate" type="button">Import template</button>` : ""}
          <button class="primary-button" data-action="newMember" type="button">Register member</button>
        </div>
      </div>
      ${apiState.user ? `<div class="notice">Members shown from the backend for ${apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant"}.</div>` : `<div class="notice">Login to the API to use server-side member onboarding. The table below is still using local demo data.</div>`}
      <div class="table-wrap">
        <table id="membersTable">
          <thead><tr><th>Member</th><th>Type</th><th>Branch</th><th>KYC</th><th>Savings</th><th>Shares</th><th>Welfare</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${members.map(memberRow).join("") || `<tr><td colspan="9">No members found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTransactions() {
  const transactions = useApiTransactions() ? apiState.financialTransactions.map(apiTransactionToRow) : tenantScoped(state.transactions);
  const welfareClaims = useApiWelfareClaims() ? apiState.welfareClaims.map(apiWelfareClaimToRow) : [];
  const products = apiState.financialProducts || [];
  const accounts = apiState.financialAccounts || [];
  const source = useApiTransactions() ? "API-backed" : "Local demo";
  const postedTransactions = transactions.filter((tx) => tx.status === "Posted");
  const pendingTransactions = transactions.filter((tx) => tx.status === "Pending Approval");
  const rejectedTransactions = transactions.filter((tx) => tx.status === "Rejected");
  const reversalTransactions = transactions.filter((tx) => tx.originalTransactionId);
  const reversedOriginalIds = new Set(reversalTransactions.map((tx) => tx.originalTransactionId));
  const reversibleTransactions = postedTransactions.filter((tx) => !tx.originalTransactionId && !reversedOriginalIds.has(tx.id));
  const postedTotal = postedTransactions.filter((tx) => !tx.originalTransactionId).reduce((sum, tx) => sum + tx.amount, 0);
  const pendingTotal = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const reversalTotal = reversalTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const distinctMembers = new Set(transactions.map((tx) => tx.memberId).filter(Boolean)).size;
  const channelCount = new Set(transactions.map((tx) => tx.channel).filter(Boolean)).size;
  const pendingClaims = welfareClaims.filter((claim) => claim.status === "Submitted").length;
  const approvedClaims = welfareClaims.filter((claim) => claim.status === "Approved").length;
  const paidClaimTotal = welfareClaims.filter((claim) => claim.status === "Paid").reduce((sum, claim) => sum + claim.amount, 0);
  return `
    ${apiState.user ? `
      <section class="card">
        <div class="toolbar">
          <div>
            <h2>Products and accounts</h2>
            <p class="eyebrow">API-backed &middot; savings, shares and welfare setup</p>
          </div>
          <div class="filters">
            <button class="secondary-button" data-action="newFinancialAccount" type="button">Open account</button>
            <button class="primary-button" data-action="newFinancialProduct" type="button">New product</button>
          </div>
        </div>
        <div class="grid metrics">
          ${metric("Products", products.length, `${products.filter((item) => item.status === "active").length} active`)}
          ${metric("Accounts", accounts.length, `${accounts.filter((item) => item.status === "active").length} active`)}
          ${metric("Members covered", new Set(accounts.map((item) => item.memberId)).size, "with financial accounts")}
        </div>
        <div class="grid two" style="margin-top:16px">
          ${financialProductTable(products)}
          ${financialAccountTable(accounts)}
        </div>
      </section>
    ` : ""}
    <section class="card" style="margin-top:${apiState.user ? "16px" : "0"}">
      <div class="toolbar">
        <div>
          <h2>Posting control center</h2>
          <p class="eyebrow">${source} &middot; teller intake, checker queue, receipts, statements and reversals</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-view-jump="approvals" type="button">Open approvals</button>` : ""}
      </div>
      <div class="grid metrics">
        ${metric("Posted value", money.format(postedTotal), `${postedTransactions.length} posted movement(s)`)}
        ${metric("Pending value", money.format(pendingTotal), `${pendingTransactions.length} awaiting checker`)}
        ${metric("Reversed value", money.format(reversalTotal), `${reversalTransactions.length} reversal movement(s)`)}
        ${metric("Members touched", distinctMembers, `${channelCount} payment channel(s)`)}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${metric("Reversible", reversibleTransactions.length, "posted originals still eligible")}
        ${metric("Rejected", rejectedTransactions.length, "declined by checker")}
        ${metric("Statement-ready", postedTransactions.length, "posted rows in member statements")}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Financial postings</h2>
          <p class="eyebrow">${source} · Fixed precision amounts, references, maker-checker and reversals</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
        <button class="primary-button" data-action="newTransaction" type="button">Post transaction</button>
      </div>
      ${apiState.user ? `<div class="notice">Transactions shown from the backend for ${apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant"}.</div>` : `<div class="notice">Login to the API to post server-side financial transactions. The table below is local demo data.</div>`}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Reference</th><th>Member</th><th>Type</th><th>Channel</th><th>Amount</th><th>Maker</th><th>Checker</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${transactions.map((tx) => `
              <tr>
                <td>${tx.ref}${tx.source ? `<br><small>${tx.source}${tx.originalTransactionId ? " reversal" : ""}</small>` : `<br><small>${tx.date}</small>`}</td>
                <td>${memberName(tx.memberId)}</td>
                <td>${tx.type}</td>
                <td>${tx.channel}</td>
                <td>${money.format(tx.amount)}</td>
                <td>${tx.maker}</td>
                <td>${tx.checker || "Pending"}</td>
                <td><span class="status ${statusClass(tx.status)}">${tx.status}</span></td>
                <td>${apiState.user ? transactionActions(tx) : ""}</td>
              </tr>
            `).join("") || `<tr><td colspan="9">No financial postings found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
    ${apiState.user ? `
      <section class="card" style="margin-top:16px">
        <div class="toolbar">
          <div>
            <h2>Welfare claims</h2>
            <p class="eyebrow">API-backed &middot; member support, approvals, payouts and welfare fund journals</p>
          </div>
          <div class="filters">
            <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
            <button class="primary-button" data-action="newWelfareClaim" type="button">New claim</button>
          </div>
        </div>
        <div class="grid metrics">
          ${metric("Submitted", pendingClaims, "awaiting decision")}
          ${metric("Approved", approvedClaims, "ready for payment")}
          ${metric("Paid", money.format(paidClaimTotal), "welfare support released")}
        </div>
        ${welfareClaimTable(welfareClaims)}
      </section>
    ` : ""}
  `;
}

function financialProductTable(products) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Code</th><th>Product</th><th>Type</th><th>Contribution</th><th>Minimum</th></tr></thead>
        <tbody>
          ${products.map((product) => `
            <tr>
              <td>${product.code}</td>
              <td>${product.name}<br><small>${product.status}</small></td>
              <td>${apiProductTypeLabel(product.productType)}</td>
              <td>${money.format(product.contributionAmount || 0)}</td>
              <td>${money.format(product.minimumBalance || 0)}</td>
            </tr>
          `).join("") || `<tr><td colspan="5">No products found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function financialAccountTable(accounts) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Account</th><th>Member</th><th>Product</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>
          ${accounts.map((account) => `
            <tr>
              <td>${account.accountNo}</td>
              <td>${account.memberName || memberName(account.memberId)}<br><small>${account.membershipNo || ""}</small></td>
              <td>${account.productName || account.productCode}<br><small>${account.productCode || ""}</small></td>
              <td>${apiProductTypeLabel(account.accountType)}</td>
              <td><span class="status ${statusClass(account.status)}">${titleCase(account.status)}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="5">No accounts found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function transactionActions(tx) {
  const isPosted = tx.status === "Posted";
  const canReverse = isPosted && !tx.originalTransactionId && !apiState.financialTransactions.some((item) => item.originalTransactionId === tx.id);
  return `
    <div class="filters">
      <button class="secondary-button" data-member-statement="${tx.memberId}" type="button">Statement</button>
      ${isPosted ? `<button class="secondary-button" data-transaction-receipt="${tx.id}" type="button">Receipt</button>` : ""}
      ${canReverse ? `<button class="secondary-button" data-transaction-reversal="${tx.id}" type="button">Reverse</button>` : ""}
    </div>
  `;
}

function welfareClaimTable(claims) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Reference</th><th>Member</th><th>Type</th><th>Amount</th><th>Channel</th><th>Status</th><th>Timeline</th><th>Action</th></tr></thead>
        <tbody>
          ${claims.map((claim) => `
            <tr>
              <td>${claim.reference}<br><small>${claim.source}</small></td>
              <td>${claim.memberName}<br><small>${claim.membershipNo}</small></td>
              <td>${claim.claimType}<br><small>${claim.description || claim.rejectionReason || ""}</small></td>
              <td>${money.format(claim.amount)}</td>
              <td>${claim.channel}</td>
              <td><span class="status ${statusClass(claim.status)}">${claim.status}</span></td>
              <td>Submitted ${claim.submittedAt || "-"}${claim.paidAt ? `<br><small>Paid ${claim.paidAt}</small>` : ""}</td>
              <td>${welfareClaimActions(claim)}</td>
            </tr>
          `).join("") || `<tr><td colspan="8">No welfare claims found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function welfareClaimActions(claim) {
  if (claim.status === "Submitted") {
    return `<button class="secondary-button" data-welfare-reject="${claim.id}" type="button">Reject</button><button class="primary-button" data-welfare-approve="${claim.id}" type="button">Approve</button>`;
  }
  if (claim.status === "Approved") {
    return `<button class="primary-button" data-welfare-pay="${claim.id}" type="button">Pay</button>`;
  }
  return "";
}

function renderLoans() {
  const loans = useApiLoans() ? apiState.loans.map(apiLoanToRow) : tenantScoped(state.loans);
  const source = useApiLoans() ? "API-backed" : "Local demo";
  const activeLoans = loans.filter((loan) => loan.status === "Active");
  const submittedLoans = loans.filter((loan) => ["Submitted", "Under Review"].includes(loan.status));
  const approvedLoans = loans.filter((loan) => loan.status === "Approved");
  const closedLoans = loans.filter((loan) => loan.status === "Closed");
  const portfolioValue = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const outstandingBalance = loans.reduce((sum, loan) => sum + loan.balance, 0);
  const repaidValue = loans.reduce((sum, loan) => sum + (loan.repaymentTotal || 0), 0);
  const pendingGuarantors = loans.reduce((sum, loan) => sum + (loan.pendingGuarantors || 0), 0);
  const highDsrLoans = loans.filter((loan) => Number(loan.dsr || 0) >= 40).length;
  const averageDsr = loans.length ? Math.round(loans.reduce((sum, loan) => sum + Number(loan.dsr || 0), 0) / loans.length) : 0;
  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>Loan control center</h2>
          <p class="eyebrow">${source} &middot; applications, guarantors, disbursements and repayments</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-view-jump="approvals" type="button">Open approvals</button>` : ""}
      </div>
      <div class="grid metrics">
        ${metric("Portfolio value", money.format(portfolioValue), `${loans.length} loan file(s)`)}
        ${metric("Outstanding", money.format(outstandingBalance), `${activeLoans.length} active loan(s)`)}
        ${metric("Ready to disburse", approvedLoans.length, "approved and awaiting payout")}
        ${metric("Repayments", money.format(repaidValue), `${closedLoans.length} closed loan(s)`)}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${metric("Applications", submittedLoans.length, "submitted or under review")}
        ${metric("Guarantor pending", pendingGuarantors, "member decisions needed")}
        ${metric("DSR watch", highDsrLoans, `${averageDsr}% average DSR`)}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Loan files</h2>
          <p class="eyebrow">${source} · Applications, appraisal, guarantors and portfolio risk</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
        <button class="primary-button" data-action="newLoan" type="button">New loan application</button>
      </div>
      ${apiState.user ? `<div class="notice">Loan files shown from the backend for ${apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant"}.</div>` : `<div class="notice">Login to the API to create server-side loan applications. The table below is local demo data.</div>`}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Applicant</th><th>Product</th><th>Amount</th><th>Balance</th><th>Stage</th><th>Guarantors</th><th>DSR</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${loans.map((loan) => `
              <tr>
                <td>${memberName(loan.memberId)}${loan.source ? `<br><small>${loan.source}</small>` : ""}</td>
                <td>${loan.product}</td>
                <td>${money.format(loan.amount)}</td>
                <td>${money.format(loan.balance)}${loan.repaymentTotal ? `<br><small>${money.format(loan.repaymentTotal)} repaid</small>` : ""}</td>
                <td>${loan.stage}</td>
                <td>${loan.guarantors}${loan.pendingGuarantors ? `<br><small>${loan.pendingGuarantors} pending</small>` : ""}</td>
                <td>${loan.dsr}%<br><small>${loanRiskLabel(loan.dsr)}</small></td>
                <td><span class="status ${statusClass(loan.status)}">${loan.status}</span></td>
                <td>${apiState.user ? loanActions(loan) : ""}</td>
              </tr>
            `).join("") || `<tr><td colspan="9">No loan files found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function loanActions(loan) {
  const status = String(loan.status).toLowerCase();
  const canDecide = ["submitted", "under review"].includes(status);
  const canDisburse = status === "approved";
  const canRepay = status === "active";
  return `
    <div class="filters">
      ${canDecide ? `<button class="secondary-button" data-loan-reject="${loan.id}" type="button">Reject</button><button class="primary-button" data-loan-approve="${loan.id}" type="button">Approve</button>` : ""}
      ${canDisburse ? `<button class="primary-button" data-loan-disburse="${loan.id}" type="button">Disburse</button>` : ""}
      ${canRepay ? `<button class="primary-button" data-loan-repay="${loan.id}" type="button">Record repayment</button>` : ""}
      <button class="secondary-button" data-request-guarantor="${loan.id}" type="button">Request guarantor</button>
    </div>
  `;
}

function loanRiskLabel(dsr) {
  const value = Number(dsr || 0);
  if (value >= 45) return "High DSR";
  if (value >= 35) return "Watch";
  return "Healthy";
}

function renderApprovals() {
  const approvals = apiState.user ? apiTransactionApprovalItems() : tenantScoped(state.approvals);
  const workflows = apiState.approvalWorkflows || [];
  const decisions = apiState.approvalDecisions || [];
  const source = apiState.user ? "API-backed" : "Local demo";
  const pendingTransactions = apiState.user ? apiState.financialTransactions.filter((transaction) => transaction.status === "pending_approval") : [];
  const pendingValue = apiState.user
    ? pendingTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    : approvals.length;
  const highRiskApprovals = approvals.filter((approval) => approval.risk === "High").length;
  const approvedDecisions = decisions.filter((decision) => decision.decision === "approved").length;
  const rejectedDecisions = decisions.filter((decision) => decision.decision === "rejected").length;
  const correctionDecisions = decisions.filter((decision) => decision.decision === "corrections_requested").length;
  const activeWorkflowCount = workflows.filter((workflow) => workflow.active).length;
  const workflowModules = new Set(workflows.map((workflow) => workflow.module).filter(Boolean)).size;
  return `
    ${apiState.user ? `
      <section class="card">
        <div class="toolbar">
          <div>
            <h2>Approval control center</h2>
            <p class="eyebrow">API-backed &middot; maker-checker queue, workflow coverage and decision history</p>
          </div>
          <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
        </div>
        <div class="grid metrics">
          ${metric("Pending queue", approvals.length, `${highRiskApprovals} high-risk item(s)`)}
          ${metric("Pending value", money.format(pendingValue), "financial postings awaiting checker")}
          ${metric("Active workflows", activeWorkflowCount, `${workflowModules} module(s) covered`)}
          ${metric("Decision history", decisions.length, `${approvedDecisions} approved, ${rejectedDecisions} rejected`)}
        </div>
        <div class="grid three" style="margin-top:16px">
          ${metric("Corrections", correctionDecisions, "returned for follow-up")}
          ${metric("Checker clear", approvals.length === 0 ? "Yes" : "No", approvals.length === 0 ? "no pending items" : "review required")}
          ${metric("Queue source", "Backend", apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant")}
        </div>
      </section>
      <section class="card">
        <div class="toolbar">
          <div>
            <h2>Approval workflows</h2>
            <p class="eyebrow">API-backed &middot; rules, modules and decision history</p>
          </div>
          <div class="filters">
            <button class="secondary-button" data-action="newApprovalDecision" type="button">Record decision</button>
            <button class="primary-button" data-action="newApprovalWorkflow" type="button">New workflow</button>
          </div>
        </div>
        <div class="grid metrics">
          ${metric("Workflows", workflows.length, `${workflows.filter((workflow) => workflow.active).length} active`)}
          ${metric("Decisions", decisions.length, `${decisions.filter((decision) => decision.decision === "approved").length} approved`)}
          ${metric("Corrections", decisions.filter((decision) => decision.decision === "corrections_requested").length, "requiring follow-up")}
        </div>
        <div class="grid two" style="margin-top:16px">
          ${approvalWorkflowTable(workflows)}
          ${approvalDecisionTable(decisions.slice(0, 8))}
        </div>
      </section>
    ` : ""}
    <section class="card" style="margin-top:${apiState.user ? "16px" : "0"}">
      <div class="toolbar">
        <div>
          <h2>Approval queue</h2>
          <p class="eyebrow">${source} · Committee, board and maker-checker decisions</p>
        </div>
        ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
      </div>
      ${apiState.user ? `<div class="notice">Pending financial postings shown from the backend for ${apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant"}.</div>` : ""}
      <ul class="list">
        ${approvals.map((approval) => `
          <li>
            <span>
              <strong>${approval.title}</strong><br>
              <small>${approval.type} requested by ${approval.requester} · risk ${approval.risk}${approval.source ? ` · ${approval.source}` : ""}</small>
            </span>
            <span class="filters">
              <button class="secondary-button" data-reject="${approval.id}" type="button">Reject</button>
              <button class="primary-button" data-approve="${approval.id}" type="button">Approve</button>
            </span>
          </li>
        `).join("") || `<li><span>No pending approvals for this tenant.</span><span class="status active">Clear</span></li>`}
      </ul>
    </section>
  `;
}

function approvalWorkflowTable(workflows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Module</th><th>Status</th></tr></thead>
        <tbody>
          ${workflows.map((workflow) => `
            <tr>
              <td><strong>${workflow.name}</strong><br><small>${tenantName(workflow.tenantId)}</small></td>
              <td>${titleCase(workflow.module.replace(/_/g, " "))}</td>
              <td><span class="status ${workflow.active ? "active" : "pending"}">${workflow.active ? "Active" : "Inactive"}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="3">No approval workflows found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function approvalDecisionTable(decisions) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Resource</th><th>Decision</th><th>Reason</th></tr></thead>
        <tbody>
          ${decisions.map((decision) => `
            <tr>
              <td><strong>${titleCase(decision.resourceType.replace(/_/g, " "))}</strong><br><small>${decision.resourceId}</small></td>
              <td><span class="status ${statusClass(decision.decision)}">${titleCase(decision.decision.replace(/_/g, " "))}</span></td>
              <td>${decision.reason || "No reason captured"}<br><small>${decision.createdAt?.slice(0, 16).replace("T", " ") || ""}</small></td>
            </tr>
          `).join("") || `<tr><td colspan="3">No approval decisions recorded.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderReports() {
  if (apiState.user) return renderApiReports();

  const members = tenantScoped(state.members);
  const savings = members.reduce((sum, member) => sum + member.savings, 0);
  const shares = members.reduce((sum, member) => sum + member.shares, 0);
  const welfare = members.reduce((sum, member) => sum + member.welfare, 0);
  const max = Math.max(savings, shares, welfare, 1);
  return `
    <div class="grid two">
      <section class="card">
        <h2>Financial summary</h2>
        <div class="chart">
          ${bar("Savings", savings, max)}
          ${bar("Shares", shares, max)}
          ${bar("Welfare", welfare, max)}
        </div>
        <div class="notice" style="margin-top:16px">Reports are calculated from member balances and posted transactions. In a production build, these summaries would be backed by tenant-aware reporting tables or materialized views.</div>
      </section>
      <section class="card">
        <h2>Compliance snapshot</h2>
        <ul class="list">
          ${alertItem("KYC verified", `${members.filter((m) => m.kyc === "Verified").length}/${members.length}`, "active")}
          ${alertItem("Pending member approval", members.filter((m) => m.status.includes("Pending") || m.status === "Applicant").length, "pending")}
          ${alertItem("Audit log entries", tenantScoped(state.audit).length, "trial")}
        </ul>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <h2>Audit trail</h2>
      ${auditTable(tenantScoped(state.audit))}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <h2>API audit events</h2>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      ${apiAuditTable(apiState.auditEvents)}
    </section>
  `;
}

function renderOperations() {
  if (!apiState.user) {
    return `
      <section class="card">
        <div class="toolbar">
          <div>
            <h2>Operations center</h2>
            <p class="eyebrow">Java backend monitoring</p>
          </div>
          <button class="primary-button" data-action="apiLogin" type="button">API login</button>
        </div>
        <div class="notice">Login to the Java API to view tenant-scoped operational counts, alerts, and release-readiness gates.</div>
      </section>
    `;
  }

  const status = apiState.operationsStatus || {};
  const counts = status.counts || {};
  const alerts = status.alerts || [];
  const tenantLabel = status.scope === "platform" ? "Platform-wide" : tenantName(status.scope || currentApiTenantId());
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const warningAlerts = alerts.filter((alert) => alert.severity === "warning").length;
  const releaseGates = [
    { label: "Database reachable", ok: status.database?.reachable === true, detail: status.checkedAt ? `checked ${status.checkedAt.slice(0, 16).replace("T", " ")}` : "waiting for API" },
    { label: "No critical operation alerts", ok: criticalAlerts === 0, detail: `${criticalAlerts} critical alert(s)` },
    { label: "Pending postings monitored", ok: Number(counts.pendingFinancialTransactions || 0) === 0, detail: `${counts.pendingFinancialTransactions || 0} awaiting checker action` },
    { label: "Callback exceptions clear", ok: Number(counts.callbackExceptions || 0) === 0, detail: `${counts.callbackExceptions || 0} callback exception(s)` },
    { label: "Delivery exceptions clear", ok: Number(counts.deliveryExceptions || 0) === 0, detail: `${counts.deliveryExceptions || 0} provider exception(s)` }
  ];

  return `
    <div class="grid metrics">
      ${metric("Scope", tenantLabel, status.ok ? "API operations status" : "waiting for refresh")}
      ${metric("Database", status.database?.reachable ? "Reachable" : "Unknown", status.checkedAt ? status.checkedAt.slice(0, 10) : "not checked")}
      ${metric("Alerts", alerts.length, `${criticalAlerts} critical, ${warningAlerts} warning`)}
      ${metric("Active members", counts.activeMembers || 0, `${counts.members || 0} total members`)}
    </div>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Operational alerts</h2>
          <p class="eyebrow">Live from /api/v1/operations/status</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      ${operationAlerts(alerts)}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Production readiness gates</h2>
          <p class="eyebrow">Release checks surfaced for administrators</p>
        </div>
      </div>
      ${releaseGateList(releaseGates)}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Operational counts</h2>
          <p class="eyebrow">Tenant-isolated backend health signals</p>
        </div>
      </div>
      ${operationCountsTable(counts)}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Runbook shortcuts</h2>
          <p class="eyebrow">Phase 7 hardening artifacts</p>
        </div>
      </div>
      <div class="runbook-grid">
        ${runbookLink("Monitoring guide", "docs/monitoring.md", "Alert definitions and operations status examples")}
        ${runbookLink("Deployment guide", "docs/deployment.md", "Docker, backup, restore and load-test commands")}
        ${runbookLink("Security review", "docs/security-review.md", "Release gates for critical security findings")}
        ${runbookLink("Technical manual", "docs/technical-manual.md", "Validation, migrations and troubleshooting")}
      </div>
    </section>
  `;
}

function renderApiReports() {
  const journals = apiState.journalEntries;
  const periods = apiState.accountingPeriods;
  const accounts = apiState.chartOfAccounts;
  const expenses = apiState.expenses;
  const assets = apiState.assets;
  const mobileMoneyCallbacks = apiState.mobileMoneyCallbacks;
  const notificationDeliveries = apiState.notificationDeliveries;
  const notificationTemplates = apiState.notificationTemplates;
  const reconciliation = apiState.reconciliation || { summary: {}, unmatchedStatementLines: [], unmatchedLedgerLines: [] };
  const regulatoryReport = apiState.regulatoryReport || { reports: [], consolidated: {}, csv: "" };
  const meetings = apiState.governanceMeetings;
  const complaints = apiState.complaints;
  const roles = apiState.roles || [];
  const permissions = apiState.permissions || [];
  const debitTotal = journals.reduce((sum, entry) => sum + entry.debitTotal, 0);
  const creditTotal = journals.reduce((sum, entry) => sum + entry.creditTotal, 0);
  const unbalanced = journals.filter((entry) => !entry.isBalanced).length;
  const reconciliationExceptions = (reconciliation.summary.unmatchedStatementLines || 0) + (reconciliation.summary.unmatchedLedgerLines || 0);
  const openPeriods = periods.filter((period) => period.status === "open").length;
  const closedPeriods = periods.filter((period) => period.status === "closed").length;
  const openGovernanceItems = meetings.reduce((sum, meeting) => sum + (meeting.openResolutions || 0), 0)
    + complaints.filter((complaint) => !["resolved", "closed"].includes(complaint.status)).length;
  const deliveryExceptions = notificationDeliveries.filter((item) => item.status !== "sent").length;
  const callbackExceptions = mobileMoneyCallbacks.filter((item) => item.status !== "posted").length;
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const assetNetBookValue = assets.reduce((sum, asset) => sum + asset.netBookValue, 0);
  const cashPosition = journals.reduce((sum, entry) => {
    return sum + entry.lines
      .filter((line) => ["1000", "1010", "1020", "1030"].includes(line.accountCode))
      .reduce((lineSum, line) => lineSum + line.debit - line.credit, 0);
  }, 0);
  const tenantLabel = apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant";

  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>Reports control center</h2>
          <p class="eyebrow">API-backed &middot; financial integrity, reconciliation, compliance and governance for ${tenantLabel}</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      <div class="grid metrics">
        ${metric("Ledger integrity", unbalanced === 0 ? "Balanced" : `${unbalanced} issue(s)`, `${journals.length} journal entry(ies)`)}
        ${metric("Reconciliation", reconciliationExceptions, `${money.format((reconciliation.summary.unmatchedStatementAmount || 0) + (reconciliation.summary.unmatchedLedgerAmount || 0))} exception value`)}
        ${metric("Compliance", titleCase((regulatoryReport.consolidated.complianceStatus || "review").replace(/_/g, " ")), `${regulatoryReport.consolidated.reconciliationExceptions || 0} regulatory exception(s)`)}
        ${metric("Governance", openGovernanceItems, "open resolutions and complaints")}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${metric("Accounting periods", `${openPeriods}/${periods.length}`, `${closedPeriods} closed`)}
        ${metric("Operations exceptions", callbackExceptions + deliveryExceptions, `${callbackExceptions} callback, ${deliveryExceptions} delivery`)}
        ${metric("Operating assets", money.format(assetNetBookValue), `${money.format(expenseTotal)} expenses posted`)}
      </div>
    </section>
    <div class="grid metrics">
      ${metric("Journal entries", journals.length, `${unbalanced} unbalanced`)}
      ${metric("Debits", money.format(debitTotal), "derived from posted events")}
      ${metric("Credits", money.format(creditTotal), "must equal debits")}
      ${metric("Cash position", money.format(cashPosition), "cash, bank, mobile money, payroll")}
    </div>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Access control</h2>
          <p class="eyebrow">Roles, permission sets and staff assignments for ${tenantLabel}</p>
        </div>
        <button class="secondary-button" data-action="assignUserRoles" type="button">Assign roles</button>
        <button class="primary-button" data-action="newRole" type="button">New role</button>
      </div>
      <div class="grid metrics">
        ${metric("Roles", roles.length, `${roles.filter((role) => role.protectedRole || role.protected).length} protected`)}
        ${metric("Permissions", permissions.length, "catalogued actions")}
        ${metric("Staff users", apiState.users.length, "assignable accounts")}
      </div>
      ${roleTable(roles)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Accounting ledger</h2>
          <p class="eyebrow">API-backed · Balanced double-entry journals for ${tenantLabel}</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      <div class="notice">Journal entries are derived from posted financial transactions, loan disbursements, loan repayments, and subscription payments.</div>
      ${journalTable(journals)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Accounting periods</h2>
          <p class="eyebrow">Closed periods block ordinary financial postings</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      ${accountingPeriodTable(periods)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Expenses</h2>
          <p class="eyebrow">Supplier expenses posted to the accounting ledger</p>
        </div>
        <button class="primary-button" data-action="newExpense" type="button">New expense</button>
      </div>
      <div class="grid metrics">
        ${metric("Posted expenses", expenses.length, `${money.format(expenses.reduce((sum, expense) => sum + expense.amount, 0))} total`)}
        ${metric("Suppliers", apiState.suppliers.length, "active supplier records")}
      </div>
      ${expenseTable(expenses)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Assets</h2>
          <p class="eyebrow">Fixed asset register with derived depreciation journals</p>
        </div>
        <button class="primary-button" data-action="newAsset" type="button">New asset</button>
      </div>
      <div class="grid metrics">
        ${metric("Registered assets", assets.length, `${money.format(assets.reduce((sum, asset) => sum + asset.cost, 0))} cost`)}
        ${metric("Net book value", money.format(assets.reduce((sum, asset) => sum + asset.netBookValue, 0)), `${money.format(assets.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0))} depreciated`)}
      </div>
      ${assetTable(assets)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Reconciliation</h2>
          <p class="eyebrow">Bank, cash, mobile money and payroll statement matching</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      <div class="grid metrics">
        ${metric("Matched", reconciliation.summary.matched || 0, `${money.format(reconciliation.summary.matchedAmount || 0)} cleared`)}
        ${metric("Statement exceptions", reconciliation.summary.unmatchedStatementLines || 0, money.format(reconciliation.summary.unmatchedStatementAmount || 0))}
        ${metric("Ledger exceptions", reconciliation.summary.unmatchedLedgerLines || 0, money.format(reconciliation.summary.unmatchedLedgerAmount || 0))}
      </div>
      ${reconciliationTable(reconciliation)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Mobile money callbacks</h2>
          <p class="eyebrow">Idempotent provider callback history and posted resources</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      <div class="grid metrics">
        ${metric("Callbacks", mobileMoneyCallbacks.length, `${money.format(mobileMoneyCallbacks.reduce((sum, item) => sum + item.amount, 0))} received`)}
        ${metric("Posted", mobileMoneyCallbacks.filter((item) => item.status === "posted").length, "server-confirmed events")}
      </div>
      ${mobileMoneyCallbackTable(mobileMoneyCallbacks)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>SMS and email deliveries</h2>
          <p class="eyebrow">Provider outbox and tenant notification templates</p>
        </div>
        <button class="primary-button" data-action="newNotificationTemplate" type="button">New template</button>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      <div class="grid metrics">
        ${metric("SMS", notificationDeliveries.filter((item) => item.channel === "sms").length, "demo_sms")}
        ${metric("Email", notificationDeliveries.filter((item) => item.channel === "email").length, "demo_email")}
        ${metric("Templates", notificationTemplates.length, `${notificationTemplates.filter((item) => item.status === "active").length} active`)}
        ${metric("Sent", notificationDeliveries.filter((item) => item.status === "sent").length, "provider-confirmed")}
      </div>
      ${notificationTemplateTable(notificationTemplates)}
      ${notificationDeliveryTable(notificationDeliveries)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Regulatory report</h2>
          <p class="eyebrow">Export-ready supervisory snapshot for ${tenantLabel}</p>
        </div>
        <button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>
      </div>
      <div class="grid metrics">
        ${metric("Members", regulatoryReport.consolidated.memberCount || 0, `${regulatoryReport.consolidated.activeMembers || 0} active`)}
        ${metric("Savings", money.format(regulatoryReport.consolidated.savings || 0), "member deposits")}
        ${metric("Loan portfolio", money.format(regulatoryReport.consolidated.loanPortfolio || 0), `${regulatoryReport.consolidated.parPercent || 0}% PAR indicator`)}
        ${metric("Compliance", titleCase((regulatoryReport.consolidated.complianceStatus || "review").replace(/_/g, " ")), `${regulatoryReport.consolidated.reconciliationExceptions || 0} reconciliation exception(s)`)}
      </div>
      ${regulatoryReportTable(regulatoryReport)}
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Governance</h2>
          <p class="eyebrow">Meetings, resolutions and member complaints for ${tenantLabel}</p>
        </div>
        <button class="secondary-button" data-action="newComplaint" type="button">New complaint</button>
        <button class="primary-button" data-action="newGovernanceMeeting" type="button">New meeting</button>
      </div>
      <div class="grid metrics">
        ${metric("Meetings", meetings.length, `${meetings.reduce((sum, meeting) => sum + (meeting.openResolutions || 0), 0)} open resolution(s)`)}
        ${metric("Complaints", complaints.length, `${complaints.filter((complaint) => !["resolved", "closed"].includes(complaint.status)).length} open`)}
        ${metric("High priority", complaints.filter((complaint) => complaint.priority === "high" && !["resolved", "closed"].includes(complaint.status)).length, "complaints requiring attention")}
      </div>
      <div class="grid two" style="margin-top:16px">
        ${governanceMeetingList(meetings)}
        ${complaintList(complaints)}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Chart of accounts</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Normal balance</th></tr></thead>
          <tbody>
            ${accounts.map((account) => `
              <tr>
                <td>${account.code}</td>
                <td>${account.name}</td>
                <td>${titleCase(account.type)}</td>
                <td>${titleCase(account.normalBalance)}</td>
              </tr>
            `).join("") || `<tr><td colspan="4">No accounts found.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>API audit events</h2>
      ${apiAuditTable(apiState.auditEvents)}
    </section>
  `;
}

function roleTable(roles) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Role</th><th>Tenant</th><th>Permissions</th><th>Status</th></tr></thead>
        <tbody>
          ${roles.map((role) => `
            <tr>
              <td><strong>${role.name}</strong><br><small>${role.id}</small></td>
              <td>${tenantName(role.tenantId)}</td>
              <td>${(role.permissionIds || []).slice(0, 4).join(", ") || "No permissions"}${(role.permissionIds || []).length > 4 ? ` +${role.permissionIds.length - 4} more` : ""}</td>
              <td><span class="status ${(role.protectedRole || role.protected) ? "active" : "pending"}">${(role.protectedRole || role.protected) ? "Protected" : "Custom"}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="4">No roles found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function accountingPeriodTable(periods) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Period</th><th>Status</th><th>Closed at</th><th>Action</th></tr></thead>
        <tbody>
          ${periods.map((period) => `
            <tr>
              <td>${period.period}</td>
              <td><span class="status ${period.status === "closed" ? "overdue" : "active"}">${titleCase(period.status)}</span></td>
              <td>${period.closedAt?.slice(0, 10) || ""}</td>
              <td><button class="secondary-button" data-period-status="${period.id}" data-period-next="${period.status === "closed" ? "open" : "closed"}" type="button">${period.status === "closed" ? "Reopen" : "Close"}</button></td>
            </tr>
          `).join("") || `<tr><td colspan="4">No accounting periods found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function expenseTable(expenses) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Date</th><th>Reference</th><th>Supplier</th><th>Account</th><th>Channel</th><th>Amount</th></tr></thead>
        <tbody>
          ${expenses.map((expense) => `
            <tr>
              <td>${expense.expenseDate || ""}</td>
              <td>${expense.reference}<br><small>${expense.description || ""}</small></td>
              <td>${expense.supplier?.name || "Direct expense"}</td>
              <td>${expense.accountCode} ${expense.accountName || ""}</td>
              <td>${titleCase(expense.channel.replace(/_/g, " "))}</td>
              <td>${money.format(expense.amount)}</td>
            </tr>
          `).join("") || `<tr><td colspan="6">No expenses found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function assetTable(assets) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Purchased</th><th>Reference</th><th>Asset</th><th>Category</th><th>Cost</th><th>Depreciation</th><th>NBV</th></tr></thead>
        <tbody>
          ${assets.map((asset) => `
            <tr>
              <td>${asset.purchaseDate || ""}</td>
              <td>${asset.reference}<br><small>${asset.location || ""}</small></td>
              <td>${asset.name}<br><small>${asset.accountCode || asset.assetAccountCode} ${asset.accountName || ""}</small></td>
              <td>${titleCase(asset.category.replace(/_/g, " "))}</td>
              <td>${money.format(asset.cost)}</td>
              <td>${money.format(asset.accumulatedDepreciation)}<br><small>${money.format(asset.monthlyDepreciation)} monthly</small></td>
              <td>${money.format(asset.netBookValue)}</td>
            </tr>
          `).join("") || `<tr><td colspan="7">No assets found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function mobileMoneyCallbackTable(callbacks) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Received</th><th>Reference</th><th>Purpose</th><th>Amount</th><th>Resource</th><th>Status</th></tr></thead>
        <tbody>
          ${callbacks.map((callback) => `
            <tr>
              <td>${callback.receivedAt?.slice(0, 16).replace("T", " ") || ""}</td>
              <td>${callback.externalReference}<br><small>${callback.provider || ""}</small></td>
              <td>${titleCase(callback.purpose.replace(/_/g, " "))}</td>
              <td>${money.format(callback.amount)}</td>
              <td>${titleCase(String(callback.resourceType || "").replace(/_/g, " "))}<br><small>${callback.resourceId || ""}</small></td>
              <td><span class="status ${callback.status === "posted" ? "active" : "pending"}">${titleCase(callback.status)}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="6">No mobile-money callbacks found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function notificationDeliveryTable(deliveries) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Sent</th><th>Channel</th><th>Provider</th><th>Recipient</th><th>Status</th></tr></thead>
        <tbody>
          ${deliveries.map((delivery) => `
            <tr>
              <td>${delivery.sentAt?.slice(0, 16).replace("T", " ") || delivery.createdAt?.slice(0, 16).replace("T", " ") || ""}</td>
              <td>${titleCase(delivery.channel)}</td>
              <td>${delivery.provider}</td>
              <td>${delivery.recipient}</td>
              <td><span class="status ${delivery.status === "sent" ? "active" : "pending"}">${titleCase(delivery.status)}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="5">No SMS or email deliveries found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function notificationTemplateTable(templates) {
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>Event</th><th>Channel</th><th>Title</th><th>Source</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${templates.map((template) => {
            const manageable = canManageNotificationTemplate(template);
            return `
              <tr>
                <td>${template.eventType}<br><small>${template.id}</small></td>
                <td>${titleCase(String(template.channel || "").replace(/_/g, " "))}</td>
                <td><strong>${template.title}</strong><br><small>${template.body}</small></td>
                <td>${template.tenantId ? tenantName(template.tenantId) : "Global default"}</td>
                <td><span class="status ${template.status === "active" ? "active" : "pending"}">${titleCase(template.status)}</span></td>
                <td>
                  ${manageable ? `<button class="secondary-button" data-template-edit="${template.id}" type="button">Edit</button>
                  <button class="secondary-button" data-template-toggle="${template.id}" type="button">${template.status === "active" ? "Deactivate" : "Activate"}</button>` : `<span class="pill">Protected</span>`}
                </td>
              </tr>
            `;
          }).join("") || `<tr><td colspan="6">No notification templates found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function canManageNotificationTemplate(template) {
  if (!apiState.user) return false;
  if (apiState.user.tenantId === "tenant_platform") return true;
  return template.tenantId === apiState.user.tenantId;
}

function regulatoryReportTable(report) {
  const rows = report.reports || [];
  return `
    <div class="table-wrap" style="margin-top:16px">
      <table>
        <thead><tr><th>SACCO</th><th>Members</th><th>Savings</th><th>Shares</th><th>Welfare</th><th>Loans</th><th>PAR</th><th>Exceptions</th><th>Status</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.tenantName}</td>
              <td>${row.activeMembers}/${row.memberCount}</td>
              <td>${money.format(row.savings)}</td>
              <td>${money.format(row.shares)}</td>
              <td>${money.format(row.welfare)}</td>
              <td>${money.format(row.loanPortfolio)}</td>
              <td>${row.parPercent}%</td>
              <td>${row.reconciliationExceptions}</td>
              <td><span class="status ${row.complianceStatus === "action_required" ? "overdue" : "pending"}">${titleCase(row.complianceStatus.replace(/_/g, " "))}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="9">No regulatory report rows found.</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="notice" style="margin-top:16px"><strong>CSV export preview</strong><br><small>${(report.csv || "").split("\n").slice(0, 3).join(" | ")}</small></div>
  `;
}

function governanceMeetingList(meetings) {
  return `
    <div>
      <h3>Meetings and resolutions</h3>
      <ul class="list">
        ${meetings.map((meeting) => `
          <li>
            <span>
              <strong>${meeting.title}</strong><br>
              <small>${titleCase(meeting.meetingType.replace(/_/g, " "))} · ${meeting.scheduledAt?.slice(0, 10) || ""} · ${titleCase(meeting.status)}</small>
              ${(meeting.resolutions || []).map((resolution) => `<br><small>${resolution.status === "closed" ? "Closed" : "Open"} resolution: ${resolution.title}</small>`).join("")}
            </span>
            <span><span class="status ${statusClass(meeting.status)}">${meeting.openResolutions || 0} open</span></span>
          </li>
        `).join("") || `<li><span>No governance meetings found.</span><span class="status active">Clear</span></li>`}
      </ul>
    </div>
  `;
}

function complaintList(complaints) {
  return `
    <div>
      <h3>Complaints</h3>
      <ul class="list">
        ${complaints.map((complaint) => `
          <li>
            <span>
              <strong>${complaint.subject}</strong><br>
              <small>${titleCase(complaint.category)} · ${titleCase(complaint.priority)} priority${complaint.member ? ` · ${complaint.member.fullName}` : ""}</small>
            </span>
            <span><span class="status ${statusClass(complaint.status)}">${titleCase(complaint.status.replace(/_/g, " "))}</span></span>
          </li>
        `).join("") || `<li><span>No complaints found.</span><span class="status active">Clear</span></li>`}
      </ul>
    </div>
  `;
}

function reconciliationTable(reconciliation) {
  const statementLines = reconciliation.unmatchedStatementLines || [];
  const ledgerLines = reconciliation.unmatchedLedgerLines || [];
  return `
    <div class="grid two" style="margin-top:16px">
      <div>
        <h3>Unmatched statement lines</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Reference</th><th>Account</th><th>Amount</th></tr></thead>
            <tbody>
              ${statementLines.map((line) => `
                <tr>
                  <td>${line.statementDate || ""}</td>
                  <td>${line.externalReference}<br><small>${line.description || titleCase(line.channel.replace(/_/g, " "))}</small></td>
                  <td>${line.accountCode}</td>
                  <td>${money.format(line.amount)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4">No unmatched statement lines.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3>Unmatched ledger lines</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Reference</th><th>Account</th><th>Amount</th></tr></thead>
            <tbody>
              ${ledgerLines.map((line) => `
                <tr>
                  <td>${line.postedAt?.slice(0, 10) || ""}</td>
                  <td>${line.reference}<br><small>${line.description}</small></td>
                  <td>${line.accountCode} ${line.accountName}</td>
                  <td>${money.format(line.amount)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4">No unmatched ledger lines.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function journalTable(entries) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Status</th></tr></thead>
        <tbody>
          ${entries.map((entry) => `
            <tr>
              <td>${entry.postedAt?.slice(0, 10) || ""}</td>
              <td>${entry.reference}<br><small>${titleCase(entry.sourceType.replace(/_/g, " "))}</small></td>
              <td>${entry.description}<br><small>${entry.lines.map((line) => `${line.accountCode} ${line.accountName}: Dr ${money.format(line.debit)} / Cr ${money.format(line.credit)}`).join(" · ")}</small></td>
              <td>${money.format(entry.debitTotal)}</td>
              <td>${money.format(entry.creditTotal)}</td>
              <td><span class="status ${entry.isBalanced ? "active" : "pending"}">${entry.isBalanced ? "Balanced" : "Review"}</span></td>
            </tr>
          `).join("") || `<tr><td colspan="6">No journal entries found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderMemberPortal() {
  if (memberApiState.member) {
    const member = memberApiState.member;
    const balances = memberApiState.balances || { savings: 0, shares: 0, welfare: 0 };
    const notifications = memberApiState.notifications || [];
    const mobileDashboard = memberApiState.mobileDashboard || {};
    const mobileLoans = mobileDashboard.loans || [];
    return `
      <div class="toolbar">
        <div>
          <h2>${member.fullName}</h2>
          <p class="eyebrow">${member.membershipNo} · ${memberApiState.tenant?.name || tenantName(member.tenantId)}</p>
        </div>
        <button class="secondary-button" data-action="memberLogout" type="button">Logout member</button>
      </div>
      <div class="notice" style="margin-top:16px">${memberApiState.message}</div>
      <div class="grid metrics" style="margin-top:16px">
        ${metric("Savings", money.format(balances.savings), "posted deposits less withdrawals")}
        ${metric("Shares", money.format(balances.shares), "posted share purchases")}
        ${metric("Welfare", money.format(balances.welfare), "posted welfare contributions")}
        ${metric("Status", titleCase(member.status.replace(/_/g, " ")), member.kycStatus ? `KYC ${titleCase(member.kycStatus.replace(/_/g, " "))}` : "Member profile")}
      </div>
      <div class="grid two" style="margin-top:16px">
        <section class="card">
          <h2>Profile</h2>
          <div class="grid three">
            ${miniFact("Member no.", member.membershipNo)}
            ${miniFact("Phone", member.phone)}
            ${miniFact("Branch", memberApiState.branch?.name || branchName(member.branchId))}
          </div>
        </section>
        <section class="card">
          <h2>Self-service</h2>
          <ul class="list">
            <li><span>Statements</span><strong>Available soon</strong></li>
            <li><span>Payments</span><strong>Mobile money next</strong></li>
            <li><span>Security</span><strong>Password login active</strong></li>
          </ul>
        </section>
      </div>
      <section class="card" style="margin-top:16px">
        <div class="toolbar">
          <div>
            <h2>Mobile dashboard</h2>
            <p class="eyebrow">Server-confirmed member app view</p>
          </div>
          <button class="secondary-button" data-action="offlineComplaintDraft" type="button">Draft complaint</button>
          <button class="secondary-button" data-action="syncOfflineDrafts" type="button">Sync drafts</button>
          <button class="secondary-button" data-action="memberMobileLoan" type="button">Apply for mobile loan</button>
          <button class="primary-button" data-action="memberMobilePayment" type="button">Pay by mobile money</button>
        </div>
        <div class="grid metrics">
          ${metric("App savings", money.format(mobileDashboard.balances?.savings ?? balances.savings), mobileDashboard.lastUpdatedAt ? `updated ${mobileDashboard.lastUpdatedAt.slice(0, 16).replace("T", " ")}` : "server pending")}
          ${metric("Loan balance", money.format(mobileLoans.reduce((sum, loan) => sum + loan.balance, 0)), `${mobileLoans.length} loan file(s)`)}
          ${metric("Notifications", mobileDashboard.notifications?.length || notifications.length, "latest alerts")}
          ${metric("Confirmation", mobileDashboard.serverConfirmed ? "Server OK" : "Waiting", "critical actions confirmed by API")}
        </div>
        <ul class="list" style="margin-top:16px">
          ${offlineDrafts.filter((draft) => draft.memberId === member.id).map((draft) => `
            <li>
              <span><strong>${draft.subject}</strong><br><small>${titleCase(draft.category)} · saved ${draft.createdAt.slice(0, 16).replace("T", " ")}</small></span>
              <span class="status pending">Draft</span>
            </li>
          `).join("") || `<li><span>No offline drafts saved.</span><span class="status active">Synced</span></li>`}
        </ul>
      </section>
      <section class="card" style="margin-top:16px">
        <h2>Guarantee requests</h2>
        <ul class="list">
          ${memberApiState.guarantorRequests.map((request) => `
            <li>
              <span>
                <strong>${request.loan?.product || "Loan request"} for ${request.borrower?.fullName || "Borrower"}</strong><br>
                <small>${money.format(request.guaranteedAmount)} · ${titleCase(request.status.replace(/_/g, " "))} · capacity ${money.format(request.capacity || 0)}</small>
              </span>
              <span>
                ${request.status === "pending" ? `<button class="secondary-button" data-guarantor-reject="${request.id}" type="button">Reject</button><button class="primary-button" data-guarantor-accept="${request.id}" type="button">Accept</button>` : `<span class="status ${statusClass(request.status)}">${titleCase(request.status)}</span>`}
              </span>
            </li>
          `).join("") || `<li><span>No guarantee requests for this member.</span><span class="status active">Clear</span></li>`}
        </ul>
      </section>
      <section class="card" style="margin-top:16px">
        <h2>Notifications</h2>
        <ul class="list">
          ${notifications.map((notification) => `
            <li>
              <span>
                <strong>${notification.title}</strong><br>
                <small>${notification.body}</small>
              </span>
              <span class="status ${notification.status === "unread" ? "pending" : "active"}">${titleCase(notification.status)}</span>
            </li>
          `).join("") || `<li><span>No notifications yet.</span><span class="status active">Clear</span></li>`}
        </ul>
      </section>
    `;
  }

  if (memberApiState.token) {
    return `<section class="card"><h2>Member portal</h2><p>${memberApiState.message}</p><button class="primary-button" data-action="memberLogin" type="button">Member login</button></section>`;
  }

  const members = tenantScoped(state.members).filter((member) => member.status === "Active");
  const member = members[0] || tenantScoped(state.members)[0];
  if (!member) {
    return `<section class="card"><h2>Member portal</h2><p>No members exist for this tenant yet.</p><button class="primary-button" data-action="memberLogin" type="button">Member login</button></section>`;
  }
  const memberLoans = state.loans.filter((loan) => loan.memberId === member.id);
  return `
    <div class="grid metrics">
      ${metric("Savings", money.format(member.savings), "last updated today")}
      ${metric("Shares", money.format(member.shares), "ordinary shares")}
      ${metric("Welfare", money.format(member.welfare), "covered")}
      ${metric("Loan balance", money.format(memberLoans.reduce((sum, loan) => sum + loan.balance, 0)), `${memberLoans.length} loan file(s)`)}
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="card">
        <h2>${member.name}</h2>
        <div class="grid three">
          ${miniFact("Member no.", member.no)}
          ${miniFact("Phone", member.phone)}
          ${miniFact("KYC", member.kyc)}
        </div>
        <div class="toolbar" style="margin-top:16px">
          <button class="primary-button" data-action="memberLogin" type="button">Member login</button>
          <button class="secondary-button" type="button">Download statement</button>
          <button class="secondary-button" type="button">Make payment</button>
          <button class="primary-button" data-action="newLoan" type="button">Apply for loan</button>
        </div>
      </section>
      <section class="card">
        <h2>Guarantor and notifications</h2>
        <ul class="list">
          <li><span>Guarantee requests</span><strong>0 pending</strong></li>
          <li><span>Complaints</span><strong>None open</strong></li>
          <li><span>Security</span><strong>MFA recommended</strong></li>
        </ul>
      </section>
    </div>
  `;
}

function metric(label, value, detail) {
  return `<section class="card metric"><span>${label}</span><strong>${value}</strong><em>${detail}</em></section>`;
}

function miniFact(label, value) {
  return `<div><span class="eyebrow">${label}</span><strong>${value}</strong></div>`;
}

function alertItem(label, value, cls) {
  return `<li><span>${label}</span><strong class="status ${cls}">${value}</strong></li>`;
}

function operationAlerts(alerts) {
  if (!alerts.length) {
    return `<div class="notice success">No operation alerts for the selected scope.</div>`;
  }
  return `
    <ul class="list">
      ${alerts.map((alert) => `
        <li>
          <span><strong>${titleCase(alert.code.replace(/_/g, " "))}</strong><br><small>${alert.message}</small></span>
          <strong class="status ${alert.severity === "critical" ? "overdue" : "pending"}">${alert.count} ${alert.severity}</strong>
        </li>
      `).join("")}
    </ul>
  `;
}

function releaseGateList(gates) {
  return `
    <ul class="list">
      ${gates.map((gate) => `
        <li>
          <span><strong>${gate.label}</strong><br><small>${gate.detail}</small></span>
          <strong class="status ${gate.ok ? "active" : "pending"}">${gate.ok ? "Ready" : "Review"}</strong>
        </li>
      `).join("")}
    </ul>
  `;
}

function operationCountsTable(counts) {
  const labels = {
    tenants: "Tenants",
    users: "Staff users",
    members: "Members",
    activeMembers: "Active members",
    pendingFinancialTransactions: "Pending financial postings",
    openLoans: "Open loans",
    openComplaints: "Open complaints",
    callbackExceptions: "Callback exceptions",
    deliveryExceptions: "Delivery exceptions",
    closedAccountingPeriods: "Closed accounting periods"
  };
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Signal</th><th>Count</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(labels).map(([key, label]) => {
            const value = Number(counts[key] || 0);
            const needsReview = ["pendingFinancialTransactions", "openComplaints", "callbackExceptions", "deliveryExceptions"].includes(key) && value > 0;
            return `
              <tr>
                <td>${label}</td>
                <td><strong>${value}</strong></td>
                <td><span class="status ${needsReview ? "pending" : "active"}">${needsReview ? "Review" : "OK"}</span></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function runbookLink(title, href, detail) {
  return `
    <a class="runbook-link" href="${href}" target="_blank" rel="noreferrer">
      <strong>${title}</strong>
      <span>${detail}</span>
    </a>
  `;
}

function bar(label, value, max) {
  return `
    <div class="bar">
      <strong>${label}</strong>
      <div class="bar-track"><span style="width:${Math.max(5, (value / max) * 100)}%"></span></div>
      <span>${money.format(value)}</span>
    </div>
  `;
}

function memberRow(member) {
  return `
    <tr>
      <td><strong>${member.name}</strong><br><small>${member.no} · ${member.phone}</small></td>
      <td>${member.type}</td>
      <td>${member.kyc}</td>
      <td>${money.format(member.savings)}</td>
      <td>${money.format(member.shares)}</td>
      <td>${money.format(member.welfare)}</td>
      <td><span class="status ${statusClass(member.status)}">${member.status}</span></td>
      <td>${apiState.user ? `<button class="secondary-button" data-member-profile="${member.id}" type="button">Profile</button>` : ""}</td>
    </tr>
  `;
}

function auditTable(rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Tenant</th><th>Actor</th><th>Action</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr><td>${row.at}</td><td>${tenantName(row.tenantId)}</td><td>${row.actor}</td><td>${row.action}</td></tr>
          `).join("") || `<tr><td colspan="4">No audit entries yet.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function daysTo(dateString) {
  return Math.ceil((new Date(`${dateString}T23:59:59+03:00`) - today) / 86400000);
}

function bindViewActions() {
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.viewJump;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-approve-tenant]").forEach((button) => {
    button.addEventListener("click", () => approveTenant(button.dataset.approveTenant));
  });

  document.querySelectorAll("[data-tenant-profile]").forEach((button) => {
    button.addEventListener("click", () => openSaccoProfile(button.dataset.tenantProfile));
  });

  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => resolveApproval(button.dataset.approve, "Approved"));
  });

  document.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", () => resolveApproval(button.dataset.reject, "Rejected"));
  });

  document.querySelectorAll("[data-request-guarantor]").forEach((button) => {
    button.addEventListener("click", () => openGuarantorRequestForm(button.dataset.requestGuarantor));
  });

  document.querySelectorAll("[data-loan-approve]").forEach((button) => {
    button.addEventListener("click", () => decideLoan(button.dataset.loanApprove, "approved"));
  });

  document.querySelectorAll("[data-loan-reject]").forEach((button) => {
    button.addEventListener("click", () => decideLoan(button.dataset.loanReject, "rejected"));
  });

  document.querySelectorAll("[data-loan-disburse]").forEach((button) => {
    button.addEventListener("click", () => disburseLoan(button.dataset.loanDisburse));
  });

  document.querySelectorAll("[data-loan-repay]").forEach((button) => {
    button.addEventListener("click", () => openLoanRepaymentForm(button.dataset.loanRepay));
  });

  document.querySelectorAll("[data-welfare-approve]").forEach((button) => {
    button.addEventListener("click", () => decideWelfareClaim(button.dataset.welfareApprove, "approved"));
  });

  document.querySelectorAll("[data-welfare-reject]").forEach((button) => {
    button.addEventListener("click", () => rejectWelfareClaim(button.dataset.welfareReject));
  });

  document.querySelectorAll("[data-welfare-pay]").forEach((button) => {
    button.addEventListener("click", () => openWelfareClaimPaymentForm(button.dataset.welfarePay));
  });

  document.querySelectorAll("[data-transaction-receipt]").forEach((button) => {
    button.addEventListener("click", () => openTransactionReceipt(button.dataset.transactionReceipt));
  });

  document.querySelectorAll("[data-transaction-reversal]").forEach((button) => {
    button.addEventListener("click", () => openTransactionReversalForm(button.dataset.transactionReversal));
  });

  document.querySelectorAll("[data-member-statement]").forEach((button) => {
    button.addEventListener("click", () => openMemberStatement(button.dataset.memberStatement));
  });

  document.querySelectorAll("[data-member-profile]").forEach((button) => {
    button.addEventListener("click", () => openMemberProfile(button.dataset.memberProfile));
  });

  document.querySelectorAll("[data-period-status]").forEach((button) => {
    button.addEventListener("click", () => updateAccountingPeriodStatus(button.dataset.periodStatus, button.dataset.periodNext));
  });

  document.querySelectorAll("[data-template-edit]").forEach((button) => {
    button.addEventListener("click", () => openNotificationTemplateForm(button.dataset.templateEdit));
  });

  document.querySelectorAll("[data-template-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleNotificationTemplate(button.dataset.templateToggle));
  });

  document.querySelectorAll("[data-guarantor-accept]").forEach((button) => {
    button.addEventListener("click", () => decideGuarantorRequest(button.dataset.guarantorAccept, "accepted"));
  });

  document.querySelectorAll("[data-guarantor-reject]").forEach((button) => {
    button.addEventListener("click", () => decideGuarantorRequest(button.dataset.guarantorReject, "rejected"));
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const actions = {
        newTenant: openTenantForm,
        newMember: openMemberForm,
        newTransaction: openTransactionForm,
        newFinancialProduct: openFinancialProductForm,
        newFinancialAccount: openFinancialAccountForm,
        newWelfareClaim: openWelfareClaimForm,
        newLoan: openLoanForm,
        recordSubscriptionPayment: recordSubscriptionPayment,
        simulateMobileMoneyCallback: simulateMobileMoneyCallback,
        memberMobilePayment: memberMobilePayment,
        memberMobileLoan: openMemberMobileLoanForm,
        offlineComplaintDraft: openOfflineComplaintDraft,
        syncOfflineDrafts: syncOfflineDrafts,
        newExpense: openExpenseForm,
        newAsset: openAssetForm,
        newGovernanceMeeting: openGovernanceMeetingForm,
        newComplaint: openComplaintForm,
        newApprovalWorkflow: openApprovalWorkflowForm,
        newApprovalDecision: openApprovalDecisionForm,
        newRole: openRoleForm,
        assignUserRoles: openUserRoleAssignmentForm,
        memberImportTemplate: openMemberImportTemplate,
        newNotificationTemplate: () => openNotificationTemplateForm(),
        apiLogin: openApiLoginForm,
        memberLogin: openMemberLoginForm,
        memberLogout: memberLogout,
        refreshApi: refreshApiStatus
      };
      actions[button.dataset.action]?.();
    });
  });

  const search = document.getElementById("memberSearch");
  if (search) {
    search.addEventListener("input", () => {
      const term = search.value.toLowerCase();
      const sourceRows = useApiMembers() ? apiState.members.map(apiMemberToRow) : tenantScoped(state.members);
      const rows = sourceRows.filter((member) => JSON.stringify(member).toLowerCase().includes(term));
      document.querySelector("#membersTable tbody").innerHTML = rows.map(memberRow).join("");
      document.querySelectorAll("#membersTable [data-member-profile]").forEach((button) => {
        button.addEventListener("click", () => openMemberProfile(button.dataset.memberProfile));
      });
      document.querySelectorAll("#membersTable [data-member-statement]").forEach((button) => {
        button.addEventListener("click", () => openMemberStatement(button.dataset.memberStatement));
      });
    });
  }
}

function openModal(title, body, footer) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = body;
  document.getElementById("modalFooter").innerHTML = footer;
  document.getElementById("modal").showModal();
}

function renderApiChrome() {
  const badge = document.getElementById("apiBadge");
  const login = document.getElementById("apiLoginBtn");
  const logout = document.getElementById("apiLogoutBtn");
  if (!badge || !login || !logout) return;

  badge.textContent = apiState.user ? `API: ${apiState.user.fullName}` : `API: ${apiState.health}`;
  badge.className = `api-badge ${apiState.health}`;
  login.hidden = Boolean(apiState.user);
  logout.hidden = !apiState.user;
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(apiState.token ? { Authorization: `Bearer ${apiState.token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload.error?.message || `API request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload.data;
}

async function memberApiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(memberApiState.token ? { Authorization: `Bearer ${memberApiState.token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload.error?.message || `Member request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload.data;
}

async function refreshMemberStatus() {
  if (!memberApiState.token) return;
  try {
    const [session, mobileDashboard, guarantorRequests, notifications] = await Promise.all([
      memberApiRequest("/member-auth/me"),
      memberApiRequest("/member-auth/mobile-dashboard"),
      memberApiRequest("/member-auth/guarantor-requests"),
      memberApiRequest("/member-auth/notifications")
    ]);
    memberApiState.member = session.member;
    memberApiState.tenant = session.tenant;
    memberApiState.branch = session.branch;
    memberApiState.balances = session.balances;
    memberApiState.mobileDashboard = mobileDashboard;
    memberApiState.guarantorRequests = guarantorRequests;
    memberApiState.notifications = notifications;
    memberApiState.message = `Member portal signed in as ${session.member.fullName}.`;
  } catch (error) {
    localStorage.removeItem(MEMBER_SESSION_KEY);
    memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, mobileDashboard: null, guarantorRequests: [], notifications: [], message: error.message };
  }
  if (state.currentView === "memberPortal") render();
}

async function refreshApiStatus() {
  try {
    const health = await apiRequest("/health");
    apiState.health = health.ok ? "online" : "offline";
    apiState.message = `${health.service} ${health.version} responded successfully.`;

    if (apiState.token) {
      const session = await apiRequest("/auth/me");
      apiState.user = session.user;
      const [tenants, users, roles, permissions, auditEvents, operationsStatus, branches, members, subscriptionPackages, subscriptions, financialProducts, financialAccounts, financialTransactions, welfareClaims, loans, accountingPeriods, chartOfAccounts, journalEntries, statementLines, reconciliation, regulatoryReport, mobileMoneyCallbacks, notificationDeliveries, notificationTemplates, suppliers, expenses, assets, governanceMeetings, complaints, approvalWorkflows, approvalDecisions] = await Promise.all([
        apiRequest("/tenants"),
        apiRequest("/users"),
        apiRequest(`/roles${apiTenantQuery()}`),
        apiRequest("/permissions"),
        apiRequest("/audit-events"),
        apiRequest(`/operations/status${apiOperationsQuery()}`),
        apiRequest(`/branches${apiTenantQuery()}`),
        apiRequest(`/members${apiTenantQuery()}`),
        apiRequest("/subscription-packages"),
        apiRequest(`/subscriptions${apiSubscriptionQuery()}`),
        apiRequest(`/financial-products${apiTenantQuery()}`),
        apiRequest(`/financial-accounts${apiTenantQuery()}`),
        apiRequest(`/financial-transactions${apiTenantQuery()}`),
        apiRequest(`/welfare-claims${apiTenantQuery()}`),
        apiRequest(`/loans${apiTenantQuery()}`),
        apiRequest(`/accounting-periods${apiTenantQuery()}`),
        apiRequest("/chart-of-accounts"),
        apiRequest(`/journal-entries${apiTenantQuery()}`),
        apiRequest(`/statement-lines${apiTenantQuery()}`),
        apiRequest(`/reconciliation${apiTenantQuery()}`),
        apiRequest(`/regulatory-report${apiTenantQuery()}`),
        apiRequest(`/integrations/mobile-money/callbacks${apiTenantQuery()}`),
        apiRequest(`/notifications/deliveries${apiTenantQuery()}`),
        apiRequest(`/notification-templates${apiTenantQuery()}`),
        apiRequest(`/suppliers${apiTenantQuery()}`),
        apiRequest(`/expenses${apiTenantQuery()}`),
        apiRequest(`/assets${apiTenantQuery()}`),
        apiRequest(`/governance-meetings${apiTenantQuery()}`),
        apiRequest(`/complaints${apiTenantQuery()}`),
        apiRequest(`/approval-workflows${apiTenantQuery()}`),
        apiRequest(`/approval-decisions${apiTenantQuery()}`)
      ]);
      apiState.tenants = tenants;
      apiState.users = users;
      apiState.roles = roles;
      apiState.permissions = permissions;
      apiState.auditEvents = auditEvents;
      apiState.operationsStatus = operationsStatus;
      apiState.branches = branches;
      apiState.members = members;
      apiState.subscriptionPackages = subscriptionPackages;
      apiState.subscriptions = subscriptions;
      apiState.financialProducts = financialProducts;
      apiState.financialAccounts = financialAccounts;
      apiState.financialTransactions = financialTransactions;
      apiState.welfareClaims = welfareClaims;
      apiState.loans = loans;
      apiState.accountingPeriods = accountingPeriods;
      apiState.chartOfAccounts = chartOfAccounts;
      apiState.journalEntries = journalEntries;
      apiState.statementLines = statementLines;
      apiState.reconciliation = reconciliation;
      apiState.regulatoryReport = regulatoryReport;
      apiState.mobileMoneyCallbacks = mobileMoneyCallbacks;
      apiState.notificationDeliveries = notificationDeliveries;
      apiState.notificationTemplates = notificationTemplates;
      apiState.suppliers = suppliers;
      apiState.expenses = expenses;
      apiState.assets = assets;
      apiState.governanceMeetings = governanceMeetings;
      apiState.complaints = complaints;
      apiState.approvalWorkflows = approvalWorkflows;
      apiState.approvalDecisions = approvalDecisions;
      apiState.message = `Connected as ${session.user.fullName}. API returned ${tenants.length} tenant(s), ${users.length} user(s), ${roles.length} role(s), ${branches.length} branch(es), ${members.length} member(s), ${subscriptions.length} subscription(s), ${financialProducts.length} product(s), ${financialAccounts.length} account(s), ${financialTransactions.length} transaction(s), ${welfareClaims.length} welfare claim(s), ${loans.length} loan(s), ${accountingPeriods.length} accounting period(s), ${journalEntries.length} journal(s), ${statementLines.length} statement line(s), ${regulatoryReport.reports.length} report row(s), ${mobileMoneyCallbacks.length} callback(s), ${notificationDeliveries.length} delivery(s), ${notificationTemplates.length} notification template(s), ${expenses.length} expense(s), ${assets.length} asset(s), ${governanceMeetings.length} meeting(s), ${complaints.length} complaint(s), ${approvalWorkflows.length} workflow(s), ${approvalDecisions.length} decision(s), and ${auditEvents.length} audit event(s).`;
    }
  } catch (error) {
    if (apiState.token) {
      localStorage.removeItem(API_SESSION_KEY);
      apiState.token = "";
      apiState.user = null;
    }
    apiState.health = "offline";
    apiState.message = error.message;
  }
  renderApiChrome();
  if (["dashboard", "reports", "operations", "members", "registrations", "subscriptions", "transactions", "approvals", "loans"].includes(state.currentView)) render();
}

function openApiLoginForm() {
  openModal("API login", `
    <div class="notice">Seed accounts: <strong>admin@platform.local</strong> / <strong>Admin@12345</strong> or <strong>admin@greenvalley.local</strong> / <strong>Sacco@12345</strong>.</div>
    <div class="form-grid" style="margin-top:14px">
      ${field("Email", "apiEmail", "email", "admin@platform.local")}
      ${field("Password", "apiPassword", "password", "Admin@12345")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="apiLoginSubmit" class="primary-button" type="button">Login</button>`);

  document.getElementById("apiLoginSubmit").addEventListener("click", async () => {
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        headers: {},
        body: JSON.stringify({ email: value("apiEmail"), password: value("apiPassword") })
      });
      apiState.token = data.token;
      apiState.user = data.user;
      localStorage.setItem(API_SESSION_KEY, data.token);
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openMemberLoginForm() {
  openModal("Member login", `
    <div class="notice">Seed member account: <strong>GVS-0001</strong> / <strong>Member@12345</strong>. Phone or email also work.</div>
    <div class="form-grid" style="margin-top:14px">
      ${field("Membership no., phone, or email", "memberIdentifier", "text", "GVS-0001")}
      ${field("Password", "memberPassword", "password", "Member@12345")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="memberLoginSubmit" class="primary-button" type="button">Login</button>`);

  document.getElementById("memberLoginSubmit").addEventListener("click", async () => {
    try {
      const data = await memberApiRequest("/member-auth/login", {
        method: "POST",
        headers: {},
        body: JSON.stringify({ identifier: value("memberIdentifier"), password: value("memberPassword") })
      });
      memberApiState.token = data.token;
      memberApiState.member = data.member;
      memberApiState.tenant = data.tenant;
      memberApiState.branch = data.branch;
      memberApiState.balances = data.balances;
      memberApiState.mobileDashboard = null;
      memberApiState.guarantorRequests = [];
      memberApiState.notifications = [];
      localStorage.setItem(MEMBER_SESSION_KEY, data.token);
      closeModal();
      state.currentView = "memberPortal";
      await refreshMemberStatus();
      render();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function simulateMobileMoneyCallback() {
  try {
    const data = await apiRequest("/integrations/mobile-money/callback", {
      method: "POST",
      body: JSON.stringify({
        tenantId: "tenant_green",
        membershipNo: "GVS-0001",
        purpose: "savings_deposit",
        amount: 42000,
        externalReference: `MM-UI-${Date.now()}`,
        provider: "ui_demo_mobile_money",
        receivedAt: today.toISOString()
      })
    });
    apiState.mobileMoneyCallbacks = [data.callback, ...apiState.mobileMoneyCallbacks.filter((item) => item.id !== data.callback.id)];
    apiState.notificationDeliveries = [...(data.deliveries || []), ...apiState.notificationDeliveries.filter((item) => !(data.deliveries || []).some((delivery) => delivery.id === item.id))];
    apiState.message = `Mobile-money callback ${data.callback.externalReference} posted for ${money.format(data.callback.amount)}.`;
    if (apiState.user) {
      await refreshApiStatus();
      return;
    }
    render();
  } catch (error) {
    apiState.message = error.message;
    render();
  }
}

async function memberMobilePayment() {
  if (!memberApiState.member) return;
  try {
    const data = await apiRequest("/integrations/mobile-money/callback", {
      method: "POST",
      body: JSON.stringify({
        tenantId: memberApiState.member.tenantId,
        membershipNo: memberApiState.member.membershipNo,
        purpose: "savings_deposit",
        amount: 25000,
        externalReference: `MM-MEMBER-${Date.now()}`,
        provider: "member_mobile_demo",
        receivedAt: today.toISOString()
      })
    });
    await refreshMemberStatus();
    memberApiState.message = `Server confirmed mobile-money payment ${data.callback.externalReference}.`;
    render();
  } catch (error) {
    memberApiState.message = error.message;
    render();
  }
}

function openMemberMobileLoanForm() {
  if (!memberApiState.member) return;
  openModal("Mobile loan application", `
    <div class="notice">This submits directly as ${memberApiState.member.fullName} and waits for server confirmation before updating the mobile dashboard.</div>
    <div class="form-grid" style="margin-top:14px">
      <label class="field"><span>Loan product</span><select id="mobileLoanProduct" class="select"><option>Development Loan</option><option>Emergency Loan</option><option>Agriculture Loan</option><option>School Fees Loan</option></select></label>
      ${field("Requested amount", "mobileLoanAmount", "number", "750000")}
      ${field("Repayment months", "mobileLoanPeriod", "number", "10")}
      <label class="field full"><span>Purpose</span><textarea id="mobileLoanPurpose" class="input" rows="3">Mobile working capital request</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveMobileLoan" class="primary-button" type="button">Submit mobile loan</button>`);

  document.getElementById("saveMobileLoan").addEventListener("click", async () => {
    try {
      const loan = await memberApiRequest("/member-auth/mobile-loans", {
        method: "POST",
        body: JSON.stringify({
          product: value("mobileLoanProduct"),
          amount: Number(value("mobileLoanAmount")),
          repaymentMonths: Number(value("mobileLoanPeriod")),
          purpose: value("mobileLoanPurpose")
        })
      });
      closeModal();
      await refreshMemberStatus();
      memberApiState.message = `Server confirmed mobile loan ${loan.product} for ${money.format(loan.amount)}.`;
      render();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openOfflineComplaintDraft() {
  if (!memberApiState.member) return;
  openModal("Offline complaint draft", `
    <div class="notice">This saves locally first. Use Sync drafts when the member app is online.</div>
    <div class="form-grid" style="margin-top:14px">
      ${field("Subject", "offlineComplaintSubject", "text", "Mobile service follow-up")}
      <label class="field"><span>Category</span><select id="offlineComplaintCategory" class="select"><option value="service">Service</option><option value="statement">Statement</option><option value="loan">Loan</option><option value="savings">Savings</option><option value="shares">Shares</option><option value="other">Other</option></select></label>
      <label class="field"><span>Priority</span><select id="offlineComplaintPriority" class="select"><option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option></select></label>
      <label class="field full"><span>Description</span><textarea id="offlineComplaintDescription" class="input" rows="3">Draft captured from the member mobile dashboard.</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveOfflineDraft" class="primary-button" type="button">Save draft</button>`);

  document.getElementById("saveOfflineDraft").addEventListener("click", () => {
    offlineDrafts.unshift({
      id: `draft-${Date.now()}`,
      type: "complaint",
      tenantId: memberApiState.member.tenantId,
      memberId: memberApiState.member.id,
      subject: value("offlineComplaintSubject"),
      category: value("offlineComplaintCategory"),
      priority: value("offlineComplaintPriority"),
      description: value("offlineComplaintDescription"),
      createdAt: new Date().toISOString()
    });
    saveOfflineDrafts();
    memberApiState.message = "Offline complaint draft saved locally.";
    closeModal();
    render();
  });
}

async function syncOfflineDrafts() {
  if (!memberApiState.member) return;
  const memberDrafts = offlineDrafts.filter((draft) => draft.memberId === memberApiState.member.id);
  if (!memberDrafts.length) {
    memberApiState.message = "No offline drafts to sync.";
    render();
    return;
  }

  try {
    for (const draft of memberDrafts) {
      await memberApiRequest("/member-auth/mobile-complaints", {
        method: "POST",
        body: JSON.stringify({
          subject: draft.subject,
          category: draft.category,
          priority: draft.priority,
          description: draft.description
        })
      });
    }
    offlineDrafts = offlineDrafts.filter((draft) => draft.memberId !== memberApiState.member.id);
    saveOfflineDrafts();
    await refreshMemberStatus();
    memberApiState.message = `${memberDrafts.length} offline draft(s) synced to the server.`;
    render();
  } catch (error) {
    memberApiState.message = error.message;
    render();
  }
}

async function apiLogout() {
  try {
    if (apiState.token) await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Local logout should still clear the client session if the server has restarted.
  }
  localStorage.removeItem(API_SESSION_KEY);
  apiState = { ...apiState, token: "", user: null, tenants: [], users: [], roles: [], permissions: [], branches: [], members: [], subscriptionPackages: [], subscriptions: [], financialProducts: [], financialAccounts: [], financialTransactions: [], welfareClaims: [], loans: [], accountingPeriods: [], chartOfAccounts: [], journalEntries: [], statementLines: [], reconciliation: null, regulatoryReport: null, mobileMoneyCallbacks: [], notificationDeliveries: [], notificationTemplates: [], suppliers: [], expenses: [], assets: [], governanceMeetings: [], complaints: [], approvalWorkflows: [], approvalDecisions: [], auditEvents: [], operationsStatus: null, message: "Logged out of API session." };
  renderApiChrome();
  render();
}

async function memberLogout() {
  try {
    if (memberApiState.token) await memberApiRequest("/member-auth/logout", { method: "POST" });
  } catch {
    // Local logout should still clear the client member session if the server has restarted.
  }
  localStorage.removeItem(MEMBER_SESSION_KEY);
  memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, mobileDashboard: null, guarantorRequests: [], notifications: [], message: "Logged out of member portal." };
  render();
}

function apiAuditTable(rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Tenant</th><th>Actor</th><th>Action</th><th>Resource</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.createdAt}</td>
              <td>${row.tenantId}</td>
              <td>${row.actorName}</td>
              <td>${row.action}</td>
              <td>${row.resourceType || ""} ${row.resourceId || ""}</td>
            </tr>
          `).join("") || `<tr><td colspan="5">Login to the API to view server-side audit events.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function branchName(id) {
  const apiBranch = apiState.branches.find((item) => item.id === id);
  if (apiBranch) return apiBranch.name;
  for (const tenant of state.tenants) {
    const branch = tenant.branches?.find((item) => item.id === id);
    if (branch) return branch.name;
  }
  return "Unassigned";
}

memberRow = function renderMemberRow(member) {
  const actions = apiState.user
    ? `<div class="filters"><button class="secondary-button" data-member-profile="${member.id}" type="button">Profile</button><button class="secondary-button" data-member-statement="${member.id}" type="button">Statement</button></div>`
    : "";
  return `
    <tr>
      <td><strong>${member.name}</strong><br><small>${member.no} · ${member.phone}${member.source ? ` · ${member.source}` : ""}</small></td>
      <td>${member.type}</td>
      <td>${member.branchName || branchName(member.branchId)}</td>
      <td>${member.kyc}</td>
      <td>${money.format(member.savings)}</td>
      <td>${money.format(member.shares)}</td>
      <td>${money.format(member.welfare)}</td>
      <td><span class="status ${statusClass(member.status)}">${member.status}</span></td>
      <td>${actions}</td>
    </tr>
  `;
};

function closeModal() {
  document.getElementById("modal").close();
}

function openTenantForm() {
  const apiMode = apiState.user?.tenantId === "tenant_platform";
  openModal("New SACCO application", `
    <div class="form-grid">
      ${field("SACCO name", "tenantName", "text", "Bweyogerere Traders SACCO")}
      ${field("Abbreviation", "tenantAbbr", "text", "BTS")}
      ${field("Cooperative registration no.", "tenantReg", "text", "COOP-UG-9001")}
      ${field("District", "tenantDistrict", "text", "Wakiso")}
      ${field("UMRA licence expiry", "tenantExpiry", "date", "2027-07-15")}
      <label class="field"><span>Preferred package</span><select id="tenantPackage" class="select">${state.packages.map((pkg) => `<option value="${pkg.id}">${pkg.name}</option>`).join("")}</select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveTenant" class="primary-button" type="button">Submit application</button>`);

  document.getElementById("saveTenant").addEventListener("click", async () => {
    if (apiMode) {
      try {
        await apiRequest("/tenants", {
          method: "POST",
          body: JSON.stringify({
            name: value("tenantName"),
            abbreviation: value("tenantAbbr"),
            registrationNo: value("tenantReg"),
            district: value("tenantDistrict"),
            licenseExpiry: value("tenantExpiry"),
            packageId: value("tenantPackage")
          })
        });
        closeModal();
        state.currentView = "registrations";
        await refreshApiStatus();
      } catch (error) {
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
      }
      return;
    }

    const id = `tenant-${Date.now()}`;
    state.tenants.push({
      id,
      name: value("tenantName"),
      abbreviation: value("tenantAbbr"),
      registrationNo: value("tenantReg"),
      district: value("tenantDistrict"),
      licenseExpiry: value("tenantExpiry"),
      packageId: value("tenantPackage"),
      status: "Pending Review",
      onboarding: 15,
      branches: [{ id: `${id}-main`, code: `${value("tenantAbbr") || "SC"}001`, name: "Main Branch", manager: "Unassigned" }]
    });
    state.approvals.push({ id: `ap-${Date.now()}`, tenantId: "platform", title: `Approve ${value("tenantName")} registration`, type: "Tenant Registration", status: "Pending", requester: "Applicant", risk: "Medium" });
    addAudit("platform", "Applicant", `Submitted SACCO registration for ${value("tenantName")}`);
    saveState();
    renderTenantSelect();
    closeModal();
    render();
  });
}

async function openSaccoProfile(tenantId) {
  if (!apiState.user) return;
  try {
    const tenant = apiState.tenants.find((item) => item.id === tenantId);
    const profile = await apiRequest(`/tenants/${tenantId}/profile`);
    openModal(`${tenant?.name || profile.legalName} profile`, `
      <div class="grid metrics">
        ${metric("Legal name", profile.legalName, profile.cooperativeRegistrationNo || "Registration pending")}
        ${metric("UMRA licence", profile.umraLicenseNo || "Not captured", profile.tin ? `TIN ${profile.tin}` : "Tax details pending")}
        ${metric("Contact", profile.phone || "No phone", profile.email || "No email")}
      </div>
      <div class="form-grid" style="margin-top:16px">
        ${field("Legal name", "saccoProfileLegalName", "text", profile.legalName || tenant?.name || "")}
        ${field("TIN", "saccoProfileTin", "text", profile.tin || "")}
        ${field("UMRA licence no.", "saccoProfileUmra", "text", profile.umraLicenseNo || "")}
        ${field("Cooperative registration no.", "saccoProfileCoop", "text", profile.cooperativeRegistrationNo || tenant?.registrationNo || "")}
        ${field("Address", "saccoProfileAddress", "text", profile.address || "")}
        ${field("Email", "saccoProfileEmail", "email", profile.email || "")}
        ${field("Phone", "saccoProfilePhone", "tel", profile.phone || "")}
        ${field("Website", "saccoProfileWebsite", "url", profile.website || "")}
      </div>
    `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveSaccoProfile" class="primary-button" type="button">Save profile</button>`);
    document.getElementById("saveSaccoProfile").addEventListener("click", async () => {
      try {
        await apiRequest(`/tenants/${tenantId}/profile`, {
          method: "PATCH",
          body: JSON.stringify({
            legalName: value("saccoProfileLegalName"),
            tin: value("saccoProfileTin"),
            umraLicenseNo: value("saccoProfileUmra"),
            cooperativeRegistrationNo: value("saccoProfileCoop"),
            address: value("saccoProfileAddress"),
            email: value("saccoProfileEmail"),
            phone: value("saccoProfilePhone"),
            website: value("saccoProfileWebsite")
          })
        });
        closeModal();
        await refreshApiStatus();
      } catch (error) {
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
      }
    });
  } catch (error) {
    openModal("SACCO profile", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

function openMemberForm() {
  if (!apiState.user && state.tenantId === "platform") {
    state.tenantId = "green";
    renderTenantSelect();
  }
  const tenant = currentTenant();
  const apiMode = Boolean(apiState.user);
  const branches = apiMode ? apiState.branches : tenant.branches;
  const branchOptions = branches.map((branch) => `<option value="${branch.id}">${branch.name}</option>`).join("");
  openModal("Register member", `
    <div class="form-grid">
      ${field("Full name", "memberName", "text", "New SACCO Member")}
      ${field("Telephone", "memberPhone", "tel", "+256700000000")}
      ${field("National ID or group ID", "memberNin", "text", "CM0000000K0AA")}
      <label class="field"><span>Member type</span><select id="memberType" class="select"><option>Individual</option><option>Group</option><option>Institutional</option><option>Corporate</option></select></label>
      <label class="field"><span>Branch</span><select id="memberBranch" class="select">${branchOptions}</select></label>
      <label class="field"><span>KYC status</span><select id="memberKyc" class="select"><option>Pending Verification</option><option>Verified</option><option>Not Verified</option></select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveMember" class="primary-button" type="button">Save member</button>`);

  document.getElementById("saveMember").addEventListener("click", async () => {
    if (apiMode) {
      try {
        await apiRequest("/members", {
          method: "POST",
          body: JSON.stringify({
            tenantId: currentApiTenantId(),
            branchId: value("memberBranch"),
            fullName: value("memberName"),
            phone: value("memberPhone"),
            nationalId: value("memberNin"),
            memberType: value("memberType").toLowerCase(),
            kycStatus: value("memberKyc").toLowerCase().replace(/\s+/g, "_")
          })
        });
        closeModal();
        state.currentView = "members";
        await refreshApiStatus();
      } catch (error) {
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
      }
      return;
    }

    const count = state.members.filter((member) => member.tenantId === state.tenantId).length + 1;
    state.members.push({
      id: `m-${Date.now()}`,
      tenantId: state.tenantId,
      no: `${tenant.abbreviation}-${String(count).padStart(4, "0")}`,
      name: value("memberName"),
      phone: value("memberPhone"),
      nin: value("memberNin"),
      type: value("memberType"),
      status: "Pending Approval",
      branchId: value("memberBranch"),
      kyc: value("memberKyc"),
      savings: 0,
      shares: 0,
      welfare: 0
    });
    addAudit(state.tenantId, "SACCO Admin", `Registered member ${value("memberName")}`);
    saveState();
    closeModal();
    state.currentView = "members";
    render();
  });
}

async function openMemberImportTemplate() {
  if (!apiState.user) return;
  try {
    const template = await apiRequest(`/members/import-template${apiTenantQuery()}`);
    const sample = template.sampleRows?.[0] || {};
    openModal("Member import template", `
      <div class="grid metrics">
        ${metric("File", template.filename, template.contentType)}
        ${metric("Columns", template.headers.length, "required import fields")}
        ${metric("Tenant", tenantName(template.tenantId), sample.branchId || "No branch")}
      </div>
      <div class="table-wrap" style="margin-top:16px">
        <table>
          <thead><tr>${template.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>
            <tr>${template.headers.map((header) => `<td>${sample[header] || ""}</td>`).join("")}</tr>
          </tbody>
        </table>
      </div>
      <details style="margin-top:16px" open><summary>CSV template</summary><pre class="notice" style="white-space:pre-wrap">${template.csv}</pre></details>
    `, `<button class="secondary-button" value="cancel" type="submit">Close</button><button id="copyMemberImportTemplate" class="primary-button" type="button">Copy CSV</button>`);
    document.getElementById("copyMemberImportTemplate").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(template.csv);
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice">CSV template copied to clipboard.</div>`);
      } catch {
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">Clipboard access was not available. Use the CSV preview text.</div>`);
      }
    });
  } catch (error) {
    openModal("Member import template", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function openMemberProfile(memberId) {
  if (!apiState.user) return;
  const member = apiState.members.find((item) => item.id === memberId);
  if (!member) return;
  try {
    const [documents, nextOfKin, beneficiaries] = await Promise.all([
      apiRequest(`/members/${memberId}/documents`),
      apiRequest(`/members/${memberId}/next-of-kin`),
      apiRequest(`/members/${memberId}/beneficiaries`)
    ]);
    const allocated = beneficiaries.reduce((sum, beneficiary) => sum + Number(beneficiary.allocationPercent || 0), 0);
    openModal(`${member.fullName} profile`, `
      <div class="grid metrics">
        ${metric("Documents", documents.length, `${documents.filter((document) => document.verificationStatus === "verified").length} verified`)}
        ${metric("Next of kin", nextOfKin.length, `${nextOfKin.filter((kin) => kin.primaryContact).length} primary`)}
        ${metric("Beneficiaries", beneficiaries.length, `${allocated}% allocated`)}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${miniFact("Member no.", member.membershipNo)}
        ${miniFact("Phone", member.phone)}
        ${miniFact("Branch", branchName(member.branchId))}
      </div>
      <div class="grid two" style="margin-top:16px">
        <section>
          <div class="toolbar">
            <h3>KYC documents</h3>
            <button class="secondary-button" id="addMemberDocument" type="button">Add document</button>
          </div>
          ${memberDocumentList(documents)}
        </section>
        <section>
          <div class="toolbar">
            <h3>Next of kin</h3>
            <button class="secondary-button" id="addNextOfKin" type="button">Add contact</button>
          </div>
          ${memberNextOfKinList(nextOfKin)}
        </section>
      </div>
      <section style="margin-top:16px">
        <div class="toolbar">
          <h3>Beneficiaries</h3>
          <button class="secondary-button" id="addBeneficiary" type="button">Add beneficiary</button>
        </div>
        ${memberBeneficiaryList(beneficiaries)}
      </section>
    `, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    document.getElementById("addMemberDocument").addEventListener("click", () => openMemberDocumentForm(memberId));
    document.getElementById("addNextOfKin").addEventListener("click", () => openNextOfKinForm(memberId));
    document.getElementById("addBeneficiary").addEventListener("click", () => openBeneficiaryForm(memberId));
  } catch (error) {
    openModal("Member profile", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

function memberDocumentList(documents) {
  return `
    <ul class="list">
      ${documents.map((document) => `
        <li>
          <span><strong>${titleCase(document.documentType.replace(/_/g, " "))}</strong><br><small>${document.storageKey}</small></span>
          <span class="status ${statusClass(document.verificationStatus)}">${titleCase(document.verificationStatus.replace(/_/g, " "))}</span>
        </li>
      `).join("") || `<li><span>No documents uploaded.</span><span class="status pending">KYC</span></li>`}
    </ul>
  `;
}

function memberNextOfKinList(nextOfKin) {
  return `
    <ul class="list">
      ${nextOfKin.map((kin) => `
        <li>
          <span><strong>${kin.fullName}</strong><br><small>${titleCase(kin.relationship)} &middot; ${kin.phone}${kin.address ? ` &middot; ${kin.address}` : ""}</small></span>
          <span class="status ${kin.primaryContact ? "active" : "pending"}">${kin.primaryContact ? "Primary" : "Contact"}</span>
        </li>
      `).join("") || `<li><span>No next-of-kin contacts.</span><span class="status pending">Pending</span></li>`}
    </ul>
  `;
}

function memberBeneficiaryList(beneficiaries) {
  return `
    <ul class="list">
      ${beneficiaries.map((beneficiary) => `
        <li>
          <span><strong>${beneficiary.fullName}</strong><br><small>${titleCase(beneficiary.relationship)}${beneficiary.phone ? ` &middot; ${beneficiary.phone}` : ""}</small></span>
          <strong>${beneficiary.allocationPercent}%</strong>
        </li>
      `).join("") || `<li><span>No beneficiaries captured.</span><span class="status pending">Pending</span></li>`}
    </ul>
  `;
}

function openMemberDocumentForm(memberId) {
  openModal("Add KYC document", `
    <div class="form-grid">
      <label class="field"><span>Document type</span><select id="profileDocumentType" class="select"><option value="national_id">National ID</option><option value="photo">Photo</option><option value="signature">Signature</option><option value="registration_certificate">Registration certificate</option></select></label>
      ${field("Storage key", "profileStorageKey", "text", `tenant_green/members/${memberId}/document.pdf`)}
      <label class="field"><span>Verification status</span><select id="profileDocumentStatus" class="select"><option value="pending_verification">Pending Verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveMemberDocument" class="primary-button" type="button">Save document</button>`);
  document.getElementById("saveMemberDocument").addEventListener("click", async () => {
    await saveMemberProfileRecord(`/members/${memberId}/documents`, {
      documentType: value("profileDocumentType"),
      storageKey: value("profileStorageKey"),
      verificationStatus: value("profileDocumentStatus")
    }, memberId);
  });
}

function openNextOfKinForm(memberId) {
  openModal("Add next of kin", `
    <div class="form-grid">
      ${field("Full name", "profileKinName", "text", "Grace Nambi")}
      ${field("Relationship", "profileKinRelationship", "text", "Mother")}
      ${field("Phone", "profileKinPhone", "tel", "+256703333444")}
      ${field("Address", "profileKinAddress", "text", "Kireka")}
      <label class="field"><span>Primary contact</span><select id="profileKinPrimary" class="select"><option value="true">Yes</option><option value="false">No</option></select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveNextOfKin" class="primary-button" type="button">Save contact</button>`);
  document.getElementById("saveNextOfKin").addEventListener("click", async () => {
    await saveMemberProfileRecord(`/members/${memberId}/next-of-kin`, {
      fullName: value("profileKinName"),
      relationship: value("profileKinRelationship"),
      phone: value("profileKinPhone"),
      address: value("profileKinAddress"),
      primaryContact: value("profileKinPrimary") === "true"
    }, memberId);
  });
}

function openBeneficiaryForm(memberId) {
  openModal("Add beneficiary", `
    <div class="form-grid">
      ${field("Full name", "profileBeneficiaryName", "text", "Eva Nakato")}
      ${field("Relationship", "profileBeneficiaryRelationship", "text", "Daughter")}
      ${field("Phone", "profileBeneficiaryPhone", "tel", "+256704444555")}
      ${field("Allocation percent", "profileBeneficiaryAllocation", "number", "20")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveBeneficiary" class="primary-button" type="button">Save beneficiary</button>`);
  document.getElementById("saveBeneficiary").addEventListener("click", async () => {
    await saveMemberProfileRecord(`/members/${memberId}/beneficiaries`, {
      fullName: value("profileBeneficiaryName"),
      relationship: value("profileBeneficiaryRelationship"),
      phone: value("profileBeneficiaryPhone"),
      allocationPercent: Number(value("profileBeneficiaryAllocation"))
    }, memberId);
  });
}

async function saveMemberProfileRecord(path, payload, memberId) {
  try {
    await apiRequest(path, { method: "POST", body: JSON.stringify(payload) });
    closeModal();
    await openMemberProfile(memberId);
  } catch (error) {
    document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
  }
}

function openApprovalWorkflowForm() {
  if (!apiState.user) return;
  openModal("New approval workflow", `
    <div class="form-grid">
      ${field("Workflow name", "approvalWorkflowName", "text", "Expense approval")}
      <label class="field"><span>Module</span><select id="approvalWorkflowModule" class="select"><option value="members">Members</option><option value="transactions">Transactions</option><option value="loans">Loans</option><option value="expenses">Expenses</option><option value="assets">Assets</option><option value="subscriptions">Subscriptions</option><option value="governance">Governance</option></select></label>
      <label class="field"><span>Status</span><select id="approvalWorkflowActive" class="select"><option value="true">Active</option><option value="false">Inactive</option></select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveApprovalWorkflow" class="primary-button" type="button">Save workflow</button>`);
  document.getElementById("saveApprovalWorkflow").addEventListener("click", async () => {
    try {
      await apiRequest("/approval-workflows", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          name: value("approvalWorkflowName"),
          module: value("approvalWorkflowModule"),
          active: value("approvalWorkflowActive") === "true"
        })
      });
      closeModal();
      state.currentView = "approvals";
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openApprovalDecisionForm() {
  if (!apiState.user) return;
  const workflows = apiState.approvalWorkflows || [];
  if (!workflows.length) {
    openModal("Record approval decision", `<div class="notice error">Create an approval workflow before recording decisions.</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    return;
  }
  openModal("Record approval decision", `
    <div class="form-grid">
      <label class="field full"><span>Workflow</span><select id="approvalDecisionWorkflow" class="select">${workflows.map((workflow) => `<option value="${workflow.id}">${workflow.name} (${titleCase(workflow.module.replace(/_/g, " "))})</option>`).join("")}</select></label>
      ${field("Resource type", "approvalDecisionResourceType", "text", "expense")}
      ${field("Resource ID", "approvalDecisionResourceId", "text", "expense_green_0001")}
      <label class="field"><span>Decision</span><select id="approvalDecisionValue" class="select"><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="corrections_requested">Corrections Requested</option><option value="pending">Pending</option></select></label>
      <label class="field full"><span>Reason</span><textarea id="approvalDecisionReason" class="input" rows="3" placeholder="Required for rejected or corrections requested decisions"></textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveApprovalDecision" class="primary-button" type="button">Record decision</button>`);
  document.getElementById("saveApprovalDecision").addEventListener("click", async () => {
    const workflow = workflows.find((item) => item.id === value("approvalDecisionWorkflow"));
    try {
      await apiRequest("/approval-decisions", {
        method: "POST",
        body: JSON.stringify({
          tenantId: workflow?.tenantId,
          workflowId: value("approvalDecisionWorkflow"),
          resourceType: value("approvalDecisionResourceType"),
          resourceId: value("approvalDecisionResourceId"),
          decision: value("approvalDecisionValue"),
          reason: value("approvalDecisionReason")
        })
      });
      closeModal();
      state.currentView = "approvals";
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openRoleForm() {
  if (!apiState.user) return;
  const permissions = apiState.permissions || [];
  openModal("New role", `
    <div class="form-grid">
      ${field("Role name", "roleName", "text", "Cashier")}
      <label class="field full"><span>Permissions</span><select id="rolePermissions" class="select" multiple size="8">${permissions.map((permission) => `<option value="${permission.id}">${permission.id} - ${permission.description || permission.module}</option>`).join("")}</select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveRole" class="primary-button" type="button">Save role</button>`);
  document.getElementById("saveRole").addEventListener("click", async () => {
    try {
      await apiRequest("/roles", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          name: value("roleName"),
          permissionIds: selectedValues("rolePermissions")
        })
      });
      closeModal();
      state.currentView = "reports";
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openUserRoleAssignmentForm() {
  if (!apiState.user) return;
  const users = apiState.users || [];
  const roles = apiState.roles || [];
  if (!users.length || !roles.length) {
    openModal("Assign roles", `<div class="notice error">Users and roles must be loaded before assignment.</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    return;
  }
  openModal("Assign roles", `
    <div class="form-grid">
      <label class="field full"><span>User</span><select id="roleUser" class="select">${users.map((user) => `<option value="${user.id}">${user.fullName} (${user.email})</option>`).join("")}</select></label>
      <label class="field full"><span>Roles</span><select id="assignedRoles" class="select" multiple size="6">${roles.map((role) => `<option value="${role.id}">${role.name}</option>`).join("")}</select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveUserRoles" class="primary-button" type="button">Save assignments</button>`);
  document.getElementById("saveUserRoles").addEventListener("click", async () => {
    try {
      await apiRequest(`/users/${value("roleUser")}/roles`, {
        method: "PUT",
        body: JSON.stringify({ roleIds: selectedValues("assignedRoles") })
      });
      closeModal();
      state.currentView = "reports";
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openNotificationTemplateForm(templateId = "") {
  if (!apiState.user) return;
  const template = apiState.notificationTemplates.find((item) => item.id === templateId);
  if (template && !canManageNotificationTemplate(template)) return;
  const isEdit = Boolean(template);
  const defaultTenantId = apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId;
  const tenantOptions = apiState.user.tenantId === "tenant_platform"
    ? `<label class="field"><span>Source</span><select id="templateTenant" class="select"><option value="">Global default</option>${apiState.tenants.filter((tenant) => tenant.id !== "tenant_platform").map((tenant) => `<option value="${tenant.id}" ${tenant.id === (template?.tenantId || defaultTenantId) ? "selected" : ""}>${tenant.name}</option>`).join("")}</select></label>`
    : "";
  openModal(isEdit ? "Edit notification template" : "New notification template", `
    <div class="form-grid">
      ${tenantOptions}
      ${field("Event type", "templateEventType", "text", template?.eventType || "member_statement_ready")}
      <label class="field"><span>Channel</span><select id="templateChannel" class="select">
        ${["in_app", "sms", "email"].map((channel) => `<option value="${channel}" ${channel === (template?.channel || "in_app") ? "selected" : ""}>${titleCase(channel.replace(/_/g, " "))}</option>`).join("")}
      </select></label>
      <label class="field"><span>Status</span><select id="templateStatus" class="select">
        ${["active", "inactive"].map((status) => `<option value="${status}" ${status === (template?.status || "active") ? "selected" : ""}>${titleCase(status)}</option>`).join("")}
      </select></label>
      ${field("Title", "templateTitle", "text", template?.title || "Member statement ready")}
      <label class="field full"><span>Message body</span><textarea id="templateBody" class="input" rows="4">${template?.body || "Your SACCO statement is ready for review."}</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveNotificationTemplate" class="primary-button" type="button">Save template</button>`);

  document.getElementById("saveNotificationTemplate").addEventListener("click", async () => {
    try {
      const payload = {
        tenantId: apiState.user.tenantId === "tenant_platform" ? (value("templateTenant") || null) : apiState.user.tenantId,
        eventType: value("templateEventType"),
        channel: value("templateChannel"),
        status: value("templateStatus"),
        title: value("templateTitle"),
        body: value("templateBody")
      };
      await apiRequest(isEdit ? `/notification-templates/${template.id}` : "/notification-templates", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload)
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function toggleNotificationTemplate(templateId) {
  const template = apiState.notificationTemplates.find((item) => item.id === templateId);
  if (!template || !canManageNotificationTemplate(template)) return;
  try {
    await apiRequest(`/notification-templates/${template.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: template.status === "active" ? "inactive" : "active" })
    });
    await refreshApiStatus();
  } catch (error) {
    openModal("Template update failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

function openTransactionForm() {
  const apiMode = Boolean(apiState.user);
  const members = apiMode ? apiState.members.map(apiMemberToRow) : tenantScoped(state.members);
  if (!members.length) return;
  openModal("Post transaction", `
    <div class="form-grid">
      <label class="field full"><span>Member</span><select id="txMember" class="select">${members.map((member) => `<option value="${member.id}">${member.name}</option>`).join("")}</select></label>
      <label class="field"><span>Transaction type</span><select id="txType" class="select"><option>Savings Deposit</option><option>Share Purchase</option><option>Welfare Contribution</option><option>Withdrawal</option></select></label>
      <label class="field"><span>Channel</span><select id="txChannel" class="select"><option>Mobile Money</option><option>Cash</option><option>Bank</option><option>Payroll Deduction</option></select></label>
      ${field("Amount", "txAmount", "number", "50000")}
      ${field("Narration", "txNarration", "text", "Member payment")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveTx" class="primary-button" type="button">Submit for approval</button>`);

  document.getElementById("saveTx").addEventListener("click", async () => {
    if (apiMode) {
      const selectedMember = apiState.members.find((member) => member.id === value("txMember"));
      try {
        await apiRequest("/financial-transactions", {
          method: "POST",
          body: JSON.stringify({
            tenantId: currentApiTenantId(),
            memberId: value("txMember"),
            branchId: selectedMember?.branchId,
            type: value("txType").toLowerCase().replace(/\s+/g, "_"),
            channel: value("txChannel").toLowerCase().replace(/\s+/g, "_"),
            amount: Number(value("txAmount")),
            narration: value("txNarration")
          })
        });
        closeModal();
        state.currentView = "transactions";
        await refreshApiStatus();
      } catch (error) {
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
      }
      return;
    }

    const tenant = currentTenant();
    const count = state.transactions.filter((tx) => tx.tenantId === state.tenantId).length + 1;
    const ref = `${tenant.abbreviation}-TX-${String(count).padStart(4, "0")}`;
    const amount = Number(value("txAmount"));
    state.transactions.push({
      id: `tx-${Date.now()}`,
      tenantId: state.tenantId,
      memberId: value("txMember"),
      type: value("txType"),
      channel: value("txChannel"),
      amount,
      status: "Pending Approval",
      ref,
      date: "2026-07-15",
      maker: "Cashier",
      checker: ""
    });
    state.approvals.push({ id: `ap-${Date.now()}`, tenantId: state.tenantId, title: `Approve ${ref} ${value("txType")}`, type: "Financial Posting", status: "Pending", requester: "Cashier", risk: amount > 1000000 ? "High" : "Low" });
    addAudit(state.tenantId, "Cashier", `Submitted financial posting ${ref}`);
    saveState();
    closeModal();
    render();
  });
}

function openFinancialProductForm() {
  if (!apiState.user) return;
  openModal("New financial product", `
    <div class="form-grid">
      <label class="field"><span>Type</span><select id="productType" class="select"><option value="savings">Savings</option><option value="shares">Shares</option><option value="welfare">Welfare</option></select></label>
      ${field("Code", "productCode", "text", `PRD-${Date.now().toString().slice(-5)}`)}
      ${field("Name", "productName", "text", "Member product")}
      ${field("Contribution amount", "productContribution", "number", "10000")}
      ${field("Minimum balance", "productMinimum", "number", "0")}
      ${field("Interest rate %", "productRate", "number", "0")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveFinancialProduct" class="primary-button" type="button">Create product</button>`);

  document.getElementById("saveFinancialProduct").addEventListener("click", async () => {
    try {
      await apiRequest("/financial-products", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          productType: value("productType"),
          code: value("productCode"),
          name: value("productName"),
          contributionAmount: Number(value("productContribution")),
          minimumBalance: Number(value("productMinimum")),
          interestRate: Number(value("productRate"))
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openFinancialAccountForm() {
  if (!apiState.user) return;
  const activeMembers = apiState.members.map(apiMemberToRow).filter((member) => member.status === "Active");
  const products = apiState.financialProducts.filter((product) => product.status === "active");
  if (!activeMembers.length || !products.length) {
    openModal("Account setup unavailable", `<div class="notice error">At least one active member and one active financial product are required.</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    return;
  }
  openModal("Open financial account", `
    <div class="form-grid">
      <label class="field full"><span>Member</span><select id="accountMember" class="select">${activeMembers.map((member) => `<option value="${member.id}">${member.name} - ${member.no}</option>`).join("")}</select></label>
      <label class="field full"><span>Product</span><select id="accountProduct" class="select">${products.map((product) => `<option value="${product.id}" data-type="${product.productType}">${product.code} - ${product.name} (${apiProductTypeLabel(product.productType)})</option>`).join("")}</select></label>
      <label class="field"><span>Account type</span><select id="accountType" class="select"><option value="savings">Savings</option><option value="shares">Shares</option><option value="welfare">Welfare</option></select></label>
      ${field("Account no. (optional)", "accountNo", "text", "")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveFinancialAccount" class="primary-button" type="button">Open account</button>`);

  const syncType = () => {
    const option = document.getElementById("accountProduct").selectedOptions[0];
    document.getElementById("accountType").value = option?.dataset.type || "savings";
  };
  document.getElementById("accountProduct").addEventListener("change", syncType);
  syncType();

  document.getElementById("saveFinancialAccount").addEventListener("click", async () => {
    try {
      await apiRequest("/financial-accounts", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          memberId: value("accountMember"),
          productId: value("accountProduct"),
          accountType: value("accountType"),
          accountNo: value("accountNo") || null
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openWelfareClaimForm() {
  if (!apiState.user) return;
  const members = apiState.members.map(apiMemberToRow).filter((member) => member.status === "Active");
  if (!members.length) {
    openModal("No active members", `<div class="notice error">No active member is available for a welfare claim.</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    return;
  }
  openModal("New welfare claim", `
    <div class="form-grid">
      <label class="field full"><span>Member</span><select id="welfareMember" class="select">${members.map((member) => `<option value="${member.id}">${member.name} - ${member.no}</option>`).join("")}</select></label>
      <label class="field"><span>Claim type</span><select id="welfareClaimType" class="select"><option value="medical">Medical</option><option value="bereavement">Bereavement</option><option value="emergency">Emergency</option><option value="education">Education</option><option value="other">Other</option></select></label>
      ${field("Amount", "welfareAmount", "number", "50000")}
      ${field("Reference", "welfareReference", "text", `WCL-UI-${Date.now()}`)}
      <label class="field full"><span>Description</span><textarea id="welfareDescription" class="input" rows="3">Member welfare support request.</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveWelfareClaim" class="primary-button" type="button">Submit claim</button>`);

  document.getElementById("saveWelfareClaim").addEventListener("click", async () => {
    try {
      await apiRequest("/welfare-claims", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          memberId: value("welfareMember"),
          claimType: value("welfareClaimType"),
          amount: Number(value("welfareAmount")),
          reference: value("welfareReference"),
          description: value("welfareDescription")
        })
      });
      closeModal();
      state.currentView = "transactions";
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function openTransactionReceipt(transactionId) {
  try {
    const receipt = await apiRequest(`/financial-transactions/${transactionId}/receipt`);
    openModal("Transaction receipt", `
      <div class="grid metrics">
        ${metric("Receipt", receipt.receiptNo, receipt.reference)}
        ${metric("Member", receipt.memberName, receipt.membershipNo)}
        ${metric("Amount", money.format(receipt.amount), titleCase(receipt.transactionType.replace(/_/g, " ")))}
      </div>
      <div class="table-wrap" style="margin-top:16px">
        <table>
          <tbody>
            <tr><th>SACCO</th><td>${receipt.tenantName}</td></tr>
            <tr><th>Branch</th><td>${receipt.branchName}</td></tr>
            <tr><th>Channel</th><td>${titleCase(receipt.channel.replace(/_/g, " "))}</td></tr>
            <tr><th>Posted at</th><td>${receipt.postedAt || ""}</td></tr>
            <tr><th>Narration</th><td>${receipt.narration || ""}</td></tr>
          </tbody>
        </table>
      </div>
      <pre class="notice" style="white-space:pre-wrap;margin-top:16px">${receipt.printableText || ""}</pre>
    `, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  } catch (error) {
    openModal("Receipt unavailable", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

function openTransactionReversalForm(transactionId) {
  const transaction = apiState.financialTransactions.find((item) => item.id === transactionId);
  if (!transaction) return;
  openModal("Reverse transaction", `
    <div class="notice">This creates a posted reversal for ${transaction.reference}; the original transaction remains unchanged for audit history.</div>
    <label class="field full" style="margin-top:14px"><span>Reason</span><textarea id="reversalReason" class="input" rows="3">Duplicate or incorrect posting corrected by staff review.</textarea></label>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="confirmTransactionReversal" class="primary-button" type="button">Create reversal</button>`);

  document.getElementById("confirmTransactionReversal").addEventListener("click", async () => {
    try {
      await apiRequest(`/financial-transactions/${transactionId}/reversal`, {
        method: "POST",
        body: JSON.stringify({ reason: value("reversalReason") })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function openMemberStatement(memberId) {
  try {
    const statement = await apiRequest(`/members/${memberId}/statement`);
    openModal("Member statement", `
      <div class="grid metrics">
        ${metric("Member", statement.memberName, statement.membershipNo)}
        ${metric("Savings", money.format(statement.closingBalances.savings), "closing balance")}
        ${metric("Shares", money.format(statement.closingBalances.shares), "closing balance")}
        ${metric("Welfare", money.format(statement.closingBalances.welfare), "closing balance")}
      </div>
      <div class="table-wrap" style="margin-top:16px">
        <table>
          <thead><tr><th>Date</th><th>Reference</th><th>Type</th><th>Amount</th><th>Savings</th><th>Shares</th><th>Welfare</th></tr></thead>
          <tbody>
            ${statement.lines.map((line) => `
              <tr>
                <td>${line.postedAt?.slice(0, 10) || ""}</td>
                <td>${line.reference}${line.originalTransactionId ? `<br><small>Reversal</small>` : ""}</td>
                <td>${titleCase(line.type.replace(/_/g, " "))}</td>
                <td>${money.format(line.amount)}</td>
                <td>${money.format(line.savingsBalance)}</td>
                <td>${money.format(line.sharesBalance)}</td>
                <td>${money.format(line.welfareBalance)}</td>
              </tr>
            `).join("") || `<tr><td colspan="7">No posted movements found.</td></tr>`}
          </tbody>
        </table>
      </div>
      <details style="margin-top:16px"><summary>CSV export text</summary><pre class="notice" style="white-space:pre-wrap">${statement.csv || ""}</pre></details>
    `, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  } catch (error) {
    openModal("Statement unavailable", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function decideWelfareClaim(id, status) {
  try {
    await apiRequest(`/welfare-claims/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await refreshApiStatus();
  } catch (error) {
    openModal("Welfare decision failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

function rejectWelfareClaim(id) {
  openModal("Reject welfare claim", `
    <label class="field full"><span>Reason</span><textarea id="welfareRejectReason" class="input" rows="3">Rejected after welfare committee review.</textarea></label>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="confirmWelfareReject" class="primary-button" type="button">Reject claim</button>`);

  document.getElementById("confirmWelfareReject").addEventListener("click", async () => {
    try {
      await apiRequest(`/welfare-claims/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "rejected",
          reason: value("welfareRejectReason")
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openWelfareClaimPaymentForm(id) {
  const claim = apiState.welfareClaims.find((item) => item.id === id);
  if (!claim) return;
  openModal("Pay welfare claim", `
    <div class="notice">Pay ${money.format(claim.amount)} to ${claim.memberName || memberName(claim.memberId)} for ${claim.reference}.</div>
    <div class="form-grid" style="margin-top:14px">
      <label class="field"><span>Payment channel</span><select id="welfarePaymentChannel" class="select"><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile Money</option></select></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="confirmWelfarePayment" class="primary-button" type="button">Pay claim</button>`);

  document.getElementById("confirmWelfarePayment").addEventListener("click", async () => {
    try {
      await apiRequest(`/welfare-claims/${id}/payment`, {
        method: "POST",
        body: JSON.stringify({ channel: value("welfarePaymentChannel") })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openLoanForm() {
  const apiMode = Boolean(apiState.user);
  const members = apiMode ? apiState.members.map(apiMemberToRow).filter((member) => member.status === "Active") : tenantScoped(state.members);
  if (!members.length) return;
  openModal("Loan application", `
    <div class="form-grid">
      <label class="field full"><span>Applicant</span><select id="loanMember" class="select">${members.map((member) => `<option value="${member.id}">${member.name}</option>`).join("")}</select></label>
      <label class="field"><span>Loan product</span><select id="loanProduct" class="select"><option>Development Loan</option><option>Emergency Loan</option><option>Agriculture Loan</option><option>School Fees Loan</option></select></label>
      ${field("Requested amount", "loanAmount", "number", "1000000")}
      ${field("Repayment period months", "loanPeriod", "number", "12")}
      <label class="field full"><span>Purpose</span><textarea id="loanPurpose" class="textarea">Working capital</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveLoan" class="primary-button" type="button">Submit loan</button>`);

  document.getElementById("saveLoan").addEventListener("click", async () => {
    if (apiMode) {
      try {
        await apiRequest("/loans", {
          method: "POST",
          body: JSON.stringify({
            tenantId: currentApiTenantId(),
            memberId: value("loanMember"),
            product: value("loanProduct"),
            amount: Number(value("loanAmount")),
            repaymentMonths: Number(value("loanPeriod")),
            purpose: document.getElementById("loanPurpose").value.trim()
          })
        });
        closeModal();
        state.currentView = "loans";
        await refreshApiStatus();
      } catch (error) {
        document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
      }
      return;
    }

    const amount = Number(value("loanAmount"));
    const member = state.members.find((item) => item.id === value("loanMember"));
    const dsr = Math.min(65, Math.round((amount / Math.max(member.savings * 3, 1)) * 35));
    state.loans.push({
      id: `ln-${Date.now()}`,
      tenantId: state.tenantId,
      memberId: member.id,
      product: value("loanProduct"),
      amount,
      balance: 0,
      status: "Submitted",
      stage: "Credit Appraisal",
      guarantors: 0,
      dsr
    });
    state.approvals.push({ id: `ap-${Date.now()}`, tenantId: state.tenantId, title: `${value("loanProduct")} for ${member.name}`, type: "Loan Committee", status: "Pending", requester: "Credit Officer", risk: dsr > 40 ? "High" : "Medium" });
    addAudit(state.tenantId, "Credit Officer", `Submitted loan application for ${member.name}`);
    saveState();
    closeModal();
    state.currentView = "loans";
    render();
  });
}

function openGuarantorRequestForm(loanId) {
  const loan = apiState.loans.find((item) => item.id === loanId);
  if (!loan) return;
  const candidates = apiState.members
    .map(apiMemberToRow)
    .filter((member) => member.status === "Active" && member.id !== loan.memberId);
  if (!candidates.length) {
    openModal("No guarantor available", `<div class="notice error">No active member is available to guarantee this loan.</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    return;
  }
  openModal("Request guarantor", `
    <div class="form-grid">
      <label class="field full"><span>Guarantor</span><select id="guarantorMember" class="select">${candidates.map((member) => `<option value="${member.id}">${member.name} · ${member.no}</option>`).join("")}</select></label>
      ${field("Guaranteed amount", "guaranteedAmount", "number", String(Math.ceil(loan.amount / 2)))}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveGuarantorRequest" class="primary-button" type="button">Send request</button>`);

  document.getElementById("saveGuarantorRequest").addEventListener("click", async () => {
    try {
      await apiRequest(`/loans/${loanId}/guarantors`, {
        method: "POST",
        body: JSON.stringify({
          memberId: value("guarantorMember"),
          guaranteedAmount: Number(value("guaranteedAmount"))
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function decideGuarantorRequest(id, status) {
  try {
    await memberApiRequest(`/member-auth/guarantor-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await refreshMemberStatus();
  } catch (error) {
    openModal("Guarantee decision failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function decideLoan(id, status) {
  try {
    await apiRequest(`/loans/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reason: status === "rejected" ? "Rejected from loan queue" : ""
      })
    });
    await refreshApiStatus();
  } catch (error) {
    openModal("Loan decision failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function disburseLoan(id) {
  try {
    await apiRequest(`/loans/${id}/disburse`, { method: "POST" });
    await refreshApiStatus();
  } catch (error) {
    openModal("Loan disbursement failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function updateAccountingPeriodStatus(id, status) {
  try {
    await apiRequest(`/accounting-periods/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await refreshApiStatus();
  } catch (error) {
    openModal("Accounting period update failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

function openExpenseForm() {
  if (!apiState.user) return;
  const suppliers = apiState.suppliers;
  openModal("New expense", `
    <div class="form-grid">
      ${field("Reference", "expenseReference", "text", `EXP-UI-${Date.now()}`)}
      ${field("Amount", "expenseAmount", "number", "50000")}
      <label class="field"><span>Supplier</span><select id="expenseSupplier" class="select"><option value="">Direct expense</option>${suppliers.map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`).join("")}</select></label>
      <label class="field"><span>Account</span><select id="expenseAccount" class="select"><option value="5000">Operations Expense</option><option value="5010">Rent Expense</option><option value="5020">Utilities Expense</option><option value="5030">Staff Expense</option><option value="5040">Technology Expense</option></select></label>
      <label class="field"><span>Channel</span><select id="expenseChannel" class="select"><option value="bank">Bank</option><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="payroll_deduction">Payroll Deduction</option></select></label>
      ${field("Expense date", "expenseDate", "date", today.toISOString().slice(0, 10))}
      <label class="field full"><span>Description</span><textarea id="expenseDescription" class="input" rows="3">Operating expense posted from Reports.</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveExpense" class="primary-button" type="button">Post expense</button>`);

  document.getElementById("saveExpense").addEventListener("click", async () => {
    try {
      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          reference: value("expenseReference"),
          amount: Number(value("expenseAmount")),
          supplierId: value("expenseSupplier") || null,
          accountCode: value("expenseAccount"),
          channel: value("expenseChannel"),
          expenseDate: value("expenseDate"),
          description: value("expenseDescription")
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openAssetForm() {
  if (!apiState.user) return;
  openModal("New asset", `
    <div class="form-grid">
      ${field("Reference", "assetReference", "text", `AST-UI-${Date.now()}`)}
      ${field("Asset name", "assetName", "text", "Branch laptop")}
      <label class="field"><span>Category</span><select id="assetCategory" class="select"><option value="equipment">Equipment</option><option value="technology">Technology</option><option value="furniture">Furniture</option><option value="vehicle">Vehicle</option><option value="building">Building</option><option value="other">Other</option></select></label>
      ${field("Cost", "assetCost", "number", "1800000")}
      ${field("Useful life months", "assetLife", "number", "36")}
      ${field("Purchase date", "assetPurchaseDate", "date", today.toISOString().slice(0, 10))}
      <label class="field"><span>Channel</span><select id="assetChannel" class="select"><option value="bank">Bank</option><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="payroll_deduction">Payroll Deduction</option></select></label>
      ${field("Location", "assetLocation", "text", "Mukono Main")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveAsset" class="primary-button" type="button">Register asset</button>`);

  document.getElementById("saveAsset").addEventListener("click", async () => {
    try {
      await apiRequest("/assets", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          reference: value("assetReference"),
          name: value("assetName"),
          category: value("assetCategory"),
          cost: Number(value("assetCost")),
          usefulLifeMonths: Number(value("assetLife")),
          purchaseDate: value("assetPurchaseDate"),
          depreciationStartDate: value("assetPurchaseDate"),
          channel: value("assetChannel"),
          location: value("assetLocation")
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openGovernanceMeetingForm() {
  if (!apiState.user) return;
  openModal("New governance meeting", `
    <div class="form-grid">
      ${field("Title", "governanceMeetingTitle", "text", "Board risk review")}
      <label class="field"><span>Type</span><select id="governanceMeetingType" class="select"><option value="board">Board</option><option value="agm">AGM</option><option value="credit_committee">Credit Committee</option><option value="audit_committee">Audit Committee</option><option value="management">Management</option></select></label>
      ${field("Scheduled at", "governanceMeetingDate", "date", today.toISOString().slice(0, 10))}
      <label class="field full"><span>Minutes or agenda</span><textarea id="governanceMeetingMinutes" class="input" rows="3">Review portfolio, reconciliation exceptions, and open complaints.</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveGovernanceMeeting" class="primary-button" type="button">Save meeting</button>`);

  document.getElementById("saveGovernanceMeeting").addEventListener("click", async () => {
    try {
      await apiRequest("/governance-meetings", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          title: value("governanceMeetingTitle"),
          meetingType: value("governanceMeetingType"),
          scheduledAt: `${value("governanceMeetingDate")}T09:00:00.000Z`,
          minutes: value("governanceMeetingMinutes")
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openComplaintForm() {
  if (!apiState.user) return;
  const activeMembers = apiState.members.map(apiMemberToRow).filter((member) => member.status === "Active");
  openModal("New complaint", `
    <div class="form-grid">
      ${field("Subject", "complaintSubject", "text", "Member service follow-up")}
      <label class="field"><span>Category</span><select id="complaintCategory" class="select"><option value="statement">Statement</option><option value="loan">Loan</option><option value="savings">Savings</option><option value="shares">Shares</option><option value="service">Service</option><option value="other">Other</option></select></label>
      <label class="field"><span>Priority</span><select id="complaintPriority" class="select"><option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option></select></label>
      <label class="field"><span>Member</span><select id="complaintMember" class="select"><option value="">No member linked</option>${activeMembers.map((member) => `<option value="${member.id}">${member.name} · ${member.no}</option>`).join("")}</select></label>
      <label class="field full"><span>Description</span><textarea id="complaintDescription" class="input" rows="3">Complaint captured for governance follow-up.</textarea></label>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveComplaint" class="primary-button" type="button">Save complaint</button>`);

  document.getElementById("saveComplaint").addEventListener("click", async () => {
    try {
      await apiRequest("/complaints", {
        method: "POST",
        body: JSON.stringify({
          tenantId: apiState.user.tenantId === "tenant_platform" ? currentApiTenantId() : apiState.user.tenantId,
          subject: value("complaintSubject"),
          category: value("complaintCategory"),
          priority: value("complaintPriority"),
          memberId: value("complaintMember") || null,
          description: value("complaintDescription")
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openLoanRepaymentForm(loanId) {
  const loan = apiState.loans.find((item) => item.id === loanId);
  if (!loan) return;
  const defaultAmount = Math.min(50000, loan.balance);
  openModal("Record loan repayment", `
    <div class="form-grid">
      <label class="field full"><span>Loan</span><input class="input" value="${memberName(loan.memberId)} - ${loan.product}" disabled></label>
      ${field("Amount", "repaymentAmount", "number", String(defaultAmount))}
      <label class="field"><span>Channel</span><select id="repaymentChannel" class="select"><option value="mobile_money">Mobile Money</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll Deduction</option></select></label>
      ${field("External reference", "repaymentReference", "text", `UI-LRP-${Date.now()}`)}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="saveLoanRepayment" class="primary-button" type="button">Post repayment</button>`);

  document.getElementById("saveLoanRepayment").addEventListener("click", async () => {
    try {
      await apiRequest(`/loans/${loanId}/repayments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(value("repaymentAmount")),
          channel: value("repaymentChannel"),
          externalReference: value("repaymentReference")
        })
      });
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function recordSubscriptionPayment() {
  if (apiState.user?.tenantId === "tenant_platform") {
    const pending = apiState.subscriptions.find((sub) => sub.status !== "active") || apiState.subscriptions[0];
    if (!pending) return;
    try {
      await apiRequest(`/subscriptions/${pending.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Math.max(1, pending.amount - pending.paid),
          channel: "manual",
          externalReference: `UI-PAY-${Date.now()}`
        })
      });
      await refreshApiStatus();
    } catch (error) {
      openModal("Payment failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    }
    return;
  }

  const pending = state.subscriptions.find((sub) => sub.status !== "Active") || state.subscriptions[0];
  const billing = subscriptionBillingDetails(pending);
  pending.memberCount = billing.memberCount;
  pending.billableMembers = billing.billableMembers;
  pending.unitPrice = billing.unitPrice;
  pending.amount = billing.amount;
  pending.paid = billing.amount;
  pending.status = "Active";
  pending.expiry = "2027-07-15";
  addAudit("platform", "Finance Officer", `Recorded subscription payment ${pending.invoice}`);
  saveState();
  render();
}

async function approveTenant(id) {
  if (apiState.user?.tenantId === "tenant_platform" && id.startsWith("tenant_")) {
    try {
      await apiRequest(`/tenants/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" })
      });
      await refreshApiStatus();
    } catch (error) {
      openModal("Approval failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    }
    return;
  }

  const tenant = state.tenants.find((item) => item.id === id);
  if (!tenant) return;
  tenant.status = "Approved";
  tenant.onboarding = Math.max(tenant.onboarding, 55);
  addAudit("platform", "Platform Admin", `Approved SACCO tenant ${tenant.name}`);
  saveState();
  render();
}

async function resolveApproval(id, outcome) {
  const apiTransaction = apiState.financialTransactions.find((transaction) => transaction.id === id);
  if (apiState.user && apiTransaction) {
    try {
      await apiRequest(`/financial-transactions/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: outcome === "Approved" ? "posted" : "rejected",
          reason: outcome === "Rejected" ? "Rejected from approval queue" : ""
        })
      });
      await refreshApiStatus();
    } catch (error) {
      openModal("Approval failed", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
    }
    return;
  }

  const approval = state.approvals.find((item) => item.id === id);
  if (!approval) return;
  approval.status = outcome;
  addAudit(approval.tenantId, "Approver", `${outcome} approval: ${approval.title}`);

  if (outcome === "Approved" && approval.type === "Financial Posting") {
    const ref = approval.title.match(/(\w+-TX-\d+)/)?.[1];
    const tx = state.transactions.find((item) => item.ref === ref);
    if (tx) {
      tx.status = "Posted";
      tx.checker = "Approver";
      const member = state.members.find((item) => item.id === tx.memberId);
      if (member && tx.type.includes("Savings")) member.savings += tx.amount;
      if (member && tx.type.includes("Share")) member.shares += tx.amount;
      if (member && tx.type.includes("Welfare")) member.welfare += tx.amount;
      if (member && tx.type === "Withdrawal") member.savings -= tx.amount;
    }
  }

  state.approvals = state.approvals.filter((item) => item.id !== id);
  saveState();
  render();
}

function addAudit(tenantId, actor, action) {
  state.audit.unshift({
    at: "2026-07-15 12:00",
    tenantId,
    actor,
    action
  });
}

function field(label, id, type, val) {
  return `<label class="field"><span>${label}</span><input id="${id}" class="input" type="${type}" value="${val}"></label>`;
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function selectedValues(id) {
  return Array.from(document.getElementById(id).selectedOptions).map((option) => option.value);
}

init();
