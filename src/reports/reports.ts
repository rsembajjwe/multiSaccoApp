import type {
  TerekaAsset,
  TerekaComplaintThread,
  TerekaExpense,
  TerekaFinancialTransaction,
  TerekaLoan,
  TerekaMemberProfile,
  TerekaPlatformUser,
  TerekaRecord,
  TerekaRegulatoryReport,
  TerekaRegulatoryReportRow,
  TerekaSubscription,
  TerekaTenantSummary,
} from "../types/domain";

export interface TerekaReportCatalogueItem {
  action: string;
  copy: string;
  output: string;
  owner: string;
  title: string;
}

export interface TerekaRegulatoryReportDisplayRow extends TerekaRegulatoryReportRow, TerekaRecord {
  completedPrivacyRequests?: number;
  dataProtectionStatus?: string;
  erasureRequestsCompleted?: number;
  kycDisposed?: number;
  kycDocuments?: number;
  kycRetained?: number;
  kycReviewDue?: number;
  kycStorageActions?: number;
  openPrivacyRequests?: number;
  openResolutions?: number;
  privacyRequests?: number;
}

export interface TerekaRegulatoryReportRowsInput {
  assets: Array<TerekaAsset & TerekaRecord>;
  complaints: Array<TerekaComplaintThread & TerekaRecord>;
  currentTenantId?: string;
  expenses: Array<TerekaExpense & TerekaRecord>;
  labelize: (value: unknown) => string;
  loans: Array<TerekaLoan & TerekaRecord>;
  members: Array<TerekaMemberProfile & TerekaRecord>;
  platform: boolean;
  report: TerekaRegulatoryReport | null | undefined;
  selectedTenantId?: string;
  tenantName: (tenantId?: string) => string;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
}

export interface TerekaPlatformReportSummaryInput {
  complaints: Array<TerekaComplaintThread & TerekaRecord>;
  subscriptions: Array<TerekaSubscription & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
  users: Array<TerekaPlatformUser & TerekaRecord>;
}

export interface TerekaPlatformReportSummary {
  activeSaccos: number;
  expiredSubscriptions: number;
  failedPayments: number;
  openSaccoComplaints: number;
  pendingRegistrations: number;
  platformAdministrators: number;
  registeredSaccos: number;
  subscriptionRevenue: number;
}

export function buildRegulatoryReportRows(input: TerekaRegulatoryReportRowsInput): TerekaRegulatoryReportDisplayRow[] {
  const rawRows = Array.isArray(input.report?.reports) ? input.report.reports : [];
  const rows = rawRows.length ? rawRows : buildFallbackRegulatoryRows(input);
  const scopedRows = input.platform
    ? rows
    : rows.filter((row) => !row.tenantId || row.tenantId === input.currentTenantId || row.tenantId === input.selectedTenantId);

  return scopedRows.map((row) => ({
    ...row,
    tenantName: row.tenantName || input.tenantName(row.tenantId),
    privacyRequests: row.dataProtectionEvidence?.privacyRequests || 0,
    openPrivacyRequests: row.dataProtectionEvidence?.openPrivacyRequests || 0,
    completedPrivacyRequests: row.dataProtectionEvidence?.completedPrivacyRequests || 0,
    erasureRequestsCompleted: row.dataProtectionEvidence?.erasureRequestsCompleted || 0,
    kycDocuments: row.dataProtectionEvidence?.kycDocuments || 0,
    kycReviewDue: row.dataProtectionEvidence?.kycDocumentsReviewDue || 0,
    kycRetained: row.dataProtectionEvidence?.kycDocumentsRetained || 0,
    kycDisposed: row.dataProtectionEvidence?.kycDocumentsDisposed || 0,
    kycStorageActions: row.dataProtectionEvidence?.kycStorageActions || 0,
    dataProtectionStatus: input.labelize(row.dataProtectionEvidence?.evidenceStatus || "review"),
  }));
}

export function buildRegulatoryConsolidatedReport(input: {
  currentTenantId?: string;
  platform: boolean;
  report: TerekaRegulatoryReport | null | undefined;
  rows: TerekaRegulatoryReportDisplayRow[];
}): TerekaRegulatoryReportDisplayRow {
  const report = input.report || {};
  if (report.consolidated && (input.platform || report.consolidated.tenantId === input.currentTenantId || report.reports?.length === 1)) {
    return report.consolidated as TerekaRegulatoryReportDisplayRow;
  }
  return {
    memberCount: sumReportValues(input.rows, "memberCount"),
    activeMembers: sumReportValues(input.rows, "activeMembers"),
    savings: sumReportValues(input.rows, "savings"),
    shares: sumReportValues(input.rows, "shares"),
    welfare: sumReportValues(input.rows, "welfare"),
    loanPortfolio: sumReportValues(input.rows, "loanPortfolio"),
    activeLoans: sumReportValues(input.rows, "activeLoans"),
    expenseTotal: sumReportValues(input.rows, "expenseTotal"),
    assetNetBookValue: sumReportValues(input.rows, "assetNetBookValue"),
    journalEntries: sumReportValues(input.rows, "journalEntries"),
    unbalancedJournalEntries: sumReportValues(input.rows, "unbalancedJournalEntries"),
    reconciliationExceptions: sumReportValues(input.rows, "reconciliationExceptions"),
    openComplaints: sumReportValues(input.rows, "openComplaints"),
    openResolutions: sumReportValues(input.rows, "openResolutions"),
    dataProtectionEvidence: {
      privacyRequests: sumReportValues(input.rows, "privacyRequests"),
      openPrivacyRequests: sumReportValues(input.rows, "openPrivacyRequests"),
      completedPrivacyRequests: sumReportValues(input.rows, "completedPrivacyRequests"),
      erasureRequestsCompleted: sumReportValues(input.rows, "erasureRequestsCompleted"),
      kycDocuments: sumReportValues(input.rows, "kycDocuments"),
      kycDocumentsReviewDue: sumReportValues(input.rows, "kycReviewDue"),
      kycDocumentsRetained: sumReportValues(input.rows, "kycRetained"),
      kycDocumentsDisposed: sumReportValues(input.rows, "kycDisposed"),
      kycStorageActions: sumReportValues(input.rows, "kycStorageActions"),
      evidenceStatus: input.rows.some((row) => normalizeReportText(row.dataProtectionStatus) !== "ready") ? "review" : "ready",
    },
    complianceStatus: input.rows.some((row) => normalizeReportText(row.complianceStatus) !== "clear") ? "review" : "clear",
  };
}

export function reportExceptionCount(consolidated: TerekaRegulatoryReportRow): number {
  return Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
}

export function buildReportCatalogue(platform: boolean): TerekaReportCatalogueItem[] {
  if (platform) {
    return [
      { title: "SACCO account register", copy: "Registered SACCOs, generated codes, activation status, contact details and member ranges.", owner: "Super Admin", output: "PDF / Excel", action: "Open SACCO accounts" },
      { title: "Registration pipeline", copy: "Platform-created registrations, self-service applications, payment status and approval outcomes.", owner: "Super Admin", output: "Onboarding pack", action: "Open applications" },
      { title: "Subscription control", copy: "Packages, billable members, received payments, arrears, renewals and operating eligibility.", owner: "Super Admin", output: "Billing pack", action: "Open billing" },
      { title: "Platform administrator access", copy: "Administrator accounts, assigned roles, module access, status and last-login review.", owner: "Super Admin", output: "Access review", action: "Open users" },
      { title: "SACCO support escalations", copy: "Complaints raised by SACCO administrators, unresolved cases and escalation status.", owner: "Super Admin", output: "Support report", action: "Open complaints" },
      { title: "Compliance and audit", copy: "Regulatory consolidation, reconciliation exceptions, sensitive activity and role changes.", owner: "Super Admin", output: "Audit pack", action: "Open audit" },
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
    { title: "Audit", copy: "User activity, approvals, reversals and high-risk operational events.", owner: "Auditor", output: "Audit pack", action: "Open audit" },
  ];
}

export function buildPlatformReportSummary(input: TerekaPlatformReportSummaryInput): TerekaPlatformReportSummary {
  return {
    activeSaccos: input.tenants.filter((tenant) => normalizeReportText(tenant.status) === "active").length,
    expiredSubscriptions: input.subscriptions.filter((row) => normalizeReportText(row.status).includes("expired")).length,
    failedPayments: input.transactions.filter((transaction) => normalizeReportText(transaction.status).includes("failed")).length,
    openSaccoComplaints: input.complaints.filter((ticket) => !["closed", "resolved"].includes(normalizeReportText(ticket.status))).length,
    pendingRegistrations: input.tenants.filter((tenant) => normalizeReportText(tenant.status).includes("pending")).length,
    platformAdministrators: input.users.length,
    registeredSaccos: input.tenants.length,
    subscriptionRevenue: sumReportValues(input.subscriptions, "amount"),
  };
}

function buildFallbackRegulatoryRows(input: TerekaRegulatoryReportRowsInput): TerekaRegulatoryReportDisplayRow[] {
  return input.tenants.map((tenant) => {
    const tenantId = String(tenant.id || "");
    const tenantMembers = input.members.filter((member) => member.tenantId === tenantId);
    const tenantLoans = input.loans.filter((loan) => loan.tenantId === tenantId);
    return {
      tenantId,
      tenantName: tenant.name,
      memberCount: tenantMembers.length,
      activeMembers: tenantMembers.filter((member) => normalizeReportText(member.status) === "active").length,
      savings: sumReportValues(tenantMembers, "savingsBalance", "savings"),
      shares: sumReportValues(tenantMembers, "sharesBalance", "shares"),
      welfare: sumReportValues(tenantMembers, "welfareBalance", "welfare"),
      loanPortfolio: sumReportValues(tenantLoans, "outstandingBalance", "balance", "amount"),
      activeLoans: tenantLoans.filter((loan) => !["rejected", "closed"].includes(normalizeReportText(loan.status))).length,
      expenseTotal: sumReportValues(input.expenses.filter((expense) => expense.tenantId === tenantId), "amount"),
      assetNetBookValue: sumReportValues(input.assets.filter((asset) => asset.tenantId === tenantId), "netBookValue", "cost"),
      reconciliationExceptions: 0,
      openComplaints: input.complaints.filter((complaint) => complaint.tenantId === tenantId && !["resolved", "closed"].includes(normalizeReportText(complaint.status))).length,
      complianceStatus: "local fallback",
    };
  });
}

function sumReportValues(rows: TerekaRecord[], ...keys: string[]): number {
  return rows.reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + Number(row[key] || 0), 0), 0);
}

function normalizeReportText(value: unknown): string {
  return String(value || "").toLowerCase();
}
