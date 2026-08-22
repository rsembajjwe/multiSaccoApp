function buildSaccoAccountHealthRows(input) {
  return input.tenants.map((tenant) => {
    const subscription = input.subscriptionForTenant(tenant.id);
    return {
      ...tenant,
      saccoCode: tenant.abbreviation || tenant.code || tenant.id || "",
      accountHealth: input.accountHealth(tenant, subscription),
      subscriptionStatus: subscription?.status || "No subscription",
      packageName: subscription?.tierLabel || subscription?.packageName || subscription?.packageId || "Not assigned",
      expiry: subscription?.expiry || subscription?.expiryDate || "",
      billableMembers: subscription?.billableMembers || subscription?.memberCount || tenant.memberCount || 0,
      paymentStage: input.paymentStage(tenant, subscription),
      approvalStage: input.approvalStage(tenant, subscription),
      action: "tenant-detail",
      actionLabel: "Open",
      actionId: tenant.id
    };
  });
}

function buildSaccoAccountSummary(rows, subscriptions) {
  return {
    activeAccounts: rows.filter((row) => normalizeNavigationModelText(row.status) === "active").length,
    expiringSoon: rows.filter((row) => normalizeNavigationModelText(row.subscriptionStatus).includes("expired") || normalizeNavigationModelText(row.accountHealth).includes("risk")).length,
    suspendedAccounts: rows.filter((row) => normalizeNavigationModelText(row.status).includes("suspended")).length,
    withoutSubscription: rows.filter((row) => !subscriptions.some((sub) => sub.tenantId === row.id)).length
  };
}

function buildMemberDirectoryRows(input) {
  return input.members.map((member) => ({
    ...member,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    kycReadiness: input.kycReadiness(member),
    action: "member-detail",
    actionLabel: "Open profile",
    actionId: member.id
  }));
}

function buildMemberDirectorySummary(rows) {
  return {
    activeMembers: rows.filter((member) => normalizeNavigationModelText(member.status) === "active").length,
    pendingKyc: pendingMemberKycRows(rows).length,
    portalReady: rows.filter((member) => normalizeNavigationModelText(member.status) === "active" && normalizeNavigationModelText(member.kycStatus) === "verified").length,
    registeredMembers: rows.length,
    totalBalances: rows.reduce((total, row) => total + Number(row.totalBalance || 0), 0)
  };
}

function memberRegisterFundDefinitions() {
  const base = [
    { code: "savings", name: "Savings", key: "savingsBalance" },
    { code: "shares", name: "Shares", key: "sharesBalance" },
    { code: "welfare", name: "Welfare", key: "welfareBalance" }
  ];
  const seen = new Set(base.map((fund) => fund.code));
  const configured = dataRows("fundTypes")
    .filter((fund) => fund.active !== false)
    .slice()
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || String(a.name || a.code || "").localeCompare(String(b.name || b.code || "")))
    .map((fund) => ({ code: String(fund.code || "").trim().toLowerCase(), name: fund.name || fund.code || "" }))
    .filter((fund) => fund.code && !seen.has(fund.code))
    .map((fund) => {
      seen.add(fund.code);
      return { ...fund, key: `${camelFundKey(fund.code)}Balance` };
    });
  return base.concat(configured);
}

function buildMemberRegisterRows(members) {
  const funds = memberRegisterFundDefinitions();
  const balances = memberFundBalanceIndex(dataRows("memberFundBalances"));
  return (members || []).map((member) => {
    const row = { ...member };
    funds.forEach((fund) => {
      const memberBalances = balances.get(member.id) || {};
      row[fund.key] = memberBalances[fund.code] ?? baseMemberFundBalance(member, fund.code);
    });
    delete row.totalBalance;
    return row;
  });
}

function memberRegisterFundColumns() {
  return memberRegisterFundDefinitions().map((fund) => fund.key);
}

function memberRegisterFundTotals(rows) {
  return memberRegisterFundDefinitions().map((fund) => ({
    ...fund,
    total: (rows || []).reduce((sum, row) => sum + Number(row[fund.key] || 0), 0)
  }));
}

function memberFundBalanceIndex(balances) {
  const index = new Map();
  (balances || []).forEach((balance) => {
    const memberId = balance.memberId || "";
    const fundCode = String(balance.fundCode || "").trim().toLowerCase();
    if (!memberId || !fundCode) return;
    const current = index.get(memberId) || {};
    current[fundCode] = Number(balance.balance || 0);
    index.set(memberId, current);
  });
  return index;
}

function baseMemberFundBalance(member, fundCode) {
  if (fundCode === "savings") return Number(member.savingsBalance || 0);
  if (fundCode === "shares") return Number(member.sharesBalance || 0);
  if (fundCode === "welfare") return Number(member.welfareBalance || 0);
  return 0;
}

function camelFundKey(code) {
  return String(code || "fund")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .map((part, index) => index ? part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase() : part.toLowerCase())
    .join("") || "fund";
}

function pendingMemberKycRows(members) {
  return members.filter((member) => normalizeNavigationModelText(member.kycStatus).includes("pending") || normalizeNavigationModelText(member.status).includes("pending"));
}

function uniqueNavigationValues(rows, key) {
  return [...new Set((rows || []).map((row) => row[key]).filter((value) => value !== undefined && value !== null && String(value).trim()))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function buildQuickSearchResult(group, recordId, view, title, meta, options = {}) {
  const safeRecordId = String(recordId || "");
  return {
    id: `${view}:${safeRecordId}`,
    recordId: safeRecordId,
    group,
    view,
    title: String(title || safeRecordId || "Record"),
    meta: String(meta || view),
    ...options
  };
}

function buildQuickSearchModel(input) {
  const query = String(input.query || "").trim();
  const results = query.length < 2
    ? []
    : input.index
      .filter((result) => normalizeNavigationModelText(`${result.group || ""} ${result.title || ""} ${result.meta || ""}`).includes(normalizeNavigationModelText(query)))
      .slice(0, input.limit || 8);
  const activeId = input.activeId && results.some((result) => result.id === input.activeId) ? input.activeId : "";
  return {
    activeId,
    results,
    groups: groupQuickSearchResults(results)
  };
}

function groupQuickSearchResults(results) {
  const groups = new Map();
  results.forEach((result) => {
    const group = result.group || "Results";
    groups.set(group, [...(groups.get(group) || []), result]);
  });
  return [...groups.entries()].map(([group, rows]) => ({ group, rows }));
}

function memberUnreadNotificationCount(notifications) {
  return notifications.filter((row) => !row.readAt && normalizeNavigationModelText(row.status) !== "read").length;
}

function staffUnreadNotificationCount(deliveries) {
  return uniqueStaffUnreadNotificationIds(deliveries).length;
}

function uniqueStaffUnreadNotificationIds(deliveries) {
  return deliveries
    .filter((row) => row.notificationId && !row.readAt)
    .map((row) => String(row.notificationId))
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

function normalizeNavigationModelText(value) {
  return String(value || "").toLowerCase();
}
