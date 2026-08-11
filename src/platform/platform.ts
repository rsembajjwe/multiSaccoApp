import type {
  TerekaAuditEvent,
  TerekaComplaintThread,
  TerekaFinancialTransaction,
  TerekaPlatformUser,
  TerekaRecord,
  TerekaSubscription,
  TerekaTenantSummary,
} from "../types/domain";

export interface TerekaPlatformDashboardSummary {
  activePlatformUsers: number;
  activeSaccos: number;
  expiredSubscriptions: number;
  failedPaymentTransactions: number;
  openSaccoSupportTickets: number;
  pendingRegistrations: number;
  totalSaccos: number;
  totalSubscriptionRevenue: number;
}

export interface TerekaPlatformOperationsSummary {
  failedCallbacks: number;
  openSupportTickets: number;
  operatingSaccos: number;
  pendingOnboarding: number;
  systemAlerts: number;
}

export interface TerekaPlatformBillingSummary {
  activeSubscriptions: number;
  billableSaccos: number;
  expiredSubscriptions: number;
  pendingPayments: number;
  subscriptionRevenue: number;
}

export interface TerekaPlatformComplianceSummary {
  auditEvents: number;
  operationsAlerts: number;
  pendingRegistrations: number;
  regulatoryReportStatus: string;
  saccoSupportTickets: number;
}

export interface TerekaPlatformSupportSummary {
  notifications: number;
  pendingOnboarding: number;
  saccoSupportTickets: number;
  visibleSaccos: number;
}

export type TerekaPlatformActivityRow = [string | undefined, string | undefined, string | undefined];

export function buildPlatformDashboardSummary(input: {
  supportTickets: Array<TerekaComplaintThread & TerekaRecord>;
  subscriptions: Array<TerekaSubscription & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
  transactions: Array<TerekaFinancialTransaction & TerekaRecord>;
  users: Array<TerekaPlatformUser & TerekaRecord>;
}): TerekaPlatformDashboardSummary {
  const activePlatformUsers = input.users.filter((user) => normalizePlatformText(user.status) === "active").length || input.users.length;
  return {
    activePlatformUsers,
    activeSaccos: input.tenants.filter((tenant) => normalizePlatformText(tenant.status) === "active").length,
    expiredSubscriptions: input.subscriptions.filter((subscription) => normalizePlatformText(subscription.status).includes("expired")).length,
    failedPaymentTransactions: input.transactions.filter((transaction) => normalizePlatformText(transaction.status).includes("failed")).length,
    openSaccoSupportTickets: openPlatformSupportTickets(input.supportTickets).length,
    pendingRegistrations: input.tenants.filter((tenant) => normalizePlatformText(tenant.status).includes("pending")).length,
    totalSaccos: input.tenants.length,
    totalSubscriptionRevenue: sumPlatformValues(input.subscriptions, "amount"),
  };
}

export function buildPlatformOperationsSummary(input: {
  alerts: Array<TerekaRecord>;
  callbacks: Array<TerekaRecord>;
  openSupportTickets: Array<TerekaComplaintThread & TerekaRecord>;
  pendingTenants: Array<TerekaTenantSummary & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
}): TerekaPlatformOperationsSummary {
  return {
    failedCallbacks: input.callbacks.filter((row) => normalizePlatformText(row.status).includes("failed")).length,
    openSupportTickets: input.openSupportTickets.length,
    operatingSaccos: input.tenants.filter((tenant) => normalizePlatformText(tenant.status) === "active").length,
    pendingOnboarding: input.pendingTenants.length,
    systemAlerts: input.alerts.length,
  };
}

export function buildPlatformBillingSummary(input: {
  subscriptions: Array<TerekaSubscription & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
}): TerekaPlatformBillingSummary {
  return {
    activeSubscriptions: input.subscriptions.filter((row) => normalizePlatformText(row.status) === "active").length,
    billableSaccos: input.tenants.length,
    expiredSubscriptions: input.subscriptions.filter((row) => normalizePlatformText(row.status).includes("expired")).length,
    pendingPayments: input.subscriptions.filter((row) => normalizePlatformText(row.paymentStatus || row.status).includes("pending")).length,
    subscriptionRevenue: sumPlatformValues(input.subscriptions, "amount"),
  };
}

export function buildPlatformComplianceSummary(input: {
  alerts: Array<TerekaRecord>;
  auditEvents: Array<TerekaAuditEvent & TerekaRecord>;
  openSupportTickets: Array<TerekaComplaintThread & TerekaRecord>;
  pendingTenants: Array<TerekaTenantSummary & TerekaRecord>;
  regulatoryReportReady: boolean;
}): TerekaPlatformComplianceSummary {
  return {
    auditEvents: input.auditEvents.length,
    operationsAlerts: input.alerts.length,
    pendingRegistrations: input.pendingTenants.length,
    regulatoryReportStatus: input.regulatoryReportReady ? "Ready" : "Pending",
    saccoSupportTickets: input.openSupportTickets.length,
  };
}

export function buildPlatformSupportSummary(input: {
  notifications: Array<TerekaRecord>;
  pendingTenants: Array<TerekaTenantSummary & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
  tickets: Array<TerekaComplaintThread & TerekaRecord>;
}): TerekaPlatformSupportSummary {
  return {
    notifications: input.notifications.length,
    pendingOnboarding: input.pendingTenants.length,
    saccoSupportTickets: input.tickets.length,
    visibleSaccos: input.tenants.length,
  };
}

export function buildRecentSaccoApplicationRows(
  tenants: Array<TerekaTenantSummary & TerekaRecord>,
  pendingLabel: string,
): TerekaPlatformActivityRow[] {
  return tenants.slice(0, 5).map((tenant) => [
    String(tenant.name || tenant.legalName || ""),
    String(tenant.district || "Uganda"),
    String(tenant.status || pendingLabel),
  ]);
}

function openPlatformSupportTickets(rows: Array<TerekaComplaintThread & TerekaRecord>): Array<TerekaComplaintThread & TerekaRecord> {
  return rows.filter((row) => !["closed", "resolved"].includes(normalizePlatformText(row.status)));
}

function sumPlatformValues(rows: Array<TerekaRecord>, key: string): number {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function normalizePlatformText(value: unknown): string {
  return String(value || "").toLowerCase();
}
