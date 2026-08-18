import { describe, expect, it } from "vitest";
import {
  activeFinanceMemberOptions,
  activeFinanceProducts,
  buildFundingSourceSummary,
  buildSavingsSummary,
  buildSharesSummary,
  buildWelfareClaimRows,
  buildWelfareSummary,
  welfareSubmittedClaims,
} from "./finance";
import type {
  TerekaFinancialAccount,
  TerekaFinancialProduct,
  TerekaFundingSource,
  TerekaMemberProfile,
  TerekaRecord,
  TerekaWelfareClaim,
} from "../types/domain";

const account = (o: Partial<TerekaFinancialAccount> & TerekaRecord): TerekaFinancialAccount & TerekaRecord =>
  o as TerekaFinancialAccount & TerekaRecord;
const product = (o: Partial<TerekaFinancialProduct>): TerekaFinancialProduct => o as TerekaFinancialProduct;
const member = (o: Partial<TerekaMemberProfile> & TerekaRecord): TerekaMemberProfile & TerekaRecord =>
  o as TerekaMemberProfile & TerekaRecord;
const claim = (o: Partial<TerekaWelfareClaim>): TerekaWelfareClaim => o as TerekaWelfareClaim;

const members = [
  member({ id: "mA", status: "active", fullName: "Amina", membershipNo: "GV-001", savingsBalance: 500000, sharesBalance: 100000 }),
  member({ id: "mB", status: "active", fullName: "Bosco", membershipNo: "GV-002", savings: 200000, shares: 50000 }),
  member({ id: "mC", status: "inactive", fullName: "Carol", membershipNo: "GV-003" }),
];

const products = [
  product({ id: "p1", status: "active", productType: "savings", contributionAmount: 10000 }),
  product({ id: "p2", status: "inactive", productType: "savings", minimumBalance: 5000 }),
  product({ id: "p3", status: "active", productType: "shares", contributionAmount: 20000 }),
];

describe("buildSavingsSummary", () => {
  it("sums balances (savingsBalance then savings fallback) and active products", () => {
    const summary = buildSavingsSummary({
      accounts: [account({ id: "a1", memberId: "mA" }), account({ id: "a2", memberId: "mB" })],
      members,
      products,
    });
    expect(summary.accountCount).toBe(2);
    expect(summary.productCount).toBe(3);
    expect(summary.activeProductCount).toBe(2);
    expect(summary.balanceTotal).toBe(700000);
    // contributionAmount then minimumBalance fallback: 10000 + 5000 + 20000.
    expect(summary.contributionTotal).toBe(35000);
  });
});

describe("buildSharesSummary", () => {
  it("counts unique share-holding members and sums share balances", () => {
    const summary = buildSharesSummary({
      accounts: [account({ memberId: "mA" }), account({ memberId: "mA" }), account({ memberId: "mB" })],
      members,
      products,
    });
    expect(summary.accountCount).toBe(3);
    expect(summary.activeMemberCount).toBe(2);
    expect(summary.balanceTotal).toBe(150000);
    // Shares contribution uses contributionAmount only (no minimumBalance fallback): 10000 + 20000.
    expect(summary.contributionTotal).toBe(30000);
  });
});

describe("welfare", () => {
  const claims = [
    claim({ id: "c1", status: "submitted", amount: 30000 }),
    claim({ id: "c2", status: "approved", amount: 40000 }),
    claim({ id: "c3", status: "paid", amount: 50000 }),
    claim({ id: "c4", status: "pending_approval", amount: 10000 }),
  ];

  it("summarises claim states and paid amounts", () => {
    const summary = buildWelfareSummary({
      accounts: [account({ id: "w1" })],
      claims,
      products: [product({ id: "wp", status: "active" })],
    });
    expect(summary.claimCount).toBe(4);
    expect(summary.submittedCount).toBe(2); // submitted + pending_approval
    expect(summary.approvedCount).toBe(1);
    expect(summary.paidCount).toBe(1);
    expect(summary.paidAmount).toBe(50000);
    expect(summary.accountCount).toBe(1);
    expect(summary.productCount).toBe(1);
  });

  it("flags submitted/pending claims and builds reviewable rows", () => {
    expect(welfareSubmittedClaims(claims).map((c) => c.id)).toEqual(["c1", "c4"]);
    const rows = buildWelfareClaimRows(claims);
    expect(rows[0].action).toBe("welfare-claim-detail");
    expect(rows[0].actionLabel).toBe("Review");
    expect(rows[0].actionId).toBe("c1");
  });
});

describe("buildFundingSourceSummary", () => {
  const source = (o: Partial<TerekaFundingSource>): TerekaFundingSource & TerekaRecord => o as TerekaFundingSource & TerekaRecord;

  it("totals all sources and separates active from closed capital", () => {
    const summary = buildFundingSourceSummary([
      source({ id: "f1", sourceType: "external_borrowing", amount: 50000000, status: "active" }),
      source({ id: "f2", sourceType: "grant", amount: 10000000, status: "active" }),
      source({ id: "f3", sourceType: "external_borrowing", amount: 30000000, status: "closed" }),
    ]);
    expect(summary.count).toBe(3);
    expect(summary.activeCount).toBe(2);
    expect(summary.closedCount).toBe(1);
    expect(summary.total).toBe(90000000);
    expect(summary.activeTotal).toBe(60000000);
  });

  it("handles an empty register", () => {
    const summary = buildFundingSourceSummary([]);
    expect(summary).toEqual({ count: 0, activeCount: 0, closedCount: 0, total: 0, activeTotal: 0 });
  });
});

describe("active-only filters", () => {
  it("keeps active products and active member options with formatted labels", () => {
    expect(activeFinanceProducts(products).map((p) => p.id)).toEqual(["p1", "p3"]);
    const options = activeFinanceMemberOptions(members);
    expect(options).toHaveLength(2);
    expect(options[0].label).toBe("GV-001 - Amina");
  });
});
