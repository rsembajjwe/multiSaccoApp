// Member portal rendering helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

function renderMemberView(view) {
  const dash = state.memberData.dashboard || {};
  const balances = state.memberData.balances || dash.balances || {};
  const cycle = typeof currentSaccoCycleContext === "function" ? currentSaccoCycleContext() : null;
  if (view === "home") {
    const cycleModel = memberPortalCycleModel(dash, balances, cycle);
    const savings = Number(cycleModel.balances.savings || 0);
    const savingsHold = Number(balances.savingsHold || 0);
    const availableSavings = balances.availableSavings != null ? Number(balances.availableSavings) : Math.max(savings - savingsHold, 0);
    const recent = cycleModel.lines.slice(0, 6);
    return `
      <section class="panel member-balance">
        <p class="eyebrow">${displayName()} · ${cycle ? `Savings for ${cycle.label}` : t("totalSavings")}</p>
        <h2 class="balance-amount">${money.format(savings)}</h2>
        <p class="balance-breakdown">${t("savings")} ${money.format(savings)} · ${t("shares")} ${money.format(cycleModel.balances.shares || 0)} · ${t("welfare")} ${money.format(cycleModel.balances.welfare || 0)}</p>
        ${savingsHold > 0 ? `<p class="balance-hold">${money.format(savingsHold)} held as loan security · Available ${money.format(availableSavings)}</p>` : ""}
      </section>
      ${memberHomeUpdatePanel(dash, cycleModel.balances, cycle)}
      ${memberQuickActionsPanel()}
      ${recent.length
        ? recordTable(`Recent activity - ${cycle?.label || "current"}`, recent.map((line) => ({ ...line, fundBalance: line.runningBalance })), ["reference", "description", "source", "debit", "credit", "fundBalance", "postedAt"])
        : emptyState("No transactions in this cycle", "Your posted deposits and repayments for the selected cycle will appear here.")}
    `;
  }
  if (view === "money") {
    const cycleModel = memberPortalCycleModel(dash, balances, cycle);
    return memberMoneyView(dash, cycleModel.balances, cycleModel.lines, cycle);
  }
  if (view === "loans") return memberLoansView(cycle);
  if (view === "payments") return memberPaymentsView(cycle);
  if (view === "notifications") return memberNotificationsView(cycle);
  if (view === "complaints") return memberComplaintsView(cycle);
  if (view === "profile") {
    const cycleModel = memberPortalCycleModel(dash, balances, cycle);
    return memberProfileView(cycleModel.balances, cycle);
  }
  if (view === "security") return memberSecurityTabbedView(cycle);
  return moduleBlueprint(view);
}

function memberPortalCycleModel(dash, balances, cycle) {
  const lines = memberLinesWithFundRunningBalances(memberLinesInSelectedCycle(buildMemberStatementLines(dash), cycle))
    .sort((a, b) => new Date(b.postedAt || b.createdAt || 0).getTime() - new Date(a.postedAt || a.createdAt || 0).getTime());
  if (!cycle || cycle.period === "once") return { balances, lines };
  const cycleBalances = lines.reduce((totals, line) => {
    const fund = memberFundCodeForType(line.type);
    const signed = Number(line.credit || 0) - Number(line.debit || 0);
    if (fund === "shares") totals.shares += signed;
    else if (fund === "welfare") totals.welfare += signed;
    else if (fund === "savings") totals.savings += signed;
    return totals;
  }, { savings: 0, shares: 0, welfare: 0 });
  return { balances: cycleBalances, lines };
}

function memberLinesInSelectedCycle(lines, cycle) {
  if (!cycle || cycle.period === "once" || typeof governanceDateFallsInCycle !== "function") return lines || [];
  return (lines || []).filter((line) => {
    const value = line.postedAt || line.createdAt || line.date;
    return value ? governanceDateFallsInCycle(value, cycle) : true;
  });
}

function memberRowsInSelectedCycle(rows, cycle, dateKeys = ["createdAt", "updatedAt"]) {
  if (!cycle || cycle.period === "once" || typeof governanceDateFallsInCycle !== "function") return rows || [];
  return (rows || []).filter((row) => {
    const values = dateKeys.map((key) => row?.[key]).filter(Boolean);
    if (!values.length) return true;
    return values.some((value) => governanceDateFallsInCycle(value, cycle));
  });
}

function memberSelfServiceCycleControls(cycle) {
  if (!cycle) return "";
  const periodLabel = typeof membershipPeriodLabel === "function" ? membershipPeriodLabel(cycle.period) : labelize(cycle.period);
  const selectedYear = Number(cycle.year);
  const selectedMonth = Number(cycle.month);
  return `
    <div class="member-cycle-inline">
      <strong>Account cycle</strong>
      <span>${escapeHtml(periodLabel)}</span>
      ${cycle.period !== "once" ? `<label><span>Year</span><select data-sacco-cycle-year>${governanceCycleYearOptions().map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}</select></label>` : ""}
      ${cycle.period === "monthly" ? `<label><span>Month</span><select data-sacco-cycle-month>${governanceCycleMonthOptions(currentRegion().locale).map(([value, label]) => `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>` : ""}
      <em>${escapeHtml(cycle.label)}</em>
    </div>
  `;
}

function memberHomeUpdatePanel(dash, balances, cycle = null) {
  const loans = memberRowsInSelectedCycle(state.memberData.loans || dash.loans || [], cycle, ["submittedAt", "approvedAt", "disbursedAt", "nextDueDate", "createdAt", "updatedAt"]);
  const notifications = memberRowsInSelectedCycle(state.memberData.notifications || dash.notifications || [], cycle, ["sentAt", "createdAt", "updatedAt", "readAt"]);
  const guarantors = memberRowsInSelectedCycle(state.memberData.pendingGuarantors || dash.pendingGuarantorRequests || [], cycle, ["requestedAt", "createdAt", "updatedAt"]);
  const drafts = memberRowsInSelectedCycle(state.memberData.drafts || [], cycle, ["updatedAt", "createdAt"]);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Balances and requests update</h2>
          <p>Your balances, loans, notifications and guarantee requests are refreshed from the SACCO system.</p>
        </div>
        ${memberSelfServiceCycleControls(cycle)}
      </div>
      <div class="member-dashboard-metrics">
        ${mini("Total savings", money.format(Number(balances.savings || 0)))}
        ${mini("Loans", loans.length)}
        ${mini("Notifications", notifications.length)}
        ${mini("Guarantee requests", guarantors.length)}
        ${mini("Offline drafts", drafts.length)}
      </div>
    </section>
  `;
}

function memberQuickActionsPanel() {
  const actions = [
    [t("payByMobileMoney"), t("payByMobileMoneyCopy"), "payments", "mobile-money"],
    [t("viewStatement"), t("viewStatementCopy"), "money", "statement"],
    ["Loans", "Apply for or repay a loan", "loans", "loans"],
    ["Read SACCO messages", "Open notices from your SACCO admin", "notifications", "inbox"],
    ["Submit complaint", "Start or continue a support chat", "complaints", "submit"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberQuickActions")}</h2>
          <p>${t("memberQuickActionsCopy")}</p>
        </div>
        <span class="status active">${t("selfService")}</span>
      </div>
      <div class="access-grid">
        ${actions.map(([label, detail, view, tab]) => `
          <div>
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(detail)}</span>
            <button class="button secondary" type="button" data-member-shortcut-view="${escapeHtml(view)}" data-member-shortcut-tab="${escapeHtml(tab)}">${escapeHtml(label)}</button>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function memberFundLabel(code) {
  return String(code || "").replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * @param {TerekaMemberDashboard} dash
 * @param {TerekaBalances} balances
 * @returns {string}
 */
function memberMoneyView(dash, balances, cycleLines = null, cycle = null) {
  const tabs = [["accounts", "Accounts"], ["statement", "Statement"], ["receipts", "Receipts"]];
  const tab = activeModuleTab("money", tabs);
  const fundBalances = state.memberData.fundBalances || [];
  const shouldUseFullFundBalances = (!cycle || cycle.period === "once") && fundBalances.length;
  const accounts = (shouldUseFullFundBalances
    ? fundBalances.map((fund) => ({ fundCode: fund.fundCode, account: memberFundLabel(fund.fundCode), balance: fund.balance || 0 }))
    : [
        { fundCode: "savings", account: "Savings", balance: balances.savings || 0 },
        { fundCode: "shares", account: "Shares", balance: balances.shares || 0 },
        { fundCode: "welfare", account: "Welfare", balance: balances.welfare || 0 }
      ]).map((row) => ({ ...row, action: "member-fund-detail", actionId: row.fundCode, actionLabel: "View" }));
  const lines = memberLinesWithFundRunningBalances(cycleLines || memberLinesInSelectedCycle(buildMemberStatementLines(dash), cycle)).map((line, index) => ({
    ...line,
    action: "member-statement-line",
    actionId: String(index),
    actionLabel: "View"
  }));
  state.memberStatementLines = lines;
  const receipts = lines
    .filter((line) => line.reference && (Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0))
    .map((line) => ({
      ...line,
      receiptNo: `RCT-${line.reference}`,
      amount: Number(line.credit || 0) || Number(line.debit || 0)
    }))
    .sort((a, b) => new Date(b.postedAt || b.createdAt || 0).getTime() - new Date(a.postedAt || a.createdAt || 0).getTime());
  return `
    ${moduleTabs("money", tabs, tab)}
    ${tab === "accounts" ? `${memberFundDetailPanel(lines)}${recordTable(`Account balances - ${cycle?.label || "current"}`, accounts, ["account", "balance"])}` : ""}
    ${tab === "statement" ? memberStatementSection(lines) : ""}
    ${tab === "receipts" ? (receipts.length ? recordTable("Receipts", receipts, ["receiptNo", "reference", "description", "amount", "postedAt"]) : emptyState("No receipts yet", "Receipts appear here once your transactions post.")) : ""}
  `;
}

function memberMonthKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function memberMonthLabel(monthKey) {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function memberDepositMethod(line) {
  return labelize(line.channel || line.paymentRoute || line.paymentMethod || "-");
}

function memberLinesWithFundRunningBalances(lines) {
  const chronological = (lines || [])
    .map((line) => ({
      ...line,
      source: line.source || memberFundLabel(memberFundCodeForType(line.type))
    }))
    .sort((a, b) => new Date(a.postedAt || a.createdAt || 0).getTime() - new Date(b.postedAt || b.createdAt || 0).getTime());
  const sourceBalances = {};
  return chronological.map((line) => {
    const key = memberFundCodeForType(line.type || line.source);
    const signed = Number(line.credit || 0) - Number(line.debit || 0);
    sourceBalances[key] = (sourceBalances[key] || 0) + signed;
    return { ...line, runningBalance: sourceBalances[key] };
  });
}

function memberStatementSection(lines) {
  const enriched = memberLinesWithFundRunningBalances(lines).map((line) => ({
    ...line,
    monthKey: memberMonthKey(line.postedAt || line.createdAt),
    month: memberMonthLabel(memberMonthKey(line.postedAt || line.createdAt)),
    method: memberDepositMethod(line),
    source: memberFundLabel(memberFundCodeForType(line.type))
  }));
  const months = [...new Set(enriched.map((line) => line.monthKey).filter(Boolean))].sort().reverse();
  const methods = [...new Set(enriched.map((line) => line.method).filter((value) => value && value !== "-"))].sort();
  const sources = [...new Set(enriched.map((line) => line.source).filter((value) => value && value !== "-"))].sort();
  const selectedMonth = state.memberStatementMonth || "all";
  const selectedMethod = state.memberStatementMethod || "all";
  const selectedSource = state.memberStatementSource || "all";
  const sortOrder = state.memberStatementSort || "newest";
  const filtered = enriched.filter((line) =>
    (selectedMonth === "all" || line.monthKey === selectedMonth)
    && (selectedMethod === "all" || line.method === selectedMethod)
    && (selectedSource === "all" || line.source === selectedSource));
  const chronological = memberLinesWithFundRunningBalances(filtered);
  let shown = chronological;
  if (sortOrder !== "oldest") {
    shown = chronological.slice().reverse();
  }
  state.memberStatementView = shown;
  const displayRows = shown.map((line) => ({ ...line, fundBalance: line.runningBalance }));
  return `
    ${memberStatementToolbar(lines.length, months, methods, sources, selectedMonth, selectedMethod, selectedSource, sortOrder)}
    ${memberStatementDetailPanel()}
    ${shown.length
      ? recordTable("Statement", displayRows, ["postedAt", "source", "method", "reference", "description", "debit", "credit", "fundBalance"])
      : emptyState("No statement activity", lines.length ? "No transactions match the selected filters." : "Your posted transactions will appear here.")}
  `;
}

function memberStatementToolbar(count, months, methods, sources, selectedMonth, selectedMethod, selectedSource, sortOrder) {
  const disabled = count ? "" : "disabled";
  const monthOptions = [`<option value="all" ${selectedMonth === "all" ? "selected" : ""}>All months</option>`]
    .concat((months || []).map((key) => `<option value="${escapeHtml(key)}" ${selectedMonth === key ? "selected" : ""}>${escapeHtml(memberMonthLabel(key))}</option>`))
    .join("");
  const methodOptions = [`<option value="all" ${selectedMethod === "all" ? "selected" : ""}>All methods</option>`]
    .concat((methods || []).map((method) => `<option value="${escapeHtml(method)}" ${selectedMethod === method ? "selected" : ""}>${escapeHtml(method)}</option>`))
    .join("");
  const sourceOptions = [`<option value="all" ${selectedSource === "all" ? "selected" : ""}>All sources</option>`]
    .concat((sources || []).map((source) => `<option value="${escapeHtml(source)}" ${selectedSource === source ? "selected" : ""}>${escapeHtml(source)}</option>`))
    .join("");
  return `
    <section class="filter-toolbar filter-toolbar-flex">
      <label><span>Search</span><input value="${escapeHtml(state.search)}" data-search-input placeholder="Filter by reference, channel, narration or date"></label>
      <label><span>Fund source</span><select data-member-statement-source>${sourceOptions}</select></label>
      <label><span>Month</span><select data-member-statement-month>${monthOptions}</select></label>
      <label><span>Method</span><select data-member-statement-method>${methodOptions}</select></label>
      <label><span>Sort</span><select data-member-statement-sort><option value="newest" ${sortOrder === "newest" ? "selected" : ""}>Newest first</option><option value="oldest" ${sortOrder === "oldest" ? "selected" : ""}>Oldest first</option></select></label>
      <div class="filter-toolbar-actions">
        <button class="button primary" type="button" data-action="member-statement-pdf" ${disabled}>Download PDF</button>
        <button class="button secondary" type="button" data-action="member-statement-excel" ${disabled}>Download Excel</button>
      </div>
    </section>
  `;
}

function memberFundCodeForType(type) {
  const value = normal(type).replace(/[\s-]+/g, "_");
  if (value === "withdrawal") return "savings";
  if (value.startsWith("saving")) return "savings";
  if (value.startsWith("share")) return "shares";
  if (value.startsWith("welfare")) return "welfare";
  return value.replace(/_(deposit|contribution|purchase|payment)$/, "");
}

function memberLoanHistoryPanel() {
  const loanId = state.memberLoanHistoryLoanId;
  if (!loanId) return "";
  const loans = state.memberData.loans || [];
  const loan = loans.find((item) => item.id === loanId);
  const title = loan ? `${loan.product || loan.applicationNo || "Loan"} repayments` : "Loan repayments";
  const rows = (state.memberLoanHistory || []).map((row) => ({
    paidAt: (row.paidAt || "").slice(0, 10),
    reference: row.reference || "-",
    amount: row.amount,
    channel: labelize(row.channel || "-"),
    narration: row.narration || ""
  }));
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const postedTotal = rows.length ? total : Number(loan?.repaymentTotal || 0);
  const totalPayable = memberLoanTotalPayable(loan);
  const calculatedOutstanding = Math.max(totalPayable - postedTotal, 0);
  const recordedOutstanding = memberLoanOutstandingBalance(loan);
  const loaded = state.memberLoanHistory != null;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>Posted repayments received on this loan. Outstanding is reconciled from total payable minus approved repayments.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-loan-history">Close</button>
      </div>
      ${loan ? `<div class="member-dashboard-metrics">
        ${mini("Principal", money.format(loan.amount || loan.requestedAmount || 0))}
        ${mini("Interest / charges", money.format(loan.interestAmount || 0))}
        ${mini("Total payable", money.format(totalPayable))}
        ${mini("Posted repayments", money.format(postedTotal))}
        ${mini("Outstanding", money.format(recordedOutstanding))}
        ${Math.abs(recordedOutstanding - calculatedOutstanding) > 0.01 ? mini("Expected outstanding", money.format(calculatedOutstanding)) : ""}
      </div>` : ""}
      ${loan && Math.abs(recordedOutstanding - calculatedOutstanding) > 0.01 ? `<div class="notice warning"><strong>Loan balance needs reconciliation.</strong><span>The saved outstanding balance differs from total payable minus posted payment history.</span></div>` : ""}
      ${state.memberLoanHistoryError ? `<div class="notice warning"><span>${escapeHtml(state.memberLoanHistoryError)}</span></div>` : ""}
      ${!loaded && !state.memberLoanHistoryError ? `<div class="notice compact"><span>Loading repayments...</span></div>` : ""}
      ${loaded ? (rows.length ? recordTable("Repayments", rows, ["paidAt", "reference", "amount", "channel", "narration"]) : emptyState("No repayments yet", "Repayments posted to this loan will appear here.")) : ""}
    </section>
  `;
}

function memberFundDetailPanel(lines) {
  const fundCode = state.memberSelectedFund;
  if (!fundCode) return "";
  const rows = (lines || [])
    .filter((line) => memberFundCodeForType(line.type) === normal(fundCode))
    .sort((a, b) => new Date(a.postedAt || a.createdAt || 0).getTime() - new Date(b.postedAt || b.createdAt || 0).getTime());
  // Per-fund cumulative balance (from zero) so the column reconciles within this single fund.
  let cumulative = 0;
  const display = rows.map((line) => {
    cumulative += Number(line.credit || 0) - Number(line.debit || 0);
    return { ...line, fundBalance: cumulative };
  });
  const total = cumulative;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(memberFundLabel(fundCode))} transactions</h2>
          <p>Posted transactions that make up your ${escapeHtml(memberFundLabel(fundCode))} balance. Net movement: ${money.format(total)}.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-fund-detail">Close</button>
      </div>
      ${display.length
        ? recordTable(`${memberFundLabel(fundCode)} activity`, display, ["postedAt", "reference", "description", "debit", "credit", "fundBalance"])
        : emptyState("No transactions", "No posted transactions are attributed to this fund yet.")}
    </section>
  `;
}

function memberStatementDetailPanel() {
  const line = state.memberStatementDetail;
  if (!line) return "";
  const amount = Number(line.credit || 0) || Number(line.debit || 0);
  const direction = Number(line.credit || 0) > 0 ? "Credit" : Number(line.debit || 0) > 0 ? "Debit" : "-";
  const rows = [
    ["Reference", line.reference || "-"],
    ["Description", line.description || "-"],
    ["Direction", direction],
    ["Amount", money.format(amount)],
    ["Debit", Number(line.debit || 0) ? money.format(line.debit) : "-"],
    ["Credit", Number(line.credit || 0) ? money.format(line.credit) : "-"],
    ["Fund balance", line.runningBalance != null ? money.format(line.runningBalance) : "-"],
    ["Payment channel", labelize(line.channel || line.paymentRoute || line.paymentMethod || "-")],
    ["Status", labelize(line.paymentStatus || line.status || "posted")],
    ["Posted", line.postedAt || line.createdAt || "-"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Transaction details</h2>
          <p>Reference ${escapeHtml(String(line.reference || "-"))}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-statement-detail">Close</button>
      </div>
      <div class="source-grid compact">
        ${rows.map(([label, value]) => mini(label, escapeHtml(String(value)))).join("")}
      </div>
    </section>
  `;
}

function memberTabReadinessPanel() {
  // Removed: production portal no longer renders filler "readiness" panels.
  return "";
}

function memberLoansView(cycle = null) {
  const loans = memberRowsInSelectedCycle(state.memberData.loans || [], cycle, ["submittedAt", "approvedAt", "disbursedAt", "nextDueDate", "createdAt", "updatedAt"]);
  const loanRows = loans.map((loan) => ({
    ...loan,
    principalAmount: loan.amount || loan.requestedAmount || 0,
    totalPayableAmount: memberLoanTotalPayable(loan),
    postedRepaymentAmount: loan.repaymentTotal || 0,
    outstandingBalance: memberLoanOutstandingBalance(loan),
    action: "member-loan-history",
    actionId: loan.id
  }));
  const requests = buildMemberGuarantorRows(memberRowsInSelectedCycle(state.memberData.pendingGuarantors || [], cycle, ["requestedAt", "createdAt", "updatedAt"]));
  const pending = requests.filter((row) => normal(row.status) === "pending");
  const tabs = [["loans", "My loans"], ["guarantor", `Guarantor requests${pending.length ? ` (${pending.length})` : ""}`]];
  const tab = activeModuleTab("loans", tabs);
  return `
    ${moduleTabs("loans", tabs, tab)}
    ${tab === "loans" ? `${memberLoanApplicationPanel()}${memberReplaceGuarantorPanel()}${memberLoanHistoryPanel()}${loanRows.length ? recordTable(`Member loans - ${cycle?.label || "current"}`, loanRows, ["product", "principalAmount", "totalPayableAmount", "postedRepaymentAmount", "outstandingBalance", "nextDueDate", "status"]) : emptyState("Member loans", "Apply for a loan using the form above.")}` : ""}
    ${tab === "guarantor" ? `${state.memberGuarantorMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorMessage)}</strong></div>` : ""}${state.memberGuarantorError ? `<div class="notice warning"><strong>Guarantor decision failed.</strong><span>${escapeHtml(state.memberGuarantorError)}</span></div>` : ""}${requests.length ? recordTable(`Guarantor requests - ${cycle?.label || "current"}`, requests, ["borrower", "product", "requestedAmount", "guaranteedAmount", "guaranteeCeiling", "committedGuarantees", "capacity", "status"]) : emptyState("No guarantor requests", "Requests to guarantee other members' loans appear here.")}` : ""}
  `;
}

function memberLoanTotalPayable(loan) {
  if (!loan) return 0;
  const explicit = Number(loan.totalPayable);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Number(loan.amount || loan.requestedAmount || 0) + Number(loan.interestAmount || 0);
}

function memberLoanOutstandingBalance(loan) {
  if (!loan) return 0;
  const recorded = loan.outstandingBalance ?? loan.balance;
  const value = Number(recorded);
  if (Number.isFinite(value)) return value;
  return Math.max(memberLoanTotalPayable(loan) - Number(loan.repaymentTotal || 0), 0);
}

function memberReplaceGuarantorPanel() {
  const loans = (state.memberData.loans || [])
    .filter((loan) => ["submitted", "under_review", "pending_approval"].includes(normal(loan.status)));
  if (!loans.length) return "";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Add or replace a guarantor</h2>
          <p>If a guarantor rejects, add another SACCO member here while the loan is still under review (up to 3 active guarantors).</p>
        </div>
      </div>
      ${state.memberGuarantorAddMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorAddMessage)}</strong></div>` : ""}
      ${state.memberGuarantorAddError ? `<div class="notice warning"><strong>Could not add guarantor.</strong><span>${escapeHtml(state.memberGuarantorAddError)}</span></div>` : ""}
      <form id="memberAddGuarantorForm" class="form-grid">
        <label><span>Loan</span><select id="memberAddGuarantorLoanId">${loans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(`${loan.applicationNo || loan.id} · ${loan.product || ""} · ${money.format(loan.amount || loan.requestedAmount || 0)}`)}</option>`).join("")}</select></label>
        ${memberGuarantorPicker("replacement", true)}
        <label><span>Guarantor member no.</span><input id="memberAddGuarantorNo" placeholder="e.g. GVS-0003"></label>
        <label><span>Pledge</span><input id="memberAddGuarantorAmount" type="number" min="0" step="1" placeholder="0"></label>
        <div class="form-actions inline"><button class="button secondary" type="submit">Add guarantor</button></div>
      </form>
    </section>
  `;
}

function memberGuarantorPicker(target, enabled) {
  return `
    <div class="wide guarantor-picker">
      <label><span>Find a guarantor by name or member number</span></label>
      <div class="search-row">
        <input id="guarantorSearch_${escapeHtml(target)}" placeholder="Type a name or member number..." ${enabled ? "" : "disabled"}>
        <button class="button secondary" type="button" data-guarantor-search="${escapeHtml(target)}" ${enabled ? "" : "disabled"}>Search</button>
      </div>
      <div id="guarantorResults_${escapeHtml(target)}" class="guarantor-results"></div>
    </div>
  `;
}

function memberLoanApplicationPanel() {
  const memberActive = normal(state.member?.status) === "active";
  const catalogProducts = (state.memberData.loanProducts || [])
    .map((product) => String(product.name || product.label || product.code || "").trim())
    .filter(Boolean);
  const loanProducts = catalogProducts.length ? catalogProducts : ["Development Loan", "Emergency Loan"];
  const productOptions = loanProducts
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile loan application</h2>
          <p>Submit a loan request directly to the SACCO credit workflow.</p>
        </div>
        <span class="status ${memberActive ? "active" : "pending"}">${memberActive ? "Eligible to submit" : "Member not active"}</span>
      </div>
      ${state.memberLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberLoanMessage)}</strong></div>` : ""}
      ${state.memberLoanError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.memberLoanError)}</span></div>` : ""}
      <form id="memberLoanForm" class="form-grid">
        <label><span>Loan product</span><select id="memberLoanProduct" ${memberActive ? "" : "disabled"}>${productOptions}</select></label>
        <label><span>Amount</span><input id="memberLoanAmount" type="number" min="1" step="1" value="100000" ${memberActive ? "" : "disabled"}></label>
        <label><span>Repayment months</span><input id="memberLoanMonths" type="number" min="1" max="60" value="12" ${memberActive ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><textarea id="memberLoanPurpose" placeholder="Business, school fees, farming input, emergency..." ${memberActive ? "" : "disabled"}></textarea></label>
        <div class="wide">
          <p class="field-note">Select up to 3 fellow SACCO members to guarantee this loan and the amount each pledges. They will be notified to accept or reject. If your savings already cover the loan plus its interest, you can submit without a guarantor.</p>
        </div>
        ${memberGuarantorPicker("loan", memberActive)}
        ${[1, 2, 3].map((index) => `
          <label><span>Guarantor ${index} member no. (optional)</span><input id="memberLoanGuarantor${index}No" placeholder="e.g. GVS-0002" ${memberActive ? "" : "disabled"}></label>
          <label><span>Guarantor ${index} pledge</span><input id="memberLoanGuarantor${index}Amount" type="number" min="0" step="1" placeholder="0" ${memberActive ? "" : "disabled"}></label>
        `).join("")}
        <div class="form-actions inline">${memberActive ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">Contact SACCO office</span>`}</div>
      </form>
    </section>
  `;
}

function memberPaymentsView(cycle = null) {
  const loans = memberRowsInSelectedCycle(state.memberData.loans || [], cycle, ["submittedAt", "approvedAt", "disbursedAt", "nextDueDate", "createdAt", "updatedAt"]);
  const payableLoans = loans.filter((loan) => ["active", "disbursed"].includes(normal(loan.status)));
  const requestRows = buildMemberPaymentRequestRows(memberRowsInSelectedCycle(state.memberData.paymentRequests || [], cycle, ["requestedAt", "completedAt", "createdAt", "updatedAt"]));
  const paymentDrafts = buildMemberDraftRows(memberRowsInSelectedCycle(state.memberData.drafts || [], cycle, ["updatedAt", "createdAt"]), "payment", labelize);
  const tabs = [["mobile-money", "Mobile money"], ["tracking", "Tracking"], ["drafts", `Drafts${paymentDrafts.length ? ` (${paymentDrafts.length})` : ""}`], ["history", "Payment history"]];
  const tab = activeModuleTab("payments", tabs);
  return `
    ${paymentRequestStatusNotice()}
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member payment center</h2>
          <p>Deposit savings, buy shares, contribute welfare or repay loans through SACCO-approved payment routes.</p>
        </div>
        <span class="status active">Ready to post</span>
      </div>
    </section>
    ${moduleTabs("payments", tabs, tab)}
    ${tab === "mobile-money" ? `${memberPaymentOverviewPanel(requestRows, paymentDrafts)}${memberPaymentFormPanel(payableLoans)}` : ""}
    ${tab === "tracking" ? memberPaymentTrackingPanel(requestRows, cycle) : ""}
    ${tab === "drafts" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Payment draft workspace</h2><p>Review, sync or discard saved payment drafts.</p></div></div></section>${memberDraftPanel("Payment offline drafts", paymentDrafts)}` : ""}
    ${tab === "history" ? (requestRows.length ? recordTable(`Payment history - ${cycle?.label || "current"}`, requestRows, ["provider", "purpose", "amount", "payerPhone", "status", "requestedAt"]) : emptyState("No payment requests yet", "Mobile-money and bank payment requests will appear here.")) : ""}
  `;
}

function memberPaymentOverviewPanel(requestRows, paymentDrafts) {
  const pendingRequests = requestRows.filter((row) => !["posted", "completed", "failed", "cancelled"].includes(normal(row.status))).length;
  const latestDraft = paymentDrafts[0]?.title || paymentDrafts[0]?.details || "None";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Payment posting rules</h2>
          <p>Mobile money waits for callback confirmation. Treasurer cash is receipted by SACCO staff. Bank deposits need a reference.</p>
        </div>
        <span class="status active">Treasurer cash result</span>
      </div>
      <div class="source-grid">
        ${mini("Recent online payment requests", requestRows.length)}
        ${mini("Saved drafts", paymentDrafts.length)}
        ${mini("Latest draft", latestDraft)}
        ${mini("Pending requests", pendingRequests)}
        ${mini("Payment routes", "Mobile money / bank / Treasurer")}
      </div>
      <div class="form-actions inline">
        <button class="button secondary" type="button" data-member-shortcut-view="payments" data-member-shortcut-tab="history">View status</button>
      </div>
    </section>
  `;
}

function memberPaymentTrackingPanel(requestRows, cycle = null) {
  const dash = state.memberData.dashboard || {};
  const lifecycleRows = memberRowsInSelectedCycle(memberPaymentLifecycleRows(dash), cycle, ["date"]);
  const monthlyRows = memberRowsInSelectedCycle(buildMemberMonthlyPerformanceRows(dash), cycle, ["date"]);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Payment tracking workspace</h2>
          <p>Track provider requests, payment lifecycle, Treasurer cash and Mobile money deposits.</p>
        </div>
        <span class="status active">Provider requests</span>
      </div>
    </section>
    ${requestRows.length ? recordTable(`Mobile-money request tracking - ${cycle?.label || "current"}`, requestRows, ["externalReference", "provider", "purpose", "amount", "payerPhone", "status", "requestedAt"]) : emptyState("Mobile-money request tracking", "Provider requests will appear here after initiation.")}
    ${lifecycleRows.length ? recordTable(`Payment lifecycle - ${cycle?.label || "current"}`, lifecycleRows, ["date", "reference", "description", "paymentRoute", "amount", "paymentStatus", "receiptStatus"]) : emptyState("Payment lifecycle", "Treasurer cash, Mobile money and bank payment status will appear here.")}
    ${monthlyRows.length ? recordTable(`Monthly savings and deposit performance - ${cycle?.label || "current"}`, monthlyRows, ["date", "month", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"]) : emptyState("Monthly savings and deposit performance", "Monthly performance appears after posting.")}
  `;
}

function memberCollectionAccountsCard() {
  const active = (state.memberData.collectionAccounts || []).filter((a) => a.active !== false);
  if (!active.length) return "";
  const rows = buildCollectionAccountDisplayRows(active, labelize);
  return `
    <div class="notice compact collection-accounts-card">
      <strong>Pay directly to your SACCO's accounts</strong>
      ${rows.map((r) => `<span>${escapeHtml(r.title)}: ${escapeHtml(r.detail)}${r.instructions ? " / " + escapeHtml(r.instructions) : ""}</span>`).join("")}
    </div>`;
}

function memberPaymentFormPanel(payableLoans) {
  const tenant = state.memberData.dashboard?.tenant || {};
  const mmAvailable = !!tenant.mobileMoneyCollectionAvailable;
  const bankAvailable = !!tenant.bankCollectionAvailable;
  const providers = memberAvailablePaymentProviders();
  if (!mmAvailable && !bankAvailable) {
    return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Make a payment</h2></div></div>
      <div class="notice warning"><strong>Payments not available.</strong><span>Online payment collection is not yet enabled for this SACCO. Please contact your SACCO office.</span></div>
    </section>`;
  }
  if (!mmAvailable && bankAvailable) {
    return `
      ${memberCollectionAccountsCard()}
      ${memberBankCollectionPanel(payableLoans)}
    `;
  }
  if (mmAvailable && !providers.length) {
    return `
    <section class="panel">
      <div class="panel-heading"><div><h2>Make a payment</h2></div></div>
      <div class="notice warning"><strong>Mobile money unavailable.</strong><span>No mobile-money network is configured for this SACCO yet. Use Treasurer cash or contact your SACCO office.</span></div>
      ${bankAvailable ? `<div class="notice compact"><span>Bank collection is enabled. Deposit to the SACCO bank account and keep your reference for receipting.</span></div>` : ""}
    </section>`;
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Pay by mobile money</h2>
          <p>${providers.length > 1 ? "Pick your configured network, enter the amount, then approve the prompt on your phone." : "Enter the amount, then approve the prompt on your phone."}</p>
        </div>
      </div>
      ${bankAvailable ? `<div class="notice compact payment-route-card"><strong>Bank collection also enabled.</strong><span>You may alternatively deposit to the SACCO bank account and present the bank reference to the SACCO office for receipting.</span></div>` : ""}
      ${memberCollectionAccountsCard()}
      ${state.memberPaymentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPaymentMessage)}</strong></div>` : ""}
      ${state.memberPaymentError ? `<div class="notice warning"><strong>Payment failed.</strong><span>${escapeHtml(state.memberPaymentError)}</span></div>` : ""}
      <form id="memberPaymentForm" class="form-grid">
        <input id="memberPaymentRoute" type="hidden" value="mobile_money">
        <label class="wide"><span>Network</span>
          <select id="memberPaymentProvider">
            ${providers.map((provider) => `<option value="${escapeHtml(provider.network || provider.providerId || "default")}">${escapeHtml(provider.label || "Mobile money")}</option>`).join("")}
          </select>
          <div class="network-picker">
            ${providers.map((provider, index) => memberPaymentProviderTile(provider, index === 0)).join("")}
          </div>
        </label>
        ${memberPaymentPurposeControl(payableLoans)}
        <label><span>Amount (UGX)</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>Mobile money number</span><input id="memberPaymentPhone" value="${escapeHtml(state.member?.phone || "")}" placeholder="07XX XXX XXX"></label>
        <label><span>Payment reference</span><input id="memberPaymentReference" value="${escapeHtml(`MM-${Date.now()}`)}"></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">Save draft</button><button class="button primary" type="submit">Post payment</button></div>
      </form>
    </section>
  `;
}

function memberBankCollectionPanel(payableLoans) {
  const reference = `BANK-${Date.now()}`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Bank collection</h2>
          <p>Prepare a bank payment reference before depositing to the SACCO bank account.</p>
        </div>
      </div>
      <form id="memberPaymentForm" class="form-grid">
        <input id="memberPaymentRoute" type="hidden" value="bank_collection">
        ${memberPaymentPurposeControl(payableLoans)}
        <label><span>Amount (${escapeHtml(currentRegion().currency)})</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>Bank reference</span><input id="memberBankReference" value="${escapeHtml(reference)}"></label>
        <label><span>Mobile money number</span><input id="memberPaymentPhone" value="${escapeHtml(state.member?.phone || "")}" placeholder="Optional contact number"></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">Save bank draft</button><button class="button primary" type="submit">Prepare bank reference</button></div>
      </form>
    </section>
  `;
}

function memberPaymentPurposeControl(payableLoans) {
  const baseOptions = [
    ["savings_deposit", "Savings deposit"],
    ["share_purchase", "Share purchase"],
    ["welfare_contribution", "Welfare contribution"]
  ];
  if (state.memberData.membership) baseOptions.push(["membership_dues", "Membership subscription"]);
  const loanOptions = (payableLoans || []).map((loan) => {
    const outstanding = memberLoanOutstandingBalance(loan);
    const label = `${loan.product || loan.applicationNo || "Loan"} - outstanding ${money.format(outstanding)}`;
    return [memberLoanPaymentPurposeValue(loan.id), label, outstanding];
  });
  return `
    <label class="wide"><span>Paying for</span>
      <select id="memberPaymentPurpose" data-member-payment-purpose>
        ${baseOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}
        ${loanOptions.length ? `<optgroup label="Loan repayments">${loanOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}</optgroup>` : ""}
      </select>
    </label>
    ${loanOptions.length ? `<div class="notice compact wide member-loan-payment-context" data-member-loan-payment-context hidden>${loanOptions.map(([value, label, outstanding]) => `<span data-loan-payment-context="${escapeHtml(value)}" data-loan-outstanding="${escapeHtml(String(outstanding))}"><strong>${escapeHtml(label)}</strong> Enter any amount up to ${escapeHtml(money.format(outstanding))}. Partial and full repayments are allowed.</span>`).join("")}</div>` : ""}
  `;
}

function memberLoanPaymentPurposeValue(loanId) {
  return `loan_repayment::${loanId || ""}`;
}

function memberAvailablePaymentProviders() {
  const tenant = state.memberData.dashboard?.tenant || {};
  const providers = buildMemberPaymentProviderOptions(
    !!tenant.mobileMoneyCollectionAvailable,
    state.memberData.dashboard?.paymentProviders,
    labelize
  );
  if (!tenant.mobileMoneyCollectionAvailable) return [];
  const selected = new Map([
    ["mtn", { network: "mtn", providerId: "mtn", label: "MTN MoMo", available: true }],
    ["airtel", { network: "airtel", providerId: "airtel", label: "Airtel Money", available: true }]
  ]);
  providers.forEach((provider) => {
    const text = normal(`${provider.network || ""} ${provider.providerId || ""} ${provider.label || ""}`);
    const key = text.includes("mtn") ? "mtn" : text.includes("airtel") ? "airtel" : "";
    if (key) selected.set(key, { ...selected.get(key), ...provider, network: key });
  });
  return ["mtn", "airtel"].map((key) => selected.get(key));
}

function memberPaymentProviderTile(provider, checked) {
  const network = normal(provider.network || "default").replace(/[^a-z0-9_-]/g, "") || "default";
  const label = provider.label || "Mobile money";
  const [title, ...rest] = label.split(" ");
  return `
    <label class="network-tile ${escapeHtml(network)}">
      <input type="radio" name="mmProvider" value="${escapeHtml(provider.network || provider.providerId || "default")}" ${checked ? "checked" : ""}>
      <b>${escapeHtml(title || "Mobile")}</b>
      <span>${escapeHtml(rest.join(" ") || "Money")}</span>
    </label>
  `;
}

/**
 * Builds a member-facing payment lifecycle from requests, posted statement lines and offline drafts.
 * @param {TerekaMemberDashboard} dash
 * @returns {TerekaPaymentLifecycleRow[]}
 */
function memberPaymentLifecycleRows(dash) {
  return buildMemberPaymentLifecycleRows({
    dashboard: dash,
    drafts: buildMemberDraftRows(state.memberData.drafts || [], "payment", labelize),
    labelize,
    paymentRequests: state.memberData.paymentRequests || [],
  });
}

function memberChannelPreferencesPanel() {
  const prefs = state.memberData.notificationPreferences || {};
  const labels = { sms: "SMS", email: "Email", whatsapp: "WhatsApp", push: "Mobile app push" };
  const order = ["sms", "email", "whatsapp", "push"];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>How you get notified</h2>
          <p>Choose which channels you want to receive messages on. Channels your SACCO has turned off cannot be enabled here.</p>
        </div>
      </div>
      ${state.memberNotificationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberNotificationMessage)}</strong></div>` : ""}
      ${state.memberNotificationError ? `<div class="notice warning"><strong>Could not update.</strong><span>${escapeHtml(state.memberNotificationError)}</span></div>` : ""}
      <div class="member-preference-list">
        ${order.map((channel) => {
          const enabled = prefs[channel] !== false;
          return `<div class="member-preference-row">
            <div><strong>${escapeHtml(labels[channel] || labelize(channel))}</strong><span class="status ${enabled ? "active" : "pending"}">${enabled ? "On" : "Off"}</span></div>
            <button class="button ${enabled ? "ghost" : "primary"}" type="button" data-toggle-member-channel="${channel}" data-channel-enabled="${enabled ? "false" : "true"}">${enabled ? "Turn off" : "Turn on"}</button>
          </div>`;
        }).join("")}
      </div>
      ${memberGuarantorListingPanel()}
    </section>`;
}

function memberGuarantorListingPanel() {
  const optOut = !!(state.memberData.guarantorListing && state.memberData.guarantorListing.optOut);
  return `
    <div class="member-preference-list guarantor-listing-privacy">
      <div class="member-preference-row">
        <div><strong>Guarantor listing</strong><span>${optOut ? "Hidden — you won't appear in other members' guarantor search." : "Visible — other members can find you (name and member number only) to request a guarantee."}</span></div>
        <button class="button ${optOut ? "primary" : "ghost"}" type="button" data-toggle-guarantor-listing="${optOut ? "false" : "true"}">${optOut ? "Make me findable" : "Hide me"}</button>
      </div>
    </div>`;
}

function memberNotificationsView(cycle = null) {
  const messages = buildMemberAdminMessageRows(memberRowsInSelectedCycle(state.memberData.notifications || [], cycle, ["sentAt", "createdAt", "updatedAt", "readAt"]))
    .map((row) => ({
      ...row,
      categoryLabel: labelize(row.category || "message"),
      action: isMemberNotificationUnread(row) ? "member-notification-acknowledge" : "none",
      actionLabel: "Acknowledge",
      actionId: row.id
    }));
  const unread = messages.filter((row) => isMemberNotificationUnread(row));
  const tabs = [["inbox", `Inbox${messages.length ? ` (${messages.length})` : ""}`], ["unread", `Unread${unread.length ? ` (${unread.length})` : ""}`], ["evidence", "Evidence"]];
  const tab = activeModuleTab("notifications", tabs);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member message inbox</h2>
          <p>Messages from your SACCO admin, delivery status and acknowledgement evidence.</p>
        </div>
        <span class="status ${unread.length ? "pending" : "active"}">${unread.length ? "Unread messages" : "Current"}</span>
      </div>
    </section>
    ${moduleTabs("notifications", tabs, tab)}
    ${tab === "inbox" ? memberChannelPreferencesPanel() : ""}
    ${tab === "inbox" ? (messages.length ? recordTable(`SACCO admin messages - ${cycle?.label || "current"}`, messages, ["categoryLabel", "title", "message", "channel", "status", "createdAt", "readAt"]) : emptyState("SACCO admin messages", "Messages from your SACCO admin will appear here.")) : ""}
    ${tab === "unread" ? (unread.length ? recordTable(`Unread message queue - ${cycle?.label || "current"}`, unread, ["title", "message", "channel", "status", "createdAt"]) : emptyState("Unread message queue", "Unread SACCO notices will appear here.")) : ""}
    ${tab === "evidence" ? recordTable(`Message delivery evidence - ${cycle?.label || "current"}`, messages.map((row) => ({
      title: row.title,
      channel: row.channel,
      status: row.status,
      receivedAt: row.createdAt,
      acknowledgedAt: row.readAt || "-"
    })), ["title", "channel", "status", "receivedAt", "acknowledgedAt"]) : ""}
  `;
}

function paymentRequestStatusNotice() {
  if (!state.paymentRequestStatusMessage && !state.paymentRequestStatusError) return "";
  return `
    <div class="notice ${state.paymentRequestStatusError ? "warning" : "compact"}">
      <strong>${state.paymentRequestStatusError ? "Payment status check failed." : "Payment status updated."}</strong>
      <span>${escapeHtml(state.paymentRequestStatusError || state.paymentRequestStatusMessage)}</span>
    </div>
  `;
}

function memberComplaintsView(cycle = null) {
  const chatThreads = memberRowsInSelectedCycle(state.memberData.chatThreads || [], cycle, ["createdAt", "updatedAt", "lastMessageAt"]);
  const unreadChats = chatThreads.filter((thread) => thread.unreadCount > 0).length;
  const complaintDrafts = buildMemberDraftRows(memberRowsInSelectedCycle(state.memberData.drafts || [], cycle, ["updatedAt", "createdAt"]), "complaint", labelize);
  const tabs = [["submit", "Submit"], ["tracking", "Tracking"], ["drafts", `Drafts${complaintDrafts.length ? ` (${complaintDrafts.length})` : ""}`], ["evidence", "Evidence"], ["chat", `Chat${unreadChats ? ` (${unreadChats})` : ""}`]];
  const tab = activeModuleTab("complaints", tabs);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint center</h2>
          <p>Chat with your SACCO Secretary and track replies, routing updates and closure notes from beginning to end.</p>
        </div>
        <span class="status ${unreadChats ? "pending" : "active"}">${unreadChats ? "Unread activity" : "Current"}</span>
      </div>
    </section>
    ${moduleTabs("complaints", tabs, tab)}
    ${tab === "submit" ? memberComplaintSubmissionPanel(cycle) : ""}
    ${tab === "tracking" ? memberComplaintTrackingPanel(cycle) : ""}
    ${tab === "drafts" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Complaint draft workspace</h2><p>Review saved complaint drafts before syncing.</p></div></div></section>${memberDraftPanel("Complaint offline drafts", complaintDrafts)}` : ""}
    ${tab === "evidence" ? memberComplaintEvidencePanel(cycle) : ""}
    ${tab === "chat" ? memberChatWorkspace() : ""}
  `;
}

function memberComplaintSubmissionPanel(cycle = null) {
  const cases = memberRowsInSelectedCycle(state.memberData.chatThreads || [], cycle, ["createdAt", "updatedAt", "lastMessageAt"]);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint submission</h2>
          <p>Start a complaint chat. The Secretary is the primary response person and any routing to Treasurer, Chairperson or another officer appears in the same thread.</p>
        </div>
        <span class="status active">Secretary desk</span>
      </div>
      ${state.memberComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberComplaintMessage)}</strong></div>` : ""}
      ${state.memberComplaintError ? `<div class="notice warning"><strong>Complaint submission failed.</strong><span>${escapeHtml(state.memberComplaintError)}</span></div>` : ""}
      <form id="memberComplaintForm" class="form-grid">
        <label><span>Category</span><select id="memberComplaintCategory"><option value="service">Service</option><option value="payment">Payment</option><option value="loan">Loan</option><option value="account">Account</option></select></label>
        <label><span>Priority</span><select id="memberComplaintPriority"><option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option></select></label>
        <label class="wide"><span>Subject</span><input id="memberComplaintSubject" placeholder="What do you need help with?"></label>
        <label class="wide"><span>Description</span><textarea id="memberComplaintDescription" placeholder="Explain the issue for your SACCO administrator."></textarea></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="complaint">Save draft</button><button class="button primary" type="submit">Submit complaint</button></div>
      </form>
    </section>
    ${recordTable(`My complaints - ${cycle?.label || "current"}`, cases, ["subject", "status", "priority", "lastMessagePreview", "updatedAt"])}
  `;
}

function memberComplaintTrackingPanel(cycle = null) {
  const rows = memberRowsInSelectedCycle(state.memberData.chatThreads || [], cycle, ["createdAt", "updatedAt", "lastMessageAt"]);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint tracking workspace</h2>
          <p>Track submitted complaints, SACCO admin replies and current status.</p>
        </div>
        <span class="status ${rows.some((row) => normal(row.status) !== "resolved") ? "pending" : "active"}">My complaints</span>
      </div>
    </section>
    ${rows.length ? recordTable(`My complaints - ${cycle?.label || "current"}`, rows, ["subject", "status", "priority", "lastMessagePreview", "updatedAt"]) : emptyState("My complaints", "Submitted complaints will appear here.")}
  `;
}

function memberComplaintEvidencePanel(cycle = null) {
  const rows = memberRowsInSelectedCycle(state.memberData.chatThreads || [], cycle, ["createdAt", "updatedAt", "lastMessageAt"]).map((row) => ({
    subject: row.subject,
    status: row.status,
    openedAt: row.createdAt || row.updatedAt,
    lastReply: row.updatedAt,
    evidence: row.id || "Pending"
  }));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint evidence controls</h2>
          <p>Keep complaint references and SACCO replies available for follow-up.</p>
        </div>
        <span class="status active">Evidence ready</span>
      </div>
    </section>
    ${rows.length ? recordTable(`Complaint evidence - ${cycle?.label || "current"}`, rows, ["subject", "status", "openedAt", "lastReply", "evidence"]) : emptyState("Complaint evidence", "Complaint evidence appears after submission.")}
  `;
}

function isMemberNotificationUnread(notification) {
  return !notification.readAt && normal(notification.status) !== "read";
}

function chatBubble(direction, author, text, timestamp) {
  return `
    <div class="chat-bubble ${escapeHtml(direction)}">
      <strong>${escapeHtml(author)}</strong>
      <p>${escapeHtml(text || "")}</p>
      <small>${timestamp ? escapeHtml(formatDateTime(timestamp)) : "Pending"}</small>
    </div>
  `;
}

function memberDraftPanel(title, drafts) {
  const filtered = filterRows(drafts || []);
  const columns = ["type", "title", "amount", "details", "status", "updatedAt"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>Drafts are saved on this device and can be synced when the backend is reachable.</p>
        </div>
        <span class="status ${drafts.some((draft) => normal(draft.status) === "failed") ? "danger" : drafts.length ? "pending" : "active"}">${drafts.length ? "Drafts available" : "No drafts"}</span>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${labelize(column)}</th>`).join("")}<th>Actions</th></tr></thead>
            <tbody>${filtered.map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : emptyState("No offline drafts", "Use Save draft to keep a payment or complaint on this device before syncing.")}
    </section>
  `;
}

function memberProfileView(_balances = {}, cycle = null) {
  const member = state.member || {};
  const tabs = [["overview", "Overview"], ["contacts", "Contacts"], ["balances", "Balances"], ["privacy", "Privacy"], ["security", "Security"]];
  const tab = activeModuleTab("profile", tabs);
  return `
    ${moduleTabs("profile", tabs, tab)}
    ${tab === "overview" ? memberProfileOverviewPanel(member) : ""}
    ${tab === "contacts" ? memberProfileContactsPanel(member) : ""}
    ${tab === "balances" ? memberProfileBalancesPanel(_balances, cycle) : ""}
    ${tab === "privacy" ? memberPrivacyPreferencesPanel(member, cycle) : ""}
    ${tab === "security" ? memberSecurityView(cycle) : ""}
  `;
}

function memberProfileOverviewPanel(member) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member profile</h2>
          <p>Personal details shown here come from your SACCO member record.</p>
        </div>
      </div>
      <div class="source-grid">
        ${mini("Full name", member.fullName)}
        ${mini("Member type", labelize(member.memberType || "member"))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Joining date", member.joiningDate)}
      </div>
    </section>
  `;
}

function memberProfileContactsPanel(member) {
  const contacts = [
    { type: "Phone", value: member.phone || "-", status: "Verified" },
    { type: "Email", value: member.email || "-", status: member.email ? "Verified" : "Pending" },
    { type: "Emergency contact", value: member.emergencyContact || "SACCO office update required", status: member.emergencyContact ? "Verified" : "Pending" }
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member contact controls</h2>
          <p>Contact details support receipts, alerts, password recovery and SACCO follow-up.</p>
        </div>
        <span class="status active">Contact evidence</span>
      </div>
    </section>
    ${recordTable("Profile contacts", contacts, ["type", "value", "status"])}
  `;
}

function memberProfileBalancesPanel(balances, cycle = null) {
  const rows = [
    { account: "Savings", balance: balances.savings || 0 },
    { account: "Shares", balance: balances.shares || 0 },
    { account: "Welfare", balance: balances.welfare || 0 },
    { account: "Total", balance: Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0) }
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member balance identity</h2>
          <p>Balances belong to the signed-in member, SACCO code and selected account cycle.</p>
        </div>
        <span class="status active">${escapeHtml(cycle?.label || "Verified")}</span>
      </div>
    </section>
    ${recordTable(`Balance summary - ${cycle?.label || "current"}`, rows, ["account", "balance"])}
  `;
}

function memberPrivacyPreferencesPanel(member, cycle = null) {
  const consent = member.consentPreferences || {};
  const checked = (value) => value ? "checked" : "";
  const privacyRequests = memberRowsInSelectedCycle(state.memberData.privacyRequests || [], cycle, ["createdAt", "handledAt", "updatedAt"]).map((request) => ({
    ...request,
    requestType: labelize(request.requestType || ""),
    status: labelize(request.status || ""),
    createdAt: request.createdAt ? formatDateTime(request.createdAt) : "",
    handledAt: request.handledAt ? formatDateTime(request.handledAt) : "Pending"
  }));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Privacy preferences</h2>
          <p>Control how your SACCO contacts you and shares data with payment providers.</p>
        </div>
        <span class="status ${consent.privacyNoticeAccepted ? "active" : "pending"}">${consent.privacyNoticeAccepted ? "Accepted" : "Action needed"}</span>
      </div>
      ${state.memberPrivacyMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPrivacyMessage)}</strong></div>` : ""}
      ${state.memberPrivacyError ? `<div class="notice warning"><strong>Privacy update failed.</strong><span>${escapeHtml(state.memberPrivacyError)}</span></div>` : ""}
      <form id="memberPrivacyConsentForm" class="form-grid">
        <label class="check-card wide"><input id="privacyNoticeAccepted" type="checkbox" ${checked(consent.privacyNoticeAccepted)}><span>I have read and accepted the Tereka Online privacy notice.</span></label>
        <label class="check-card"><input id="smsConsent" type="checkbox" ${checked(consent.smsConsent)}><span>SMS alerts and receipts</span></label>
        <label class="check-card"><input id="emailConsent" type="checkbox" ${checked(consent.emailConsent)}><span>Email alerts and statements</span></label>
        <label class="check-card"><input id="mobileMoneyConsent" type="checkbox" ${checked(consent.mobileMoneyConsent)}><span>Mobile-money payment initiation</span></label>
        <label class="check-card wide"><input id="providerDataSharingConsent" type="checkbox" ${checked(consent.providerDataSharingConsent)}><span>Share only required payment details with approved mobile-money or bank providers.</span></label>
        <div class="source-grid wide">
          ${mini("Privacy notice accepted", consent.privacyNoticeAcceptedAt ? formatDateTime(consent.privacyNoticeAcceptedAt) : "Not yet")}
          ${mini("Last consent update", consent.consentUpdatedAt ? formatDateTime(consent.consentUpdatedAt) : "Not yet")}
          ${mini("Audit trail", "Recorded by member session")}
        </div>
        <div class="form-actions inline"><button class="button primary" type="submit">Save privacy preferences</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Data protection requests</h2>
          <p>Ask the SACCO to provide your stored profile data, review retention, or process an erasure request without removing financial audit records.</p>
        </div>
        <span class="status active">Audited workflow</span>
      </div>
      ${state.memberPrivacyRequestMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPrivacyRequestMessage)}</strong></div>` : ""}
      ${state.memberPrivacyRequestError ? `<div class="notice warning"><strong>Request failed.</strong><span>${escapeHtml(state.memberPrivacyRequestError)}</span></div>` : ""}
      <form id="memberPrivacyRequestForm" class="form-grid">
        <label><span>Request type</span><select id="memberPrivacyRequestType">
          <option value="subject_access">Subject access</option>
          <option value="retention_review">Retention review</option>
          <option value="erasure">Erasure request</option>
        </select></label>
        <label class="wide"><span>Reason</span><textarea id="memberPrivacyRequestReason" placeholder="Tell the SACCO what you need reviewed or corrected."></textarea></label>
        <div class="form-actions inline"><button class="button primary" type="submit">Submit request</button></div>
      </form>
      ${privacyRequests.length ? recordTable(`My data protection requests - ${cycle?.label || "current"}`, privacyRequests, ["requestType", "status", "reason", "resolutionNote", "createdAt", "handledAt"]) : emptyState("No data protection requests", "Submitted requests will appear here with their status.")}
    </section>
  `;
}

function memberSecurityTabbedView(cycle = null) {
  const tabs = [["session", "Session"], ["login", "Login"], ["recovery", "Recovery"], ["safety", "Safety"]];
  const tab = activeModuleTab("security", tabs);
  return `
    ${moduleTabs("security", tabs, tab)}
    ${tab === "session" ? memberSecurityView(cycle) : ""}
    ${tab === "login" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Member login requirements</h2><p>SACCO code plus username, email, phone or membership number and password are required.</p></div><span class="status active">Protected</span></div></section>` : ""}
    ${tab === "recovery" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Member recovery controls</h2><p>Password recovery is verified through SACCO-admin identity checks and registered contact channels.</p></div><span class="status active">Controlled</span></div></section>` : ""}
    ${tab === "safety" ? `<section class="panel compact-panel"><div class="panel-heading"><div><h2>Member safety actions</h2><p>Sign out, report suspicious activity and request profile review through the SACCO office.</p></div><span class="status pending">Security actions</span></div><div class="form-actions inline"><button class="button secondary" type="button" data-action="logout">Sign out</button><button class="button secondary" type="button" data-member-shortcut-view="complaints" data-member-shortcut-tab="submit">Report issue</button></div></section>` : ""}
  `;
}

function memberSecurityView(cycle = null) {
  const expiresAt = state.memberData.sessionExpiresAt || state.memberData.dashboard?.sessionExpiresAt || "Current browser session";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberSecurityCenter")}</h2>
          <p>${t("memberSecurityCenterCopy")}</p>
        </div>
        <span class="status active">${t("protected")}</span>
      </div>
      <div class="source-grid">
        ${mini("SACCO code", contextCode())}
        ${mini("Account cycle", cycle?.label || "Current")}
        ${mini("Username", state.member?.membershipNo || state.member?.email || state.member?.phone)}
        ${mini("Session expiry", expiresAt)}
        ${mini("Last sync", state.lastSync ? formatDateTime(state.lastSync) : "Pending")}
      </div>
      <p>Password resets and contact-detail changes are handled by your SACCO office after identity verification. If you notice suspicious activity, sign out and contact your SACCO.</p>
      <div class="form-actions">
        <button class="button secondary" type="button" data-action="logout">${t("logout")}</button>
      </div>
    </section>
  `;
}
