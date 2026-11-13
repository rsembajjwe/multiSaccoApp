function transactionsView() {
  if (isPlatform()) return platformTransactionsView();
  const cycle = currentSaccoCycleContext();
  const rows = transactionRows(cycle);
  const overview = buildTransactionOverviewSummary(rows);
  const receiptingQueue = buildTransactionReceiptingQueue(rows);
  const receiptRegister = buildTransactionReceiptRegister(rows);
  const tabs = [["overview", "Overview"], ["capture", t("newTransactionScreen")], ["savings-import", "Savings import"], ["receipting", "Receipting queue"], ["receipts", "Receipt register"], ["list", t("transactionList")], ["detail", t("transactionDetail")]];
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
    ${tab === "savings-import" ? savingsImportPanel() : ""}
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

function savingsImportPanel() {
  const result = state.savingsImportResult;
  return `
    <section class="panel savings-import-panel">
      <div class="panel-heading">
        <div><h2>Bulk savings deposits</h2><p>Validate a CSV file, then create pending savings transactions for checker approval.</p></div>
        <button class="button secondary" type="button" data-action="download-savings-template">Download template</button>
      </div>
      ${state.savingsImportMessage ? `<div class="notice compact"><strong>${escapeHtml(state.savingsImportMessage)}</strong></div>` : ""}
      ${state.savingsImportError ? `<div class="notice warning"><strong>Import validation failed.</strong><span>${escapeHtml(state.savingsImportError)}</span></div>` : ""}
      <label class="savings-import-input"><span>CSV data</span><textarea id="savingsImportCsv" rows="12" placeholder="membershipNo,amount,postingDate,reference,channel,narration\nGREE-0001,50000,2026-09-15,SAV-0001,cash,September savings">${escapeHtml(state.savingsImportCsv || "")}</textarea></label>
      <div class="form-actions inline"><button class="button secondary" type="button" data-action="validate-savings-import">Validate</button><button class="button primary" type="button" data-action="import-savings-deposits">Import pending deposits</button></div>
      ${result ? `<section class="savings-import-result"><strong>${result.valid ? "Validation passed" : "Validation needs attention"}</strong><span>${result.totalRows || 0} row(s), ${result.createdCount || 0} created, ${result.errors?.length || 0} error(s).</span>${result.errors?.length ? `<ul>${result.errors.map((error) => `<li>Row ${escapeHtml(String(error.row))}, ${escapeHtml(error.field)}: ${escapeHtml(error.message)}</li>`).join("")}</ul>` : ""}</section>` : ""}
    </section>
  `;
}

function platformTransactionsView() {
  const subscriptions = platformSubscriptionTransactionRows();
  const payments = platformSubscriptionPaymentRows();
  const rows = filterPlatformSubscriptionPayments(payments);
  const tabs = [["capture", "New Transaction"], ["list", "Transaction List"], ["detail", "Transaction Details"]];
  const tab = activeModuleTab("transactions", tabs);
  const paidTotal = payments.reduce((total, row) => total + Number(row.amount || 0), 0);
  const dueTotal = subscriptions.reduce((total, row) => total + Number(row.balanceDue || 0), 0);
  return `
    <section class="module-intro platform-transactions-hero"><div class="platform-transactions-icon" aria-hidden="true">⇄</div><div><p class="eyebrow">Platform billing</p><h2>Transactions</h2><p>Capture payments, track platform–SACCO transactions and monitor balances.</p></div></section>
    <div class="dashboard-grid platform-transaction-kpis">
      ${summary("Platform-SACCO transactions", payments.length, "Total recorded payments", t("review"))}
      ${summary("Outstanding", money.format(dueTotal), "Due from SACCOs", "Follow up")}
      ${summary("Confirmed", money.format(paidTotal), "Received from SACCOs", t("receipts"))}
    </div>
    ${moduleTabs("transactions", tabs, tab)}
    ${tab === "capture" ? platformTransactionFormPanel(subscriptions) : ""}
    ${tab === "detail" ? (platformTransactionDetailPanel(payments) || emptyState("Transaction details", "Select a platform-SACCO payment from the transaction list to review its evidence.")) : ""}
    ${tab === "list" ? `
      ${platformTransactionListFilters()}
      ${recordTable("Platform-SACCO transaction list", rows, ["receivedAt", "tenantName", "invoice", "packageName", "channel", "amount", "externalReference", "verificationStatus", "recordedBy"])}
    ` : ""}
  `;
}

function platformSubscriptionPaymentRows() {
  const subscriptions = dataRows("subscriptions");
  const tenants = tenantRows();
  const users = dataRows("users");
  return dataRows("subscriptionPayments").map((payment) => {
    const subscription = subscriptions.find((item) => item.id === payment.subscriptionId) || {};
    const tenant = tenants.find((item) => item.id === payment.tenantId) || {};
    const recorder = users.find((item) => item.id === payment.recordedByUserId) || {};
    const channel = normal(payment.channel || "manual");
    return {
      ...payment,
      tenantName: tenant.name || payment.tenantId,
      saccoCode: tenant.abbreviation || tenant.code || payment.tenantId,
      invoice: subscription.invoice || subscription.id || payment.subscriptionId,
      packageName: subscription.tierLabel || subscription.packageName || subscription.packageId || "Standard",
      status: "confirmed",
      verificationStatus: channel === "mobile_money" ? "Provider confirmed" : channel === "bank" ? "Reference recorded" : "Officer recorded",
      receiptNo: `SUB-RCT-${String(payment.id || "").slice(-8).toUpperCase()}`,
      recordedBy: recorder.fullName || recorder.name || recorder.email || payment.recordedByUserId || "System",
      action: "platform-transaction-detail",
      actionLabel: "View",
      actionId: payment.id
    };
  }).sort((a, b) => String(b.receivedAt || b.createdAt || "").localeCompare(String(a.receivedAt || a.createdAt || "")));
}

function filterPlatformSubscriptionPayments(rows) {
  const search = normal(state.platformTransactionSearch || "");
  const from = state.platformTransactionDateFrom ? new Date(`${state.platformTransactionDateFrom}T00:00:00`).getTime() : null;
  const to = state.platformTransactionDateTo ? new Date(`${state.platformTransactionDateTo}T23:59:59`).getTime() : null;
  return rows.filter((row) => {
    const timestamp = new Date(row.receivedAt || row.createdAt || "").getTime();
    const searchMatch = !search || normal(`${row.tenantName} ${row.saccoCode} ${row.invoice} ${row.externalReference} ${row.packageName} ${row.recordedBy}`).includes(search);
    return searchMatch
      && (!state.platformTransactionTenant || row.tenantId === state.platformTransactionTenant)
      && (!state.platformTransactionChannel || normal(row.channel) === state.platformTransactionChannel)
      && (!state.platformTransactionStatus || normal(row.status) === state.platformTransactionStatus)
      && (from === null || timestamp >= from)
      && (to === null || timestamp <= to);
  });
}

function platformTransactionListFilters() {
  return `<section class="panel compact-panel"><form id="platformTransactionFilters" class="platform-transaction-filters">
    <label><span>Search</span><input id="platformTransactionSearch" value="${escapeHtml(state.platformTransactionSearch || "")}" placeholder="SACCO, invoice or reference"></label>
    <label><span>From</span><input id="platformTransactionDateFrom" type="date" value="${escapeHtml(state.platformTransactionDateFrom || "")}"></label><label><span>To</span><input id="platformTransactionDateTo" type="date" value="${escapeHtml(state.platformTransactionDateTo || "")}"></label>
    <label><span>SACCO</span><select id="platformTransactionTenant"><option value="">All SACCOs</option>${tenantRows().map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${state.platformTransactionTenant === tenant.id ? "selected" : ""}>${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
    <label><span>Channel</span><select id="platformTransactionChannel"><option value="">All channels</option>${["manual","cash","bank","mobile_money"].map((channel) => `<option value="${channel}" ${state.platformTransactionChannel === channel ? "selected" : ""}>${escapeHtml(labelize(channel))}</option>`).join("")}</select></label>
    <label><span>Status</span><select id="platformTransactionStatus"><option value="">All statuses</option><option value="confirmed" ${state.platformTransactionStatus === "confirmed" ? "selected" : ""}>Confirmed</option></select></label>
    <div class="filter-toolbar-actions"><button class="button primary" type="submit">Apply</button><button class="button ghost" type="button" data-action="clear-platform-transaction-filters">Clear</button><button class="button secondary" type="button" data-action="export-platform-transactions">Export</button></div>
  </form></section>`;
}

function exportPlatformTransactions() {
  const rows = filterPlatformSubscriptionPayments(platformSubscriptionPaymentRows());
  const headers = ["Received", "SACCO", "Invoice", "Package", "Channel", "Amount", "External Reference", "Verification", "Recorded By"];
  const csvRows = rows.map((row) => [row.receivedAt || row.createdAt, row.tenantName, row.invoice, row.packageName, row.channel, row.amount, row.externalReference, row.verificationStatus, row.recordedBy]);
  const csv = [headers, ...csvRows].map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  downloadClientFile(`platform-sacco-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}

function platformPaymentApprovalsView() {
  const tab = state.platformPaymentApprovalTab || "pending";
  const sourceRows = tab === "processed" ? dataRows("platformPaymentApprovalProcessed") : dataRows("platformPaymentApprovalQueue");
  const summaryData = state.data.platformPaymentApprovalSummary || {};
  const page = state.pageMeta.platformPaymentApprovalQueue || {};
  const pageNumber = Number(page.number || 0);
  const totalPages = Number(page.totalPages || 0);
  const canDecide = Boolean(summaryData.canDecide) && hasPermission("transactions:approve");
  const oldest = summaryData.oldestCreatedAt
    ? platformPaymentApprovalAge(summaryData.oldestCreatedAt)
    : "Queue clear";
  const tenants = tenantRows();
  const tenantMap = new Map(tenants.map((tenant) => [String(tenant.id), tenant]));
  const rows = sourceRows.filter((transaction) => {
    const amount = Number(transaction.amount || 0);
    const amountMatch = !state.platformPaymentApprovalAmount
      || (state.platformPaymentApprovalAmount === "under_100000" && amount < 100000)
      || (state.platformPaymentApprovalAmount === "100000_500000" && amount >= 100000 && amount <= 500000)
      || (state.platformPaymentApprovalAmount === "over_500000" && amount > 500000);
    return amountMatch && (!state.platformPaymentApprovalTenant || transaction.tenantId === state.platformPaymentApprovalTenant);
  });
  const selected = sourceRows.find((transaction) => transaction.id === state.selectedPaymentApprovalId);
  return `
    <section class="module-intro payment-approvals-hero">
      <div class="payment-approvals-hero-icon" aria-hidden="true">▤</div>
      <div><p class="eyebrow">Financial operations</p><h2>Payment Approvals</h2><p>Manage and authorize member and non-cash payments across all SACCOs.</p></div>
    </section>
    <div class="dashboard-grid fleet-approval-kpis payment-approval-kpis">
      ${summary("Pending Approvals", Number(summaryData.pendingCount || 0).toLocaleString(), "Awaiting your action", "Queue")}
      ${summary("Mobile Money", Number(summaryData.mobileMoneyCount || 0).toLocaleString(), "Provider-confirmed payments", "Reconcile")}
      ${summary("Ready for me", Number(summaryData.readyForCurrentUserCount || 0).toLocaleString(), "Excludes transactions you created", "Decide")}
      ${summary("Pending value", money.format(summaryData.pendingAmount || 0), "Not yet credited", "Control")}
      ${summary("Oldest item", oldest, "Oldest-first processing", "Priority")}
    </div>
    ${state.platformPaymentApprovalMessage ? `<div class="notice compact"><strong>${escapeHtml(state.platformPaymentApprovalMessage)}</strong></div>` : ""}
    ${state.platformPaymentApprovalError ? `<div class="notice warning"><strong>Payment decision failed.</strong><span>${escapeHtml(state.platformPaymentApprovalError)}</span></div>` : ""}
    <section class="panel fleet-approval-inbox payment-approval-inbox">
      <div class="payment-approval-tabs" role="tablist">
        <button type="button" class="${tab === "pending" ? "active" : ""}" data-payment-approval-tab="pending">Pending <span>${Number(summaryData.pendingCount || 0)}</span></button>
        <button type="button" class="${tab === "processed" ? "active" : ""}" data-payment-approval-tab="processed">Processed</button>
      </div>
      <form id="platformPaymentApprovalFilters" class="approval-inbox-toolbar payment-approval-toolbar">
        <label><span>Search</span><input id="platformPaymentApprovalSearch" value="${escapeHtml(state.platformPaymentApprovalSearch || "")}" placeholder="SACCO, member, payment or reference" autocomplete="off"></label>
        <label><span>Channel</span><select id="platformPaymentApprovalChannel"><option value="">All channels</option>${[["mobile_money", "Mobile money"], ["bank", "Bank"], ["cash", "Cash"], ["payroll_deduction", "Payroll deduction"]].map(([value, label]) => `<option value="${value}" ${state.platformPaymentApprovalChannel === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>Amount</span><select id="platformPaymentApprovalAmount"><option value="">All amounts</option><option value="under_100000" ${state.platformPaymentApprovalAmount === "under_100000" ? "selected" : ""}>Under UGX 100,000</option><option value="100000_500000" ${state.platformPaymentApprovalAmount === "100000_500000" ? "selected" : ""}>UGX 100,000–500,000</option><option value="over_500000" ${state.platformPaymentApprovalAmount === "over_500000" ? "selected" : ""}>Over UGX 500,000</option></select></label>
        <label><span>SACCO</span><select id="platformPaymentApprovalTenant"><option value="">All SACCOs</option>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${state.platformPaymentApprovalTenant === tenant.id ? "selected" : ""}>${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        <div class="filter-toolbar-actions"><button class="button ghost" type="button" data-action="clear-payment-approval-filters">Clear</button><button class="button primary" type="submit">Apply filters</button></div>
      </form>
      <div class="table-wrap"><table class="fleet-approval-table payment-approval-table"><thead><tr><th>#</th><th>Organization (SACCO)</th><th>Member</th><th>Payment</th><th>Amount</th><th>Reference</th><th>${tab === "pending" ? "Requested on" : "Processed on"}</th><th>${tab === "pending" ? "Waiting" : "Status"}</th><th>Actions</th></tr></thead><tbody>
        ${rows.map((transaction) => {
          const ownTransaction = String(transaction.makerUserId || "") === String(state.user?.id || "");
          const tenant = tenantMap.get(String(transaction.tenantId)) || {};
          return `<tr><td>${rows.indexOf(transaction) + 1}</td><td><strong>${escapeHtml(transaction.tenantName || tenant.name || transaction.tenantId || "-")}</strong><small>${escapeHtml(transaction.tenantCode || tenant.abbreviation || transaction.tenantId || "")}</small></td><td><strong>${escapeHtml(transaction.memberName || transaction.memberId || "-")}</strong><small>${escapeHtml(transaction.membershipNo || transaction.memberId || "")}</small></td><td><strong>${escapeHtml(labelize(transaction.type || "payment"))}</strong><small>${escapeHtml(labelize(transaction.channel || "-"))}</small></td><td><strong>${money.format(transaction.amount || 0)}</strong></td><td><strong>${escapeHtml(transaction.reference || "-")}</strong><small>${escapeHtml(transaction.narration || "")}</small></td><td>${escapeHtml(formatDateTime(tab === "pending" ? transaction.createdAt : transaction.updatedAt))}</td><td>${tab === "pending" ? `<span class="approval-sla ${platformPaymentApprovalAgeClass(transaction.createdAt)}"><strong>${escapeHtml(platformPaymentApprovalAge(transaction.createdAt))}</strong></span>` : `<span class="status ${normal(transaction.status) === "posted" ? "active" : "suspended"}">${escapeHtml(labelize(transaction.status))}</span>`}</td><td>${tab === "pending" ? `<button class="table-action primary" type="button" data-review-payment-approval="${escapeHtml(transaction.id)}">Review</button>${ownTransaction ? `<small>Maker-checker required</small>` : ""}` : `<button class="table-action" type="button" data-review-payment-approval="${escapeHtml(transaction.id)}">View</button>`}</td></tr>`;
        }).join("") || `<tr><td colspan="9"><div class="empty-state compact"><strong>No payments in this view</strong><span>${tab === "pending" ? "The approval queue is clear" : "No processed payments match"} the selected filters.</span></div></td></tr>`}
      </tbody></table></div>
      <footer class="approval-inbox-pager"><span>Page ${pageNumber + 1}${totalPages ? ` of ${totalPages}` : ""} · ${Number(page.totalElements || rows.length).toLocaleString()} matching</span><div><button class="table-action" type="button" data-payment-approval-page="${pageNumber - 1}" ${pageNumber <= 0 ? "disabled" : ""}>Previous</button><button class="table-action" type="button" data-payment-approval-page="${pageNumber + 1}" ${!totalPages || pageNumber + 1 >= totalPages ? "disabled" : ""}>Next</button></div></footer>
    </section>
    ${selected ? platformPaymentApprovalReview(selected, canDecide) : ""}`;
}

function platformPaymentApprovalReview(transaction, canDecide) {
  const pending = normal(transaction.status) === "pending_approval";
  const ownTransaction = String(transaction.makerUserId || "") === String(state.user?.id || "");
  const mobileMoney = normal(transaction.channel) === "mobile_money";
  const referencePresent = Boolean(String(transaction.reference || "").trim());
  const decisionAllowed = pending && canDecide && !ownTransaction;
  return `<section class="panel payment-approval-review" aria-label="Payment approval review">
    <div class="panel-heading"><div><p class="eyebrow">Payment evidence</p><h2>${escapeHtml(transaction.reference || transaction.id)}</h2><p>Verify the request, supporting reference and control checks before recording a decision.</p></div><button class="table-action" type="button" data-action="close-payment-approval-review">Close</button></div>
    <div class="payment-review-grid">
      <div class="payment-review-summary">${mini("SACCO", transaction.tenantName || transaction.tenantId || "-")}${mini("Member", transaction.memberName || transaction.memberId || "-")}${mini("Payment", labelize(transaction.type || "payment"))}${mini("Amount", money.format(transaction.amount || 0))}${mini("Channel", labelize(transaction.channel || "-"))}${mini("Submitted", formatDateTime(transaction.createdAt))}</div>
      <div class="payment-control-checks"><h3>Control checks</h3><p class="${pending ? "passed" : "recorded"}"><strong>Status:</strong> ${pending ? "Pending decision" : labelize(transaction.status)}</p><p class="${ownTransaction ? "blocked" : "passed"}"><strong>Maker-checker:</strong> ${ownTransaction ? "A different authorized operator must decide" : "Decision maker is independent"}</p><p class="${referencePresent ? "passed" : "blocked"}"><strong>Supporting reference:</strong> ${referencePresent ? escapeHtml(transaction.reference) : "Missing"}</p><p class="${mobileMoney ? "passed" : "recorded"}"><strong>Provider reconciliation:</strong> ${mobileMoney ? "Submitted through the provider-confirmed approval queue" : "Not required for this channel"}</p></div>
    </div>
    <div class="payment-review-narration"><strong>Purpose / evidence note</strong><p>${escapeHtml(transaction.narration || "No additional narration supplied.")}</p></div>
    ${transaction.rejectionReason ? `<div class="notice warning"><strong>Decision reason</strong><span>${escapeHtml(transaction.rejectionReason)}</span></div>` : ""}
    <div class="form-actions inline">${decisionAllowed ? `<button class="button primary" type="button" data-payment-decision="posted" data-transaction-id="${escapeHtml(transaction.id)}">Approve and post</button><button class="button danger" type="button" data-payment-decision="rejected" data-transaction-id="${escapeHtml(transaction.id)}">Reject payment</button>` : `<span class="status ${pending ? "pending" : "active"}">${pending ? (ownTransaction ? "Maker-checker separation enforced" : "Read-only review") : "Decision recorded in audit trail"}</span>`}</div>
  </section>`;
}

function platformPaymentApprovalAge(createdAt) {
  const created = new Date(createdAt || "").getTime();
  if (!Number.isFinite(created)) return "Age unavailable";
  const hours = Math.max(0, (Date.now() - created) / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(hours * 60))} min`;
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
}

function platformPaymentApprovalAgeClass(createdAt) {
  const created = new Date(createdAt || "").getTime();
  if (!Number.isFinite(created)) return "within_sla";
  const hours = (Date.now() - created) / 3600000;
  return hours >= 24 ? "breached" : hours >= 4 ? "due_soon" : "within_sla";
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
    <section class="panel platform-transaction-form-panel">
      <div class="panel-heading">
        <div>
          <h2>Record platform-SACCO transaction</h2>
          <p>Capture subscription, renewal or service payments between the platform and a SACCO. These are not SACCO member transactions.</p>
        </div>
      </div>
      ${state.platformTransactionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.platformTransactionMessage)}</strong></div>` : ""}
      ${state.platformTransactionError ? `<div class="notice warning"><strong>Transaction failed.</strong><span>${escapeHtml(state.platformTransactionError)}</span></div>` : ""}
      <form id="subscriptionPaymentForm" class="form-grid platform-transaction-form">
        <label>
          <span>SACCO</span>
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
        <label id="subscriptionPaymentProviderWrap" class="hidden"><span>Mobile-money network</span><select id="subscriptionPaymentProvider" ${canManage ? "" : "disabled"}><option value="mtn">MTN MoMo</option><option value="airtel">Airtel Money</option></select></label>
        <label id="subscriptionPaymentPhoneWrap" class="hidden"><span>Mobile number</span><input id="subscriptionPaymentPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0772 123 456" ${canManage ? "" : "disabled"}></label>
        <label><span>External reference</span><input id="subscriptionPaymentReference" placeholder="Bank slip, mobile money or manual reference" ${canManage ? "" : "disabled"}></label>
        <input id="subscriptionPaymentMode" type="hidden" value="group">
        <input id="subscriptionPaymentMemberSlots" type="hidden" value="">
        <div class="source-grid wide platform-invoice-summary">
          ${mini("SACCO", selected.tenantName || selected.tenantId)}
          ${mini("Invoice", selected.invoice || selected.id)}
          ${mini("Package", selected.packageName || selected.packageId)}
          ${mini("Balance due", money.format(due))}
        </div>
        <div class="form-actions inline"><button class="button ghost" type="reset" data-action="clear-platform-transaction-form">Clear</button>${canManage ? `<button class="button primary" type="submit">Record payment</button>` : `<span class="status pending">View only</span>`}</div>
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
  state.selectedPlatformTransactionId = subscriptionId;
  state.moduleTabs.transactions = "detail";
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  renderShell();
}

function platformTransactionDetailPanel(rows) {
  const row = rows.find((item) => item.id === state.selectedPlatformTransactionId);
  if (!row) return "";
  const related = rows.filter((item) => item.subscriptionId === row.subscriptionId);
  return `<section class="panel platform-transaction-detail-panel"><div class="panel-heading"><div><p class="eyebrow">Payment evidence</p><h2>${escapeHtml(row.externalReference || row.receiptNo)}</h2><p>${escapeHtml(row.tenantName)} · ${escapeHtml(row.invoice)}</p></div><span class="status active">${escapeHtml(row.verificationStatus)}</span></div>
    <div class="source-grid">${mini("SACCO", row.tenantName)}${mini("Package", row.packageName)}${mini("Amount", money.format(row.amount || 0))}${mini("Channel", labelize(row.channel))}${mini("Received", formatDateTime(row.receivedAt || row.createdAt))}${mini("Recorded by", row.recordedBy)}</div>
    <div class="transaction-evidence-grid"><div><h3>Verification and receipt</h3><p><strong>Status:</strong> ${escapeHtml(row.verificationStatus)}</p><p><strong>External reference:</strong> ${escapeHtml(row.externalReference || "Not supplied")}</p><p><strong>Receipt:</strong> ${escapeHtml(row.receiptNo)}</p><p><strong>Approval:</strong> Authorized platform recorder</p></div><div><h3>Payment history</h3><ul class="activity-list">${related.map((payment) => `<li><strong>${escapeHtml(money.format(payment.amount || 0))} · ${escapeHtml(labelize(payment.channel))}</strong><span>${escapeHtml(payment.externalReference || payment.receiptNo)}</span><em>${escapeHtml(formatDateTime(payment.receivedAt || payment.createdAt))}</em></li>`).join("")}</ul></div></div>
  </section>`;
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
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">${paymentOnly ? "Initiate / post transaction" : "Submit transaction"}</button>` : `<span class="status pending">View only</span>`}</div>
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


function transactionRows() {
  const cycle = arguments.length ? arguments[0] : null;
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
