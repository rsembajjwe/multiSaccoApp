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
  const fleetSummary = state.data.fleetSummary || {};
  dashboard.totalSaccos = Number(fleetSummary.totalOrganizations ?? dashboard.totalSaccos);
  dashboard.activeSaccos = Number(fleetSummary.active ?? dashboard.activeSaccos);
  dashboard.pendingRegistrations = Number(fleetSummary.pendingReview ?? dashboard.pendingRegistrations);
  dashboard.expiredSubscriptions = Number(fleetSummary.expiredSubscriptions ?? dashboard.expiredSubscriptions);
  dashboard.totalSubscriptionRevenue = Number(fleetSummary.totalSubscriptionRevenue ?? dashboard.totalSubscriptionRevenue);
  const activeSubscriptions = subs.filter((subscription) => normal(subscription.status) === "active").length;
  const operationalMetrics = platformDashboardOperationalMetrics(fleetSummary, subs, transactions);
  return `
    <div class="platform-dashboard">
      <section class="dashboard-hero">
        <div>
          <p class="eyebrow">Platform administration</p>
          <h2>Welcome back, ${escapeHtml(state.user?.fullName || roleLabel())}</h2>
          <p>Here is what is happening across Tereka's subscribed saving groups today.</p>
        </div>
        <div class="dashboard-hero-meta">
          <span class="status active">Systems operational</span>
          <small>Updated ${escapeHtml(formatDate(new Date()))}</small>
        </div>
      </section>
      <div class="dashboard-grid platform-kpi-grid">
      ${summaryLink(t("totalSaccos"), dashboard.totalSaccos, "All registered saving groups", "View SACCOs", "sacco-applications")}
      ${summaryLink(t("activeSaccos"), dashboard.activeSaccos, "Operating saving groups", "View accounts", "sacco-applications", "accounts")}
      ${summaryLink(t("pendingRegistrations"), dashboard.pendingRegistrations, "Applications awaiting review", t("review"), "sacco-applications")}
      ${summaryLink("Active subscriptions", activeSubscriptions, "Currently subscribed SACCOs", "Manage", "subscriptions")}
      ${summaryLink("Subscription revenue", money.format(dashboard.totalSubscriptionRevenue), "Recorded subscription value", "Open billing", "subscriptions")}
      </div>
      <div class="platform-operational-strip">
        ${platformDashboardSignal("Renewal rate", operationalMetrics.renewalRate, `${operationalMetrics.renewedSubscriptions} renewed subscriptions`, "positive")}
        ${platformDashboardSignal("Recurring revenue", money.format(operationalMetrics.monthlyRecurringRevenue), "Normalized monthly subscription value", "positive")}
        ${platformDashboardSignal("Overdue payments", money.format(operationalMetrics.overdueBalance), `${operationalMetrics.overdueSubscriptions} subscriptions require attention`, operationalMetrics.overdueSubscriptions ? "warning" : "positive")}
        ${platformDashboardSignal("Payment success", operationalMetrics.paymentSuccessRate, `${operationalMetrics.paymentAttempts} recorded gateway attempts`, operationalMetrics.failedPayments ? "warning" : "positive")}
        ${platformDashboardSignal("SMS balance", operationalMetrics.smsBalance, "Available platform messaging credit", operationalMetrics.smsWarning ? "warning" : "positive")}
      </div>
      <div class="platform-dashboard-main platform-dashboard-overview">
        ${platformSaccoSubscriptionChart(tenants, subs)}
        ${platformSaccoStatusPanel(fleetSummary, tenants)}
        ${platformQuickActionsPanel()}
      </div>
      <div class="platform-dashboard-secondary platform-dashboard-operations">
        ${platformRecentApplicationsPanel(tenants)}
        ${platformSystemAlertsPanel(operationAlerts(), fleetSummary)}
        ${platformActivityTimeline(tenants, subs, transactions)}
      </div>
      <div class="platform-dashboard-alerts">${notificationProviderRiskPanel()}</div>
    </div>
  `;
}

const PLATFORM_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function platformSaccoSubscriptionChart(tenants, subscriptions) {
  const selectedYear = platformDashboardSelectedYear(tenants, subscriptions);
  const yearOptions = platformDashboardYearOptions(tenants, subscriptions, selectedYear);
  const values = platformSaccoSubscriptionMonthlyCounts(tenants, subscriptions, selectedYear);
  const renewals = platformSubscriptionRenewalMonthlyCounts(subscriptions, selectedYear);
  const max = Math.max(...values.map((value, index) => value + renewals[index]), 1);
  const total = values.reduce((sum, value) => sum + Number(value || 0), 0) + renewals.reduce((sum, value) => sum + Number(value || 0), 0);
  return `<section class="panel platform-subscription-chart-panel">
    <div class="panel-heading compact-heading">
      <div>
        <h2>SACCO subscriptions by month</h2>
        <p>New subscriptions and recorded renewals in the selected year.</p>
      </div>
      <label class="inline-filter compact-filter">
        <span>Year</span>
        <select data-platform-dashboard-year>
          ${yearOptions.map((year) => `<option value="${year}" ${Number(year) === Number(selectedYear) ? "selected" : ""}>${year}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="chart-total-row">
      <div class="platform-chart-legend"><span><i class="new"></i>New subscriptions</span><span><i class="renewal"></i>Renewals</span></div>
      <strong>${total} events</strong>
    </div>
    <svg class="platform-month-chart" viewBox="0 0 620 240" role="img" aria-label="SACCO subscriptions and renewals by month">
      ${PLATFORM_MONTH_LABELS.map((label, index) => {
        const value = Number(values[index] || 0);
        const renewal = Number(renewals[index] || 0);
        const newHeight = value / max * 150;
        const renewalHeight = renewal / max * 150;
        const x = index * 49 + 22;
        const baseY = 195;
        return `<g><line class="chart-grid-tick" x1="${x - 7}" y1="${baseY}" x2="${x + 25}" y2="${baseY}"></line><rect class="chart-bar-new" x="${x}" y="${baseY - newHeight}" width="18" height="${newHeight}" rx="3"></rect><rect class="chart-bar-renewal" x="${x}" y="${baseY - newHeight - renewalHeight}" width="18" height="${renewalHeight}" rx="3"></rect><text class="chart-label" x="${x + 9}" y="218" text-anchor="middle">${label}</text></g>`;
      }).join("")}
    </svg>
  </section>`;
}

function platformSubscriptionRenewalMonthlyCounts(subscriptions, year) {
  const counts = Array(12).fill(0);
  (subscriptions || []).forEach((subscription) => {
    const value = subscription.renewedAt || subscription.renewalDate || subscription.lastRenewedAt;
    if (!value) return;
    const date = new Date(value);
    if (Number.isFinite(date.getTime()) && date.getFullYear() === Number(year)) counts[date.getMonth()] += 1;
  });
  return counts;
}

function platformDashboardOperationalMetrics(fleetSummary, subscriptions, transactions) {
  const active = (subscriptions || []).filter((row) => normal(row.status) === "active");
  const renewedSubscriptions = (subscriptions || []).filter((row) => row.renewedAt || row.renewalDate || row.lastRenewedAt).length;
  const renewalBase = Math.max(renewedSubscriptions, (subscriptions || []).filter((row) => platformSubscriptionExpiryDate(row)).length);
  const paymentRows = (transactions || []).filter((row) => ["subscription", "mobile_money", "payment"].some((term) => normal(row.type || row.category || row.channel).includes(term)));
  const successfulPayments = paymentRows.filter((row) => ["completed", "successful", "success", "posted", "paid"].includes(normal(row.status))).length;
  const failedPayments = paymentRows.filter((row) => ["failed", "rejected", "cancelled"].includes(normal(row.status))).length;
  const sms = platformDashboardSmsReportSummary();
  return {
    renewalRate: renewalBase ? `${Math.round(renewedSubscriptions / renewalBase * 100)}%` : "No renewals due",
    renewedSubscriptions,
    monthlyRecurringRevenue: active.reduce((sum, row) => sum + Number(row.amount || 0) / 12, 0),
    overdueBalance: Number(fleetSummary.outstandingSubscriptionBalance || 0),
    overdueSubscriptions: Number(fleetSummary.expiredSubscriptions || 0),
    paymentSuccessRate: paymentRows.length ? `${Math.round(successfulPayments / paymentRows.length * 100)}%` : "No attempts",
    paymentAttempts: paymentRows.length,
    failedPayments,
    smsBalance: sms.platformCredits === null ? "Not reported" : `${sms.format(sms.platformCredits)} SMS`,
    smsWarning: sms.platformCredits === null || sms.saccoCredits > sms.platformCredits
  };
}

function platformDashboardSignal(label, value, detail, tone) {
  return `<article class="platform-signal ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function platformSaccoStatusPanel(fleetSummary, tenants) {
  const distribution = fleetSummary.lifecycleDistribution || {};
  const active = Number(distribution.active ?? tenants.filter((row) => normal(row.status) === "active").length);
  const pending = Number(distribution.pending_review ?? tenants.filter((row) => normal(row.status).includes("pending")).length);
  const suspended = Number(distribution.suspended ?? tenants.filter((row) => normal(row.status) === "suspended").length);
  const total = Math.max(1, active + pending + suspended);
  const circumference = 251.2;
  const activeLength = active / total * circumference;
  const pendingLength = pending / total * circumference;
  const suspendedLength = suspended / total * circumference;
  return `<section class="panel platform-status-panel">
    <div class="panel-heading"><div><h2>SACCO status</h2><p>Current saving-group lifecycle.</p></div></div>
    <div class="platform-status-content">
      <div class="platform-status-donut"><svg viewBox="0 0 100 100" aria-label="SACCO lifecycle status chart"><circle class="track" cx="50" cy="50" r="40"></circle><circle class="active" cx="50" cy="50" r="40" stroke-dasharray="${activeLength} ${circumference - activeLength}"></circle><circle class="pending" cx="50" cy="50" r="40" stroke-dasharray="${pendingLength} ${circumference - pendingLength}" stroke-dashoffset="${-activeLength}"></circle><circle class="suspended" cx="50" cy="50" r="40" stroke-dasharray="${suspendedLength} ${circumference - suspendedLength}" stroke-dashoffset="${-(activeLength + pendingLength)}"></circle></svg><span><strong>${active + pending + suspended}</strong><small>Total</small></span></div>
      <ul class="platform-status-legend">
        ${platformStatusLegendItem("active", "Active", active, total)}
        ${platformStatusLegendItem("pending", "Pending review", pending, total)}
        ${platformStatusLegendItem("suspended", "Suspended", suspended, total)}
      </ul>
    </div>
  </section>`;
}

function platformStatusLegendItem(tone, label, value, total) {
  return `<li><i class="${tone}"></i><span>${escapeHtml(label)}</span><strong>${value} <small>(${Math.round(value / total * 100)}%)</small></strong></li>`;
}

function platformQuickActionsPanel() {
  const actions = [
    ["Register SACCO", "sacco-applications", "register", "+"],
    ["Approve application", "sacco-applications", "applications", "✓"],
    ["Manage subscriptions", "subscriptions", "", "▤"],
    ["Generate report", "reports", "", "↗"]
  ];
  return `<section class="panel platform-quick-actions"><div class="panel-heading"><div><h2>Quick actions</h2><p>Common platform workflows.</p></div></div><div>${actions.map(([label, view, tab, icon]) => {
    const allowed = canAccessView(view);
    return `<button type="button" ${allowed ? `data-summary-view="${view}"${tab ? ` data-summary-tab="${tab}"` : ""}` : "disabled"}><span>${icon}</span><strong>${label}</strong></button>`;
  }).join("")}</div></section>`;
}

function platformRecentApplicationsPanel(tenants) {
  const rows = [...(tenants || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
  return `<section class="panel platform-list-panel"><div class="panel-heading"><div><h2>Recent SACCO applications</h2><p>Latest organization records.</p></div><button class="link-button" type="button" data-summary-view="sacco-applications">View all →</button></div><div class="platform-application-list">${rows.map((row) => `<div><span class="platform-list-avatar">${escapeHtml(initials(row.name || row.legalName))}</span><span><strong>${escapeHtml(row.name || row.legalName || "SACCO")}</strong><small>${escapeHtml(row.district || row.location || "Uganda")} · ${escapeHtml(formatDate(row.createdAt))}</small></span><em class="status ${statusClass(row.status)}">${escapeHtml(labelize(row.status || "pending review"))}</em></div>`).join("") || `<p class="empty-state">No SACCO applications available.</p>`}</div></section>`;
}

function platformSystemAlertsPanel(alerts, fleetSummary) {
  const rows = [...(alerts || [])];
  if (Number(fleetSummary.renewalsDueIn30Days || 0)) rows.unshift({ title: `${fleetSummary.renewalsDueIn30Days} subscription renewal(s) due within 30 days`, severity: "warning", status: "Review billing" });
  if (Number(fleetSummary.expiredSubscriptions || 0)) rows.unshift({ title: `${fleetSummary.expiredSubscriptions} subscription(s) expired`, severity: "critical", status: "Payment overdue" });
  return `<section class="panel platform-list-panel system-alerts-panel"><div class="panel-heading"><div><h2>System alerts</h2><p>Operational and subscription exceptions.</p></div><button class="link-button" type="button" data-summary-view="operations">View all →</button></div><div class="platform-alert-list">${rows.slice(0, 4).map((row) => `<div><i class="${escapeHtml(normal(row.severity || "info"))}">!</i><span><strong>${escapeHtml(row.title || "Platform alert")}</strong><small>${escapeHtml(row.status || row.severity || "Review")}</small></span></div>`).join("") || `<div><i class="healthy">✓</i><span><strong>No active system alerts</strong><small>All monitored services are operating normally.</small></span></div>`}</div></section>`;
}

function platformActivityTimeline(tenants, subscriptions, transactions) {
  const events = [
    ...(tenants || []).map((row) => ({ title: `SACCO registered: ${row.name || row.legalName || "New SACCO"}`, date: row.createdAt })),
    ...(subscriptions || []).map((row) => ({ title: `Subscription ${normal(row.status) === "active" ? "activated" : labelize(row.status || "updated")}: ${tenantName(row.tenantId)}`, date: row.updatedAt || row.renewedAt || row.createdAt })),
    ...(transactions || []).filter((row) => normal(row.status) === "completed").map((row) => ({ title: `Payment completed: ${tenantName(row.tenantId)}`, date: row.postedAt || row.createdAt }))
  ].filter((row) => row.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  return `<section class="panel platform-list-panel platform-activity-panel"><div class="panel-heading"><div><h2>Platform activity</h2><p>Recent live platform events.</p></div><button class="link-button" type="button" data-summary-view="audit">View all →</button></div><ol class="platform-activity-list">${events.map((event) => `<li><i></i><span><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(formatDateTime(event.date))}</small></span></li>`).join("") || `<li><i></i><span><strong>No recent activity</strong><small>New platform events will appear here.</small></span></li>`}</ol></section>`;
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
    return `<section class="panel expiring-subscriptions-panel">
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
  return recordTable("Subscriptions expiring soon", rows, ["tenantName", "packageName", "expiry", "renewalWindow", "paymentPosition", "severity"], { panelClass: "expiring-subscriptions-panel compact-dashboard-table" });
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
        renewalWindow: platformRenewalWindowLabel(daysToExpiry),
        amount: money.format(amount),
        paid: money.format(paid),
        balanceDue: money.format(Math.max(0, amount - paid)),
        paymentPosition: `${money.format(paid)} paid / ${money.format(Math.max(0, amount - paid))} due`,
        severity: platformSubscriptionSeverityLabel(subscription, daysToExpiry),
        status: platformSubscriptionStatusLabel(subscription, daysToExpiry),
        sortDaysToExpiry: daysToExpiry,
        rowClass: daysToExpiry < 0 ? "table-row-warning" : ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.sortDaysToExpiry) - Number(b.sortDaysToExpiry))
    .slice(0, 10);
}

function platformRenewalWindowLabel(daysToExpiry) {
  if (daysToExpiry < 0) return `Overdue by ${Math.abs(daysToExpiry)}d`;
  if (daysToExpiry === 0) return "Due today";
  return `${daysToExpiry}d left`;
}

function platformSubscriptionSeverityLabel(subscription, daysToExpiry) {
  if (daysToExpiry < 0) return "Overdue";
  if (daysToExpiry <= 14) return "Priority";
  const balanceDue = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  if (balanceDue > 0) return "Pending";
  return "Active";
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
