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
  const members = dataRows("members");
  const transactions = dataRows("transactions");
  const loans = dataRows("loans");
  const monthlyPerformance = buildSaccoMonthlyPerformanceRows({
    callbacks: dataRows("mobileMoneyCallbacks"),
    memberName,
    transactions
  });
  const dashboard = buildSaccoAdminDashboardSummary({ loans, members, transactions });
  return `
    ${saccoRoleContractMarkers()}
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
  const journalEntries = dataRows("journalEntries");
  const expenses = dataRows("expenses");
  const reconciliation = state.data.reconciliation || {};
  const dashboard = buildSaccoAccountantDashboardSummary({
    chartOfAccounts: dataRows("chartOfAccounts"),
    expenses,
    journalEntries,
    reconciliation
  });
  return `
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
  const transactions = dataRows("transactions");
  const dashboard = buildSaccoTellerDashboardModel({ currentUserId: state.user?.id, members: dataRows("members"), transactions });
  return `
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
  const loans = dataRows("loans");
  const dashboard = buildSaccoLoansOfficerDashboardModel(loans);
  return `
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
  const auditEvents = dataRows("auditEvents");
  const transactions = dataRows("transactions");
  const dashboard = buildSaccoAuditorDashboardModel({ auditEvents, chartOfAccounts: dataRows("chartOfAccounts"), transactions });
  return `
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
  const loans = dataRows("loans");
  const transactions = dataRows("transactions");
  const dashboard = buildSaccoChairpersonDashboardModel({ governanceMeetings: dataRows("governanceMeetings"), loans, transactions });
  return `
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
  const transactions = dataRows("transactions");
  const callbacks = dataRows("mobileMoneyCallbacks");
  const monthlyPerformance = buildSaccoMonthlyPerformanceRows({
    callbacks,
    memberName,
    transactions
  });
  const treasurer = buildSaccoTreasurerDashboardModel({
    callbacks,
    members: dataRows("members"),
    pendingTransactions: pendingTransactions(),
    transactions
  });
  return `
    ${saccoRoleFocusPanel("SACCO Treasurer", "Treasurer daily control", "Daily collections, approvals, receipts and reconciliation watch.")}
    <div class="dashboard-grid">
      ${summaryLink("Total savings", money.format(treasurer.totalSavings), "Member deposits", "Statements", "savings")}
      ${summaryLink("Collections", money.format(treasurer.collections), "Posted inflows", "Open", "transactions")}
      ${summaryLink("Pending approvals", treasurer.pendingApprovals, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money exceptions", treasurer.mobileMoneyExceptions, "Provider callbacks needing action", "Reconcile", "reconciliation")}
    </div>
    <div class="grid two">
      ${depositsTrendChartPanel(monthlyPerformance)}
      ${collectionsByChannelPanel(monthlyPerformance)}
    </div>
    ${saccoMonthlyPerformancePanel(monthlyPerformance)}
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Treasurer reconciliation watch</h2>
          <p>Review mobile-money exceptions, pending approvals and receipt evidence before close of day.</p>
        </div>
        <span class="status ${treasurer.mobileMoneyExceptions || treasurer.pendingApprovals ? "pending" : "active"}">${treasurer.mobileMoneyExceptions || treasurer.pendingApprovals ? "Review" : "Clear"}</span>
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Member monthly performance", monthlyPerformance, ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"])}
      ${recordTable("Finance approval queue", pendingTransactions(), ["reference", "memberName", "type", "amount", "channel", "status"])}
      ${recordTable("Reconciliation watch", [...treasurer.failedCallbacks, ...callbacks].slice(0, 12), ["externalReference", "provider", "purpose", "amount", "status", "receivedAt"])}
    </div>
  `;
}

function saccoSecretaryDashboard() {
  const members = dataRows("members");
  const governance = dataRows("governanceMeetings");
  const secretary = buildSaccoSecretaryDashboardModel({ complaints: openComplaints(), governanceMeetings: governance, members });
  return `
    ${saccoRoleFocusPanel("SACCO Secretary", "Secretary office focus", "Member records, KYC follow-up, complaints and governance documentation.")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", secretary.totalMembers, "Member register", "Open", "members")}
      ${summaryLink("Members to verify", secretary.membersToVerify, "KYC and onboarding", "Verify", "approvals")}
      ${summaryLink("Open complaints", secretary.openComplaints, "Member support queue", "Open", "complaints")}
      ${summaryLink("Governance records", secretary.governanceRecords, "Meetings and minutes", "Open", "governance")}
    </div>
    <div class="grid two">
      ${recordTable("Member follow-up list", (secretary.pendingKyc.length ? secretary.pendingKyc : members).map((row) => ({ ...row, action: "member-detail", actionLabel: "Open", actionId: row.id })), ["membershipNo", "fullName", "phone", "kycStatus", "status"])}
      ${recordTable("Governance and complaint follow-up", [...openComplaints(), ...governance], ["id", "memberName", "category", "subject", "scheduledAt", "priority", "status"])}
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
