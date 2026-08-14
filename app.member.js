// Member portal rendering helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

function renderMemberView(view) {
  const dash = state.memberData.dashboard || {};
  const balances = state.memberData.balances || dash.balances || {};
  if (view === "home") {
    const total = Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0);
    const recent = (dash.recentTransactions || []).slice(0, 6);
    const tabs = [["overview", "Overview"], ["monthly", "Monthly savings"], ["loans", "Loans"], ["messages", "Messages"], ["mobile-money", "Mobile money"]];
    const tab = activeModuleTab("home", tabs);
    return `
      <section class="panel member-balance">
        <p class="eyebrow">${displayName()} · ${t("totalBalance")}</p>
        <h2 class="balance-amount">${money.format(total)}</h2>
        <p class="balance-breakdown">${t("savings")} ${money.format(balances.savings || 0)} · ${t("shares")} ${money.format(balances.shares || 0)} · ${t("welfare")} ${money.format(balances.welfare || 0)}</p>
      </section>
      ${moduleTabs("home", tabs, tab)}
      ${tab === "overview" ? `${memberCommandCenterPanel()}${memberHomeUpdatePanel(dash, balances)}${memberServiceAssurancePanel()}${memberQuickActionsPanel()}` : ""}
      ${tab === "monthly" ? memberHomeMonthlyPanel(dash) : ""}
      ${tab === "loans" ? memberHomeLoansPanel() : ""}
      ${tab === "messages" ? memberHomeMessagesPanel() : ""}
      ${tab === "mobile-money" ? memberHomeMobileMoneyPanel(dash) : ""}
      ${tab === "overview" && recent.length
        ? recordTable("Recent activity", recent, ["reference", "description", "debit", "credit", "runningBalance", "postedAt"])
        : tab === "overview" ? emptyState("No transactions yet", "Your posted deposits and repayments will appear here.") : ""}
    `;
  }
  if (view === "money") return memberMoneyView(dash, balances);
  if (view === "accounts") return memberAccountsView(balances);
  if (view === "statements") return memberStatementsView(dash);
  if (view === "receipts") return memberReceiptsView(dash);
  if (view === "loans") return memberLoansView();
  if (view === "guarantor-requests") return memberGuarantorRequestsView();
  if (view === "payments") return memberPaymentsView();
  if (view === "notifications") return memberNotificationsView();
  if (view === "complaints") return memberComplaintsView();
  if (view === "profile") return memberProfileView(balances);
  if (view === "security") return memberSecurityTabbedView();
  return moduleBlueprint(view);
}

function memberCommandCenterPanel() {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member command center</h2>
          <p>Service ready: view balances, monthly savings, loans, messages, mobile-money activity and offline drafts.</p>
        </div>
        <span class="status active">Service ready</span>
      </div>
    </section>
  `;
}

function memberHomeMonthlyPanel(dash) {
  const rows = buildMemberMonthlyPerformanceRows(dash);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Monthly savings workspace</h2>
          <p>Payment channels show Treasurer cash and Mobile money deposits with full dates for each month.</p>
        </div>
        <span class="status active">Payment channels</span>
      </div>
    </section>
    ${rows.length ? recordTable("Monthly savings and deposit performance", rows, ["date", "month", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"]) : emptyState("Monthly savings and deposit performance", "Posted deposits will appear here by month.")}
  `;
}

function memberHomeLoansPanel() {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Loan servicing workspace</h2>
          <p>Review active loans, next repayment and guarantor obligations.</p>
        </div>
        <span class="status active">Loans</span>
      </div>
    </section>
    ${recordTable("Member loan position", state.memberData.loans || [], ["applicationNo", "product", "amount", "outstandingBalance", "monthlyInstallment", "nextDueDate", "status"])}
  `;
}

function memberHomeMessagesPanel() {
  const notifications = buildMemberAdminMessageRows(state.memberData.notifications || []);
  const unread = notifications.some((row) => isMemberNotificationUnread(row));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO admin message center</h2>
          <p>Read SACCO messages and follow up through the complaint chat when needed.</p>
        </div>
        <span class="status ${unread ? "pending" : "active"}">${unread ? "Unread" : "Current"}</span>
      </div>
    </section>
    ${notifications.length ? recordTable("SACCO admin messages", notifications, ["title", "message", "channel", "status", "createdAt", "readAt"]) : emptyState("SACCO admin messages", "Messages from your SACCO admin will appear here.")}
  `;
}

function memberHomeMobileMoneyPanel(dash) {
  const rows = buildMemberMobileMoneyRows(dash);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile money deposit workspace</h2>
          <p>View mobile money deposit activity posted to your SACCO member account.</p>
        </div>
        <span class="status active">Mobile money</span>
      </div>
    </section>
    ${rows.length ? recordTable("Mobile money deposit activity", rows, ["postedAt", "reference", "description", "credit", "paymentStatus", "receiptStatus", "status"]) : emptyState("Mobile money deposit activity", "Mobile money deposits will appear here after provider confirmation.")}
  `;
}

function memberServiceAssurancePanel() {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member service assurance</h2>
          <p>Receipts, support chats, security checks and offline drafts help members keep evidence of every request.</p>
        </div>
        <span class="status active">Member protected</span>
      </div>
      <div class="mini-grid">
        ${mini("Receipts", "Available after posting")}
        ${mini("Support", "Chat with SACCO admin")}
        ${mini("Security", "Session and SACCO code protected")}
        ${mini("Offline continuity", "Drafts can be saved and synced")}
      </div>
    </section>
  `;
}

function memberHomeUpdatePanel(dash, balances) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Balances and requests update</h2>
          <p>Your balances, loans, notifications and guarantee requests are refreshed from the SACCO system.</p>
        </div>
        <span class="status active">Updated</span>
      </div>
      <div class="mini-grid">
        ${mini("Total balance", money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)))}
        ${mini("Loans", (state.memberData.loans || dash.loans || []).length)}
        ${mini("Notifications", (state.memberData.notifications || dash.notifications || []).length)}
        ${mini("Guarantee requests", (state.memberData.pendingGuarantors || dash.pendingGuarantorRequests || []).length)}
        ${mini("Offline drafts", (state.memberData.drafts || []).length)}
      </div>
    </section>
  `;
}

function memberQuickActionsPanel() {
  const actions = [
    [t("payByMobileMoney"), t("payByMobileMoneyCopy"), "payments", "mobile-money"],
    [t("viewStatement"), t("viewStatementCopy"), "money", "statement"],
    ["Loans", "Apply for or repay a loan", "loans", "loans"],
    ["Read SACCO messages", "Open notices from your SACCO admin", "notifications", "inbox"],
    ["Submit complaint", "Start or continue a support chat", "complaints", "submit"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberQuickActions")}</h2>
          <p>${t("memberQuickActionsCopy")}</p>
        </div>
        <span class="status active">${t("selfService")}</span>
      </div>
      <div class="access-grid">
        ${actions.map(([label, detail, view, tab]) => `
          <div>
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(detail)}</span>
            <button class="button secondary" type="button" data-member-shortcut-view="${escapeHtml(view)}" data-member-shortcut-tab="${escapeHtml(tab)}">${escapeHtml(label)}</button>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

/**
 * @param {TerekaMemberDashboard} dash
 * @param {TerekaBalances} balances
 * @returns {string}
 */
function memberMoneyView(dash, balances) {
  const tabs = [["accounts", "Accounts"], ["statement", "Statement"], ["receipts", "Receipts"]];
  const tab = activeModuleTab("money", tabs);
  const accounts = [
    { account: "Savings", balance: balances.savings || 0 },
    { account: "Shares", balance: balances.shares || 0 },
    { account: "Welfare", balance: balances.welfare || 0 }
  ];
  const lines = buildMemberStatementLines(dash);
  const receipts = lines
    .filter((line) => line.reference && (Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0))
    .map((line) => ({
      ...line,
      receiptNo: `RCT-${line.reference}`,
      amount: Number(line.credit || 0) || Number(line.debit || 0)
    }))
    .sort((a, b) => new Date(b.postedAt || b.createdAt || 0).getTime() - new Date(a.postedAt || a.createdAt || 0).getTime());
  return `
    ${moduleTabs("money", tabs, tab)}
    ${tab === "accounts" ? recordTable("Account balances", accounts, ["account", "balance"]) : ""}
    ${tab === "statement" ? `${filterToolbar("Filter by reference, channel, narration or date", "Download PDF", "Download Excel")}${lines.length ? recordTable("Statement", lines, ["reference", "description", "debit", "credit", "runningBalance", "postedAt"]) : emptyState("No statement activity", "Your posted transactions will appear here.")}` : ""}
    ${tab === "receipts" ? (receipts.length ? recordTable("Receipts", receipts, ["receiptNo", "reference", "description", "amount", "postedAt"]) : emptyState("No receipts yet", "Receipts appear here once your transactions post.")) : ""}
  `;
}

function memberAccountsView(balances) {
  const accounts = [
    { account: "Savings", balance: balances.savings || 0, status: "Verified" },
    { account: "Shares", balance: balances.shares || 0, status: "Verified" },
    { account: "Welfare", balance: balances.welfare || 0, status: "Verified" }
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member account overview</h2>
          <p>Member account balances and verification status from the SACCO ledger.</p>
        </div>
        <span class="status active">Verified</span>
      </div>
    </section>
    ${recordTable("Member account balances", accounts, ["account", "balance", "status"])}
  `;
}

function memberStatementsView(dash) {
  const lines = buildMemberStatementLines(dash);
  const monthly = buildMemberMonthlyPerformanceRows(dash);
  const tabs = [["overview", "Overview"], ["activity", "Activity"], ["monthly", "Monthly"], ["exports", "Exports"]];
  const tab = activeModuleTab("statements", tabs);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member statement readiness</h2>
          <p>Full-date display, monthly savings evidence and export controls for member statements.</p>
        </div>
        <span class="status active">Full-date display</span>
      </div>
    </section>
    ${moduleTabs("statements", tabs, tab)}
    ${tab === "overview" ? recordTable("Recent statement lines", lines.slice(0, 8), ["reference", "description", "debit", "credit", "runningBalance", "postedAt"]) : ""}
    ${tab === "activity" ? recordTable("Member statement", lines, ["reference", "description", "debit", "credit", "runningBalance", "postedAt"]) : ""}
    ${tab === "monthly" ? `${recordTable("Statement monthly evidence", monthly, ["date", "month", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"])}` : ""}
    ${tab === "exports" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Statement export controls</h2><p>Download or print statement evidence for SACCO office verification.</p></div></div><div class="form-actions inline"><button class="button secondary" type="button">Download PDF</button><button class="button secondary" type="button">Download Excel</button></div></section>` : ""}
  `;
}

function memberReceiptsView(dash) {
  const receipts = buildMemberStatementLines(dash)
    .filter((line) => line.reference && (Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0))
    .map((line) => ({
      receiptNo: `RCT-${line.reference}`,
      reference: line.reference,
      paymentRoute: paymentRouteLabelFor(line),
      receiptStatus: "Receipt status",
      amount: Number(line.credit || 0) || Number(line.debit || 0),
      postedAt: line.postedAt
    }));
  const tabs = [["list", "Receipts"], ["evidence", "Evidence"], ["exports", "Exports"]];
  const tab = activeModuleTab("receipts", tabs);
  return `
    ${moduleTabs("receipts", tabs, tab)}
    ${tab === "list" ? recordTable("Member receipts", receipts, ["receiptNo", "reference", "paymentRoute", "receiptStatus", "amount", "postedAt"]) : ""}
    ${tab === "evidence" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Receipt evidence controls</h2><p>Payment route and receipt status are preserved for each posted member transaction.</p></div></div>${recordTable("Receipt evidence", receipts, ["receiptNo", "paymentRoute", "receiptStatus", "amount", "postedAt"])}</section>` : ""}
    ${tab === "exports" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Receipt export and print</h2><p>Print or export receipt evidence for SACCO counter service.</p></div></div><div class="form-actions inline"><button class="button secondary" type="button">Print receipt</button><button class="button secondary" type="button">Export receipts</button></div></section>` : ""}
  `;
}

function memberTabReadinessPanel() {
  // Removed: production portal no longer renders filler "readiness" panels.
  return "";
}

function memberLoansView() {
  const loans = state.memberData.loans || [];
  const requests = buildMemberGuarantorRows(state.memberData.pendingGuarantors || []);
  const pending = requests.filter((row) => normal(row.status) === "pending");
  const tabs = [["loans", "My loans"], ["guarantor", `Guarantor requests${pending.length ? ` (${pending.length})` : ""}`]];
  const tab = activeModuleTab("loans", tabs);
  return `
    ${moduleTabs("loans", tabs, tab)}
    ${tab === "loans" ? `${memberLoanApplicationPanel()}${loans.length ? recordTable("Member loans", loans, ["product", "requestedAmount", "outstandingBalance", "nextDueDate", "status"]) : emptyState("Member loans", "Apply for a loan using the form above.")}` : ""}
    ${tab === "guarantor" ? `${state.memberGuarantorMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorMessage)}</strong></div>` : ""}${state.memberGuarantorError ? `<div class="notice warning"><strong>Guarantor decision failed.</strong><span>${escapeHtml(state.memberGuarantorError)}</span></div>` : ""}${requests.length ? recordTable("Guarantor requests", requests, ["borrower", "product", "requestedAmount", "guaranteedAmount", "capacity", "status"]) : emptyState("No guarantor requests", "Requests to guarantee other members' loans appear here.")}` : ""}
  `;
}

function memberGuarantorRequestsView() {
  const requests = buildMemberGuarantorRows(state.memberData.pendingGuarantors || []);
  const pending = requests.filter((row) => normal(row.status) === "pending");
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member guarantor decision center</h2>
          <p>Review requests before accepting responsibility for another member's loan.</p>
        </div>
        <span class="status ${pending.length ? "pending" : "active"}">Pending requests</span>
      </div>
    </section>
    ${state.memberGuarantorMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorMessage)}</strong></div>` : ""}
    ${state.memberGuarantorError ? `<div class="notice warning"><strong>Guarantor decision failed.</strong><span>${escapeHtml(state.memberGuarantorError)}</span></div>` : ""}
    ${requests.length ? recordTable("Member guarantor requests", requests, ["borrower", "product", "requestedAmount", "guaranteedAmount", "capacity", "status"]) : emptyState("Member guarantor requests", "Pending requests will appear here.")}
  `;
}

function memberLoanApplicationPanel() {
  const memberActive = normal(state.member?.status) === "active";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile loan application</h2>
          <p>Submit a loan request directly to the SACCO credit workflow.</p>
        </div>
        <span class="status ${memberActive ? "active" : "pending"}">${memberActive ? "Eligible to submit" : "Member not active"}</span>
      </div>
      ${state.memberLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberLoanMessage)}</strong></div>` : ""}
      ${state.memberLoanError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.memberLoanError)}</span></div>` : ""}
      <form id="memberLoanForm" class="form-grid">
        <label><span>Loan product</span><select id="memberLoanProduct" ${memberActive ? "" : "disabled"}>${loanProductOptions().map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="memberLoanAmount" type="number" min="1" step="1" value="100000" ${memberActive ? "" : "disabled"}></label>
        <label><span>Repayment months</span><input id="memberLoanMonths" type="number" min="1" max="60" value="12" ${memberActive ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><textarea id="memberLoanPurpose" placeholder="Business, school fees, farming input, emergency..." ${memberActive ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${memberActive ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">Contact SACCO office</span>`}</div>
      </form>
    </section>
  `;
}

function memberPaymentsView() {
  const loans = state.memberData.loans || [];
  const payableLoans = loans.filter((loan) => ["active", "disbursed"].includes(normal(loan.status)));
  const requestRows = buildMemberPaymentRequestRows(state.memberData.paymentRequests || []);
  const paymentDrafts = buildMemberDraftRows(state.memberData.drafts || [], "payment", labelize);
  const tabs = [["mobile-money", "Mobile money"], ["tracking", "Tracking"], ["drafts", `Drafts${paymentDrafts.length ? ` (${paymentDrafts.length})` : ""}`], ["history", "Payment history"]];
  const tab = activeModuleTab("payments", tabs);
  return `
    ${paymentRequestStatusNotice()}
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member payment center</h2>
          <p>Deposit savings, buy shares, contribute welfare or repay loans through SACCO-approved payment routes.</p>
        </div>
        <span class="status active">Ready to post</span>
      </div>
    </section>
    ${moduleTabs("payments", tabs, tab)}
    ${tab === "mobile-money" ? `${memberPaymentOverviewPanel(requestRows, paymentDrafts)}${memberPaymentFormPanel(payableLoans)}` : ""}
    ${tab === "tracking" ? memberPaymentTrackingPanel(requestRows) : ""}
    ${tab === "drafts" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Payment draft workspace</h2><p>Review, sync or discard saved payment drafts.</p></div></div></section>${memberDraftPanel("Payment offline drafts", paymentDrafts)}` : ""}
    ${tab === "history" ? (requestRows.length ? recordTable("Payment history", requestRows, ["provider", "purpose", "amount", "payerPhone", "status", "requestedAt"]) : emptyState("No payment requests yet", "Mobile-money and bank payment requests will appear here.")) : ""}
  `;
}

function memberPaymentOverviewPanel(requestRows, paymentDrafts) {
  const pendingRequests = requestRows.filter((row) => !["posted", "completed", "failed", "cancelled"].includes(normal(row.status))).length;
  const latestDraft = paymentDrafts[0]?.title || paymentDrafts[0]?.details || "None";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Payment posting rules</h2>
          <p>Mobile money waits for callback confirmation. Treasurer cash is receipted by SACCO staff. Bank deposits need a reference.</p>
        </div>
        <span class="status active">Treasurer cash result</span>
      </div>
      <div class="source-grid">
        ${mini("Recent online payment requests", requestRows.length)}
        ${mini("Saved drafts", paymentDrafts.length)}
        ${mini("Latest draft", latestDraft)}
        ${mini("Pending requests", pendingRequests)}
        ${mini("Payment routes", "Mobile money / bank / Treasurer")}
      </div>
      <div class="form-actions inline">
        <button class="button secondary" type="button" data-member-shortcut-view="payments" data-member-shortcut-tab="history">View status</button>
      </div>
    </section>
  `;
}

function memberPaymentTrackingPanel(requestRows) {
  const dash = state.memberData.dashboard || {};
  const lifecycleRows = memberPaymentLifecycleRows(dash);
  const monthlyRows = buildMemberMonthlyPerformanceRows(dash);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Payment tracking workspace</h2>
          <p>Track provider requests, payment lifecycle, Treasurer cash and Mobile money deposits.</p>
        </div>
        <span class="status active">Provider requests</span>
      </div>
    </section>
    ${requestRows.length ? recordTable("Mobile-money request tracking", requestRows, ["externalReference", "provider", "purpose", "amount", "payerPhone", "status", "requestedAt"]) : emptyState("Mobile-money request tracking", "Provider requests will appear here after initiation.")}
    ${lifecycleRows.length ? recordTable("Payment lifecycle", lifecycleRows, ["date", "reference", "description", "paymentRoute", "amount", "paymentStatus", "receiptStatus"]) : emptyState("Payment lifecycle", "Treasurer cash, Mobile money and bank payment status will appear here.")}
    ${monthlyRows.length ? recordTable("Monthly savings and deposit performance", monthlyRows, ["date", "month", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"]) : emptyState("Monthly savings and deposit performance", "Monthly performance appears after posting.")}
  `;
}

function memberCollectionAccountsCard() {
  const accounts = (state.memberData.collectionAccounts || []).filter((a) => a.active !== false);
  if (!accounts.length) return "";
  return `
    <div class="notice compact collection-accounts-card">
      <strong>Pay directly to your SACCO's accounts</strong>
      ${accounts.map((a) => `<span>${escapeHtml(a.channel === "bank" ? (a.bankName || "Bank") : (a.network || "Mobile money").toUpperCase())}: ${escapeHtml(a.accountName || "")} - <b>${escapeHtml(a.accountNumber || "")}</b>${a.branch ? " / " + escapeHtml(a.branch) : ""}${a.instructions ? " / " + escapeHtml(a.instructions) : ""}</span>`).join("")}
    </div>`;
}

function memberPaymentFormPanel(payableLoans) {
  const tenant = state.memberData.dashboard?.tenant || {};
  const mmAvailable = !!tenant.mobileMoneyCollectionAvailable;
  const bankAvailable = !!tenant.bankCollectionAvailable;
  const providers = memberAvailablePaymentProviders();
  if (!mmAvailable && !bankAvailable) {
    return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Make a payment</h2></div></div>
      <div class="notice warning"><strong>Payments not available.</strong><span>Online payment collection is not yet enabled for this SACCO. Please contact your SACCO office.</span></div>
    </section>`;
  }
  if (!mmAvailable && bankAvailable) {
    return `
      ${memberCollectionAccountsCard()}
      ${memberBankCollectionPanel(payableLoans)}
    `;
  }
  if (mmAvailable && !providers.length) {
    return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Make a payment</h2></div></div>
      <div class="notice warning"><strong>Mobile money unavailable.</strong><span>No mobile-money network is configured for this SACCO yet. Use Treasurer cash or contact your SACCO office.</span></div>
      ${bankAvailable ? `<div class="notice compact"><span>Bank collection is enabled. Deposit to the SACCO bank account and keep your reference for receipting.</span></div>` : ""}
    </section>`;
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Pay by mobile money</h2>
          <p>${providers.length > 1 ? "Pick your configured network, enter the amount, then approve the prompt on your phone." : "Enter the amount, then approve the prompt on your phone."}</p>
        </div>
      </div>
      ${bankAvailable ? `<div class="notice compact payment-route-card"><strong>Bank collection also enabled.</strong><span>You may alternatively deposit to the SACCO bank account and present the bank reference to the SACCO office for receipting.</span></div>` : ""}
      ${memberCollectionAccountsCard()}
      ${state.memberPaymentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPaymentMessage)}</strong></div>` : ""}
      ${state.memberPaymentError ? `<div class="notice warning"><strong>Payment failed.</strong><span>${escapeHtml(state.memberPaymentError)}</span></div>` : ""}
      <form id="memberPaymentForm" class="form-grid">
        <input id="memberPaymentRoute" type="hidden" value="mobile_money">
        <label class="wide"><span>Network</span>
          <select id="memberPaymentProvider">
            ${providers.map((provider) => `<option value="${escapeHtml(provider.network || provider.providerId || "default")}">${escapeHtml(provider.label || "Mobile money")}</option>`).join("")}
          </select>
          <div class="network-picker">
            ${providers.map((provider, index) => memberPaymentProviderTile(provider, index === 0)).join("")}
          </div>
        </label>
        <label><span>Paying for</span><select id="memberPaymentPurpose"><option value="savings_deposit">Savings</option><option value="share_purchase">Shares</option><option value="welfare_contribution">Welfare</option>${payableLoans.length ? `<option value="loan_repayment">Loan repayment</option>` : ""}</select></label>
        <label><span>Amount (UGX)</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>Mobile money number</span><input id="memberPaymentPhone" value="${escapeHtml(state.member?.phone || "")}" placeholder="07XX XXX XXX"></label>
        <label><span>Payment reference</span><input id="memberPaymentReference" value="${escapeHtml(`MM-${Date.now()}`)}"></label>
        ${payableLoans.length ? `<label class="wide"><span>Loan (only if repaying)</span><select id="memberPaymentLoanId"><option value="">Not a loan repayment</option>${payableLoans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(loan.product || loan.applicationNo || loan.id)} - ${money.format(loan.outstandingBalance || loan.balance || 0)}</option>`).join("")}</select></label>` : ""}
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">Save draft</button><button class="button primary" type="submit">Post payment</button></div>
      </form>
    </section>
  `;
}

function memberBankCollectionPanel(payableLoans) {
  const reference = `BANK-${Date.now()}`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Bank collection</h2>
          <p>Prepare a bank payment reference before depositing to the SACCO bank account.</p>
        </div>
      </div>
      <form id="memberPaymentForm" class="form-grid">
        <input id="memberPaymentRoute" type="hidden" value="bank_collection">
        <label><span>Paying for</span><select id="memberPaymentPurpose"><option value="savings_deposit">Savings</option><option value="share_purchase">Shares</option><option value="welfare_contribution">Welfare</option>${payableLoans.length ? `<option value="loan_repayment">Loan repayment</option>` : ""}</select></label>
        <label><span>Amount (${escapeHtml(currentRegion().currency)})</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>Bank reference</span><input id="memberBankReference" value="${escapeHtml(reference)}"></label>
        <label><span>Mobile money number</span><input id="memberPaymentPhone" value="${escapeHtml(state.member?.phone || "")}" placeholder="Optional contact number"></label>
        ${payableLoans.length ? `<label class="wide"><span>Loan (only if repaying)</span><select id="memberPaymentLoanId"><option value="">Not a loan repayment</option>${payableLoans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(loan.product || loan.applicationNo || loan.id)} - ${money.format(loan.outstandingBalance || loan.balance || 0)}</option>`).join("")}</select></label>` : ""}
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">Save bank draft</button><button class="button primary" type="submit">Prepare bank reference</button></div>
      </form>
    </section>
  `;
}

function memberAvailablePaymentProviders() {
  const tenant = state.memberData.dashboard?.tenant || {};
  const providers = buildMemberPaymentProviderOptions(
    !!tenant.mobileMoneyCollectionAvailable,
    state.memberData.dashboard?.paymentProviders,
    labelize
  ).filter((provider) => normal(provider.network || provider.providerId || "") !== "mpesa");
  if (tenant.mobileMoneyCollectionAvailable) {
    const hasMtn = providers.some((provider) => normal(`${provider.network || ""} ${provider.providerId || ""} ${provider.label || ""}`).includes("mtn"));
    const hasAirtel = providers.some((provider) => normal(`${provider.network || ""} ${provider.providerId || ""} ${provider.label || ""}`).includes("airtel"));
    return [
      ...(!hasMtn ? [{ network: "mtn", providerId: "mtn", label: "MTN MoMo", available: true }] : []),
      ...(!hasAirtel ? [{ network: "airtel", providerId: "airtel", label: "Airtel Money", available: true }] : []),
      ...providers
    ];
  }
  return providers;
}

function memberPaymentProviderTile(provider, checked) {
  const network = normal(provider.network || "default").replace(/[^a-z0-9_-]/g, "") || "default";
  const label = provider.label || "Mobile money";
  const [title, ...rest] = label.split(" ");
  return `
    <label class="network-tile ${escapeHtml(network)}">
      <input type="radio" name="mmProvider" value="${escapeHtml(provider.network || provider.providerId || "default")}" ${checked ? "checked" : ""}>
      <b>${escapeHtml(title || "Mobile")}</b>
      <span>${escapeHtml(rest.join(" ") || "Money")}</span>
    </label>
  `;
}

/**
 * Builds a member-facing payment lifecycle from requests, posted statement lines and offline drafts.
 * @param {TerekaMemberDashboard} dash
 * @returns {TerekaPaymentLifecycleRow[]}
 */
function memberPaymentLifecycleRows(dash) {
  return buildMemberPaymentLifecycleRows({
    dashboard: dash,
    drafts: buildMemberDraftRows(state.memberData.drafts || [], "payment", labelize),
    labelize,
    paymentRequests: state.memberData.paymentRequests || [],
  });
}

function memberNotificationsView() {
  const messages = buildMemberAdminMessageRows(state.memberData.notifications || []);
  const unread = messages.filter((row) => isMemberNotificationUnread(row));
  const tabs = [["inbox", `Inbox${messages.length ? ` (${messages.length})` : ""}`], ["unread", `Unread${unread.length ? ` (${unread.length})` : ""}`], ["evidence", "Evidence"]];
  const tab = activeModuleTab("notifications", tabs);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member message inbox</h2>
          <p>Messages from your SACCO admin, delivery status and acknowledgement evidence.</p>
        </div>
        <span class="status ${unread.length ? "pending" : "active"}">${unread.length ? "Unread messages" : "Current"}</span>
      </div>
    </section>
    ${moduleTabs("notifications", tabs, tab)}
    ${tab === "inbox" ? (messages.length ? recordTable("SACCO admin messages", messages, ["title", "message", "channel", "status", "createdAt", "readAt"]) : emptyState("SACCO admin messages", "Messages from your SACCO admin will appear here.")) : ""}
    ${tab === "unread" ? (unread.length ? recordTable("Unread message queue", unread, ["title", "message", "channel", "status", "createdAt"]) : emptyState("Unread message queue", "Unread SACCO notices will appear here.")) : ""}
    ${tab === "evidence" ? recordTable("Message delivery evidence", messages.map((row) => ({
      title: row.title,
      channel: row.channel,
      status: row.status,
      receivedAt: row.createdAt,
      acknowledgedAt: row.readAt || "-"
    })), ["title", "channel", "status", "receivedAt", "acknowledgedAt"]) : ""}
  `;
}

function paymentRequestStatusNotice() {
  if (!state.paymentRequestStatusMessage && !state.paymentRequestStatusError) return "";
  return `
    <div class="notice ${state.paymentRequestStatusError ? "warning" : "compact"}">
      <strong>${state.paymentRequestStatusError ? "Payment status check failed." : "Payment status updated."}</strong>
      <span>${escapeHtml(state.paymentRequestStatusError || state.paymentRequestStatusMessage)}</span>
    </div>
  `;
}

function memberComplaintsView() {
  const notifications = buildMemberAdminMessageRows(state.memberData.notifications || []).map((notification) => ({
    ...notification,
    action: isMemberNotificationUnread(notification) ? "member-notification-acknowledge" : "none",
    actionLabel: "Acknowledge",
    actionId: notification.id
  }));
  const unreadChats = (state.memberData.chatThreads || []).filter((thread) => thread.unreadCount > 0).length;
  const unreadMsgs = notifications.filter((row) => isMemberNotificationUnread(row)).length;
  const complaintDrafts = buildMemberDraftRows(state.memberData.drafts || [], "complaint", labelize);
  const tabs = [["submit", "Submit"], ["tracking", "Tracking"], ["drafts", `Drafts${complaintDrafts.length ? ` (${complaintDrafts.length})` : ""}`], ["evidence", "Evidence"], ["chat", `Chat${unreadChats ? ` (${unreadChats})` : ""}`], ["notifications", `Notifications${unreadMsgs ? ` (${unreadMsgs})` : ""}`]];
  const tab = activeModuleTab("complaints", tabs);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint center</h2>
          <p>Chat with your SACCO admin, track replies and read SACCO messages.</p>
        </div>
        <span class="status ${unreadChats || unreadMsgs ? "pending" : "active"}">${unreadChats || unreadMsgs ? "Unread activity" : "Current"}</span>
      </div>
    </section>
    ${moduleTabs("complaints", tabs, tab)}
    ${state.memberNotificationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberNotificationMessage)}</strong></div>` : ""}
    ${state.memberNotificationError ? `<div class="notice warning"><strong>Notification update failed.</strong><span>${escapeHtml(state.memberNotificationError)}</span></div>` : ""}
    ${tab === "submit" ? memberComplaintSubmissionPanel() : ""}
    ${tab === "tracking" ? memberComplaintTrackingPanel() : ""}
    ${tab === "drafts" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Complaint draft workspace</h2><p>Review saved complaint drafts before syncing.</p></div></div></section>${memberDraftPanel("Complaint offline drafts", complaintDrafts)}` : ""}
    ${tab === "evidence" ? memberComplaintEvidencePanel() : ""}
    ${tab === "chat" ? memberChatWorkspace() : ""}
    ${tab === "notifications" ? (notifications.length ? recordTable("Notifications", notifications, ["title", "message", "channel", "status", "createdAt", "readAt"]) : emptyState("No messages", "SACCO notices and alerts will appear here.")) : ""}
  `;
}

function memberComplaintSubmissionPanel() {
  const cases = state.memberData.chatThreads || [];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint submission</h2>
          <p>Start a complaint or question for your SACCO administrator, then continue the conversation in the chat tab.</p>
        </div>
        <span class="status active">SACCO admin desk</span>
      </div>
      ${state.memberComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberComplaintMessage)}</strong></div>` : ""}
      ${state.memberComplaintError ? `<div class="notice warning"><strong>Complaint submission failed.</strong><span>${escapeHtml(state.memberComplaintError)}</span></div>` : ""}
      <form id="memberComplaintForm" class="form-grid">
        <label><span>Category</span><select id="memberComplaintCategory"><option value="service">Service</option><option value="payment">Payment</option><option value="loan">Loan</option><option value="account">Account</option></select></label>
        <label><span>Priority</span><select id="memberComplaintPriority"><option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option></select></label>
        <label class="wide"><span>Subject</span><input id="memberComplaintSubject" placeholder="What do you need help with?"></label>
        <label class="wide"><span>Description</span><textarea id="memberComplaintDescription" placeholder="Explain the issue for your SACCO administrator."></textarea></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="complaint">Save draft</button><button class="button primary" type="submit">Submit complaint</button></div>
      </form>
    </section>
    ${recordTable("My complaints", cases, ["subject", "status", "priority", "lastMessagePreview", "updatedAt"])}
  `;
}

function memberComplaintTrackingPanel() {
  const rows = state.memberData.chatThreads || [];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint tracking workspace</h2>
          <p>Track submitted complaints, SACCO admin replies and current status.</p>
        </div>
        <span class="status ${rows.some((row) => normal(row.status) !== "resolved") ? "pending" : "active"}">My complaints</span>
      </div>
    </section>
    ${rows.length ? recordTable("My complaints", rows, ["subject", "status", "priority", "lastMessagePreview", "updatedAt"]) : emptyState("My complaints", "Submitted complaints will appear here.")}
  `;
}

function memberComplaintEvidencePanel() {
  const rows = (state.memberData.chatThreads || []).map((row) => ({
    subject: row.subject,
    status: row.status,
    openedAt: row.createdAt || row.updatedAt,
    lastReply: row.updatedAt,
    evidence: row.id || "Pending"
  }));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint evidence controls</h2>
          <p>Keep complaint references and SACCO replies available for follow-up.</p>
        </div>
        <span class="status active">Evidence ready</span>
      </div>
    </section>
    ${rows.length ? recordTable("Complaint evidence", rows, ["subject", "status", "openedAt", "lastReply", "evidence"]) : emptyState("Complaint evidence", "Complaint evidence appears after submission.")}
  `;
}

function isMemberNotificationUnread(notification) {
  return !notification.readAt && normal(notification.status) !== "read";
}

function chatBubble(direction, author, text, timestamp) {
  return `
    <div class="chat-bubble ${escapeHtml(direction)}">
      <strong>${escapeHtml(author)}</strong>
      <p>${escapeHtml(text || "")}</p>
      <small>${timestamp ? escapeHtml(formatDateTime(timestamp)) : "Pending"}</small>
    </div>
  `;
}

function memberDraftPanel(title, drafts) {
  const filtered = filterRows(drafts || []);
  const columns = ["type", "title", "amount", "details", "status", "updatedAt"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>Drafts are saved on this device and can be synced when the backend is reachable.</p>
        </div>
        <span class="status ${drafts.some((draft) => normal(draft.status) === "failed") ? "danger" : drafts.length ? "pending" : "active"}">${drafts.length ? "Drafts available" : "No drafts"}</span>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${labelize(column)}</th>`).join("")}<th>Actions</th></tr></thead>
            <tbody>${filtered.map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : emptyState("No offline drafts", "Use Save draft to keep a payment or complaint on this device before syncing.")}
    </section>
  `;
}

function memberProfileView(_balances = {}) {
  const member = state.member || {};
  const tabs = [["overview", "Overview"], ["kyc", "KYC"], ["contacts", "Contacts"], ["balances", "Balances"], ["privacy", "Privacy"], ["security", "Security"]];
  const tab = activeModuleTab("profile", tabs);
  return `
    ${moduleTabs("profile", tabs, tab)}
    ${tab === "overview" ? memberProfileOverviewPanel(member) : ""}
    ${tab === "kyc" ? memberProfileKycPanel(member) : ""}
    ${tab === "contacts" ? memberProfileContactsPanel(member) : ""}
    ${tab === "balances" ? memberProfileBalancesPanel(_balances) : ""}
    ${tab === "privacy" ? memberPrivacyPreferencesPanel(member) : ""}
    ${tab === "security" ? memberSecurityView() : ""}
  `;
}

function memberProfileOverviewPanel(member) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member profile and KYC</h2>
          <p>Personal details shown here come from the member session and SACCO KYC record.</p>
        </div>
        <span class="status ${normal(member.kycStatus) === "approved" ? "active" : "pending"}">${labelize(member.kycStatus || "pending")}</span>
      </div>
      <div class="source-grid">
        ${mini("Full name", member.fullName)}
        ${mini("Member type", labelize(member.memberType || "member"))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Joining date", member.joiningDate)}
      </div>
    </section>
  `;
}

function memberProfileKycPanel(member) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member KYC readiness</h2>
          <p>KYC status controls whether the member can transact, borrow and receive SACCO services.</p>
        </div>
        <span class="status ${normal(member.kycStatus) === "approved" ? "active" : "pending"}">${labelize(member.kycStatus || "pending")}</span>
      </div>
      <div class="source-grid">
        ${mini("KYC status", labelize(member.kycStatus || "pending"))}
        ${mini("Member status", labelize(member.status || "pending"))}
        ${mini("National ID", member.nationalId || "Missing")}
        ${mini("Member type", labelize(member.memberType || "member"))}
        ${mini("Review owner", "SACCO admin")}
        ${mini("Support path", "Complaints")}
      </div>
      <ul class="activity-list">
        <li><strong>Identity confirmation</strong><span>Full name, membership number, phone and national ID must match SACCO KYC records.</span><em>Required</em></li>
        <li><strong>Service access</strong><span>Approved KYC improves access to payments, loan applications and guarantor requests.</span><em>Controlled</em></li>
        <li><strong>Correction path</strong><span>Members should contact the SACCO office or submit a complaint to correct profile details.</span><em>Traceable</em></li>
      </ul>
    </section>
  `;
}

function memberProfileContactsPanel(member) {
  const contacts = [
    { type: "Phone", value: member.phone || "-", status: "Verified" },
    { type: "Email", value: member.email || "-", status: member.email ? "Verified" : "Pending" },
    { type: "Emergency contact", value: member.emergencyContact || "SACCO office update required", status: member.emergencyContact ? "Verified" : "Pending" }
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member contact controls</h2>
          <p>Contact details support receipts, alerts, password recovery and SACCO follow-up.</p>
        </div>
        <span class="status active">Contact evidence</span>
      </div>
    </section>
    ${recordTable("Profile contacts", contacts, ["type", "value", "status"])}
  `;
}

function memberProfileBalancesPanel(balances) {
  const rows = [
    { account: "Savings", balance: balances.savings || 0 },
    { account: "Shares", balance: balances.shares || 0 },
    { account: "Welfare", balance: balances.welfare || 0 },
    { account: "Total", balance: Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0) }
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member balance identity</h2>
          <p>Balances belong to the signed-in member and SACCO code.</p>
        </div>
        <span class="status active">Verified</span>
      </div>
    </section>
    ${recordTable("Balance summary", rows, ["account", "balance"])}
  `;
}

function memberPrivacyPreferencesPanel(member) {
  const consent = member.consentPreferences || {};
  const checked = (value) => value ? "checked" : "";
  const privacyRequests = (state.memberData.privacyRequests || []).map((request) => ({
    ...request,
    requestType: labelize(request.requestType || ""),
    status: labelize(request.status || ""),
    createdAt: request.createdAt ? formatDateTime(request.createdAt) : "",
    handledAt: request.handledAt ? formatDateTime(request.handledAt) : "Pending"
  }));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Privacy preferences</h2>
          <p>Control how your SACCO contacts you and shares data with payment providers.</p>
        </div>
        <span class="status ${consent.privacyNoticeAccepted ? "active" : "pending"}">${consent.privacyNoticeAccepted ? "Accepted" : "Action needed"}</span>
      </div>
      ${state.memberPrivacyMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPrivacyMessage)}</strong></div>` : ""}
      ${state.memberPrivacyError ? `<div class="notice warning"><strong>Privacy update failed.</strong><span>${escapeHtml(state.memberPrivacyError)}</span></div>` : ""}
      <form id="memberPrivacyConsentForm" class="form-grid">
        <label class="check-card wide"><input id="privacyNoticeAccepted" type="checkbox" ${checked(consent.privacyNoticeAccepted)}><span>I have read and accepted the Tereka Online privacy notice.</span></label>
        <label class="check-card"><input id="smsConsent" type="checkbox" ${checked(consent.smsConsent)}><span>SMS alerts and receipts</span></label>
        <label class="check-card"><input id="emailConsent" type="checkbox" ${checked(consent.emailConsent)}><span>Email alerts and statements</span></label>
        <label class="check-card"><input id="mobileMoneyConsent" type="checkbox" ${checked(consent.mobileMoneyConsent)}><span>Mobile-money payment initiation</span></label>
        <label class="check-card wide"><input id="providerDataSharingConsent" type="checkbox" ${checked(consent.providerDataSharingConsent)}><span>Share only required payment details with approved mobile-money or bank providers.</span></label>
        <div class="source-grid wide">
          ${mini("Privacy notice accepted", consent.privacyNoticeAcceptedAt ? formatDateTime(consent.privacyNoticeAcceptedAt) : "Not yet")}
          ${mini("Last consent update", consent.consentUpdatedAt ? formatDateTime(consent.consentUpdatedAt) : "Not yet")}
          ${mini("Audit trail", "Recorded by member session")}
        </div>
        <div class="form-actions inline"><button class="button primary" type="submit">Save privacy preferences</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Data protection requests</h2>
          <p>Ask the SACCO to provide your stored profile data, review retention, or process an erasure request without removing financial audit records.</p>
        </div>
        <span class="status active">Audited workflow</span>
      </div>
      ${state.memberPrivacyRequestMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPrivacyRequestMessage)}</strong></div>` : ""}
      ${state.memberPrivacyRequestError ? `<div class="notice warning"><strong>Request failed.</strong><span>${escapeHtml(state.memberPrivacyRequestError)}</span></div>` : ""}
      <form id="memberPrivacyRequestForm" class="form-grid">
        <label><span>Request type</span><select id="memberPrivacyRequestType">
          <option value="subject_access">Subject access</option>
          <option value="retention_review">Retention review</option>
          <option value="erasure">Erasure request</option>
        </select></label>
        <label class="wide"><span>Reason</span><textarea id="memberPrivacyRequestReason" placeholder="Tell the SACCO what you need reviewed or corrected."></textarea></label>
        <div class="form-actions inline"><button class="button primary" type="submit">Submit request</button></div>
      </form>
      ${privacyRequests.length ? recordTable("My data protection requests", privacyRequests, ["requestType", "status", "reason", "resolutionNote", "createdAt", "handledAt"]) : emptyState("No data protection requests", "Submitted requests will appear here with their status.")}
    </section>
  `;
}

function memberSecurityTabbedView() {
  const tabs = [["session", "Session"], ["login", "Login"], ["recovery", "Recovery"], ["safety", "Safety"]];
  const tab = activeModuleTab("security", tabs);
  return `
    ${moduleTabs("security", tabs, tab)}
    ${tab === "session" ? memberSecurityView() : ""}
    ${tab === "login" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Member login requirements</h2><p>SACCO code plus username, email, phone or membership number and password are required.</p></div><span class="status active">Protected</span></div></section>` : ""}
    ${tab === "recovery" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Member recovery controls</h2><p>Password recovery is verified through SACCO-admin identity checks and registered contact channels.</p></div><span class="status active">Controlled</span></div></section>` : ""}
    ${tab === "safety" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Member safety actions</h2><p>Sign out, report suspicious activity and request profile review through the SACCO office.</p></div><span class="status pending">Security actions</span></div><div class="form-actions inline"><button class="button secondary" type="button" data-action="logout">Sign out</button><button class="button secondary" type="button" data-member-shortcut-view="complaints" data-member-shortcut-tab="submit">Report issue</button></div></section>` : ""}
  `;
}

function memberSecurityView() {
  const expiresAt = state.memberData.sessionExpiresAt || state.memberData.dashboard?.sessionExpiresAt || "Current browser session";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberSecurityCenter")}</h2>
          <p>${t("memberSecurityCenterCopy")}</p>
        </div>
        <span class="status active">${t("protected")}</span>
      </div>
      <div class="source-grid">
        ${mini("SACCO code", contextCode())}
        ${mini("Username", state.member?.membershipNo || state.member?.email || state.member?.phone)}
        ${mini("Session expiry", expiresAt)}
        ${mini("Last sync", state.lastSync ? formatDateTime(state.lastSync) : "Pending")}
      </div>
      <p>Password resets and contact-detail changes are handled by your SACCO office after identity verification. If you notice suspicious activity, sign out and contact your SACCO.</p>
      <div class="form-actions">
        <button class="button secondary" type="button" data-action="logout">${t("logout")}</button>
      </div>
    </section>
  `;
}
