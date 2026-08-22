// Role module definitions and remaining navigation bridge render helpers for Tereka Online.
// These helpers connect the shell router to feature modules.

const platformModules = [
  ["dashboard", "Dashboard", "Platform performance and alerts", "dashboard:view", ["super", "operations", "billing", "compliance", "support"]],
  ["sacco-applications", "SACCO Registration", "Applications and approvals", "tenants:view", ["super", "operations", "billing", "compliance", "support"]],
  ["subscriptions", "Subscriptions", "Packages and renewals", "subscriptions:view", ["super", "billing"]],
  ["sacco-accounts", "SACCO Accounts", "SACCO account health", "tenants:view", ["super", "billing", "compliance"]],
  ["transactions", "Transactions", "Platform finance monitoring", "transactions:view", ["super"]],
  ["reports", "Reports", "Super admin reporting", "reports:view", ["super"]],
  ["complaints", "Complaints", "Support tickets and escalations", "complaints:view", ["super", "operations", "support"]],
  ["notifications", "Notifications", "SMS, email and in-app", "notifications:view", ["super", "operations"]],
  ["users", "Users and Roles", "Administrator access", "roles:view", ["super"]],
  ["audit", "Audit Logs", "Read-only platform audit trail", "reports:view", ["super", "compliance"]],
  ["settings", "System Settings", "Protected platform configuration", "roles:create", ["super"]]
];

const saccoModules = [
  ["dashboard", "Dashboard", "Role-specific SACCO operating view", "dashboard:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "teller", "auditor"]],
  ["members", "Members", "Profiles and statements", "members:view", ["admin", "chairperson", "secretary", "loans", "auditor"]],
  ["transactions", "Transactions", "Deposits and reversals", "transactions:view", ["admin", "treasurer", "accountant", "teller", "auditor"]],
  ["savings", "Savings", "Products, accounts and statements", "transactions:view", ["admin", "treasurer", "accountant", "auditor"]],
  ["shares", "Shares", "Share register and certificates", "transactions:view", ["admin", "treasurer", "secretary", "auditor"]],
  ["welfare", "Welfare", "Contributions, balances and claims", "transactions:view", ["admin", "treasurer", "secretary"]],
  ["member-dues", "Member Subscriptions", "Mandatory membership payments and expiry", "members:view", ["admin", "chairperson", "secretary", "treasurer"]],
  ["savings-transfers", "Savings Transfers", "Transfers and group deductions", "savings-transfer:view", ["admin", "chairperson", "treasurer"]],
  ["funding-sources", "Sources of Funds", "Capital, grants and borrowings register", "finance-source:view", ["admin", "chairperson", "treasurer"]],
  ["loans", "Loans", "Applications and repayments", "loans:view", ["admin", "chairperson", "loans", "auditor"]],
  ["guarantors", "Guarantors", "Guarantee requests and obligations", "loans:view", ["admin", "chairperson", "loans"]],
  ["approvals", "Approvals", "Maker-checker decisions", "approvals:view", ["admin", "chairperson", "treasurer", "secretary", "loans"]],
  ["accounting", "Accounting", "Trial balance, journals and reports", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reconciliation", "Reconciliation", "Bank and mobile money", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reports", "Reports", "Operational and financial reporting", "reports:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "auditor"]],
  ["governance", "Governance", "Meetings, minutes and resolutions", "governance:view", ["admin", "chairperson", "secretary"]],
  ["complaints", "Complaints", "Member cases and support", "complaints:view", ["admin", "secretary", "chairperson"]],
  ["users", "Users and Roles", "SACCO staff access", "roles:view", ["admin"]],
  ["settings", "Settings", "Products, branches and controls", "sacco-profile:manage", ["admin", "chairperson"]],
  ["audit", "Audit Logs", "Read-only sensitive activity", "reports:view", ["admin", "auditor"]]
];

const memberModules = [
  ["home", "Home", "Balances and quick actions"],
  ["money", "Finances", "Balances, statement and receipts"],
  ["loans", "Loans", "Loans and guarantor requests"],
  ["payments", "Payments", "Deposit and repay"],
  ["notifications", "Messages", "SACCO notices and alerts"],
  ["complaints", "Support", "Chat and complaint tracking"],
  ["profile", "Profile", "Your details"],
  ["security", "Security", "Login and recovery controls"]
];

function saccoAccounts() {
  const subscriptions = dataRows("subscriptions");
  const rows = buildSaccoAccountHealthRows({
    accountHealth: tenantAccountHealth,
    approvalStage: (tenant, subscription) => saccoApprovalStageFor(tenant || {}, subscription),
    paymentStage: (tenant, subscription) => saccoPaymentStageFor(tenant || {}, subscription),
    subscriptionForTenant,
    tenants: tenantRows()
  });
  const accountSummary = buildSaccoAccountSummary(rows, subscriptions);
  return `
    <div class="dashboard-grid">
      ${summary(t("activeAccounts"), accountSummary.activeAccounts, "SACCOs allowed to operate", "Monitor")}
      ${summary(t("suspendedAccounts"), accountSummary.suspendedAccounts, "Access disabled", t("review"))}
      ${summary(t("withoutSubscription"), accountSummary.withoutSubscription, "Needs billing setup", "Assign")}
      ${summary(t("expiringSoon"), accountSummary.expiringSoon, "Billing and access risk", "Renew")}
    </div>
    ${filterToolbar("Search SACCO code, name, country, currency, district, status, subscription or package", "Activate SACCO", "Export accounts")}
    ${tenantDetailPanel()}
    ${recordTable("SACCO account health", rows, ["saccoCode", "name", "country", "currencyCode", "district", "status", "accountHealth", "paymentStage", "approvalStage", "subscriptionStatus", "packageName", "billableMembers", "expiry"])}
  `;
}

function membersView() {
  const cycle = currentSaccoCycleContext();
  const members = filterMembersBySaccoCycle(dataRows("members"), cycle);
  const rows = buildMemberDirectoryRows({ kycReadiness: memberKycReadinessFor, members });
  const registerRows = buildMemberRegisterRows(rows);
  const fundColumns = memberRegisterFundColumns();
  const memberSummary = buildMemberDirectorySummary(rows);
  const pendingKyc = pendingMemberKycRows(rows);
  const availableTabs = ["list", "register", "kyc", "contacts", "statement"];
  const tab = availableTabs.includes(state.memberTab) ? state.memberTab : "list";
  return `
    ${memberAccountCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summary(t("registeredMembers"), memberSummary.registeredMembers, "Member register only, not staff users", t("review"))}
      ${summary(t("activeMembers"), memberSummary.activeMembers, "Can transact and use portal", "Monitor")}
      ${summary(t("pendingKyc"), memberSummary.pendingKyc, "Needs document or approval follow-up", t("review"))}
      ${summary("Fund sources", fundColumns.length, "Each SACCO fund is tracked separately", "Separate")}
      ${summary(t("portalReady"), memberSummary.portalReady, "Can use member login", "Audit")}
    </div>
    ${memberTabs(tab)}
    ${tab === "register" ? memberRegistrationPanel() : ""}
    ${tab === "list" ? `
      ${memberListToolbar()}
      ${state.memberListMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberListMessage)}</strong></div>` : ""}
      ${state.memberListError ? `<div class="notice warning"><strong>Member list action failed.</strong><span>${escapeHtml(state.memberListError)}</span></div>` : ""}
      ${recordTable(`Member account base - ${cycle.label}`, registerRows, ["membershipNo", "fullName", "phone", "email", ...fundColumns, "status"])}
      ${memberRegisterTotalsPanel(registerRows)}
    ` : ""}
    ${tab === "kyc" ? memberDetailPanel("kyc") : ""}
    ${tab === "contacts" ? memberDetailPanel("contacts") : ""}
    ${tab === "statement" ? memberDetailPanel("statement") : ""}
  `;
}

function memberAccountCyclePanel(cycle) {
  if (!cycle) return "";
  const periodLabel = typeof membershipPeriodLabel === "function" ? membershipPeriodLabel(cycle.period) : labelize(cycle.period);
  const selectedYear = Number(cycle.year);
  const selectedMonth = Number(cycle.month);
  return `
    <section class="panel compact-panel member-cycle-selector">
      <div class="panel-heading">
        <div>
          <h2>Select member account cycle</h2>
          <p>This controls which members appear in the member account base, exports and registration forms.</p>
        </div>
        <span class="status active">${escapeHtml(cycle.label)}</span>
      </div>
      <div class="form-grid compact-grid">
        <label><span>Cycle type</span><input value="${escapeHtml(periodLabel)}" readonly></label>
        ${cycle.period !== "once" ? `<label><span>Select year</span><select data-sacco-cycle-year>${governanceCycleYearOptions().map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}</select></label>` : ""}
        ${cycle.period === "monthly" ? `<label><span>Select month</span><select data-sacco-cycle-month>${governanceCycleMonthOptions(currentRegion().locale).map(([value, label]) => `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>` : ""}
        <label><span>Members shown for</span><input value="${escapeHtml(cycle.label)}" readonly></label>
      </div>
    </section>
  `;
}

function memberRegisterTotalsPanel(rows) {
  const totals = memberRegisterFundTotals(rows);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Member fund totals</h2>
          <p>Totals are separated by fund source. They are not combined into one member balance.</p>
        </div>
        <span class="status active">${rows.length} member(s)</span>
      </div>
      <div class="source-grid">
        ${totals.map((fund) => mini(fund.name, money.format(fund.total))).join("")}
      </div>
    </section>
  `;
}

function memberListToolbar() {
  const selected = state.selectedMember || dataRows("members").find((member) => member.id === state.selectedMemberId);
  const selectedLabel = selected ? `${selected.membershipNo || ""} ${selected.fullName || ""}`.trim() : "Open a member first";
  const selectedDisabled = selected ? "" : "disabled";
  return `
    <section class="filter-toolbar member-export-toolbar">
      <div class="member-export-fields">
        <label><span>Search members</span><input value="${escapeHtml(state.search)}" data-search-input placeholder="Search by member number, name, phone, branch or status"></label>
        <label><span>Selected member for statement</span><input value="${escapeHtml(selectedLabel)}" readonly></label>
      </div>
      <div class="member-export-actions">
        <div class="export-action-group primary-group">
          <span>Member actions</span>
          <button class="button primary" type="button" data-action="open-member-register">Register member</button>
        </div>
        <div class="export-action-group">
          <span>Selected member statement</span>
          <button class="button secondary" type="button" data-action="download-selected-member-statement-pdf" ${selectedDisabled}>Statement PDF</button>
          <button class="button secondary" type="button" data-action="download-selected-member-statement-excel" ${selectedDisabled}>Statement Excel</button>
          <button class="button ghost" type="button" data-action="download-selected-member-statement" ${selectedDisabled}>Statement CSV</button>
        </div>
        <div class="export-action-group">
          <span>All members register</span>
          <button class="button secondary" type="button" data-action="export-member-list-excel">All members Excel</button>
          <button class="button ghost" type="button" data-action="export-member-list-pdf">All members PDF</button>
          <button class="button ghost" type="button" data-action="export-member-registration-forms-pdf">Registration forms PDF</button>
        </div>
      </div>
    </section>
  `;
}

function memberTabs(activeTab) {
  const tabs = [
    ["list", t("memberList")],
    ["register", t("registerMember")],
    ["kyc", t("kycDetail")],
    ["contacts", t("contactsDocuments")],
    ["statement", t("statement")]
  ];
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-member-tab="${id}">${label}</button>`).join("")}
    </div>
  `;
}

function memberManagementOverviewPanel(memberSummary, pendingKyc) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member management focus</h2>
          <p>Manage SACCO members here. Staff users remain under Users and Roles.</p>
        </div>
        <span class="status ${pendingKyc.length ? "pending" : "active"}">${pendingKyc.length ? "Onboarding follow-up" : "Current"}</span>
      </div>
      <div class="source-grid">
        ${mini("Member and staff separation", "Members only")}
        ${mini("Onboarding workflow", `${pendingKyc.length} pending`)}
        ${mini("Portal access", `${memberSummary.portalReady} ready`)}
        ${mini("Balances and statements", money.format(memberSummary.totalBalances))}
      </div>
      ${pendingKyc.length ? recordTable("Onboarding follow-up", pendingKyc, ["membershipNo", "fullName", "phone", "status"]) : emptyState("No Onboarding follow-up", "Member onboarding records are current.")}
    </section>
  `;
}

function activeModuleTab(view, tabs) {
  const fallback = tabs[0]?.[0] || "overview";
  return tabs.some(([id]) => id === state.moduleTabs[view]) ? state.moduleTabs[view] : fallback;
}

function moduleTabs(view, tabs, activeTab = activeModuleTab(view, tabs)) {
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-module-tab-view="${escapeHtml(view)}" data-module-tab="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
}

function uniqueValues(rows, key) {
  return uniqueNavigationValues(rows, key);
}

function selectOption(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${String(selected || "all") === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function friendlyUserError(error, platformOnly = isPlatform()) {
  const message = error?.message || String(error || "Could not complete request.");
  const lower = normal(message);
  if (lower.includes("user with that email") && lower.includes("exists")) {
    return platformOnly
      ? "A platform administrator with that email already exists. Open the Platform administrator list to manage that user, or use a different email."
      : "A SACCO staff user with that email already exists. Open the SACCO staff access list to manage that user, or use a different email.";
  }
  return message.replace(/\btenants\b/gi, platformOnly ? "platform accounts" : "SACCOs").replace(/\btenant\b/gi, platformOnly ? "platform account" : "SACCO");
}

function moduleBlueprint(view = "") {
  if (view === "savings") return savingsView();
  if (view === "shares") return sharesView();
  if (view === "welfare") return welfareView();
  if (view === "funding-sources") return fundingSourcesView();
  if (view === "accounting") return accountingView();
  if (view === "reconciliation") return reconciliationView();
  if (view === "governance") return governanceView();
  if (view === "settings") return settingsView();
  if (view === "guarantors") return guarantorsView();
  const labels = {
  };
  const item = labels[view] || ["Module", ["Search", "Filters", "Tables", "Actions"]];
  return tabsCard(item[0], item[1]);
}
