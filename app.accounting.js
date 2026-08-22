// Accounting, asset capture and reconciliation rendering extracted from app.js.

function expenseCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const expenseAccounts = accountingAccountOptions(dataRows("chartOfAccounts"), "expense");
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
        <label><span>Expense account</span><select id="newExpenseAccountCode" ${canPost ? "" : "disabled"}>${expenseAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.label)}</option>`).join("")}</select></label>
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
  const assetAccounts = accountingAccountOptions(dataRows("chartOfAccounts"), "asset", ["1310"]);
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
        <label><span>Asset account</span><select id="newAssetAccountCode" ${canPost ? "" : "disabled"}>${assetAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.label)}</option>`).join("")}</select></label>
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

function accountingView() {
  const cycle = currentSaccoCycleContext();
  const accounts = dataRows("chartOfAccounts");
  const periods = dataRows("accountingPeriods");
  const journals = filterJournalsBySaccoCycle(dataRows("journalEntries"), cycle);
  const expenses = filterExpensesBySaccoCycle(dataRows("expenses"), cycle);
  const assets = filterAssetsBySaccoCycle(dataRows("assets"), cycle);
  const accounting = buildAccountingSummary({ accounts, periods, journals, expenses, assets });
  const tabs = [["overview", "Overview"], ["capture", t("expenseAssetCapture")], ["setup", t("chartPeriods")], ["journals", t("recentJournalEntries")], ["statements", "Financial statements"], ["registers", t("expenseAssetRegisters")]];
  const tab = activeModuleTab("accounting", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Accounting cycle" })}
    <div class="dashboard-grid">
      ${summary(t("chartAccounts"), accounting.accountCount, "Ledger structure", t("open"))}
      ${summary(t("accountingPeriods"), accounting.periodCount, "Financial years", "View")}
      ${summary(t("journalEntries"), accounting.journalCount, "Posted entries", t("review"))}
      ${summary(t("unbalancedJournals"), accounting.unbalancedCount, "Must remain zero", "Investigate")}
      ${summary(t("expenses"), money.format(accounting.expenseTotal), "Supplier and operating costs", t("open"))}
      ${summary(t("assets"), money.format(accounting.assetTotal), "Fixed asset register", "View")}
    </div>
    ${moduleTabs("accounting", tabs, tab)}
    ${tab === "overview" ? accountingControlPanel(t("accountingLedgerConfidence"), "Review ledger balance, period control, expenses and assets before reporting.", [
      ["Trial balance", accounting.unbalancedCount ? `${accounting.unbalancedCount} unbalanced journal entr${accounting.unbalancedCount === 1 ? "y" : "ies"} need correction.` : "All loaded journal entries are balanced.", accounting.unbalancedCount ? "Review" : "Clear"],
      ["Period control", `${accounting.openPeriods} open period(s), ${accounting.closedPeriods} closed period(s). Closed periods block ordinary postings.`, accounting.openPeriods ? "Open" : "Review"],
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
    ${tab === "journals" ? recordTable(`Recent journal entries - ${cycle.label}`, journals, ["reference", "description", "amount", "status", "postedAt"]) : ""}
    ${tab === "statements" ? financialStatementsPanels(journals, accounts) : ""}
    ${tab === "registers" ? `<div class="grid two">
      ${recordTable(`Expenses - ${cycle.label}`, expenses, ["supplierId", "accountCode", "amount", "channel", "reference", "status"])}
      ${recordTable(`Assets - ${cycle.label}`, assets, ["name", "category", "cost", "netBookValue", "location", "status"])}
    </div>` : ""}
  `;
}

function reconciliationView() {
  const cycle = currentSaccoCycleContext();
  const callbacks = filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle);
  const paymentRequests = filterPaymentRequestsBySaccoCycle(dataRows("mobileMoneyPaymentRequests"), cycle);
  const review = buildReconciliationReviewModel({
    callbacks,
    paymentRequests,
    reconciliation: state.data.reconciliation,
    labelize
  });
  const { summaryData, matches, unmatchedStatementLines, unmatchedLedgerLines, callbackExceptions, pendingPaymentRequests, failedPaymentRequests, paymentRequestRows, exceptionCount } = review;
  const tabs = [["overview", t("reconciliationControl")], ["matches", t("bankMobileMoneyMatching")], ["exceptions", t("exceptions")], ["requests", "Payment requests"], ["callbacks", t("providerCallbacks")]];
  const tab = activeModuleTab("reconciliation", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Reconciliation cycle" })}
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
      ${accountingControlPanel(t("reconciliationReadinessChecks"), "Check matching, ledger exceptions, payment requests and callback evidence before closing.", [
      ["Statement matching", `${summaryData.matched ?? matches.length} matched record(s) against ${summaryData.statementLines || unmatchedStatementLines.length + matches.length} statement line(s).`, Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length) ? "Review" : "Clear"],
      ["Ledger exceptions", `${summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length} ledger line(s) remain unmatched.`, Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length) ? "Investigate" : "Clear"],
      ["Payment requests", `${pendingPaymentRequests.length} mobile-money request(s) are awaiting provider callback posting.`, pendingPaymentRequests.length ? "Track" : "Clear"],
      ["Provider callbacks", `${callbackExceptions.length} callback exception(s) need provider or posting review.`, callbackExceptions.length ? "Resolve" : "Clear"],
      ["Close readiness", exceptionCount ? "Resolve reconciliation exceptions before period close or regulatory export." : "Reconciliation evidence is ready for reporting.", exceptionCount ? "Blocked" : "Ready"]
    ])}` : ""}
    ${tab === "matches" ? `<div class="grid two">
      ${recordTable("Bank and mobile-money matching", buildReconciliationMatchRows(matches), ["externalReference", "statementAmount", "ledgerAmount", "accountCode", "sourceType", "postedAt"])}
      ${recordTable("Provider callback exceptions", callbackExceptions, ["externalReference", "provider", "purpose", "amount", "suggestedCollectionAccount", "collectionAccount", "resourceType", "status", "receivedAt"])}
    </div>` : ""}
    ${tab === "exceptions" ? `
      ${collectionAttributionPanel(unmatchedStatementLines)}
      <div class="grid two">
      ${recordTable("Unmatched bank statement lines", unmatchedStatementLines, ["externalReference", "accountCode", "channel", "amount", "suggestedCollectionAccount", "collectionAccount", "description", "statementDate"])}
      ${recordTable("Unmatched ledger lines", unmatchedLedgerLines, ["reference", "accountCode", "accountName", "sourceType", "amount", "postedAt"])}
      </div>` : ""}
    ${tab === "requests" ? `
      ${paymentRequestOperationsPanel(paymentRequests)}
      ${recordTable(`Mobile-money payment request review queue - ${cycle.label}`, paymentRequestRows, ["externalReference", "provider", "purpose", "amount", "currencyCode", "payerPhone", "reviewStatus", "statusMessage", "requestedAt", "completedAt"])}
    ` : ""}
    ${tab === "callbacks" ? `
      ${callbackAttributionPanel(callbacks)}
      ${recordTable(`Provider callbacks - ${cycle.label}`, callbacks, ["externalReference", "provider", "purpose", "amount", "suggestedCollectionAccount", "collectionAccount", "resourceType", "status", "receivedAt"])}
    ` : ""}
  `;
}

function financialStatementsPanels(journals, accounts) {
  const trial = buildTrialBalance(journals, accounts);
  const income = buildIncomeStatement(journals, accounts);
  const balance = buildBalanceSheet(journals, accounts);
  const badge = (ok) => `<span class="status ${ok ? "active" : "pending"}">${ok ? "Balanced" : "Out of balance"}</span>`;
  const money0 = (value) => money.format(value || 0);
  const itemRows = (items) => items.map((item) => `<tr><td>${escapeHtml(item.code || "")}</td><td>${escapeHtml(item.name)}</td><td class="amount">${money0(item.amount)}</td></tr>`).join("");
  const totalRow = (label, value) => `<tr class="total-row"><td></td><td><strong>${escapeHtml(label)}</strong></td><td class="amount"><strong>${money0(value)}</strong></td></tr>`;
  return `
    <div class="grid two">
      <section class="panel">
        <div class="panel-heading"><div><h2>Trial balance</h2><p>Net posted balances per ledger account.</p></div>${badge(trial.balanced)}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Code</th><th>Account</th><th class="amount">Debit</th><th class="amount">Credit</th></tr></thead>
          <tbody>
            ${trial.rows.length ? trial.rows.map((row) => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td class="amount">${row.debit ? money0(row.debit) : ""}</td><td class="amount">${row.credit ? money0(row.credit) : ""}</td></tr>`).join("") : `<tr><td colspan="4">No posted journal entries yet.</td></tr>`}
            <tr class="total-row"><td></td><td><strong>Totals</strong></td><td class="amount"><strong>${money0(trial.totalDebit)}</strong></td><td class="amount"><strong>${money0(trial.totalCredit)}</strong></td></tr>
          </tbody>
        </table></div>
      </section>
      <section class="panel">
        <div class="panel-heading"><div><h2>Income statement</h2><p>Income and expenditure for posted entries.</p></div><span class="status ${income.netSurplus >= 0 ? "active" : "pending"}">${income.netSurplus >= 0 ? "Surplus" : "Deficit"} ${money0(Math.abs(income.netSurplus))}</span></div>
        <div class="chart-figure">${svgBarChart([
          { label: "Income", value: income.totalIncome, color: "#2f8f6b" },
          { label: "Expenditure", value: income.totalExpense, color: "#b4552d" }
        ], { title: "Income vs expenditure", format: money0 })}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Code</th><th>Line</th><th class="amount">Amount</th></tr></thead>
          <tbody>
            <tr class="section-row"><td></td><td><strong>Income</strong></td><td></td></tr>
            ${income.income.length ? itemRows(income.income) : `<tr><td></td><td>No income posted.</td><td></td></tr>`}
            ${totalRow("Total income", income.totalIncome)}
            <tr class="section-row"><td></td><td><strong>Expenditure</strong></td><td></td></tr>
            ${income.expenses.length ? itemRows(income.expenses) : `<tr><td></td><td>No expenditure posted.</td><td></td></tr>`}
            ${totalRow("Total expenditure", income.totalExpense)}
            ${totalRow(income.netSurplus >= 0 ? "Net surplus" : "Net deficit", income.netSurplus)}
          </tbody>
        </table></div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-heading"><div><h2>Balance sheet</h2><p>Statement of financial position (assets = liabilities + equity).</p></div>${badge(balance.balanced)}</div>
      <div class="chart-figure">
        ${svgDonutChart([
          { label: "Liabilities", value: balance.totalLiabilities, color: "#c8a24a" },
          { label: "Equity", value: balance.totalEquity, color: "#0f4638" }
        ], { title: "How assets are financed", centreLabel: money0(balance.totalAssets) })}
        ${chartLegend([
          { label: "Liabilities", value: balance.totalLiabilities, color: "#c8a24a" },
          { label: "Equity", value: balance.totalEquity, color: "#0f4638" }
        ], { format: money0 })}
      </div>
      <div class="grid two">
        <div class="table-wrap"><table>
          <thead><tr><th>Code</th><th>Assets</th><th class="amount">Amount</th></tr></thead>
          <tbody>
            ${balance.assets.length ? itemRows(balance.assets) : `<tr><td></td><td>No assets posted.</td><td></td></tr>`}
            ${totalRow("Total assets", balance.totalAssets)}
          </tbody>
        </table></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Code</th><th>Liabilities &amp; equity</th><th class="amount">Amount</th></tr></thead>
          <tbody>
            <tr class="section-row"><td></td><td><strong>Liabilities</strong></td><td></td></tr>
            ${balance.liabilities.length ? itemRows(balance.liabilities) : `<tr><td></td><td>No liabilities posted.</td><td></td></tr>`}
            ${totalRow("Total liabilities", balance.totalLiabilities)}
            <tr class="section-row"><td></td><td><strong>Equity</strong></td><td></td></tr>
            ${balance.equity.length ? itemRows(balance.equity) : `<tr><td></td><td>No equity posted.</td><td></td></tr>`}
            ${totalRow("Total equity", balance.totalEquity)}
            ${totalRow("Total liabilities & equity", balance.totalLiabilities + balance.totalEquity)}
          </tbody>
        </table></div>
      </div>
    </section>
  `;
}

function collectionAccountOptionLabel(account) {
  const title = normal(account.channel) === "bank"
    ? (account.bankName || "Bank")
    : String(account.network || "Mobile money").toUpperCase();
  return `${title} ${account.accountNumber || ""}`.trim();
}

function collectionAttributionPanel(unmatchedStatementLines) {
  const lines = unmatchedStatementLines || [];
  if (!lines.length) return "";
  const canManage = hasPermission("accounting:post");
  const accounts = dataRows("saccoPaymentAccounts").filter((account) => account.active);
  const selectedLine = lines.find((row) => row.id === state.selectedReconAttributionLineId) || lines[0];
  const selectedAccountId = state.selectedReconAttributionAccountId
    || selectedLine.collectionAccountId
    || selectedLine.suggestedCollectionAccountId
    || (accounts[0]?.id || "");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Confirm collection account</h2>
          <p>Confirm the account this line settled into. Override the suggestion if needed.</p>
        </div>
      </div>
      ${state.reconAttributionMessage ? `<div class="notice success">${escapeHtml(state.reconAttributionMessage)}</div>` : ""}
      ${state.reconAttributionError ? `<div class="notice warning">${escapeHtml(state.reconAttributionError)}</div>` : ""}
      ${accounts.length ? "" : `<div class="notice warning">No active collection accounts yet. Add one under Settings before attributing statement lines.</div>`}
      <div class="form-grid">
        <label>
          <span>Statement line</span>
          <select id="reconAttributionLineSelect" ${canManage ? "" : "disabled"}>
            ${lines.map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === selectedLine.id ? "selected" : ""}>${escapeHtml(row.externalReference || row.id)} - ${escapeHtml(money.format(row.amount || 0))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Collection account</span>
          <select id="reconAttributionAccountSelect" ${canManage && accounts.length ? "" : "disabled"}>
            ${accounts.map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === selectedAccountId ? "selected" : ""}>${escapeHtml(collectionAccountOptionLabel(account))}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="source-grid compact">
        ${mini("Suggested", selectedLine.suggestedCollectionAccount || "None")}
        ${mini("Confirmed", selectedLine.collectionAccount || "Not set")}
        ${mini("Amount", money.format(selectedLine.amount || 0))}
      </div>
      <div class="action-row">
        <button class="button primary" type="button" data-save-collection-account="${escapeHtml(selectedLine.id)}" ${canManage && accounts.length ? "" : "disabled"}>Save attribution</button>
        <button class="button secondary" type="button" data-clear-collection-account="${escapeHtml(selectedLine.id)}" ${canManage && selectedLine.collectionAccountId ? "" : "disabled"}>Clear</button>
      </div>
      ${canManage ? "" : `<p class="muted-note">Only users with posting rights can confirm collection accounts.</p>`}
    </section>
  `;
}

function callbackAttributionPanel(callbacks) {
  const rows = callbacks || [];
  if (!rows.length) return "";
  const canManage = hasPermission("accounting:post");
  const accounts = dataRows("saccoPaymentAccounts").filter((account) => account.active && normal(account.channel) !== "bank");
  const selected = rows.find((row) => row.id === state.selectedCallbackAttributionId) || rows[0];
  const selectedAccountId = state.selectedCallbackAttributionAccountId
    || selected.collectionAccountId
    || selected.suggestedCollectionAccountId
    || (accounts[0]?.id || "");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Confirm callback account</h2>
          <p>Confirm the mobile-money account this callback settled into. Override if needed.</p>
        </div>
      </div>
      ${state.callbackAttributionMessage ? `<div class="notice success">${escapeHtml(state.callbackAttributionMessage)}</div>` : ""}
      ${state.callbackAttributionError ? `<div class="notice warning">${escapeHtml(state.callbackAttributionError)}</div>` : ""}
      ${accounts.length ? "" : `<div class="notice warning">No active mobile-money collection accounts yet. Add one under Settings before attributing callbacks.</div>`}
      <div class="form-grid">
        <label>
          <span>Callback</span>
          <select id="callbackAttributionSelect" ${canManage ? "" : "disabled"}>
            ${rows.map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === selected.id ? "selected" : ""}>${escapeHtml(row.externalReference || row.id)} - ${escapeHtml(money.format(row.amount || 0))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Mobile-money account</span>
          <select id="callbackAttributionAccountSelect" ${canManage && accounts.length ? "" : "disabled"}>
            ${accounts.map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === selectedAccountId ? "selected" : ""}>${escapeHtml(collectionAccountOptionLabel(account))}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="source-grid compact">
        ${mini("Provider", labelize(selected.provider || "unknown"))}
        ${mini("Suggested", selected.suggestedCollectionAccount || "None")}
        ${mini("Confirmed", selected.collectionAccount || "Not set")}
      </div>
      <div class="action-row">
        <button class="button primary" type="button" data-save-callback-account="${escapeHtml(selected.id)}" ${canManage && accounts.length ? "" : "disabled"}>Save attribution</button>
        <button class="button secondary" type="button" data-clear-callback-account="${escapeHtml(selected.id)}" ${canManage && selected.collectionAccountId ? "" : "disabled"}>Clear</button>
      </div>
      ${canManage ? "" : `<p class="muted-note">Only users with posting rights can confirm collection accounts.</p>`}
    </section>
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
  const coverage = reconciliationCoverage(summaryData);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Reconciliation command center</h2>
          <p>Match bank statement lines to ledger lines before period close.</p>
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
          <p>Track member requests and close stale prompts with audit-ready statuses.</p>
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

function accountingControlPanel(title, copy, rows) {
  const needsReview = rows.some((row) => ["review", "investigate", "blocked"].includes(normal(row[2])));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(copy)}</p>
        </div>
        <span class="status ${needsReview ? "pending" : "active"}">${needsReview ? "Review" : "Ready"}</span>
      </div>
      <div class="mini-grid">
        ${rows.map(([label, detail, status]) => mini(label, `${detail}${status ? ` (${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}
