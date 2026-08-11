function buildNotificationProviderRiskRows(input) {
  return input.rows
    .map((row) => {
      const balance = Number(row.balance);
      const unavailable = normalizeOperationsModelText(row.status) !== "ready";
      const lowBalance = row.channel === "sms" && Number.isFinite(balance) && balance < 100;
      if (!unavailable && !lowBalance) return null;
      return {
        title: `${input.labelize(row.channel)} provider`,
        provider: input.labelize(row.provider),
        severity: unavailable ? "Critical" : "Warning",
        status: unavailable ? "Unavailable" : "Low credits",
        checkedAt: row.checkedAt || input.checkedAt || "",
        message: unavailable ? String(row.message || "") : `${balance} SMS credits remaining.`
      };
    })
    .filter(Boolean);
}

function filterLoginRiskEvents(events) {
  return events.filter((event) => isLoginRiskEvent(event));
}

function buildLoginRiskSummary(events, scopeKey) {
  return {
    blockedAttempts: events.filter((event) => normalizeOperationsModelText(event.action).includes("blocked")).length,
    failedCredentials: events.filter((event) => normalizeOperationsModelText(event.action).includes("failed")).length,
    memberPortal: events.filter((event) => loginRiskPortalFor(event) === "Member").length,
    riskEvents: events.length,
    staffPortal: events.filter((event) => loginRiskPortalFor(event) === "Staff").length,
    uniqueScopeCount: uniqueOperationsModelCount(events, scopeKey)
  };
}

function buildLoginRiskRows(input) {
  return input.events.slice(0, 6).map((event) => ({
    createdAt: input.formatDateTime(event.createdAt),
    sacco: event.tenantName,
    portal: loginRiskPortalFor(event),
    identity: event.recordReference || "Hidden",
    action: event.action,
    ipAddress: event.ipAddress || "-"
  }));
}

function isLoginRiskEvent(event) {
  const text = normalizeOperationsModelText(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  return text.includes("login") && ["failed", "blocked", "invalid"].some((word) => text.includes(word));
}

function loginRiskPortalFor(event) {
  return normalizeOperationsModelText(event.resourceType || event.module).includes("member") ? "Member" : "Staff";
}

function uniqueOperationsModelCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function normalizeOperationsModelText(value) {
  return String(value || "").toLowerCase();
}
