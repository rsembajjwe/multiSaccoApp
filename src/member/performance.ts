import type {
  TerekaFinancialTransaction,
  TerekaMobileMoneyCallback,
  TerekaMoney,
  TerekaOfflineDraft,
  TerekaGuarantorRequest,
  TerekaNotification,
  TerekaPaymentLifecycleRow,
  TerekaPaymentRequest,
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
  externalReference?: unknown;
  postedAt?: unknown;
  provider?: unknown;
  providerPayload?: { route?: unknown } | null;
  receiptNo?: unknown;
  receiptStatus?: unknown;
  reference?: unknown;
  route?: unknown;
  status?: unknown;
  description?: unknown;
  type?: unknown;
}

export interface TerekaPaymentLifecycleInput {
  dashboard: TerekaMemberStatementDashboard | null | undefined;
  drafts: TerekaOfflineDraft[];
  labelize: (value: unknown) => string;
  paymentRequests: TerekaPaymentRequest[];
}

export interface TerekaMemberGuarantorRow extends TerekaGuarantorRequest {
  action: string;
  actionId?: string;
  actionLabel: string;
  borrower: string;
  product: string;
  requestedAmount: unknown;
}

export interface TerekaMemberAdminMessageRow extends TerekaNotification {
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
}

export interface TerekaMemberMobileMoneyRow {
  postedAt: string;
  reference?: string;
  description: string;
  credit: unknown;
  paymentStatus: string;
  receiptStatus: string;
  status: string;
}

export interface TerekaMemberPaymentProviderOption {
  network: string;
  label: string;
  providerId: string;
}

export interface TerekaMemberDraftRow extends TerekaOfflineDraft {
  action: string;
  actionId?: string;
  actionLabel: string;
  amount: TerekaMoney;
  details: string;
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

export function buildMemberPaymentLifecycleRows(input: TerekaPaymentLifecycleInput): TerekaPaymentLifecycleRow[] {
  const requestRows = input.paymentRequests.map((request) => ({
    date: request.requestedAt || request.createdAt || "",
    reference: request.externalReference,
    description: `${input.labelize(request.purpose)} request`,
    paymentRoute: paymentRouteLabelFor(request),
    amount: Number(request.amount || 0),
    paymentStatus: paymentLifecycleStatusFor(request),
    receiptStatus: receiptLifecycleStatusFor(request),
  }));
  const postedRows = buildMemberStatementLines(input.dashboard)
    .filter((line) => Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0)
    .map((line) => ({
      date: line.postedAt || line.createdAt || "",
      reference: line.reference,
      description: line.description || "Member payment",
      paymentRoute: paymentRouteLabelFor(line),
      amount: Number(line.credit || 0) || Number(line.debit || 0),
      paymentStatus: paymentLifecycleStatusFor(line),
      receiptStatus: receiptLifecycleStatusFor(line),
    }));
  const draftRows = input.drafts.map((draft) => {
    const payload = (draft.payload || {}) as TerekaPaymentChannelLine & { amount?: unknown; externalReference?: unknown };
    const reference = payload.externalReference ? String(payload.externalReference) : draft.id;
    return {
      date: draft.updatedAt || draft.createdAt || "",
      reference,
      description: draft.title || "Payment draft",
      paymentRoute: paymentRouteLabelFor(payload),
      amount: Number(draft.amount || payload.amount || 0),
      paymentStatus: paymentLifecycleStatusFor(draft),
      receiptStatus: "Not receipted",
    };
  });
  return [...draftRows, ...requestRows, ...postedRows]
    .sort((a, b) => new Date(String(b.date || 0)).getTime() - new Date(String(a.date || 0)).getTime());
}

export function buildMemberGuarantorRows(requests: TerekaGuarantorRequest[]): TerekaMemberGuarantorRow[] {
  return requests.map((request) => {
    const pending = normalizePerformanceText(request.status) === "pending";
    return {
      ...request,
      borrower: request.loan?.memberName || request.loan?.membershipNo || request.loan?.memberId || "Borrower",
      product: request.loan?.product || request.product || "Loan",
      requestedAmount: request.loan?.amount || request.loan?.requestedAmount || 0,
      action: pending ? "member-guarantor" : "",
      actionLabel: pending ? "Decide" : "View",
      actionId: request.id,
    };
  });
}

export function buildMemberAdminMessageRows(notifications: TerekaNotification[]): TerekaMemberAdminMessageRow[] {
  return notifications.map((notification) => ({
    ...notification,
    title: notification.title || "SACCO admin message",
    message: notification.message || notification.body || "Message from SACCO administration",
    channel: notification.channel || "in-app",
    status: notification.status || (notification.readAt ? "read" : "unread"),
    createdAt: notification.createdAt || notification.sentAt || "",
  }));
}

export function buildMemberMobileMoneyRows(dashboard: TerekaMemberStatementDashboard | null | undefined): TerekaMemberMobileMoneyRow[] {
  return buildMemberStatementLines(dashboard)
    .filter((line) => isMobileMoneyPerformanceLine(line))
    .map((line) => ({
      postedAt: line.postedAt || line.createdAt || "",
      reference: line.reference,
      description: !line.description || line.description === "Member transaction" ? "Mobile money deposit" : line.description,
      credit: line.credit || line.amount || 0,
      paymentStatus: paymentLifecycleStatusFor(line),
      receiptStatus: receiptLifecycleStatusFor(line),
      status: line.status || "posted",
    }));
}

export function buildMemberPaymentProviderOptions(
  mobileMoneyCollectionAvailable: boolean,
  providers: unknown,
  labelize: (value: unknown) => string
): TerekaMemberPaymentProviderOption[] {
  if (!mobileMoneyCollectionAvailable) return [];
  const rows = Array.isArray(providers) ? providers : [];
  return rows
    .filter((provider): provider is { available?: boolean; label?: string; network?: string; providerId?: string } => Boolean(provider))
    .filter((provider) => provider.available !== false)
    .filter((provider) => normalizePerformanceText(provider.network || provider.providerId || "") !== "mpesa")
    .map((provider) => ({
      network: provider.network || "default",
      label: provider.label || labelize(provider.providerId || "Mobile money"),
      providerId: provider.providerId || provider.network || "default",
    }));
}

export function buildMemberDraftRows(
  drafts: TerekaOfflineDraft[],
  type: string,
  labelize: (value: unknown) => string
): TerekaMemberDraftRow[] {
  return drafts
    .filter((draft) => !type || draft.type === type)
    .map((draft) => {
      const payload = (draft.payload || {}) as {
        amount?: unknown;
        description?: unknown;
        externalReference?: unknown;
        provider?: unknown;
        purpose?: unknown;
      };
      const amount = typeof payload.amount === "number" || typeof payload.amount === "string" ? payload.amount : 0;
      return {
        ...draft,
        amount,
        details: draft.type === "payment"
          ? `${labelize(payload.purpose || "payment")} / ${payload.provider || "provider"} / ${payload.externalReference || "no reference"}`
          : String(payload.description || "Complaint case"),
        action: "member-draft",
        actionId: draft.id,
        actionLabel: "Sync",
      };
    });
}

export function buildMemberPaymentRequestRows(requests: TerekaPaymentRequest[]): Array<TerekaPaymentRequest & {
  action: string;
  actionId?: string;
  actionLabel: string;
}> {
  return requests.map((request) => ({
    ...request,
    action: "payment-provider-status",
    actionLabel: normalizePerformanceText(request.status) === "posted" ? "View status" : "Check status",
    actionId: request.id,
  }));
}

export function paymentRouteLabelFor(row: TerekaPaymentChannelLine): string {
  const text = normalizePerformanceText(
    `${row.route || ""} ${row.channel || ""} ${row.provider || ""} ${row.reference || ""} ${row.externalReference || ""} ${row.providerPayload?.route || ""}`
  );
  if (text.includes("treasurer") || text.includes("cash")) return "Treasurer cash";
  if (text.includes("mobile") || text.includes("mtn") || text.includes("airtel") || text.includes("mm-")) return "Mobile money";
  if (text.includes("bank")) return "Bank";
  return "Treasurer cash";
}

export function paymentLifecycleStatusFor(row: TerekaPaymentChannelLine): string {
  const text = normalizePerformanceText(`${row.status || ""} ${row.receiptStatus || ""}`);
  if (text.includes("failed")) return "Failed";
  if (text.includes("draft")) return "Draft";
  if (text.includes("pending") || text.includes("syncing")) {
    return paymentRouteLabelFor(row) === "Mobile money" ? "Pending mobile money" : "Pending posting";
  }
  if (text.includes("receipt ready") || text.includes("available") || text.includes("receipted")) return "Receipted";
  if (text.includes("posted") || text.includes("synced") || row.postedAt) return "Posted";
  return "Draft";
}

export function receiptLifecycleStatusFor(row: TerekaPaymentChannelLine): string {
  const text = normalizePerformanceText(`${row.receiptStatus || ""} ${row.status || ""}`);
  if (text.includes("failed")) return "Failed";
  if (text.includes("posted") || text.includes("available") || text.includes("receipt ready") || row.receiptNo) return "Receipted";
  if (text.includes("pending")) return "Pending posting";
  return "Not receipted";
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
