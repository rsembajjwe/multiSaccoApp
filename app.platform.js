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
  return `
    <div class="dashboard-grid">
      ${summaryLink(t("totalSaccos"), tenants.length, "All registered SACCOs", "Open applications", "sacco-applications")}
      ${summaryLink(t("activeSaccos"), tenants.filter((t) => normal(t.status) === "active").length, "Operating SACCOs", "View accounts", "sacco-accounts")}
      ${summaryLink(t("pendingRegistrations"), tenants.filter((t) => normal(t.status).includes("pending")).length, "Reviewer queue", t("review"), "sacco-applications")}
      ${summaryLink(t("expiredSubscriptions"), subs.filter((s) => normal(s.status).includes("expired")).length, "Billing risk", "Renew", "subscriptions")}
      ${summaryLink(t("totalSubscriptionRevenue"), money.format(sum(subs, "amount")), "Current records", "Open billing", "subscriptions")}
      ${summaryLink(t("saccoSupportTickets"), platformSupportTickets.filter((c) => !["closed", "resolved"].includes(normal(c.status))).length, "SACCO admin escalations", t("open"), "complaints")}
      ${summaryLink(t("failedPaymentTransactions"), transactions.filter((t) => normal(t.status).includes("failed")).length, "Provider exceptions", t("review"), "transactions")}
      ${summaryLink(t("activePlatformUsers"), users.filter((user) => normal(user.status) === "active").length || users.length, "Administrators and roles", "Manage access", "users")}
    </div>
    ${notificationProviderRiskPanel()}
    ${loginRiskSummaryPanel(true)}
    <div class="split-layout">
      ${chartCard("SACCO registrations by month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], [2, 3, 4, 5, 7, tenants.length || 3])}
      ${activityPanel(t("recentSaccoApplications"), tenants.slice(0, 5).map((tenant) => [tenant.name || tenant.legalName, tenant.district || "Uganda", tenant.status || t("pending")]))}
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
  return `
    ${dashboardIntro("Platform Operations Officer", "Monitor service health, onboarding queues, callbacks, incidents and SACCO operating status.")}
    <div class="dashboard-grid">
      ${summary("Operating SACCOs", tenants.filter((t) => normal(t.status) === "active").length, "Live SACCOs", "Monitor")}
      ${summary("Pending onboarding", pendingTenants().length, "Applications needing follow-up", "Open queue")}
      ${summary("Open support tickets", complaints.length, "Operational workload", "Assign")}
      ${summary("Failed callbacks", dataRows("mobileMoneyCallbacks").filter((row) => normal(row.status).includes("failed")).length, "Provider exceptions", "Retry")}
      ${summary("System alerts", operationAlerts().length, "Health checks", "Open")}
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
  return `
    ${dashboardIntro("Platform Billing Officer", "Control subscriptions, invoices, payment access and SACCO operating eligibility.")}
    <div class="dashboard-grid">
      ${summary("Active subscriptions", subs.filter((row) => normal(row.status) === "active").length, "Allowed to operate", "Review")}
      ${summary("Pending payments", subs.filter((row) => normal(row.paymentStatus || row.status).includes("pending")).length, "Awaiting confirmation", "Record")}
      ${summary("Expired subscriptions", subs.filter((row) => normal(row.status).includes("expired")).length, "Access risk", "Renew")}
      ${summary("Subscription revenue", money.format(sum(subs, "amount")), "Current records", "Export")}
      ${summary("Billable SACCOs", tenantRows().length, "Registered SACCOs", "Open")}
    </div>
    ${recordTable("Subscription list", subs, ["tenantName", "packageName", "billingPeriod", "expiryDate", "amount", "memberCount", "status"])}
    ${recordTable("SACCO billing access", tenantRows(), ["name", "district", "memberCount", "status"])}
  `;
}

function platformComplianceDashboard() {
  return `
    ${dashboardIntro("Platform Compliance Officer", "Oversight view for SACCO approvals, audit events, reports and operating exceptions.")}
    <div class="dashboard-grid">
      ${summary("Pending registrations", pendingTenants().length, "Approval oversight", "Review")}
      ${summary("Audit events", dataRows("auditEvents").length, "Sensitive actions", "Inspect")}
      ${summary("SACCO support tickets", openSaccoSupportTickets().length, "SACCO escalation cases", "Open")}
      ${summary("Operations alerts", operationAlerts().length, "System exceptions", "Review")}
      ${summary("Regulatory report", state.data.regulatoryReport ? "Ready" : "Pending", "Export readiness", "Open")}
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
  return `
    ${dashboardIntro("Platform Support Officer", "Help SACCO admins resolve onboarding, subscription and operating issues without member-level access.")}
    <div class="dashboard-grid">
      ${summary("SACCO support tickets", tickets.length, "SACCO admin escalations", "Open")}
      ${summary("Visible SACCOs", tenantRows().length, "SACCO support context", "View")}
      ${summary("Pending onboarding", pendingTenants().length, "Applicant follow-up", "Assist")}
      ${summary("Notifications", dataRows("notifications").length, "Recent messages", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("SACCO admin support tickets", tickets, ["id", "tenantName", "category", "subject", "assignedOfficer", "priority", "status"])}
      ${recordTable("SACCO support list", tenantRows(), ["name", "district", "contactPerson", "phone", "status"])}
    </div>
  `;
}
