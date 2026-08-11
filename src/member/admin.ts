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

export interface TerekaMemberDetailSummary {
  beneficiaries: number;
  contacts: number;
  documents: number;
  statementLines: number;
  totalBalance: number;
}

export interface TerekaMemberKycCheckRow {
  area: string;
  detail: string;
  status: string;
}

export interface TerekaMemberReceiptEvidenceSummary {
  lastReceipt: string;
  mobileRows: number;
  receiptRows: number;
  treasurerRows: number;
}

export interface TerekaStaffStatementExportSummary {
  auditTrail: string;
  csvStatement: string;
  excelSchedule: string;
  printStatement: string;
  receiptBundle: string;
  statementRows: number;
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

export function buildMemberDetailSummary(input: {
  beneficiaries: TerekaRecord[];
  documents: TerekaRecord[];
  nextOfKin: TerekaRecord[];
  statementLines: TerekaStatementLine[];
  statementSummary: TerekaMemberStatementSummary;
}): TerekaMemberDetailSummary {
  return {
    beneficiaries: input.beneficiaries.length,
    contacts: input.nextOfKin.length,
    documents: input.documents.length,
    statementLines: input.statementLines.length,
    totalBalance: input.statementSummary.totalBalance,
  };
}

export function memberKycReadinessFor(member: TerekaRecord): string {
  const missing: string[] = [];
  if (!member.phone) missing.push("phone");
  if (!member.nationalId) missing.push("national ID");
  if (!member.fullName) missing.push("name");
  if (normalizeMemberAdminText(member.kycStatus) === "verified" && normalizeMemberAdminText(member.status) === "active") return "Portal ready";
  if (missing.length) return `Missing ${missing.join(", ")}`;
  if (normalizeMemberAdminText(member.kycStatus).includes("pending")) return "Ready for review";
  if (normalizeMemberAdminText(member.status).includes("pending")) return "Approval needed";
  return "Review";
}

export function buildMemberKycChecklistRows(member: TerekaRecord, labelize: (value: unknown) => string): TerekaMemberKycCheckRow[] {
  return [
    { area: "Identity", detail: member.nationalId ? "National ID captured" : "National ID missing", status: member.nationalId ? "Complete" : "Pending" },
    { area: "Contact", detail: member.phone ? "Phone number captured" : "Phone number missing", status: member.phone ? "Complete" : "Pending" },
    { area: "KYC decision", detail: labelize(member.kycStatus || "pending"), status: normalizeMemberAdminText(member.kycStatus) === "verified" ? "Complete" : "Review" },
    { area: "Member status", detail: labelize(member.status || "pending"), status: normalizeMemberAdminText(member.status) === "active" ? "Active" : "Review" },
    { area: "Portal login", detail: normalizeMemberAdminText(member.status) === "active" ? "Member can access portal after credential setup" : "Activate member before portal access", status: normalizeMemberAdminText(member.status) === "active" ? "Ready" : "Pending" },
  ];
}

export function buildReceiptReadyStatementLines(lines: TerekaStatementLine[]): TerekaStatementLine[] {
  return lines.filter((line) => line.reference || line.receiptNo || normalizeMemberAdminText(line.status) === "posted");
}

export function buildMemberReceiptEvidenceSummary(lines: TerekaStatementLine[]): TerekaMemberReceiptEvidenceSummary {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  const mobileRows = receiptRows.filter((line) => isMobileMoneyPerformanceLine(line));
  return {
    lastReceipt: receiptRows[0]?.receiptNo || receiptRows[0]?.reference || "No receipt yet",
    mobileRows: mobileRows.length,
    receiptRows: receiptRows.length,
    treasurerRows: receiptRows.length - mobileRows.length,
  };
}

export function buildStaffStatementExportSummary(lines: TerekaStatementLine[]): TerekaStaffStatementExportSummary {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  return {
    auditTrail: "Included",
    csvStatement: "Backend download",
    excelSchedule: "Open CSV in Excel",
    printStatement: "Available",
    receiptBundle: receiptRows.length ? "Available" : "No receipts yet",
    statementRows: lines.length,
  };
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
