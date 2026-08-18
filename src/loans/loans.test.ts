import { describe, expect, it } from "vitest";
import { activeLoanMemberOptions, buildLoanPortfolioSummary, buildLoanRows, loanProductOptions } from "./loans";
import type { TerekaFinancialProduct, TerekaLoan, TerekaMemberProfile, TerekaRecord } from "../types/domain";

const labelize = (value: unknown): string => String(value ?? "").replace(/_/g, " ");
const formatMoney = (value: unknown): string => `UGX ${Number(value ?? 0).toLocaleString("en-US")}`;
const memberName = (id?: string): string => (id === "m1" ? "Amina" : id ? `Member ${id}` : "Unknown");

function loan(overrides: Partial<TerekaLoan> & TerekaRecord): TerekaLoan & TerekaRecord {
  return overrides as TerekaLoan & TerekaRecord;
}

describe("buildLoanRows", () => {
  it("derives servicing status and balance for an active loan, preferring outstandingBalance", () => {
    const [row] = buildLoanRows({
      formatMoney,
      labelize,
      memberName,
      loans: [loan({ id: "l1", memberId: "m1", status: "active", outstandingBalance: 400000, amount: 1000000 })],
    });
    expect(row.outstandingBalance).toBe(400000);
    expect(row.memberName).toBe("Amina");
    expect(row.approvalReadiness).toBe("Disbursed");
    expect(row.servicingStatus).toBe("Outstanding UGX 400,000");
    expect(row.actionLabel).toBe("Service");
  });

  it("marks approved loans ready for disbursement and falls back to amount for balance", () => {
    const [row] = buildLoanRows({
      formatMoney,
      labelize,
      memberName,
      loans: [loan({ id: "l2", memberId: "m2", status: "approved", amount: 750000, guarantors: 2 })],
    });
    expect(row.outstandingBalance).toBe(750000);
    expect(row.approvalReadiness).toBe("Ready for disbursement");
    expect(row.actionLabel).toBe("Disburse");
    expect(row.guarantorReadiness).toBe("2 guarantor(s)");
  });

  it("treats submitted loans as awaiting approval and needing a guarantor", () => {
    const [row] = buildLoanRows({
      formatMoney,
      labelize,
      memberName,
      loans: [loan({ id: "l3", memberId: "m3", status: "submitted", amount: 200000 })],
    });
    expect(row.approvalReadiness).toBe("Awaiting approval");
    expect(row.guarantorReadiness).toBe("Needs guarantor");
    expect(row.actionLabel).toBe("Review");
  });

  it("shows 'Guarantor pending' from the stage, labelizes unknown statuses, and reports repaid servicing", () => {
    const [row] = buildLoanRows({
      formatMoney,
      labelize,
      memberName,
      loans: [loan({ id: "l4", memberId: "m4", status: "rejected", stage: "guarantor_review", repaymentTotal: 125000 })],
    });
    expect(row.guarantorReadiness).toBe("Guarantor pending");
    expect(row.approvalReadiness).toBe("rejected");
    expect(row.servicingStatus).toBe("Repaid UGX 125,000");
  });
});

describe("buildLoanPortfolioSummary", () => {
  it("aggregates counts, outstanding principal and arrears across the portfolio", () => {
    const rows = buildLoanRows({
      formatMoney,
      labelize,
      memberName,
      loans: [
        loan({ id: "a", status: "active", outstandingBalance: 500000, arrearsAmount: 50000, arrearsOver90Amount: 20000 }),
        loan({ id: "b", status: "approved", amount: 300000 }),
        loan({ id: "c", status: "submitted", amount: 100000 }),
        loan({ id: "d", status: "active", outstandingBalance: 250000, dsr: 55 }),
        loan({ id: "e", status: "active", stage: "overdue", outstandingBalance: 90000 }),
      ],
    });
    const summary = buildLoanPortfolioSummary(rows);
    expect(summary.total).toBe(5);
    expect(summary.active).toBe(3);
    expect(summary.approved).toBe(1);
    expect(summary.submitted).toBe(1);
    // buildLoanRows fills outstandingBalance from amount when no balance is set, so every row contributes:
    // 500000 + 300000 + 100000 + 250000 + 90000.
    expect(summary.outstandingPrincipal).toBe(1240000);
    expect(summary.arrearsTotal).toBe(50000);
    expect(summary.over90Total).toBe(20000);
    // High-DSR active loan + the overdue-stage loan both count as at risk.
    expect(summary.atRisk).toBe(2);
  });
});

describe("option builders", () => {
  it("lists only active members and can exclude one", () => {
    const members = [
      { id: "m1", fullName: "Amina", membershipNo: "GV-001", status: "active" },
      { id: "m2", fullName: "Bosco", membershipNo: "GV-002", status: "inactive" },
      { id: "m3", fullName: "Carol", membershipNo: "GV-003", status: "active" },
    ] as Array<TerekaMemberProfile & TerekaRecord>;
    const options = activeLoanMemberOptions(members, "m3");
    expect(options).toHaveLength(1);
    expect(options[0].label).toBe("GV-001 - Amina");
  });

  it("returns configured loan products, else sensible defaults", () => {
    const products = [
      { id: "p1", name: "School Fees Loan", productType: "loan", status: "active" },
      { id: "p2", name: "Fixed Savings", productType: "savings", status: "active" },
    ] as Array<TerekaFinancialProduct & TerekaRecord>;
    expect(loanProductOptions(products).map((option) => option.name)).toEqual(["School Fees Loan"]);
    expect(loanProductOptions([]).map((option) => option.name)).toEqual(["Development Loan", "Emergency Loan"]);
  });
});
