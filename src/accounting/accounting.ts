import type {
  TerekaAccountingPeriod,
  TerekaAsset,
  TerekaChartAccount,
  TerekaExpense,
  TerekaJournalEntry,
  TerekaMobileMoneyCallback,
  TerekaMoney,
  TerekaPaymentRequest,
  TerekaReconciliationData,
  TerekaRecord,
} from "../types/domain";

export interface TerekaAccountingSummary {
  accountCount: number;
  assetTotal: number;
  closedPeriods: number;
  expenseTotal: number;
  journalCount: number;
  openPeriods: number;
  periodCount: number;
  unbalancedCount: number;
}

export interface TerekaAccountingSummaryInput {
  accounts: TerekaChartAccount[];
  assets: Array<TerekaAsset & TerekaRecord>;
  expenses: Array<TerekaExpense & TerekaRecord>;
  journals: Array<TerekaJournalEntry & TerekaRecord>;
  periods: TerekaAccountingPeriod[];
}

export interface TerekaPaymentRequestReviewRow extends TerekaPaymentRequest, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  reviewStatus: string;
}

export interface TerekaReconciliationMatchRow {
  accountCode?: unknown;
  externalReference?: unknown;
  ledgerAmount?: unknown;
  postedAt?: unknown;
  sourceType?: unknown;
  statementAmount?: unknown;
}

export interface TerekaReconciliationReviewModel {
  callbackExceptions: Array<TerekaMobileMoneyCallback & TerekaRecord>;
  exceptionCount: number;
  failedPaymentRequests: Array<TerekaPaymentRequest & TerekaRecord>;
  matches: TerekaRecord[];
  matchedCoverage: number;
  paymentRequestRows: TerekaPaymentRequestReviewRow[];
  pendingPaymentRequests: Array<TerekaPaymentRequest & TerekaRecord>;
  summaryData: TerekaRecord;
  unmatchedLedgerLines: TerekaRecord[];
  unmatchedStatementLines: TerekaRecord[];
}

export function buildAccountingSummary(input: TerekaAccountingSummaryInput): TerekaAccountingSummary {
  const unbalanced = input.journals.filter((journal) => journal.isBalanced === false || Number(journal.debitTotal || 0) !== Number(journal.creditTotal || 0));
  return {
    accountCount: input.accounts.length,
    assetTotal: sumAccountingMoney(input.assets, "netBookValue", "cost"),
    closedPeriods: input.periods.filter((period) => normalizeAccountingText(period.status) === "closed").length,
    expenseTotal: sumAccountingMoney(input.expenses, "amount"),
    journalCount: input.journals.length,
    openPeriods: input.periods.filter((period) => normalizeAccountingText(period.status) === "open").length,
    periodCount: input.periods.length,
    unbalancedCount: unbalanced.length,
  };
}

export function buildReconciliationReviewModel(input: {
  callbacks: Array<TerekaMobileMoneyCallback & TerekaRecord>;
  labelize: (value: unknown) => string;
  paymentRequests: Array<TerekaPaymentRequest & TerekaRecord>;
  reconciliation: TerekaReconciliationData | null | undefined;
}): TerekaReconciliationReviewModel {
  const reconciliation = input.reconciliation || {};
  const summaryData = (reconciliation.summary || {}) as TerekaRecord;
  const matches = Array.isArray(reconciliation.matches) ? reconciliation.matches as TerekaRecord[] : [];
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines as TerekaRecord[] : [];
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines as TerekaRecord[] : [];
  const callbackExceptions = input.callbacks.filter((row) => !normalizeAccountingText(row.status).includes("posted") || row.duplicate);
  const pendingPaymentRequests = input.paymentRequests.filter((row) => !normalizeAccountingText(row.status).includes("posted"));
  const failedPaymentRequests = input.paymentRequests.filter((row) => ["failed", "expired", "cancelled"].includes(normalizeAccountingText(row.status)));
  const exceptionCount = Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length)
    + Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length)
    + callbackExceptions.length
    + pendingPaymentRequests.length;
  return {
    callbackExceptions,
    exceptionCount,
    failedPaymentRequests,
    matches,
    matchedCoverage: reconciliationCoverage(summaryData),
    paymentRequestRows: buildPaymentRequestReviewRows(input.paymentRequests, input.labelize),
    pendingPaymentRequests,
    summaryData,
    unmatchedLedgerLines,
    unmatchedStatementLines,
  };
}

export function buildPaymentRequestReviewRows(
  requests: Array<TerekaPaymentRequest & TerekaRecord> | null | undefined,
  labelize: (value: unknown) => string,
): TerekaPaymentRequestReviewRow[] {
  const terminalStatuses = new Set(["posted", "failed", "expired", "cancelled"]);
  return (requests || []).map((row) => {
    const status = normalizeAccountingText(row.status);
    const open = !terminalStatuses.has(status);
    const providerIssue = normalizeAccountingText(row.statusMessage).includes("provider status check failed");
    return {
      ...row,
      reviewStatus: providerIssue ? "Provider check failed" : open ? "Needs provider check" : labelize(row.status || "closed"),
      action: open ? "payment-provider-status" : "none",
      actionLabel: open ? "Check status" : "Closed",
      actionId: row.id,
    };
  });
}

export function buildReconciliationMatchRows(matches: TerekaRecord[] | null | undefined): TerekaReconciliationMatchRow[] {
  return (matches || []).map((match) => {
    const statementLine = (match.statementLine || {}) as TerekaRecord;
    const ledgerLine = (match.ledgerLine || {}) as TerekaRecord;
    return {
      externalReference: statementLine.externalReference || ledgerLine.reference,
      statementAmount: statementLine.amount,
      ledgerAmount: ledgerLine.amount,
      accountCode: statementLine.accountCode || ledgerLine.accountCode,
      sourceType: ledgerLine.sourceType,
      postedAt: ledgerLine.postedAt || statementLine.statementDate,
    };
  });
}

export function reconciliationCoverage(summaryData: TerekaRecord): number {
  const statementTotal = Number(summaryData.statementLines || 0);
  const ledgerTotal = Number(summaryData.ledgerLines || 0);
  const matched = Number(summaryData.matched || 0);
  return Math.round((matched / Math.max(statementTotal, ledgerTotal, 1)) * 100);
}

function sumAccountingMoney(rows: TerekaRecord[], ...keys: string[]): number {
  return rows.reduce((total, row) => {
    const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    return total + Number((value as TerekaMoney) || 0);
  }, 0);
}

function normalizeAccountingText(value: unknown): string {
  return String(value || "").toLowerCase();
}
