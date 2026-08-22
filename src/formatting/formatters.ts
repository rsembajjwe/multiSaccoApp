import type { TerekaRecord, TerekaRegion } from "../types/domain";

export type TerekaDateInput = Date | number | string | null | undefined;
export type TerekaMoneyInput = number | string | null | undefined;

const displayLabels: Record<string, string> = {
  tenantId: "SACCO ID",
  tenantName: "SACCO",
  tenant: "SACCO",
  tenants: "SACCOs",
  arrears1To30Amount: "1-30 days",
  arrears31To60Amount: "31-60 days",
  arrears61To90Amount: "61-90 days",
  arrearsOver90Amount: "90+ days",
  oldestArrearsDays: "Oldest arrears days",
  currentDueAmount: "Current due",
  daysPastDue: "Days past due",
  agingBucket: "Aging bucket",
};

const moneyColumns = new Set([
  "debit",
  "credit",
  "savings",
  "shares",
  "welfare",
  "savingsDeposits",
  "shareDeposits",
  "welfareDeposits",
  "loanRepayments",
  "treasurerCash",
  "mobileMoney",
  "totalDeposits",
  "loanPortfolio",
  "loansAtRisk",
  "expenseTotal",
  "assetCost",
  "assetNetBookValue",
  "monthlyInstallment",
  "principalDue",
  "interestDue",
  "totalDue",
  "paidAmount",
  "balanceDue",
]);

const camelAliases: Record<string, string> = {
  tenantName: "tenant",
  packageName: "package",
  expiryDate: "expiry",
  postedAt: "date",
  applicationNo: "id",
  requestedAmount: "amount",
  fullName: "name",
  membershipNo: "no",
  kycStatus: "kyc",
  savingsBalance: "savings",
  sharesBalance: "shares",
  welfareBalance: "welfare",
};

export function formatMoneyValue(value: TerekaMoneyInput, region: TerekaRegion): string {
  return new Intl.NumberFormat(region.locale, {
    style: "currency",
    currency: region.currency,
    minimumFractionDigits: region.currencyDigits,
    maximumFractionDigits: region.currencyDigits,
  }).format(Number(value || 0));
}

export function formatDateValue(value: TerekaDateInput, region: TerekaRegion): string {
  return formatDateWithOptions(value, region, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeValue(value: TerekaDateInput, region: TerekaRegion): string {
  return formatDateWithOptions(value, region, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDateValue(value: TerekaDateInput, region: TerekaRegion): string {
  return formatDateWithOptions(value, region, {
    day: "2-digit",
    month: "short",
  });
}

export function labelizeValue(value: unknown): string {
  const key = String(value);
  if (displayLabels[key]) return displayLabels[key];
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function normalizeValue(value: unknown): string {
  return String(value || "").toLowerCase();
}

export function sumValues(rows: TerekaRecord[], ...keys: string[]): number {
  return rows.reduce((total, row) => {
    const rawValue = keys.map((key) => row[key]).find((item) => item !== undefined);
    return total + Number(rawValue || 0);
  }, 0);
}

export function formatTableValue(row: TerekaRecord, column: string, region: TerekaRegion): string {
  const value = row[column] ?? row[snakeColumn(column)] ?? row[camelFallbackColumn(column)] ?? "";
  const normalizedColumn = column.toLowerCase();
  if (typeof value === "string" && value.startsWith("<span class=\"complaint-chip")) return value;
  if (normalizedColumn.includes("amount") || normalizedColumn.includes("balance") || moneyColumns.has(column)) {
    return formatMoneyValue(Number(value || 0), region);
  }
  if (normalizedColumn.includes("status") || normalizedColumn.includes("severity")) {
    return `<span class="status ${statusClassValue(value)}">${escapeHtmlValue(String(value || "Pending"))}</span>`;
  }
  if (isDateColumnValue(column)) return escapeHtmlValue(formatTableDateValue(value, column, region));
  return escapeHtmlValue(String(value || "-"));
}

export function isDateColumnValue(column: string): boolean {
  const text = column.toLowerCase();
  return text === "date"
    || text.endsWith("date")
    || text.endsWith("at")
    || ["createdat", "updatedat", "postedat", "sentat", "readat", "expiresat", "usedat"].includes(text);
}

export function formatTableDateValue(value: unknown, column: string, region: TerekaRegion): string {
  if (!value) return "-";
  const text = String(value);
  const isDateOnly = column.toLowerCase() === "date"
    || column.toLowerCase().endsWith("date")
    || /^\d{4}-\d{2}-\d{2}$/.test(text);
  return isDateOnly ? formatDateValue(text, region) : formatDateTimeValue(text, region);
}

export function snakeColumn(column: string): string {
  return column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function camelFallbackColumn(column: string): string {
  return camelAliases[column] || column;
}

export function statusClassValue(value: unknown): "active" | "danger" | "pending" {
  const text = normalizeValue(value);
  if (["failed", "rejected", "suspended", "expired", "overdue", "arrears", "unpaid"].some((item) => text.includes(item))) {
    return "danger";
  }
  if (["active", "approved", "paid", "healthy", "resolved", "completed", "posted"].some((item) => text.includes(item))) {
    return "active";
  }
  return "pending";
}

export function escapeHtmlValue(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

function formatDateWithOptions(
  value: TerekaDateInput,
  region: TerekaRegion,
  options: Intl.DateTimeFormatOptions
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(region.locale, options);
}
