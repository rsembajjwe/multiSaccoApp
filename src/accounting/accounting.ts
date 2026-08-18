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

export interface TerekaAccountingAccountOption extends TerekaRecord {
  code?: string;
  label: string;
  name?: string;
  type?: string;
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

export function accountingAccountOptions(accounts: Array<TerekaChartAccount & TerekaRecord>, type: string, excludedCodes: string[] = []): TerekaAccountingAccountOption[] {
  const excluded = new Set(excludedCodes.map((code) => normalizeAccountingText(code)));
  return accounts
    .filter((account) => normalizeAccountingText(account.type) === normalizeAccountingText(type))
    .filter((account) => !excluded.has(normalizeAccountingText(account.code)))
    .map((account) => ({
      ...account,
      code: account.code,
      name: account.name,
      type: account.type,
      label: `${account.code || ""} - ${account.name || ""}`.trim(),
    }));
}

export function assetCategoryOptions(): string[] {
  return ["equipment", "furniture", "vehicle", "building", "technology", "other"];
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

export interface TerekaLedgerAccountBalance {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  net: number;
}

export interface TerekaTrialBalanceRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}

export interface TerekaTrialBalance {
  rows: TerekaTrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface TerekaStatementItem {
  code: string;
  name: string;
  amount: number;
}

export interface TerekaIncomeStatement {
  income: TerekaStatementItem[];
  expenses: TerekaStatementItem[];
  totalIncome: number;
  totalExpense: number;
  netSurplus: number;
}

export interface TerekaBalanceSheet {
  assets: TerekaStatementItem[];
  liabilities: TerekaStatementItem[];
  equity: TerekaStatementItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netSurplus: number;
  balanced: boolean;
}

/**
 * Aggregates posted journal-entry lines into a net debit/credit balance per ledger account, joining to
 * the chart of accounts for account name/type. This is the shared basis for the trial balance and the
 * income statement / balance sheet.
 */
export function buildLedgerAccountBalances(
  journals: TerekaRecord[] | null | undefined,
  accounts: TerekaRecord[] | null | undefined,
): TerekaLedgerAccountBalance[] {
  const chart = new Map<string, { name: string; type: string }>();
  (accounts || []).forEach((account) => {
    const code = String(account.code ?? "");
    if (code) chart.set(code, { name: String(account.name ?? code), type: normalizeAccountingText(account.type) });
  });
  const totals = new Map<string, { debit: number; credit: number }>();
  (journals || [])
    .filter((journal) => normalizeAccountingText(journal.status) === "posted")
    .forEach((journal) => {
      const lines = Array.isArray(journal.lines) ? (journal.lines as TerekaRecord[]) : [];
      lines.forEach((line) => {
        const code = String(line.accountCode ?? "");
        if (!code) return;
        const running = totals.get(code) || { debit: 0, credit: 0 };
        running.debit += Number(line.debit || 0);
        running.credit += Number(line.credit || 0);
        totals.set(code, running);
        if (!chart.has(code)) {
          chart.set(code, { name: String(line.accountName ?? code), type: normalizeAccountingText(line.accountType) });
        }
      });
    });
  return [...totals.entries()]
    .map(([code, running]) => {
      const meta = chart.get(code) || { name: code, type: "" };
      return { code, name: meta.name, type: meta.type, debit: running.debit, credit: running.credit, net: running.debit - running.credit };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function buildTrialBalance(
  journals: TerekaRecord[] | null | undefined,
  accounts: TerekaRecord[] | null | undefined,
): TerekaTrialBalance {
  const rows = buildLedgerAccountBalances(journals, accounts)
    .filter((balance) => Math.abs(balance.debit) > 0.005 || Math.abs(balance.credit) > 0.005)
    .map((balance) => ({
      code: balance.code,
      name: balance.name,
      type: balance.type,
      debit: balance.net > 0 ? balance.net : 0,
      credit: balance.net < 0 ? -balance.net : 0,
    }));
  const totalDebit = rows.reduce((total, row) => total + row.debit, 0);
  const totalCredit = rows.reduce((total, row) => total + row.credit, 0);
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

export function buildIncomeStatement(
  journals: TerekaRecord[] | null | undefined,
  accounts: TerekaRecord[] | null | undefined,
): TerekaIncomeStatement {
  const balances = buildLedgerAccountBalances(journals, accounts);
  // Income accounts are credit-normal (income = credit − debit = −net); expenses are debit-normal (= net).
  const income = balances
    .filter((balance) => balance.type === "income")
    .map((balance) => ({ code: balance.code, name: balance.name, amount: -balance.net }))
    .filter((item) => Math.abs(item.amount) > 0.005);
  const expenses = balances
    .filter((balance) => balance.type === "expense")
    .map((balance) => ({ code: balance.code, name: balance.name, amount: balance.net }))
    .filter((item) => Math.abs(item.amount) > 0.005);
  const totalIncome = income.reduce((total, item) => total + item.amount, 0);
  const totalExpense = expenses.reduce((total, item) => total + item.amount, 0);
  return { income, expenses, totalIncome, totalExpense, netSurplus: totalIncome - totalExpense };
}

export function buildBalanceSheet(
  journals: TerekaRecord[] | null | undefined,
  accounts: TerekaRecord[] | null | undefined,
): TerekaBalanceSheet {
  const balances = buildLedgerAccountBalances(journals, accounts);
  const assets = balances
    .filter((balance) => balance.type === "asset")
    .map((balance) => ({ code: balance.code, name: balance.name, amount: balance.net }))
    .filter((item) => Math.abs(item.amount) > 0.005);
  const liabilities = balances
    .filter((balance) => balance.type === "liability")
    .map((balance) => ({ code: balance.code, name: balance.name, amount: -balance.net }))
    .filter((item) => Math.abs(item.amount) > 0.005);
  const equityAccounts = balances
    .filter((balance) => balance.type === "equity")
    .map((balance) => ({ code: balance.code, name: balance.name, amount: -balance.net }))
    .filter((item) => Math.abs(item.amount) > 0.005);
  const netSurplus = buildIncomeStatement(journals, accounts).netSurplus;
  // Current-period surplus/deficit accrues to equity so the sheet balances.
  const equity = Math.abs(netSurplus) > 0.005
    ? [...equityAccounts, { code: "", name: "Current period surplus", amount: netSurplus }]
    : equityAccounts;
  const totalAssets = assets.reduce((total, item) => total + item.amount, 0);
  const totalLiabilities = liabilities.reduce((total, item) => total + item.amount, 0);
  const totalEquity = equity.reduce((total, item) => total + item.amount, 0);
  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netSurplus,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
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
