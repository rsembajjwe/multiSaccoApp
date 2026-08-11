import type { TerekaAuditEvent, TerekaRecord } from "../types/domain";

export interface TerekaNotificationProviderRiskRow {
  checkedAt?: string;
  message?: string;
  provider: string;
  severity: string;
  status: string;
  title: string;
}

export interface TerekaLoginRiskSummary {
  blockedAttempts: number;
  failedCredentials: number;
  memberPortal: number;
  riskEvents: number;
  staffPortal: number;
  uniqueScopeCount: number;
}

export interface TerekaLoginRiskRow {
  action?: string;
  createdAt: string;
  identity: string;
  ipAddress: string;
  portal: string;
  sacco?: string;
}

export function buildNotificationProviderRiskRows(input: {
  checkedAt?: string;
  labelize: (value: unknown) => string;
  rows: Array<TerekaRecord>;
}): TerekaNotificationProviderRiskRow[] {
  return input.rows
    .map((row): TerekaNotificationProviderRiskRow | null => {
      const balance = Number(row.balance);
      const unavailable = normalizeOperationsText(row.status) !== "ready";
      const lowBalance = row.channel === "sms" && Number.isFinite(balance) && balance < 100;
      if (!unavailable && !lowBalance) return null;
      return {
        title: `${input.labelize(row.channel)} provider`,
        provider: input.labelize(row.provider),
        severity: unavailable ? "Critical" : "Warning",
        status: unavailable ? "Unavailable" : "Low credits",
        checkedAt: String(row.checkedAt || input.checkedAt || ""),
        message: unavailable ? String(row.message || "") : `${balance} SMS credits remaining.`,
      };
    })
    .filter((row): row is TerekaNotificationProviderRiskRow => row !== null);
}

export function filterLoginRiskEvents(events: Array<TerekaAuditEvent & TerekaRecord>): Array<TerekaAuditEvent & TerekaRecord> {
  return events.filter((event) => isLoginRiskEvent(event));
}

export function buildLoginRiskSummary(events: Array<TerekaAuditEvent & TerekaRecord>, scopeKey: "tenantId" | "ipAddress"): TerekaLoginRiskSummary {
  return {
    blockedAttempts: events.filter((event) => normalizeOperationsText(event.action).includes("blocked")).length,
    failedCredentials: events.filter((event) => normalizeOperationsText(event.action).includes("failed")).length,
    memberPortal: events.filter((event) => loginRiskPortalFor(event) === "Member").length,
    riskEvents: events.length,
    staffPortal: events.filter((event) => loginRiskPortalFor(event) === "Staff").length,
    uniqueScopeCount: uniqueOperationsCount(events, scopeKey),
  };
}

export function buildLoginRiskRows(input: {
  events: Array<TerekaAuditEvent & TerekaRecord>;
  formatDateTime: (value: unknown) => string;
}): TerekaLoginRiskRow[] {
  return input.events.slice(0, 6).map((event) => ({
    createdAt: input.formatDateTime(event.createdAt),
    sacco: String(event.tenantName || ""),
    portal: loginRiskPortalFor(event),
    identity: String(event.recordReference || "Hidden"),
    action: event.action,
    ipAddress: String(event.ipAddress || "-"),
  }));
}

export function isLoginRiskEvent(event: TerekaAuditEvent & TerekaRecord): boolean {
  const text = normalizeOperationsText(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  return text.includes("login") && ["failed", "blocked", "invalid"].some((word) => text.includes(word));
}

export function loginRiskPortalFor(event: TerekaAuditEvent & TerekaRecord): string {
  return normalizeOperationsText(event.resourceType || event.module).includes("member") ? "Member" : "Staff";
}

function uniqueOperationsCount(rows: Array<TerekaAuditEvent & TerekaRecord>, key: string): number {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function normalizeOperationsText(value: unknown): string {
  return String(value || "").toLowerCase();
}
