import type { TerekaFinancialTransaction, TerekaLoan, TerekaMemberProfile, TerekaRecord } from "../types/domain";

export interface TerekaLoanRepaymentApprovalRow extends TerekaRecord {
  memberId?: string;
  memberName?: string;
}

export interface TerekaLoanApprovalRow extends TerekaLoan, TerekaRecord {
  memberName?: string;
}

export interface TerekaMemberApprovalRow extends TerekaMemberProfile, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  memberName?: string;
}

export interface TerekaApprovalQueueModel {
  loans: TerekaLoanApprovalRow[];
  members: TerekaMemberApprovalRow[];
  pendingRepayments: TerekaLoanRepaymentApprovalRow[];
  pendingTransactions: Array<TerekaFinancialTransaction & TerekaRecord>;
  viewOnlyQueue: TerekaRecord[];
}

export interface TerekaApprovalQueueSummary {
  loansToApprove: number;
  membersToVerify: number;
  repaymentsToApprove: number;
  transactionsToApprove: number;
}

export function buildApprovalQueueModel(input: {
  isPlatform: boolean;
  loans: Array<TerekaLoan & TerekaRecord>;
  memberName: (memberId?: string) => string;
  members: Array<TerekaMemberProfile & TerekaRecord>;
  pendingRepayments: Array<TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
}): TerekaApprovalQueueModel {
  const pendingTransactions = input.transactions.filter((row) => normalizeApprovalText(row.status).includes("pending"));
  const pendingRepayments = input.pendingRepayments.map((row) => ({ ...row, memberName: input.memberName(String(row.memberId || "")) }));
  const loans = input.isPlatform
    ? []
    : input.loans
      .filter((row) => normalizeApprovalText(row.status).includes("review") || normalizeApprovalText(row.status).includes("submitted"))
      .map((row) => ({ ...row, memberName: row.memberName || input.memberName(row.memberId) }));
  const members = input.isPlatform
    ? []
    : input.members
      .filter((row) => normalizeApprovalText(row.status).includes("pending"))
      .map((row) => ({
        ...row,
        memberName: row.fullName,
        action: "member-detail",
        actionLabel: "Review",
        actionId: row.id,
      }));
  return {
    loans,
    members,
    pendingRepayments,
    pendingTransactions,
    viewOnlyQueue: [...pendingTransactions, ...pendingRepayments, ...loans, ...members],
  };
}

export function buildApprovalQueueSummary(model: TerekaApprovalQueueModel): TerekaApprovalQueueSummary {
  return {
    loansToApprove: model.loans.length,
    membersToVerify: model.members.length,
    repaymentsToApprove: model.pendingRepayments.length,
    transactionsToApprove: model.pendingTransactions.length,
  };
}

function normalizeApprovalText(value: unknown): string {
  return String(value || "").toLowerCase();
}
