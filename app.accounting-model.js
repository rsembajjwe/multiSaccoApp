function buildAccountingSummary(input) {
  const unbalanced = input.journals.filter((journal) => journal.isBalanced === false || Number(journal.debitTotal || 0) !== Number(journal.creditTotal || 0));
  return {
    accountCount: input.accounts.length,
    assetTotal: sumAccountingModelMoney(input.assets, "netBookValue", "cost"),
    closedPeriods: input.periods.filter((period) => normalizeAccountingModelText(period.status) === "closed").length,
    expenseTotal: sumAccountingModelMoney(input.expenses, "amount"),
    journalCount: input.journals.length,
    openPeriods: input.periods.filter((period) => normalizeAccountingModelText(period.status) === "open").length,
    periodCount: input.periods.length,
    unbalancedCount: unbalanced.length
  };
}

function buildReconciliationReviewModel(input) {
  const reconciliation = input.reconciliation || {};
  const summaryData = reconciliation.summary || {};
  const matches = Array.isArray(reconciliation.matches) ? reconciliation.matches : [];
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines : [];
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines : [];
  const callbackExceptions = input.callbacks.filter((row) => !normalizeAccountingModelText(row.status).includes("posted") || row.duplicate);
  const pendingPaymentRequests = input.paymentRequests.filter((row) => !normalizeAccountingModelText(row.status).includes("posted"));
  const failedPaymentRequests = input.paymentRequests.filter((row) => ["failed", "expired", "cancelled"].includes(normalizeAccountingModelText(row.status)));
  const exceptionCount = Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length)
    + Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length)
    + callbackExceptions.length
    + pendingPaymentRequests.length;
  return {
    callbackExceptions,
    exceptionCount,
    failedPaymentRequests,
    matches,
    matchedCoverage: reconciliationCoverage(summaryData),
    paymentRequestRows: buildPaymentRequestReviewRows(input.paymentRequests, input.labelize),
    pendingPaymentRequests,
    summaryData,
    unmatchedLedgerLines,
    unmatchedStatementLines
  };
}

function buildPaymentRequestReviewRows(requests, labelize) {
  const terminalStatuses = new Set(["posted", "failed", "expired", "cancelled"]);
  return (requests || []).map((row) => {
    const status = normalizeAccountingModelText(row.status);
    const open = !terminalStatuses.has(status);
    const providerIssue = normalizeAccountingModelText(row.statusMessage).includes("provider status check failed");
    return {
      ...row,
      reviewStatus: providerIssue ? "Provider check failed" : open ? "Needs provider check" : labelize(row.status || "closed"),
      action: open ? "payment-provider-status" : "none",
      actionLabel: open ? "Check status" : "Closed",
      actionId: row.id
    };
  });
}

function accountingAccountOptions(accounts, type, excludedCodes = []) {
  const excluded = new Set(excludedCodes.map((code) => normalizeAccountingModelText(code)));
  return accounts
    .filter((account) => normalizeAccountingModelText(account.type) === normalizeAccountingModelText(type))
    .filter((account) => !excluded.has(normalizeAccountingModelText(account.code)))
    .map((account) => ({
      ...account,
      code: account.code,
      name: account.name,
      type: account.type,
      label: `${account.code || ""} - ${account.name || ""}`.trim()
    }));
}

function assetCategoryOptions() {
  return ["equipment", "furniture", "vehicle", "building", "technology", "other"];
}

function buildReconciliationMatchRows(matches) {
  return (matches || []).map((match) => {
    const statementLine = match.statementLine || {};
    const ledgerLine = match.ledgerLine || {};
    return {
      externalReference: statementLine.externalReference || ledgerLine.reference,
      statementAmount: statementLine.amount,
      ledgerAmount: ledgerLine.amount,
      accountCode: statementLine.accountCode || ledgerLine.accountCode,
      sourceType: ledgerLine.sourceType,
      postedAt: ledgerLine.postedAt || statementLine.statementDate
    };
  });
}

function reconciliationCoverage(summaryData) {
  const statementTotal = Number(summaryData.statementLines || 0);
  const ledgerTotal = Number(summaryData.ledgerLines || 0);
  const matched = Number(summaryData.matched || 0);
  return Math.round((matched / Math.max(statementTotal, ledgerTotal, 1)) * 100);
}

function sumAccountingModelMoney(rows, ...keys) {
  return rows.reduce((total, row) => {
    const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    return total + Number(value || 0);
  }, 0);
}

function normalizeAccountingModelText(value) {
  return String(value || "").toLowerCase();
}
