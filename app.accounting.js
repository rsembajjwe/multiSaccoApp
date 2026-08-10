// Accounting, asset capture and reconciliation rendering extracted from app.js.

function expenseCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const expenseAccounts = dataRows("chartOfAccounts").filter((account) => normal(account.type) === "expense");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Expense capture</h2>
          <p>Post operating expenses into the SACCO accounting ledger.</p>
        </div>
      </div>
      ${state.expenseFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.expenseFormMessage)}</strong></div>` : ""}
      ${state.expenseFormError ? `<div class="notice warning"><strong>Expense posting failed.</strong><span>${escapeHtml(state.expenseFormError)}</span></div>` : ""}
      <form id="expenseForm" class="form-grid">
        <input type="hidden" id="newExpenseTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Expense account</span><select id="newExpenseAccountCode" ${canPost ? "" : "disabled"}>${expenseAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} - ${escapeHtml(account.name)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="newExpenseAmount" type="number" min="1" step="1" value="25000" ${canPost ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="newExpenseChannel" ${canPost ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Expense date</span><input id="newExpenseDate" type="date" value="${new Date().toISOString().slice(0, 10)}" ${canPost ? "" : "disabled"}></label>
        <label><span>Reference</span><input id="newExpenseReference" placeholder="Auto if blank" ${canPost ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><input id="newExpenseDescription" placeholder="Expense purpose" ${canPost ? "" : "disabled"}></label>
        <div class="form-actions inline">${canPost ? `<button class="button primary" type="submit">Post expense</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function assetCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const assetAccounts = dataRows("chartOfAccounts").filter((account) => normal(account.type) === "asset" && account.code !== "1310");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Fixed asset register</h2>
          <p>Register SACCO assets with depreciation inputs and acquisition journals.</p>
        </div>
      </div>
      ${state.assetFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.assetFormMessage)}</strong></div>` : ""}
      ${state.assetFormError ? `<div class="notice warning"><strong>Asset registration failed.</strong><span>${escapeHtml(state.assetFormError)}</span></div>` : ""}
      <form id="assetForm" class="form-grid">
        <input type="hidden" id="newAssetTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Asset name</span><input id="newAssetName" required placeholder="Laptop, printer, motorcycle..." ${canPost ? "" : "disabled"}></label>
        <label><span>Category</span><select id="newAssetCategory" ${canPost ? "" : "disabled"}>${assetCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Asset account</span><select id="newAssetAccountCode" ${canPost ? "" : "disabled"}>${assetAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} - ${escapeHtml(account.name)}</option>`).join("")}</select></label>
        <label><span>Cost</span><input id="newAssetCost" type="number" min="1" step="1" value="1500000" ${canPost ? "" : "disabled"}></label>
        <label><span>Salvage value</span><input id="newAssetSalvageValue" type="number" min="0" step="1" value="0" ${canPost ? "" : "disabled"}></label>
        <label><span>Useful life months</span><input id="newAssetLifeMonths" type="number" min="1" step="1" value="36" ${canPost ? "" : "disabled"}></label>
        <label><span>Purchase date</span><input id="newAssetPurchaseDate" type="date" value="${new Date().toISOString().slice(0, 10)}" ${canPost ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="newAssetChannel" ${canPost ? "" : "disabled"}><option value="bank">Bank</option><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Reference</span><input id="newAssetReference" placeholder="Auto if blank" ${canPost ? "" : "disabled"}></label>
        <label><span>Location</span><input id="newAssetLocation" placeholder="Branch or office" ${canPost ? "" : "disabled"}></label>
        <div class="form-actions inline">${canPost ? `<button class="button primary" type="submit">Register asset</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function assetCategoryOptions() {
  return ["equipment", "furniture", "vehicle", "building", "technology", "other"];
}

function accountingView() {
  const accounts = dataRows("chartOfAccounts");
  const periods = dataRows("accountingPeriods");
  const journals = dataRows("journalEntries");
  const expenses = dataRows("expenses");
  const assets = dataRows("assets");
  const unbalanced = journals.filter((journal) => journal.isBalanced === false || Number(journal.debitTotal || 0) !== Number(journal.creditTotal || 0));
  const closedPeriods = periods.filter((period) => normal(period.status) === "closed");
  const openPeriods = periods.filter((period) => normal(period.status) === "open");
  const tabs = [["capture", t("expenseAssetCapture")], ["journals", t("recentJournalEntries")], ["registers", t("expenseAssetRegisters")], ["setup", t("chartPeriods")]];
  const tab = activeModuleTab("accounting", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("chartAccounts"), accounts.length, "Ledger structure", t("open"))}
      ${summary(t("accountingPeriods"), periods.length, "Financial years", "View")}
      ${summary(t("journalEntries"), journals.length, "Posted entries", t("review"))}
      ${summary(t("unbalancedJournals"), unbalanced.length, "Must remain zero", "Investigate")}
      ${summary(t("expenses"), money.format(sum(expenses, "amount")), "Supplier and operating costs", t("open"))}
      ${summary(t("assets"), money.format(sum(assets, "netBookValue", "cost")), "Fixed asset register", "View")}
    </div>
    ${moduleTabs("accounting", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("accountingLedgerConfidence"), [
      ["Trial balance", unbalanced.length ? `${unbalanced.length} unbalanced journal entr${unbalanced.length === 1 ? "y" : "ies"} need correction.` : "All loaded journal entries are balanced.", unbalanced.length ? "Review" : "Clear"],
      ["Period control", `${openPeriods.length} open period(s), ${closedPeriods.length} closed period(s). Closed periods block ordinary postings.`, openPeriods.length ? "Open" : "Review"],
      ["Asset and expense evidence", `${expenses.length} expense record(s) and ${assets.length} asset record(s) support management reports.`, "Ready"]
    ]) : ""}
    ${tab === "capture" ? `<div class="grid two">
      ${expenseCapturePanel()}
      ${assetCapturePanel()}
    </div>` : ""}
    ${tab === "setup" ? `<div class="grid two">
      ${recordTable("Chart of accounts", accounts, ["code", "name", "type", "normalBalance"])}
      ${recordTable("Accounting periods", periods, ["name", "startDate", "endDate", "status"])}
    </div>` : ""}
    ${tab === "journals" ? recordTable("Recent journal entries", journals, ["reference", "description", "amount", "status", "postedAt"]) : ""}
    ${tab === "registers" ? `<div class="grid two">
      ${recordTable("Expenses", expenses, ["supplierId", "accountCode", "amount", "channel", "reference", "status"])}
      ${recordTable("Assets", assets, ["name", "category", "cost", "netBookValue", "location", "status"])}
    </div>` : ""}
  `;
}

function reconciliationView() {
  const callbacks = dataRows("mobileMoneyCallbacks");
  const paymentRequests = dataRows("mobileMoneyPaymentRequests");
  const reconciliation = state.data.reconciliation || {};
  const summaryData = reconciliation.summary || {};
  const matches = Array.isArray(reconciliation.matches) ? reconciliation.matches : [];
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines : [];
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines : [];
  const callbackExceptions = callbacks.filter((row) => !normal(row.status).includes("posted") || row.duplicate);
  const pendingPaymentRequests = paymentRequests.filter((row) => !normal(row.status).includes("posted"));
  const failedPaymentRequests = paymentRequests.filter((row) => ["failed", "expired", "cancelled"].includes(normal(row.status)));
  const paymentRequestRows = paymentRequestReviewRows(paymentRequests);
  const exceptionCount = Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length) + Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length) + callbackExceptions.length + pendingPaymentRequests.length;
  const tabs = [["overview", t("reconciliationControl")], ["matches", t("bankMobileMoneyMatching")], ["exceptions", t("exceptions")], ["requests", "Payment requests"], ["callbacks", t("providerCallbacks")]];
  const tab = activeModuleTab("reconciliation", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("providerCallbacks"), callbacks.length, "Mobile money events", t("open"))}
      ${summary(t("matchedRecords"), summaryData.matched ?? matches.length, money.format(summaryData.matchedAmount || 0), t("review"))}
      ${summary(t("unmatchedStatementLines"), summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length, money.format(summaryData.unmatchedStatementAmount || 0), "Investigate")}
      ${summary(t("unmatchedLedgerLines"), summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length, money.format(summaryData.unmatchedLedgerAmount || 0), "Investigate")}
      ${summary("Pending requests", pendingPaymentRequests.length, "Awaiting provider callback", "Track")}
      ${summary("Failed requests", failedPaymentRequests.length, "Closed with provider or operator exception", "Review")}
      ${summary(t("callbackExceptions"), callbackExceptions.length, "Failed or duplicate provider events", "Resolve")}
    </div>
    ${moduleTabs("reconciliation", tabs, tab)}
    ${tab === "overview" ? `
      ${reconciliationControlPanel(summaryData)}
      ${mobileMoneyCallbackOperationsPanel()}
      ${rolePriorityPanel(t("reconciliationReadinessChecks"), [
      ["Statement matching", `${summaryData.matched ?? matches.length} matched record(s) against ${summaryData.statementLines || unmatchedStatementLines.length + matches.length} statement line(s).`, Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length) ? "Review" : "Clear"],
      ["Ledger exceptions", `${summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length} ledger line(s) remain unmatched.`, Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length) ? "Investigate" : "Clear"],
      ["Payment requests", `${pendingPaymentRequests.length} mobile-money request(s) are awaiting provider callback posting.`, pendingPaymentRequests.length ? "Track" : "Clear"],
      ["Provider callbacks", `${callbackExceptions.length} callback exception(s) need provider or posting review.`, callbackExceptions.length ? "Resolve" : "Clear"],
      ["Close readiness", exceptionCount ? "Resolve reconciliation exceptions before period close or regulatory export." : "Reconciliation evidence is ready for reporting.", exceptionCount ? "Blocked" : "Ready"]
    ])}` : ""}
    ${tab === "matches" ? `<div class="grid two">
      ${recordTable("Bank and mobile-money matching", reconciliationMatchRows(matches), ["externalReference", "statementAmount", "ledgerAmount", "accountCode", "sourceType", "postedAt"])}
      ${recordTable("Provider callback exceptions", callbackExceptions, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"])}
    </div>` : ""}
    ${tab === "exceptions" ? `<div class="grid two">
      ${recordTable("Unmatched bank statement lines", unmatchedStatementLines, ["externalReference", "accountCode", "channel", "amount", "description", "statementDate"])}
      ${recordTable("Unmatched ledger lines", unmatchedLedgerLines, ["reference", "accountCode", "accountName", "sourceType", "amount", "postedAt"])}
    </div>` : ""}
    ${tab === "requests" ? `
      ${paymentRequestOperationsPanel(paymentRequests)}
      ${recordTable("Mobile-money payment request review queue", paymentRequestRows, ["externalReference", "provider", "purpose", "amount", "currencyCode", "payerPhone", "reviewStatus", "statusMessage", "requestedAt", "completedAt"])}
    ` : ""}
    ${tab === "callbacks" ? recordTable("Provider callbacks", callbacks, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"]) : ""}
  `;
}

function mobileMoneyCallbackOperationsPanel() {
  const actions = mobileMoneyOperationalRows();
  if (!actions.length) return "";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile-money callback operations</h2>
          <p>Action list for provider callbacks, pending payment requests and callback signing readiness.</p>
        </div>
        <span class="status pending">${actions.length} action(s)</span>
      </div>
      <div class="source-grid">
        ${mini("Critical", actions.filter((row) => normal(row.severity) === "critical").length)}
        ${mini("Pending requests", actions.filter((row) => normal(row.type).includes("pending request")).length)}
        ${mini("Callback exceptions", actions.filter((row) => normal(row.type).includes("callback")).length)}
        ${mini("Signing readiness", callbackSigningReadiness().status)}
      </div>
      ${recordTable("Mobile-money callback action list", actions, ["type", "provider", "reference", "severity", "status", "owner", "nextAction", "checkedAt"])}
    </section>
  `;
}

function reconciliationControlPanel(summaryData) {
  const statementTotal = Number(summaryData.statementLines || 0);
  const ledgerTotal = Number(summaryData.ledgerLines || 0);
  const matched = Number(summaryData.matched || 0);
  const coverage = Math.round((matched / Math.max(statementTotal, ledgerTotal, 1)) * 100);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Reconciliation command center</h2>
          <p>Review backend-matched bank statement lines against cash ledger lines before period close.</p>
        </div>
        <span class="status ${coverage >= 90 ? "active" : "pending"}">${coverage}% matched</span>
      </div>
      <div class="source-grid">
        ${mini("Statement lines", statementTotal)}
        ${mini("Cash ledger lines", ledgerTotal)}
        ${mini("Matched lines", matched)}
        ${mini("Unmatched statement amount", money.format(summaryData.unmatchedStatementAmount || 0))}
        ${mini("Unmatched ledger amount", money.format(summaryData.unmatchedLedgerAmount || 0))}
        ${mini("Matched amount", money.format(summaryData.matchedAmount || 0))}
      </div>
    </section>
  `;
}

function paymentRequestOperationsPanel(requests) {
  const rows = requests || [];
  const terminalStatuses = new Set(["posted", "failed", "expired", "cancelled"]);
  const actionable = rows.filter((row) => !terminalStatuses.has(normal(row.status)));
  const selected = rows.find((row) => row.id === state.selectedPaymentRequestId) || actionable[0] || rows[0];
  if (!rows.length) {
    return emptyState("No payment requests yet", "Member mobile-money requests will appear here after they are initiated from the member portal.");
  }
  const canManage = hasPermission("accounting:post");
  const selectedOpen = selected && !terminalStatuses.has(normal(selected.status));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Payment request operations</h2>
          <p>Track member-initiated mobile-money requests and close stale provider prompts with audit-ready statuses.</p>
        </div>
        <span class="status ${actionable.length ? "pending" : "active"}">${actionable.length ? `${actionable.length} open` : "All closed"}</span>
      </div>
      ${state.paymentRequestStatusMessage ? `<div class="notice success">${escapeHtml(state.paymentRequestStatusMessage)}</div>` : ""}
      ${state.paymentRequestStatusError ? `<div class="notice warning">${escapeHtml(state.paymentRequestStatusError)}</div>` : ""}
      <div class="form-grid">
        <label>
          <span>Request</span>
          <select id="paymentRequestSelect" ${canManage ? "" : "disabled"}>
            ${rows.map((row) => `<option value="${escapeHtml(row.id)}" ${selected?.id === row.id ? "selected" : ""}>${escapeHtml(row.externalReference || row.id)} - ${escapeHtml(labelize(row.status || "pending"))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status note</span>
          <input id="paymentRequestReason" value="${escapeHtml(state.paymentRequestStatusReason)}" placeholder="Reason for status update">
        </label>
      </div>
      ${selected ? `<div class="source-grid compact">
        ${mini("Selected request", selected.externalReference || selected.id)}
        ${mini("Member", selected.memberIdentifier || selected.memberId)}
        ${mini("Amount", money.format(selected.amount || 0))}
        ${mini("Phone", selected.payerPhone || t("none"))}
        ${mini("Status", labelize(selected.status || "pending"))}
        ${mini("Provider note", selected.statusMessage || "No provider note")}
        ${mini("Requested", formatDateTime(selected.requestedAt))}
      </div>` : ""}
      <div class="action-row">
        <button class="button primary" type="button" data-payment-provider-status="${escapeHtml(selected?.id || "")}" ${selectedOpen ? "" : "disabled"}>Check provider status</button>
        <button class="button secondary" type="button" data-payment-request-status="failed" ${canManage && selectedOpen ? "" : "disabled"}>Mark failed</button>
        <button class="button secondary" type="button" data-payment-request-status="expired" ${canManage && selectedOpen ? "" : "disabled"}>Mark expired</button>
        <button class="button danger" type="button" data-payment-request-status="cancelled" ${canManage && selectedOpen ? "" : "disabled"}>Cancel request</button>
      </div>
      ${canManage ? "" : `<p class="muted-note">Only users with posting rights can change payment request status.</p>`}
    </section>
  `;
}

function paymentRequestReviewRows(requests) {
  const terminalStatuses = new Set(["posted", "failed", "expired", "cancelled"]);
  return (requests || []).map((row) => {
    const status = normal(row.status);
    const open = !terminalStatuses.has(status);
    const providerIssue = normal(row.statusMessage).includes("provider status check failed");
    return {
      ...row,
      reviewStatus: providerIssue ? "Provider check failed" : open ? "Needs provider check" : labelize(row.status || "closed"),
      action: open ? "payment-provider-status" : "none",
      actionLabel: open ? "Check status" : "Closed",
      actionId: row.id
    };
  });
}

function reconciliationMatchRows(matches) {
  return (matches || []).map((match) => ({
    externalReference: match.statementLine?.externalReference || match.ledgerLine?.reference,
    statementAmount: match.statementLine?.amount,
    ledgerAmount: match.ledgerLine?.amount,
    accountCode: match.statementLine?.accountCode || match.ledgerLine?.accountCode,
    sourceType: match.ledgerLine?.sourceType,
    postedAt: match.ledgerLine?.postedAt || match.statementLine?.statementDate
  }));
}

