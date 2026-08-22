function buildSaccoAdminDashboardSummary(input) {
  return {
    mobileMoneyCollections: sumSaccoModelValues(input.transactions.filter((transaction) => normalizeSaccoModelText(transaction.channel).includes("mobile")), "amount"),
    outstandingLoans: sumSaccoModelValues(input.loans, "outstandingBalance", "balance"),
    pendingApprovals: pendingSaccoModelTransactions(input.transactions).length,
    totalMembers: input.members.length,
    totalSavings: sumSaccoModelValues(input.members, "savingsBalance", "savings")
  };
}

function buildSaccoAccountantDashboardSummary(input) {
  const reconciliation = input.reconciliation || {};
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines.length : 0;
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines.length : 0;
  return {
    expensesPosted: sumSaccoModelValues(input.expenses, "amount", "totalAmount"),
    journalEntries: input.journalEntries.length,
    reconciliationExceptions: unmatchedStatementLines + unmatchedLedgerLines,
    reports: input.chartOfAccounts.length
  };
}

function buildSaccoTellerDashboardModel(input) {
  const myCaptures = input.transactions.filter((row) => row.makerUserId === input.currentUserId);
  return {
    awaitingApproval: pendingSaccoModelTransactions(myCaptures).length,
    members: input.members.length,
    myCaptures,
    myCaptureCount: myCaptures.length
  };
}

function buildSaccoLoansOfficerDashboardModel(loans) {
  const submitted = loans.filter((row) => ["submitted", "review", "pending"].some((word) => normalizeSaccoModelText(row.status).includes(word)));
  const arrears = loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normalizeSaccoModelText(`${row.status} ${row.scheduleStatus}`).includes(word)));
  const needGuarantor = submitted.filter((row) => Number(row.guarantors || 0) < 1);
  return {
    arrears,
    arrearsWatch: arrears.length,
    awaitingApproval: submitted.length,
    loanApplications: loans.length,
    needGuarantor,
    needGuarantorCount: needGuarantor.length,
    submitted
  };
}

function buildSaccoAuditorDashboardModel(input) {
  const reversals = input.transactions.filter((row) => row.originalTransactionId || normalizeSaccoModelText(row.status).includes("reversed"));
  const highValue = highValueSaccoModelTransactions(input.transactions);
  return {
    auditEvents: input.auditEvents.length,
    highValue,
    highValueTransactions: highValue.length,
    reports: input.chartOfAccounts.length,
    reversals,
    reversalCount: reversals.length
  };
}

function buildSaccoChairpersonDashboardModel(input) {
  const approvalLoans = input.loans.filter((row) => ["pending", "review", "approval", "submitted"].some((word) => normalizeSaccoModelText(`${row.status} ${row.stage}`).includes(word)));
  const arrearsLoans = input.loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normalizeSaccoModelText(`${row.status} ${row.riskLevel}`).includes(word)));
  return {
    approvalLoans,
    arrearsLoans,
    arrearsWatch: arrearsLoans.length,
    governanceActions: input.governanceMeetings.length,
    highValueTransactions: highValueSaccoModelTransactions(input.transactions),
    loansAwaitingApproval: approvalLoans.length,
    outstandingPortfolio: sumSaccoModelValues(input.loans, "outstandingBalance", "balance")
  };
}

function buildSaccoTreasurerDashboardModel(input) {
  const failedCallbacks = input.callbacks.filter((row) => ["failed", "exception", "pending"].some((word) => normalizeSaccoModelText(row.status).includes(word)));
  const treasurerCashRows = input.transactions.filter((row) => normalizeSaccoModelText(`${row.channel || ""} ${row.paymentRoute || ""} ${row.provider || ""}`).includes("cash"));
  const mobileMoneyRows = input.transactions.filter((row) => normalizeSaccoModelText(`${row.channel || ""} ${row.paymentRoute || ""} ${row.provider || ""}`).includes("mobile"));
  return {
    collections: sumSaccoModelValues(input.transactions.filter((row) => Number(row.credit || 0) > 0), "credit", "amount"),
    failedCallbacks,
    mobileMoney: sumSaccoModelValues(mobileMoneyRows, "credit", "amount"),
    mobileMoneyExceptions: failedCallbacks.length,
    pendingApprovals: input.pendingTransactions.length,
    treasurerCash: sumSaccoModelValues(treasurerCashRows, "credit", "amount"),
    totalSavings: sumSaccoModelValues(input.members, "savingsBalance", "savings")
  };
}

function buildSaccoSecretaryDashboardModel(input) {
  const pendingKyc = input.members.filter((row) => normalizeSaccoModelText(row.kycStatus).includes("pending") || normalizeSaccoModelText(row.status).includes("pending"));
  return {
    governanceRecords: input.governanceMeetings.length,
    membersToVerify: pendingKyc.length,
    openComplaints: input.complaints.length,
    pendingKyc,
    totalMembers: input.members.length
  };
}

function pendingSaccoModelTransactions(rows) {
  return rows.filter((row) => normalizeSaccoModelText(row.status).includes("pending"));
}

function highValueSaccoModelTransactions(rows) {
  return rows.filter((row) => Number(row.amount || row.credit || row.debit || 0) >= 1000000);
}

function sumSaccoModelValues(rows, ...keys) {
  return rows.reduce((total, row) => {
    const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    return total + Number(value || 0);
  }, 0);
}

function normalizeSaccoModelText(value) {
  return String(value || "").toLowerCase();
}
