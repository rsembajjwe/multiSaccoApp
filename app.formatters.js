// Typed formatting bridge for the classic Tereka Online SPA.
// Keep behavior aligned with src/formatting/formatters.ts while runtime modules migrate to ES modules.

/** @type {TerekaFormatterBridge} */
var TerekaFormatters = Object.freeze({
  formatMoneyValue(value, region) {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      minimumFractionDigits: region.currencyDigits,
      maximumFractionDigits: region.currencyDigits
    }).format(Number(value || 0));
  },
  formatDateValue(value, region) {
    return formatDateWithOptions(value, region, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  },
  formatDateTimeValue(value, region) {
    return formatDateWithOptions(value, region, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  },
  formatShortDateValue(value, region) {
    return formatDateWithOptions(value, region, {
      day: "2-digit",
      month: "short"
    });
  },
  labelizeValue(value) {
    const displayLabels = {
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
      agingBucket: "Aging bucket"
    };
    if (displayLabels[value]) return displayLabels[value];
    return String(value).replace(/[_-]+/g, " ").replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").trim().replace(/^./, (char) => char.toUpperCase());
  },
  normalizeValue(value) {
    return String(value || "").toLowerCase();
  },
  sumValues(rows, ...keys) {
    return rows.reduce((total, row) => total + Number(keys.map((key) => row[key]).find((item) => item !== undefined) || 0), 0);
  },
  formatTableValue(row, column, region) {
    const value = row[column] ?? row[this.snakeColumn(column)] ?? row[this.camelFallbackColumn(column)] ?? "";
    const normalizedColumn = column.toLowerCase();
    const moneyColumns = ["debit", "credit", "savings", "shares", "welfare", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits", "loanPortfolio", "loansAtRisk", "expenseTotal", "assetCost", "assetNetBookValue", "monthlyInstallment", "principalDue", "interestDue", "totalDue", "paidAmount", "balanceDue"];
    if (normalizedColumn.includes("amount") || normalizedColumn.includes("balance") || moneyColumns.includes(column)) return this.formatMoneyValue(Number(value || 0), region);
    if (normalizedColumn.includes("status") || normalizedColumn.includes("severity")) return `<span class="status ${this.statusClassValue(value)}">${this.escapeHtmlValue(String(value || "Pending"))}</span>`;
    if (this.isDateColumnValue(column)) return this.escapeHtmlValue(this.formatTableDateValue(value, column, region));
    return this.escapeHtmlValue(String(value || "-"));
  },
  isDateColumnValue(column) {
    const text = column.toLowerCase();
    return text === "date" || text.endsWith("date") || text.endsWith("at") || ["createdat", "updatedat", "postedat", "sentat", "readat", "expiresat", "usedat"].includes(text);
  },
  formatTableDateValue(value, column, region) {
    if (!value) return "-";
    const text = String(value);
    const isDateOnly = column.toLowerCase() === "date" || column.toLowerCase().endsWith("date") || /^\d{4}-\d{2}-\d{2}$/.test(text);
    return isDateOnly ? this.formatDateValue(value, region) : this.formatDateTimeValue(value, region);
  },
  snakeColumn(column) {
    return column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  },
  camelFallbackColumn(column) {
    const aliases = {
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
      welfareBalance: "welfare"
    };
    return aliases[column] || column;
  },
  statusClassValue(value) {
    const text = this.normalizeValue(value);
    if (["active", "approved", "paid", "healthy", "resolved", "completed", "posted"].some((item) => text.includes(item))) return "active";
    if (["failed", "rejected", "suspended", "expired", "overdue", "arrears"].some((item) => text.includes(item))) return "danger";
    return "pending";
  },
  escapeHtmlValue(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  }
});

function formatDateWithOptions(value, region, options) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(region.locale, options);
}
