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

function buildLedgerAccountBalances(journals, accounts) {
  const chart = new Map();
  (accounts || []).forEach((account) => {
    const code = String(account.code == null ? "" : account.code);
    if (code) chart.set(code, { name: String(account.name == null ? code : account.name), type: normalizeAccountingModelText(account.type) });
  });
  const totals = new Map();
  (journals || [])
    .filter((journal) => normalizeAccountingModelText(journal.status) === "posted")
    .forEach((journal) => {
      const lines = Array.isArray(journal.lines) ? journal.lines : [];
      lines.forEach((line) => {
        const code = String(line.accountCode == null ? "" : line.accountCode);
        if (!code) return;
        const running = totals.get(code) || { debit: 0, credit: 0 };
        running.debit += Number(line.debit || 0);
        running.credit += Number(line.credit || 0);
        totals.set(code, running);
        if (!chart.has(code)) chart.set(code, { name: String(line.accountName == null ? code : line.accountName), type: normalizeAccountingModelText(line.accountType) });
      });
    });
  return [...totals.entries()]
    .map(([code, running]) => {
      const meta = chart.get(code) || { name: code, type: "" };
      return { code, name: meta.name, type: meta.type, debit: running.debit, credit: running.credit, net: running.debit - running.credit };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function buildTrialBalance(journals, accounts) {
  const rows = buildLedgerAccountBalances(journals, accounts)
    .filter((balance) => Math.abs(balance.debit) > 0.005 || Math.abs(balance.credit) > 0.005)
    .map((balance) => ({ code: balance.code, name: balance.name, type: balance.type, debit: balance.net > 0 ? balance.net : 0, credit: balance.net < 0 ? -balance.net : 0 }));
  const totalDebit = rows.reduce((total, row) => total + row.debit, 0);
  const totalCredit = rows.reduce((total, row) => total + row.credit, 0);
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}

function buildIncomeStatement(journals, accounts) {
  const balances = buildLedgerAccountBalances(journals, accounts);
  const income = balances.filter((b) => b.type === "income").map((b) => ({ code: b.code, name: b.name, amount: -b.net })).filter((i) => Math.abs(i.amount) > 0.005);
  const expenses = balances.filter((b) => b.type === "expense").map((b) => ({ code: b.code, name: b.name, amount: b.net })).filter((i) => Math.abs(i.amount) > 0.005);
  const totalIncome = income.reduce((total, i) => total + i.amount, 0);
  const totalExpense = expenses.reduce((total, e) => total + e.amount, 0);
  return { income, expenses, totalIncome, totalExpense, netSurplus: totalIncome - totalExpense };
}

function buildBalanceSheet(journals, accounts) {
  const balances = buildLedgerAccountBalances(journals, accounts);
  const assets = balances.filter((b) => b.type === "asset").map((b) => ({ code: b.code, name: b.name, amount: b.net })).filter((i) => Math.abs(i.amount) > 0.005);
  const liabilities = balances.filter((b) => b.type === "liability").map((b) => ({ code: b.code, name: b.name, amount: -b.net })).filter((i) => Math.abs(i.amount) > 0.005);
  const equityAccounts = balances.filter((b) => b.type === "equity").map((b) => ({ code: b.code, name: b.name, amount: -b.net })).filter((i) => Math.abs(i.amount) > 0.005);
  const netSurplus = buildIncomeStatement(journals, accounts).netSurplus;
  const equity = Math.abs(netSurplus) > 0.005 ? [...equityAccounts, { code: "", name: "Current period surplus", amount: netSurplus }] : equityAccounts;
  const totalAssets = assets.reduce((total, i) => total + i.amount, 0);
  const totalLiabilities = liabilities.reduce((total, i) => total + i.amount, 0);
  const totalEquity = equity.reduce((total, i) => total + i.amount, 0);
  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, netSurplus, balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01 };
}

function normalizeAccountingModelText(value) {
  return String(value || "").toLowerCase();
}
