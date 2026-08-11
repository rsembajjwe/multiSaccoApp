import type { TerekaMemberProfile, TerekaNotification, TerekaRecord, TerekaSubscription, TerekaTenantSummary } from "../types/domain";

export interface TerekaSaccoAccountHealthRow extends TerekaTenantSummary, TerekaRecord {
  accountHealth: string;
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalStage: string;
  billableMembers: number | string;
  expiry: string;
  packageName: string;
  paymentStage: string;
  saccoCode: string;
  subscriptionStatus: string;
}

export interface TerekaSaccoAccountSummary {
  activeAccounts: number;
  expiringSoon: number;
  suspendedAccounts: number;
  withoutSubscription: number;
}

export interface TerekaMemberDirectoryRow extends TerekaMemberProfile, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  kycReadiness: string;
  totalBalance: number;
}

export interface TerekaMemberDirectorySummary {
  activeMembers: number;
  pendingKyc: number;
  portalReady: number;
  registeredMembers: number;
  totalBalances: number;
}

export interface TerekaQuickSearchResult {
  id: string;
  recordId?: string;
  group?: string;
  view: string;
  title: string;
  meta?: string;
  saccoRegistrationTab?: string;
  memberTab?: string;
  userAdminTab?: string;
  moduleTabView?: string;
  moduleTab?: string;
  selectedTenantId?: string;
  selectedMemberId?: string;
  selectedLoanId?: string;
  selectedUserId?: string;
  selectedSubscriptionId?: string;
  selectedComplaintId?: string;
}

export interface TerekaQuickSearchModel {
  activeId: string;
  groups: Array<{
    group: string;
    rows: TerekaQuickSearchResult[];
  }>;
  results: TerekaQuickSearchResult[];
}

export function buildSaccoAccountHealthRows(input: {
  accountHealth: (tenant: TerekaTenantSummary & TerekaRecord, subscription?: TerekaSubscription & TerekaRecord) => string;
  approvalStage: (tenant: TerekaTenantSummary & TerekaRecord, subscription?: TerekaSubscription & TerekaRecord) => string;
  paymentStage: (tenant: TerekaTenantSummary & TerekaRecord, subscription?: TerekaSubscription & TerekaRecord) => string;
  subscriptionForTenant: (tenantId?: string) => (TerekaSubscription & TerekaRecord) | undefined;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
}): TerekaSaccoAccountHealthRow[] {
  return input.tenants.map((tenant) => {
    const subscription = input.subscriptionForTenant(tenant.id);
    return {
      ...tenant,
      saccoCode: String(tenant.abbreviation || tenant.code || tenant.id || ""),
      accountHealth: input.accountHealth(tenant, subscription),
      subscriptionStatus: String(subscription?.status || "No subscription"),
      packageName: String(subscription?.tierLabel || subscription?.packageName || subscription?.packageId || "Not assigned"),
      expiry: String(subscription?.expiry || subscription?.expiryDate || ""),
      billableMembers: navigationStringOrNumber(subscription?.billableMembers || subscription?.memberCount || tenant.memberCount || 0),
      paymentStage: input.paymentStage(tenant, subscription),
      approvalStage: input.approvalStage(tenant, subscription),
      action: "tenant-detail",
      actionLabel: "Open",
      actionId: tenant.id,
    };
  });
}

export function buildSaccoAccountSummary(rows: TerekaSaccoAccountHealthRow[], subscriptions: Array<TerekaSubscription & TerekaRecord>): TerekaSaccoAccountSummary {
  return {
    activeAccounts: rows.filter((row) => normalizeNavigationText(row.status) === "active").length,
    expiringSoon: rows.filter((row) => normalizeNavigationText(row.subscriptionStatus).includes("expired") || normalizeNavigationText(row.accountHealth).includes("risk")).length,
    suspendedAccounts: rows.filter((row) => normalizeNavigationText(row.status).includes("suspended")).length,
    withoutSubscription: rows.filter((row) => !subscriptions.some((sub) => sub.tenantId === row.id)).length,
  };
}

export function buildMemberDirectoryRows(input: {
  kycReadiness: (member: TerekaMemberProfile & TerekaRecord) => string;
  members: Array<TerekaMemberProfile & TerekaRecord>;
}): TerekaMemberDirectoryRow[] {
  return input.members.map((member) => ({
    ...member,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    kycReadiness: input.kycReadiness(member),
    action: "member-detail",
    actionLabel: "Open profile",
    actionId: member.id,
  }));
}

export function buildMemberDirectorySummary(rows: TerekaMemberDirectoryRow[]): TerekaMemberDirectorySummary {
  return {
    activeMembers: rows.filter((member) => normalizeNavigationText(member.status) === "active").length,
    pendingKyc: pendingMemberKycRows(rows).length,
    portalReady: rows.filter((member) => normalizeNavigationText(member.status) === "active" && normalizeNavigationText(member.kycStatus) === "verified").length,
    registeredMembers: rows.length,
    totalBalances: rows.reduce((total, row) => total + Number(row.totalBalance || 0), 0),
  };
}

export function pendingMemberKycRows<T extends TerekaMemberProfile & TerekaRecord>(members: T[]): T[] {
  return members.filter((member) => normalizeNavigationText(member.kycStatus).includes("pending") || normalizeNavigationText(member.status).includes("pending"));
}

export function uniqueNavigationValues(rows: Array<TerekaRecord> | null | undefined, key: string): unknown[] {
  return [...new Set((rows || []).map((row) => row[key]).filter((value) => value !== undefined && value !== null && String(value).trim()))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

export function buildQuickSearchResult(group: string, recordId: unknown, view: string, title: unknown, meta: unknown, options: Partial<TerekaQuickSearchResult> = {}): TerekaQuickSearchResult {
  const safeRecordId = String(recordId || "");
  return {
    id: `${view}:${safeRecordId}`,
    recordId: safeRecordId,
    group,
    view,
    title: String(title || safeRecordId || "Record"),
    meta: String(meta || view),
    ...options,
  };
}

export function buildQuickSearchModel(input: {
  activeId?: string;
  index: TerekaQuickSearchResult[];
  limit?: number;
  query?: string;
}): TerekaQuickSearchModel {
  const query = String(input.query || "").trim();
  const results = query.length < 2
    ? []
    : input.index
      .filter((result) => normalizeNavigationText(`${result.group || ""} ${result.title || ""} ${result.meta || ""}`).includes(normalizeNavigationText(query)))
      .slice(0, input.limit || 8);
  const activeId = input.activeId && results.some((result) => result.id === input.activeId) ? input.activeId : "";
  return {
    activeId,
    results,
    groups: groupQuickSearchResults(results),
  };
}

export function groupQuickSearchResults(results: TerekaQuickSearchResult[]): TerekaQuickSearchModel["groups"] {
  const groups = new Map<string, TerekaQuickSearchResult[]>();
  results.forEach((result) => {
    const group = result.group || "Results";
    groups.set(group, [...(groups.get(group) || []), result]);
  });
  return [...groups.entries()].map(([group, rows]) => ({ group, rows }));
}

export function memberUnreadNotificationCount(notifications: Array<TerekaNotification & TerekaRecord>): number {
  return notifications.filter((row) => !row.readAt && !normalizeNavigationText(row.status).includes("read")).length;
}

export function staffUnreadNotificationCount(deliveries: Array<TerekaNotification & TerekaRecord>): number {
  return uniqueStaffUnreadNotificationIds(deliveries).length;
}

export function uniqueStaffUnreadNotificationIds(deliveries: Array<TerekaNotification & TerekaRecord>): string[] {
  return deliveries
    .filter((row) => row.notificationId && !row.readAt)
    .map((row) => String(row.notificationId))
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

function normalizeNavigationText(value: unknown): string {
  return String(value || "").toLowerCase();
}

function navigationStringOrNumber(value: unknown): string | number {
  return typeof value === "number" || typeof value === "string" ? value : String(value || 0);
}
