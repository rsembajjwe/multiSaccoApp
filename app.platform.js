// Platform administration rendering helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

function platformDashboard() {
  const role = roleKind();
  if (role === "operations") return platformOperationsDashboard();
  if (role === "billing") return platformBillingDashboard();
  if (role === "compliance") return platformComplianceDashboard();
  if (role === "support") return platformSupportDashboard();
  const tenants = dataRows("tenants").filter((tenant) => tenant.id !== "tenant_platform");
  const subs = dataRows("subscriptions");
  const transactions = dataRows("transactions");
  const users = platformUsers();
  const platformSupportTickets = saccoSupportTickets();
  const dashboard = buildPlatformDashboardSummary({ supportTickets: platformSupportTickets, subscriptions: subs, tenants, transactions, users });
  return `
    <div class="dashboard-grid">
      ${summaryLink(t("totalSaccos"), dashboard.totalSaccos, "All registered SACCOs", "Open applications", "sacco-applications")}
      ${summaryLink(t("activeSaccos"), dashboard.activeSaccos, "Operating SACCOs", "View accounts", "sacco-accounts")}
      ${summaryLink(t("pendingRegistrations"), dashboard.pendingRegistrations, "Reviewer queue", t("review"), "sacco-applications")}
      ${summaryLink(t("expiredSubscriptions"), dashboard.expiredSubscriptions, "Billing risk", "Renew", "subscriptions")}
      ${summaryLink(t("totalSubscriptionRevenue"), money.format(dashboard.totalSubscriptionRevenue), "Current records", "Open billing", "subscriptions")}
      ${summaryLink(t("saccoSupportTickets"), dashboard.openSaccoSupportTickets, "SACCO admin escalations", t("open"), "complaints")}
      ${summaryLink(t("failedPaymentTransactions"), dashboard.failedPaymentTransactions, "Provider exceptions", t("review"), "transactions")}
      ${summaryLink(t("activePlatformUsers"), dashboard.activePlatformUsers, "Administrators and roles", "Manage access", "users")}
    </div>
    ${notificationProviderRiskPanel()}
    ${loginRiskSummaryPanel(true)}
    <div class="split-layout">
      ${chartCard("SACCO registrations by month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], [2, 3, 4, 5, 7, tenants.length || 3])}
      ${activityPanel(t("recentSaccoApplications"), buildRecentSaccoApplicationRows(tenants, t("pending")))}
    </div>
    <div class="grid two">
      ${recordTable("Subscriptions expiring soon", subs, ["tenantName", "packageName", "expiryDate", "status"])}
      ${recordTable("System alerts", operationAlerts(), ["title", "severity", "status", "checkedAt"])}
    </div>
  `;
}

function platformOperationsDashboard() {
  const tenants = tenantRows();
  const complaints = openSaccoSupportTickets();
  const operations = buildPlatformOperationsSummary({
    alerts: operationAlerts(),
    callbacks: dataRows("mobileMoneyCallbacks"),
    openSupportTickets: complaints,
    pendingTenants: pendingTenants(),
    tenants
  });
  return `
    ${dashboardIntro("Platform Operations Officer", "Monitor service health, onboarding queues, callbacks, incidents and SACCO operating status.")}
    <div class="dashboard-grid">
      ${summary("Operating SACCOs", operations.operatingSaccos, "Live SACCOs", "Monitor")}
      ${summary("Pending onboarding", operations.pendingOnboarding, "Applications needing follow-up", "Open queue")}
      ${summary("Open support tickets", operations.openSupportTickets, "Operational workload", "Assign")}
      ${summary("Failed callbacks", operations.failedCallbacks, "Provider exceptions", "Retry")}
      ${summary("System alerts", operations.systemAlerts, "Health checks", "Open")}
    </div>
    ${notificationProviderRiskPanel()}
    ${loginRiskSummaryPanel(true)}
    <div class="grid two">
      ${recordTable("Operations command center", operationAlerts(), ["title", "provider", "severity", "status", "checkedAt"])}
      ${recordTable("SACCO admin support tickets", complaints, ["id", "tenantName", "category", "subject", "priority", "status"])}
    </div>
  `;
}

function platformBillingDashboard() {
  const subs = dataRows("subscriptions");
  const billing = buildPlatformBillingSummary({ subscriptions: subs, tenants: tenantRows() });
  return `
    ${dashboardIntro("Platform Billing Officer", "Control subscriptions, invoices, payment access and SACCO operating eligibility.")}
    <div class="dashboard-grid">
      ${summary("Active subscriptions", billing.activeSubscriptions, "Allowed to operate", "Review")}
      ${summary("Pending payments", billing.pendingPayments, "Awaiting confirmation", "Record")}
      ${summary("Expired subscriptions", billing.expiredSubscriptions, "Access risk", "Renew")}
      ${summary("Subscription revenue", money.format(billing.subscriptionRevenue), "Current records", "Export")}
      ${summary("Billable SACCOs", billing.billableSaccos, "Registered SACCOs", "Open")}
    </div>
    ${recordTable("Subscription list", subs, ["tenantName", "packageName", "billingPeriod", "expiryDate", "amount", "memberCount", "status"])}
    ${recordTable("SACCO billing access", tenantRows(), ["name", "district", "memberCount", "status"])}
  `;
}

function platformComplianceDashboard() {
  const compliance = buildPlatformComplianceSummary({
    alerts: operationAlerts(),
    auditEvents: dataRows("auditEvents"),
    openSupportTickets: openSaccoSupportTickets(),
    pendingTenants: pendingTenants(),
    regulatoryReportReady: Boolean(state.data.regulatoryReport)
  });
  return `
    ${dashboardIntro("Platform Compliance Officer", "Oversight view for SACCO approvals, audit events, reports and operating exceptions.")}
    <div class="dashboard-grid">
      ${summary("Pending registrations", compliance.pendingRegistrations, "Approval oversight", "Review")}
      ${summary("Audit events", compliance.auditEvents, "Sensitive actions", "Inspect")}
      ${summary("SACCO support tickets", compliance.saccoSupportTickets, "SACCO escalation cases", "Open")}
      ${summary("Operations alerts", compliance.operationsAlerts, "System exceptions", "Review")}
      ${summary("Regulatory report", compliance.regulatoryReportStatus, "Export readiness", "Open")}
    </div>
    ${loginRiskSummaryPanel(true)}
    <div class="grid two">
      ${recordTable("Audit log", dataRows("auditEvents"), ["createdAt", "actor", "role", "tenantName", "action", "module", "result"])}
      ${recordTable("SACCO approval oversight", tenantRows(), ["name", "district", "contactPerson", "memberCount", "status"])}
    </div>
  `;
}

function platformSupportDashboard() {
  const tickets = openSaccoSupportTickets();
  const support = buildPlatformSupportSummary({
    notifications: dataRows("notifications"),
    pendingTenants: pendingTenants(),
    tenants: tenantRows(),
    tickets
  });
  return `
    ${dashboardIntro("Platform Support Officer", "Help SACCO admins resolve onboarding, subscription and operating issues without member-level access.")}
    <div class="dashboard-grid">
      ${summary("SACCO support tickets", support.saccoSupportTickets, "SACCO admin escalations", "Open")}
      ${summary("Visible SACCOs", support.visibleSaccos, "SACCO support context", "View")}
      ${summary("Pending onboarding", support.pendingOnboarding, "Applicant follow-up", "Assist")}
      ${summary("Notifications", support.notifications, "Recent messages", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("SACCO admin support tickets", tickets, ["id", "tenantName", "category", "subject", "assignedOfficer", "priority", "status"])}
      ${recordTable("SACCO support list", tenantRows(), ["name", "district", "contactPerson", "phone", "status"])}
    </div>
  `;
}
