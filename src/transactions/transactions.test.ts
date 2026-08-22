import { describe, expect, it } from "vitest";
import {
  buildTransactionOverviewSummary,
  buildTransactionReceiptRegister,
  buildTransactionReceiptSummary,
  buildTransactionReceiptingQueue,
  buildTransactionRows,
} from "./transactions";
import type { TerekaFinancialTransaction } from "../types/domain";

const memberName = (id?: string): string => (id ? `Member ${id}` : "Unknown");

function txn(overrides: Partial<TerekaFinancialTransaction>): TerekaFinancialTransaction {
  return overrides as TerekaFinancialTransaction;
}

// A posted mobile-money savings deposit, a posted treasurer-cash loan repayment, and a reversal entry.
const transactions: TerekaFinancialTransaction[] = [
  txn({ id: "t1", memberId: "m1", status: "posted", type: "savings_deposit", amount: 100000, provider: "mtn", postedAt: "2026-07-10T10:00:00Z" }),
  txn({ id: "t2", memberId: "m2", status: "posted", type: "loan_repayment", amount: 50000, channel: "cash", postedAt: "2026-07-11T10:00:00Z" }),
  txn({ id: "t3", memberId: "m1", status: "posted", type: "savings_deposit", amount: -100000, originalTransactionId: "t1", reference: "REV-1", postedAt: "2026-07-12T10:00:00Z" }),
];

describe("buildTransactionRows", () => {
  const rows = buildTransactionRows({ memberName, transactions });

  it("derives route, lifecycle, approval, receipt and reversal state for a posted mobile-money deposit", () => {
    const row = rows[0];
    expect(row.memberName).toBe("Member m1");
    expect(row.paymentRoute).toBe("Mobile money");
    expect(row.paymentStatus).toBe("Posted");
    expect(row.approvalReadiness).toBe("Posted");
    expect(row.receiptStatus).toBe("Receipt ready");
    expect(row.reversalStatus).toBe("Reversible with reason");
    expect(row.actionLabel).toBe("Review");
  });

  it("marks a treasurer-cash repayment as posted and receipt-ready", () => {
    const row = rows[1];
    expect(row.paymentRoute).toBe("Treasurer cash");
    expect(row.paymentStatus).toBe("Posted");
    expect(row.approvalReadiness).toBe("Posted");
    expect(row.receiptStatus).toBe("Receipt ready");
    expect(row.reversalStatus).toBe("Reversible with reason");
    expect(row.actionLabel).toBe("Review");
  });

  it("recognises a reversal entry (linked to an original transaction)", () => {
    expect(rows[2].reversalStatus).toBe("Reversal entry");
  });
});

describe("receipting queue and register", () => {
  const rows = buildTransactionRows({ memberName, transactions });

  it("queues posted receiptable rows newest first", () => {
    const queue = buildTransactionReceiptingQueue(rows);
    expect(queue.map((row) => row.id)).toEqual(["t3", "t2", "t1"]);
    expect(queue[0].receiptingAction).toBe("Load receipt");
    expect(queue[0].actionLabel).toBe("Receipt");
    expect(queue[2].receiptingAction).toBe("Load receipt");
  });

  it("registers only posted, non-reversal rows with a receipt number", () => {
    const register = buildTransactionReceiptRegister(rows);
    expect(register.map((row) => row.id)).toEqual(["t2", "t1"]);
    expect(register[0].receiptNo).toBe("RCT-t2");
    expect(register[0].receiptStatus).toBe("Receipted");
  });
});

describe("summaries", () => {
  const rows = buildTransactionRows({ memberName, transactions });

  it("summarises receipts by route and type", () => {
    const summary = buildTransactionReceiptSummary(rows);
    expect(summary.totalRows).toBe(3);
    expect(summary.totalAmount).toBe(50000);
    expect(summary.receiptReady).toBe(3);
    expect(summary.mobileMoney).toBe(1);
    expect(summary.treasurerCash).toBe(2);
    expect(summary.loanRepayments).toBe(1);
    expect(summary.savingsDeposits).toBe(2);
  });

  it("summarises the overview with pending, posted value and reversals", () => {
    const summary = buildTransactionOverviewSummary(rows);
    expect(summary.totalRows).toBe(3);
    expect(summary.pendingApproval).toBe(0);
    // Posted deposit (+100000), cash repayment (+50000) and reversal (-100000) net to 50000.
    expect(summary.postedValue).toBe(50000);
    expect(summary.reversed).toBe(1);
  });
});
