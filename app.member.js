// Member portal rendering helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

function renderMemberView(view) {
  const dash = state.memberData.dashboard || {};
  const balances = state.memberData.balances || dash.balances || {};
  if (view === "home") {
    const total = Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0);
    const recent = (dash.recentTransactions || []).slice(0, 6);
    return `
      <section class="panel member-balance">
        <p class="eyebrow">${displayName()} · ${t("totalBalance")}</p>
        <h2 class="balance-amount">${money.format(total)}</h2>
        <p class="balance-breakdown">${t("savings")} ${money.format(balances.savings || 0)} · ${t("shares")} ${money.format(balances.shares || 0)} · ${t("welfare")} ${money.format(balances.welfare || 0)}</p>
      </section>
      ${memberQuickActionsPanel()}
      ${recent.length
        ? recordTable("Recent activity", recent, ["reference", "description", "debit", "credit", "runningBalance", "postedAt"])
        : emptyState("No transactions yet", "Your posted deposits and repayments will appear here.")}
    `;
  }
  if (view === "money") return memberMoneyView(dash, balances);
  if (view === "loans") return memberLoansView();
  if (view === "payments") return memberPaymentsView();
  if (view === "complaints") return memberComplaintsView();
  if (view === "profile") return memberProfileView(balances);
  return moduleBlueprint(view);
}

function memberQuickActionsPanel() {
  const actions = [
    [t("payByMobileMoney"), t("payByMobileMoneyCopy"), "payments", "mobile-money"],
    [t("viewStatement"), t("viewStatementCopy"), "money", "statement"],
    ["Loans", "Apply for or repay a loan", "loans", "loans"],
    ["Message your SACCO", "Start or continue a support chat", "complaints", "chat"]
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
  const lines = memberStatementLines(dash);
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

function memberTabReadinessPanel() {
  // Removed: production portal no longer renders filler "readiness" panels.
  return "";
}

function memberLoansView() {
  const loans = state.memberData.loans || [];
  const requests = memberGuarantorRows();
  const pending = requests.filter((row) => normal(row.status) === "pending");
  const tabs = [["loans", "My loans"], ["guarantor", `Guarantor requests${pending.length ? ` (${pending.length})` : ""}`]];
  const tab = activeModuleTab("loans", tabs);
  return `
    ${moduleTabs("loans", tabs, tab)}
    ${tab === "loans" ? `${memberLoanApplicationPanel()}${loans.length ? recordTable("My loans", loans, ["product", "requestedAmount", "outstandingBalance", "nextDueDate", "status"]) : emptyState("No loans yet", "Apply for a loan using the form above.")}` : ""}
    ${tab === "guarantor" ? `${state.memberGuarantorMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorMessage)}</strong></div>` : ""}${state.memberGuarantorError ? `<div class="notice warning"><strong>Guarantor decision failed.</strong><span>${escapeHtml(state.memberGuarantorError)}</span></div>` : ""}${requests.length ? recordTable("Guarantor requests", requests, ["borrower", "product", "requestedAmount", "guaranteedAmount", "capacity", "status"]) : emptyState("No guarantor requests", "Requests to guarantee other members' loans appear here.")}` : ""}
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
  const requestRows = memberPaymentRequestRows();
  const paymentDrafts = memberDraftRows("payment");
  return `
    ${paymentRequestStatusNotice()}
    ${memberPaymentFormPanel(payableLoans)}
    ${paymentDrafts.length ? memberDraftPanel("Saved drafts", paymentDrafts) : ""}
    ${requestRows.length ? recordTable("Recent online payment requests", requestRows, ["provider", "purpose", "amount", "payerPhone", "status", "requestedAt"]) : ""}
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
      ${memberBankCollectionPanel(payableLoans, false)}
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
          <div class="network-picker">
            ${providers.map((provider, index) => memberPaymentProviderTile(provider, index === 0)).join("")}
          </div>
        </label>
        <label><span>Paying for</span><select id="memberPaymentPurpose"><option value="savings_deposit">Savings</option><option value="share_purchase">Shares</option><option value="welfare_contribution">Welfare</option>${payableLoans.length ? `<option value="loan_repayment">Loan repayment</option>` : ""}</select></label>
        <label><span>Amount (UGX)</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>Mobile money number</span><input id="memberPaymentPhone" value="${escapeHtml(state.member?.phone || "")}" placeholder="07XX XXX XXX"></label>
        ${payableLoans.length ? `<label class="wide"><span>Loan (only if repaying)</span><select id="memberPaymentLoanId"><option value="">Not a loan repayment</option>${payableLoans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(loan.product || loan.applicationNo || loan.id)} - ${money.format(loan.outstandingBalance || loan.balance || 0)}</option>`).join("")}</select></label>` : ""}
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">Save draft</button><button class="button primary" type="submit">Pay now</button></div>
      </form>
    </section>
  `;
}

function memberBankCollectionPanel(payableLoans, _preferCompact = false) {
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
  return buildMemberPaymentProviderOptions(
    !!tenant.mobileMoneyCollectionAvailable,
    state.memberData.dashboard?.paymentProviders,
    labelize
  );
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

function memberGuarantorRows() {
  return buildMemberGuarantorRows(state.memberData.pendingGuarantors || []);
}

function memberAdminMessageRows() {
  return buildMemberAdminMessageRows(state.memberData.notifications || []);
}

function memberMobileMoneyRows(dash) {
  return buildMemberMobileMoneyRows(dash);
}

/**
 * Builds a member-facing payment lifecycle from requests, posted statement lines and offline drafts.
 * @param {TerekaMemberDashboard} dash
 * @returns {TerekaPaymentLifecycleRow[]}
 */
function memberPaymentLifecycleRows(dash) {
  return buildMemberPaymentLifecycleRows({
    dashboard: dash,
    drafts: memberDraftRows("payment"),
    labelize,
    paymentRequests: state.memberData.paymentRequests || [],
  });
}

function memberPaymentRequestRows() {
  return buildMemberPaymentRequestRows(state.memberData.paymentRequests || []);
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

/**
 * @param {TerekaPaymentRequest | TerekaStatementLine | TerekaOfflineDraft | Record<string, any>} row
 * @returns {string}
 */
function paymentLifecycleStatus(row) {
  return paymentLifecycleStatusFor(row);
}

/**
 * @param {TerekaPaymentRequest | TerekaStatementLine | Record<string, any>} row
 * @returns {string}
 */
function receiptLifecycleStatus(row) {
  return receiptLifecycleStatusFor(row);
}

/**
 * @param {TerekaStatementLine | TerekaFinancialTransaction} line
 * @returns {boolean}
 */
function isMobileMoneyLine(line) {
  return isMobileMoneyPerformanceLine(line);
}




function memberComplaintsView() {
  const notifications = memberAdminMessageRows().map((notification) => ({
    ...notification,
    action: isMemberNotificationUnread(notification) ? "member-notification-acknowledge" : "none",
    actionLabel: "Acknowledge",
    actionId: notification.id
  }));
  const unreadChats = (state.memberData.chatThreads || []).filter((thread) => thread.unreadCount > 0).length;
  const unreadMsgs = notifications.filter((row) => isMemberNotificationUnread(row)).length;
  const tabs = [["chat", `Chat${unreadChats ? ` (${unreadChats})` : ""}`], ["notifications", `Notifications${unreadMsgs ? ` (${unreadMsgs})` : ""}`]];
  const tab = activeModuleTab("complaints", tabs);
  return `
    ${moduleTabs("complaints", tabs, tab)}
    ${state.memberNotificationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberNotificationMessage)}</strong></div>` : ""}
    ${state.memberNotificationError ? `<div class="notice warning"><strong>Notification update failed.</strong><span>${escapeHtml(state.memberNotificationError)}</span></div>` : ""}
    ${tab === "chat" ? memberChatWorkspace() : ""}
    ${tab === "notifications" ? (notifications.length ? recordTable("Notifications", notifications, ["title", "message", "channel", "status", "createdAt", "readAt"]) : emptyState("No messages", "SACCO notices and alerts will appear here.")) : ""}
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

function memberDraftRows(type = "") {
  return buildMemberDraftRows(state.memberData.drafts || [], type, labelize);
}

function memberProfileView(_balances = {}) {
  const member = state.member || {};
  const tabs = [["overview", "Overview"], ["kyc", "KYC"], ["privacy", "Privacy"], ["security", "Security"]];
  const tab = activeModuleTab("profile", tabs);
  return `
    ${moduleTabs("profile", tabs, tab)}
    ${tab === "overview" ? memberProfileOverviewPanel(member) : ""}
    ${tab === "kyc" ? memberProfileKycPanel(member) : ""}
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
