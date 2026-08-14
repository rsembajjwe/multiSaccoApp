import { describe, expect, it } from "vitest";
import {
  buildMemberDraftRows,
  buildMemberAdminMessageRows,
  buildMemberGuarantorRows,
  buildMemberMonthlyPerformanceRows,
  buildMemberMobileMoneyRows,
  buildMemberPaymentLifecycleRows,
  buildMemberPaymentProviderOptions,
  buildMemberPaymentRequestRows,
  buildMemberStatementLines,
  performanceMonthEndDateLabel,
  performanceMonthLabel,
  performanceRowId,
  paymentLifecycleStatusFor,
  paymentRouteLabelFor,
  receiptLifecycleStatusFor,
} from "./performance";

const labelize = (value: unknown): string => String(value || "")
  .replace(/_/g, " ")
  .replace(/\b\w/g, (char) => char.toUpperCase());

describe("member performance model", () => {
  it("normalizes statement lines and monthly Treasurer/mobile-money totals", () => {
    const dashboard = {
      statementLines: [
        {
          id: "tx1",
          reference: "CASH-001",
          description: "Savings deposit",
          credit: 5000,
          runningBalance: 5000,
          postedAt: "2026-08-04T10:00:00Z",
          provider: "treasurer_cash",
          status: "posted",
        },
        {
          id: "tx2",
          reference: "MM-001",
          description: "Share purchase",
          credit: 10000,
          runningBalance: 15000,
          postedAt: "2026-08-11T10:00:00Z",
          provider: "mtn",
          status: "posted",
        },
      ],
    };

    expect(buildMemberStatementLines(dashboard).map((line) => line.reference)).toEqual(["CASH-001", "MM-001"]);

    const [month] = buildMemberMonthlyPerformanceRows(dashboard);
    expect(month.month).toBe("2026-08");
    expect(month.date).toContain("2026");
    expect(month.savingsDeposits).toBe(5000);
    expect(month.shareDeposits).toBe(10000);
    expect(month.treasurerCash).toBe(5000);
    expect(month.mobileMoney).toBe(10000);
    expect(month.totalDeposits).toBe(15000);
    expect(month.closingBalance).toBe(15000);
  });

  it("builds payment lifecycle rows for drafts, provider requests and posted receipts", () => {
    const rows = buildMemberPaymentLifecycleRows({
      dashboard: {
        statementLines: [{
          id: "posted-1",
          reference: "RCT-1",
          description: "Mobile money savings deposit",
          credit: 5000,
          postedAt: "2026-08-12T08:00:00Z",
          provider: "mtn",
          status: "posted",
          receiptNo: "R-1",
        }],
      },
      drafts: [{
        id: "draft-1",
        type: "payment",
        title: "Savings draft",
        status: "Draft",
        createdAt: "2026-08-10T08:00:00Z",
        updatedAt: "2026-08-10T09:00:00Z",
        payload: { amount: 5000, externalReference: "DRAFT-1", provider: "treasurer_cash" },
      }],
      labelize,
      paymentRequests: [{
        id: "request-1",
        amount: 7000,
        externalReference: "MM-REQ-1",
        provider: "airtel",
        purpose: "savings_deposit",
        requestedAt: "2026-08-11T08:00:00Z",
        status: "pending_callback",
      }],
    });

    expect(rows.map((row) => row.reference)).toEqual(["RCT-1", "MM-REQ-1", "DRAFT-1"]);
    expect(rows[0].paymentRoute).toBe("Mobile money");
    expect(rows[1].paymentStatus).toBe("Pending mobile money");
    expect(rows[2].receiptStatus).toBe("Not receipted");
  });

  it("filters unavailable and M-Pesa payment providers", () => {
    const providers = buildMemberPaymentProviderOptions(true, [
      { network: "mtn", providerId: "mtn", label: "MTN MoMo", available: true },
      { network: "airtel", providerId: "airtel", label: "Airtel Money", available: false },
      { network: "mpesa", providerId: "mpesa", label: "M-PESA", available: true },
    ], labelize);

    expect(providers).toEqual([{ network: "mtn", providerId: "mtn", label: "MTN MoMo" }]);
    expect(buildMemberPaymentProviderOptions(false, [{ network: "mtn" }], labelize)).toEqual([]);
  });

  it("handles provider defaults and non-array provider payloads", () => {
    expect(buildMemberPaymentProviderOptions(true, null, labelize)).toEqual([]);
    expect(buildMemberPaymentProviderOptions(true, [
      { providerId: "airtel_money", available: true },
      null,
    ], labelize)).toEqual([{ network: "default", providerId: "airtel_money", label: "Airtel Money" }]);
  });

  it("adds row actions for payment requests, drafts and guarantor decisions", () => {
    expect(buildMemberPaymentRequestRows([{ id: "req-1", status: "pending" }])[0]).toMatchObject({
      action: "payment-provider-status",
      actionId: "req-1",
      actionLabel: "Check status",
    });

    expect(buildMemberDraftRows([{
      id: "draft-1",
      type: "complaint",
      title: "Complaint draft",
      payload: { description: "Follow up" },
    }], "complaint", labelize)[0]).toMatchObject({
      action: "member-draft",
      actionId: "draft-1",
      details: "Follow up",
    });

    expect(buildMemberGuarantorRows([{
      id: "guar-1",
      status: "pending",
      guaranteedAmount: 150000,
      loan: { memberName: "Amina", product: "Emergency Loan", requestedAmount: 300000 },
    }])[0]).toMatchObject({
      action: "member-guarantor",
      borrower: "Amina",
      product: "Emergency Loan",
      requestedAmount: 300000,
    });

    expect(buildMemberGuarantorRows([{
      id: "guar-2",
      status: "accepted",
      product: "Development Loan",
    }])[0]).toMatchObject({
      action: "",
      actionLabel: "View",
      borrower: "Borrower",
      product: "Development Loan",
      requestedAmount: 0,
    });
  });

  it("normalizes SACCO admin messages and mobile-money rows with fallbacks", () => {
    expect(buildMemberAdminMessageRows([
      { id: "note-1", body: "Fallback body", readAt: "2026-08-14T08:00:00Z", sentAt: "2026-08-14T07:00:00Z" },
      { id: "note-2", title: "Meeting", message: "Bring passbook", channel: "sms", status: "sent", createdAt: "2026-08-13T07:00:00Z" },
    ])).toEqual([
      {
        id: "note-1",
        body: "Fallback body",
        readAt: "2026-08-14T08:00:00Z",
        sentAt: "2026-08-14T07:00:00Z",
        title: "SACCO admin message",
        message: "Fallback body",
        channel: "in-app",
        status: "read",
        createdAt: "2026-08-14T07:00:00Z",
      },
      {
        id: "note-2",
        title: "Meeting",
        message: "Bring passbook",
        channel: "sms",
        status: "sent",
        createdAt: "2026-08-13T07:00:00Z",
      },
    ]);

    expect(buildMemberMobileMoneyRows({
      statementLines: [{
        id: "line-1",
        reference: "MM-1",
        amount: 4500,
        channel: "mobile_money",
        createdAt: "2026-08-14T08:00:00Z",
      }],
    })[0]).toMatchObject({
      postedAt: "2026-08-14T08:00:00Z",
      description: "Mobile money deposit",
      credit: 4500,
      status: "posted",
    });
  });

  it("classifies payment routes from provider and reference evidence", () => {
    expect(paymentRouteLabelFor({ provider: "mtn" })).toBe("Mobile money");
    expect(paymentRouteLabelFor({ providerPayload: { route: "bank_collection" } })).toBe("Bank");
    expect(paymentRouteLabelFor({ channel: "treasurer_cash" })).toBe("Treasurer cash");
    expect(paymentRouteLabelFor({})).toBe("Treasurer cash");
  });

  it("classifies payment and receipt status edge cases", () => {
    expect(paymentLifecycleStatusFor({ status: "failed" })).toBe("Failed");
    expect(paymentLifecycleStatusFor({ status: "draft" })).toBe("Draft");
    expect(paymentLifecycleStatusFor({ status: "syncing", provider: "treasurer_cash" })).toBe("Pending posting");
    expect(paymentLifecycleStatusFor({ receiptStatus: "receipt ready" })).toBe("Receipted");
    expect(paymentLifecycleStatusFor({ postedAt: "2026-08-14T08:00:00Z" })).toBe("Posted");
    expect(paymentLifecycleStatusFor({})).toBe("Draft");

    expect(receiptLifecycleStatusFor({ status: "failed" })).toBe("Failed");
    expect(receiptLifecycleStatusFor({ receiptNo: "RCT-1" })).toBe("Receipted");
    expect(receiptLifecycleStatusFor({ status: "pending" })).toBe("Pending posting");
    expect(receiptLifecycleStatusFor({})).toBe("Not receipted");
  });

  it("handles invalid month evidence safely", () => {
    expect(performanceMonthLabel("not-a-date")).toBe("Unknown month");
    expect(performanceMonthEndDateLabel("bad-month")).toBe("bad-month");
    expect(performanceRowId({ month: "2026-08", memberName: "Amina" })).toBe("2026-08::Amina");
    expect(performanceRowId({ month: "", memberName: "" })).toBe("::");
  });
});
