import { hashPassword, hashToken, newId } from "./security.mjs";

const now = () => new Date().toISOString();
export const SUBSCRIPTION_UNIT_PRICE = 5000;
export const MINIMUM_BILLABLE_MEMBERS = 100;
export const SUBSCRIPTION_BILLING_TIERS = [
  { id: "per_member", label: "100-250 members", minMembers: 100, maxMembers: 250, unitPrice: SUBSCRIPTION_UNIT_PRICE, amount: null },
  { id: "starter_fixed", label: "251-500 members", minMembers: 251, maxMembers: 500, unitPrice: null, amount: 1200000 },
  { id: "growth_fixed", label: "501-2,500 members", minMembers: 501, maxMembers: 2500, unitPrice: null, amount: 3600000 },
  { id: "enterprise_fixed", label: "2,501-10,000 members", minMembers: 2501, maxMembers: 10000, unitPrice: null, amount: 9000000 }
];

export function calculateSubscriptionBilling(memberCount) {
  const safeMemberCount = Math.max(0, Number(memberCount) || 0);
  const tier = SUBSCRIPTION_BILLING_TIERS.find((item) => safeMemberCount <= item.maxMembers) || SUBSCRIPTION_BILLING_TIERS.at(-1);
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

const platformPassword = hashPassword("Admin@12345");
const saccoPassword = hashPassword("Sacco@12345");
const memberPassword = hashPassword("Member@12345");

export const db = {
  tenants: [
    {
      id: "tenant_platform",
      name: "Platform Administration",
      abbreviation: "HQ",
      status: "active",
      registrationNo: "PLATFORM-001",
      district: "Kampala",
      licenseExpiry: "2027-06-30",
      packageId: "enterprise",
      onboardingPercent: 100,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "tenant_green",
      name: "Green Valley SACCO",
      abbreviation: "GVS",
      status: "approved",
      registrationNo: "COOP-UG-2389",
      district: "Mukono",
      licenseExpiry: "2026-12-31",
      packageId: "growth",
      onboardingPercent: 78,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "tenant_lake",
      name: "Lake Farmers SACCO",
      abbreviation: "LFS",
      status: "pending_review",
      registrationNo: "COOP-UG-8112",
      district: "Jinja",
      licenseExpiry: "2026-08-15",
      packageId: "starter",
      onboardingPercent: 42,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  users: [
    {
      id: "user_platform_admin",
      tenantId: "tenant_platform",
      fullName: "Platform Administrator",
      email: "admin@platform.local",
      phone: "+256700000001",
      passwordHash: platformPassword.hash,
      passwordSalt: platformPassword.salt,
      status: "active",
      createdAt: now()
    },
    {
      id: "user_green_admin",
      tenantId: "tenant_green",
      fullName: "Green Valley SACCO Admin",
      email: "admin@greenvalley.local",
      phone: "+256700000002",
      passwordHash: saccoPassword.hash,
      passwordSalt: saccoPassword.salt,
      status: "active",
      createdAt: now()
    }
  ],
  roles: [
    { id: "role_platform_admin", tenantId: "tenant_platform", name: "Super Administrator", protected: true },
    { id: "role_sacco_admin", tenantId: "tenant_green", name: "SACCO Administrator", protected: true }
  ],
  permissions: [
    { id: "tenants:view", module: "Tenant Management", action: "view", description: "View tenants" },
    { id: "tenants:approve", module: "Tenant Management", action: "approve", description: "Approve or update tenant status" },
    { id: "users:create", module: "Identity", action: "create", description: "Create users" },
    { id: "audit:view", module: "Audit", action: "view", description: "View audit events" }
  ],
  userRoles: [
    { tenantId: "tenant_platform", userId: "user_platform_admin", roleId: "role_platform_admin" },
    { tenantId: "tenant_green", userId: "user_green_admin", roleId: "role_sacco_admin" }
  ],
  chartOfAccounts: [
    { code: "1000", name: "Cash on Hand", type: "asset", normalBalance: "debit" },
    { code: "1010", name: "Bank Account", type: "asset", normalBalance: "debit" },
    { code: "1020", name: "Mobile Money Wallet", type: "asset", normalBalance: "debit" },
    { code: "1030", name: "Payroll Clearing", type: "asset", normalBalance: "debit" },
    { code: "1100", name: "Loans Receivable", type: "asset", normalBalance: "debit" },
    { code: "2000", name: "Member Savings", type: "liability", normalBalance: "credit" },
    { code: "2100", name: "Member Share Capital", type: "equity", normalBalance: "credit" },
    { code: "2200", name: "Welfare Fund", type: "liability", normalBalance: "credit" },
    { code: "6100", name: "Platform Subscription Expense", type: "expense", normalBalance: "debit" }
  ],
  subscriptionPackages: [
    {
      id: "starter",
      name: "Starter",
      price: 1200000,
      billingPeriod: "annual",
      members: 500,
      minMembers: MINIMUM_BILLABLE_MEMBERS,
      tierLabel: "251-500 members",
      users: 8,
      branches: 1,
      modules: "Members, savings, shares",
      status: "active"
    },
    {
      id: "growth",
      name: "Growth",
      price: 3600000,
      billingPeriod: "annual",
      members: 2500,
      minMembers: MINIMUM_BILLABLE_MEMBERS,
      tierLabel: "501-2,500 members",
      users: 25,
      branches: 5,
      modules: "Core finance, loans, approvals, reports",
      status: "active"
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 9000000,
      billingPeriod: "annual",
      members: 10000,
      minMembers: MINIMUM_BILLABLE_MEMBERS,
      tierLabel: "2,501-10,000 members",
      users: 100,
      branches: 25,
      modules: "All modules, API, advanced support",
      status: "active"
    }
  ],
  subscriptions: [
    {
      id: "subscription_green_growth",
      tenantId: "tenant_green",
      packageId: "growth",
      status: "active",
      invoice: "INV-2026-001",
      memberCount: 3,
      billableMembers: MINIMUM_BILLABLE_MEMBERS,
      unitPrice: SUBSCRIPTION_UNIT_PRICE,
      tierId: "per_member",
      tierLabel: "100-250 members",
      billingDescription: "UGX 5,000 per member, minimum 100",
      amount: 500000,
      paid: 500000,
      expiry: "2027-07-14",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "subscription_lake_starter",
      tenantId: "tenant_lake",
      packageId: "starter",
      status: "pending_payment",
      invoice: "INV-2026-002",
      memberCount: 1,
      billableMembers: MINIMUM_BILLABLE_MEMBERS,
      unitPrice: SUBSCRIPTION_UNIT_PRICE,
      tierId: "per_member",
      tierLabel: "100-250 members",
      billingDescription: "UGX 5,000 per member, minimum 100",
      amount: 500000,
      paid: 0,
      expiry: "2026-07-30",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  subscriptionPayments: [],
  branches: [
    {
      id: "branch_green_main",
      tenantId: "tenant_green",
      code: "GV001",
      name: "Mukono Main",
      address: "Mukono Central Division",
      managerUserId: "user_green_admin",
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "branch_green_seeta",
      tenantId: "tenant_green",
      code: "GV002",
      name: "Seeta Branch",
      address: "Seeta Trading Centre",
      managerUserId: null,
      status: "active",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "branch_lake_main",
      tenantId: "tenant_lake",
      code: "LF001",
      name: "Jinja Main",
      address: "Jinja Central",
      managerUserId: null,
      status: "active",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  members: [
    {
      id: "member_green_amina",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      membershipNo: "GVS-0001",
      fullName: "Amina Nakitende",
      memberType: "individual",
      phone: "+256701234567",
      email: "amina@example.local",
      nationalId: "CM9000012K4PA",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "verified",
      joiningDate: "2024-04-12",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_green_daniel",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      membershipNo: "GVS-0002",
      fullName: "Daniel Ssekajja",
      memberType: "individual",
      phone: "+256772222118",
      email: "daniel@example.local",
      nationalId: "CM9000455K8AB",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "active",
      kycStatus: "pending_verification",
      joiningDate: "2024-08-03",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "member_lake_peter",
      tenantId: "tenant_lake",
      branchId: "branch_lake_main",
      membershipNo: "LFS-0001",
      fullName: "Peter Ocen",
      memberType: "individual",
      phone: "+256704111889",
      email: "peter@example.local",
      nationalId: "CM8800142K2RE",
      passwordHash: memberPassword.hash,
      passwordSalt: memberPassword.salt,
      status: "applicant",
      kycStatus: "pending_verification",
      joiningDate: "2026-07-02",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  memberDocuments: [
    {
      id: "doc_amina_nin",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      documentType: "national_id",
      storageKey: "tenant_green/members/member_green_amina/national-id.pdf",
      verificationStatus: "verified",
      createdAt: now()
    }
  ],
  financialTransactions: [
    {
      id: "txn_green_0001",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_amina",
      type: "savings_deposit",
      channel: "mobile_money",
      amount: 250000,
      status: "posted",
      reference: "GVS-TX-0001",
      narration: "Mobile money savings deposit",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-07-14T09:15:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_0002",
      tenantId: "tenant_green",
      branchId: "branch_green_seeta",
      memberId: "member_green_daniel",
      type: "share_purchase",
      channel: "cash",
      amount: 100000,
      status: "posted",
      reference: "GVS-TX-0002",
      narration: "Share capital purchase",
      makerUserId: "user_green_admin",
      checkerUserId: "user_green_admin",
      postedAt: "2026-07-14T11:20:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "txn_green_0003",
      tenantId: "tenant_green",
      branchId: "branch_green_main",
      memberId: "member_green_amina",
      type: "welfare_contribution",
      channel: "bank",
      amount: 60000,
      status: "pending_approval",
      reference: "GVS-TX-0003",
      narration: "Welfare contribution awaiting approval",
      makerUserId: "user_green_admin",
      checkerUserId: null,
      postedAt: null,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  loans: [
    {
      id: "loan_green_0001",
      tenantId: "tenant_green",
      memberId: "member_green_amina",
      product: "Development Loan",
      amount: 3000000,
      balance: 2150000,
      status: "active",
      stage: "Disbursed",
      guarantors: 2,
      dsr: 31,
      repaymentMonths: 12,
      purpose: "Business expansion",
      disbursedByUserId: "user_green_admin",
      disbursedAt: "2026-07-10T10:00:00.000Z",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_green_0002",
      tenantId: "tenant_green",
      memberId: "member_green_daniel",
      product: "Emergency Loan",
      amount: 800000,
      balance: 800000,
      status: "under_review",
      stage: "Credit Appraisal",
      guarantors: 1,
      dsr: 44,
      repaymentMonths: 6,
      purpose: "Medical emergency",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "loan_lake_0001",
      tenantId: "tenant_lake",
      memberId: "member_lake_peter",
      product: "Agriculture Loan",
      amount: 1500000,
      balance: 0,
      status: "submitted",
      stage: "Guarantor Review",
      guarantors: 0,
      dsr: 27,
      repaymentMonths: 10,
      purpose: "Farm inputs",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  loanGuarantors: [
    {
      id: "guarantor_green_0001",
      tenantId: "tenant_green",
      loanId: "loan_green_0002",
      memberId: "member_green_amina",
      guaranteedAmount: 400000,
      status: "pending",
      requestedByUserId: "user_green_admin",
      decidedAt: null,
      createdAt: now(),
      updatedAt: now()
    }
  ],
  loanRepayments: [
    {
      id: "loan_repayment_green_0001",
      tenantId: "tenant_green",
      loanId: "loan_green_0001",
      memberId: "member_green_amina",
      amount: 850000,
      channel: "mobile_money",
      externalReference: "LRP-GVS-0001",
      receivedAt: "2026-07-14T12:30:00.000Z",
      recordedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  statementLines: [
    {
      id: "statement_green_0001",
      tenantId: "tenant_green",
      accountCode: "1020",
      channel: "mobile_money",
      amount: 250000,
      externalReference: "GVS-TX-0001",
      description: "Mobile money savings collection",
      statementDate: "2026-07-14",
      importedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "statement_green_0002",
      tenantId: "tenant_green",
      accountCode: "1020",
      channel: "mobile_money",
      amount: 850000,
      externalReference: "LRP-GVS-0001",
      description: "Mobile money loan repayment",
      statementDate: "2026-07-14",
      importedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: "statement_green_0003",
      tenantId: "tenant_green",
      accountCode: "1010",
      channel: "bank",
      amount: -25000,
      externalReference: "BANK-FEE-0001",
      description: "Unmatched bank charge awaiting allocation",
      statementDate: "2026-07-14",
      importedByUserId: "user_green_admin",
      createdAt: now(),
      updatedAt: now()
    }
  ],
  sessions: [],
  memberSessions: [],
  auditEvents: [
    {
      id: "audit_seed_1",
      tenantId: "tenant_platform",
      actorUserId: "user_platform_admin",
      actorName: "Platform Administrator",
      action: "Seeded development backend store",
      resourceType: "system",
      resourceId: "development-store",
      ipAddress: "127.0.0.1",
      createdAt: now()
    }
  ]
};

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

export function publicMember(member) {
  if (!member) return null;
  const { passwordHash, passwordSalt, ...safeMember } = member;
  return safeMember;
}

export function publicTenant(tenant) {
  return tenant;
}

export function memberBalances(memberId) {
  const balances = { savings: 0, shares: 0, welfare: 0 };
  for (const transaction of db.financialTransactions) {
    if (transaction.memberId !== memberId || transaction.status !== "posted") continue;
    if (transaction.type === "savings_deposit") balances.savings += transaction.amount;
    if (transaction.type === "withdrawal") balances.savings -= transaction.amount;
    if (transaction.type === "share_purchase") balances.shares += transaction.amount;
    if (transaction.type === "welfare_contribution") balances.welfare += transaction.amount;
  }
  return balances;
}

export function guaranteeCapacity(memberId, excludeGuarantorId = null) {
  const balances = memberBalances(memberId);
  const committed = db.loanGuarantors
    .filter((item) => item.id !== excludeGuarantorId && item.memberId === memberId && ["pending", "accepted"].includes(item.status))
    .reduce((sum, item) => sum + item.guaranteedAmount, 0);
  return Math.max(0, balances.savings * 3 - committed);
}

export function createAuditEvent({ tenantId, actorUserId, actorName, action, resourceType = null, resourceId = null, ipAddress = null }) {
  const event = {
    id: newId("audit"),
    tenantId,
    actorUserId,
    actorName,
    action,
    resourceType,
    resourceId,
    ipAddress,
    createdAt: now()
  };
  db.auditEvents.unshift(event);
  return event;
}

export function createSession(user) {
  const token = `${newId("session")}.${cryptoRandomSuffix()}`;
  const session = {
    id: newId("session"),
    userId: user.id,
    tenantId: user.tenantId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    createdAt: now()
  };
  db.sessions.push(session);
  return { token, session };
}

export function createMemberSession(member) {
  const token = `${newId("member_session")}.${cryptoRandomSuffix()}`;
  const session = {
    id: newId("member_session"),
    memberId: member.id,
    tenantId: member.tenantId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    createdAt: now()
  };
  db.memberSessions.push(session);
  return { token, session };
}

export function findSessionByToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db.sessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const user = db.users.find((item) => item.id === session.userId && item.status === "active");
  return user ? { session, user } : null;
}

export function findMemberSessionByToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db.memberSessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const member = db.members.find((item) => item.id === session.memberId && item.status === "active");
  return member ? { session, member } : null;
}

export function removeSession(token) {
  const tokenHash = hashToken(token);
  const before = db.sessions.length;
  db.sessions = db.sessions.filter((item) => item.tokenHash !== tokenHash);
  return before !== db.sessions.length;
}

export function removeMemberSession(token) {
  const tokenHash = hashToken(token);
  const before = db.memberSessions.length;
  db.memberSessions = db.memberSessions.filter((item) => item.tokenHash !== tokenHash);
  return before !== db.memberSessions.length;
}

function cryptoRandomSuffix() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
