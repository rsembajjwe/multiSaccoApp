import type {
  TerekaFinancialTransaction,
  TerekaMobileMoneyCallback,
  TerekaRecord,
  TerekaStatementLine,
} from "../types/domain";

export interface TerekaMonthlyPerformanceRow {
  month: string;
  date?: string;
  memberId?: string;
  memberName: string;
  savingsDeposits: number;
  shareDeposits: number;
  welfareDeposits: number;
  loanRepayments: number;
  treasurerCash: number;
  mobileMoney: number;
  totalDeposits: number;
  closingBalance?: number;
  performanceId?: string;
  action?: string;
  actionLabel?: string;
  actionId?: string;
}

export interface TerekaMemberStatementDashboard {
  statementLines?: TerekaStatementLine[];
  recentTransactions?: TerekaStatementLine[];
}

export interface TerekaSaccoMonthlyPerformanceInput {
  transactions: Array<TerekaFinancialTransaction & TerekaRecord & { credit?: number | string; memberName?: string }>;
  callbacks: Array<TerekaMobileMoneyCallback & TerekaRecord & { memberId?: string; purpose?: string; receivedAt?: string }>;
  memberName: (memberId?: string) => string;
}

export interface TerekaPaymentChannelLine {
  channel?: unknown;
  provider?: unknown;
  reference?: unknown;
  description?: unknown;
  type?: unknown;
}

export function buildMemberStatementLines(dashboard: TerekaMemberStatementDashboard | null | undefined): TerekaStatementLine[] {
  const source = dashboard?.statementLines || dashboard?.recentTransactions || [];
  return source.map((line) => ({
    ...line,
    reference: line.reference || line.transactionReference || line.id,
    description: line.description || line.narration || line.type || "Member transaction",
    debit: line.debit ?? (Number(line.amount || 0) < 0 ? Math.abs(Number(line.amount || 0)) : 0),
    credit: line.credit ?? (Number(line.amount || 0) > 0 ? Number(line.amount || 0) : 0),
    runningBalance: line.runningBalance
      ?? Number(line.savingsBalance || 0) + Number(line.sharesBalance || 0) + Number(line.welfareBalance || 0),
    postedAt: line.postedAt || line.createdAt || line.date || "",
  }));
}

export function buildSaccoMonthlyPerformanceRows(input: TerekaSaccoMonthlyPerformanceInput): TerekaMonthlyPerformanceRow[] {
  const rows = new Map<string, TerekaMonthlyPerformanceRow>();
  const ensure = (month: string, memberId: string | undefined, memberLabel: string | undefined): TerekaMonthlyPerformanceRow => {
    const key = `${month}:${memberId || memberLabel || "unknown"}`;
    if (!rows.has(key)) {
      rows.set(key, emptyPerformanceRow(month, memberId, memberLabel || input.memberName(memberId)));
    }
    return rows.get(key) as TerekaMonthlyPerformanceRow;
  };

  input.transactions
    .filter((row) => normalizePerformanceText(row.status) === "posted")
    .forEach((transaction) => {
      const month = performanceMonthLabel(transaction.postedAt || transaction.createdAt);
      const target = ensure(month, transaction.memberId, transaction.memberName);
      const amount = Number(transaction.amount || transaction.credit || 0);
      addPerformanceAmount(target, transaction.type, amount);
      if (isMobileMoneyPerformanceLine(transaction)) target.mobileMoney += amount;
      else target.treasurerCash += amount;
    });

  input.callbacks
    .filter((callback) => normalizePerformanceText(callback.status) === "posted")
    .forEach((callback) => {
      const month = performanceMonthLabel(callback.receivedAt || callback.createdAt);
      const target = ensure(month, callback.memberId, input.memberName(callback.memberId));
      const amount = Number(callback.amount || 0);
      addPerformanceAmount(target, callback.purpose, amount);
      target.mobileMoney += amount;
    });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      performanceId: performanceRowId(row),
      action: "monthly-performance-detail",
      actionLabel: "Review",
      actionId: performanceRowId(row),
      totalDeposits: row.savingsDeposits + row.shareDeposits + row.welfareDeposits + row.loanRepayments,
    }))
    .sort((a, b) => b.month.localeCompare(a.month) || a.memberName.localeCompare(b.memberName));
}

export function buildMemberMonthlyPerformanceRows(dashboard: TerekaMemberStatementDashboard | null | undefined): TerekaMonthlyPerformanceRow[] {
  const rows = new Map<string, TerekaMonthlyPerformanceRow>();
  buildMemberStatementLines(dashboard).forEach((line) => {
    const month = performanceMonthLabel(line.postedAt || line.createdAt);
    if (!rows.has(month)) {
      rows.set(month, {
        ...emptyPerformanceRow(month, undefined, ""),
        date: performanceMonthEndDateLabel(month),
        closingBalance: 0,
      });
    }
    const target = rows.get(month) as TerekaMonthlyPerformanceRow;
    const amount = Number(line.credit || 0);
    addPerformanceAmount(target, `${line.description || ""} ${line.type || ""}`, amount);
    if (amount) {
      if (isMobileMoneyPerformanceLine(line)) target.mobileMoney += amount;
      else target.treasurerCash += amount;
    }
    target.totalDeposits = target.savingsDeposits + target.shareDeposits + target.welfareDeposits + target.loanRepayments;
    target.closingBalance = Number(line.runningBalance || target.closingBalance || 0);
  });
  return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export function addPerformanceAmount(target: TerekaMonthlyPerformanceRow, purpose: unknown, amount: number): void {
  const text = normalizePerformanceText(purpose);
  if (!amount) return;
  if (text.includes("loan") || text.includes("repayment")) target.loanRepayments += amount;
  else if (text.includes("share")) target.shareDeposits += amount;
  else if (text.includes("welfare")) target.welfareDeposits += amount;
  else target.savingsDeposits += amount;
}

export function performanceMonthLabel(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) return "Unknown month";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function performanceMonthEndDateLabel(month: unknown): string {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  if (!year || !monthNumber) return String(month || "");
  return new Date(year, monthNumber, 0).toISOString();
}

export function performanceRowId(row: Pick<TerekaMonthlyPerformanceRow, "memberName" | "month">): string {
  return `${row.month || ""}::${row.memberName || ""}`;
}

export function isMobileMoneyPerformanceLine(line: TerekaPaymentChannelLine): boolean {
  const text = normalizePerformanceText(
    `${line.channel || ""} ${line.provider || ""} ${line.reference || ""} ${line.description || ""} ${line.type || ""}`
  );
  return text.includes("mobile") || text.includes("mtn") || text.includes("airtel") || text.includes("mm-");
}

function emptyPerformanceRow(month: string, memberId: string | undefined, memberName: string): TerekaMonthlyPerformanceRow {
  return {
    month,
    memberId,
    memberName,
    savingsDeposits: 0,
    shareDeposits: 0,
    welfareDeposits: 0,
    loanRepayments: 0,
    treasurerCash: 0,
    mobileMoney: 0,
    totalDeposits: 0,
  };
}

function normalizePerformanceText(value: unknown): string {
  return String(value || "").toLowerCase();
}
