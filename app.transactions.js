function transactionsView() {
  const rows = transactionRows();
  const pending = rows.filter((row) => normal(row.status).includes("pending"));
  const posted = rows.filter((row) => normal(row.status) === "posted");
  const reversed = rows.filter((row) => row.originalTransactionId || normal(row.status).includes("reversed"));
  const receiptingQueue = transactionReceiptingQueue(rows);
  const receiptRegister = transactionReceiptRegister(rows);
  const tabs = [["capture", t("newTransactionScreen")], ["list", t("transactionList")], ["receipting", "Receipting queue"], ["receipts", "Receipt register"], ["detail", t("transactionDetail")]];
  const tab = activeModuleTab("transactions", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("transactions"), rows.length, "Deposits, withdrawals and corrections", t("review"))}
      ${summary(t("pendingApproval"), pending.length, "Maker-checker queue", "Approve")}
      ${summary(t("postedValue"), money.format(sum(posted, "amount")), "Receipt-ready transactions", t("receipts"))}
    </div>
    ${moduleTabs("transactions", tabs, tab)}
    ${tab === "capture" ? transactionFormPanel() : ""}
    ${tab === "receipting" ? transactionReceiptingPanel(receiptingQueue) : ""}
    ${tab === "receipts" ? transactionReceiptRegisterPanel(receiptRegister) : ""}
    ${tab === "detail" ? (transactionDetailPanel(rows) || emptyState("Transaction detail and reversal", "Select a transaction from the list to review receipt, approval and reversal actions.")) : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search by reference, member, channel, status, amount or user", "New transaction", "Print receipt")}
      ${recordTable("Transaction list", rows, ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "reversalStatus", "status"])}
    ` : ""}
  `;
}

function transactionReceiptRegisterPanel(rows) {
  const mobile = rows.filter((row) => row.paymentRoute === "Mobile money");
  const treasurer = rows.filter((row) => row.paymentRoute === "Treasurer cash");
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
        ${mini("Receipts", rows.length)}
        ${mini("Total receipted", money.format(sum(rows, "amount")))}
        ${mini("Mobile money", mobile.length)}
        ${mini("Treasurer cash", treasurer.length)}
        ${mini("Loan repayments", rows.filter((row) => normal(row.type).includes("loan")).length)}
        ${mini("Savings deposits", rows.filter((row) => normal(row.type).includes("saving")).length)}
      </div>
    </section>
    ${filterToolbar("Search receipts by receipt number, member, route, reference or amount", "Download register", "Print receipts")}
    ${recordTable("SACCO receipt register", rows, ["receiptNo", "postedAt", "memberName", "type", "paymentRoute", "amount", "receiptStatus", "reference"])}
  `;
}

function transactionReceiptingPanel(rows) {
  const pending = rows.filter((row) => normal(row.status).includes("pending"));
  const ready = rows.filter((row) => normal(row.status) === "posted");
  const mobile = rows.filter((row) => row.paymentRoute === "Mobile money");
  const treasurer = rows.filter((row) => row.paymentRoute === "Treasurer cash");
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
        ${mini("Pending posting", pending.length)}
        ${mini("Receipt ready", ready.length)}
        ${mini("Mobile money", mobile.length)}
        ${mini("Treasurer cash", treasurer.length)}
        ${mini("Loan repayments", rows.filter((row) => normal(row.type).includes("loan")).length)}
        ${mini("Savings deposits", rows.filter((row) => normal(row.type).includes("saving")).length)}
      </div>
      <ul class="activity-list">
        <li><strong>Pending posting</strong><span>Approve/post verified Treasurer cash, bank or manual entries before issuing receipts.</span><em>${pending.length ? "Review" : "Clear"}</em></li>
        <li><strong>Receipt ready</strong><span>Load receipt for posted transactions, then confirm the member can see the same reference in the member portal.</span><em>${ready.length ? "Ready" : "Waiting"}</em></li>
        <li><strong>Payment route</strong><span>Mobile-money and Treasurer cash are separated so reconciliation and monthly performance remain clear.</span><em>Controlled</em></li>
      </ul>
    </section>
    ${filterToolbar("Search receipting queue by member, reference, route, status or amount", "Post selected", "Load receipt")}
    ${recordTable("Receipting queue", rows, ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "receiptingAction", "status"])}
  `;
}

function transactionFormPanel() {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members");
  const branches = dataRows("branches");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Record a transaction</h2>
          <p>Capture a member deposit, loan repayment or withdrawal for approval.</p>
        </div>
      </div>
      ${state.transactionFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.transactionFormMessage)}</strong></div>` : ""}
      ${state.transactionFormError ? `<div class="notice warning"><strong>Transaction failed.</strong><span>${escapeHtml(state.transactionFormError)}</span></div>` : ""}
      <form id="transactionForm" class="form-grid">
        <input type="hidden" id="newTransactionTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newTransactionMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Branch</span><select id="newTransactionBranchId" ${canCreate ? "" : "disabled"}><option value="">Use member branch</option>${branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Transaction type</span><select id="newTransactionType" ${canCreate ? "" : "disabled"}><option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="loan_repayment">Loan repayment</option><option value="withdrawal">Withdrawal</option></select><small>Use Loan repayment when the member pays a loan through Treasurer cash, bank or mobile money.</small></label>
        <label><span>Payment channel</span><select id="newTransactionChannel" ${canCreate ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Amount</span><input id="newTransactionAmount" type="number" min="1" step="1" required value="10000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Receipt note</span><input id="newTransactionNarration" placeholder="Cash receipt, loan repayment note or provider reference" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit transaction</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}


function transactionRows() {
  return buildTransactionRows({
    transactions: dataRows("transactions"),
    memberName
  });
}

/**
 * @param {TerekaFinancialTransaction[]} rows
 * @returns {Array<TerekaFinancialTransaction & { receiptingAction: string, action: string, actionLabel: string, actionId?: string }>}
 */
function transactionReceiptingQueue(rows) {
  return buildTransactionReceiptingQueue(rows);
}

/**
 * @param {TerekaFinancialTransaction[]} rows
 * @returns {Array<TerekaFinancialTransaction & { receiptNo: string, receiptStatus: string, action: string, actionLabel: string, actionId?: string }>}
 */
function transactionReceiptRegister(rows) {
  return buildTransactionReceiptRegister(rows);
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
      ${rolePriorityPanel("Transaction decision checklist", [
        ["Approval", pending ? "Review member, amount, channel and narration before posting or rejecting." : "Approval action is only available while pending.", pending ? "Pending" : "Done"],
        ["Receipt", receiptReady ? "Posted transaction can generate an official receipt preview." : "Receipt becomes available after posting.", receiptReady ? "Ready" : "Waiting"],
        ["Reversal", postedOriginal ? "Enter a reason before reversing this original posted transaction." : "Reversal is only available for posted original transactions.", postedOriginal ? "Available" : "Locked"]
      ])}
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
        ${mini("Payment route", paymentRouteLabel(receipt))}
        ${mini("Amount", money.format(receipt.amount || 0))}
        ${mini("Issued at", receipt.issuedAt ? formatDateTime(receipt.issuedAt) : formatDateTime(new Date().toISOString()))}
      </div>
      <pre>${escapeHtml(receipt.printableText || "")}</pre>
    </section>
  `;
}

