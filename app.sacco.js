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
    ${recordTable("Loan work queue", financeLoanDisplayRows(loans), ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
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
    ${recordTable("Loan work queue", financeLoanDisplayRows(loans).map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Open", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "status"])}
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
  const loans = buildLoanRows({
    loans: filterLoansBySaccoCycle(dataRows("loans"), cycle),
    memberName,
    labelize,
    formatMoney: (value) => money.format(value)
  });
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const governanceMeetings = filterGovernanceMeetingsByCycle(dataRows("governanceMeetings"), cycle);
  const dashboard = buildSaccoChairpersonDashboardModel({ governanceMeetings, loans, transactions });
  const portfolio = buildLoanPortfolioSummary(loans);
  const visibleLoans = filteredLoanOverviewRows(financeLoanDisplayRows(loans));
  const selectedLoan = visibleLoans.find((loan) => loan.id === state.selectedLoanId) || visibleLoans[0] || financeLoanDisplayRows(loans)[0];
  const approvedThisCycle = loans.filter((loan) => normal(loan.status) === "approved" || normal(loan.status) === "active").length;
  return `
    ${saccoCyclePanel(cycle, { title: "Chairperson cycle" })}
    <section class="panel compact-panel loan-overview-hero chairman-loan-dashboard">
      <div class="panel-heading">
        <div>
          <h2>Loan Overview</h2>
          <p>Review loan applications, confirm paper approvals and monitor credit risk on behalf of the SACCO.</p>
        </div>
        <button class="button primary" type="button" data-summary-view="loans" data-summary-tab="application">New Loan Application</button>
      </div>
      <div class="loan-kpi-grid">
        ${loanMetricCard("Total loan portfolio", money.format(portfolio.outstandingPrincipal), `Across ${loans.length} loan(s)`, "portfolio")}
        ${loanMetricCard("Pending approval", dashboard.loansAwaitingApproval, "Total applications", "pending")}
        ${loanMetricCard("Approved loans", approvedThisCycle, `${cycle.label}`, "approved")}
        ${loanMetricCard("Overdue loans", dashboard.arrearsWatch, `Amount ${money.format(portfolio.arrearsTotal)}`, "overdue")}
      </div>
    </section>
    <section class="notice compact chairman-role-note">
      <strong>Your role:</strong>
      <span>Review signed loan files, record the people who approved on paper, and watch portfolio risk before disbursement.</span>
    </section>
    ${loanOverviewFilters(loans)}
    ${recordTable(`Loan applications - ${cycle.label}`, visibleLoans.map((loan) => ({
      ...loan,
      loanNo: loan.applicationNo,
      member: loan.memberName || memberName(loan.memberId),
      loanType: loan.product,
      amount: Number(loan.amount || loan.requestedAmount || 0),
      appliedOn: loan.createdAt || loan.submittedAt || loan.updatedAt,
      action: "loan-detail",
      actionLabel: "Open",
      actionId: loan.id,
      rowClass: selectedLoan?.id === loan.id ? "selected-table-row" : ""
    })), ["loanNo", "member", "loanType", "amount", "appliedOn", "status"])}
    ${selectedLoan ? `
      <div class="grid two chairman-loan-review-grid">
        ${chairpersonLoanApplicationDetails(selectedLoan)}
        ${chairpersonLoanAssessmentPanel(selectedLoan)}
      </div>
    ` : emptyState("Loan details", "Select a loan application to review details and record paper approval.")}
    <div class="grid two">
      ${chairpersonRecentLoanActivity(loans)}
      ${chairpersonLoanPerformanceSummary(portfolio)}
    </div>
  `;
}

function chairpersonLoanApplicationDetails(loan) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Application Details <span class="inline-code">(${escapeHtml(loan.applicationNo || loanApplicationCode(loan))})</span></h2>
          <p>${escapeHtml(loan.memberName || memberName(loan.memberId))}</p>
        </div>
        <button class="button secondary" type="button" data-row-action="member-detail" data-row-id="${escapeHtml(loan.memberId || "")}">View Profile</button>
      </div>
      <div class="loan-detail-list">
        ${loanDetailRow("Loan Type", loan.product || "-")}
        ${loanDetailRow("Amount Requested", money.format(loan.amount || loan.requestedAmount || 0))}
        ${loanDetailRow("Repayment Period", `${loan.repaymentMonths || "-"} months`)}
        ${loanDetailRow("Interest Rate", `${loan.interestRate || 0}% monthly`)}
        ${loanDetailRow("Purpose", loan.purpose || "-")}
        ${loanDetailRow("Guarantors", loan.guarantors || 0)}
        ${loanDetailRow("Amount Payable", money.format(loan.totalPayable || loan.amount || 0))}
        ${loanDetailRow("Application Date", formatDate(loan.createdAt || loan.submittedAt || loan.updatedAt))}
        ${loanDetailRow("Signed Form", loanSignedFormLabel(loan))}
        ${loanDetailRow("Paper Approvers", loan.paperApprovalApprovers || "-")}
      </div>
      <div class="notice compact">
        <strong>Before recording approval</strong>
        <span>Confirm the physical form is signed by the applicant and guarantors, then enter the approvers listed on that file.</span>
      </div>
    </section>
  `;
}

function chairpersonLoanAssessmentPanel(loan) {
  const totalPayable = Number(loan.totalPayable || loan.amount || loan.requestedAmount || 0);
  const outstanding = Number(loan.outstandingBalance || loan.balance || 0);
  const guarantors = Number(loan.guarantors || 0);
  const dsr = Number(loan.dsr || 0);
  const rows = [
    ["Member savings", loan.selfSecured ? "Savings can secure this loan" : "Review member savings capacity", loan.selfSecured || totalPayable <= 0],
    ["Loan repayment history", "No unexplained repayment exception shown", !normal(loan.repaymentReadiness || "").includes("reconcile")],
    ["Existing loan balance", outstanding > 0 ? `${money.format(outstanding)} outstanding` : "No outstanding balance shown", outstanding <= totalPayable],
    ["Guarantors", guarantors ? `${guarantors} accepted guarantor(s)` : "Not required only when savings fully cover total payable", guarantors > 0 || loan.selfSecured],
    ["Debt service ratio", dsr ? `${dsr}% DSR` : "DSR not supplied", !dsr || dsr <= 40],
  ];
  const ready = rows.every((row) => row[2]);
  return `
    <section class="panel compact-panel chairman-assessment-panel">
      <div class="panel-heading">
        <div>
          <h2>Loan Assessment</h2>
          <p>Decision checks for the Chairperson before recording paper approval.</p>
        </div>
        <span class="status ${ready ? "active" : "pending"}">${ready ? "Ready" : "Review"}</span>
      </div>
      <div class="assessment-list">
        ${rows.map(([label, detail, ok]) => `
          <div class="${ok ? "ok" : "warn"}">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(detail)}</span>
          </div>
        `).join("")}
      </div>
      <div class="notice compact ${ready ? "" : "warning"}">
        <strong>Recommendation</strong>
        <span>${ready ? "This file is ready for the Chairperson to record the paper approval details." : "Review the highlighted items before recording approval."}</span>
      </div>
      <input type="hidden" id="selectedLoanId" value="${escapeHtml(loan.id || "")}">
      ${paperApprovalFields(hasPermission("loans:approve"), loan)}
      <label><span>Decision note</span><input id="loanDecisionReason" placeholder="Short note from the signed paper approval" ${hasPermission("loans:approve") ? "" : "disabled"}></label>
      <div class="loan-action-stack">
        <button class="button primary" type="button" data-loan-action="approve" ${hasPermission("loans:approve") && ["submitted", "pending_approval", "under_review"].includes(normal(loan.status)) ? "" : "disabled"}>Record Paper Approval</button>
        <button class="button ghost danger" type="button" data-loan-action="reject" ${hasPermission("loans:approve") && ["submitted", "pending_approval", "under_review"].includes(normal(loan.status)) ? "" : "disabled"}>Decline Loan</button>
      </div>
    </section>
  `;
}

function chairpersonRecentLoanActivity(loans) {
  const rows = [...(loans || [])]
    .filter((loan) => loan.approvedAt || loan.updatedAt || loan.createdAt)
    .sort((a, b) => String(b.approvedAt || b.updatedAt || b.createdAt).localeCompare(String(a.approvedAt || a.updatedAt || a.createdAt)))
    .slice(0, 5)
    .map((loan) => [
      `${labelize(loan.status || "Updated")} ${loan.applicationNo || loanApplicationCode(loan)}`,
      `${loan.memberName || memberName(loan.memberId)} - ${money.format(loan.amount || loan.requestedAmount || 0)}`,
      formatDate(loan.approvedAt || loan.updatedAt || loan.createdAt)
    ]);
  return activityPanel("Recent Loan Activity", rows);
}

function chairpersonLoanPerformanceSummary(portfolio) {
  const performing = Math.max(0, Number(portfolio.outstandingPrincipal || 0) - Number(portfolio.arrearsTotal || 0));
  const watch = Math.max(0, Number(portfolio.arrearsTotal || 0) - Number(portfolio.over90Total || 0));
  const nonPerforming = Number(portfolio.over90Total || 0);
  const segments = [
    { label: "Performing loans", value: performing, color: "#15803d" },
    { label: "Watch loans", value: watch, color: "#f59e0b" },
    { label: "Non-performing loans", value: nonPerforming, color: "#dc2626" }
  ].filter((item) => item.value > 0);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Loan Performance Summary</h2>
          <p>Portfolio split for Chairperson oversight.</p>
        </div>
      </div>
      ${segments.length ? `
        <div class="chart-figure">
          ${svgDonutChart(segments, { title: "Loan performance", centreLabel: money.format(portfolio.outstandingPrincipal || 0) })}
          ${chartLegend(segments, { format: (value) => money.format(value) })}
        </div>
      ` : emptyState("No loan performance data", "Loan balances will appear after disbursement.")}
    </section>
  `;
}

function saccoTreasurerDashboard() {
  const cycle = currentSaccoCycleContext();
  const transactions = filterTransactionsBySaccoCycle(dataRows("transactions"), cycle);
  const callbacks = filterCallbacksBySaccoCycle(dataRows("mobileMoneyCallbacks"), cycle);
  const expenses = filterExpensesBySaccoCycle(dataRows("expenses"), cycle);
  const loans = filterLoansBySaccoCycle(dataRows("loans"), cycle);
  const members = filterMembersBySaccoCycle(dataRows("members"), cycle);
  const pending = filterApprovalsBySaccoCycle(pendingTransactions(), cycle);
  const monthlyPerformance = buildSaccoMonthlyPerformanceRows({
    callbacks,
    memberName,
    transactions
  });
  const treasurer = buildSaccoTreasurerDashboardModel({
    callbacks,
    members,
    pendingTransactions: pending,
    transactions
  });
  const overview = buildTreasurerFinanceOverviewModel({ callbacks, expenses, loans, members, monthlyPerformance, transactions });
  const todayRows = treasuryTodayTransactions(transactions, callbacks);
  const chartRows = treasuryCashFlowRows(transactions, expenses, callbacks);
  return `
    ${saccoCyclePanel(cycle)}
    <section class="panel compact-panel treasurer-overview-panel">
      <div class="panel-heading">
        <div>
          <h2>Financial overview</h2>
          <p>Cash, bank, member deposits, loan exposure, expenses and today's receipts for ${escapeHtml(cycle?.label || "the current cycle")}.</p>
        </div>
        <span class="status ${overview.netCash >= 0 ? "active" : "pending"}">${overview.netCash >= 0 ? "Positive cash" : "Cash pressure"}</span>
      </div>
      <div class="treasurer-kpi-grid">
        ${treasurerMetricCard("Cash / bank", money.format(overview.cashBank), "Office cash, bank and mobile collections", "finance", "reconciliation")}
        ${treasurerMetricCard("Savings", money.format(overview.savings), "Member savings balances", "finance", "member-transactions")}
        ${treasurerMetricCard("Loans", money.format(overview.loans), "Outstanding loan portfolio", "loans")}
        ${treasurerMetricCard("Today's receipts", money.format(overview.todayReceipts), `${todayRows.length} transaction(s) today`, "payments")}
        ${treasurerMetricCard("Expenses", money.format(overview.expenses), "Operating spend", "expenses")}
        ${treasurerMetricCard("Net cash", `${overview.netCash >= 0 ? "+" : ""}${money.format(overview.netCash)}`, "Receipts less expenses", "reports")}
      </div>
    </section>
    <div class="grid two">
      <section class="panel compact-panel">
        <div class="panel-heading">
          <div>
            <h2>Cash flow</h2>
            <p>Income against expenses for the selected cycle.</p>
          </div>
          <span class="status active">Cycle</span>
        </div>
        <div class="chart-figure">${svgBarChart(chartRows.map((row) => ({ label: row.label, value: row.value, color: row.color })), { title: "Cash flow", width: 560, height: 180, format: (value) => money.format(value) })}</div>
      </section>
      <section class="panel compact-panel">
        <div class="panel-heading">
          <div>
            <h2>Today's transactions</h2>
            <p>Deposit, loan repayment and withdrawal activity posted today.</p>
          </div>
          <span class="status ${todayRows.length ? "active" : "pending"}">${todayRows.length ? "Updated" : "No activity"}</span>
        </div>
        ${todayRows.length ? recordTable("Today's transactions", todayRows, ["reference", "memberName", "type", "paymentRoute", "amount", "postedAt", "status"]) : emptyState("No transactions today", "Today's posted deposits, repayments and withdrawals will appear here.")}
      </section>
    </div>
    <section class="panel compact-panel treasurer-command-panel">
      <div class="panel-heading">
        <div>
          <h2>Quick finance actions</h2>
          <p>Receive money, reconcile collections, review reports and close the day.</p>
        </div>
        <span class="status ${treasurer.mobileMoneyExceptions || treasurer.pendingApprovals ? "pending" : "active"}">${treasurer.mobileMoneyExceptions || treasurer.pendingApprovals ? "Review" : "Clear"}</span>
      </div>
      <div class="access-grid compact-treasurer-actions">
        ${treasurerAction("Cash / bank", "Post cash and bank deposits or loan repayments.", "transactions", "transactions:view")}
        ${treasurerAction("Payments", "Initiate or record member payments.", "payments", "transactions:view")}
        ${treasurerAction("Reconcile", "Match mobile-money and bank evidence before close of day.", "reconciliation", "transactions:view")}
        ${treasurerAction("Reports", "Export collections and member payment summaries.", "reports", "reports:view")}
      </div>
    </section>
  `;
}

function treasurerFinanceView() {
  const tabs = [
    ["overview", "Overview"],
    ["member-transactions", "Member transactions"]
  ];
  const tab = activeModuleTab("finance", tabs);
  return `
    ${moduleTabs("finance", tabs, tab)}
    ${tab === "overview" ? treasurerFinanceOverview() : ""}
    ${tab === "member-transactions" ? treasurerMemberTransactionsView() : ""}
  `;
}

function buildTreasurerFinanceOverviewModel({ callbacks = [], expenses = [], loans = [], members = [], monthlyPerformance = [], transactions = [] }) {
  const postedTransactions = (transactions || []).filter((row) => normalizePerformanceText(row.status) === "posted");
  const postedCallbacks = (callbacks || []).filter((row) => normalizePerformanceText(row.status) === "posted");
  const todayRows = treasuryTodayTransactions(postedTransactions, postedCallbacks);
  const totalCollections = sum(postedTransactions, "credit", "amount") + sum(postedCallbacks, "amount");
  const expensesTotal = sum(expenses.filter((row) => !["rejected", "cancelled"].some((word) => normal(row.status).includes(word))), "amount", "expenseTotal");
  return {
    cashBank: totalCollections,
    savings: sum(members, "savingsBalance", "savings", "availableSavings"),
    loans: sum(loans.filter((loan) => financeLoanHasBalance(loan)), "outstandingBalance", "balance"),
    todayReceipts: sum(todayRows, "amount"),
    expenses: expensesTotal,
    netCash: totalCollections - expensesTotal,
    memberDeposits: sum(monthlyPerformance, "totalDeposits")
  };
}

function treasurerMetricCard(label, value, detail, view, tab = "") {
  const allowed = canAccessView(view);
  const tabAttribute = allowed && tab ? ` data-summary-tab="${escapeHtml(tab)}"` : "";
  return `
    <article class="treasurer-kpi-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(detail)}</small>
      <button type="button" ${allowed ? `data-summary-view="${escapeHtml(view)}"${tabAttribute}` : "disabled"}>${allowed ? "Open" : t("dashboardOnly")}</button>
    </article>
  `;
}

function treasuryTodayTransactions(transactions = [], callbacks = []) {
  const today = new Date().toISOString().slice(0, 10);
  const posted = (transactions || [])
    .filter((row) => normalizePerformanceText(row.status) === "posted" && String(row.postedAt || row.transactionDate || row.createdAt || "").slice(0, 10) === today)
    .map((row) => ({
      reference: row.reference,
      memberName: row.memberName || memberName(row.memberId),
      type: row.type,
      paymentRoute: row.paymentRoute || row.channel || "cash",
      amount: Number(row.amount || row.credit || 0),
      postedAt: row.postedAt || row.transactionDate || row.createdAt,
      status: row.status
    }));
  const callbackRows = (callbacks || [])
    .filter((row) => normalizePerformanceText(row.status) === "posted" && String(row.receivedAt || row.createdAt || "").slice(0, 10) === today)
    .map((row) => ({
      reference: row.externalReference || row.providerReference || row.id,
      memberName: memberName(row.memberId),
      type: row.purpose,
      paymentRoute: row.provider || "mobile_money",
      amount: Number(row.amount || 0),
      postedAt: row.receivedAt || row.createdAt,
      status: row.status
    }));
  return [...posted, ...callbackRows].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
}

function treasuryCashFlowRows(transactions = [], expenses = [], callbacks = []) {
  const income = sum(transactions.filter((row) => normalizePerformanceText(row.status) === "posted"), "credit", "amount")
    + sum(callbacks.filter((row) => normalizePerformanceText(row.status) === "posted"), "amount");
  const spend = sum(expenses.filter((row) => !["rejected", "cancelled"].some((word) => normal(row.status).includes(word))), "amount", "expenseTotal");
  return [
    { label: "Income", value: income, color: "#0f766e" },
    { label: "Expenses", value: spend, color: "#c8a24a" },
    { label: "Net cash", value: Math.max(income - spend, 0), color: "#164e63" }
  ];
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
        activeGuarantees: 0,
        activeGuaranteeMembers: [],
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
    const target = ensure(request.loanMemberId, request.borrower);
    target.activeGuarantees += 1;
    target.activeGuaranteeMembers = financeUniquePeople([
      ...target.activeGuaranteeMembers,
      financeMemberIdentity(request.guarantorMemberId, request.guarantor)
    ]);
  });
  return [...rows.values()].sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
}

function memberTransactionSummaryTable(title, rows) {
  const model = financeClickableTableModel(title, rows);
  const allColumns = ["membershipNo", "fullName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "activeLoans", "loanOutstandingBalance", "activeGuarantees"];
  const hidden = new Set(state.financeMemberHiddenColumns || []);
  const columns = allColumns.filter((column) => !hidden.has(column));
  const clickableColumns = new Set(["savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "activeLoans", "loanOutstandingBalance", "activeGuarantees"]);
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
    activeGuarantees: sum(totalRows, "activeGuarantees")
  };
  return `
    ${financeFigureNotice()}
    <div class="column-picker">
      <strong>Show columns</strong>
      ${allColumns.map((column) => `
        <label><input type="checkbox" data-finance-member-column="${escapeHtml(column)}" ${hidden.has(column) ? "" : "checked"}> ${financeMemberColumnLabel(column)}</label>
      `).join("")}
    </div>
    ${financeClickableTableTools(title, model)}
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map((column) => `<th>${financeMemberColumnLabel(column)}</th>`).join("")}</tr></thead>
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
  const content = column === "activeGuarantees"
    ? financeActiveGuarantorContent(row, total)
    : value;
  return `<td><button class="table-action finance-figure-link" type="button" data-row-action="finance-member-detail" data-row-id="${escapeHtml(memberId)}" data-finance-metric="${escapeHtml(column)}" ${disabled ? "disabled" : ""}>${content}</button></td>`;
}

function financeMemberColumnLabel(column) {
  return column === "activeGuarantees" ? "Active guarantors" : tableColumnLabel(column);
}

function financeActiveGuarantorContent(row, total = false) {
  const count = Number(row.activeGuarantees || 0);
  if (total) {
    return `<span class="finance-guarantor-total">${count ? `${count} active` : "None"}</span>`;
  }
  const people = financeUniquePeople(row.activeGuaranteeMembers || []);
  if (!people.length) return "None";
  return `
    <span class="finance-guarantor-list">
      ${people.slice(0, 2).map((person) => `
        <span class="finance-guarantor-chip">
          <span class="finance-guarantor-name">${escapeHtml(person.name || person.display || "-")}</span>
          ${person.code ? `<span class="finance-guarantor-code">${escapeHtml(person.code)}</span>` : ""}
        </span>
      `).join("")}
      ${people.length > 2 ? `<span class="finance-guarantor-more">+${people.length - 2}</span>` : ""}
    </span>
  `;
}

function financeMemberIdentity(memberId, fallbackName = "") {
  const member = dataRows("members").find((item) => item.id === memberId) || {};
  const rawFallback = String(fallbackName || memberName(memberId) || "");
  const fallbackParts = rawFallback.includes(" - ") ? rawFallback.split(" - ") : [];
  const code = member.membershipNo || fallbackParts[0] || "";
  const name = member.fullName || fallbackParts.slice(1).join(" - ") || rawFallback || memberId || "";
  return {
    id: memberId || code || name,
    code,
    name,
    display: code ? `${name} (${code})` : name
  };
}

function financeUniquePeople(people = []) {
  const unique = new Map();
  people.filter(Boolean).forEach((person) => {
    const key = person.id || person.code || person.name || person.display;
    if (key && !unique.has(key)) unique.set(key, person);
  });
  return [...unique.values()];
}

function financeMemberFigureRows({ callbacks, guarantorRequests, loans, memberId, metric, transactions }) {
  if (metric === "loanOutstandingBalance") {
    return financeLoanPaymentHistoryRows({ callbacks, loans, memberId, transactions });
  }
  if (metric === "activeLoans") {
    return (loans || [])
      .filter((loan) => (memberId === "__all__" || loan.memberId === memberId) && financeLoanHasBalance(loan))
      .map((loan) => ({
        ...loan,
        applicationNo: loanApplicationCode(loan),
        memberName: loan.memberName || memberName(loan.memberId),
        outstandingBalance: financeLoanBalance(loan),
        action: loan.id ? "loan-detail" : "none",
        actionLabel: "Open",
        actionId: loan.id
      }))
      .sort((a, b) => String(a.memberName || "").localeCompare(String(b.memberName || "")));
  }
  if (metric === "activeGuarantees") {
    return financeUnclearedGuaranteeRows(loans, guarantorRequests)
      .filter((request) => memberId === "__all__" || request.loanMemberId === memberId)
      .sort((a, b) => String(a.borrower || "").localeCompare(String(b.borrower || "")));
  }
  return financeTransactionsForSelection(transactions, callbacks, "__all__", metric, memberId);
}

function financeLoanPaymentHistoryRows({ callbacks = [], loans = [], memberId = "__all__", transactions = [] }) {
  const activeLoans = (loans || [])
    .filter((loan) => (memberId === "__all__" || loan.memberId === memberId) && financeLoanHasBalance(loan));
  const loanIds = new Set(activeLoans.map((loan) => loan.id).filter(Boolean));
  const loanById = new Map(activeLoans.map((loan) => [loan.id, loan]));
  const loanByMemberId = new Map(activeLoans.map((loan) => [loan.memberId, loan]));
  const paymentsByLoanId = new Map();

  const appendPayment = (sourceRow, source) => {
    const sourceLoanId = sourceRow.loanId || sourceRow.resourceId || "";
    const loan = (sourceLoanId && loanById.get(sourceLoanId)) || loanByMemberId.get(sourceRow.memberId);
    if (!loan) return;
    const amount = Number(sourceRow.amount || sourceRow.credit || 0);
    if (!amount) return;
    const paymentDate = sourceRow.receivedAt || sourceRow.postedAt || sourceRow.transactionDate || sourceRow.createdAt;
    if (!sourceLoanId && paymentDate && financeLoanEventDate(loan) && new Date(paymentDate).getTime() < new Date(financeLoanEventDate(loan)).getTime()) return;
    const row = {
      loanId: loan.id,
      applicationNo: loanApplicationCode(loan),
      memberName: loan.memberName || memberName(loan.memberId),
      product: loan.product || "Loan",
      reference: sourceRow.reference || sourceRow.externalReference || sourceRow.providerReference || sourceRow.id,
      date: paymentDate,
      entry: "Payment received",
      paymentRoute: sourceRow.paymentRoute || sourceRow.channel || sourceRow.provider || source,
      loanReceived: 0,
      payment: amount,
      totalPayable: financeLoanTotalPayable(loan),
      paidToDate: Number(loan.repaymentTotal || loan.repayments || 0),
      outstandingBalance: financeLoanBalance(loan),
      status: sourceRow.status || "posted",
      action: loan.id ? "loan-detail" : "none",
      actionLabel: "Open loan",
      actionId: loan.id
    };
    const key = `${row.loanId}:${row.reference}:${row.payment}:${row.date}`;
    const paymentRows = paymentsByLoanId.get(loan.id) || new Map();
    if (!paymentRows.has(key)) paymentRows.set(key, row);
    paymentsByLoanId.set(loan.id, paymentRows);
  };

  (dataRows("loanRepayments") || [])
    .filter((row) => loanIds.has(row.loanId) && normalizePerformanceText(row.status || "posted") === "posted")
    .forEach((row) => appendPayment(row, "Loan repayment"));
  (transactions || [])
    .filter((row) => normalizePerformanceText(row.status) === "posted" && financeRecordMatchesMetric(row, "loanRepayments"))
    .forEach((row) => appendPayment(row, "Treasurer cash"));
  (callbacks || [])
    .filter((row) => normalizePerformanceText(row.status) === "posted" && financeRecordMatchesMetric(row, "loanRepayments"))
    .forEach((row) => appendPayment(row, "Mobile money"));

  return activeLoans.flatMap((loan) => financeLoanLedgerRows(loan, [...(paymentsByLoanId.get(loan.id)?.values() || [])]));
}

function financeLoanLedgerRows(loan, paymentRows = []) {
  const totalPayable = financeLoanTotalPayable(loan);
  let runningBalance = totalPayable;
  const base = {
    loanId: loan.id,
    applicationNo: loanApplicationCode(loan),
    memberName: loan.memberName || memberName(loan.memberId),
    product: loan.product || "Loan",
    totalPayable,
    paidToDate: Number(loan.repaymentTotal || loan.repayments || 0),
    action: loan.id ? "loan-detail" : "none",
    actionLabel: "Open loan",
    actionId: loan.id
  };
  const ledger = [{
    ...base,
    date: financeLoanEventDate(loan),
    entry: "Loan received",
    reference: loan.disbursementReference || loanApplicationCode(loan),
    paymentRoute: loan.disbursementChannel || loan.channel || "SACCO disbursement",
    loanReceived: Number(loan.amount || loan.requestedAmount || 0),
    payment: 0,
    outstandingBalance: runningBalance,
    status: loan.status || "active"
  }];

  paymentRows
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
    .forEach((row) => {
      runningBalance = Math.max(runningBalance - Number(row.payment || 0), 0);
      ledger.push({
        ...base,
        ...row,
        outstandingBalance: runningBalance,
        status: row.status || "posted"
      });
    });

  if (paymentRows.length && Math.abs(runningBalance - financeLoanBalance(loan)) > 0.01) {
    ledger.push({
      ...base,
      date: "",
      entry: "Balance reconciliation",
      reference: "Saved loan balance",
      paymentRoute: "-",
      loanReceived: 0,
      payment: 0,
      outstandingBalance: financeLoanBalance(loan),
      status: "balance carried"
    });
  }
  return ledger;
}

function financeUnclearedGuaranteeRows(loans = [], guarantorRequests = []) {
  const loansById = new Map((loans || []).map((loan) => [loan.id, loan]));
  return (guarantorRequests || [])
    .filter((request) => {
      const loan = request.loan || loansById.get(request.loanId);
      const status = normal(`${request.status || ""} ${request.guarantorReadiness || ""}`);
      return status.includes("accepted")
        && financeLoanHasBalance(loan)
        && !["rejected", "cancelled", "released", "cleared"].some((word) => status.includes(word));
    })
    .map((request) => {
      const loan = request.loan || loansById.get(request.loanId) || {};
      const guarantor = financeMemberIdentity(request.memberId, request.memberName);
      const borrower = financeMemberIdentity(loan.memberId, loan.memberName);
      return {
        ...request,
        guarantorMemberId: request.memberId,
        loanMemberId: loan.memberId,
        memberName: guarantor.display,
        guarantor: guarantor.display,
        borrower: borrower.display,
        product: loan.product || request.product || "Loan",
        loanAmount: Number(loan.amount || loan.requestedAmount || 0),
        outstandingBalance: financeLoanBalance(loan),
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
  const total = financeLoanTotalPayable(loan);
  const derived = total > 0 ? Math.max(total - Number(loan.repaymentTotal || 0), 0) : null;
  if (recorded !== undefined && recorded !== null && recorded !== "") {
    const recordedBalance = Math.max(Number(recorded || 0), 0);
    return derived === null ? recordedBalance : Math.min(recordedBalance, derived);
  }
  return derived === null ? 0 : derived;
}

function financeLoanTotalPayable(loan) {
  return Number(loan?.totalPayable || 0) || Number(loan?.amount || loan?.requestedAmount || 0) + Number(loan?.interestAmount || 0) + Number(loan?.chargesAmount || 0);
}

function financeLoanEventDate(loan) {
  return loan?.disbursedAt || loan?.approvedAt || loan?.createdAt || loan?.updatedAt || "";
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
    .filter((row) => includeMember(row) && includeMonth(row.postedAt || row.transactionDate || row.createdAt) && normalizePerformanceText(row.status) === "posted" && financeRecordMatchesMetric(row, metric))
    .map((row) => ({
      reference: row.reference,
      postedAt: row.postedAt || row.transactionDate || row.createdAt,
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
  const typeText = normalizePerformanceText(`${row.type || ""} ${row.purpose || ""}`);
  if (typeText.includes("savings") || typeText.includes("saving")) return metric === "savingsDeposits";
  if (typeText.includes("share")) return metric === "shareDeposits";
  if (typeText.includes("welfare")) return metric === "welfareDeposits";
  if (typeText.includes("loan") || typeText.includes("repayment")) return metric === "loanRepayments";
  const text = normalizePerformanceText(`${row.description || ""} ${row.narration || ""}`);
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
  const columns = metric === "activeLoans"
    ? ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "monthlyInstallment", "nextDueDate", "status"]
    : metric === "loanOutstandingBalance"
      ? ["applicationNo", "memberName", "product", "date", "entry", "reference", "paymentRoute", "loanReceived", "payment", "totalPayable", "outstandingBalance", "status"]
    : metric === "activeGuarantees"
      ? ["guarantor", "borrower", "product", "loanAmount", "outstandingBalance", "status"]
      : ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "status"];
  const copy = metric === "loanOutstandingBalance"
    ? "Loan payment history to date for the selected member balance. Open the loan for the full repayment schedule."
    : "Records used to calculate the figure selected in the Finance overview.";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(label)}</h2>
          <p>${escapeHtml(copy)}</p>
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
    .forEach((row) => countMonth(row.postedAt || row.transactionDate || row.createdAt));
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
