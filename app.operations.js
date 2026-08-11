// Operations, provider risk and login-risk rendering extracted from app.js.

function operationsView() {
  const alerts = operationAlerts();
  const callbackRows = mobileMoneyOperationalRows();
  return `
    <div class="dashboard-grid">
      ${summary("Platform health", state.data.operations?.health || "Healthy", "Service status", "Open")}
      ${summary("Callback actions", callbackRows.length, "Payment provider", "Review")}
      ${summary("Notification delivery", dataRows("notifications").length, "SMS/email/push", "Open")}
    </div>
    ${mobileMoneyCallbackOperationsPanel()}
    ${alerts.length ? recordTable("Operations command center", alerts, ["title", "provider", "severity", "status", "checkedAt"]) : emptyState("No operational alerts", "Provider callbacks, notification delivery and health checks are clear.")}
  `;
}

function notificationProviderRiskRows() {
  const rows = state.notificationProviderStatus || [];
  return buildNotificationProviderRiskRows({
    checkedAt: state.notificationProviderStatusCheckedAt || state.lastSync,
    labelize,
    rows
  });
}

function notificationProviderRiskPanel() {
  const rows = notificationProviderRiskRows();
  if (!rows.length) return "";
  return `
    <section class="notice warning">
      <strong>Notification provider attention needed.</strong>
      <span>${escapeHtml(rows.map((row) => `${row.title}: ${row.status}`).join("; "))}</span>
      ${canAccessView("notifications") ? `<button class="button secondary" type="button" data-summary-view="notifications">Open notifications</button>` : ""}
    </section>
  `;
}

function loginRiskEvents() {
  return filterLoginRiskEvents(normalizedAuditRows());
}

function loginRiskSummaryPanel(platformScope) {
  const events = loginRiskEvents();
  const riskSummary = buildLoginRiskSummary(events, platformScope ? "tenantId" : "ipAddress");
  const rows = buildLoginRiskRows({ events, formatDateTime });
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${platformScope ? "Platform login risk" : "SACCO login risk"}</h2>
          <p>${platformScope ? "Failed and blocked sign-in attempts across platform and SACCO portals." : "Failed and blocked sign-in attempts affecting this SACCO."}</p>
        </div>
        <span class="status ${events.length ? "pending" : "active"}">${events.length ? "Review" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Risk events", riskSummary.riskEvents)}
        ${mini("Blocked attempts", riskSummary.blockedAttempts)}
        ${mini("Failed credentials", riskSummary.failedCredentials)}
        ${mini(platformScope ? "SACCOs affected" : "IP addresses", riskSummary.uniqueScopeCount)}
        ${mini("Staff portal", riskSummary.staffPortal)}
        ${mini("Member portal", riskSummary.memberPortal)}
      </div>
      ${recordTable("Recent login risk events", rows, ["createdAt", "sacco", "portal", "identity", "action", "ipAddress"])}
    </section>
  `;
}
