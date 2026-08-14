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
