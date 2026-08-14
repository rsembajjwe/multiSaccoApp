function reportsView() {
  const platform = isPlatform();
  const rows = reportRowsForCurrentContext(platform);
  const consolidated = buildRegulatoryConsolidatedReport({ currentTenantId: state.currentTenantId, platform, report: state.data.regulatoryReport || {}, rows });
  const catalogue = buildReportCatalogue(platform);
  const exceptions = reportExceptionCount(consolidated);
  const dataProtection = consolidated.dataProtectionEvidence || {};
  if (platform) return platformSuperAdminReportsView(rows, exceptions);
  const tabs = [["overview", "Overview"], ["catalogue", "Report catalogue"], ["readiness", "Report readiness"], ["regulatory", "SACCO regulatory report"]];
  const tab = activeModuleTab("reports", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("Members in report", consolidated.memberCount, "Active and inactive members", "Review")}
      ${summary("Savings reported", money.format(consolidated.savings || 0), "Member deposit balances", "Export")}
      ${summary("Loan portfolio", money.format(consolidated.loanPortfolio || 0), "Credit exposure", "Open")}
      ${summary("Compliance exceptions", exceptions, "Reconciliation and journal checks", "Investigate")}
      ${summary("Privacy requests", dataProtection.privacyRequests || 0, "Member data rights", "Review")}
      ${summary("KYC disposals", dataProtection.kycDocumentsDisposed || 0, "Document retention actions", "Trace")}
    </div>
    ${moduleTabs("reports", tabs, tab)}
    ${tab === "overview" ? reportEvidenceControlPanel(consolidated, exceptions) : ""}
    ${tab === "catalogue" ? `
      ${filterToolbar("Search reports by module, member group, product or compliance status", "Export report", "Schedule report")}
      <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report catalogue</h2>
          <p>SACCO reports focus on members, finance, accounting, governance and statutory evidence.</p>
        </div>
        <span>${catalogue.length} report group(s)</span>
      </div>
      <div class="report-grid">
        ${catalogue.map((report) => `
          <article class="report-card">
            <h3>${escapeHtml(report.title)}</h3>
            <p>${escapeHtml(report.copy)}</p>
            <div class="mini-grid">
              ${mini("Owner", report.owner)}
              ${mini("Output", report.output)}
            </div>
            <button class="button secondary" type="button">${escapeHtml(report.action)}</button>
          </article>
        `).join("")}
      </div>
    </section>
    ` : ""}
    ${tab === "readiness" ? reportReadinessPanel(consolidated) : ""}
    ${tab === "regulatory" ? recordTable("SACCO regulatory report", rows, ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "loanPortfolio", "activeLoans", "privacyRequests", "openPrivacyRequests", "kycReviewDue", "kycDisposed", "kycStorageActions", "dataProtectionStatus", "complianceStatus"]) : ""}
  `;
}

function platformSuperAdminReportsView(rows, exceptions) {
  const tenants = tenantRows();
  const subscriptions = dataRows("subscriptions");
  const users = platformUsers();
  const supportTickets = saccoSupportTickets();
  const consolidated = buildRegulatoryConsolidatedReport({ currentTenantId: state.currentTenantId, platform: true, report: state.data.regulatoryReport || {}, rows });
  const dataProtection = consolidated.dataProtectionEvidence || {};
  const platformSummary = buildPlatformReportSummary({
    complaints: supportTickets,
    subscriptions,
    tenants,
    transactions: dataRows("transactions"),
    users
  });
  return `
    <div class="dashboard-grid">
      ${summary(t("registeredSaccos"), platformSummary.registeredSaccos, "All SACCO accounts", t("review"))}
      ${summary(t("activeSaccos"), platformSummary.activeSaccos, "Allowed to operate", t("open"))}
      ${summary(t("subscriptionRevenue"), money.format(platformSummary.subscriptionRevenue), "Platform billing", t("export"))}
      ${summary(t("platformAdministrators"), platformSummary.platformAdministrators, "Users and roles", "Audit")}
      ${summary(t("pendingRegistrations"), platformSummary.pendingRegistrations, "Onboarding decisions", t("review"))}
      ${summary(t("openSaccoComplaints"), platformSummary.openSaccoComplaints, "Escalations from SACCO admins", t("review"))}
      ${summary(t("failedPayments"), platformSummary.failedPayments, "Provider exceptions", t("review"))}
      ${summary(t("complianceExceptions"), exceptions, "Reconciliation and journal checks", "Investigate")}
      ${summary("Privacy requests", dataProtection.privacyRequests || 0, "Across SACCOs", "Review")}
      ${summary("KYC disposals", dataProtection.kycDocumentsDisposed || 0, "File-store evidence", "Trace")}
    </div>
    ${platformSuperAdminReportingControlPanel(platformSummary, subscriptions)}
    ${filterToolbar("Search Super Admin reports by SACCO, billing status, administrator, compliance status or export type", "Export report", "Schedule report")}
    ${recordTable("Super Admin SACCO report", rows, ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "privacyRequests", "openPrivacyRequests", "kycReviewDue", "kycDisposed", "dataProtectionStatus", "complianceStatus"])}
    ${recordTable("Platform administrator access report", users, ["fullName", "email", "rolesLabel", "moduleScope", "status", "lastLogin"])}
  `;
}

function reportEvidenceControlPanel(consolidated, exceptions) {
  const rows = [
    ["Ledger evidence", `${consolidated.journalEntries || 0} journal entr${Number(consolidated.journalEntries || 0) === 1 ? "y" : "ies"} available for report support.`, Number(consolidated.unbalancedJournalEntries || 0) ? "Review" : "Clear"],
    ["Reconciliation evidence", `${consolidated.reconciliationExceptions || 0} reconciliation exception(s) affect export confidence.`, Number(consolidated.reconciliationExceptions || 0) ? "Investigate" : "Clear"],
    ["Compliance status", `Current report status is ${labelize(consolidated.complianceStatus || (exceptions ? "review" : "clear"))}.`, exceptions ? "Review" : "Ready"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(t("reportingEvidenceControl"))}</h2>
          <p>Confirm ledger, reconciliation and compliance evidence before exporting SACCO reports.</p>
        </div>
        <span class="status ${exceptions ? "pending" : "active"}">${exceptions ? "Review" : "Ready"}</span>
      </div>
      <div class="mini-grid">
        ${rows.map(([label, detail, status]) => mini(label, `${detail}${status ? ` (${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}

function reportRowsForCurrentContext(platform) {
  return buildRegulatoryReportRows({
    assets: dataRows("assets"),
    complaints: dataRows("complaints"),
    currentTenantId: state.currentTenantId,
    expenses: dataRows("expenses"),
    labelize,
    loans: dataRows("loans"),
    members: dataRows("members"),
    platform,
    report: state.data.regulatoryReport || {},
    selectedTenantId: state.tenant?.id,
    tenantName,
    tenants: tenantRows()
  });
}

function platformSuperAdminReportingControlPanel(platformSummary, subscriptions) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(t("superAdminReportingControl"))}</h2>
          <p>Super Admin reports focus on SACCO account status, billing, administrator access and compliance risk.</p>
        </div>
        <span class="status ${platformSummary.pendingRegistrations || platformSummary.expiredSubscriptions ? "pending" : "active"}">${platformSummary.pendingRegistrations || platformSummary.expiredSubscriptions ? "Review" : "Current"}</span>
      </div>
      <div class="mini-grid">
        ${mini("SACCO account status", `${platformSummary.registeredSaccos} SACCO account(s) tracked`)}
        ${mini("Billing control", `${subscriptions.length} subscription record(s)`)}
        ${mini("Access governance", `${platformSummary.platformAdministrators} platform administrator account(s)`)}
        ${mini("Compliance focus", `${platformSummary.openSaccoComplaints || 0} SACCO admin complaint(s)`)}
      </div>
    </section>
  `;
}

function reportReadinessPanel(consolidated) {
  const exceptions = reportExceptionCount(consolidated);
  const dataProtection = consolidated.dataProtectionEvidence || {};
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report readiness</h2>
          <p>Evidence checks before exporting board, regulator or management reports.</p>
        </div>
        <span class="status ${exceptions ? "pending" : "active"}">${exceptions ? "Review needed" : "Ready"}</span>
      </div>
      <div class="source-grid">
        ${mini("Ledger entries", consolidated.journalEntries || 0)}
        ${mini("Unbalanced journals", consolidated.unbalancedJournalEntries || 0)}
        ${mini("Reconciliation exceptions", consolidated.reconciliationExceptions || 0)}
        ${mini("Open complaints", consolidated.openComplaints || 0)}
        ${mini("Open resolutions", consolidated.openResolutions || 0)}
        ${mini("Privacy requests", dataProtection.privacyRequests || 0)}
        ${mini("KYC review due", dataProtection.kycDocumentsReviewDue || 0)}
        ${mini("KYC disposals", dataProtection.kycDocumentsDisposed || 0)}
        ${mini("Storage actions", dataProtection.kycStorageActions || 0)}
        ${mini("Data protection", dataProtection.evidenceStatus || "review")}
        ${mini("Compliance status", consolidated.complianceStatus || "review")}
      </div>
    </section>
  `;
}

function auditView() {
  const rows = buildAuditRows({ events: dataRows("auditEvents"), tenantName, userName });
  const auditGroups = buildAuditGroups(rows);
  const auditSummary = buildAuditSummary(rows, auditGroups);
  const loginRisks = loginRiskEvents();
  const tabs = [["overview", "Overview"], ["evidence", isPlatform() ? t("platformAuditEvidence") : t("saccoAuditEvidence")], ["sensitive", t("sensitiveAuditQueue")], ["trail", isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail")]];
  const tab = activeModuleTab("audit", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("auditEvents"), auditSummary.totalEvents, "Immutable activity trail", "Inspect")}
      ${summary(t("highRiskEvents"), auditSummary.highRiskEvents, "Roles, sessions and reversals", t("review"))}
      ${summary(t("loginRiskEvents"), loginRisks.length, "Failed and blocked sign-ins", t("review"))}
      ${summary(isPlatform() ? "SACCOs affected" : t("actorsInvolved"), isPlatform() ? auditSummary.affectedSaccos : auditSummary.actors, isPlatform() ? "Across visible SACCOs" : "Within this SACCO", "Filter")}
      ${summary(t("actors"), auditSummary.actors, "Users and system actions", "Trace")}
    </div>
    ${moduleTabs("audit", tabs, tab)}
    ${tab === "overview" ? auditControlPanel(auditSummary) : ""}
    ${tab === "evidence" ? `
      ${filterToolbar("Search audit logs by SACCO, actor, action, module, IP address or record ID", "Export audit log", "Print report")}
      ${auditEvidencePanel(auditSummary, auditGroups)}
    ` : ""}
    ${tab === "sensitive" ? recordTable("Sensitive audit queue", auditGroups.sensitive, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "riskLevel"]) : ""}
    ${tab === "trail" ? recordTable(isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail"), rows, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "result"]) : ""}
  `;
}

function auditControlPanel(auditSummary) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(t("auditEvidenceControl"))}</h2>
          <p>Trace sensitive sessions, role changes, approvals, reversals and finance actions.</p>
        </div>
        <span class="status ${auditSummary.highRiskEvents ? "pending" : "active"}">${auditSummary.highRiskEvents ? "Review" : "Clear"}</span>
      </div>
      <div class="mini-grid">
        ${mini("High-risk review", `${auditSummary.highRiskEvents} event(s)`)}
        ${mini("Decision evidence", `${auditSummary.approvalEvents} approval(s), ${auditSummary.reversalEvents} reversal(s)`)}
        ${mini("Access and finance", `${auditSummary.accessEvents} access, ${auditSummary.financeEvents} finance`)}
        ${mini("Audit records", auditSummary.totalEvents)}
      </div>
    </section>
  `;
}

function auditEvidencePanel(auditSummary, auditGroups) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${isPlatform() ? "Platform audit evidence" : "SACCO audit evidence"}</h2>
          <p>${isPlatform() ? "System-wide oversight for administrator actions, SACCO account changes and sensitive access." : "Read-only evidence for SACCO approvals, finance actions, reversals, role changes and session activity."}</p>
        </div>
        <span class="status ${auditSummary.sensitiveEvents ? "pending" : "active"}">${auditSummary.sensitiveEvents ? "Review queue" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Latest event", auditSummary.latestEvent)}
        ${mini("Approval events", auditSummary.approvalEvents)}
        ${mini("Reversal events", auditSummary.reversalEvents)}
        ${mini("Access events", auditSummary.accessEvents)}
        ${mini("Finance events", auditSummary.financeEvents)}
        ${mini("Sensitive queue", auditSummary.sensitiveEvents)}
      </div>
    </section>
    <div class="report-grid">
      ${auditCategoryCard("Approvals", auditGroups.approvals, "Maker-checker decisions, status changes and review outcomes.")}
      ${auditCategoryCard("Reversals", auditGroups.reversals, "Financial corrections that require follow-up evidence.")}
      ${auditCategoryCard("Access control", auditGroups.access, "Logins, sessions, password, role and permission changes.")}
      ${auditCategoryCard("Financial activity", auditGroups.finance, "Transactions, repayments, expenses, assets and contribution setup.")}
    </div>
  `;
}

function auditCategoryCard(title, rows, copy) {
  const latest = rows[0]?.createdAt || "No events";
  return `
    <article class="report-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      <div class="mini-grid">
        ${mini("Events", rows.length)}
        ${mini("Latest", latest)}
      </div>
      <button class="button secondary" type="button">Review</button>
    </article>
  `;
}

