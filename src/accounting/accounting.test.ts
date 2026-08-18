import { describe, expect, it } from "vitest";
import {
  buildBalanceSheet,
  buildIncomeStatement,
  buildReconciliationReviewModel,
  buildTrialBalance,
} from "./accounting";
import type { TerekaMobileMoneyCallback, TerekaRecord, TerekaStatementLine } from "../types/domain";

const chart = [
  { code: "1000", name: "Cash on Hand", type: "asset", normalBalance: "debit" },
  { code: "2000", name: "Member Savings", type: "liability", normalBalance: "credit" },
  { code: "3000", name: "Retained Earnings", type: "equity", normalBalance: "credit" },
  { code: "4000", name: "Loan Interest Income", type: "income", normalBalance: "credit" },
  { code: "5000", name: "Salaries Expense", type: "expense", normalBalance: "debit" },
] as unknown as TerekaRecord[];

const journals = [
  { reference: "J1", status: "posted", lines: [
    { accountCode: "1000", debit: 100000, credit: 0 },
    { accountCode: "2000", debit: 0, credit: 100000 },
  ] },
  { reference: "J2", status: "posted", lines: [
    { accountCode: "1000", debit: 30000, credit: 0 },
    { accountCode: "4000", debit: 0, credit: 30000 },
  ] },
  { reference: "J3", status: "posted", lines: [
    { accountCode: "5000", debit: 20000, credit: 0 },
    { accountCode: "1000", debit: 0, credit: 20000 },
  ] },
  // Draft entry must be excluded from all statements.
  { reference: "J4", status: "draft", lines: [
    { accountCode: "1000", debit: 999999, credit: 0 },
    { accountCode: "2000", debit: 0, credit: 999999 },
  ] },
] as unknown as TerekaRecord[];

describe("financial statements", () => {
  it("builds a balanced trial balance from posted entries only", () => {
    const trial = buildTrialBalance(journals, chart);
    const cash = trial.rows.find((row) => row.code === "1000");
    expect(cash?.debit).toBe(110000); // 100000 + 30000 − 20000; draft excluded
    expect(trial.totalDebit).toBe(130000);
    expect(trial.totalCredit).toBe(130000);
    expect(trial.balanced).toBe(true);
  });

  it("computes income, expenditure and net surplus", () => {
    const income = buildIncomeStatement(journals, chart);
    expect(income.totalIncome).toBe(30000);
    expect(income.totalExpense).toBe(20000);
    expect(income.netSurplus).toBe(10000);
    expect(income.income.map((i) => i.name)).toEqual(["Loan Interest Income"]);
  });

  it("builds a balance sheet where assets equal liabilities plus equity (with current surplus)", () => {
    const sheet = buildBalanceSheet(journals, chart);
    expect(sheet.totalAssets).toBe(110000);
    expect(sheet.totalLiabilities).toBe(100000);
    // Retained Earnings has no activity; current-period surplus (10000) accrues to equity.
    expect(sheet.totalEquity).toBe(10000);
    expect(sheet.equity.some((e) => e.name === "Current period surplus" && e.amount === 10000)).toBe(true);
    expect(sheet.balanced).toBe(true);
  });
});

const labelize = (value: unknown): string => String(value ?? "").replace(/_/g, " ");

function statementLine(overrides: Partial<TerekaStatementLine>): TerekaStatementLine & TerekaRecord {
  return { ...overrides } as TerekaStatementLine & TerekaRecord;
}

function callback(overrides: Partial<TerekaMobileMoneyCallback>): TerekaMobileMoneyCallback & TerekaRecord {
  return { ...overrides } as TerekaMobileMoneyCallback & TerekaRecord;
}

describe("reconciliation review model — per-SACCO account attribution passthrough", () => {
  it("preserves the suggested collection account on unmatched statement lines", () => {
    const model = buildReconciliationReviewModel({
      callbacks: [],
      labelize,
      paymentRequests: [],
      reconciliation: {
        summary: {},
        matches: [],
        unmatchedStatementLines: [
          statementLine({
            externalReference: "BANK-0001",
            suggestedCollectionAccountId: "acct_1",
            suggestedCollectionAccount: "Stanbic 01234567890",
          }),
        ],
        unmatchedLedgerLines: [],
      },
    });

    expect(model.unmatchedStatementLines).toHaveLength(1);
    const [line] = model.unmatchedStatementLines as Array<TerekaStatementLine & TerekaRecord>;
    expect(line.suggestedCollectionAccountId).toBe("acct_1");
    expect(line.suggestedCollectionAccount).toBe("Stanbic 01234567890");
  });

  it("preserves the suggested collection account on callback exceptions", () => {
    const model = buildReconciliationReviewModel({
      callbacks: [
        callback({
          externalReference: "MTN-0001",
          status: "pending_approval",
          provider: "mtn_momo",
          suggestedCollectionAccountId: "acct_mtn",
          suggestedCollectionAccount: "MTN 0779494225",
        }),
        // A posted, non-duplicate callback is not an exception and is filtered out.
        callback({ externalReference: "MTN-0002", status: "posted", duplicate: false }),
      ],
      labelize,
      paymentRequests: [],
      reconciliation: { summary: {}, matches: [], unmatchedStatementLines: [], unmatchedLedgerLines: [] },
    });

    expect(model.callbackExceptions).toHaveLength(1);
    const [exception] = model.callbackExceptions;
    expect(exception.externalReference).toBe("MTN-0001");
    expect(exception.suggestedCollectionAccountId).toBe("acct_mtn");
    expect(exception.suggestedCollectionAccount).toBe("MTN 0779494225");
  });
});
