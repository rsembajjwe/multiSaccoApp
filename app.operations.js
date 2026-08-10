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
  return rows
    .map((row) => {
      const balance = Number(row.balance);
      const unavailable = normal(row.status) !== "ready";
      const lowBalance = row.channel === "sms" && Number.isFinite(balance) && balance < 100;
      if (!unavailable && !lowBalance) return null;
      return {
        title: `${labelize(row.channel)} provider`,
        provider: labelize(row.provider),
        severity: unavailable ? "Critical" : "Warning",
        status: unavailable ? "Unavailable" : "Low credits",
        checkedAt: row.checkedAt || state.notificationProviderStatusCheckedAt || state.lastSync,
        message: unavailable ? row.message : `${balance} SMS credits remaining.`
      };
    })
    .filter(Boolean);
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
  return normalizedAuditRows().filter((event) => {
    const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
    return text.includes("login") && ["failed", "blocked", "invalid"].some((word) => text.includes(word));
  });
}

function loginRiskSummaryPanel(platformScope) {
  const events = loginRiskEvents();
  const blocked = events.filter((event) => normal(event.action).includes("blocked"));
  const failed = events.filter((event) => normal(event.action).includes("failed"));
  const staff = events.filter((event) => normal(event.resourceType || event.module).includes("auth_login"));
  const members = events.filter((event) => normal(event.resourceType || event.module).includes("member_login"));
  const rows = events.slice(0, 6).map((event) => ({
    createdAt: formatDateTime(event.createdAt),
    sacco: event.tenantName,
    portal: normal(event.resourceType || event.module).includes("member") ? "Member" : "Staff",
    identity: event.recordReference || "Hidden",
    action: event.action,
    ipAddress: event.ipAddress || "-"
  }));
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
        ${mini("Risk events", events.length)}
        ${mini("Blocked attempts", blocked.length)}
        ${mini("Failed credentials", failed.length)}
        ${mini(platformScope ? "SACCOs affected" : "IP addresses", platformScope ? uniqueCount(events, "tenantId") : uniqueCount(events, "ipAddress"))}
        ${mini("Staff portal", staff.length)}
        ${mini("Member portal", members.length)}
      </div>
      ${recordTable("Recent login risk events", rows, ["createdAt", "sacco", "portal", "identity", "action", "ipAddress"])}
    </section>
  `;
}
