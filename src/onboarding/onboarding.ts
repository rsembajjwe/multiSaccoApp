import type { TerekaCollectionAccount, TerekaRegion, TerekaSubscription, TerekaSubscriptionPackage, TerekaTenantSummary, TerekaRecord } from "../types/domain";

export interface TerekaSaccoApplicationRow extends TerekaTenantSummary, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalStage: string;
  operatingAccess: string;
  paymentStage: string;
}

export interface TerekaSaccoRegistrationSummary {
  active: number;
  callbackReceived: number;
  paymentInitiated: number;
  readyForApproval: number;
  totalApplications: number;
}

export interface TerekaSubscriptionRow extends TerekaSubscription, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalStage: string;
  balanceDue: number;
  billableMembers: number | string;
  paidMemberCapacity: number | string;
  inactiveMemberOverflow: number | string;
  operatingAccess: string;
  packageName?: string;
  paymentStage: string;
  paymentStatus: string;
  saccoCode?: string;
}

export interface TerekaSubscriptionSummary {
  activeSubscriptions: number;
  callbackReceived: number;
  expiredOrSuspended: number;
  outstandingInvoices: number;
  paidAndActive: number;
  paymentInitiated: number;
  pendingPayments: number;
  revenueThisMonth: number;
  suspendedAccess: number;
}

export interface TerekaPackageCardRow extends TerekaSubscriptionPackage, TerekaRecord {
  amount: number | string;
  branchLimit: number | string;
  memberLimit: number | string;
  packageId: string;
  statusLabel: string;
  statusTone: "active" | "pending";
}

export interface TerekaSaccoCollectionAccountReviewRow {
  accountName?: string;
  accountNumber?: string;
  branch: string;
  channel: string;
  provider: string;
  status: string;
}

export interface TerekaOnboardingOption {
  currency?: string;
  currencyDigits?: number;
  label: string;
  locale?: string;
  selected?: boolean;
  value: string;
}

export function buildSaccoApplicationRows(input: {
  subscriptions: Array<TerekaSubscription & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
}): TerekaSaccoApplicationRow[] {
  return input.tenants.map((tenant) => {
    const subscription = input.subscriptions.find((item) => item.tenantId === tenant.id);
    return {
      ...tenant,
      paymentStage: saccoPaymentStageFor(tenant, subscription),
      approvalStage: saccoApprovalStageFor(tenant, subscription),
      operatingAccess: subscriptionAccessLabelFor(subscription || {}, tenant),
      action: "tenant-detail",
      actionLabel: "Review",
      actionId: tenant.id,
    };
  });
}

export function buildSaccoRegistrationSummary(applications: TerekaSaccoApplicationRow[]): TerekaSaccoRegistrationSummary {
  return {
    active: applications.filter((row) => normalizeOnboardingText(row.operatingAccess) === "active").length,
    callbackReceived: applications.filter((row) => normalizeOnboardingText(row.paymentStage).includes("callback")).length,
    paymentInitiated: applications.filter((row) => normalizeOnboardingText(row.paymentStage).includes("initiated")).length,
    readyForApproval: applications.filter((row) => normalizeOnboardingText(row.approvalStage).includes("ready")).length,
    totalApplications: applications.length,
  };
}

export function buildSubscriptionRows(input: {
  subscriptions: Array<TerekaSubscription & TerekaRecord>;
  tenants: Array<TerekaTenantSummary & TerekaRecord>;
}): TerekaSubscriptionRow[] {
  return input.subscriptions.map((subscription) => {
    const tenant = input.tenants.find((item) => item.id === subscription.tenantId) || {};
    return {
      ...subscription,
      saccoCode: textOnboardingValue(tenant.abbreviation || tenant.code || subscription.tenantCode || subscription.tenantId),
      tenantName: textOnboardingValue(tenant.name || subscription.tenantName || subscription.saccoName || subscription.tenantId),
      packageName: textOnboardingValue(subscription.tierLabel || subscription.packageName || subscription.packageId),
      paymentStatus: subscriptionPaymentLabelFor(subscription),
      paymentStage: saccoPaymentStageFor(tenant, subscription),
      operatingAccess: subscriptionAccessLabelFor(subscription, tenant),
      approvalStage: saccoApprovalStageFor(tenant, subscription),
      billableMembers: displayOnboardingValue(subscription.billableMembers || subscription.memberCount || tenant.memberCount || 0),
      paidMemberCapacity: displayOnboardingValue(subscription.paidMemberCapacity || 0),
      inactiveMemberOverflow: displayOnboardingValue(subscription.inactiveMemberOverflow || 0),
      balanceDue: balanceDueFor(subscription),
      action: "subscription-detail",
      actionLabel: "Manage",
      actionId: subscription.id,
    };
  });
}

export function buildSubscriptionSummary(rows: Array<TerekaSubscription & TerekaRecord>, tableRows: TerekaSubscriptionRow[]): TerekaSubscriptionSummary {
  return {
    activeSubscriptions: rows.filter((row) => normalizeOnboardingText(row.status) === "active").length,
    callbackReceived: tableRows.filter((row) => normalizeOnboardingText(row.paymentStage).includes("callback")).length,
    expiredOrSuspended: tableRows.filter((row) => normalizeOnboardingText(row.operatingAccess).includes("expired") || normalizeOnboardingText(row.operatingAccess).includes("suspended")).length,
    outstandingInvoices: rows.reduce((total, row) => total + balanceDueFor(row), 0),
    paidAndActive: tableRows.filter((row) => normalizeOnboardingText(row.paymentStatus) === "paid" && normalizeOnboardingText(row.operatingAccess) === "active").length,
    paymentInitiated: tableRows.filter((row) => normalizeOnboardingText(row.paymentStage).includes("initiated")).length,
    pendingPayments: rows.filter((row) => normalizeOnboardingText(row.paymentStatus || row.status).includes("pending")).length,
    revenueThisMonth: sumOnboardingValues(rows, "amount"),
    suspendedAccess: tableRows.filter((row) => normalizeOnboardingText(row.operatingAccess).includes("suspended")).length,
  };
}

export function buildPackageCardRows(packages: Array<TerekaSubscriptionPackage & TerekaRecord>): TerekaPackageCardRow[] {
  return packages.map((pkg) => {
    const status = normalizeOnboardingText(pkg.status || "active");
    return {
      ...pkg,
      packageId: String(pkg.id || pkg.packageId || pkg.name || ""),
      amount: displayOnboardingValue(pkg.price || pkg.amount || 0),
      memberLimit: displayOnboardingValue(pkg.memberRange || pkg.members || (pkg.maxMembers ? `Up to ${pkg.maxMembers}` : "Configured range")),
      branchLimit: displayOnboardingValue(pkg.maxBranches || pkg.branches || "Configured"),
      statusLabel: labelizeOnboardingText(status || "active"),
      statusTone: status === "active" ? "active" : "pending",
    };
  });
}

export function generateSaccoCode(name: unknown, existingTenants: Array<TerekaTenantSummary & TerekaRecord>): string {
  const words = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["SACCO", "COOPERATIVE", "COOP", "LIMITED", "LTD", "THE", "AND", "OF"].includes(word));
  const letterSource = words.join("") || "SACCO";
  const base = `${letterSource.replace(/[^A-Z]/g, "")}SACO`.slice(0, 4);
  const existingCodes = new Set(existingTenants.map((tenant) => normalizeOnboardingText(tenant.saccoCode || tenant.abbreviation || tenant.code)));
  if (!existingCodes.has(normalizeOnboardingText(base))) return base;
  for (let index = 0; index < 26 * 26; index += 1) {
    const suffix = String.fromCharCode(65 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
    const code = `${base.slice(0, 2)}${suffix}`;
    if (!existingCodes.has(normalizeOnboardingText(code))) return code;
  }
  for (let index = 0; index < 26 * 26 * 26 * 26; index += 1) {
    let cursor = index;
    const code = [0, 0, 0, 0].map(() => {
      const letter = String.fromCharCode(65 + (cursor % 26));
      cursor = Math.floor(cursor / 26);
      return letter;
    }).reverse().join("");
    if (!existingCodes.has(normalizeOnboardingText(code))) return code;
  }
  return base;
}

export function saccoLocationAddress(district: unknown, parish: unknown, village: unknown, memberRange: unknown = ""): string {
  return [
    district ? `District: ${district}` : "",
    parish ? `Parish: ${parish}` : "",
    village ? `Village: ${village}` : "",
    memberRange ? `Member range: ${memberRange}` : "",
  ].filter(Boolean).join("; ");
}

export function profileLocationPart(profile: TerekaRecord | null | undefined, label: string): string {
  const match = String(profile?.address || "").match(new RegExp(`${label}:\\s*([^;]+)`, "i"));
  return match ? match[1].trim() : "";
}

export function tenantStatusOptions(): TerekaOnboardingOption[] {
  return [
    { value: "pending_review", label: "Pending review / request changes" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active / operating" },
    { value: "inactive", label: "Inactive / deactivated" },
    { value: "suspended", label: "Suspended" },
    { value: "terminated", label: "Rejected / terminated" },
  ];
}

export function tenantStatusLabel(status: unknown): string {
  return tenantStatusOptions().find((option) => option.value === status)?.label || String(status || "Pending");
}

export function memberRangeOptions(): TerekaOnboardingOption[] {
  return [
    { value: "20-250", label: "20 to 250 members" },
    { value: "251-500", label: "251 to 500 members" },
    { value: "501-1000", label: "501 to 1,000 members" },
    { value: "1001-2500", label: "1,001 to 2,500 members" },
    { value: "2501-5000", label: "2,501 to 5,000 members" },
    { value: "5001-10000", label: "5,001 to 10,000 members" },
    { value: "10000+", label: "Above 10,000 members" },
  ];
}

export function countryRegionOptions(countryRegions: Record<string, TerekaRegion>, selectedCountry = "uganda"): TerekaOnboardingOption[] {
  return Object.entries(countryRegions).map(([country, region]) => ({
    currency: region.currency,
    currencyDigits: region.currencyDigits,
    label: `${labelizeOnboardingText(country)} - ${region.currency}`,
    locale: region.locale,
    value: country,
    selected: country === selectedCountry,
  }));
}

export function buildSaccoCollectionAccountReviewRows(accounts: Array<TerekaCollectionAccount & TerekaRecord>, labelize: (value: unknown) => string): TerekaSaccoCollectionAccountReviewRow[] {
  return accounts.map((account) => ({
    channel: labelize(account.channel || ""),
    provider: account.channel === "bank" ? String(account.bankName || "") : String(account.network || "").toUpperCase(),
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    branch: String(account.branch || ""),
    status: account.active ? "active" : "inactive",
  }));
}

export function subscriptionAccessLabelFor(subscription: Partial<TerekaSubscription & TerekaRecord>, tenant: Partial<TerekaTenantSummary & TerekaRecord> = {}): string {
  if (normalizeOnboardingText(tenant.status).includes("suspended")) return "Read-only until paid";
  if (normalizeOnboardingText(subscription.status) === "active" && normalizeOnboardingText(tenant.status) === "active") return "Active";
  if (normalizeOnboardingText(subscription.status) === "trial" && normalizeOnboardingText(tenant.status) === "active") return "Setup trial";
  if (normalizeOnboardingText(subscription.status).includes("pending")) return "Payment pending";
  if (normalizeOnboardingText(subscription.status).includes("expired")) return "Expired";
  return String(subscription.status || tenant.status || "Pending");
}

export function saccoPaymentStageFor(tenant: Partial<TerekaTenantSummary & TerekaRecord>, subscription?: Partial<TerekaSubscription & TerekaRecord>): string {
  if (!subscription) return "No subscription";
  const paid = Number(subscription.paid || subscription.amountPaid || 0);
  const amount = Number(subscription.amount || 0);
  const status = normalizeOnboardingText(subscription.status);
  if (amount > 0 && paid >= amount) return "Callback received";
  if (paid > 0) return "Part payment received";
  if (status === "trial") return "Setup trial";
  if (normalizeOnboardingText(tenant.status).includes("pending_self_registration") || status.includes("pending")) return "Payment initiated";
  if (status === "active") return "Callback received";
  if (status.includes("expired")) return "Expired";
  return "Payment pending";
}

export function saccoApprovalStageFor(tenant: Partial<TerekaTenantSummary & TerekaRecord>, subscription?: Partial<TerekaSubscription & TerekaRecord>): string {
  const tenantStatus = normalizeOnboardingText(tenant.status);
  const paymentStage = normalizeOnboardingText(saccoPaymentStageFor(tenant, subscription));
  if (tenantStatus === "active" && paymentStage.includes("callback")) return "Active";
  if (tenantStatus === "pending_review" && paymentStage.includes("callback")) return "Ready for approval";
  if (tenantStatus === "pending_self_registration") return "Awaiting payment";
  if (tenantStatus === "approved" && paymentStage.includes("callback")) return "Ready for activation";
  if (tenantStatus.includes("pending")) return "Application review";
  if (tenantStatus.includes("suspended")) return "Suspended";
  if (tenantStatus.includes("terminated")) return "Rejected";
  return tenantStatus ? tenantStatus.replaceAll("_", " ") : "Pending";
}

export function subscriptionPaymentLabelFor(subscription: Partial<TerekaSubscription & TerekaRecord>): string {
  const amount = Number(subscription.amount || 0);
  const paid = Number(subscription.paid || subscription.amountPaid || 0);
  const status = normalizeOnboardingText(subscription.paymentStatus || subscription.status);
  if (amount > 0 && paid >= amount) return "Paid";
  if (status.includes("paid") || status === "active") return paid > 0 ? "Part paid" : "Payment confirmed";
  if (status === "trial") return "Trial not paid";
  if (paid > 0) return "Part paid";
  if (status.includes("expired")) return "Expired";
  return "Pending payment";
}

function balanceDueFor(subscription: Partial<TerekaSubscription & TerekaRecord>): number {
  return Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || subscription.amountPaid || 0));
}

function sumOnboardingValues(rows: Array<TerekaRecord>, ...keys: string[]): number {
  return rows.reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + Number(row[key] || 0), 0), 0);
}

function normalizeOnboardingText(value: unknown): string {
  return String(value || "").toLowerCase();
}

function labelizeOnboardingText(value: unknown): string {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayOnboardingValue(value: unknown): string | number {
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value || "");
}

function textOnboardingValue(value: unknown): string {
  return String(value || "");
}
