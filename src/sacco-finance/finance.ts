import type {
  TerekaFinancialAccount,
  TerekaFinancialProduct,
  TerekaFundingSource,
  TerekaMemberProfile,
  TerekaRecord,
  TerekaWelfareClaim,
} from "../types/domain";

export interface TerekaFundingSourceSummary {
  activeCount: number;
  activeTotal: number;
  closedCount: number;
  count: number;
  total: number;
}

export interface TerekaSavingsSummary {
  accountCount: number;
  activeProductCount: number;
  balanceTotal: number;
  contributionTotal: number;
  productCount: number;
}

export interface TerekaSharesSummary {
  accountCount: number;
  activeMemberCount: number;
  activeProductCount: number;
  balanceTotal: number;
  contributionTotal: number;
  productCount: number;
}

export interface TerekaWelfareSummary {
  accountCount: number;
  approvedCount: number;
  claimCount: number;
  paidAmount: number;
  paidCount: number;
  productCount: number;
  submittedCount: number;
}

export interface TerekaWelfareClaimRow extends TerekaWelfareClaim, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
}

export interface TerekaFinanceMemberOption extends TerekaRecord {
  fullName?: string;
  id?: string;
  label: string;
  membershipNo?: string;
  status?: string;
}

export function buildSavingsSummary(input: {
  accounts: TerekaFinancialAccount[];
  members: Array<TerekaMemberProfile & TerekaRecord>;
  products: TerekaFinancialProduct[];
}): TerekaSavingsSummary {
  return {
    accountCount: input.accounts.length,
    activeProductCount: activeFinanceProducts(input.products).length,
    balanceTotal: sumFinanceValues(input.members, "savingsBalance", "savings"),
    contributionTotal: sumFinanceValues(input.products, "contributionAmount", "minimumBalance"),
    productCount: input.products.length,
  };
}

export function buildSharesSummary(input: {
  accounts: Array<TerekaFinancialAccount & TerekaRecord>;
  members: Array<TerekaMemberProfile & TerekaRecord>;
  products: TerekaFinancialProduct[];
}): TerekaSharesSummary {
  return {
    accountCount: input.accounts.length,
    activeMemberCount: uniqueFinanceCount(input.accounts, "memberId"),
    activeProductCount: activeFinanceProducts(input.products).length,
    balanceTotal: sumFinanceValues(input.members, "sharesBalance", "shares"),
    contributionTotal: sumFinanceValues(input.products, "contributionAmount"),
    productCount: input.products.length,
  };
}

export function buildWelfareSummary(input: {
  accounts: TerekaFinancialAccount[];
  claims: TerekaWelfareClaim[];
  products: TerekaFinancialProduct[];
}): TerekaWelfareSummary {
  const submitted = welfareSubmittedClaims(input.claims);
  const approved = input.claims.filter((row) => normalizeFinanceText(row.status) === "approved");
  const paid = input.claims.filter((row) => normalizeFinanceText(row.status) === "paid");
  return {
    accountCount: input.accounts.length,
    approvedCount: approved.length,
    claimCount: input.claims.length,
    paidAmount: sumFinanceValues(paid, "amount"),
    paidCount: paid.length,
    productCount: input.products.length,
    submittedCount: submitted.length,
  };
}

export function buildWelfareClaimRows(claims: TerekaWelfareClaim[]): TerekaWelfareClaimRow[] {
  return claims.map((claim) => ({
    ...claim,
    action: "welfare-claim-detail",
    actionLabel: "Review",
    actionId: claim.id,
  }));
}

export function buildFundingSourceSummary(sources: Array<TerekaFundingSource & TerekaRecord>): TerekaFundingSourceSummary {
  const rows = sources || [];
  const active = rows.filter((row) => normalizeFinanceText(row.status) !== "closed");
  const sum = (list: Array<TerekaFundingSource & TerekaRecord>): number =>
    list.reduce((total, row) => total + Number(row.amount || 0), 0);
  return {
    count: rows.length,
    activeCount: active.length,
    closedCount: rows.length - active.length,
    total: sum(rows),
    activeTotal: sum(active),
  };
}

export function activeFinanceProducts(products: TerekaFinancialProduct[]): TerekaFinancialProduct[] {
  return products.filter((row) => normalizeFinanceText(row.status) === "active");
}

export function welfareSubmittedClaims(claims: TerekaWelfareClaim[]): TerekaWelfareClaim[] {
  return claims.filter((row) => ["submitted", "pending", "pending_approval"].some((word) => normalizeFinanceText(row.status).includes(word)));
}

export function activeFinanceMemberOptions(members: Array<TerekaMemberProfile & TerekaRecord>): TerekaFinanceMemberOption[] {
  return members
    .filter((member) => normalizeFinanceText(member.status) === "active")
    .map((member) => ({
      ...member,
      fullName: member.fullName,
      id: member.id,
      label: `${member.membershipNo || ""} - ${member.fullName || ""}`.trim(),
      membershipNo: member.membershipNo,
      status: member.status,
    }));
}

function uniqueFinanceCount(rows: TerekaRecord[], key: string): number {
  return new Set(rows.map((row) => row[key]).filter((value) => value !== undefined && value !== null && value !== "")).size;
}

function sumFinanceValues(rows: object[], ...keys: string[]): number {
  return rows.reduce((total, row) => {
    const record = row as TerekaRecord;
    const value = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null && item !== "");
    return total + Number(value || 0);
  }, 0);
}

function normalizeFinanceText(value: unknown): string {
  return String(value || "").toLowerCase();
}
