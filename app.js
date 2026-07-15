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
  auditEvents: [],
  message: "Checking backend connection..."
};
let memberApiState = {
  token: localStorage.getItem(MEMBER_SESSION_KEY) || "",
  member: null,
  tenant: null,
  branch: null,
  balances: null,
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
  const loans = tenantScoped(state.loans);
  return `
    <section class="card">
      <div class="toolbar">
        <div>
          <h2>Loan files</h2>
          <p class="eyebrow">Applications, appraisal, guarantors and portfolio risk</p>
        </div>
        <button class="primary-button" data-action="newLoan" type="button">New loan application</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Applicant</th><th>Product</th><th>Amount</th><th>Balance</th><th>Stage</th><th>Guarantors</th><th>DSR</th><th>Status</th></tr></thead>
          <tbody>
            ${loans.map((loan) => `
              <tr>
                <td>${memberName(loan.memberId)}</td>
                <td>${loan.product}</td>
                <td>${money.format(loan.amount)}</td>
                <td>${money.format(loan.balance)}</td>
                <td>${loan.stage}</td>
                <td>${loan.guarantors}</td>
                <td>${loan.dsr}%</td>
                <td><span class="status ${statusClass(loan.status)}">${loan.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
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

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const actions = {
        newTenant: openTenantForm,
        newMember: openMemberForm,
        newTransaction: openTransactionForm,
        newLoan: openLoanForm,
        recordSubscriptionPayment: recordSubscriptionPayment,
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
    const session = await memberApiRequest("/member-auth/me");
    memberApiState.member = session.member;
    memberApiState.tenant = session.tenant;
    memberApiState.branch = session.branch;
    memberApiState.balances = session.balances;
    memberApiState.message = `Member portal signed in as ${session.member.fullName}.`;
  } catch (error) {
    localStorage.removeItem(MEMBER_SESSION_KEY);
    memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, message: error.message };
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
      const [tenants, users, auditEvents, branches, members, subscriptionPackages, subscriptions, financialTransactions] = await Promise.all([
        apiRequest("/tenants"),
        apiRequest("/users"),
        apiRequest("/audit-events"),
        apiRequest(`/branches${apiTenantQuery()}`),
        apiRequest(`/members${apiTenantQuery()}`),
        apiRequest("/subscription-packages"),
        apiRequest(`/subscriptions${apiSubscriptionQuery()}`),
        apiRequest(`/financial-transactions${apiTenantQuery()}`)
      ]);
      apiState.tenants = tenants;
      apiState.users = users;
      apiState.auditEvents = auditEvents;
      apiState.branches = branches;
      apiState.members = members;
      apiState.subscriptionPackages = subscriptionPackages;
      apiState.subscriptions = subscriptions;
      apiState.financialTransactions = financialTransactions;
      apiState.message = `Connected as ${session.user.fullName}. API returned ${tenants.length} tenant(s), ${users.length} user(s), ${branches.length} branch(es), ${members.length} member(s), ${subscriptions.length} subscription(s), ${financialTransactions.length} transaction(s), and ${auditEvents.length} audit event(s).`;
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
  if (["dashboard", "reports", "members", "registrations", "subscriptions", "transactions", "approvals"].includes(state.currentView)) render();
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
  apiState = { ...apiState, token: "", user: null, tenants: [], users: [], branches: [], members: [], subscriptionPackages: [], subscriptions: [], financialTransactions: [], auditEvents: [], message: "Logged out of API session." };
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
  memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, message: "Logged out of member portal." };
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
  const members = tenantScoped(state.members);
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

  document.getElementById("saveLoan").addEventListener("click", () => {
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
