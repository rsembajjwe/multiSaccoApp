import type { TerekaFinancialTransaction, TerekaMoney, TerekaRecord } from "../types/domain";
import {
  paymentLifecycleStatusFor,
  paymentRouteLabelFor,
} from "../member/performance";

export interface TerekaTransactionRow extends TerekaFinancialTransaction, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalReadiness: string;
  memberName?: string;
  paymentRoute: string;
  paymentStatus: string;
  receiptStatus: string;
  reversalStatus: string;
}

export interface TerekaReceiptingQueueRow extends TerekaTransactionRow {
  receiptingAction: string;
}

export interface TerekaReceiptRegisterRow extends TerekaTransactionRow {
  receiptNo: string;
  receiptStatus: string;
}

export interface TerekaTransactionRowsInput {
  memberName: (memberId?: string) => string;
  transactions: TerekaFinancialTransaction[];
}

export interface TerekaTransactionReceiptSummary {
  loanRepayments: number;
  mobileMoney: number;
  receiptReady: number;
  savingsDeposits: number;
  totalAmount: TerekaMoney;
  totalRows: number;
  treasurerCash: number;
}

export function buildTransactionRows(input: TerekaTransactionRowsInput): TerekaTransactionRow[] {
  return input.transactions.map((transaction) => {
    const status = normalizeTransactionText(transaction.status);
    const original = Boolean(transaction.originalTransactionId);
    const postedOriginal = status === "posted" && !original;
    return {
      ...transaction,
      memberName: input.memberName(transaction.memberId),
      paymentRoute: paymentRouteLabelFor(transaction),
      paymentStatus: paymentLifecycleStatusFor(transaction),
      approvalReadiness: status.includes("pending")
        ? "Awaiting approval"
        : status === "posted"
          ? "Posted"
          : status.includes("rejected")
            ? "Rejected"
            : "Review",
      receiptStatus: status === "posted" ? "Receipt ready" : "Post first",
      reversalStatus: postedOriginal ? "Reversible with reason" : original ? "Reversal entry" : "Not available",
      action: "transaction-detail",
      actionLabel: status.includes("pending") ? "Approve" : "Review",
      actionId: transaction.id,
    };
  });
}

export function buildTransactionReceiptingQueue(rows: TerekaTransactionRow[]): TerekaReceiptingQueueRow[] {
  return rows
    .filter((row) => {
      const status = normalizeTransactionText(row.status);
      const type = normalizeTransactionText(row.type);
      return (status.includes("pending") || status === "posted")
        && ["deposit", "repayment", "share", "welfare", "saving"].some((word) => type.includes(word));
    })
    .map((row) => ({
      ...row,
      receiptingAction: normalizeTransactionText(row.status).includes("pending") ? "Approve/post first" : "Load receipt",
      action: "transaction-detail",
      actionLabel: normalizeTransactionText(row.status).includes("pending") ? "Post" : "Receipt",
      actionId: row.id,
    }))
    .sort(sortTransactionNewestWithPendingFirst);
}

export function buildTransactionReceiptRegister(rows: TerekaTransactionRow[]): TerekaReceiptRegisterRow[] {
  return rows
    .filter((row) => normalizeTransactionText(row.status) === "posted" && !row.originalTransactionId)
    .map((row) => ({
      ...row,
      receiptNo: `RCT-${row.reference || row.id}`,
      receiptStatus: "Receipted",
      action: "transaction-detail",
      actionLabel: "Receipt",
      actionId: row.id,
    }))
    .sort(sortTransactionNewestFirst);
}

export function buildTransactionReceiptSummary(rows: TerekaTransactionRow[]): TerekaTransactionReceiptSummary {
  return {
    totalRows: rows.length,
    totalAmount: rows.reduce((total, row) => total + Number(row.amount || 0), 0),
    receiptReady: rows.filter((row) => normalizeTransactionText(row.status) === "posted").length,
    mobileMoney: rows.filter((row) => row.paymentRoute === "Mobile money").length,
    treasurerCash: rows.filter((row) => row.paymentRoute === "Treasurer cash").length,
    loanRepayments: rows.filter((row) => normalizeTransactionText(row.type).includes("loan")).length,
    savingsDeposits: rows.filter((row) => normalizeTransactionText(row.type).includes("saving")).length,
  };
}

function sortTransactionNewestWithPendingFirst(a: TerekaTransactionRow, b: TerekaTransactionRow): number {
  const aPending = normalizeTransactionText(a.status).includes("pending") ? 0 : 1;
  const bPending = normalizeTransactionText(b.status).includes("pending") ? 0 : 1;
  if (aPending !== bPending) return aPending - bPending;
  return sortTransactionNewestFirst(a, b);
}

function sortTransactionNewestFirst(a: TerekaFinancialTransaction, b: TerekaFinancialTransaction): number {
  return transactionTime(b) - transactionTime(a);
}

function transactionTime(row: TerekaFinancialTransaction): number {
  return new Date(row.postedAt || row.createdAt || 0).getTime();
}

function normalizeTransactionText(value: unknown): string {
  return String(value || "").toLowerCase();
}
