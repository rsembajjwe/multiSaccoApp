import type {
  TerekaAuditEvent,
  TerekaComplaintThread,
  TerekaExpense,
  TerekaFinancialAccount,
  TerekaFinancialTransaction,
  TerekaLoan,
  TerekaMemberProfile,
  TerekaMobileMoneyCallback,
  TerekaRecord,
} from "../types/domain";

export interface TerekaSaccoAdminDashboardSummary {
  mobileMoneyCollections: number;
  outstandingLoans: number;
  pendingApprovals: number;
  totalMembers: number;
  totalSavings: number;
}

export interface TerekaSaccoAccountantDashboardSummary {
  expensesPosted: number;
  journalEntries: number;
  reconciliationExceptions: number;
  reports: number;
}

export interface TerekaSaccoTellerDashboardModel {
  awaitingApproval: number;
  members: number;
  myCaptures: Array<TerekaFinancialTransaction & TerekaRecord>;
  myCaptureCount: number;
}

export interface TerekaSaccoLoansOfficerDashboardModel {
  arrears: Array<TerekaLoan & TerekaRecord>;
  arrearsWatch: number;
  awaitingApproval: number;
  loanApplications: number;
  needGuarantor: Array<TerekaLoan & TerekaRecord>;
  needGuarantorCount: number;
  submitted: Array<TerekaLoan & TerekaRecord>;
}

export interface TerekaSaccoAuditorDashboardModel {
  auditEvents: number;
  highValue: Array<TerekaFinancialTransaction & TerekaRecord>;
  highValueTransactions: number;
  reports: number;
  reversals: Array<TerekaFinancialTransaction & TerekaRecord>;
  reversalCount: number;
}

export interface TerekaSaccoChairpersonDashboardModel {
  approvalLoans: Array<TerekaLoan & TerekaRecord>;
  arrearsLoans: Array<TerekaLoan & TerekaRecord>;
  arrearsWatch: number;
  governanceActions: number;
  highValueTransactions: Array<TerekaFinancialTransaction & TerekaRecord>;
  loansAwaitingApproval: number;
  outstandingPortfolio: number;
}

export interface TerekaSaccoTreasurerDashboardModel {
  collections: number;
  failedCallbacks: Array<TerekaMobileMoneyCallback & TerekaRecord>;
  mobileMoney: number;
  mobileMoneyExceptions: number;
  pendingApprovals: number;
  treasurerCash: number;
  totalSavings: number;
}

export interface TerekaSaccoSecretaryDashboardModel {
  governanceRecords: number;
  membersToVerify: number;
  openComplaints: number;
  pendingKyc: Array<TerekaMemberProfile & TerekaRecord>;
  totalMembers: number;
}

export function buildSaccoAdminDashboardSummary(input: {
  loans: Array<TerekaLoan & TerekaRecord>;
  members: Array<TerekaMemberProfile & TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
}): TerekaSaccoAdminDashboardSummary {
  return {
    mobileMoneyCollections: sumSaccoValues(input.transactions.filter((transaction) => normalizeSaccoText(transaction.channel).includes("mobile")), "amount"),
    outstandingLoans: sumSaccoValues(input.loans, "outstandingBalance", "balance"),
    pendingApprovals: pendingSaccoTransactions(input.transactions).length,
    totalMembers: input.members.length,
    totalSavings: sumSaccoValues(input.members, "savingsBalance", "savings"),
  };
}

export function buildSaccoAccountantDashboardSummary(input: {
  chartOfAccounts: Array<TerekaRecord>;
  expenses: Array<TerekaExpense & TerekaRecord>;
  journalEntries: Array<TerekaRecord>;
  reconciliation: TerekaRecord | null | undefined;
}): TerekaSaccoAccountantDashboardSummary {
  const reconciliation = input.reconciliation || {};
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines.length : 0;
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines.length : 0;
  return {
    expensesPosted: sumSaccoValues(input.expenses, "amount", "totalAmount"),
    journalEntries: input.journalEntries.length,
    reconciliationExceptions: unmatchedStatementLines + unmatchedLedgerLines,
    reports: input.chartOfAccounts.length,
  };
}

export function buildSaccoTellerDashboardModel(input: {
  currentUserId?: string;
  members: Array<TerekaMemberProfile & TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
}): TerekaSaccoTellerDashboardModel {
  const myCaptures = input.transactions.filter((row) => row.makerUserId === input.currentUserId);
  return {
    awaitingApproval: pendingSaccoTransactions(myCaptures).length,
    members: input.members.length,
    myCaptures,
    myCaptureCount: myCaptures.length,
  };
}

export function buildSaccoLoansOfficerDashboardModel(loans: Array<TerekaLoan & TerekaRecord>): TerekaSaccoLoansOfficerDashboardModel {
  const submitted = loans.filter((row) => ["submitted", "review", "pending"].some((word) => normalizeSaccoText(row.status).includes(word)));
  const arrears = loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normalizeSaccoText(`${row.status} ${row.scheduleStatus}`).includes(word)));
  const needGuarantor = submitted.filter((row) => Number(row.guarantors || 0) < 1);
  return {
    arrears,
    arrearsWatch: arrears.length,
    awaitingApproval: submitted.length,
    loanApplications: loans.length,
    needGuarantor,
    needGuarantorCount: needGuarantor.length,
    submitted,
  };
}

export function buildSaccoAuditorDashboardModel(input: {
  auditEvents: Array<TerekaAuditEvent & TerekaRecord>;
  chartOfAccounts: Array<TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
}): TerekaSaccoAuditorDashboardModel {
  const reversals = input.transactions.filter((row) => row.originalTransactionId || normalizeSaccoText(row.status).includes("reversed"));
  const highValue = highValueSaccoTransactions(input.transactions);
  return {
    auditEvents: input.auditEvents.length,
    highValue,
    highValueTransactions: highValue.length,
    reports: input.chartOfAccounts.length,
    reversals,
    reversalCount: reversals.length,
  };
}

export function buildSaccoChairpersonDashboardModel(input: {
  governanceMeetings: Array<TerekaRecord>;
  loans: Array<TerekaLoan & TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
}): TerekaSaccoChairpersonDashboardModel {
  const approvalLoans = input.loans.filter((row) => ["pending", "review", "approval", "submitted"].some((word) => normalizeSaccoText(`${row.status} ${row.stage}`).includes(word)));
  const arrearsLoans = input.loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normalizeSaccoText(`${row.status} ${row.riskLevel}`).includes(word)));
  return {
    approvalLoans,
    arrearsLoans,
    arrearsWatch: arrearsLoans.length,
    governanceActions: input.governanceMeetings.length,
    highValueTransactions: highValueSaccoTransactions(input.transactions),
    loansAwaitingApproval: approvalLoans.length,
    outstandingPortfolio: sumSaccoValues(input.loans, "outstandingBalance", "balance"),
  };
}

export function buildSaccoTreasurerDashboardModel(input: {
  callbacks: Array<TerekaMobileMoneyCallback & TerekaRecord>;
  members: Array<TerekaMemberProfile & TerekaRecord>;
  pendingTransactions: Array<TerekaFinancialTransaction & TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
}): TerekaSaccoTreasurerDashboardModel {
  const failedCallbacks = input.callbacks.filter((row) => ["failed", "exception", "pending"].some((word) => normalizeSaccoText(row.status).includes(word)));
  const treasurerCashRows = input.transactions.filter((row) => normalizeSaccoText(`${row.channel || ""} ${row.paymentRoute || ""} ${row.provider || ""}`).includes("cash"));
  const mobileMoneyRows = input.transactions.filter((row) => normalizeSaccoText(`${row.channel || ""} ${row.paymentRoute || ""} ${row.provider || ""}`).includes("mobile"));
  return {
    collections: sumSaccoValues(input.transactions.filter((row) => Number(row.credit || 0) > 0), "credit", "amount"),
    failedCallbacks,
    mobileMoney: sumSaccoValues(mobileMoneyRows, "credit", "amount"),
    mobileMoneyExceptions: failedCallbacks.length,
    pendingApprovals: input.pendingTransactions.length,
    treasurerCash: sumSaccoValues(treasurerCashRows, "credit", "amount"),
    totalSavings: sumSaccoValues(input.members, "savingsBalance", "savings"),
  };
}

export function buildSaccoSecretaryDashboardModel(input: {
  complaints: Array<TerekaComplaintThread & TerekaRecord>;
  governanceMeetings: Array<TerekaRecord>;
  members: Array<TerekaMemberProfile & TerekaRecord>;
}): TerekaSaccoSecretaryDashboardModel {
  const pendingKyc = input.members.filter((row) => normalizeSaccoText(row.kycStatus).includes("pending") || normalizeSaccoText(row.status).includes("pending"));
  return {
    governanceRecords: input.governanceMeetings.length,
    membersToVerify: pendingKyc.length,
    openComplaints: input.complaints.length,
    pendingKyc,
    totalMembers: input.members.length,
  };
}

function pendingSaccoTransactions(rows: Array<TerekaFinancialTransaction & TerekaRecord>): Array<TerekaFinancialTransaction & TerekaRecord> {
  return rows.filter((row) => normalizeSaccoText(row.status).includes("pending"));
}

function highValueSaccoTransactions(rows: Array<TerekaFinancialTransaction & TerekaRecord>): Array<TerekaFinancialTransaction & TerekaRecord> {
  return rows.filter((row) => Number(row.amount || row.credit || row.debit || 0) >= 1000000);
}

function sumSaccoValues(rows: Array<TerekaRecord>, ...keys: string[]): number {
  return rows.reduce((total, row) => {
    const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    return total + Number(value || 0);
  }, 0);
}

function normalizeSaccoText(value: unknown): string {
  return String(value || "").toLowerCase();
}
