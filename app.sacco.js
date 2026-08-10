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
  return `
    ${dashboardIntro("SACCO Administrator", "Full operating overview for the SACCO.")}
    ${roleAccessPanel("Administrator access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", members.length, "Membership register", "Open", "members")}
      ${summaryLink("Total savings", money.format(sum(members, "savingsBalance", "savings")), "Verified member balances", "Statements", "savings")}
      ${summaryLink("Outstanding loans", money.format(sum(loans, "outstandingBalance", "balance")), "Loan portfolio", "Open", "loans")}
      ${summaryLink("Pending approvals", transactions.filter((t) => normal(t.status).includes("pending")).length, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money collections", money.format(sum(transactions.filter((t) => normal(t.channel).includes("mobile")), "amount")), "Provider channel", "Reconcile", "reconciliation")}
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
  const exceptions = (reconciliation.unmatchedStatementLines?.length || 0) + (reconciliation.unmatchedLedgerLines?.length || 0);
  return `
    ${dashboardIntro("SACCO Accountant", "Ledger, expenses, reconciliation and reports.")}
    ${roleAccessPanel("Accountant access")}
    <div class="dashboard-grid">
      ${summaryLink("Journal entries", journalEntries.length, "Posted ledger activity", "Open", "accounting")}
      ${summaryLink("Expenses posted", money.format(sum(expenses, "amount", "totalAmount")), "Operating spend", "Capture", "accounting")}
      ${summaryLink("Reconciliation exceptions", exceptions, "Bank and mobile-money", "Match", "reconciliation")}
      ${summaryLink("Reports", dataRows("chartOfAccounts").length, "Financial reporting", "View", "reports")}
    </div>
    <div class="grid two">
      ${recordTable("Recent journal entries", journalEntries, ["reference", "description", "debit", "credit", "postedAt"])}
      ${recordTable("Recent expenses", expenses, ["reference", "accountCode", "amount", "channel", "expenseDate", "status"])}
    </div>
  `;
}

function saccoTellerDashboard() {
  const transactions = dataRows("transactions");
  const myCaptures = transactions.filter((row) => row.makerUserId === state.user?.id);
  const pending = myCaptures.filter((row) => normal(row.status).includes("pending"));
  return `
    ${dashboardIntro("SACCO Teller", "Record member deposits and repayments.")}
    ${roleAccessPanel("Teller access")}
    <div class="dashboard-grid">
      ${summaryLink("Record a transaction", "Open", "Capture deposit or repayment", "Capture", "transactions")}
      ${summaryLink("My captures", myCaptures.length, "Submitted this session", "Review", "transactions")}
      ${summaryLink("Awaiting approval", pending.length, "Sent to Treasurer/Admin", "Track", "transactions")}
      ${summaryLink("Members", dataRows("members").length, "Member lookup", "Open", "members")}
    </div>
    ${myCaptures.length
      ? recordTable("My recent captures", myCaptures, ["reference", "memberName", "type", "amount", "channel", "status"])
      : emptyState("No captures yet", "Use Transactions to record a member deposit or repayment for approval.")}
  `;
}

function saccoLoansOfficerDashboard() {
  const loans = dataRows("loans");
  const submitted = loans.filter((row) => ["submitted", "review", "pending"].some((word) => normal(row.status).includes(word)));
  const arrears = loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normal(`${row.status} ${row.scheduleStatus}`).includes(word)));
  const needGuarantor = submitted.filter((row) => Number(row.guarantors || 0) < 1);
  return `
    ${dashboardIntro("SACCO Loans Officer", "Loan applications, guarantors and repayment tracking.")}
    ${roleAccessPanel("Loans Officer access")}
    <div class="dashboard-grid">
      ${summaryLink("Loan applications", loans.length, "Capture and appraise", "Open", "loans")}
      ${summaryLink("Awaiting approval", submitted.length, "Prepared for chairperson", "Track", "loans")}
      ${summaryLink("Need guarantor", needGuarantor.length, "Guarantee follow-up", "Review", "guarantors")}
      ${summaryLink("Arrears watch", arrears.length, "Repayment follow-up", "Assess", "loans")}
    </div>
    ${recordTable("Loan work queue", loans.map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Open", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "status"])}
  `;
}

function saccoAuditorDashboard() {
  const auditEvents = dataRows("auditEvents");
  const transactions = dataRows("transactions");
  const reversals = transactions.filter((row) => row.originalTransactionId || normal(row.status).includes("reversed"));
  const highValue = transactions.filter((row) => Number(row.amount || row.credit || row.debit || 0) >= 1000000);
  return `
    ${dashboardIntro("SACCO Auditor", "Read-only oversight of activity, exceptions and the audit trail.")}
    ${roleAccessPanel("Auditor access")}
    <div class="dashboard-grid">
      ${summaryLink("Audit events", auditEvents.length, "Sensitive activity trail", "Open", "audit")}
      ${summaryLink("Reversals", reversals.length, "Corrections with reason", "Review", "transactions")}
      ${summaryLink("High-value transactions", highValue.length, "Large movements", "Review", "transactions")}
      ${summaryLink("Reports", dataRows("chartOfAccounts").length, "Operational and financial", "View", "reports")}
    </div>
    <div class="grid two">
      ${recordTable("Recent audit events", auditEvents, ["action", "resourceType", "actorName", "createdAt"])}
      ${recordTable("High-value transactions", highValue, ["reference", "memberName", "type", "amount", "status"])}
    </div>
  `;
}

function saccoChairpersonDashboard() {
  const loans = dataRows("loans");
  const transactions = dataRows("transactions");
  const members = dataRows("members");
  const approvalLoans = loans.filter((row) => ["pending", "review", "approval", "submitted"].some((word) => normal(`${row.status} ${row.stage}`).includes(word)));
  const arrearsLoans = loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normal(`${row.status} ${row.riskLevel}`).includes(word)));
  const highValueTransactions = transactions.filter((row) => Number(row.amount || row.credit || row.debit || 0) >= 1000000);
  const governance = dataRows("governanceMeetings");
  return `
    ${dashboardIntro("SACCO Chairperson", "Loan approvals, portfolio health and governance.")}
    ${roleAccessPanel("Chairperson access")}
    <div class="dashboard-grid">
      ${summaryLink("Loans awaiting approval", approvalLoans.length, "Chairperson approval queue", "Decide", "approvals")}
      ${summaryLink("Outstanding portfolio", money.format(sum(loans, "outstandingBalance", "balance")), "Credit exposure", "Review", "loans")}
      ${summaryLink("Arrears watch", arrearsLoans.length, "Loans needing board attention", "Assess", "loans")}
      ${summaryLink("Governance actions", governance.length, "Meetings and resolutions", "Open", "governance")}
    </div>
    <div class="grid two">
      ${recordTable("Loans awaiting approval", approvalLoans.map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Decide", actionId: row.id })), ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
      ${recordTable("Board risk watch", [...arrearsLoans, ...highValueTransactions], ["applicationNo", "reference", "memberName", "product", "amount", "outstandingBalance", "status"])}
    </div>
  `;
}

function saccoTreasurerDashboard() {
  const transactions = dataRows("transactions");
  const callbacks = dataRows("mobileMoneyCallbacks");
  const accounts = dataRows("financialAccounts");
  const reconciliation = state.data.reconciliation || {};
  const expenses = dataRows("expenses");
  const cashAccounts = accounts.filter((row) => ["cash", "bank", "mobile"].some((word) => normal(`${row.accountType} ${row.productType} ${row.name}`).includes(word)));
  const failedCallbacks = callbacks.filter((row) => ["failed", "exception", "pending"].some((word) => normal(row.status).includes(word)));
  const monthlyPerformance = saccoMonthlyPerformanceRows();
  return `
    ${dashboardIntro("SACCO Treasurer", "Cash, collections, approvals and reconciliation.")}
    ${roleAccessPanel("Treasurer access")}
    <div class="dashboard-grid">
      ${summaryLink("Total savings", money.format(sum(dataRows("members"), "savingsBalance", "savings")), "Member deposits", "Statements", "savings")}
      ${summaryLink("Collections", money.format(sum(transactions.filter((row) => Number(row.credit || 0) > 0), "credit", "amount")), "Posted inflows", "Open", "transactions")}
      ${summaryLink("Pending approvals", pendingTransactions().length, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money exceptions", failedCallbacks.length, "Provider callbacks needing action", "Reconcile", "reconciliation")}
    </div>
    <div class="grid two">
      ${recordTable("Finance approval queue", pendingTransactions(), ["reference", "memberName", "type", "amount", "channel", "status"])}
      ${recordTable("Reconciliation watch", [...failedCallbacks, ...callbacks].slice(0, 12), ["externalReference", "provider", "purpose", "amount", "status", "receivedAt"])}
    </div>
  `;
}

function saccoSecretaryDashboard() {
  const members = dataRows("members");
  const pendingKyc = members.filter((row) => normal(row.kycStatus).includes("pending") || normal(row.status).includes("pending"));
  const governance = dataRows("governanceMeetings");
  const recentNotifications = dataRows("notifications");
  return `
    ${dashboardIntro("SACCO Secretary", "Membership, KYC, complaints and governance.")}
    ${roleAccessPanel("Secretary access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", members.length, "Member register", "Open", "members")}
      ${summaryLink("Members to verify", pendingKyc.length, "KYC and onboarding", "Verify", "approvals")}
      ${summaryLink("Open complaints", openComplaints().length, "Member support queue", "Open", "complaints")}
      ${summaryLink("Governance records", governance.length, "Meetings and minutes", "Open", "governance")}
    </div>
    <div class="grid two">
      ${recordTable("Member follow-up list", (pendingKyc.length ? pendingKyc : members).map((row) => ({ ...row, action: "member-detail", actionLabel: "Open", actionId: row.id })), ["membershipNo", "fullName", "phone", "kycStatus", "status"])}
      ${recordTable("Governance and complaint follow-up", [...openComplaints(), ...governance], ["id", "memberName", "category", "subject", "scheduledAt", "priority", "status"])}
    </div>
  `;
}
