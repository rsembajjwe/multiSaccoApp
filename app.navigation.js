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
  ["members", "Members", "KYC, profiles, statements", "members:view", ["admin", "chairperson", "secretary", "loans", "auditor"]],
  ["transactions", "Transactions", "Deposits and reversals", "transactions:view", ["admin", "treasurer", "accountant", "teller", "auditor"]],
  ["savings", "Savings", "Products, accounts and statements", "transactions:view", ["admin", "treasurer", "accountant", "auditor"]],
  ["shares", "Shares", "Share register and certificates", "transactions:view", ["admin", "treasurer", "secretary", "auditor"]],
  ["welfare", "Welfare", "Contributions, balances and claims", "transactions:view", ["admin", "treasurer", "secretary"]],
  ["loans", "Loans", "Applications and repayments", "loans:view", ["admin", "chairperson", "loans", "auditor"]],
  ["guarantors", "Guarantors", "Guarantee requests and obligations", "loans:view", ["admin", "chairperson", "loans"]],
  ["approvals", "Approvals", "Maker-checker decisions", "approvals:view", ["admin", "chairperson", "treasurer", "secretary", "loans"]],
  ["accounting", "Accounting", "Trial balance, journals and reports", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reconciliation", "Reconciliation", "Bank and mobile money", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reports", "Reports", "Operational and financial reporting", "reports:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "auditor"]],
  ["governance", "Governance", "Meetings, minutes and resolutions", "governance:view", ["admin", "chairperson", "secretary"]],
  ["complaints", "Complaints", "Member cases and support", "complaints:view", ["admin", "secretary", "chairperson"]],
  ["users", "Users and Roles", "SACCO staff access", "roles:view", ["admin"]],
  ["settings", "Settings", "Products, branches and controls", "roles:create", ["admin"]],
  ["audit", "Audit Logs", "Read-only sensitive activity", "reports:view", ["admin", "auditor"]]
];

const memberModules = [
  ["home", "Home", "Balances and quick actions"],
  ["money", "Money", "Accounts, statement and receipts"],
  ["loans", "Loans", "Loans and guarantor requests"],
  ["payments", "Payments", "Deposit and repay"],
  ["complaints", "Support", "Messages and notifications"],
  ["profile", "Profile", "Your details and security"]
];

function saccoAccounts() {
  const subscriptions = dataRows("subscriptions");
  const rows = tenantRows().map((tenant) => {
    const subscription = subscriptionForTenant(tenant.id);
    return {
      ...tenant,
      saccoCode: tenant.abbreviation || tenant.code || tenant.id,
      accountHealth: tenantAccountHealth(tenant, subscription),
      subscriptionStatus: subscription?.status || "No subscription",
      packageName: subscription?.tierLabel || subscription?.packageName || subscription?.packageId || "Not assigned",
      expiry: subscription?.expiry || subscription?.expiryDate || "",
      billableMembers: subscription?.billableMembers || subscription?.memberCount || tenant.memberCount || 0,
      paymentStage: saccoPaymentStage(tenant, subscription),
      approvalStage: saccoApprovalStage(tenant, subscription),
      action: "tenant-detail",
      actionLabel: "Open",
      actionId: tenant.id
    };
  });
  return `
    <div class="dashboard-grid">
      ${summary(t("activeAccounts"), rows.filter((row) => normal(row.status) === "active").length, "SACCOs allowed to operate", "Monitor")}
      ${summary(t("suspendedAccounts"), rows.filter((row) => normal(row.status).includes("suspended")).length, "Access disabled", t("review"))}
      ${summary(t("withoutSubscription"), rows.filter((row) => !subscriptions.some((sub) => sub.tenantId === row.id)).length, "Needs billing setup", "Assign")}
      ${summary(t("expiringSoon"), rows.filter((row) => normal(row.subscriptionStatus).includes("expired") || normal(row.accountHealth).includes("risk")).length, "Billing and access risk", "Renew")}
    </div>
    ${filterToolbar("Search SACCO code, name, country, currency, district, status, subscription or package", "Activate SACCO", "Export accounts")}
    ${tenantDetailPanel()}
    ${recordTable("SACCO account health", rows, ["saccoCode", "name", "country", "currencyCode", "district", "status", "accountHealth", "paymentStage", "approvalStage", "subscriptionStatus", "packageName", "billableMembers", "expiry"])}
  `;
}

function membersView() {
  const members = dataRows("members");
  const pendingKyc = members.filter((member) => normal(member.kycStatus).includes("pending") || normal(member.status).includes("pending"));
  const active = members.filter((member) => normal(member.status) === "active");
  const rows = members.map((member) => ({
    ...member,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    kycReadiness: memberKycReadiness(member),
    action: "member-detail",
    actionLabel: "Open profile",
    actionId: member.id
  }));
  const tab = state.memberTab || "overview";
  return `
    <div class="dashboard-grid">
      ${summary(t("registeredMembers"), members.length, "Member register only, not staff users", t("review"))}
      ${summary(t("activeMembers"), active.length, "Can transact and use portal", "Monitor")}
      ${summary(t("pendingKyc"), pendingKyc.length, "Needs document or approval follow-up", t("review"))}
      ${summary("Total balances", money.format(sum(rows, "totalBalance")), t("savingsSharesWelfare"), "Statements")}
      ${summary(t("portalReady"), rows.filter((member) => normal(member.status) === "active" && normal(member.kycStatus) === "verified").length, "Can use member login", "Audit")}
    </div>
    ${memberTabs(tab)}
    ${tab === "overview" ? rolePriorityPanel(t("memberManagementFocus"), [
      ["Member and staff separation", "Members are managed here. SACCO staff logins are managed under Users and Roles.", "Clear"],
      ["KYC workflow", `${pendingKyc.length} member profile(s) need verification, document review or approval action.`, pendingKyc.length ? "Pending" : "Clear"],
      ["Balances and statements", "Open a member profile to review balances, contacts, beneficiaries, documents and statement lines.", "Ready"]
    ]) : ""}
    ${tab === "register" ? memberRegistrationPanel() : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search by member number, name, phone, branch, KYC or status", "Register member", "Download statement")}
      ${recordTable("Member list", rows, ["membershipNo", "fullName", "phone", "email", "totalBalance", "kycReadiness", "kycStatus", "status"])}
    ` : ""}
    ${tab === "kyc" ? memberDetailPanel("kyc") : ""}
    ${tab === "contacts" ? memberDetailPanel("contacts") : ""}
    ${tab === "statement" ? memberDetailPanel("statement") : ""}
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
  return [...new Set((rows || []).map((row) => row[key]).filter((value) => value !== undefined && value !== null && String(value).trim()))].sort((a, b) => String(a).localeCompare(String(b)));
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

function moduleBlueprint(view) {
  if (view === "savings") return savingsView();
  if (view === "shares") return sharesView();
  if (view === "welfare") return welfareView();
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

