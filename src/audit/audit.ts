import type { TerekaAuditEvent, TerekaRecord } from "../types/domain";

export type TerekaAuditRiskLevel = "High" | "Normal" | "Review";
export type TerekaAuditCategory = "Access control" | "Approvals" | "Financial activity" | "General" | "Operations" | "Reversals";

export interface TerekaAuditRow extends TerekaAuditEvent, TerekaRecord {
  actor: string;
  category: TerekaAuditCategory;
  module: string;
  recordReference: string;
  result: string;
  riskLevel: TerekaAuditRiskLevel;
  tenantName: string;
}

export interface TerekaAuditRowsInput {
  events: Array<TerekaAuditEvent & TerekaRecord> | null | undefined;
  tenantName: (tenantId?: string) => string;
  userName: (userId?: string) => string;
}

export interface TerekaAuditGroupModel {
  access: TerekaAuditRow[];
  approvals: TerekaAuditRow[];
  finance: TerekaAuditRow[];
  highRisk: TerekaAuditRow[];
  reversals: TerekaAuditRow[];
  sensitive: TerekaAuditRow[];
}

export interface TerekaAuditSummary {
  accessEvents: number;
  actors: number;
  affectedSaccos: number;
  approvalEvents: number;
  financeEvents: number;
  highRiskEvents: number;
  latestEvent: string;
  reversalEvents: number;
  sensitiveEvents: number;
  totalEvents: number;
}

export function buildAuditRows(input: TerekaAuditRowsInput): TerekaAuditRow[] {
  return (input.events || []).map((event) => ({
    ...event,
    actor: String(event.actorName || input.userName(String(event.actorUserId || ""))),
    category: auditCategoryFor(event),
    module: String(event.resourceType || event.module || "system"),
    recordReference: String(event.resourceId || event.recordReference || event.recordId || ""),
    result: String(event.result || "Recorded"),
    riskLevel: auditRiskLevelFor(event),
    tenantName: input.tenantName(String(event.tenantId || "")),
  }));
}

export function buildAuditGroups(rows: TerekaAuditRow[]): TerekaAuditGroupModel {
  return {
    access: rows.filter((event) => event.category === "Access control"),
    approvals: rows.filter((event) => event.category === "Approvals"),
    finance: rows.filter((event) => event.category === "Financial activity"),
    highRisk: rows.filter((event) => event.riskLevel === "High"),
    reversals: rows.filter((event) => event.category === "Reversals"),
    sensitive: rows.filter((event) => event.riskLevel !== "Normal"),
  };
}

export function buildAuditSummary(rows: TerekaAuditRow[], groups: TerekaAuditGroupModel): TerekaAuditSummary {
  return {
    accessEvents: groups.access.length,
    actors: uniqueAuditCount(rows, "actorUserId"),
    affectedSaccos: uniqueAuditCount(rows, "tenantId"),
    approvalEvents: groups.approvals.length,
    financeEvents: groups.finance.length,
    highRiskEvents: groups.highRisk.length,
    latestEvent: String(rows[0]?.createdAt || "No event yet"),
    reversalEvents: groups.reversals.length,
    sensitiveEvents: groups.sensitive.length,
    totalEvents: rows.length,
  };
}

export function auditRiskLevelFor(event: TerekaAuditEvent & TerekaRecord): TerekaAuditRiskLevel {
  const text = normalizeAuditText(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["failed", "blocked", "too many", "invalid sacco"].some((word) => text.includes(word)) && text.includes("login")) return "High";
  if (["password", "role", "permission", "session", "reversal", "disbursed", "suspended", "terminated"].some((word) => text.includes(word))) return "High";
  if (["approved", "rejected", "status", "payment", "template", "complaint", "loan"].some((word) => text.includes(word))) return "Review";
  return "Normal";
}

export function auditCategoryFor(event: TerekaAuditEvent & TerekaRecord): TerekaAuditCategory {
  const text = normalizeAuditText(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["role", "permission", "password", "session", "login", "logout", "user"].some((word) => text.includes(word))) return "Access control";
  if (["reversal", "reverse", "corrected"].some((word) => text.includes(word))) return "Reversals";
  if (["approved", "rejected", "approval", "status", "decision", "submitted"].some((word) => text.includes(word))) return "Approvals";
  if (["transaction", "payment", "loan", "repayment", "expense", "asset", "product", "account", "branch"].some((word) => text.includes(word))) return "Financial activity";
  if (["complaint", "template", "notification"].some((word) => text.includes(word))) return "Operations";
  return "General";
}

export function uniqueAuditCount(rows: TerekaAuditRow[], key: string): number {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function normalizeAuditText(value: unknown): string {
  return String(value || "").toLowerCase();
}
