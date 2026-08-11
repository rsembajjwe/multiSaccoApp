import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const sandbox = {
  console,
  Intl,
  Date,
  URLSearchParams,
  window: { location: { search: "" } },
  document: {
    documentElement: { dir: "ltr", lang: "en-UG" },
    getElementById: () => null
  },
  localStorage: {
    store: {},
    getItem(key) {
      return this.store[key] ?? null;
    },
    setItem(key, value) {
      this.store[key] = String(value);
    },
    removeItem(key) {
      delete this.store[key];
    }
  },
  state: {
    auth: "member",
    search: "",
    locale: "en-UG",
    lastSync: "2026-08-10T09:00:00.000Z",
    tableState: {},
    pageMeta: {},
    data: {
      tenants: [],
      members: [],
      users: [],
      chatThreads: []
    },
    tenant: {
      id: "tenant_green",
      name: "Green Valley SACCO",
      abbreviation: "GVS",
      country: "Uganda",
      currencyCode: "UGX"
    },
    user: null,
    roleNames: [],
    permissionIds: [],
    moduleTabs: {
      money: "statement",
      payments: "payments",
      complaints: "chat"
    },
    member: {
      id: "member_green_amina",
      fullName: "Amina Naki",
      membershipNo: "GVS-0001",
      phone: "+256700000001",
      email: "amina@example.test",
      status: "active",
      kycStatus: "approved"
    },
    memberData: {
      balances: { savings: 150000, shares: 50000, welfare: 25000 },
      dashboard: {
        tenant: {
          mobileMoneyCollectionAvailable: true,
          bankCollectionAvailable: true
        },
        paymentProviders: [
          { network: "mtn", providerId: "mtn", label: "MTN MoMo", available: true },
          { network: "airtel", providerId: "airtel", label: "Airtel Money", available: true },
          { network: "mpesa", providerId: "mpesa", label: "M-PESA", available: true }
        ],
        statementLines: [
          {
            id: "line_1",
            reference: "MM-20260810-001",
            description: "Mobile money savings deposit",
            credit: 25000,
            runningBalance: 225000,
            channel: "mobile_money",
            provider: "mtn",
            postedAt: "2026-08-10T08:30:00.000Z",
            status: "posted",
            receiptNo: "RCT-001"
          },
          {
            id: "line_2",
            reference: "CASH-20260805-001",
            description: "Treasurer cash loan repayment",
            credit: 15000,
            runningBalance: 200000,
            channel: "cash",
            postedAt: "2026-08-05T10:15:00.000Z",
            status: "posted"
          },
          {
            id: "line_3",
            reference: "SHR-20260731-001",
            description: "Share deposit",
            credit: 10000,
            runningBalance: 185000,
            channel: "cash",
            postedAt: "2026-07-31T14:00:00.000Z",
            status: "posted"
          }
        ]
      },
      loans: [
        {
          id: "loan_1",
          product: "Development Loan",
          outstandingBalance: 120000,
          status: "active",
          nextDueDate: "2026-09-10"
        }
      ],
      paymentRequests: [
        {
          id: "pay_req_1",
          provider: "mtn",
          purpose: "savings_deposit",
          amount: 25000,
          payerPhone: "+256700000001",
          status: "posted",
          externalReference: "MM-20260810-001",
          requestedAt: "2026-08-10T08:25:00.000Z"
        }
      ],
      notifications: [
        {
          id: "note_1",
          title: "Meeting reminder",
          message: "Monthly savings meeting is on Saturday.",
          channel: "in_app",
          status: "unread",
          createdAt: "2026-08-10T07:00:00.000Z"
        }
      ],
      chatThreads: [
        {
          id: "thread_member_1",
          type: "MEMBER_SUPPORT",
          subject: "Savings balance question",
          tenantId: "tenant_green",
          memberId: "member_green_amina",
          memberName: "Amina Naki",
          status: "open",
          unreadCount: 1,
          lastMessageAt: "2026-08-10T08:40:00.000Z",
          lastMessagePreview: "Please confirm my mobile money receipt."
        }
      ],
      pendingGuarantors: [],
      drafts: [
        {
          id: "draft_payment_1",
          type: "payment",
          title: "Offline welfare contribution",
          status: "draft",
          updatedAt: "2026-08-09T17:00:00.000Z",
          payload: {
            purpose: "welfare_contribution",
            provider: "bank_collection",
            amount: 5000,
            externalReference: "BANK-001"
          }
        }
      ],
      privacyRequests: []
    },
    chatMessages: {
      thread_member_1: [
        {
          id: "msg_1",
          senderType: "MEMBER",
          senderName: "Amina Naki",
          body: "Please confirm my mobile money receipt.",
          createdAt: "2026-08-10T08:35:00.000Z"
        },
        {
          id: "msg_2",
          senderType: "STAFF",
          senderName: "SACCO Admin",
          body: "Your receipt is posted and visible in your statement.",
          createdAt: "2026-08-10T08:40:00.000Z"
        }
      ]
    },
    chatFilters: {},
    chatError: "",
    chatSending: false,
    memberPaymentMessage: "",
    memberPaymentError: "",
    paymentRequestStatusMessage: "",
    paymentRequestStatusError: "",
    memberNotificationMessage: "",
    memberNotificationError: ""
  }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
for (const file of [
  "app.i18n.js",
  "app.formatters.js",
  "app.member-performance.js",
  "app.member-admin-model.js",
  "app.transactions-model.js",
  "app.loans-model.js",
  "app.accounting-model.js",
  "app.sacco-finance-model.js",
  "app.notifications-model.js",
  "app.complaints-model.js",
  "app.governance-model.js",
  "app.reports-model.js",
  "app.core.js",
  "app.api.js",
  "app.ui.js",
  "app.table-model.js",
  "app.tables.js",
  "app.navigation.js",
  "app.complaints.js",
  "app.member.js"
]) {
  vm.runInContext(await readFile(file, "utf8"), sandbox, { filename: file });
}

const statementHtml = sandbox.renderMemberView("money");
assert.match(statementHtml, /Statement/);
assert.match(statementHtml, /MM-20260810-001/);
assert.match(statementHtml, /10 Aug 2026/);
assert.match(statementHtml, /Mobile money savings deposit/);
assert.match(statementHtml, /Treasurer cash loan repayment/);

const monthlyRows = sandbox.memberMonthlyPerformanceRows(sandbox.state.memberData.dashboard);
assert.equal(monthlyRows.length, 2);
assert.equal(monthlyRows[0].month, "2026-08");
assert.match(sandbox.formatDate(monthlyRows[0].date), /31 Aug 2026/);
assert.equal(monthlyRows[0].savingsDeposits, 25000);
assert.equal(monthlyRows[0].loanRepayments, 15000);
assert.equal(monthlyRows[0].mobileMoney, 25000);
assert.equal(monthlyRows[0].treasurerCash, 15000);
assert.equal(monthlyRows[0].totalDeposits, 40000);

const paymentHtml = sandbox.renderMemberView("payments");
assert.match(paymentHtml, /Pay by mobile money/);
assert.match(paymentHtml, /Bank collection also enabled/);
assert.match(paymentHtml, /MTN/);
assert.match(paymentHtml, /Airtel/);
assert.doesNotMatch(paymentHtml, /M-PESA/);
assert.match(paymentHtml, /Development Loan/);
assert.match(paymentHtml, /Recent online payment requests/);
assert.match(paymentHtml, /savings_deposit/);
assert.match(paymentHtml, /View status/);
assert.match(paymentHtml, /Saved drafts/);
assert.match(paymentHtml, /Offline welfare contribution/);

const supportHtml = sandbox.renderMemberView("complaints");
assert.match(supportHtml, /Chat \(1\)/);
assert.match(supportHtml, /Support chat with SACCO admin/);
assert.match(supportHtml, /Please confirm my mobile money receipt/);
assert.match(supportHtml, /Your receipt is posted and visible in your statement/);
assert.match(supportHtml, /data-thread-id="thread_member_1"/);
assert.match(supportHtml, /Send message/);

sandbox.state.moduleTabs.complaints = "notifications";
const notificationsHtml = sandbox.renderMemberView("complaints");
assert.match(notificationsHtml, /Notifications \(1\)/);
assert.match(notificationsHtml, /Meeting reminder/);
assert.match(notificationsHtml, /Acknowledge/);
assert.match(notificationsHtml, /10 Aug 2026/);

console.log("Member portal enterprise tests passed (full dates, monthly performance, payments, drafts, chat and notifications).");
