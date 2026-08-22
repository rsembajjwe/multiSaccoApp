import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

type ClassicContext = vm.Context & {
  document: Document;
  renderMemberView: (view: string) => string;
  state: Record<string, any>;
};

const classicScripts = [
  "app.i18n.js",
  "app.formatters.js",
  "app.member-performance.js",
  "app.core.js",
  "app.api.js",
  "app.navigation.js",
  "app.table-model.js",
  "app.tables.js",
  "app.ui.js",
  "app.member.js",
];

describe("classic member portal renderer", () => {
  let context: ClassicContext;

  beforeEach(async () => {
    context = await createClassicContext();
  });

  it("renders the member home overview with quick actions", () => {
    renderIntoDom(context, context.renderMemberView("home"));

    expect(text()).not.toContain("Member command center");
    expect(text()).toContain("Pay by mobile money");
    expect(text()).toContain("Read SACCO messages");
    expect(context.document.querySelectorAll("[data-member-shortcut-view]").length).toBeGreaterThanOrEqual(5);
  });

  it("renders payment tracking, provider options and offline draft workspace", () => {
    context.state.moduleTabs.payments = "mobile-money";
    renderIntoDom(context, context.renderMemberView("payments"));

    expect(text()).toContain("Member payment center");
    expect(text()).toContain("Ready to post");
    expect(text()).toContain("MTN MoMo");
    expect(text()).not.toContain("M-PESA");
    expect(context.document.querySelector("#memberPaymentProvider")).not.toBeNull();

    context.state.moduleTabs.payments = "tracking";
    renderIntoDom(context, context.renderMemberView("payments"));
    expect(text()).toContain("Payment tracking workspace");
    expect(text()).toContain("Payment lifecycle");
    expect(text()).toContain("Monthly savings and deposit performance");

    context.state.moduleTabs.payments = "drafts";
    renderIntoDom(context, context.renderMemberView("payments"));
    expect(text()).toContain("Payment draft workspace");
    expect(text()).toContain("Payment offline drafts");
  });

  it("renders member complaint submit, tracking, draft and evidence tabs", () => {
    context.state.moduleTabs.complaints = "submit";
    renderIntoDom(context, context.renderMemberView("complaints"));

    expect(text()).toContain("Member complaint submission");
    expect(text()).toContain("My complaints");
    expect(context.document.querySelector("#memberComplaintForm")).not.toBeNull();

    context.state.moduleTabs.complaints = "tracking";
    renderIntoDom(context, context.renderMemberView("complaints"));
    expect(text()).toContain("Complaint tracking workspace");

    context.state.moduleTabs.complaints = "drafts";
    renderIntoDom(context, context.renderMemberView("complaints"));
    expect(text()).toContain("Complaint draft workspace");

    context.state.moduleTabs.complaints = "evidence";
    renderIntoDom(context, context.renderMemberView("complaints"));
    expect(text()).toContain("Complaint evidence controls");
  });

  it("renders the consolidated Money hub plus profile screens", () => {
    context.state.moduleTabs.money = "statement";
    renderIntoDom(context, context.renderMemberView("money"));
    expect(text()).toContain("Statement");

    context.state.moduleTabs.money = "receipts";
    renderIntoDom(context, context.renderMemberView("money"));
    expect(text()).toContain("Receipts");

    context.state.moduleTabs.profile = "contacts";
    renderIntoDom(context, context.renderMemberView("profile"));
    expect(text()).toContain("Member contact controls");
  });

  function text(): string {
    return context.document.body.textContent || "";
  }
});

async function createClassicContext(): Promise<ClassicContext> {
  const dom = new JSDOM("<!doctype html><html><body><main id=\"app\"></main></body></html>", {
    url: "http://127.0.0.1:5173/",
  });
  const sandbox: Record<string, any> = {
    console,
    Date,
    Intl,
    URLSearchParams,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    navigator: { onLine: true },
    state: memberState(),
    window: dom.window,
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox) as ClassicContext;

  for (const script of classicScripts) {
    const source = await readFile(path.join(process.cwd(), script), "utf8");
    vm.runInContext(source, context, { filename: script });
  }

  return context;
}

function renderIntoDom(context: ClassicContext, html: string): void {
  const app = context.document.querySelector("#app");
  if (!app) throw new Error("Test app root missing");
  app.innerHTML = html;
}

function memberState(): Record<string, any> {
  return {
    auth: "member",
    search: "",
    locale: "en-UG",
    lastSync: "2026-08-14T08:00:00.000Z",
    tableState: {},
    pageMeta: {},
    moduleTabs: {},
    data: { tenants: [], members: [], users: [], chatThreads: [] },
    tenant: { id: "tenant_green", name: "Green Valley SACCO", abbreviation: "GVS", currencyCode: "UGX" },
    user: null,
    roleNames: [],
    permissionIds: [],
    member: {
      id: "member_green_amina",
      fullName: "Amina Nakutende",
      membershipNo: "GVS-0001",
      phone: "+256700000001",
      email: "amina@example.test",
      status: "active",
      kycStatus: "approved",
    },
    memberData: {
      balances: { savings: 150000, shares: 50000, welfare: 25000 },
      dashboard: {
        tenant: { mobileMoneyCollectionAvailable: true, bankCollectionAvailable: true },
        paymentProviders: [
          { network: "mtn", providerId: "mtn", label: "MTN MoMo", available: true },
          { network: "airtel", providerId: "airtel", label: "Airtel Money", available: true },
          { network: "mpesa", providerId: "mpesa", label: "M-PESA", available: true },
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
            receiptNo: "RCT-001",
          },
          {
            id: "line_2",
            reference: "CASH-20260805-001",
            description: "Treasurer cash loan repayment",
            credit: 15000,
            runningBalance: 200000,
            channel: "cash",
            postedAt: "2026-08-05T10:15:00.000Z",
            status: "posted",
          },
        ],
      },
      loans: [{ id: "loan_1", product: "Development Loan", outstandingBalance: 120000, status: "active" }],
      paymentRequests: [{
        id: "pay_1",
        externalReference: "MM-REQ-001",
        provider: "mtn",
        purpose: "savings_deposit",
        amount: 5000,
        payerPhone: "+256700000001",
        status: "pending_callback",
        requestedAt: "2026-08-14T08:00:00.000Z",
      }],
      pendingGuarantors: [{
        id: "guar_1",
        status: "pending",
        guaranteedAmount: 100000,
        loan: { memberName: "Brian Kato", product: "Emergency Loan", requestedAmount: 300000 },
      }],
      notifications: [{ id: "note_1", title: "SACCO meeting", message: "Annual meeting notice", status: "unread", createdAt: "2026-08-14T08:00:00.000Z" }],
      drafts: [{ id: "draft_1", type: "payment", title: "Savings draft", status: "Draft", payload: { amount: 5000, purpose: "savings_deposit", provider: "mtn" } }],
      chatThreads: [{ id: "case_1", subject: "Receipt follow-up", status: "open", priority: "medium", lastMessagePreview: "Please check my receipt", updatedAt: "2026-08-14T08:00:00.000Z" }],
    },
    memberPaymentMessage: "",
    memberPaymentError: "",
    memberComplaintMessage: "",
    memberComplaintError: "",
    memberGuarantorMessage: "",
    memberGuarantorError: "",
    memberNotificationMessage: "",
    memberNotificationError: "",
  };
}
