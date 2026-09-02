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
      ${platformDashboardSmsReportCard()}
      ${summaryLink(t("saccoSupportTickets"), dashboard.openSaccoSupportTickets, "SACCO admin escalations", t("open"), "complaints")}
      ${summaryLink(t("failedPaymentTransactions"), dashboard.failedPaymentTransactions, "Provider exceptions", t("review"), "transactions")}
      ${summaryLink(t("activePlatformUsers"), dashboard.activePlatformUsers, "Administrators and roles", "Manage access", "users")}
    </div>
    ${notificationProviderRiskPanel()}
    <div class="split-layout">
      ${platformSaccoSubscriptionChart(tenants, subs)}
      ${activityPanel(t("recentSaccoApplications"), buildRecentSaccoApplicationRows(tenants, t("pending")))}
    </div>
    <div class="grid two">
      ${platformExpiringSubscriptionsPanel(subs)}
      ${recordTable("System alerts", operationAlerts(), ["title", "severity", "status", "checkedAt"])}
    </div>
  `;
}

const PLATFORM_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function platformSaccoSubscriptionChart(tenants, subscriptions) {
  const selectedYear = platformDashboardSelectedYear(tenants, subscriptions);
  const yearOptions = platformDashboardYearOptions(tenants, subscriptions, selectedYear);
  const values = platformSaccoSubscriptionMonthlyCounts(tenants, subscriptions, selectedYear);
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
  return `<section class="panel platform-subscription-chart-panel">
    <div class="panel-heading compact-heading">
      <div>
        <h2>SACCO subscriptions by month</h2>
        <p>Subscribed SACCO accounts in the selected year.</p>
      </div>
      <label class="inline-filter compact-filter">
        <span>Year</span>
        <select data-platform-dashboard-year>
          ${yearOptions.map((year) => `<option value="${year}" ${Number(year) === Number(selectedYear) ? "selected" : ""}>${year}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="chart-total-row">
      <span>Total subscribed SACCOs in ${selectedYear}</span>
      <strong>${total}</strong>
    </div>
    <div class="bar-chart horizontal-month-chart">
      ${PLATFORM_MONTH_LABELS.map((label, index) => {
        const value = Number(values[index] || 0);
        const width = value > 0 ? Math.max(8, value / max * 100) : 0;
        return `<div><span>${label}</span><b style="width:${width}%"></b><strong>${value}</strong></div>`;
      }).join("")}
    </div>
  </section>`;
}

function platformDashboardSelectedYear(tenants, subscriptions) {
  const currentYear = new Date().getFullYear();
  const requested = Number(state.platformDashboardYear || currentYear);
  const years = platformDashboardYearOptions(tenants, subscriptions, requested);
  return years.includes(requested) ? requested : currentYear;
}

function platformDashboardYearOptions(tenants, subscriptions, selectedYear = new Date().getFullYear()) {
  const years = new Set([new Date().getFullYear(), Number(selectedYear)]);
  [...(tenants || []), ...(subscriptions || [])].forEach((row) => {
    ["subscribedAt", "activatedAt", "startDate", "createdAt", "paidAt", "updatedAt", "expiry"].forEach((key) => {
      const year = platformYearFromDate(row?.[key]);
      if (year) years.add(year);
    });
  });
  return Array.from(years)
    .filter((year) => Number.isFinite(Number(year)))
    .map(Number)
    .sort((a, b) => b - a);
}

function platformSaccoSubscriptionMonthlyCounts(tenants, subscriptions, year) {
  const tenantById = new Map((tenants || []).map((tenant) => [String(tenant.id || ""), tenant]));
  const seen = new Set();
  const counts = Array(12).fill(0);
  (subscriptions || []).forEach((subscription) => {
    const tenantId = String(subscription.tenantId || "");
    const tenant = tenantById.get(tenantId);
    if (!tenant || seen.has(tenantId)) return;
    if (["cancelled", "terminated", "rejected"].includes(normal(subscription.status))) return;
    const date = platformDateFromSubscription(subscription, tenant);
    if (!date || date.getFullYear() !== Number(year)) return;
    counts[date.getMonth()] += 1;
    seen.add(tenantId);
  });
  return counts;
}

function platformDateFromSubscription(subscription, tenant) {
  const value = subscription.subscribedAt
    || subscription.activatedAt
    || subscription.startDate
    || subscription.createdAt
    || subscription.paidAt
    || tenant.createdAt
    || subscription.updatedAt;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function platformYearFromDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getFullYear() : null;
}

function platformExpiringSubscriptionsPanel(subscriptions) {
  const rows = platformExpiringSubscriptionRows(subscriptions);
  if (!rows.length) {
    return `<section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Subscriptions expiring soon</h2>
          <p>Renewal watchlist from live SACCO subscription records.</p>
        </div>
        <span class="status active">Clear</span>
      </div>
      <div class="notice compact"><span>No SACCO subscriptions are expired or expiring in the next 90 days.</span></div>
    </section>`;
  }
  return recordTable("Subscriptions expiring soon", rows, ["tenantName", "packageName", "expiry", "daysToExpiry", "amount", "paid", "balanceDue", "status"]);
}

function platformExpiringSubscriptionRows(subscriptions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return (subscriptions || [])
    .map((subscription) => {
      const expiryDate = platformSubscriptionExpiryDate(subscription);
      if (!expiryDate) return null;
      const expiryDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
      const daysToExpiry = Math.ceil((expiryDay.getTime() - today.getTime()) / 86400000);
      if (daysToExpiry > 90) return null;
      const amount = Number(subscription.amount || 0);
      const paid = Number(subscription.paid || 0);
      return {
        tenantName: tenantName(subscription.tenantId),
        packageName: platformSubscriptionPackageName(subscription),
        expiry: formatDate(expiryDate.toISOString()),
        daysToExpiry: daysToExpiry < 0 ? `Expired ${Math.abs(daysToExpiry)} day(s)` : `${daysToExpiry} day(s)`,
        amount: money.format(amount),
        paid: money.format(paid),
        balanceDue: money.format(Math.max(0, amount - paid)),
        status: platformSubscriptionStatusLabel(subscription, daysToExpiry),
        sortDaysToExpiry: daysToExpiry,
        rowClass: daysToExpiry < 0 ? "table-row-warning" : ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.sortDaysToExpiry) - Number(b.sortDaysToExpiry))
    .slice(0, 10);
}

function platformSubscriptionExpiryDate(subscription) {
  const date = new Date(subscription?.expiry || subscription?.expiryDate || subscription?.expiresAt || "");
  return Number.isFinite(date.getTime()) ? date : null;
}

function platformSubscriptionPackageName(subscription) {
  const packages = dataRows("subscriptionPackages");
  const pkg = packages.find((item) => String(item.id || item.packageId || item.code || "") === String(subscription.packageId || ""));
  return subscription.packageName || pkg?.name || subscription.tierLabel || subscription.packageId || "Subscription package";
}

function platformSubscriptionStatusLabel(subscription, daysToExpiry) {
  const rawStatus = normal(subscription.status || subscription.lifecycleState || "");
  if (daysToExpiry < 0) return "Expired";
  if (rawStatus === "pending_payment") return "Pending payment";
  if (daysToExpiry <= 30) return "Renewal due";
  return labelize(subscription.status || "Active");
}

function platformDashboardSmsReportCard() {
  const sms = platformDashboardSmsReportSummary();
  const warning = sms.platformCredits !== null && sms.saccoCredits > sms.platformCredits;
  const notConfigured = sms.platformCredits === null;
  const allowed = canAccessView("notifications");
  return `<article class="summary-card ${warning || notConfigured ? "warning-card" : ""}">
    <span>SMS report</span>
    <strong>${sms.platformCredits === null ? "Not visible" : `${sms.format(sms.platformCredits)} SMS`}</strong>
    <small>Platform credit. SACCO credits: ${sms.format(sms.saccoCredits)} SMS</small>
    ${notConfigured ? `<small class="danger-text">${escapeHtml(sms.statusMessage)}</small>` : ""}
    ${warning ? `<small class="danger-text">SACCO credits exceed platform credit</small>` : ""}
    <button type="button" ${allowed ? `data-summary-view="notifications"` : "disabled"}>${allowed ? "Open SMS report" : t("dashboardOnly")}</button>
  </article>`;
}

function platformDashboardSmsReportSummary() {
  const subscriptions = dataRows("subscriptions");
  const saccoCredits = subscriptions.reduce((sum, row) => {
    const current = row.smsCreditBalance ?? Math.max(0, Number(row.smsCreditsAllocated || 0) - Number(row.smsCreditsUsed || 0));
    return sum + Number(current || 0);
  }, 0);
  const evidenceRows = Array.isArray(state.providerOperationalEvidence?.notificationProviderStatus)
    ? state.providerOperationalEvidence.notificationProviderStatus
    : [];
  const rows = [...(state.notificationProviderStatus || []), ...evidenceRows];
  const smsProvider = rows.find((row) => normal(row.provider).includes("afrosms") && numericProviderBalance(row.balance) !== null)
    || rows.find((row) => normal(row.channel) === "sms" && numericProviderBalance(row.balance) !== null)
    || rows.find((row) => normal(row.channel) === "sms" || normal(row.provider).includes("afrosms"));
  const providerBalance = smsProvider?.balance === null || smsProvider?.balance === undefined || smsProvider?.balance === ""
    ? null
    : numericProviderBalance(smsProvider.balance);
  const format = (value) => new Intl.NumberFormat(currentRegion().locale, { maximumFractionDigits: 0 }).format(Number(value || 0));
  return {
    platformCredits: Number.isFinite(providerBalance) ? providerBalance : null,
    saccoCredits,
    format,
    statusMessage: smsProvider
      ? `${labelize(smsProvider.provider || "sms")} has no balance`
      : "Provider status not loaded"
  };
}

function numericProviderBalance(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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
