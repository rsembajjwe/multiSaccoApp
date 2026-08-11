import type { TerekaRecord, TerekaStatementLine } from "../types/domain";
import { isMobileMoneyPerformanceLine } from "./performance";

export interface TerekaMemberDocumentRow extends TerekaRecord {
  action: string;
  actionId?: string;
  retentionReviewDueAt: string;
  retentionReviewedAt: string;
  retentionStatus: string;
  retentionStorageAction: string;
}

export interface TerekaMemberDocumentRetentionSummary {
  disposed: number;
  disposalPending: number;
  documents: number;
  reviewDue: number;
}

export interface TerekaMemberStatementSummary {
  debitTotal: number;
  creditTotal: number;
  lastMovement: string;
  mobileRows: number;
  officeRows: number;
  receiptRows: number;
  totalBalance: number;
  treasurerRows: number;
}

export function buildMemberDocumentRows(
  documents: TerekaRecord[],
  labelize: (value: unknown) => string,
  formatDateTime: (value: unknown) => string
): TerekaMemberDocumentRow[] {
  return documents.map((document) => ({
    ...document,
    retentionStatus: labelize(document.retentionStatus || "active"),
    retentionStorageAction: labelize(document.retentionStorageAction || "not_actioned"),
    retentionReviewDueAt: String(document.retentionReviewDueAt || ""),
    retentionReviewedAt: document.retentionReviewedAt ? formatDateTime(document.retentionReviewedAt) : "",
    action: "document-retention",
    actionId: typeof document.id === "string" ? document.id : undefined,
  }));
}

export function buildMemberDocumentRetentionSummary(documents: TerekaRecord[]): TerekaMemberDocumentRetentionSummary {
  return {
    documents: documents.length,
    reviewDue: documents.filter((document) => normalizeMemberAdminText(document.retentionStatus) === "review_due").length,
    disposalPending: documents.filter((document) => normalizeMemberAdminText(document.retentionStatus) === "disposal_pending").length,
    disposed: documents.filter((document) => normalizeMemberAdminText(document.retentionStatus) === "disposed").length,
  };
}

export function buildMemberStatementSummary(
  member: TerekaRecord,
  lines: TerekaStatementLine[]
): TerekaMemberStatementSummary {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  const mobileRows = receiptRows.filter((line) => isMobileMoneyPerformanceLine(line)).length;
  return {
    creditTotal: lines.reduce((total, line) => total + statementCredit(line), 0),
    debitTotal: lines.reduce((total, line) => total + statementDebit(line), 0),
    lastMovement: lines[0]?.postedAt || lines[0]?.createdAt || "No statement activity",
    mobileRows,
    officeRows: Math.max(0, lines.length - lines.filter((line) => isMobileMoneyPerformanceLine(line)).length),
    receiptRows: receiptRows.length,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    treasurerRows: receiptRows.length - mobileRows,
  };
}

export function buildReceiptReadyStatementLines(lines: TerekaStatementLine[]): TerekaStatementLine[] {
  return lines.filter((line) => line.reference || line.receiptNo || normalizeMemberAdminText(line.status) === "posted");
}

export function statementCredit(line: TerekaStatementLine): number {
  const amount = Number(line.amount || 0);
  const credit = line.credit ?? (amount > 0 ? amount : 0);
  return Number(credit || 0);
}

export function statementDebit(line: TerekaStatementLine): number {
  const amount = Number(line.amount || 0);
  const debit = line.debit ?? (amount < 0 ? Math.abs(amount) : 0);
  return Number(debit || 0);
}

function normalizeMemberAdminText(value: unknown): string {
  return String(value || "").toLowerCase();
}
