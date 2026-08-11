function buildPlatformDashboardSummary(input) {
  return {
    activePlatformUsers: input.users.filter((user) => normalizePlatformModelText(user.status) === "active").length || input.users.length,
    activeSaccos: input.tenants.filter((tenant) => normalizePlatformModelText(tenant.status) === "active").length,
    expiredSubscriptions: input.subscriptions.filter((subscription) => normalizePlatformModelText(subscription.status).includes("expired")).length,
    failedPaymentTransactions: input.transactions.filter((transaction) => normalizePlatformModelText(transaction.status).includes("failed")).length,
    openSaccoSupportTickets: input.supportTickets.filter((ticket) => !["closed", "resolved"].includes(normalizePlatformModelText(ticket.status))).length,
    pendingRegistrations: input.tenants.filter((tenant) => normalizePlatformModelText(tenant.status).includes("pending")).length,
    totalSaccos: input.tenants.length,
    totalSubscriptionRevenue: sumPlatformModelValues(input.subscriptions, "amount")
  };
}

function buildPlatformOperationsSummary(input) {
  return {
    failedCallbacks: input.callbacks.filter((row) => normalizePlatformModelText(row.status).includes("failed")).length,
    openSupportTickets: input.openSupportTickets.length,
    operatingSaccos: input.tenants.filter((tenant) => normalizePlatformModelText(tenant.status) === "active").length,
    pendingOnboarding: input.pendingTenants.length,
    systemAlerts: input.alerts.length
  };
}

function buildPlatformBillingSummary(input) {
  return {
    activeSubscriptions: input.subscriptions.filter((row) => normalizePlatformModelText(row.status) === "active").length,
    billableSaccos: input.tenants.length,
    expiredSubscriptions: input.subscriptions.filter((row) => normalizePlatformModelText(row.status).includes("expired")).length,
    pendingPayments: input.subscriptions.filter((row) => normalizePlatformModelText(row.paymentStatus || row.status).includes("pending")).length,
    subscriptionRevenue: sumPlatformModelValues(input.subscriptions, "amount")
  };
}

function buildPlatformComplianceSummary(input) {
  return {
    auditEvents: input.auditEvents.length,
    operationsAlerts: input.alerts.length,
    pendingRegistrations: input.pendingTenants.length,
    regulatoryReportStatus: input.regulatoryReportReady ? "Ready" : "Pending",
    saccoSupportTickets: input.openSupportTickets.length
  };
}

function buildPlatformSupportSummary(input) {
  return {
    notifications: input.notifications.length,
    pendingOnboarding: input.pendingTenants.length,
    saccoSupportTickets: input.tickets.length,
    visibleSaccos: input.tenants.length
  };
}

function buildRecentSaccoApplicationRows(tenants, pendingLabel) {
  return tenants.slice(0, 5).map((tenant) => [
    tenant.name || tenant.legalName,
    tenant.district || "Uganda",
    tenant.status || pendingLabel
  ]);
}

function sumPlatformModelValues(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function normalizePlatformModelText(value) {
  return String(value || "").toLowerCase();
}
