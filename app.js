const STORAGE_KEY = "sacco-platform-demo-v1";
const API_SESSION_KEY = "sacco-platform-api-session-v1";
const MEMBER_SESSION_KEY = "sacco-platform-member-session-v1";
const API_BASE = "/api/v1";

const navItems = [
  ["dashboard", "Dashboard", "overview"],
  ["registrations", "SACCO Registration", "tenants"],
  ["subscriptions", "Subscriptions", "billing"],
  ["members", "Members", "kyc"],
  ["transactions", "Transactions", "finance"],
  ["loans", "Loans", "credit"],
  ["approvals", "Approvals", "workflow"],
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
let apiState = {
  health: "checking",
  user: null,
  token: localStorage.getItem(API_SESSION_KEY) || "",
  tenants: [],
  users: [],
  branches: [],
  members: [],
  subscriptionPackages: [],
  subscriptions: [],
  financialTransactions: [],
  loans: [],
  accountingPeriods: [],
  chartOfAccounts: [],
  journalEntries: [],
  statementLines: [],
  reconciliation: null,
  regulatoryReport: null,
  governanceMeetings: [],
  complaints: [],
  auditEvents: [],
  message: "Checking backend connection..."
};
let memberApiState = {
  token: localStorage.getItem(MEMBER_SESSION_KEY) || "",
  member: null,
  tenant: null,
  branch: null,
  balances: null,
  guarantorRequests: [],
  message: "Member portal not signed in."
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(seedData);
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
    savings: 0,
    shares: 0,
    welfare: 0,
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
    reports: renderReports,
    memberPortal: renderMemberPortal
  };

  document.getElementById("app").innerHTML = routes[state.currentView]();
  bindViewActions();
}

function renderDashboard() {
  const tenant = currentTenant();
  const members = tenantScoped(state.members);
  const transactions = tenantScoped(state.transactions);
  const loans = tenantScoped(state.loans);
  const approvals = tenantScoped(state.approvals).filter((item) => item.status === "Pending");
  const deposits = transactions.filter((tx) => tx.status === "Posted").reduce((sum, tx) => sum + tx.amount, 0);
  const portfolio = loans.reduce((sum, loan) => sum + loan.balance, 0);

  return `
    <div class="grid metrics">
      ${metric("Registered members", members.length, `${members.filter((m) => m.status === "Active").length} active`)}
      ${metric("Posted collections", money.format(deposits), "tenant-filtered")}
      ${metric("Loan portfolio", money.format(portfolio), `${loans.filter((l) => l.status !== "Closed").length} loan files`)}
      ${metric("Pending approvals", approvals.length, "maker-checker controls")}
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
          ${alertItem("Licence monitoring", daysTo(tenant.licenseExpiry) < 90 ? "Expiry attention needed" : "Valid", daysTo(tenant.licenseExpiry) < 90 ? "overdue" : "active")}
          ${alertItem("Tenant isolation", "All tables are filtered by tenant in this demo", "active")}
          ${alertItem("Idempotency", "Payment and posting references are unique", "active")}
          ${alertItem("Audit events", `${state.audit.length} sensitive actions captured`, "trial")}
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
        ${miniFact("API tenants", String(apiState.tenants.length))}
        ${miniFact("API members", String(apiState.members.length))}
      </div>
      <p class="muted">${apiState.message}</p>
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
  return `
    <section class="card">
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
                <td>
                  ${apiState.user && !canCreateOnApi ? "" : `<button class="secondary-button" data-approve-tenant="${tenant.id}" type="button">Approve</button>`}
                </td>
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
  return `
    <div class="grid three">
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
        ${useApiSubscriptions() && !canRecordApiPayment ? "" : `<button class="primary-button" data-action="recordSubscriptionPayment" type="button">Record payment</button>`}
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
  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>Member register</h2>
          <p class="eyebrow">${source} · KYC, status, balances and branch access</p>
        </div>
        <div class="filters">
          <input class="input" id="memberSearch" placeholder="Search members">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button">Refresh API</button>` : ""}
          <button class="primary-button" data-action="newMember" type="button">Register member</button>
        </div>
      </div>
      ${apiState.user ? `<div class="notice">Members shown from the backend for ${apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant"}.</div>` : `<div class="notice">Login to the API to use server-side member onboarding. The table below is still using local demo data.</div>`}
      <div class="table-wrap">
        <table id="membersTable">
          <thead><tr><th>Member</th><th>Type</th><th>Branch</th><th>KYC</th><th>Savings</th><th>Shares</th><th>Welfare</th><th>Status</th></tr></thead>
          <tbody>
            ${members.map(memberRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTransactions() {
  const transactions = useApiTransactions() ? apiState.financialTransactions.map(apiTransactionToRow) : tenantScoped(state.transactions);
  const source = useApiTransactions() ? "API-backed" : "Local demo";
  return `
    <section class="card">
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
          <thead><tr><th>Reference</th><th>Member</th><th>Type</th><th>Channel</th><th>Amount</th><th>Maker</th><th>Checker</th><th>Status</th></tr></thead>
          <tbody>
            ${transactions.map((tx) => `
              <tr>
                <td>${tx.ref}${tx.source ? `<br><small>${tx.source}</small>` : `<br><small>${tx.date}</small>`}</td>
                <td>${memberName(tx.memberId)}</td>
                <td>${tx.type}</td>
                <td>${tx.channel}</td>
                <td>${money.format(tx.amount)}</td>
                <td>${tx.maker}</td>
                <td>${tx.checker || "Pending"}</td>
                <td><span class="status ${statusClass(tx.status)}">${tx.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderLoans() {
  const loans = useApiLoans() ? apiState.loans.map(apiLoanToRow) : tenantScoped(state.loans);
  const source = useApiLoans() ? "API-backed" : "Local demo";
  return `
    <section class="card">
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
                <td>${loan.dsr}%</td>
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
    ${canDecide ? `<button class="secondary-button" data-loan-reject="${loan.id}" type="button">Reject</button><button class="primary-button" data-loan-approve="${loan.id}" type="button">Approve</button>` : ""}
    ${canDisburse ? `<button class="primary-button" data-loan-disburse="${loan.id}" type="button">Disburse</button>` : ""}
    ${canRepay ? `<button class="primary-button" data-loan-repay="${loan.id}" type="button">Record repayment</button>` : ""}
    <button class="secondary-button" data-request-guarantor="${loan.id}" type="button">Request guarantor</button>
  `;
}

function renderApprovals() {
  const approvals = apiState.user ? apiTransactionApprovalItems() : tenantScoped(state.approvals);
  const source = apiState.user ? "API-backed" : "Local demo";
  return `
    <section class="card">
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
            <span>
              <button class="secondary-button" data-reject="${approval.id}" type="button">Reject</button>
              <button class="primary-button" data-approve="${approval.id}" type="button">Approve</button>
            </span>
          </li>
        `).join("") || `<li><span>No pending approvals for this tenant.</span><span class="status active">Clear</span></li>`}
      </ul>
    </section>
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

function renderApiReports() {
  const journals = apiState.journalEntries;
  const periods = apiState.accountingPeriods;
  const accounts = apiState.chartOfAccounts;
  const reconciliation = apiState.reconciliation || { summary: {}, unmatchedStatementLines: [], unmatchedLedgerLines: [] };
  const regulatoryReport = apiState.regulatoryReport || { reports: [], consolidated: {}, csv: "" };
  const meetings = apiState.governanceMeetings;
  const complaints = apiState.complaints;
  const debitTotal = journals.reduce((sum, entry) => sum + entry.debitTotal, 0);
  const creditTotal = journals.reduce((sum, entry) => sum + entry.creditTotal, 0);
  const unbalanced = journals.filter((entry) => !entry.isBalanced).length;
  const cashPosition = journals.reduce((sum, entry) => {
    return sum + entry.lines
      .filter((line) => ["1000", "1010", "1020", "1030"].includes(line.accountCode))
      .reduce((lineSum, line) => lineSum + line.debit - line.credit, 0);
  }, 0);
  const tenantLabel = apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant";

  return `
    <div class="grid metrics">
      ${metric("Journal entries", journals.length, `${unbalanced} unbalanced`)}
      ${metric("Debits", money.format(debitTotal), "derived from posted events")}
      ${metric("Credits", money.format(creditTotal), "must equal debits")}
      ${metric("Cash position", money.format(cashPosition), "cash, bank, mobile money, payroll")}
    </div>
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
    return `
      <div class="toolbar">
        <div>
          <h2>${member.fullName}</h2>
          <p class="eyebrow">${member.membershipNo} · ${memberApiState.tenant?.name || tenantName(member.tenantId)}</p>
        </div>
        <button class="secondary-button" data-action="memberLogout" type="button">Logout member</button>
      </div>
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

  document.querySelectorAll("[data-period-status]").forEach((button) => {
    button.addEventListener("click", () => updateAccountingPeriodStatus(button.dataset.periodStatus, button.dataset.periodNext));
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
        newLoan: openLoanForm,
        recordSubscriptionPayment: recordSubscriptionPayment,
        newGovernanceMeeting: openGovernanceMeetingForm,
        newComplaint: openComplaintForm,
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
    const [session, guarantorRequests] = await Promise.all([
      memberApiRequest("/member-auth/me"),
      memberApiRequest("/member-auth/guarantor-requests")
    ]);
    memberApiState.member = session.member;
    memberApiState.tenant = session.tenant;
    memberApiState.branch = session.branch;
    memberApiState.balances = session.balances;
    memberApiState.guarantorRequests = guarantorRequests;
    memberApiState.message = `Member portal signed in as ${session.member.fullName}.`;
  } catch (error) {
    localStorage.removeItem(MEMBER_SESSION_KEY);
    memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, guarantorRequests: [], message: error.message };
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
      const [tenants, users, auditEvents, branches, members, subscriptionPackages, subscriptions, financialTransactions, loans, accountingPeriods, chartOfAccounts, journalEntries, statementLines, reconciliation, regulatoryReport, governanceMeetings, complaints] = await Promise.all([
        apiRequest("/tenants"),
        apiRequest("/users"),
        apiRequest("/audit-events"),
        apiRequest(`/branches${apiTenantQuery()}`),
        apiRequest(`/members${apiTenantQuery()}`),
        apiRequest("/subscription-packages"),
        apiRequest(`/subscriptions${apiSubscriptionQuery()}`),
        apiRequest(`/financial-transactions${apiTenantQuery()}`),
        apiRequest(`/loans${apiTenantQuery()}`),
        apiRequest(`/accounting-periods${apiTenantQuery()}`),
        apiRequest("/chart-of-accounts"),
        apiRequest(`/journal-entries${apiTenantQuery()}`),
        apiRequest(`/statement-lines${apiTenantQuery()}`),
        apiRequest(`/reconciliation${apiTenantQuery()}`),
        apiRequest(`/regulatory-report${apiTenantQuery()}`),
        apiRequest(`/governance-meetings${apiTenantQuery()}`),
        apiRequest(`/complaints${apiTenantQuery()}`)
      ]);
      apiState.tenants = tenants;
      apiState.users = users;
      apiState.auditEvents = auditEvents;
      apiState.branches = branches;
      apiState.members = members;
      apiState.subscriptionPackages = subscriptionPackages;
      apiState.subscriptions = subscriptions;
      apiState.financialTransactions = financialTransactions;
      apiState.loans = loans;
      apiState.accountingPeriods = accountingPeriods;
      apiState.chartOfAccounts = chartOfAccounts;
      apiState.journalEntries = journalEntries;
      apiState.statementLines = statementLines;
      apiState.reconciliation = reconciliation;
      apiState.regulatoryReport = regulatoryReport;
      apiState.governanceMeetings = governanceMeetings;
      apiState.complaints = complaints;
      apiState.message = `Connected as ${session.user.fullName}. API returned ${tenants.length} tenant(s), ${users.length} user(s), ${branches.length} branch(es), ${members.length} member(s), ${subscriptions.length} subscription(s), ${financialTransactions.length} transaction(s), ${loans.length} loan(s), ${accountingPeriods.length} accounting period(s), ${journalEntries.length} journal(s), ${statementLines.length} statement line(s), ${regulatoryReport.reports.length} report row(s), ${governanceMeetings.length} meeting(s), ${complaints.length} complaint(s), and ${auditEvents.length} audit event(s).`;
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
  if (["dashboard", "reports", "members", "registrations", "subscriptions", "transactions", "approvals", "loans"].includes(state.currentView)) render();
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
      memberApiState.guarantorRequests = [];
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

async function apiLogout() {
  try {
    if (apiState.token) await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Local logout should still clear the client session if the server has restarted.
  }
  localStorage.removeItem(API_SESSION_KEY);
  apiState = { ...apiState, token: "", user: null, tenants: [], users: [], branches: [], members: [], subscriptionPackages: [], subscriptions: [], financialTransactions: [], loans: [], accountingPeriods: [], chartOfAccounts: [], journalEntries: [], statementLines: [], reconciliation: null, regulatoryReport: null, governanceMeetings: [], complaints: [], auditEvents: [], message: "Logged out of API session." };
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
  memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, guarantorRequests: [], message: "Logged out of member portal." };
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
          tenantId: apiState.user.tenantId === "tenant_platform" ? apiTenantId() : apiState.user.tenantId,
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
          tenantId: apiState.user.tenantId === "tenant_platform" ? apiTenantId() : apiState.user.tenantId,
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

init();
