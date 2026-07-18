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
  ["reports", "Reports", "audit"],
  ["memberPortal", "Member Portal", "self-service"]
];

const workspaceProfiles = {
  platformAdmin: {
    label: "Platform administration",
    session: "Platform Administrator",
    tenantLocked: false,
    defaultView: "dashboard",
    nav: ["dashboard", "registrations", "subscriptions", "members", "transactions", "loans", "approvals", "operations", "reports"]
  },
  saccoAdmin: {
    label: "SACCO administrator",
    session: "SACCO Administrator",
    tenantLocked: true,
    defaultView: "dashboard",
    nav: ["dashboard", "members", "transactions", "loans", "approvals", "operations", "reports"]
  },
  treasurer: {
    label: "Treasurer",
    session: "SACCO Treasurer",
    tenantLocked: true,
    defaultView: "transactions",
    nav: ["dashboard", "transactions", "approvals", "reports", "operations"]
  },
  secretary: {
    label: "Secretary",
    session: "SACCO Secretary",
    tenantLocked: true,
    defaultView: "members",
    nav: ["dashboard", "members", "approvals", "reports"]
  },
  chairperson: {
    label: "Chairperson",
    session: "SACCO Chairperson",
    tenantLocked: true,
    defaultView: "dashboard",
    nav: ["dashboard", "loans", "approvals", "reports", "operations"]
  },
  member: {
    label: "Member view",
    session: "Member Self-Service",
    tenantLocked: true,
    defaultView: "memberPortal",
    nav: ["memberPortal"]
  }
};

const navPermissions = {
  registrations: "tenants:view",
  members: "members:view",
  transactions: "transactions:view",
  loans: "loans:view",
  approvals: "approvals:view",
  operations: "operations:view",
  reports: "reports:view"
};

const demoAccounts = [
  { label: "Platform admin", code: "PLATFORM", username: "admin@platform.local", password: "Admin@12345", note: "Platform administration" },
  { label: "SACCO admin", code: "GVS", username: "admin@greenvalley.local", password: "Sacco@12345", note: "Green Valley administrator" },
  { label: "Treasurer", code: "GVS", username: "treasurer@greenvalley.local", password: "Treasurer@12345", note: "Finance and approvals" },
  { label: "Secretary", code: "GVS", username: "secretary@greenvalley.local", password: "Secretary@12345", note: "Members and governance" },
  { label: "Chairperson", code: "GVS", username: "chairperson@greenvalley.local", password: "Chair@12345", note: "Oversight and decisions" },
  { label: "Member", code: "GVS", username: "GVS-0001", password: "Member@12345", note: "Member portal" }
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
  workspace: "platformAdmin",
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
  roleIds: [],
  roleNames: [],
  permissionIds: [],
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
  loading: false,
  lastSyncedAt: "",
  lastError: "",
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
  loading: false,
  lastSyncedAt: "",
  lastError: "",
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

function currentWorkspace() {
  return workspaceProfiles[state.workspace] || workspaceProfiles.platformAdmin;
}

function visibleNavItems() {
  const allowed = new Set(currentWorkspace().nav);
  const permissions = new Set(apiState.permissionIds || []);
  return navItems.filter(([id]) => {
    if (!allowed.has(id)) return false;
    if (!apiState.user || permissions.size === 0) return true;
    const required = navPermissions[id];
    return !required || permissions.has(required);
  });
}

function ensureWorkspaceTenant() {
  const workspace = currentWorkspace();
  if (workspace.tenantLocked && state.tenantId === "platform") {
    state.tenantId = state.tenants.find((tenant) => tenant.id !== "platform")?.id || "platform";
  }
  if (!workspace.nav.includes(state.currentView)) {
    state.currentView = workspace.defaultView;
  }
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
    members: pkg.memberLimit ?? pkg.members,
    minMembers: pkg.minMembers || MINIMUM_BILLABLE_MEMBERS,
    tierLabel: pkg.tierLabel,
    users: pkg.userLimit ?? pkg.users,
    branches: pkg.branchLimit ?? pkg.branches,
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

function formatSyncTime(value) {
  if (!value) return "Not synced";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function apiSyncState() {
  if (apiState.loading) return "Refreshing";
  if (apiState.lastError) return "Needs attention";
  if (apiState.user) return "Java-backed";
  if (apiState.health === "online") return "API reachable";
  return "Demo mode";
}

function apiSyncNotice(context) {
  if (apiState.loading) {
    return `<div class="notice info">${context} is refreshing from the Java API. Current figures will update when the sync finishes.</div>`;
  }
  if (apiState.lastError) {
    return `<div class="notice error">${context} could not refresh from the backend: ${apiState.lastError}</div>`;
  }
  if (apiState.user) {
    return `<div class="notice success">${context} is using Java-backed data for ${apiState.user.tenantId === "tenant_platform" ? tenantName(state.tenantId) : "your SACCO tenant"}. Last sync: ${formatSyncTime(apiState.lastSyncedAt)}.</div>`;
  }
  return `<div class="notice">${context} is showing local demo data. Login to the API to switch this screen to Java-backed records.</div>`;
}

function refreshApiButton(label = "Refresh API") {
  return `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : label}</button>`;
}

function memberSyncState() {
  if (memberApiState.loading) return "Refreshing";
  if (memberApiState.lastError) return "Needs attention";
  if (memberApiState.member) return "Member API";
  if (memberApiState.token) return "Re-auth needed";
  return "Demo mode";
}

function memberSyncNotice(context) {
  if (memberApiState.loading) {
    return `<div class="notice info">${context} is refreshing from the member API. Balances and requests will update when the sync finishes.</div>`;
  }
  if (memberApiState.lastError) {
    return `<div class="notice error">${context} could not refresh from the member API: ${memberApiState.lastError}</div>`;
  }
  if (memberApiState.member) {
    return `<div class="notice success">${context} is using member-authenticated Java API data. Last sync: ${formatSyncTime(memberApiState.lastSyncedAt)}.</div>`;
  }
  return `<div class="notice">${context} is showing local demo data. Member login switches balances, loans, notifications, and guarantee requests to the Java API.</div>`;
}

function memberRefreshButton(label = "Refresh member data") {
  return `<button class="secondary-button" data-action="refreshMember" type="button" ${memberApiState.loading ? "disabled" : ""}>${memberApiState.loading ? "Refreshing..." : label}</button>`;
}

function isAuthenticated() {
  return Boolean(apiState.user || memberApiState.member);
}

function workspaceForStaff(user, roleNames = [], permissionIds = []) {
  if (user?.tenantId === "tenant_platform") return "platformAdmin";
  const roles = roleNames.join(" ").toLowerCase();
  const permissions = new Set(permissionIds);
  if (roles.includes("administrator")) return "saccoAdmin";
  if (roles.includes("treasurer") || permissions.has("accounting:post") || permissions.has("transactions:approve")) return "treasurer";
  if (roles.includes("secretary") || permissions.has("members:approve")) return "secretary";
  if (roles.includes("chairperson") || permissions.has("loans:approve") || permissions.has("approvals:decide")) return "chairperson";
  return "saccoAdmin";
}

function init() {
  renderTenantSelect();
  renderWorkspaceSelect();
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
  select.onchange = () => {
    state.tenantId = select.value;
    saveState();
    render();
    if (apiState.user?.tenantId === "tenant_platform") refreshApiStatus();
  };
}

function renderWorkspaceSelect() {
  const select = document.getElementById("workspaceSelect");
  select.innerHTML = Object.entries(workspaceProfiles).map(([id, profile]) => `<option value="${id}">${profile.label}</option>`).join("");
  select.value = state.workspace || "platformAdmin";
  select.onchange = () => {
    state.workspace = select.value;
    ensureWorkspaceTenant();
    renderTenantSelect();
    renderNav();
    saveState();
    render();
    if (apiState.user) refreshApiStatus();
  };
}

function renderNav() {
  ensureWorkspaceTenant();
  const nav = document.getElementById("nav");
  nav.innerHTML = visibleNavItems().map(([id, label, hint]) => `
    <button class="nav-item" type="button" data-view="${id}">
      <span>${label}</span>
      <small>${hint}</small>
    </button>
  `).join("");

  nav.onclick = (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    state.currentView = button.dataset.view;
    saveState();
    render();
  };
}

function bindGlobalActions() {
  document.getElementById("resetDemo").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = structuredClone(seedData);
    renderTenantSelect();
    render();
  });

  document.getElementById("newMemberBtn").addEventListener("click", openMemberForm);
  document.getElementById("globalSearchBtn").addEventListener("click", openGlobalSearch);
  document.getElementById("memberPortalBtn").addEventListener("click", () => {
    if (!memberApiState.member) {
      openMemberLoginForm();
      return;
    }
    state.workspace = "member";
    ensureWorkspaceTenant();
    state.currentView = "memberPortal";
    saveState();
    render();
  });
  document.getElementById("apiLoginBtn").addEventListener("click", openApiLoginForm);
  document.getElementById("apiLogoutBtn").addEventListener("click", apiLogout);
}

function render() {
  if (!isAuthenticated()) {
    renderLoginScreen();
    return;
  }
  setLoginMode(false);
  ensureWorkspaceTenant();
  renderNav();
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
  });

  document.getElementById("tenantSelect").value = state.tenantId;
  document.getElementById("workspaceSelect").value = state.workspace || "platformAdmin";
  document.getElementById("sessionRole").textContent = currentWorkspace().session;
  document.getElementById("newMemberBtn").hidden = !currentWorkspace().nav.includes("members");
  document.getElementById("globalSearchBtn").hidden = false;
  document.getElementById("memberPortalBtn").hidden = false;
  renderApiChrome();
  renderShellStatus();

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

function setLoginMode(enabled) {
  document.querySelector(".app-shell")?.classList.toggle("login-mode", enabled);
}

function renderLoginScreen() {
  setLoginMode(true);
  renderApiChrome();
  document.getElementById("sessionRole").textContent = "Signed out";
  document.getElementById("tenantSelect").value = state.tenantId;
  document.getElementById("workspaceSelect").value = state.workspace || "platformAdmin";
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  document.getElementById("sectionKicker").textContent = "Welcome";
  document.getElementById("pageTitle").textContent = "Login to Tereka Online";
  document.getElementById("apiLoginBtn").hidden = true;
  document.getElementById("apiLogoutBtn").hidden = true;
  document.getElementById("globalSearchBtn").hidden = true;
  document.getElementById("memberPortalBtn").hidden = true;
  document.getElementById("newMemberBtn").hidden = true;
  document.getElementById("shellStatus").innerHTML = "";
  document.getElementById("app").innerHTML = `
    <section class="login-screen">
      <div class="login-brand">
        <div class="brand-mark login-logo" aria-hidden="true">
          <svg viewBox="0 0 48 48" role="img">
            <path d="M8 10h32v7H27v21h-7V17H8z"></path>
            <path d="M31 21h9v17H31z"></path>
          </svg>
        </div>
        <div>
          <h2>Tereka Online</h2>
          <p>Multi-SACCO operations, member self-service, billing, finance, loans and oversight.</p>
        </div>
      </div>
      <form id="primaryLoginForm" class="login-form">
        <div>
          <span class="pill">Secure access</span>
          <h3>Login</h3>
          <p>Code identifies the SACCO or platform administration area. Username and password identify whether the account is a member, treasurer, secretary, chairperson, SACCO admin, or platform admin.</p>
        </div>
        <div class="form-grid">
          ${field("Code", "loginSaccoCode", "text", "")}
          ${field("Username", "loginUsername", "text", "")}
          ${field("Password", "loginPassword", "password", "")}
        </div>
        <div id="loginError" class="notice error" hidden></div>
        <div class="login-actions">
          <button id="loginSubmit" class="primary-button" type="submit">Login</button>
        </div>
        <small>Use code PLATFORM for platform administration. SACCOs use their assigned code. Members use the same SACCO code plus their membership number, phone, or email.</small>
        <div class="demo-account-panel">
          <div>
            <strong>Demo accounts</strong>
            <span>Development/demo only. These are blocked when production demo logins are disabled.</span>
          </div>
          <div class="demo-account-grid">
            ${demoAccounts.map((account, index) => `
              <button class="demo-account" type="button" data-demo-account="${index}">
                <strong>${account.label}</strong>
                <span>${account.code} / ${account.username}</span>
                <small>${account.note}</small>
              </button>
            `).join("")}
          </div>
        </div>
      </form>
      ${apiState.lastError ? `<div class="notice error">${apiState.lastError}</div>` : ""}
    </section>
  `;
  bindPrimaryLoginForm();
  bindViewActions();
}

function bindPrimaryLoginForm() {
  const form = document.getElementById("primaryLoginForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loginWithCodeUsernamePassword(
            value("loginSaccoCode"),
            value("loginUsername"),
            value("loginPassword"),
            document.getElementById("loginError"),
            document.getElementById("loginSubmit"));
  });
  document.querySelectorAll("[data-demo-account]").forEach((button) => {
    button.addEventListener("click", () => fillDemoAccount(Number(button.dataset.demoAccount)));
  });
}

function fillDemoAccount(index) {
  const account = demoAccounts[index];
  if (!account) return;
  document.getElementById("loginSaccoCode").value = account.code;
  document.getElementById("loginUsername").value = account.username;
  document.getElementById("loginPassword").value = account.password;
  showLoginError(document.getElementById("loginError"), "");
  document.getElementById("loginUsername").focus();
}

function renderShellStatus() {
  const shellStatus = document.getElementById("shellStatus");
  if (!shellStatus) return;
  const currentTenantName = apiState.user?.tenantId === "tenant_platform" ? tenantName(state.tenantId) : tenantName(apiState.user?.tenantId || state.tenantId);
  const operationsScope = apiState.operationsStatus?.scope
    ? (apiState.operationsStatus.scope === "platform" ? "Platform-wide" : tenantName(apiState.operationsStatus.scope))
    : "Not loaded";
  const checkedAt = apiState.operationsStatus?.checkedAt
    ? apiState.operationsStatus.checkedAt.slice(0, 16).replace("T", " ")
    : "pending";
  const apiLabel = apiState.user ? `API: ${apiState.user.fullName}` : `API: ${apiState.health || "checking"}`;
  const roleLabel = apiState.roleNames?.length ? apiState.roleNames.join(", ") : currentWorkspace().session;
  const memberLabel = memberApiState.member ? `Member: ${memberApiState.member.fullName}` : "Member: signed out";
  shellStatus.innerHTML = `
    ${shellFact("Tenant", currentTenantName)}
    ${shellFact("Staff session", apiLabel)}
    ${shellFact("Role access", roleLabel)}
    ${shellFact("Member session", memberLabel)}
    ${shellFact("Operations scope", operationsScope)}
  `;
}

function shellFact(label, value) {
  return `<span class="shell-fact"><small>${label}</small><strong>${value}</strong></span>`;
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
    ${workspaceOverview()}
    <div class="grid metrics">
      ${metric("Registered members", usingApi ? (operationCounts.members || members.length) : members.length, `${activeMembers} active`)}
      ${metric("Posted collections", money.format(deposits), usingApi ? "API-backed postings" : "tenant-filtered")}
      ${metric("Loan portfolio", money.format(portfolio), `${usingApi ? (operationCounts.openLoans || loans.length) : loans.filter((l) => l.status !== "Closed").length} open loan files`)}
      ${metric("Pending approvals", usingApi ? (operationCounts.pendingFinancialTransactions || approvals.length) : approvals.length, "maker-checker controls")}
    </div>

    <section class="card integration-panel" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Dashboard data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; Java integration</p>
        </div>
        ${refreshApiButton("Refresh backend data")}
      </div>
      ${apiSyncNotice("Dashboard")}
      <div class="grid four compact-facts">
        ${miniFact("Source", usingApi ? "Java API" : "Local demo")}
        ${miniFact("Operations scope", operations.scope ? (operations.scope === "platform" ? "Platform" : tenantName(operations.scope)) : "Not loaded")}
        ${miniFact("Last sync", formatSyncTime(apiState.lastSyncedAt))}
        ${miniFact("Health", apiState.health)}
      </div>
    </section>

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
      ${apiState.user ? `<div class="toolbar" style="margin-top:14px;margin-bottom:0"><button class="secondary-button" data-view-jump="operations" type="button">Open operations center</button><button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh backend data"}</button></div>` : ""}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Android member app</h2>
          <p class="eyebrow">Flutter foundation &middot; mobile/member_app</p>
        </div>
        <button class="secondary-button" data-view-jump="memberPortal" type="button">Open member portal</button>
      </div>
      <div class="grid metrics">
        ${metric("Mobile auth", "Ready", "member token flow")}
        ${metric("Dashboard API", "Ready", "/member-auth/mobile-dashboard")}
        ${metric("Offline drafts", "Ready", "local save + sync")}
      </div>
      <div class="notice" style="margin-top:16px">Android emulator API base: <strong>http://10.0.2.2:5173/api/v1</strong>. Demo member logins require the development/demo profile.</div>
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
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>SACCO registration data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; onboarding and tenant approval</p>
        </div>
        <div class="filters">
          ${apiState.user ? refreshApiButton("Refresh backend data") : `<button class="secondary-button" data-action="apiLogin" type="button">API login</button>`}
          ${apiState.user && !canCreateOnApi ? "" : `<button class="primary-button" data-action="newTenant" type="button">New SACCO application</button>`}
        </div>
      </div>
      ${apiSyncNotice("SACCO Registration screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", source)}
        ${miniFact("Last sync", apiState.user ? formatSyncTime(apiState.lastSyncedAt) : "Demo seed")}
        ${miniFact("Approval access", canCreateOnApi ? "Platform" : (apiState.user ? "Tenant view" : "Demo"))}
        ${miniFact("Activation gate", pendingTenants === 0 ? "Clear" : "Review")}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>SACCO onboarding control center</h2>
          <p class="eyebrow">${source} &middot; applications, licence readiness, packages and tenant activation</p>
        </div>
        ${apiState.user ? refreshApiButton() : ""}
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
          <p class="eyebrow">${source} &middot; Self-registration, compliance checks and approval history</p>
        </div>
        ${apiState.user && !canCreateOnApi ? "" : `<button class="primary-button" data-action="newTenant" type="button">New SACCO application</button>`}
      </div>
      ${apiSyncNotice("SACCO applications")}
      <div class="table-wrap">
        <table>
          <thead><tr><th>SACCO</th><th>District</th><th>Licence expiry</th><th>Package</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${tenants.map((tenant) => `
              <tr>
                <td><strong>${tenant.name}</strong><br><span class="pill">${tenant.registrationNo}${tenant.source ? ` &middot; ${tenant.source}` : ""}</span></td>
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
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Subscriptions data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; billing and payment activation</p>
        </div>
        <div class="filters">
          ${apiState.user ? refreshApiButton("Refresh backend data") : `<button class="secondary-button" data-action="apiLogin" type="button">API login</button>`}
          ${useApiSubscriptions() && !canRecordApiPayment ? "" : `<button class="primary-button" data-action="recordSubscriptionPayment" type="button">Record payment</button>`}
        </div>
      </div>
      ${apiSyncNotice("Subscriptions screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", source)}
        ${miniFact("Last sync", apiState.user ? formatSyncTime(apiState.lastSyncedAt) : "Demo seed")}
        ${miniFact("Payment access", canRecordApiPayment ? "Platform" : (apiState.user ? "View only" : "Demo"))}
        ${miniFact("Outstanding", money.format(outstandingTotal))}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
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
          <p class="eyebrow">${source} &middot; Subscription lifecycle</p>
        </div>
        ${apiState.user ? refreshApiButton() : ""}
      </div>
      ${apiSyncNotice("Invoices and payments")}
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
  const outstanding = Math.max(0, billing.amount - billing.paid);
  return `
    <tr>
      <td>${sub.invoice}${sub.source ? `<br><small>${sub.source}</small>` : ""}</td>
      <td>${tenantName(sub.tenantId)}</td>
      <td>${packageName(sub.packageId)}<br><small>${billing.tierLabel}</small></td>
      <td>${billing.memberCount.toLocaleString()} actual<br><small>${billing.billingDescription}</small></td>
      <td>${money.format(billing.amount)}</td>
      <td>${money.format(billing.paid)}<br><small>${money.format(outstanding)} outstanding</small></td>
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
  const membersWithoutBranch = members.filter((member) => !member.branchId).length;
  const staleMemberLabel = apiState.user ? formatSyncTime(apiState.lastSyncedAt) : "Demo seed";
  return `
    ${workspaceOverview()}
    <div class="grid metrics">
      ${metric("Members", members.length, `${activeMembers} active`)}
      ${metric("KYC verified", `${verifiedMembers}/${members.length}`, `${members.length - verifiedMembers} pending or expired`)}
      ${metric("Branch coverage", branchCount, useApiMembers() ? "backend branches represented" : "demo branches represented")}
      ${metric("Member funds", money.format(totalSavings + totalShares + totalWelfare), "savings + shares + welfare")}
    </div>

    <section class="card integration-panel" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Members data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; balances and KYC</p>
        </div>
        <div class="filters">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh backend data"}</button>` : `<button class="secondary-button" data-action="apiLogin" type="button">API login</button>`}
          <button class="secondary-button" data-action="memberImportTemplate" type="button">Import members</button>
          <button class="secondary-button" data-action="memberMetadataImport" type="button">Profile metadata</button>
        </div>
      </div>
      ${apiSyncNotice("Members screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", source)}
        ${miniFact("Last sync", staleMemberLabel)}
        ${miniFact("Unassigned branch", membersWithoutBranch)}
        ${miniFact("Balance source", useApiMembers() ? "Server fields" : "Demo seed / Server fields after login")}
      </div>
    </section>

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
          <p class="eyebrow">${source} &middot; KYC, status, balances and branch access</p>
        </div>
        <div class="filters">
          <input class="input" id="memberSearch" placeholder="Search members">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh API"}</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="memberImportTemplate" type="button">Import members</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="memberMetadataImport" type="button">Profile metadata</button>` : ""}
          <button class="primary-button" data-action="newMember" type="button">Register member</button>
        </div>
      </div>
      ${apiSyncNotice("Member register")}
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
  const accountCoverage = new Set(accounts.map((item) => item.memberId).filter(Boolean)).size;
  return `
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Transactions data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; postings, accounts and welfare</p>
        </div>
        <div class="filters">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh backend data"}</button>` : `<button class="secondary-button" data-action="apiLogin" type="button">API login</button>`}
          ${apiState.user ? `<button class="secondary-button" data-action="openingBalanceImport" type="button">Opening balances</button>` : ""}
          <button class="primary-button" data-action="newTransaction" type="button">Post transaction</button>
        </div>
      </div>
      ${apiSyncNotice("Transactions screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", source)}
        ${miniFact("Last sync", apiState.user ? formatSyncTime(apiState.lastSyncedAt) : "Demo seed")}
        ${miniFact("Products", useApiTransactions() ? products.length : "Demo")}
        ${miniFact("Account coverage", useApiTransactions() ? accountCoverage : distinctMembers)}
      </div>
    </section>
    ${apiState.user ? `
      <section class="card" style="margin-top:16px">
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
          ${metric("Members covered", accountCoverage, "with financial accounts")}
        </div>
        <div class="grid two" style="margin-top:16px">
          ${financialProductTable(products)}
          ${financialAccountTable(accounts)}
        </div>
      </section>
    ` : ""}
    <section class="card" style="margin-top:16px">
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
          <p class="eyebrow">${source} &middot; Fixed precision amounts, references, maker-checker and reversals</p>
        </div>
        <div class="filters">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh API"}</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="openingBalanceImport" type="button">Opening balances</button>` : ""}
          <button class="primary-button" data-action="newTransaction" type="button">Post transaction</button>
        </div>
      </div>
      ${apiSyncNotice("Financial postings table")}
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
            <button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh API"}</button>
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
  const repaymentCoverage = loans.filter((loan) => Number(loan.repaymentTotal || 0) > 0).length;
  return `
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Loans data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; portfolio, guarantors and repayments</p>
        </div>
        <div class="filters">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh backend data"}</button>` : `<button class="secondary-button" data-action="apiLogin" type="button">API login</button>`}
          ${apiState.user ? `<button class="secondary-button" data-action="loanBookImport" type="button">Loan book import</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="repaymentHistoryImport" type="button">Repayment history</button>` : ""}
          <button class="primary-button" data-action="newLoan" type="button">New loan application</button>
        </div>
      </div>
      ${apiSyncNotice("Loans screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", source)}
        ${miniFact("Last sync", apiState.user ? formatSyncTime(apiState.lastSyncedAt) : "Demo seed")}
        ${miniFact("Repayment coverage", repaymentCoverage)}
        ${miniFact("Average DSR", `${averageDsr}%`)}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
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
          <p class="eyebrow">${source} &middot; Applications, appraisal, guarantors and portfolio risk</p>
        </div>
        <div class="filters">
          ${apiState.user ? `<button class="secondary-button" data-action="refreshApi" type="button" ${apiState.loading ? "disabled" : ""}>${apiState.loading ? "Refreshing..." : "Refresh API"}</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="loanBookImport" type="button">Loan book import</button>` : ""}
          ${apiState.user ? `<button class="secondary-button" data-action="repaymentHistoryImport" type="button">Repayment history</button>` : ""}
          <button class="primary-button" data-action="newLoan" type="button">New loan application</button>
        </div>
      </div>
      ${apiSyncNotice("Loan files list")}
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
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Approvals data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; maker-checker and workflows</p>
        </div>
        <div class="filters">
          ${apiState.user ? refreshApiButton("Refresh backend data") : `<button class="secondary-button" data-action="apiLogin" type="button">API login</button>`}
          ${apiState.user ? `<button class="primary-button" data-action="newApprovalWorkflow" type="button">New workflow</button>` : ""}
        </div>
      </div>
      ${apiSyncNotice("Approvals screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", source)}
        ${miniFact("Last sync", apiState.user ? formatSyncTime(apiState.lastSyncedAt) : "Demo seed")}
        ${miniFact("Workflow coverage", apiState.user ? workflowModules : "Demo")}
        ${miniFact("Checker queue", approvals.length)}
      </div>
    </section>
    ${apiState.user ? `
      <section class="card" style="margin-top:16px">
        <div class="toolbar">
          <div>
            <h2>Approval control center</h2>
            <p class="eyebrow">API-backed &middot; maker-checker queue, workflow coverage and decision history</p>
          </div>
          ${refreshApiButton()}
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
      <section class="card" style="margin-top:16px">
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
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Approval queue</h2>
          <p class="eyebrow">${source} &middot; Committee, board and maker-checker decisions</p>
        </div>
        ${apiState.user ? refreshApiButton() : ""}
      </div>
      ${apiSyncNotice("Approval queue")}
      <ul class="list">
        ${approvals.map((approval) => `
          <li>
            <span>
              <strong>${approval.title}</strong><br>
              <small>${approval.type} requested by ${approval.requester} &middot; risk ${approval.risk}${approval.source ? ` &middot; ${approval.source}` : ""}</small>
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
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Reports data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; accounting, compliance and audit</p>
        </div>
        <button class="secondary-button" data-action="apiLogin" type="button">API login</button>
      </div>
      ${apiSyncNotice("Reports screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", "Local demo")}
        ${miniFact("Last sync", "Demo seed")}
        ${miniFact("Ledger", "Demo summary")}
        ${miniFact("Audit rows", tenantScoped(state.audit).length)}
      </div>
    </section>
    <div class="grid two" style="margin-top:16px">
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
        ${refreshApiButton()}
      </div>
      ${apiAuditTable(apiState.auditEvents)}
    </section>
  `;
}

function renderOperations() {
  if (!apiState.user) {
    return `
      <section class="card integration-panel">
        <div class="toolbar">
          <div>
            <h2>Operations data source</h2>
            <p class="eyebrow">${apiSyncState()} &middot; Java backend monitoring</p>
          </div>
          <button class="primary-button" data-action="apiLogin" type="button">API login</button>
        </div>
        ${apiSyncNotice("Operations screen")}
        <div class="grid four compact-facts">
          ${miniFact("Source", "Login required")}
          ${miniFact("Last sync", formatSyncTime(apiState.lastSyncedAt))}
          ${miniFact("Scope", "Not loaded")}
          ${miniFact("Readiness", "Waiting")}
          ${miniFact("Operations command center", "Login to load live queues")}
        </div>
      </section>
    `;
  }

  const status = apiState.operationsStatus || {};
  const counts = status.counts || {};
  const alerts = status.alerts || [];
  const tenantLabel = status.scope === "platform" ? "Platform-wide" : tenantName(status.scope || currentApiTenantId());
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;
  const warningAlerts = alerts.filter((alert) => alert.severity === "warning").length;
  const exceptionCount = Number(counts.callbackExceptions || 0) + Number(counts.deliveryExceptions || 0);
  const queuePressure = Number(counts.pendingFinancialTransactions || 0) + Number(counts.openComplaints || 0);
  const releaseGates = [
    { label: "Database reachable", ok: status.database?.reachable === true, detail: status.checkedAt ? `checked ${status.checkedAt.slice(0, 16).replace("T", " ")}` : "waiting for API" },
    { label: "No critical operation alerts", ok: criticalAlerts === 0, detail: `${criticalAlerts} critical alert(s)` },
    { label: "Pending postings monitored", ok: Number(counts.pendingFinancialTransactions || 0) === 0, detail: `${counts.pendingFinancialTransactions || 0} awaiting checker action` },
    { label: "Callback exceptions clear", ok: Number(counts.callbackExceptions || 0) === 0, detail: `${counts.callbackExceptions || 0} callback exception(s)` },
    { label: "Delivery exceptions clear", ok: Number(counts.deliveryExceptions || 0) === 0, detail: `${counts.deliveryExceptions || 0} provider exception(s)` }
  ];
  const healthyGateCount = releaseGates.filter((gate) => gate.ok).length;

  return `
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Operations data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; release readiness and monitoring</p>
        </div>
        ${refreshApiButton("Refresh backend data")}
      </div>
      ${apiSyncNotice("Operations screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", "Java API")}
        ${miniFact("Last sync", formatSyncTime(apiState.lastSyncedAt))}
        ${miniFact("Scope", tenantLabel)}
        ${miniFact("Readiness", `${healthyGateCount}/${releaseGates.length}`)}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Operations command center</h2>
          <p class="eyebrow">API-backed &middot; release readiness, alerts, queues and runbooks for ${tenantLabel}</p>
        </div>
        ${refreshApiButton()}
      </div>
      <div class="grid metrics">
        ${metric("Readiness", `${healthyGateCount}/${releaseGates.length}`, "production gates passing")}
        ${metric("Alert load", alerts.length, `${criticalAlerts} critical, ${warningAlerts} warning`)}
        ${metric("Exception load", exceptionCount, "callbacks and provider deliveries")}
        ${metric("Queue pressure", queuePressure, "pending postings and complaints")}
      </div>
      <div class="grid three" style="margin-top:16px">
        ${metric("Scope", tenantLabel, status.ok ? "API operations status" : "waiting for refresh")}
        ${metric("Database", status.database?.reachable ? "Reachable" : "Unknown", status.checkedAt ? status.checkedAt.slice(0, 10) : "not checked")}
        ${metric("Runbooks", 4, "monitoring, deployment, security, technical")}
      </div>
    </section>
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
        ${refreshApiButton()}
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
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Reports data source</h2>
          <p class="eyebrow">${apiSyncState()} &middot; ledger, reconciliation and compliance</p>
        </div>
        ${refreshApiButton("Refresh backend data")}
      </div>
      ${apiSyncNotice("Reports screen")}
      <div class="grid four compact-facts">
        ${miniFact("Source", "Java API")}
        ${miniFact("Last sync", formatSyncTime(apiState.lastSyncedAt))}
        ${miniFact("Journal rows", journals.length)}
        ${miniFact("Reconciliation exceptions", reconciliationExceptions)}
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="toolbar">
        <div>
          <h2>Reports control center</h2>
          <p class="eyebrow">API-backed &middot; financial integrity, reconciliation, compliance and governance for ${tenantLabel}</p>
        </div>
        ${refreshApiButton()}
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
          <p class="eyebrow">API-backed &middot; Balanced double-entry journals for ${tenantLabel}</p>
        </div>
        ${refreshApiButton()}
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
        ${refreshApiButton()}
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
        ${refreshApiButton()}
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
        ${refreshApiButton()}
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
        ${refreshApiButton()}
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
        ${refreshApiButton()}
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
              <small>${titleCase(meeting.meetingType.replace(/_/g, " "))} &middot; ${meeting.scheduledAt?.slice(0, 10) || ""} &middot; ${titleCase(meeting.status)}</small>
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
              <small>${titleCase(complaint.category)} &middot; ${titleCase(complaint.priority)} priority${complaint.member ? ` &middot; ${complaint.member.fullName}` : ""}</small>
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
              <td>${entry.description}<br><small>${entry.lines.map((line) => `${line.accountCode} ${line.accountName}: Dr ${money.format(line.debit)} / Cr ${money.format(line.credit)}`).join(" &middot; ")}</small></td>
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
    const memberDrafts = offlineDrafts.filter((draft) => draft.memberId === member.id);
    const totalBalance = (balances.savings || 0) + (balances.shares || 0) + (balances.welfare || 0);
    const loanBalance = mobileLoans.reduce((sum, loan) => sum + loan.balance, 0);
    const unreadNotifications = notifications.filter((notification) => notification.status === "unread").length;
    const pendingGuarantees = memberApiState.guarantorRequests.filter((request) => request.status === "pending").length;
    return `
      ${workspaceOverview()}
      <div class="toolbar">
        <div>
          <h2>${member.fullName}</h2>
          <p class="eyebrow">${member.membershipNo} &middot; ${memberApiState.tenant?.name || tenantName(member.tenantId)}</p>
        </div>
        <div class="filters">
          ${memberRefreshButton()}
          <button class="secondary-button" data-action="memberLogout" type="button">Logout member</button>
        </div>
      </div>
      <section class="card integration-panel" style="margin-top:16px">
        <div class="toolbar">
          <div>
            <h2>Member portal data source</h2>
            <p class="eyebrow">${memberSyncState()} &middot; balances, loans and notifications</p>
          </div>
          ${memberRefreshButton()}
        </div>
        ${memberSyncNotice("Member Portal")}
        <div class="grid four compact-facts">
          ${miniFact("Source", "Member API")}
          ${miniFact("Last sync", formatSyncTime(memberApiState.lastSyncedAt))}
          ${miniFact("Offline drafts", memberDrafts.length)}
          ${miniFact("Guarantee queue", pendingGuarantees)}
        </div>
      </section>
      <section class="card" style="margin-top:16px">
        <div class="toolbar">
          <div>
            <h2>Member self-service control center</h2>
            <p class="eyebrow">Server-confirmed balances, loans, guarantees, notifications and offline drafts</p>
          </div>
          <button class="secondary-button" data-action="syncOfflineDrafts" type="button" ${memberApiState.loading ? "disabled" : ""}>${memberApiState.loading ? "Refreshing..." : "Sync drafts"}</button>
        </div>
        <div class="grid metrics">
          ${metric("Total balance", money.format(totalBalance), "savings + shares + welfare")}
          ${metric("Loan exposure", money.format(loanBalance), `${mobileLoans.length} loan file(s)`)}
          ${metric("Guarantees", pendingGuarantees, "pending member decisions")}
          ${metric("Notifications", unreadNotifications, `${notifications.length} total alert(s)`)}
        </div>
        <div class="grid three" style="margin-top:16px">
          ${metric("Server status", mobileDashboard.serverConfirmed ? "Confirmed" : "Waiting", mobileDashboard.lastUpdatedAt ? `updated ${mobileDashboard.lastUpdatedAt.slice(0, 16).replace("T", " ")}` : "refresh pending")}
          ${metric("Offline drafts", memberDrafts.length, memberDrafts.length ? "sync when online" : "all synced")}
          ${metric("Member status", titleCase(member.status.replace(/_/g, " ")), member.kycStatus ? `KYC ${titleCase(member.kycStatus.replace(/_/g, " "))}` : "profile active")}
        </div>
      </section>
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
          ${memberDrafts.map((draft) => `
            <li>
              <span><strong>${draft.subject}</strong><br><small>${titleCase(draft.category)} &middot; saved ${draft.createdAt.slice(0, 16).replace("T", " ")}</small></span>
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
                <small>${money.format(request.guaranteedAmount)} &middot; ${titleCase(request.status.replace(/_/g, " "))} &middot; capacity ${money.format(request.capacity || 0)}</small>
              </span>
              <span class="filters">
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
    return `
      <section class="card integration-panel">
        <div class="toolbar">
          <div>
            <h2>Member portal data source</h2>
            <p class="eyebrow">${memberSyncState()} &middot; member session recovery</p>
          </div>
          <button class="primary-button" data-action="memberLogin" type="button">Member login</button>
        </div>
        ${memberSyncNotice("Member Portal")}
      </section>
    `;
  }

  const members = tenantScoped(state.members).filter((member) => member.status === "Active");
  const member = members[0] || tenantScoped(state.members)[0];
  if (!member) {
    return `<section class="card"><h2>Member portal</h2><p>No members exist for this tenant yet.</p><button class="primary-button" data-action="memberLogin" type="button">Member login</button></section>`;
  }
  const memberLoans = state.loans.filter((loan) => loan.memberId === member.id);
  return `
    ${workspaceOverview()}
    <section class="card integration-panel">
      <div class="toolbar">
        <div>
          <h2>Member portal data source</h2>
          <p class="eyebrow">${memberSyncState()} &middot; self-service preview</p>
        </div>
        <button class="primary-button" data-action="memberLogin" type="button">Member login</button>
      </div>
      ${memberSyncNotice("Member Portal")}
      <div class="grid four compact-facts">
        ${miniFact("Source", "Local demo")}
        ${miniFact("Last sync", "Demo seed")}
        ${miniFact("Offline drafts", offlineDrafts.filter((draft) => draft.memberId === member.id).length)}
        ${miniFact("Guarantee queue", "Login required")}
      </div>
    </section>
    <div class="grid metrics" style="margin-top:16px">
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

function workspaceOverview() {
  const workspace = currentWorkspace();
  const platformMode = state.workspace === "platformAdmin";
  const rows = platformMode
    ? [
        ["Workspace", "Platform administration", "All SACCO tenants, subscriptions, approvals and operations"],
        ["Search scope", "All SACCOs", "Find tenant, member, invoice, loan, transaction or audit records"],
        ["Primary controls", "Registration + billing", "Tenant approval, subscription payment and release readiness"]
      ]
    : state.workspace === "member"
      ? [
          ["Workspace", "Member view", "Balances, loans, notifications, guarantees and offline drafts"],
          ["Search scope", currentTenant().name, "Member self-service stays tenant-scoped"],
          ["Primary controls", "Self-service", "Statement review, loan request and mobile money payment"]
        ]
      : [
          ["Workspace", workspace.label, `${currentTenant().name} role-specific SACCO view`],
          ["Search scope", currentTenant().name, "Members, transactions, loans, approvals and reports"],
          ["Primary controls", roleControlSummary(), roleControlDetail()]
        ];
  return `
    <section class="card workspace-panel">
      <div class="toolbar">
        <div>
          <h2>${workspace.label}</h2>
          <p class="eyebrow">${platformMode ? "Multi-SACCO administration" : currentTenant().name}</p>
        </div>
        <button class="secondary-button" data-action="globalSearch" type="button">Search records</button>
      </div>
      <div class="grid three">
        ${rows.map(([label, value, detail]) => miniFact(label, `${value}<br><small>${detail}</small>`)).join("")}
      </div>
    </section>
  `;
}

function roleControlSummary() {
  const summaries = {
    saccoAdmin: "Full SACCO operations",
    treasurer: "Finance and approvals",
    secretary: "Member records and governance",
    chairperson: "Oversight and decisions"
  };
  return summaries[state.workspace] || "Tenant controls";
}

function roleControlDetail() {
  const details = {
    saccoAdmin: "Members, finance, loans, approvals, operations and reports",
    treasurer: "Collections, reversals, reconciliations, reports and checker queues",
    secretary: "Member register, KYC, meeting records, complaints and board packs",
    chairperson: "Loan oversight, approval queues, risk reports and operating exceptions"
  };
  return details[state.workspace] || "Role-filtered workflows";
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
      <td><strong>${member.name}</strong><br><small>${member.no} &middot; ${member.phone}</small></td>
      <td>${member.type}</td>
      <td>${member.branchName || branchName(member.branchId) || "Unassigned"}</td>
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

function openGlobalSearch() {
  const results = globalSearchResults("");
  openModal("Search SACCO records", `
    <div class="search-modal">
      <label class="field full">
        <span>Search across ${state.workspace === "platformAdmin" ? "all SACCOs" : currentTenant().name}</span>
        <input id="globalSearchInput" class="input" type="search" placeholder="Member, SACCO, invoice, transaction, loan, phone, reference">
      </label>
      <div id="globalSearchResults" class="search-results">${renderGlobalSearchResults(results)}</div>
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Close</button>`);

  const input = document.getElementById("globalSearchInput");
  input?.focus();
  input?.addEventListener("input", () => {
    document.getElementById("globalSearchResults").innerHTML = renderGlobalSearchResults(globalSearchResults(input.value));
    bindSearchResultActions();
  });
  bindSearchResultActions();
}

function globalSearchResults(query) {
  const term = query.trim().toLowerCase();
  const platformScope = state.workspace === "platformAdmin";
  const tenantFilter = (row) => platformScope || !row.tenantId || row.tenantId === state.tenantId || row.tenantId === currentApiTenantId();
  const rows = [
    ...(useApiTenants() ? apiState.tenants.map(apiTenantToRow) : state.tenants).map((tenant) => ({
      type: "SACCO",
      title: tenant.name,
      detail: `${tenant.registrationNo || tenant.id} - ${tenant.status}`,
      tenantId: tenant.id,
      view: "registrations",
      text: JSON.stringify(tenant)
    })),
    ...(useApiMembers() ? apiState.members.map(apiMemberToRow) : state.members).map((member) => ({
      type: "Member",
      title: member.name,
      detail: `${member.no} - ${member.phone || ""} - ${money.format(member.savings + member.shares + member.welfare)}`,
      tenantId: member.tenantId,
      view: "members",
      text: JSON.stringify(member)
    })),
    ...(useApiTransactions() ? apiState.financialTransactions.map(apiTransactionToRow) : state.transactions).map((transaction) => ({
      type: "Transaction",
      title: transaction.ref || transaction.id,
      detail: `${memberName(transaction.memberId)} - ${transaction.type} - ${money.format(transaction.amount)} - ${transaction.status}`,
      tenantId: transaction.tenantId,
      view: "transactions",
      text: JSON.stringify(transaction)
    })),
    ...(useApiLoans() ? apiState.loans.map(apiLoanToRow) : state.loans).map((loan) => ({
      type: "Loan",
      title: `${loan.product} - ${memberName(loan.memberId)}`,
      detail: `${money.format(loan.amount)} - ${loan.status} - balance ${money.format(loan.balance || 0)}`,
      tenantId: loan.tenantId,
      view: "loans",
      text: JSON.stringify(loan)
    })),
    ...(useApiSubscriptions() ? apiState.subscriptions.map(apiSubscriptionToRow) : state.subscriptions).map((subscription) => ({
      type: "Subscription",
      title: subscription.invoice || subscription.id,
      detail: `${tenantName(subscription.tenantId)} - ${money.format(subscription.amount)} - ${subscription.status}`,
      tenantId: subscription.tenantId,
      view: "subscriptions",
      text: JSON.stringify(subscription)
    })),
    ...(apiState.user ? apiState.auditEvents : state.audit).map((event) => ({
      type: "Audit",
      title: event.action,
      detail: `${tenantName(event.tenantId)} - ${event.actorName || event.actor || ""}`,
      tenantId: event.tenantId,
      view: "reports",
      text: JSON.stringify(event)
    }))
  ];

  return rows
    .filter(tenantFilter)
    .filter((row) => !term || row.text.toLowerCase().includes(term) || row.title.toLowerCase().includes(term) || row.detail.toLowerCase().includes(term))
    .slice(0, 24);
}

function renderGlobalSearchResults(results) {
  if (!results.length) return `<div class="notice">No matching records found for this workspace.</div>`;
  return `
    <ul class="search-list">
      ${results.map((result, index) => `
        <li>
          <button class="search-result" type="button" data-search-index="${index}" data-search-view="${result.view}" data-search-tenant="${result.tenantId || ""}">
            <span class="pill">${result.type}</span>
            <strong>${result.title}</strong>
            <small>${result.detail}</small>
          </button>
        </li>
      `).join("")}
    </ul>
  `;
}

function bindSearchResultActions() {
  document.querySelectorAll("[data-search-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const tenantId = button.dataset.searchTenant;
      if (tenantId && state.workspace === "platformAdmin") {
        state.tenantId = tenantId === "tenant_platform" ? "platform" : tenantId.replace(/^tenant_/, "");
      }
      state.currentView = button.dataset.searchView;
      saveState();
      closeModal();
      render();
      if (apiState.user) refreshApiStatus();
    });
  });
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
        memberMetadataImport: openMemberMetadataImport,
        openingBalanceImport: openOpeningBalanceImport,
        loanBookImport: openLoanBookImport,
        repaymentHistoryImport: openRepaymentHistoryImport,
        newNotificationTemplate: () => openNotificationTemplateForm(),
        globalSearch: openGlobalSearch,
        apiLogin: openApiLoginForm,
        memberLogin: openMemberLoginForm,
        memberLogout: memberLogout,
        refreshMember: refreshMemberStatus,
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
  memberApiState.loading = true;
  memberApiState.lastError = "";
  if (!isAuthenticated() || state.currentView === "memberPortal") render();

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
    memberApiState.lastSyncedAt = new Date().toISOString();
    memberApiState.message = `Member portal signed in as ${session.member.fullName}.`;
  } catch (error) {
    localStorage.removeItem(MEMBER_SESSION_KEY);
    memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, mobileDashboard: null, guarantorRequests: [], notifications: [], loading: false, lastSyncedAt: "", lastError: error.message, message: error.message };
  } finally {
    memberApiState.loading = false;
  }
  if (!isAuthenticated() || state.currentView === "memberPortal") render();
}

async function refreshApiStatus() {
  apiState.loading = true;
  apiState.lastError = "";
  renderApiChrome();
  if (!isAuthenticated() || ["dashboard", "reports", "operations", "members", "registrations", "subscriptions", "transactions", "approvals", "loans"].includes(state.currentView)) render();

  try {
    const health = await apiRequest("/health");
    apiState.health = health.ok ? "online" : "offline";
    apiState.message = `${health.service} ${health.version} responded successfully.`;

    if (apiState.token) {
      const session = await apiRequest("/auth/me");
      apiState.user = session.user;
      apiState.roleIds = session.roleIds || [];
      apiState.roleNames = session.roleNames || [];
      apiState.permissionIds = session.permissionIds || [];
      state.workspace = workspaceForStaff(session.user, apiState.roleNames, apiState.permissionIds);
      ensureWorkspaceTenant();
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
      apiState.lastSyncedAt = new Date().toISOString();
      apiState.message = `Connected as ${session.user.fullName}. API returned ${tenants.length} tenant(s), ${users.length} user(s), ${roles.length} role(s), ${branches.length} branch(es), ${members.length} member(s), ${subscriptions.length} subscription(s), ${financialProducts.length} product(s), ${financialAccounts.length} account(s), ${financialTransactions.length} transaction(s), ${welfareClaims.length} welfare claim(s), ${loans.length} loan(s), ${accountingPeriods.length} accounting period(s), ${journalEntries.length} journal(s), ${statementLines.length} statement line(s), ${regulatoryReport.reports.length} report row(s), ${mobileMoneyCallbacks.length} callback(s), ${notificationDeliveries.length} delivery(s), ${notificationTemplates.length} notification template(s), ${expenses.length} expense(s), ${assets.length} asset(s), ${governanceMeetings.length} meeting(s), ${complaints.length} complaint(s), ${approvalWorkflows.length} workflow(s), ${approvalDecisions.length} decision(s), and ${auditEvents.length} audit event(s).`;
    }
  } catch (error) {
    if (apiState.token) {
      localStorage.removeItem(API_SESSION_KEY);
      apiState.token = "";
      apiState.user = null;
    }
    apiState.health = "offline";
    apiState.lastError = error.message;
    apiState.message = error.message;
  } finally {
    apiState.loading = false;
  }
  renderApiChrome();
  if (!isAuthenticated() || ["dashboard", "reports", "operations", "members", "registrations", "subscriptions", "transactions", "approvals", "loans"].includes(state.currentView)) render();
}

function openApiLoginForm() {
  openModal("API login", `
    <div class="notice">Enter the code assigned to your SACCO. Use <strong>PLATFORM</strong> for platform administration. Access after login is limited by your assigned roles and permissions.</div>
    <div class="form-grid" style="margin-top:14px">
      ${field("SACCO code", "apiSaccoCode", "text", "")}
      ${field("Username or email", "apiUsername", "text", "")}
      ${field("Password", "apiPassword", "password", "")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="apiLoginSubmit" class="primary-button" type="button">Login</button>`);

  document.getElementById("apiLoginSubmit").addEventListener("click", async () => {
    try {
      await loginStaffWithCode(value("apiSaccoCode"), value("apiUsername"), value("apiPassword"));
      closeModal();
      await refreshApiStatus();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

function openMemberLoginForm() {
  openModal("Member login", `
    <div class="notice">Enter your SACCO code plus your membership number, phone, or email. Seeded demo member accounts are disabled outside the development/demo profile.</div>
    <div class="form-grid" style="margin-top:14px">
      ${field("SACCO code", "memberSaccoCode", "text", "")}
      ${field("Membership no., phone, or email", "memberIdentifier", "text", "")}
      ${field("Password", "memberPassword", "password", "")}
    </div>
  `, `<button class="secondary-button" value="cancel" type="submit">Cancel</button><button id="memberLoginSubmit" class="primary-button" type="button">Login</button>`);

  document.getElementById("memberLoginSubmit").addEventListener("click", async () => {
    try {
      await loginMemberWithCode(value("memberSaccoCode"), value("memberIdentifier"), value("memberPassword"));
      closeModal();
      await refreshMemberStatus();
      render();
    } catch (error) {
      document.getElementById("modalBody").insertAdjacentHTML("afterbegin", `<div class="notice error">${error.message}</div>`);
    }
  });
}

async function loginWithCodeUsernamePassword(saccoCode, username, password, errorTarget, submitButton) {
  if (!saccoCode || !username || !password) {
    showLoginError(errorTarget, "Code, username, and password are required.");
    return;
  }
  showLoginError(errorTarget, "");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Checking...";
  }
  try {
    await loginStaffWithCode(saccoCode, username, password);
    await refreshApiStatus();
    return;
  } catch (staffError) {
    try {
      await loginMemberWithCode(saccoCode, username, password);
      await refreshMemberStatus();
      render();
      return;
    } catch (memberError) {
      showLoginError(errorTarget, "Invalid code, username, or password.");
      apiState.lastError = staffError.message || memberError.message;
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  }
}

async function loginStaffWithCode(saccoCode, username, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    headers: {},
    body: JSON.stringify({ saccoCode, username, password })
  });
  apiState.token = data.token;
  apiState.user = data.user;
  apiState.roleIds = data.roleIds || [];
  apiState.roleNames = data.roleNames || [];
  apiState.permissionIds = data.permissionIds || [];
  memberApiState.token = "";
  memberApiState.member = null;
  localStorage.setItem(API_SESSION_KEY, data.token);
  localStorage.removeItem(MEMBER_SESSION_KEY);
  state.workspace = workspaceForStaff(data.user, apiState.roleNames, apiState.permissionIds);
  ensureWorkspaceTenant();
  state.currentView = currentWorkspace().defaultView;
  saveState();
}

async function loginMemberWithCode(saccoCode, username, password) {
  const data = await memberApiRequest("/member-auth/login", {
    method: "POST",
    headers: {},
    body: JSON.stringify({ saccoCode, identifier: username, password })
  });
  memberApiState.token = data.token;
  memberApiState.member = data.member;
  memberApiState.tenant = data.tenant;
  memberApiState.branch = data.branch;
  memberApiState.balances = data.balances;
  memberApiState.mobileDashboard = null;
  memberApiState.guarantorRequests = [];
  memberApiState.notifications = [];
  memberApiState.loading = false;
  memberApiState.lastSyncedAt = "";
  memberApiState.lastError = "";
  apiState.token = "";
  apiState.user = null;
  apiState.roleIds = [];
  apiState.roleNames = [];
  apiState.permissionIds = [];
  localStorage.setItem(MEMBER_SESSION_KEY, data.token);
  localStorage.removeItem(API_SESSION_KEY);
  state.workspace = "member";
  ensureWorkspaceTenant();
  state.currentView = "memberPortal";
  saveState();
}

function showLoginError(target, message) {
  if (!target) return;
  target.textContent = message;
  target.hidden = !message;
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
  apiState = { ...apiState, token: "", user: null, roleIds: [], roleNames: [], permissionIds: [], tenants: [], users: [], roles: [], permissions: [], branches: [], members: [], subscriptionPackages: [], subscriptions: [], financialProducts: [], financialAccounts: [], financialTransactions: [], welfareClaims: [], loans: [], accountingPeriods: [], chartOfAccounts: [], journalEntries: [], statementLines: [], reconciliation: null, regulatoryReport: null, mobileMoneyCallbacks: [], notificationDeliveries: [], notificationTemplates: [], suppliers: [], expenses: [], assets: [], governanceMeetings: [], complaints: [], approvalWorkflows: [], approvalDecisions: [], auditEvents: [], operationsStatus: null, loading: false, lastSyncedAt: "", lastError: "", message: "Logged out of API session." };
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
  memberApiState = { token: "", member: null, tenant: null, branch: null, balances: null, mobileDashboard: null, guarantorRequests: [], notifications: [], loading: false, lastSyncedAt: "", lastError: "", message: "Logged out of member portal." };
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
      <td><strong>${member.name}</strong><br><small>${member.no} &middot; ${member.phone}${member.source ? ` &middot; ${member.source}` : ""}</small></td>
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
    openModal("Member import", `
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
      <label class="field full" style="margin-top:16px">
        <span>CSV rows</span>
        <textarea id="memberImportCsv" class="input" rows="8">${template.csv}</textarea>
      </label>
      <div id="memberImportResult" style="margin-top:16px"></div>
    `, `<button class="secondary-button" value="cancel" type="submit">Close</button><button id="copyMemberImportTemplate" class="secondary-button" type="button">Copy CSV</button><button id="validateMemberImport" class="secondary-button" type="button">Validate</button><button id="runMemberImport" class="primary-button" type="button">Import</button>`);
    document.getElementById("copyMemberImportTemplate").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(template.csv);
        document.getElementById("memberImportResult").innerHTML = `<div class="notice">CSV template copied to clipboard.</div>`;
      } catch {
        document.getElementById("memberImportResult").innerHTML = `<div class="notice error">Clipboard access was not available. Use the CSV text.</div>`;
      }
    });
    document.getElementById("validateMemberImport").addEventListener("click", () => submitMemberImport(template.tenantId, true));
    document.getElementById("runMemberImport").addEventListener("click", () => submitMemberImport(template.tenantId, false));
  } catch (error) {
    openModal("Member import", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function submitMemberImport(tenantId, dryRun) {
  const result = document.getElementById("memberImportResult");
  try {
    const rows = parseMemberImportCsv(value("memberImportCsv"));
    result.innerHTML = `<div class="notice">${dryRun ? "Validating" : "Importing"} ${rows.length} row(s)...</div>`;
    const response = await apiRequest("/members/import", {
      method: "POST",
      body: JSON.stringify({ tenantId, dryRun, rows })
    });
    result.innerHTML = renderMemberImportResult(response);
    if (!dryRun && response.valid) await refreshApiStatus();
  } catch (error) {
    result.innerHTML = `<div class="notice error">${error.message}</div>`;
  }
}

async function openMemberMetadataImport() {
  if (!apiState.user) return;
  try {
    const template = await apiRequest(`/members/metadata-import-template${apiTenantQuery()}`);
    const sampleRows = template.sampleRows || [];
    openModal("Member profile metadata", `
      <div class="grid metrics">
        ${metric("File", template.filename, template.contentType)}
        ${metric("Columns", template.headers.length, "profile metadata fields")}
        ${metric("Tenant", tenantName(template.tenantId), `${sampleRows.length} sample row(s)`)}
      </div>
      <div class="notice" style="margin-top:16px">Use record types kyc_status, document, next_of_kin, and beneficiary. The whole batch imports only after every row validates.</div>
      <div class="table-wrap" style="margin-top:16px">
        <table>
          <thead><tr>${template.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
          <tbody>
            ${sampleRows.map((row) => `<tr>${template.headers.map((header) => `<td>${row[header] || ""}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      <label class="field full" style="margin-top:16px">
        <span>CSV rows</span>
        <textarea id="memberMetadataImportCsv" class="input" rows="8">${template.csv}</textarea>
      </label>
      <div id="memberMetadataImportResult" style="margin-top:16px"></div>
    `, `<button class="secondary-button" value="cancel" type="submit">Close</button><button id="copyMemberMetadataImportTemplate" class="secondary-button" type="button">Copy CSV</button><button id="validateMemberMetadataImport" class="secondary-button" type="button">Validate</button><button id="runMemberMetadataImport" class="primary-button" type="button">Import</button>`);
    document.getElementById("copyMemberMetadataImportTemplate").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(template.csv);
        document.getElementById("memberMetadataImportResult").innerHTML = `<div class="notice">CSV template copied to clipboard.</div>`;
      } catch {
        document.getElementById("memberMetadataImportResult").innerHTML = `<div class="notice error">Clipboard access was not available. Use the CSV text.</div>`;
      }
    });
    document.getElementById("validateMemberMetadataImport").addEventListener("click", () => submitMemberMetadataImport(template.tenantId, true));
    document.getElementById("runMemberMetadataImport").addEventListener("click", () => submitMemberMetadataImport(template.tenantId, false));
  } catch (error) {
    openModal("Member profile metadata", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function submitMemberMetadataImport(tenantId, dryRun) {
  const result = document.getElementById("memberMetadataImportResult");
  try {
    const rows = parseMemberImportCsv(value("memberMetadataImportCsv"));
    result.innerHTML = `<div class="notice">${dryRun ? "Validating" : "Importing"} ${rows.length} profile metadata row(s)...</div>`;
    const response = await apiRequest("/members/metadata-import", {
      method: "POST",
      body: JSON.stringify({ tenantId, dryRun, rows })
    });
    result.innerHTML = renderMemberMetadataImportResult(response);
    if (!dryRun && response.valid) await refreshApiStatus();
  } catch (error) {
    result.innerHTML = `<div class="notice error">${error.message}</div>`;
  }
}

function renderMemberMetadataImportResult(result) {
  const stateClass = result.valid ? "notice" : "notice error";
  const rows = result.errors?.map((error) => `
    <tr>
      <td>${error.row}</td>
      <td>${error.field}</td>
      <td>${error.code}</td>
      <td>${error.message}</td>
    </tr>
  `).join("") || "";
  return `
    <div class="${stateClass}">
      ${result.valid ? "Profile metadata validation passed." : "Profile metadata validation failed."}
      ${result.createdCount ? ` Imported ${result.createdCount} profile metadata record(s).` : ""}
    </div>
    <div class="grid three compact-facts" style="margin-top:12px">
      ${miniFact("Rows", result.totalRows)}
      ${miniFact("Imported", result.createdCount)}
      ${miniFact("Skipped", result.skippedCount)}
    </div>
    ${rows ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Row</th><th>Field</th><th>Code</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
  `;
}

async function openOpeningBalanceImport() {
  if (!apiState.user) return;
  try {
    const template = await apiRequest(`/financial-transactions/opening-balances/import-template${apiTenantQuery()}`);
    const sample = template.sampleRows?.[0] || {};
    openModal("Opening balances", `
      <div class="grid metrics">
        ${metric("File", template.filename, template.contentType)}
        ${metric("Columns", template.headers.length, "opening balance fields")}
        ${metric("Tenant", tenantName(template.tenantId), sample.membershipNo || "No member")}
      </div>
      <label class="field full" style="margin-top:16px">
        <span>CSV rows</span>
        <textarea id="openingBalanceImportCsv" class="input" rows="8">${template.csv}</textarea>
      </label>
      <div id="openingBalanceImportResult" style="margin-top:16px"></div>
    `, `<button class="secondary-button" value="cancel" type="submit">Close</button><button id="copyOpeningBalanceImportTemplate" class="secondary-button" type="button">Copy CSV</button><button id="validateOpeningBalanceImport" class="secondary-button" type="button">Validate</button><button id="runOpeningBalanceImport" class="primary-button" type="button">Import</button>`);
    document.getElementById("copyOpeningBalanceImportTemplate").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(template.csv);
        document.getElementById("openingBalanceImportResult").innerHTML = `<div class="notice">CSV template copied to clipboard.</div>`;
      } catch {
        document.getElementById("openingBalanceImportResult").innerHTML = `<div class="notice error">Clipboard access was not available. Use the CSV text.</div>`;
      }
    });
    document.getElementById("validateOpeningBalanceImport").addEventListener("click", () => submitOpeningBalanceImport(template.tenantId, true));
    document.getElementById("runOpeningBalanceImport").addEventListener("click", () => submitOpeningBalanceImport(template.tenantId, false));
  } catch (error) {
    openModal("Opening balances", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function submitOpeningBalanceImport(tenantId, dryRun) {
  const result = document.getElementById("openingBalanceImportResult");
  try {
    const rows = parseMemberImportCsv(value("openingBalanceImportCsv"));
    result.innerHTML = `<div class="notice">${dryRun ? "Validating" : "Importing"} ${rows.length} opening balance row(s)...</div>`;
    const response = await apiRequest("/financial-transactions/opening-balances/import", {
      method: "POST",
      body: JSON.stringify({ tenantId, dryRun, rows })
    });
    result.innerHTML = renderOpeningBalanceImportResult(response);
    if (!dryRun && response.valid) await refreshApiStatus();
  } catch (error) {
    result.innerHTML = `<div class="notice error">${error.message}</div>`;
  }
}

function renderOpeningBalanceImportResult(result) {
  const stateClass = result.valid ? "notice" : "notice error";
  const rows = result.errors?.map((error) => `
    <tr>
      <td>${error.row}</td>
      <td>${error.field}</td>
      <td>${error.code}</td>
      <td>${error.message}</td>
    </tr>
  `).join("") || "";
  return `
    <div class="${stateClass}">
      ${result.valid ? "Opening balance validation passed." : "Opening balance validation failed."}
      ${result.createdCount ? ` Posted ${result.createdCount} ledger transaction(s).` : ""}
    </div>
    <div class="grid three compact-facts" style="margin-top:12px">
      ${miniFact("Rows", result.totalRows)}
      ${miniFact("Posted", result.createdCount)}
      ${miniFact("Skipped", result.skippedCount)}
    </div>
    ${rows ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Row</th><th>Field</th><th>Code</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
  `;
}

async function openLoanBookImport() {
  if (!apiState.user) return;
  try {
    const template = await apiRequest(`/loans/import-template${apiTenantQuery()}`);
    const sample = template.sampleRows?.[0] || {};
    openModal("Loan book import", `
      <div class="grid metrics">
        ${metric("File", template.filename, template.contentType)}
        ${metric("Columns", template.headers.length, "loan book fields")}
        ${metric("Tenant", tenantName(template.tenantId), sample.membershipNo || "No member")}
      </div>
      <label class="field full" style="margin-top:16px">
        <span>CSV rows</span>
        <textarea id="loanBookImportCsv" class="input" rows="8">${template.csv}</textarea>
      </label>
      <div id="loanBookImportResult" style="margin-top:16px"></div>
    `, `<button class="secondary-button" value="cancel" type="submit">Close</button><button id="copyLoanBookImportTemplate" class="secondary-button" type="button">Copy CSV</button><button id="validateLoanBookImport" class="secondary-button" type="button">Validate</button><button id="runLoanBookImport" class="primary-button" type="button">Import</button>`);
    document.getElementById("copyLoanBookImportTemplate").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(template.csv);
        document.getElementById("loanBookImportResult").innerHTML = `<div class="notice">CSV template copied to clipboard.</div>`;
      } catch {
        document.getElementById("loanBookImportResult").innerHTML = `<div class="notice error">Clipboard access was not available. Use the CSV text.</div>`;
      }
    });
    document.getElementById("validateLoanBookImport").addEventListener("click", () => submitLoanBookImport(template.tenantId, true));
    document.getElementById("runLoanBookImport").addEventListener("click", () => submitLoanBookImport(template.tenantId, false));
  } catch (error) {
    openModal("Loan book import", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function submitLoanBookImport(tenantId, dryRun) {
  const result = document.getElementById("loanBookImportResult");
  try {
    const rows = parseMemberImportCsv(value("loanBookImportCsv"));
    result.innerHTML = `<div class="notice">${dryRun ? "Validating" : "Importing"} ${rows.length} loan row(s)...</div>`;
    const response = await apiRequest("/loans/import", {
      method: "POST",
      body: JSON.stringify({ tenantId, dryRun, rows })
    });
    result.innerHTML = renderLoanBookImportResult(response);
    if (!dryRun && response.valid) await refreshApiStatus();
  } catch (error) {
    result.innerHTML = `<div class="notice error">${error.message}</div>`;
  }
}

function renderLoanBookImportResult(result) {
  const stateClass = result.valid ? "notice" : "notice error";
  const rows = result.errors?.map((error) => `
    <tr>
      <td>${error.row}</td>
      <td>${error.field}</td>
      <td>${error.code}</td>
      <td>${error.message}</td>
    </tr>
  `).join("") || "";
  return `
    <div class="${stateClass}">
      ${result.valid ? "Loan book validation passed." : "Loan book validation failed."}
      ${result.createdCount ? ` Imported ${result.createdCount} loan record(s).` : ""}
    </div>
    <div class="grid three compact-facts" style="margin-top:12px">
      ${miniFact("Rows", result.totalRows)}
      ${miniFact("Imported", result.createdCount)}
      ${miniFact("Skipped", result.skippedCount)}
    </div>
    ${rows ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Row</th><th>Field</th><th>Code</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
  `;
}

async function openRepaymentHistoryImport() {
  if (!apiState.user) return;
  try {
    const template = await apiRequest(`/loans/repayments/import-template${apiTenantQuery()}`);
    const sample = template.sampleRows?.[0] || {};
    openModal("Repayment history import", `
      <div class="grid metrics">
        ${metric("File", template.filename, template.contentType)}
        ${metric("Columns", template.headers.length, "repayment fields")}
        ${metric("Tenant", tenantName(template.tenantId), sample.reference || "No sample")}
      </div>
      <div class="notice" style="margin-top:16px">Historical repayments explain already-paid loan amounts. They do not reduce migrated outstanding balances again.</div>
      <label class="field full" style="margin-top:16px">
        <span>CSV rows</span>
        <textarea id="repaymentHistoryImportCsv" class="input" rows="8">${template.csv}</textarea>
      </label>
      <div id="repaymentHistoryImportResult" style="margin-top:16px"></div>
    `, `<button class="secondary-button" value="cancel" type="submit">Close</button><button id="copyRepaymentHistoryImportTemplate" class="secondary-button" type="button">Copy CSV</button><button id="validateRepaymentHistoryImport" class="secondary-button" type="button">Validate</button><button id="runRepaymentHistoryImport" class="primary-button" type="button">Import</button>`);
    document.getElementById("copyRepaymentHistoryImportTemplate").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(template.csv);
        document.getElementById("repaymentHistoryImportResult").innerHTML = `<div class="notice">CSV template copied to clipboard.</div>`;
      } catch {
        document.getElementById("repaymentHistoryImportResult").innerHTML = `<div class="notice error">Clipboard access was not available. Use the CSV text.</div>`;
      }
    });
    document.getElementById("validateRepaymentHistoryImport").addEventListener("click", () => submitRepaymentHistoryImport(template.tenantId, true));
    document.getElementById("runRepaymentHistoryImport").addEventListener("click", () => submitRepaymentHistoryImport(template.tenantId, false));
  } catch (error) {
    openModal("Repayment history import", `<div class="notice error">${error.message}</div>`, `<button class="primary-button" value="cancel" type="submit">Close</button>`);
  }
}

async function submitRepaymentHistoryImport(tenantId, dryRun) {
  const result = document.getElementById("repaymentHistoryImportResult");
  try {
    const rows = parseMemberImportCsv(value("repaymentHistoryImportCsv"));
    result.innerHTML = `<div class="notice">${dryRun ? "Validating" : "Importing"} ${rows.length} repayment row(s)...</div>`;
    const response = await apiRequest("/loans/repayments/import", {
      method: "POST",
      body: JSON.stringify({ tenantId, dryRun, rows })
    });
    result.innerHTML = renderRepaymentHistoryImportResult(response);
    if (!dryRun && response.valid) await refreshApiStatus();
  } catch (error) {
    result.innerHTML = `<div class="notice error">${error.message}</div>`;
  }
}

function renderRepaymentHistoryImportResult(result) {
  const stateClass = result.valid ? "notice" : "notice error";
  const rows = result.errors?.map((error) => `
    <tr>
      <td>${error.row}</td>
      <td>${error.field}</td>
      <td>${error.code}</td>
      <td>${error.message}</td>
    </tr>
  `).join("") || "";
  return `
    <div class="${stateClass}">
      ${result.valid ? "Repayment history validation passed." : "Repayment history validation failed."}
      ${result.createdCount ? ` Imported ${result.createdCount} historical repayment(s).` : ""}
    </div>
    <div class="grid three compact-facts" style="margin-top:12px">
      ${miniFact("Rows", result.totalRows)}
      ${miniFact("Imported", result.createdCount)}
      ${miniFact("Skipped", result.skippedCount)}
    </div>
    ${rows ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Row</th><th>Field</th><th>Code</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
  `;
}

function renderMemberImportResult(result) {
  const stateClass = result.valid ? "notice" : "notice error";
  const rows = result.errors?.map((error) => `
    <tr>
      <td>${error.row}</td>
      <td>${error.field}</td>
      <td>${error.code}</td>
      <td>${error.message}</td>
    </tr>
  `).join("") || "";
  return `
    <div class="${stateClass}">
      ${result.valid ? "Import validation passed." : "Import validation failed."}
      ${result.createdCount ? ` Created ${result.createdCount} member(s).` : ""}
    </div>
    <div class="grid three compact-facts" style="margin-top:12px">
      ${miniFact("Rows", result.totalRows)}
      ${miniFact("Created", result.createdCount)}
      ${miniFact("Skipped", result.skippedCount)}
    </div>
    ${rows ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Row</th><th>Field</th><th>Code</th><th>Message</th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
  `;
}

function parseMemberImportCsv(csvText) {
  const rows = parseCsvRows(csvText).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) throw new Error("CSV must include a header row and at least one member row.");
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() || ""])));
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
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
      <label class="field full"><span>Guarantor</span><select id="guarantorMember" class="select">${candidates.map((member) => `<option value="${member.id}">${member.name} &middot; ${member.no}</option>`).join("")}</select></label>
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
      <label class="field"><span>Member</span><select id="complaintMember" class="select"><option value="">No member linked</option>${activeMembers.map((member) => `<option value="${member.id}">${member.name} &middot; ${member.no}</option>`).join("")}</select></label>
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
