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
  const dashboard = buildSaccoAdminDashboardSummary({ loans, members, transactions });
  return `
    ${dashboardIntro("SACCO Administrator", "Full operating overview for the SACCO.")}
    ${roleAccessPanel("Administrator access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", dashboard.totalMembers, "Membership register", "Open", "members")}
      ${summaryLink("Total savings", money.format(dashboard.totalSavings), "Verified member balances", "Statements", "savings")}
      ${summaryLink("Outstanding loans", money.format(dashboard.outstandingLoans), "Loan portfolio", "Open", "loans")}
      ${summaryLink("Pending approvals", dashboard.pendingApprovals, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money collections", money.format(dashboard.mobileMoneyCollections), "Provider channel", "Reconcile", "reconciliation")}
    </div>
    <div class="grid two">
      ${recordTable("Recent transactions", transactions, ["reference", "memberName", "type", "amount", "status"])}
      ${recordTable("Loan work queue", loans, ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
    </div>
  `;
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
    ${dashboardIntro("SACCO Accountant", "Ledger, expenses, reconciliation and reports.")}
    ${roleAccessPanel("Accountant access")}
    <div class="dashboard-grid">
      ${summaryLink("Journal entries", dashboard.journalEntries, "Posted ledger activity", "Open", "accounting")}
      ${summaryLink("Expenses posted", money.format(dashboard.expensesPosted), "Operating spend", "Capture", "accounting")}
      ${summaryLink("Reconciliation exceptions", dashboard.reconciliationExceptions, "Bank and mobile-money", "Match", "reconciliation")}
      ${summaryLink("Reports", dashboard.reports, "Financial reporting", "View", "reports")}
    </div>
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
    ${dashboardIntro("SACCO Teller", "Record member deposits and repayments.")}
    ${roleAccessPanel("Teller access")}
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
    ${dashboardIntro("SACCO Loans Officer", "Loan applications, guarantors and repayment tracking.")}
    ${roleAccessPanel("Loans Officer access")}
    <div class="dashboard-grid">
      ${summaryLink("Loan applications", dashboard.loanApplications, "Capture and appraise", "Open", "loans")}
      ${summaryLink("Awaiting approval", dashboard.awaitingApproval, "Prepared for chairperson", "Track", "loans")}
      ${summaryLink("Need guarantor", dashboard.needGuarantorCount, "Guarantee follow-up", "Review", "guarantors")}
      ${summaryLink("Arrears watch", dashboard.arrearsWatch, "Repayment follow-up", "Assess", "loans")}
    </div>
    ${recordTable("Loan work queue", loans.map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Open", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "status"])}
  `;
}

function saccoAuditorDashboard() {
  const auditEvents = dataRows("auditEvents");
  const transactions = dataRows("transactions");
  const dashboard = buildSaccoAuditorDashboardModel({ auditEvents, chartOfAccounts: dataRows("chartOfAccounts"), transactions });
  return `
    ${dashboardIntro("SACCO Auditor", "Read-only oversight of activity, exceptions and the audit trail.")}
    ${roleAccessPanel("Auditor access")}
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
    ${dashboardIntro("SACCO Chairperson", "Loan approvals, portfolio health and governance.")}
    ${roleAccessPanel("Chairperson access")}
    <div class="dashboard-grid">
      ${summaryLink("Loans awaiting approval", dashboard.loansAwaitingApproval, "Chairperson approval queue", "Decide", "approvals")}
      ${summaryLink("Outstanding portfolio", money.format(dashboard.outstandingPortfolio), "Credit exposure", "Review", "loans")}
      ${summaryLink("Arrears watch", dashboard.arrearsWatch, "Loans needing board attention", "Assess", "loans")}
      ${summaryLink("Governance actions", dashboard.governanceActions, "Meetings and resolutions", "Open", "governance")}
    </div>
    <div class="grid two">
      ${recordTable("Loans awaiting approval", dashboard.approvalLoans.map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Decide", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
      ${recordTable("Board risk watch", [...dashboard.arrearsLoans, ...dashboard.highValueTransactions], ["applicationNo", "reference", "memberName", "product", "amount", "outstandingBalance", "status"])}
    </div>
  `;
}

function saccoTreasurerDashboard() {
  const transactions = dataRows("transactions");
  const callbacks = dataRows("mobileMoneyCallbacks");
  const treasurer = buildSaccoTreasurerDashboardModel({
    callbacks,
    members: dataRows("members"),
    pendingTransactions: pendingTransactions(),
    transactions
  });
  return `
    ${dashboardIntro("SACCO Treasurer", "Cash, collections, approvals and reconciliation.")}
    ${roleAccessPanel("Treasurer access")}
    <div class="dashboard-grid">
      ${summaryLink("Total savings", money.format(treasurer.totalSavings), "Member deposits", "Statements", "savings")}
      ${summaryLink("Collections", money.format(treasurer.collections), "Posted inflows", "Open", "transactions")}
      ${summaryLink("Pending approvals", treasurer.pendingApprovals, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money exceptions", treasurer.mobileMoneyExceptions, "Provider callbacks needing action", "Reconcile", "reconciliation")}
    </div>
    <div class="grid two">
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
    ${dashboardIntro("SACCO Secretary", "Membership, KYC, complaints and governance.")}
    ${roleAccessPanel("Secretary access")}
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
