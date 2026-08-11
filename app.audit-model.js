function buildAuditRows(input) {
  return (input.events || []).map((event) => ({
    ...event,
    actor: String(event.actorName || input.userName(String(event.actorUserId || ""))),
    category: auditCategoryFor(event),
    module: String(event.resourceType || event.module || "system"),
    recordReference: String(event.resourceId || event.recordReference || event.recordId || ""),
    result: String(event.result || "Recorded"),
    riskLevel: auditRiskLevelFor(event),
    tenantName: input.tenantName(String(event.tenantId || ""))
  }));
}

function buildAuditGroups(rows) {
  return {
    access: rows.filter((event) => event.category === "Access control"),
    approvals: rows.filter((event) => event.category === "Approvals"),
    finance: rows.filter((event) => event.category === "Financial activity"),
    highRisk: rows.filter((event) => event.riskLevel === "High"),
    reversals: rows.filter((event) => event.category === "Reversals"),
    sensitive: rows.filter((event) => event.riskLevel !== "Normal")
  };
}

function buildAuditSummary(rows, groups) {
  return {
    accessEvents: groups.access.length,
    actors: uniqueAuditCount(rows, "actorUserId"),
    affectedSaccos: uniqueAuditCount(rows, "tenantId"),
    approvalEvents: groups.approvals.length,
    financeEvents: groups.finance.length,
    highRiskEvents: groups.highRisk.length,
    latestEvent: String(rows[0]?.createdAt || "No event yet"),
    reversalEvents: groups.reversals.length,
    sensitiveEvents: groups.sensitive.length,
    totalEvents: rows.length
  };
}

function auditRiskLevelFor(event) {
  const text = normalizeAuditModelText(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["failed", "blocked", "too many", "invalid sacco"].some((word) => text.includes(word)) && text.includes("login")) return "High";
  if (["password", "role", "permission", "session", "reversal", "disbursed", "suspended", "terminated"].some((word) => text.includes(word))) return "High";
  if (["approved", "rejected", "status", "payment", "template", "complaint", "loan"].some((word) => text.includes(word))) return "Review";
  return "Normal";
}

function auditCategoryFor(event) {
  const text = normalizeAuditModelText(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["role", "permission", "password", "session", "login", "logout", "user"].some((word) => text.includes(word))) return "Access control";
  if (["reversal", "reverse", "corrected"].some((word) => text.includes(word))) return "Reversals";
  if (["approved", "rejected", "approval", "status", "decision", "submitted"].some((word) => text.includes(word))) return "Approvals";
  if (["transaction", "payment", "loan", "repayment", "expense", "asset", "product", "account", "branch"].some((word) => text.includes(word))) return "Financial activity";
  if (["complaint", "template", "notification"].some((word) => text.includes(word))) return "Operations";
  return "General";
}

function uniqueAuditCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function normalizeAuditModelText(value) {
  return String(value || "").toLowerCase();
}
