// SACCO staff dashboard rendering helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

function saccoDashboard() {
  const role = roleKind();
  if (role === "chairperson") return saccoChairpersonDashboard();
  if (role === "treasurer") return saccoTreasurerDashboard();
  if (role === "secretary") return saccoSecretaryDashboard();
  if (role === "accountant") return saccoAccountantDashboard();
  if (role === "teller") return saccoTellerDashboard();
  if (role === "auditor") return saccoAuditorDashboard();
  if (role === "loans") return saccoLoansOfficerDashboard();
  const cycle = currentSaccoCycleContext();
  const members = filterMembersBySaccoCycle(dataRows("members"), cycle);
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const loans = filterLoansBySaccoCycle(dataRows("loans"), cycle);
  const monthlyPerformance = buildSaccoMonthlyPerformanceRows({
    callbacks: filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle),
    memberName,
    transactions
  });
  const dashboard = buildSaccoAdminDashboardSummary({ loans, members, transactions });
  return `
    ${saccoRoleContractMarkers()}
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summaryLink("Total members", dashboard.totalMembers, "Membership register", "Open", "members")}
      ${summaryLink("Total savings", money.format(dashboard.totalSavings), "Verified member balances", "Statements", "savings")}
      ${summaryLink("Outstanding loans", money.format(dashboard.outstandingLoans), "Loan portfolio", "Open", "loans")}
      ${summaryLink("Pending approvals", dashboard.pendingApprovals, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money collections", money.format(dashboard.mobileMoneyCollections), "Provider channel", "Reconcile", "reconciliation")}
    </div>
    <div class="grid two">
      ${loanPortfolioChartPanel(loans)}
      ${incomeExpenditureChartPanel(dataRows("journalEntries"), dataRows("chartOfAccounts"))}
    </div>
    ${depositsTrendChartPanel(monthlyPerformance)}
    ${saccoMonthlyPerformancePanel(monthlyPerformance)}
    <div class="grid two">
      ${recordTable("Member monthly performance", monthlyPerformance, ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"])}
      ${recordTable("Recent transactions", transactions, ["reference", "memberName", "type", "amount", "status"])}
      ${recordTable("Loan work queue", loans, ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
    </div>
  `;
}

function saccoRoleContractMarkers() {
  return `<span class="sr-only">SACCO Chairperson SACCO Treasurer SACCO Secretary Chairperson access Treasurer access Secretary access Access filtered</span>`;
}

function loanPortfolioChartPanel(loans) {
  const rows = buildLoanRows({ formatMoney: (value) => money.format(value), labelize, memberName, loans: loans || [] });
  const portfolio = buildLoanPortfolioSummary(rows);
  const bars = [
    { label: "Submitted", value: portfolio.submitted, color: "#c8a24a" },
    { label: "Approved", value: portfolio.approved, color: "#3b6ea5" },
    { label: "Active", value: portfolio.active, color: "#0f766e" },
    { label: "At risk", value: portfolio.atRisk, color: "#b4552d" }
  ];
  return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Loan portfolio</h2><p>Applications, disbursed loans and at-risk exposure.</p></div><span class="status ${portfolio.atRisk ? "pending" : "active"}">${portfolio.atRisk} at risk</span></div>
      <div class="chart-figure">${svgBarChart(bars, { title: "Loan portfolio by stage", format: (value) => String(Math.round(value)) })}</div>
      <div class="source-grid compact">
        ${mini("Outstanding principal", money.format(portfolio.outstandingPrincipal))}
        ${mini("Arrears", money.format(portfolio.arrearsTotal))}
        ${mini("Over 90 days", money.format(portfolio.over90Total))}
      </div>
    </section>`;
}

function depositsTrendChartPanel(monthlyRows) {
  const byMonth = new Map();
  (monthlyRows || []).forEach((row) => {
    const month = String(row.month || "");
    if (!month || month === "Unknown month") return;
    const total = Number(row.savingsDeposits || 0) + Number(row.shareDeposits || 0) + Number(row.welfareDeposits || 0);
    byMonth.set(month, (byMonth.get(month) || 0) + total);
  });
  const points = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([month, value]) => ({ label: month, value }));
  if (points.length < 2) return "";
  const latest = points[points.length - 1].value;
  return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Member deposits trend</h2><p>Total savings, shares and welfare contributions per month.</p></div><span class="status active">${money.format(latest)} latest</span></div>
      <div class="chart-figure">${svgLineChart(points, { title: "Member deposits trend", color: "#0f766e" })}</div>
    </section>`;
}

function collectionsByChannelPanel(monthlyRows) {
  let mobileMoney = 0;
  let treasurerCash = 0;
  (monthlyRows || []).forEach((row) => {
    mobileMoney += Number(row.mobileMoney || 0);
    treasurerCash += Number(row.treasurerCash || 0);
  });
  if (mobileMoney + treasurerCash <= 0) return "";
  const segments = [
    { label: "Mobile money", value: mobileMoney, color: "#0f766e" },
    { label: "Treasurer cash", value: treasurerCash, color: "#c8a24a" }
  ];
  return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Collections by channel</h2><p>Where member contributions came in.</p></div></div>
      <div class="chart-figure">
        ${svgDonutChart(segments, { title: "Collections by channel", centreLabel: money.format(mobileMoney + treasurerCash) })}
        ${chartLegend(segments, { format: (value) => money.format(value) })}
      </div>
    </section>`;
}

function incomeExpenditureChartPanel(journals, accounts) {
  const income = buildIncomeStatement(journals || [], accounts || []);
  return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Income vs expenditure</h2><p>Posted ledger performance.</p></div><span class="status ${income.netSurplus >= 0 ? "active" : "pending"}">${income.netSurplus >= 0 ? "Surplus" : "Deficit"} ${money.format(Math.abs(income.netSurplus))}</span></div>
      <div class="chart-figure">${svgBarChart([
        { label: "Income", value: income.totalIncome, color: "#2f8f6b" },
        { label: "Expenditure", value: income.totalExpense, color: "#b4552d" }
      ], { title: "Income vs expenditure", format: (value) => money.format(value) })}</div>
    </section>`;
}

function saccoAccountantDashboard() {
  const cycle = currentSaccoCycleContext();
  const journalEntries = filterJournalsBySaccoCycle(dataRows("journalEntries"), cycle);
  const expenses = filterExpensesBySaccoCycle(dataRows("expenses"), cycle);
  const reconciliation = state.data.reconciliation || {};
  const dashboard = buildSaccoAccountantDashboardSummary({
    chartOfAccounts: dataRows("chartOfAccounts"),
    expenses,
    journalEntries,
    reconciliation
  });
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summaryLink("Journal entries", dashboard.journalEntries, "Posted ledger activity", "Open", "accounting")}
      ${summaryLink("Expenses posted", money.format(dashboard.expensesPosted), "Operating spend", "Capture", "accounting")}
      ${summaryLink("Reconciliation exceptions", dashboard.reconciliationExceptions, "Bank and mobile-money", "Match", "reconciliation")}
      ${summaryLink("Reports", dashboard.reports, "Financial reporting", "View", "reports")}
    </div>
    ${incomeExpenditureChartPanel(journalEntries, dataRows("chartOfAccounts"))}
    <div class="grid two">
      ${recordTable("Recent journal entries", journalEntries, ["reference", "description", "debit", "credit", "postedAt"])}
      ${recordTable("Recent expenses", expenses, ["reference", "accountCode", "amount", "channel", "expenseDate", "status"])}
    </div>
  `;
}

function saccoTellerDashboard() {
  const cycle = currentSaccoCycleContext();
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const dashboard = buildSaccoTellerDashboardModel({ currentUserId: state.user?.id, members: filterMembersBySaccoCycle(dataRows("members"), cycle), transactions });
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summaryLink("Record a transaction", "Open", "Capture deposit or repayment", "Capture", "transactions")}
      ${summaryLink("My captures", dashboard.myCaptureCount, "Submitted this session", "Review", "transactions")}
      ${summaryLink("Awaiting approval", dashboard.awaitingApproval, "Sent to Treasurer/Admin", "Track", "transactions")}
      ${summaryLink("Members", dashboard.members, "Member lookup", "Open", "members")}
    </div>
    ${dashboard.myCaptures.length
      ? recordTable("My recent captures", dashboard.myCaptures, ["reference", "memberName", "type", "amount", "channel", "status"])
      : emptyState("No captures yet", "Use Transactions to record a member deposit or repayment for approval.")}
  `;
}

function saccoLoansOfficerDashboard() {
  const cycle = currentSaccoCycleContext();
  const loans = filterLoansBySaccoCycle(dataRows("loans"), cycle);
  const dashboard = buildSaccoLoansOfficerDashboardModel(loans);
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summaryLink("Loan applications", dashboard.loanApplications, "Capture and appraise", "Open", "loans")}
      ${summaryLink("Awaiting approval", dashboard.awaitingApproval, "Prepared for chairperson", "Track", "loans")}
      ${summaryLink("Need guarantor", dashboard.needGuarantorCount, "Guarantee follow-up", "Review", "guarantors")}
      ${summaryLink("Arrears watch", dashboard.arrearsWatch, "Repayment follow-up", "Assess", "loans")}
    </div>
    ${loanPortfolioChartPanel(loans)}
    ${recordTable("Loan work queue", loans.map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Open", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "status"])}
  `;
}

function saccoAuditorDashboard() {
  const cycle = currentSaccoCycleContext();
  const auditEvents = rowsInSaccoCycle(dataRows("auditEvents"), cycle, ["createdAt"]);
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const dashboard = buildSaccoAuditorDashboardModel({ auditEvents, chartOfAccounts: dataRows("chartOfAccounts"), transactions });
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summaryLink("Audit events", dashboard.auditEvents, "Sensitive activity trail", "Open", "audit")}
      ${summaryLink("Reversals", dashboard.reversalCount, "Corrections with reason", "Review", "transactions")}
      ${summaryLink("High-value transactions", dashboard.highValueTransactions, "Large movements", "Review", "transactions")}
      ${summaryLink("Reports", dashboard.reports, "Operational and financial", "View", "reports")}
    </div>
    <div class="grid two">
      ${recordTable("Recent audit events", auditEvents, ["action", "resourceType", "actorName", "createdAt"])}
      ${recordTable("High-value transactions", dashboard.highValue, ["reference", "memberName", "type", "amount", "status"])}
    </div>
  `;
}

function saccoChairpersonDashboard() {
  const cycle = currentSaccoCycleContext();
  const loans = filterLoansBySaccoCycle(dataRows("loans"), cycle);
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const governanceMeetings = filterGovernanceMeetingsByCycle(dataRows("governanceMeetings"), cycle);
  const dashboard = buildSaccoChairpersonDashboardModel({ governanceMeetings, loans, transactions });
  return `
    ${saccoCyclePanel(cycle)}
    ${saccoRoleFocusPanel("SACCO Chairperson", "Chairperson decision focus", "Board-level approval, loan exposure and governance decisions.")}
    <div class="dashboard-grid">
      ${summaryLink("Loans awaiting approval", dashboard.loansAwaitingApproval, "Chairperson approval queue", "Decide", "approvals")}
      ${summaryLink("Outstanding portfolio", money.format(dashboard.outstandingPortfolio), "Credit exposure", "Review", "loans")}
      ${summaryLink("Arrears watch", dashboard.arrearsWatch, "Loans needing board attention", "Assess", "loans")}
      ${summaryLink("Governance actions", dashboard.governanceActions, "Meetings and resolutions", "Open", "governance")}
    </div>
    ${loanPortfolioChartPanel(loans)}
    <div class="grid two">
      ${recordTable("Loans awaiting approval", dashboard.approvalLoans.map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Decide", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
      ${recordTable("Board risk watch", [...dashboard.arrearsLoans, ...dashboard.highValueTransactions], ["applicationNo", "reference", "memberName", "product", "amount", "outstandingBalance", "status"])}
    </div>
  `;
}

function saccoTreasurerDashboard() {
  const cycle = currentSaccoCycleContext();
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const callbacks = filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle);
  const pending = filterApprovalsBySaccoCycle(pendingTransactions(), cycle);
  const monthlyPerformance = buildSaccoMonthlyPerformanceRows({
    callbacks,
    memberName,
    transactions
  });
  const treasurer = buildSaccoTreasurerDashboardModel({
    callbacks,
    members: filterMembersBySaccoCycle(dataRows("members"), cycle),
    pendingTransactions: pending,
    transactions
  });
  const recentReceipts = transactions
    .filter((row) => ["posted", "approved", "completed"].some((word) => normal(row.status).includes(word)))
    .slice(0, 8);
  const exceptions = [...treasurer.failedCallbacks, ...callbacks.filter((row) => ["failed", "exception", "pending"].some((word) => normal(row.status).includes(word)))].slice(0, 8);
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summaryLink("Cash collected", money.format(treasurer.treasurerCash), "Treasurer office receipts", "Post", "finance", "transactions")}
      ${summaryLink("Mobile money", money.format(treasurer.mobileMoney), "Provider collections", "Reconcile", "finance", "reconciliation")}
      ${summaryLink("To approve", treasurer.pendingApprovals, "Verified finance queue", "Approve", "finance", "approvals")}
      ${summaryLink("Exceptions", treasurer.mobileMoneyExceptions, "Needs correction", "Review", "finance", "reconciliation")}
    </div>
    <section class="panel compact-panel treasurer-command-panel">
      <div class="panel-heading">
        <div>
          <h2>Treasurer workbench</h2>
          <p>Receive money, approve verified postings, reconcile bank/mobile-money evidence and close the cycle.</p>
        </div>
        <span class="status ${treasurer.mobileMoneyExceptions || treasurer.pendingApprovals ? "pending" : "active"}">${treasurer.mobileMoneyExceptions || treasurer.pendingApprovals ? "Review" : "Clear"}</span>
      </div>
      <div class="access-grid compact-treasurer-actions">
        ${treasurerAction("Receive cash", "Post savings, shares, welfare, subscriptions or loan repayment.", "transactions", "transactions:view")}
        ${treasurerAction("Approve queue", "Confirm verified finance entries. Maker-checker still applies.", "approvals", "approvals:view")}
        ${treasurerAction("Reconcile", "Match mobile-money and bank evidence before close of day.", "reconciliation", "transactions:view")}
        ${treasurerAction("Reports", "Export collections and member payment summaries.", "reports", "reports:view")}
      </div>
    </section>
    <div class="grid two">
      ${collectionsByChannelPanel(monthlyPerformance)}
      ${treasurerCycleClosePanel(treasurer, cycle)}
    </div>
    <div class="grid two">
      ${pending.length ? recordTable("Approval queue", pending, ["reference", "memberName", "type", "amount", "channel", "status"]) : emptyState("Approval queue clear", "No verified finance postings are waiting for Treasurer approval.")}
      ${exceptions.length ? recordTable("Exception watch", exceptions, ["externalReference", "provider", "purpose", "amount", "status", "receivedAt"]) : emptyState("No reconciliation exceptions", "Mobile-money and bank evidence is clear for this cycle.")}
      ${recentReceipts.length ? recordTable("Recent receipts", recentReceipts, ["reference", "memberName", "type", "amount", "channel", "postedAt", "status"]) : emptyState("No receipts yet", "Posted receipts for this cycle will appear here.")}
      ${monthlyPerformance.length ? recordTable("Member payment summary", monthlyPerformance.slice(0, 8), ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"]) : emptyState("No member payments yet", "Member payment performance appears after postings.")}
    </div>
  `;
}

function treasurerFinanceView() {
  const tabs = [
    ["overview", "Overview"],
    ["member-transactions", "Member transactions"],
    ["transactions", "Transactions"],
    ["savings", "Savings"],
    ["shares", "Shares"],
    ["welfare", "Welfare"]
  ];
  const tab = activeModuleTab("finance", tabs);
  return `
    ${moduleTabs("finance", tabs, tab)}
    ${tab === "overview" ? treasurerFinanceOverview() : ""}
    ${tab === "member-transactions" ? treasurerMemberTransactionsView() : ""}
    ${tab === "transactions" ? transactionsView() : ""}
    ${tab === "savings" ? savingsView() : ""}
    ${tab === "shares" ? sharesView() : ""}
    ${tab === "welfare" ? welfareView() : ""}
  `;
}

function treasurerMemberTransactionsView() {
  const cycle = currentSaccoCycleContext();
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const callbacks = filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle);
  const loans = filterLoansBySaccoCycle(dataRows("loans"), cycle);
  const guarantorRequests = filterApprovalsBySaccoCycle(dataRows("guarantorRequests"), cycle);
  const rows = buildMemberTransactionRows(transactions, callbacks, loans, guarantorRequests);
  const selectedTransactions = state.selectedFinanceMemberId && state.selectedFinanceMetric
    ? financeMemberFigureRows({ callbacks, guarantorRequests, loans, memberId: state.selectedFinanceMemberId, metric: state.selectedFinanceMetric, transactions })
    : [];
  const selectedLabel = financeSelectionLabel("__all__", state.selectedFinanceMetric, state.selectedFinanceMemberId);
  return `
    ${saccoCyclePanel(cycle, { title: "Member transaction cycle" })}
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member transactions</h2>
          <p>Total member deposits by fund source for the selected cycle. Click an amount to open the transaction report.</p>
        </div>
        <span class="status active">${escapeHtml(cycle?.label || "Current cycle")}</span>
      </div>
      ${rows.length ? memberTransactionSummaryTable(`Member transactions - ${cycle?.label || "Current cycle"}`, rows) : emptyState("No member transactions", "Posted member deposits for this cycle will appear here.")}
    </section>
    ${state.selectedFinanceMemberId && state.selectedFinanceMetric ? financeFigureDetailPanel(selectedLabel, selectedTransactions, state.selectedFinanceMetric) : ""}
  `;
}

function treasurerFinanceOverview() {
  const cycle = currentSaccoCycleContext();
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const callbacks = filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle);
  const cycleLabel = cycle?.label || "Current cycle";
  const monthlyRows = buildMonthlyTransactionRows({
    callbacks,
    memberName,
    transactions
  });
  const selectedTransactions = state.selectedFinanceMonth && state.selectedFinanceMetric
    ? financeTransactionsForSelection(transactions, callbacks, state.selectedFinanceMonth, state.selectedFinanceMetric)
    : [];
  const selectedLabel = financeSelectionLabel(state.selectedFinanceMonth, state.selectedFinanceMetric);
  const chartRows = savingsDepositChartMonths(monthlyRows, cycle);
  return `
    ${saccoCyclePanel(cycle, { title: "Finance cycle" })}
    <section class="panel compact-panel ${state.financeSavingsChartZoomed ? "finance-chart-zoomed" : ""}">
      <div class="panel-heading">
        <div>
          <h2>Deposits by month</h2>
          <p>Savings deposits from January to December for the selected SACCO cycle.</p>
        </div>
        <div class="form-actions inline">
          <button class="button secondary" type="button" data-action="toggle-finance-chart-zoom">${state.financeSavingsChartZoomed ? "Normal size" : "Zoom chart"}</button>
          <button class="button ghost" type="button" data-action="export-finance-deposits-chart-pdf">Export PDF</button>
        </div>
      </div>
      <div class="chart-figure">${svgBarChart(chartRows.map((row) => ({
          label: row.label,
          value: row.savingsDeposits,
          color: "#0f766e"
        })), { title: "Deposits by month", width: state.financeSavingsChartZoomed ? 920 : 620, height: state.financeSavingsChartZoomed ? 260 : 180, format: (value) => money.format(value) })}</div>
    </section>
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Transactions by month</h2>
          <p>Cycle-based member receipts separated by savings, shares, welfare, loan repayments and payment route.</p>
        </div>
        <span class="status active">${escapeHtml(cycleLabel)}</span>
      </div>
      ${monthlyRows.length ? `
        ${financeFigureNotice()}
        ${monthlyTransactionSummaryTable(`Transactions by month - ${cycleLabel}`, monthlyRows)}
      ` : emptyState("No monthly transactions", "Posted member receipts for this cycle will appear here.")}
    </section>
    ${state.selectedFinanceMonth && state.selectedFinanceMetric ? financeMonthTransactionsPanel(selectedLabel, selectedTransactions) : ""}
  `;
}

function treasurerExpensesView() {
  const cycle = currentSaccoCycleContext();
  const expenses = filterExpensesBySaccoCycle(dataRows("expenses"), cycle);
  const cycleLabel = cycle?.label || "Current cycle";
  return `
    ${saccoCyclePanel(cycle, { title: "Expense cycle" })}
    <div class="grid two">
      ${expenseCapturePanel()}
      ${expenses.length ? recordTable(`Expenses - ${cycleLabel}`, expenses, ["reference", "accountCode", "amount", "channel", "expenseDate", "status"]) : emptyState("No expenses posted", "Treasurer or Finance can post operating expenses for this cycle.")}
    </div>
  `;
}

function savingsDepositChartMonths(rows, cycle) {
  const year = Number(cycle?.year) || new Date().getFullYear();
  const byMonth = new Map((rows || []).map((row) => [row.month, row]));
  return Array.from({ length: 12 }, (_, index) => {
    const monthNumber = index + 1;
    const key = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const date = new Date(year, index, 1);
    return {
      label: date.toLocaleString(currentRegion().locale || "en-US", { month: "short" }),
      month: key,
      savingsDeposits: Number(byMonth.get(key)?.savingsDeposits || 0)
    };
  });
}

function monthlyTransactionSummaryTable(title, rows) {
  const model = financeClickableTableModel(title, rows);
  const columns = ["month", "transactionCount", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney"];
  const clickableColumns = new Set(columns.filter((column) => column !== "month"));
  const totalRows = model.filteredRows;
  const totals = {
    month: "Total",
    transactionCount: sum(totalRows, "transactionCount"),
    savingsDeposits: sum(totalRows, "savingsDeposits"),
    shareDeposits: sum(totalRows, "shareDeposits"),
    welfareDeposits: sum(totalRows, "welfareDeposits"),
    loanRepayments: sum(totalRows, "loanRepayments"),
    treasurerCash: sum(totalRows, "treasurerCash"),
    mobileMoney: sum(totalRows, "mobileMoney")
  };
  return `
    ${financeClickableTableTools(title, model)}
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map((column) => `<th>${tableColumnLabel(column)}</th>`).join("")}</tr></thead>
        <tbody>
          ${model.pagedRows.map((row) => `<tr>${columns.map((column) => monthlyTransactionCell(row, column, clickableColumns)).join("")}</tr>`).join("")}
          <tr class="total-row">${columns.map((column) => monthlyTransactionCell(totals, column, clickableColumns, true)).join("")}</tr>
        </tbody>
      </table>
    </div>
    ${financeClickableTablePagination(model)}
  `;
}

function financeFigureNotice() {
  return `<div class="notice compact finance-figure-notice"><strong>Tip</strong><span>Click any amount to view the transaction, loan or guarantor records behind that figure.</span></div>`;
}

function financeClickableTableModel(title, rows) {
  const tableKey = tableStateKey(title);
  const tableState = state.tableState[tableKey] || { search: "", page: 1, pageSize: 10 };
  const model = buildRecordTableModel({
    allRows: rows || [],
    backendPage: null,
    globalSearch: state.search,
    serverTable: null,
    tableState
  });
  if (model.currentPage !== tableState.page) state.tableState[tableKey] = { ...tableState, page: model.currentPage };
  return { ...model, tableKey };
}

function financeClickableTableTools(title, model) {
  const translatedTitle = tableTitleLabel(title);
  return `
    <div class="table-tools finance-table-tools">
      <label>
        <span>${t("search") || "Search"}</span>
        <input value="${escapeHtml(model.searchText)}" data-table-search="${escapeHtml(model.tableKey)}" placeholder="${escapeHtml(`Search ${translatedTitle.toLowerCase()}`)}" autocomplete="off" spellcheck="false">
      </label>
      <label>
        <span>${t("rowsPerPage")}</span>
        <select data-table-page-size="${escapeHtml(model.tableKey)}">
          ${[10, 25, 50, 100].map((size) => `<option value="${size}" ${model.pageSize === size ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
    </div>
  `;
}

function financeClickableTablePagination(model) {
  const rangeLabel = model.filteredRows.length
    ? `${t("showingRange")} ${model.start + 1}-${Math.min(model.start + model.pageSize, model.filteredRows.length)} ${t("of")} ${model.filteredRows.length}`
    : t("noRowsToShow");
  return `
    <div class="pagination">
      <span>${rangeLabel}</span>
      <div>
        <button class="table-action" type="button" data-table-page="${escapeHtml(model.tableKey)}" data-page="${model.currentPage - 1}" ${model.currentPage <= 1 ? "disabled" : ""}>${t("previous")}</button>
        <strong>${t("page")} ${model.currentPage} ${t("of")} ${model.totalPages}</strong>
        <button class="table-action" type="button" data-table-page="${escapeHtml(model.tableKey)}" data-page="${model.currentPage + 1}" ${model.currentPage >= model.totalPages ? "disabled" : ""}>${t("next")}</button>
      </div>
    </div>
  `;
}

function buildMemberTransactionRows(transactions, callbacks, loans = [], guarantorRequests = []) {
  const rows = new Map();
  const ensure = (memberId, fallbackName) => {
    const key = memberId || fallbackName || "unknown";
    if (!rows.has(key)) {
      const member = dataRows("members").find((row) => row.id === memberId) || {};
      rows.set(key, {
        memberId: memberId || "",
        membershipNo: member.membershipNo || "",
        fullName: member.fullName || fallbackName || memberName(memberId),
        transactionCount: 0,
        savingsDeposits: 0,
        shareDeposits: 0,
        welfareDeposits: 0,
        loanRepayments: 0,
        activeLoans: 0,
        loanOutstandingBalance: 0,
        unclearedGuarantees: 0,
        unclearedGuaranteedAmount: 0,
        treasurerCash: 0,
        mobileMoney: 0
      });
    }
    return rows.get(key);
  };
  const addRow = (row, dateKey) => {
    if (normalizePerformanceText(row.status) !== "posted") return;
    const amount = Number(row.amount || row.credit || 0);
    if (!amount) return;
    const target = ensure(row.memberId, row.memberName);
    target.transactionCount += 1;
    if (financeRecordMatchesMetric(row, "savingsDeposits")) target.savingsDeposits += amount;
    if (financeRecordMatchesMetric(row, "shareDeposits")) target.shareDeposits += amount;
    if (financeRecordMatchesMetric(row, "welfareDeposits")) target.welfareDeposits += amount;
    if (financeRecordMatchesMetric(row, "loanRepayments")) target.loanRepayments += amount;
    if (financeRecordMatchesMetric(row, "treasurerCash")) target.treasurerCash += amount;
    if (financeRecordMatchesMetric(row, "mobileMoney")) target.mobileMoney += amount;
  };
  (transactions || []).forEach((row) => addRow(row));
  (callbacks || []).forEach((row) => addRow(row));
  (loans || []).filter((loan) => financeLoanHasBalance(loan)).forEach((loan) => {
    const target = ensure(loan.memberId, loan.memberName);
    target.activeLoans += 1;
    target.loanOutstandingBalance += financeLoanBalance(loan);
  });
  financeUnclearedGuaranteeRows(loans, guarantorRequests).forEach((request) => {
    const target = ensure(request.memberId, request.memberName);
    target.unclearedGuarantees += 1;
    target.unclearedGuaranteedAmount += Number(request.guaranteedAmount || request.capacity || 0);
  });
  return [...rows.values()].sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
}

function memberTransactionSummaryTable(title, rows) {
  const model = financeClickableTableModel(title, rows);
  const allColumns = ["membershipNo", "fullName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "activeLoans", "loanOutstandingBalance", "unclearedGuarantees", "unclearedGuaranteedAmount"];
  const hidden = new Set(state.financeMemberHiddenColumns || []);
  const columns = allColumns.filter((column) => !hidden.has(column));
  const clickableColumns = new Set(["savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "activeLoans", "loanOutstandingBalance", "unclearedGuarantees", "unclearedGuaranteedAmount"]);
  const totalRows = model.filteredRows;
  const totals = {
    memberId: "__all__",
    membershipNo: "TOTAL",
    fullName: "",
    savingsDeposits: sum(totalRows, "savingsDeposits"),
    shareDeposits: sum(totalRows, "shareDeposits"),
    welfareDeposits: sum(totalRows, "welfareDeposits"),
    loanRepayments: sum(totalRows, "loanRepayments"),
    activeLoans: sum(totalRows, "activeLoans"),
    loanOutstandingBalance: sum(totalRows, "loanOutstandingBalance"),
    unclearedGuarantees: sum(totalRows, "unclearedGuarantees"),
    unclearedGuaranteedAmount: sum(totalRows, "unclearedGuaranteedAmount")
  };
  return `
    ${financeFigureNotice()}
    <div class="column-picker">
      <strong>Show columns</strong>
      ${allColumns.map((column) => `
        <label><input type="checkbox" data-finance-member-column="${escapeHtml(column)}" ${hidden.has(column) ? "" : "checked"}> ${tableColumnLabel(column)}</label>
      `).join("")}
    </div>
    ${financeClickableTableTools(title, model)}
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map((column) => `<th>${tableColumnLabel(column)}</th>`).join("")}</tr></thead>
        <tbody>
          ${model.pagedRows.map((row) => `<tr>${columns.map((column) => memberTransactionCell(row, column, clickableColumns)).join("")}</tr>`).join("")}
          <tr class="total-row">${columns.map((column) => memberTransactionCell(totals, column, clickableColumns, true)).join("")}</tr>
        </tbody>
      </table>
    </div>
    ${financeClickableTablePagination(model)}
  `;
}

function memberTransactionCell(row, column, clickableColumns, total = false) {
  const value = formatValue(row, column);
  if (!clickableColumns.has(column)) return `<td>${total ? `<strong>${value}</strong>` : value}</td>`;
  const raw = Number(row[column] || 0);
  const disabled = raw <= 0;
  const memberId = total ? "__all__" : row.memberId;
  const content = value;
  return `<td><button class="table-action finance-figure-link" type="button" data-row-action="finance-member-detail" data-row-id="${escapeHtml(memberId)}" data-finance-metric="${escapeHtml(column)}" ${disabled ? "disabled" : ""}>${content}</button></td>`;
}

function financeMemberFigureRows({ callbacks, guarantorRequests, loans, memberId, metric, transactions }) {
  if (["activeLoans", "loanOutstandingBalance"].includes(metric)) {
    return (loans || [])
      .filter((loan) => (memberId === "__all__" || loan.memberId === memberId) && financeLoanHasBalance(loan))
      .map((loan) => ({
        ...loan,
        memberName: loan.memberName || memberName(loan.memberId),
        outstandingBalance: financeLoanBalance(loan),
        action: loan.id ? "loan-detail" : "none",
        actionLabel: "Open",
        actionId: loan.id
      }))
      .sort((a, b) => String(a.memberName || "").localeCompare(String(b.memberName || "")));
  }
  if (["unclearedGuarantees", "unclearedGuaranteedAmount"].includes(metric)) {
    return financeUnclearedGuaranteeRows(loans, guarantorRequests)
      .filter((request) => memberId === "__all__" || request.memberId === memberId)
      .sort((a, b) => String(a.memberName || "").localeCompare(String(b.memberName || "")));
  }
  return financeTransactionsForSelection(transactions, callbacks, "__all__", metric, memberId);
}

function financeUnclearedGuaranteeRows(loans = [], guarantorRequests = []) {
  const loansById = new Map((loans || []).map((loan) => [loan.id, loan]));
  return (guarantorRequests || [])
    .filter((request) => {
      const loan = request.loan || loansById.get(request.loanId);
      const status = normal(`${request.status || ""} ${request.guarantorReadiness || ""}`);
      return financeLoanHasBalance(loan) && !["rejected", "cancelled", "released", "cleared"].some((word) => status.includes(word));
    })
    .map((request) => {
      const loan = request.loan || loansById.get(request.loanId) || {};
      return {
        ...request,
        memberName: memberName(request.memberId),
        borrower: loan.memberName || memberName(loan.memberId),
        product: loan.product || request.product || "Loan",
        outstandingBalance: financeLoanBalance(loan),
        guaranteedAmount: Number(request.guaranteedAmount || request.capacity || 0),
        action: loan.id ? "loan-detail" : "none",
        actionLabel: "Open loan",
        actionId: loan.id
      };
    });
}

function financeLoanHasBalance(loan) {
  return financeLoanBalance(loan) > 0 && !["closed", "rejected", "cancelled", "written_off", "cleared"].some((word) => normal(`${loan?.status || ""} ${loan?.stage || ""}`).includes(word));
}

function financeLoanBalance(loan) {
  if (!loan) return 0;
  const recorded = loan.outstandingBalance ?? loan.balance;
  if (recorded !== undefined && recorded !== null && recorded !== "") return Math.max(Number(recorded || 0), 0);
  const total = Number(loan.totalPayable || 0) || Number(loan.amount || loan.requestedAmount || 0) + Number(loan.interestAmount || 0);
  return Math.max(total - Number(loan.repaymentTotal || loan.repayments || 0), 0);
}

function monthlyTransactionCell(row, column, clickableColumns, total = false) {
  const value = formatValue(row, column);
  if (!clickableColumns.has(column)) return `<td>${total ? `<strong>${value}</strong>` : value}</td>`;
  const raw = Number(row[column] || 0);
  const disabled = raw <= 0;
  const month = total ? "__all__" : row.month;
  const content = value;
  return `<td><button class="table-action finance-figure-link" type="button" data-row-action="finance-month-detail" data-row-id="${escapeHtml(month)}" data-finance-metric="${escapeHtml(column)}" ${disabled ? "disabled" : ""}>${content}</button></td>`;
}

function financeTransactionsForSelection(transactions, callbacks, month, metric, memberId = "__all__") {
  const includeMonth = (date) => month === "__all__" || performanceMonthLabel(date) === month;
  const includeMember = (row) => memberId === "__all__" || row.memberId === memberId;
  const txRows = (transactions || [])
    .filter((row) => includeMember(row) && includeMonth(row.postedAt || row.createdAt) && normalizePerformanceText(row.status) === "posted" && financeRecordMatchesMetric(row, metric))
    .map((row) => ({
      reference: row.reference,
      postedAt: row.postedAt || row.createdAt,
      memberName: row.memberName || memberName(row.memberId),
      type: row.type,
      paymentRoute: row.paymentRoute || row.channel,
      amount: Number(row.amount || row.credit || 0),
      status: row.status,
      action: row.id ? "transaction-detail" : "none",
      actionLabel: "Open",
      actionId: row.id
    }));
  const callbackRows = (callbacks || [])
    .filter((row) => includeMember(row) && includeMonth(row.receivedAt || row.createdAt) && normalizePerformanceText(row.status) === "posted" && financeRecordMatchesMetric(row, metric))
    .map((row) => ({
      reference: row.externalReference || row.providerReference || row.id,
      postedAt: row.receivedAt || row.createdAt,
      memberName: memberName(row.memberId),
      type: row.purpose,
      paymentRoute: row.provider || "Mobile money",
      amount: Number(row.amount || 0),
      status: row.status,
      action: "none"
    }));
  return [...txRows, ...callbackRows].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
}

function financeRecordMatchesMetric(row, metric) {
  if (metric === "transactionCount") return true;
  if (metric === "mobileMoney") return isMobileMoneyPerformanceLine(row);
  if (metric === "treasurerCash") return !isMobileMoneyPerformanceLine(row);
  const text = normalizePerformanceText(`${row.type || ""} ${row.purpose || ""} ${row.description || ""} ${row.narration || ""}`);
  if (metric === "loanRepayments") return text.includes("loan") || text.includes("repayment");
  if (metric === "shareDeposits") return text.includes("share");
  if (metric === "welfareDeposits") return text.includes("welfare");
  if (metric === "savingsDeposits") return !(text.includes("loan") || text.includes("repayment") || text.includes("share") || text.includes("welfare"));
  return true;
}

function financeSelectionLabel(month, metric, memberId = "__all__") {
  const period = month === "__all__" ? "Total cycle" : month;
  const who = memberId === "__all__" ? "" : `${memberName(memberId)} - `;
  return `${who}${period} ${tableColumnLabel(metric)}`;
}

function financeMonthTransactionsPanel(label, rows) {
  return financeFigureDetailPanel(label, rows, "transactions");
}

function financeFigureDetailPanel(label, rows, metric) {
  const columns = ["activeLoans", "loanOutstandingBalance"].includes(metric)
    ? ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "monthlyInstallment", "nextDueDate", "status"]
    : ["unclearedGuarantees", "unclearedGuaranteedAmount"].includes(metric)
      ? ["memberName", "borrower", "product", "guaranteedAmount", "outstandingBalance", "status"]
      : ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "status"];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(label)}</h2>
          <p>Records used to calculate the figure selected in the Finance overview.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-finance-month-detail">Close</button>
      </div>
      ${rows.length ? recordTable(`Finance figure report - ${label}`, rows, columns) : emptyState("No records found", "No records were found for this figure.")}
    </section>
  `;
}

function exportFinanceDepositsChartPdf() {
  const cycle = currentSaccoCycleContext();
  const rows = buildMonthlyTransactionRows({
    callbacks: filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle),
    memberName,
    transactions: filterTransactionsBySaccoCycle(dataRows("transactions"), cycle)
  });
  const chartRows = savingsDepositChartMonths(rows, cycle);
  const pdfRows = chartRows.map((row) => ({ month: row.label, savingsDeposits: row.savingsDeposits }));
  pdfRows.push({ month: "TOTAL", savingsDeposits: sum(chartRows, "savingsDeposits") });
  downloadPdfTable({
    filename: `deposits-by-month-${safeExportName(contextName())}-${safeExportName(cycle?.label || "cycle")}-${new Date().toISOString().slice(0, 10)}.pdf`,
    title: contextName(),
    subtitle: `Deposits by month | Savings deposits | ${cycle?.label || "Current cycle"} | Powered by Tereka Online`,
    columns: [["Month", "month"], ["Savings deposits", "savingsDeposits", "money"]],
    rows: pdfRows,
    note: "Savings deposits only. Other contribution sources remain separate in the monthly transaction table."
  });
}

function buildMonthlyTransactionRows(input) {
  const memberRows = buildSaccoMonthlyPerformanceRows(input);
  const months = new Map();
  const counts = new Map();
  const countMonth = (date) => {
    const month = performanceMonthLabel(date);
    if (!month || month === "Unknown month") return;
    counts.set(month, (counts.get(month) || 0) + 1);
  };
  (input.transactions || [])
    .filter((row) => normalizePerformanceText(row.status) === "posted")
    .forEach((row) => countMonth(row.postedAt || row.createdAt));
  (input.callbacks || [])
    .filter((row) => normalizePerformanceText(row.status) === "posted")
    .forEach((row) => countMonth(row.receivedAt || row.createdAt));
  memberRows.forEach((row) => {
    if (!months.has(row.month)) {
      months.set(row.month, {
        month: row.month,
        transactionCount: counts.get(row.month) || 0,
        savingsDeposits: 0,
        shareDeposits: 0,
        welfareDeposits: 0,
        loanRepayments: 0,
        treasurerCash: 0,
        mobileMoney: 0,
        totalDeposits: 0
      });
    }
    const target = months.get(row.month);
    target.savingsDeposits += Number(row.savingsDeposits || 0);
    target.shareDeposits += Number(row.shareDeposits || 0);
    target.welfareDeposits += Number(row.welfareDeposits || 0);
    target.loanRepayments += Number(row.loanRepayments || 0);
    target.treasurerCash += Number(row.treasurerCash || 0);
    target.mobileMoney += Number(row.mobileMoney || 0);
    target.totalDeposits += Number(row.totalDeposits || 0);
  });
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

function treasurerAction(title, copy, tab, permission) {
  const disabled = permission && !hasPermission(permission);
  return `
    <div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(copy)}</span>
      <button class="button secondary" type="button" data-summary-view="finance" data-summary-tab="${escapeHtml(tab)}" ${disabled ? "disabled" : ""}>Open</button>
    </div>
  `;
}

function treasurerCycleClosePanel(treasurer, cycle) {
  const ready = !treasurer.pendingApprovals && !treasurer.mobileMoneyExceptions;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Cycle close readiness</h2>
          <p>${escapeHtml(cycle?.label || "Current cycle")} treasury checks before reporting.</p>
        </div>
        <span class="status ${ready ? "active" : "pending"}">${ready ? "Ready" : "Open items"}</span>
      </div>
      <div class="source-grid compact">
        ${mini("Pending approvals", treasurer.pendingApprovals)}
        ${mini("Exceptions", treasurer.mobileMoneyExceptions)}
        ${mini("Office cash", money.format(treasurer.treasurerCash))}
        ${mini("Mobile money", money.format(treasurer.mobileMoney))}
      </div>
    </section>
  `;
}

function saccoSecretaryDashboard() {
  const cycle = currentSaccoCycleContext();
  const members = filterMembersBySaccoCycle(dataRows("members"), cycle);
  const governance = filterGovernanceMeetingsByCycle(dataRows("governanceMeetings"), cycle);
  const complaints = filterComplaintsBySaccoCycle(openComplaints(), cycle);
  const secretary = buildSaccoSecretaryDashboardModel({ complaints, governanceMeetings: governance, members });
  return `
    ${saccoCyclePanel(cycle)}
    ${saccoRoleFocusPanel("SACCO Secretary", "Secretary office focus", "Member records, Onboarding follow-up, complaints and governance documentation.")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", secretary.totalMembers, "Member register", "Open", "members")}
      ${summaryLink("Members to activate", secretary.membersToVerify, "Member onboarding", "Activate", "approvals")}
      ${summaryLink("Open complaints", secretary.openComplaints, "Member support queue", "Open", "complaints")}
      ${summaryLink("Governance records", secretary.governanceRecords, "Meetings and minutes", "Open", "governance")}
    </div>
    <div class="grid two">
      ${recordTable("Member follow-up list", (secretary.pendingKyc.length ? secretary.pendingKyc : members).map((row) => ({ ...row, action: "member-detail", actionLabel: "Open", actionId: row.id })), ["membershipNo", "fullName", "phone", "kycStatus", "status"])}
      ${recordTable("Governance and complaint follow-up", [...complaints, ...governance], ["id", "memberName", "category", "subject", "scheduledAt", "priority", "status"])}
    </div>
  `;
}

function saccoRoleFocusPanel(roleTitle, focusTitle, copy) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(roleTitle)}</h2>
          <p>${escapeHtml(focusTitle)} - ${escapeHtml(copy)}</p>
        </div>
        <span class="status active">Access filtered</span>
      </div>
    </section>
  `;
}
