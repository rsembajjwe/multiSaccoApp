function transactionsView() {
  if (isPlatform()) return platformTransactionsView();
  const cycle = currentSaccoCycleContext();
  const rows = transactionRows(cycle);
  const overview = buildTransactionOverviewSummary(rows);
  const receiptingQueue = buildTransactionReceiptingQueue(rows);
  const receiptRegister = buildTransactionReceiptRegister(rows);
  const tabs = [["overview", "Overview"], ["capture", t("newTransactionScreen")], ["receipting", "Receipting queue"], ["receipts", "Receipt register"], ["list", t("transactionList")], ["detail", t("transactionDetail")]];
  const tab = activeModuleTab("transactions", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Transaction cycle" })}
    <div class="dashboard-grid">
      ${summary(t("transactions"), overview.totalRows, "Deposits, withdrawals and corrections", t("review"))}
      ${summary(t("pendingApproval"), overview.pendingApproval, "Maker-checker queue", "Approve")}
      ${summary(t("postedValue"), money.format(overview.postedValue), "Receipt-ready transactions", t("receipts"))}
    </div>
    ${moduleTabs("transactions", tabs, tab)}
    ${tab === "overview" ? transactionControlFocusPanel(overview, receiptingQueue, receiptRegister) : ""}
    ${tab === "capture" ? transactionFormPanel() : ""}
    ${tab === "receipting" ? transactionReceiptingPanel(receiptingQueue) : ""}
    ${tab === "receipts" ? transactionReceiptRegisterPanel(receiptRegister) : ""}
    ${tab === "detail" ? (transactionDetailPanel(rows) || emptyState("Transaction detail and reversal", "Select a transaction from the list to review receipt, approval and reversal actions.")) : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search by reference, member, channel, status, amount or user", "New transaction", "Print receipt")}
      ${recordTable(`Transaction list - ${cycle.label}`, rows, ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "reversalStatus", "status"])}
    ` : ""}
  `;
}

function paymentsView() {
  return transactionFormPanel({ paymentOnly: true });
}

function platformTransactionsView() {
  const rows = platformSubscriptionTransactionRows();
  const tabs = [["capture", t("newTransactionScreen")], ["list", t("transactionList")], ["detail", t("transactionDetail")]];
  const tab = activeModuleTab("transactions", tabs);
  const paidTotal = rows.reduce((total, row) => total + Number(row.paid || 0), 0);
  const dueTotal = rows.reduce((total, row) => total + Number(row.balanceDue || 0), 0);
  return `
    <div class="dashboard-grid">
      ${summary("Platform-SACCO transactions", rows.length, "Subscription and platform payments", t("review"))}
      ${summary("Outstanding", money.format(dueTotal), "Due from SACCOs", "Follow up")}
      ${summary("Confirmed", money.format(paidTotal), "Received from SACCOs", t("receipts"))}
    </div>
    ${moduleTabs("transactions", tabs, tab)}
    ${tab === "capture" ? platformTransactionFormPanel(rows) : ""}
    ${tab === "detail" ? (platformTransactionDetailPanel(rows) || emptyState("Platform-SACCO transaction detail", "Select a SACCO transaction from the list to review or record payment.")) : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search by SACCO, code, invoice, package, status or amount", "New platform-SACCO transaction", "Export")}
      ${recordTable("Platform-SACCO transaction list", rows, ["saccoCode", "tenantName", "invoice", "packageName", "billingDescription", "amount", "paid", "balanceDue", "paymentStage", "operatingAccess", "expiry"])}
    ` : ""}
  `;
}

function platformSubscriptionTransactionRows() {
  return buildSubscriptionRows({ subscriptions: dataRows("subscriptions"), tenants: tenantRows() })
    .map((row) => ({
      ...row,
      action: "platform-transaction-detail",
      actionLabel: Number(row.balanceDue || 0) > 0 ? "Record payment" : "Review",
      actionId: row.id
    }));
}

function platformTransactionFormPanel(rows) {
  const canManage = hasPermission("subscriptions:manage") || roleKind() === "super" || roleKind() === "billing";
  const selected = platformSelectedSubscription(rows);
  if (!selected) {
    return emptyState("No SACCO subscriptions", "Create or approve a SACCO subscription before recording platform-SACCO transactions.");
  }
  const due = Math.max(0, Number(selected.amount || 0) - Number(selected.paid || 0));
  const searchValue = platformTransactionSearchLabel(selected);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Record platform-SACCO transaction</h2>
          <p>Capture subscription, renewal or service payments between the platform and a SACCO. These are not SACCO member transactions.</p>
        </div>
      </div>
      ${state.selectedSubscriptionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedSubscriptionMessage)}</strong></div>` : ""}
      ${state.selectedSubscriptionError ? `<div class="notice warning"><strong>Transaction failed.</strong><span>${escapeHtml(state.selectedSubscriptionError)}</span></div>` : ""}
      <form id="subscriptionPaymentForm" class="form-grid">
        <label>
          <span>Search SACCO</span>
          <input id="platformTransactionSaccoSearch" list="platformTransactionSaccoOptions" value="${escapeHtml(searchValue)}" placeholder="Type SACCO name, 4-letter code or invoice" autocomplete="off" ${canManage ? "" : "disabled"}>
          <datalist id="platformTransactionSaccoOptions">
            ${platformTransactionSearchOptions(rows).map((option) => `<option value="${escapeHtml(option.label)}"></option>`).join("")}
          </datalist>
          <small>Search by SACCO name, code or invoice, then select the matching SACCO before recording payment.</small>
        </label>
        <input type="hidden" id="platformTransactionSubscriptionId" value="${escapeHtml(selected.id)}">
        <input type="hidden" id="selectedSubscriptionId" value="${escapeHtml(selected.id)}">
        <input type="hidden" id="selectedSubscriptionTenantId" value="${escapeHtml(selected.tenantId)}">
        <label><span>Transaction type</span><select id="platformTransactionType" ${canManage ? "" : "disabled"}><option value="subscription_payment">Subscription payment</option><option value="subscription_renewal">Subscription renewal</option><option value="platform_service_fee">Platform service fee</option></select></label>
        <label><span>Payment amount</span><input id="subscriptionPaymentAmount" type="number" min="1" step="1" value="${due || selected.amount || 0}" ${canManage ? "" : "disabled"}></label>
        <label><span>Payment channel</span><select id="subscriptionPaymentChannel" ${canManage ? "" : "disabled"}><option value="manual">Manual</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option></select></label>
        <label><span>External reference</span><input id="subscriptionPaymentReference" placeholder="Bank slip, mobile money or manual reference" ${canManage ? "" : "disabled"}></label>
        <input id="subscriptionPaymentMode" type="hidden" value="group">
        <input id="subscriptionPaymentMemberSlots" type="hidden" value="">
        <div class="source-grid wide">
          ${mini("SACCO", selected.tenantName || selected.tenantId)}
          ${mini("Invoice", selected.invoice || selected.id)}
          ${mini("Package", selected.packageName || selected.packageId)}
          ${mini("Balance due", money.format(due))}
        </div>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Record platform-SACCO payment</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function platformSelectedSubscription(rows) {
  const selectedId = state.selectedSubscriptionId || state.platformTransactionSubscriptionId || rows.find((row) => Number(row.balanceDue || 0) > 0)?.id || rows[0]?.id || "";
  return rows.find((row) => row.id === selectedId) || rows[0] || null;
}

function platformTransactionSearchOptions(rows) {
  return rows.map((row) => ({
    id: row.id,
    label: platformTransactionSearchLabel(row)
  }));
}

function platformTransactionSearchLabel(row) {
  return [row.saccoCode, row.tenantName || row.tenantId, row.invoice].filter(Boolean).join(" - ");
}

function resolvePlatformTransactionSearch(value, rows = platformSubscriptionTransactionRows()) {
  const needle = normal(value);
  if (!needle) return null;
  return rows.find((row) => normal(platformTransactionSearchLabel(row)) === needle)
    || rows.find((row) => normal(row.saccoCode) === needle || normal(row.tenantName) === needle || normal(row.invoice) === needle || normal(row.tenantId) === needle)
    || null;
}

function openPlatformTransactionDetail(subscriptionId) {
  state.selectedSubscriptionId = subscriptionId;
  state.platformTransactionSubscriptionId = subscriptionId;
  state.moduleTabs.transactions = "detail";
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  renderShell();
}

function platformTransactionDetailPanel(rows) {
  const row = platformSelectedSubscription(rows);
  if (!row) return "";
  state.selectedSubscriptionId = row.id;
  return subscriptionDetailPanel(rows);
}

function transactionControlFocusPanel(overview, receiptingQueue, receiptRegister) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Transaction control focus</h2>
          <p>Control deposits, loan repayments, non-cash approvals, receipts and reversals from one transaction workflow.</p>
        </div>
        <span class="status ${overview.pendingApproval ? "pending" : "active"}">${overview.pendingApproval ? "Approval queue" : "Current"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Non-cash approval", overview.pendingApproval)}
        ${mini("Posted value", money.format(overview.postedValue))}
        ${mini("Receipting queue", receiptingQueue.length)}
        ${mini("Receipt register", receiptRegister.length)}
        ${mini("Payment routes", "Treasurer cash, mobile money and bank")}
        ${mini("Reversal control", "Reason required for posted corrections")}
      </div>
    </section>
  `;
}

function transactionReceiptRegisterPanel(rows) {
  const receiptSummary = buildTransactionReceiptSummary(rows);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipt register</h2>
          <p>Posted member receipts for Treasurer/Admin printing, member follow-up and audit evidence.</p>
        </div>
        <span class="status ${rows.length ? "active" : "pending"}">${rows.length ? "Receipts available" : "No receipts"}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipts", receiptSummary.totalRows)}
        ${mini("Total receipted", money.format(receiptSummary.totalAmount))}
        ${mini("Mobile money", receiptSummary.mobileMoney)}
        ${mini("Treasurer cash", receiptSummary.treasurerCash)}
        ${mini("Loan repayments", receiptSummary.loanRepayments)}
        ${mini("Savings deposits", receiptSummary.savingsDeposits)}
      </div>
    </section>
    ${filterToolbar("Search receipts by receipt number, member, route, reference or amount", "Download register", "Print receipts")}
    ${recordTable("SACCO receipt register", rows, ["receiptNo", "postedAt", "memberName", "type", "paymentRoute", "amount", "receiptStatus", "reference"])}
  `;
}

function transactionReceiptingPanel(rows) {
  const receiptSummary = buildTransactionReceiptSummary(rows);
  const pendingPosting = rows.filter((row) => normal(row.status).includes("pending")).length;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipting queue</h2>
          <p>Treasurer/Admin queue for deposits, loan repayments, mobile-money callbacks and receipt follow-up.</p>
        </div>
        <span class="status ${rows.length ? "pending" : "active"}">${rows.length ? "Action queue" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Pending posting", pendingPosting)}
        ${mini("Receipt ready", receiptSummary.receiptReady)}
        ${mini("Mobile money", receiptSummary.mobileMoney)}
        ${mini("Treasurer cash", receiptSummary.treasurerCash)}
        ${mini("Loan repayments", receiptSummary.loanRepayments)}
        ${mini("Savings deposits", receiptSummary.savingsDeposits)}
      </div>
      <ul class="activity-list">
        <li><strong>Pending posting</strong><span>Review mobile-money, bank or manual entries before posting. Treasurer cash posts immediately with a receipt trail.</span><em>${pendingPosting ? "Review" : "Clear"}</em></li>
        <li><strong>Receipt ready</strong><span>Load receipt for posted transactions, then confirm the member can see the same reference in the member portal.</span><em>${receiptSummary.receiptReady ? "Ready" : "Waiting"}</em></li>
        <li><strong>Payment route</strong><span>Mobile-money and Treasurer cash are separated so reconciliation and monthly performance remain clear.</span><em>Controlled</em></li>
      </ul>
    </section>
    ${filterToolbar("Search receipting queue by member, reference, route, status or amount", "Post selected", "Load receipt")}
    ${recordTable("Receipting queue", rows, ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "receiptingAction", "status"])}
  `;
}

function transactionFormPanel(options = {}) {
  const paymentOnly = Boolean(options.paymentOnly);
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members");
  const branches = dataRows("branches");
  const selectedMemberId = members[0]?.id || "";
  const paymentChannelOptions = paymentOnly
    ? `<option value="cash">Cash</option><option value="mobile_money">Mobile money</option>`
    : `<option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option>`;
  const transactionTypeOptions = paymentOnly
    ? `<option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="loan_repayment">Loan repayment</option>`
    : `<option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="loan_repayment">Loan repayment</option><option value="withdrawal">Withdrawal</option>`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Record a transaction</h2>
          <p>${paymentOnly ? "Initiate or record member payments by cash or mobile money." : "Capture a member deposit, loan repayment or withdrawal. Cash posts immediately; bank and mobile-money entries may require verification."}</p>
        </div>
      </div>
      ${state.transactionFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.transactionFormMessage)}</strong></div>` : ""}
      ${state.transactionFormError ? `<div class="notice warning"><strong>Transaction failed.</strong><span>${escapeHtml(state.transactionFormError)}</span></div>` : ""}
      <form id="transactionForm" class="form-grid">
        <input type="hidden" id="newTransactionTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newTransactionMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Branch</span><select id="newTransactionBranchId" ${canCreate ? "" : "disabled"}><option value="">Use member branch</option>${branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Transaction type</span><select id="newTransactionType" ${canCreate ? "" : "disabled"}>${transactionTypeOptions}</select><small>Use Loan repayment when the member pays a loan through Treasurer cash, bank or mobile money.</small></label>
        <label><span>Payment channel</span><select id="newTransactionChannel" ${canCreate ? "" : "disabled"}>${paymentChannelOptions}</select></label>
        <label id="newTransactionProviderWrap" class="payment-provider-field hidden"><span>Mobile money provider</span><select id="newTransactionProvider" ${canCreate ? "" : "disabled"}><option value="mtn">MTN</option><option value="airtel">Airtel</option></select></label>
        <div id="newTransactionLoanBalance" class="loan-balance-panel wide" aria-live="polite">${transactionLoanBalanceHtml(selectedMemberId, "savings_deposit")}</div>
        <label><span>Amount</span><input id="newTransactionAmount" type="number" min="1" step="1" required value="10000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Payment note</span><input id="newTransactionNarration" placeholder="Cash receipt note or mobile money reference" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">${paymentOnly ? "Initiate / post transaction" : "Post / submit transaction"}</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function syncTransactionPaymentProvider() {
  const channel = value("newTransactionChannel");
  const wrapper = document.getElementById("newTransactionProviderWrap");
  const provider = document.getElementById("newTransactionProvider");
  if (!wrapper) return;
  const mobileMoney = channel === "mobile_money";
  wrapper.classList.toggle("hidden", !mobileMoney);
  if (provider instanceof HTMLSelectElement) provider.disabled = !mobileMoney || !hasPermission("transactions:create");
}

function transactionLoanBalanceHtml(memberId, transactionType) {
  if (transactionType !== "loan_repayment") {
    return `<div class="loan-balance-muted">Choose <strong>Loan repayment</strong> to view the selected member's active loan balance.</div>`;
  }
  const loans = activeTransactionLoansForMember(memberId);
  if (!loans.length) {
    return `<div class="loan-balance-empty"><strong>No active loan balance found.</strong><span>This member has no active loan requiring repayment in the loaded records.</span></div>`;
  }
  const totalOutstanding = loans.reduce((sum, loan) => sum + transactionLoanOutstandingBalance(loan), 0);
  return `
    <div class="loan-balance-summary">
      <div><span>Loan balance</span><strong>${money.format(totalOutstanding)}</strong></div>
      <div><span>Active loan(s)</span><strong>${loans.length}</strong></div>
      <div><span>Member</span><strong>${escapeHtml(memberName(memberId))}</strong></div>
    </div>
    <div class="loan-balance-list">
      ${loans.map((loan) => `
        <div class="loan-balance-row">
          <strong>${escapeHtml(loan.product || loan.applicationNo || loan.id || "Active loan")}</strong>
          <span>Outstanding ${money.format(transactionLoanOutstandingBalance(loan))}</span>
          <em>${escapeHtml(loan.nextDueDate || loan.scheduleStatus || loan.status || "active")}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function transactionLoanBalanceForMember(memberId) {
  return activeTransactionLoansForMember(memberId).reduce((sum, loan) => sum + transactionLoanOutstandingBalance(loan), 0);
}

function activeTransactionLoansForMember(memberId) {
  return dataRows("loans")
    .filter((loan) => loan.memberId === memberId)
    .filter((loan) => !["closed", "rejected", "cancelled", "written_off"].some((status) => normal(loan.status).includes(status) || normal(loan.stage).includes(status)))
    .filter((loan) => transactionLoanOutstandingBalance(loan) > 0);
}

function transactionLoanOutstandingBalance(loan) {
  if (!loan) return 0;
  const recorded = loan.outstandingBalance ?? loan.balance;
  const recordedValue = Number(recorded);
  if (Number.isFinite(recordedValue)) return Math.max(recordedValue, 0);
  const total = Number(loan.totalPayable || 0) || Number(loan.amount || loan.requestedAmount || 0) + Number(loan.interestAmount || 0);
  return Math.max(total - Number(loan.repaymentTotal || loan.repayments || 0), 0);
}

function syncTransactionLoanBalance() {
  const container = document.getElementById("newTransactionLoanBalance");
  const amountInput = document.getElementById("newTransactionAmount");
  const transactionType = value("newTransactionType");
  const memberId = value("newTransactionMemberId");
  if (!container) return;
  container.innerHTML = transactionLoanBalanceHtml(memberId, transactionType);
  if (!(amountInput instanceof HTMLInputElement)) return;
  if (transactionType !== "loan_repayment") {
    amountInput.removeAttribute("max");
    amountInput.setCustomValidity("");
    return;
  }
  const loanBalance = transactionLoanBalanceForMember(memberId);
  amountInput.max = String(Math.floor(loanBalance));
  if (Number(amountInput.value || 0) > loanBalance) {
    amountInput.setCustomValidity(`Amount cannot exceed loan balance ${money.format(loanBalance)}.`);
  } else {
    amountInput.setCustomValidity("");
  }
}


function transactionRows(cycle = null) {
  return buildTransactionRows({
    transactions: cycle ? filterTransactionsBySaccoCycle(dataRows("transactions"), cycle) : dataRows("transactions"),
    memberName
  });
}

function transactionDetailPanel(rows) {
  const transaction = rows.find((item) => item.id === state.selectedTransactionId);
  if (!transaction) return "";
  const canApprove = hasPermission("transactions:approve");
  const pending = normal(transaction.status).includes("pending");
  const postedOriginal = normal(transaction.status) === "posted" && !transaction.originalTransactionId;
  const receiptReady = normal(transaction.status) === "posted";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Transaction detail and reversal</h2>
          <p>${escapeHtml(transaction.reference || transaction.id)} - ${escapeHtml(transaction.type || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-transaction-detail">Close</button>
      </div>
      ${state.selectedTransactionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTransactionMessage)}</strong></div>` : ""}
      ${state.selectedTransactionError ? `<div class="notice warning"><strong>Transaction action failed.</strong><span>${escapeHtml(state.selectedTransactionError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Approval state", transaction.approvalReadiness || labelize(transaction.status || "review"), "Maker-checker status", "Review")}
        ${summary("Receipt", transaction.receiptStatus || "Post first", "Available after posting", "Load")}
        ${summary("Reversal", transaction.reversalStatus || "Not available", "Requires reason and balance check", "Control")}
        ${summary("Amount", money.format(transaction.amount || 0), labelize(transaction.type || "transaction"), "Verify")}
      </div>
      <div class="source-grid">
        ${mini("Member", transaction.memberName || transaction.memberId)}
        ${mini("Amount", money.format(transaction.amount || 0))}
        ${mini("Status", transaction.status)}
        ${mini("Channel", transaction.channel)}
        ${mini("Posted at", transaction.postedAt)}
        ${mini("Original transaction", transaction.originalTransactionId)}
        ${mini("Reversal reason", transaction.reversalReason)}
        ${mini("Rejection reason", transaction.rejectionReason)}
      </div>
      ${transactionDecisionChecklistPanel(pending, receiptReady, postedOriginal)}
      <form id="transactionDecisionForm" class="form-grid single">
        <input type="hidden" id="selectedTransactionId" value="${escapeHtml(transaction.id)}">
        <label><span>Decision / reversal reason</span><input id="transactionDecisionReason" placeholder="Required for rejection or reversal" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions">
          ${canApprove ? `
            <button class="button secondary" type="button" data-transaction-action="post" ${pending ? "" : "disabled"}>Approve/post transaction</button>
            <button class="button ghost" type="button" data-transaction-action="reject" ${pending ? "" : "disabled"}>Reject transaction</button>
            <button class="button secondary" type="button" data-transaction-action="receipt" ${receiptReady ? "" : "disabled"}>Load receipt</button>
            <button class="button ghost" type="button" data-transaction-action="reverse" ${postedOriginal ? "" : "disabled"}>Reverse posted transaction</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      ${state.selectedTransactionReceipt ? transactionReceiptPreview(state.selectedTransactionReceipt) : ""}
    </section>
  `;
}

function transactionDecisionChecklistPanel(pending, receiptReady, postedOriginal) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Transaction decision checklist</h2>
          <p>Review approval, receipt and reversal conditions before changing a transaction.</p>
        </div>
        <span class="status ${pending || postedOriginal ? "pending" : "active"}">${pending || postedOriginal ? "Action available" : "Reviewed"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Approval", pending ? "Review member, amount, channel and narration before posting or rejecting. (Pending)" : "Approval action is only available while pending. (Done)")}
        ${mini("Receipt", receiptReady ? "Posted transaction can generate an official receipt preview. (Ready)" : "Receipt becomes available after posting. (Waiting)")}
        ${mini("Reversal", postedOriginal ? "Enter a reason before reversing this original posted transaction. (Available)" : "Reversal is only available for posted original transactions. (Locked)")}
      </div>
    </section>
  `;
}

function transactionReceiptPreview(receipt) {
  return `
    <section class="receipt-box">
      <div class="panel-heading">
        <div>
          <h3>Receipt preview</h3>
          <p>${escapeHtml(receipt.receiptNo || "Receipt")} - ${escapeHtml(receipt.memberName || receipt.membershipNo || "Member")}</p>
        </div>
        <span class="status active">Receipted</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt number", receipt.receiptNo)}
        ${mini("SACCO", receipt.tenantName)}
        ${mini("Member", receipt.membershipNo ? `${receipt.memberName || "Member"} (${receipt.membershipNo})` : receipt.memberName)}
        ${mini("Payment route", paymentRouteLabelFor(receipt))}
        ${mini("Amount", money.format(receipt.amount || 0))}
        ${mini("Issued at", receipt.issuedAt ? formatDateTime(receipt.issuedAt) : formatDateTime(new Date().toISOString()))}
      </div>
      <pre>${escapeHtml(receipt.printableText || "")}</pre>
    </section>
  `;
}
