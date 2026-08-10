function reportsView() {
  const platform = isPlatform();
  const rows = regulatoryReportRows(platform);
  const consolidated = regulatoryConsolidated(rows);
  const catalogue = reportCatalogue(platform);
  const exceptions = Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
  const dataProtection = consolidated.dataProtectionEvidence || {};
  if (platform) return platformSuperAdminReportsView(rows, exceptions);
  const tabs = [["catalogue", "Report catalogue"], ["readiness", "Report readiness"], ["regulatory", "SACCO regulatory report"]];
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
    ${tab === "overview" ? rolePriorityPanel(t("reportingEvidenceControl"), [
      ["Ledger evidence", `${consolidated.journalEntries || 0} journal entr${Number(consolidated.journalEntries || 0) === 1 ? "y" : "ies"} available for report support.`, Number(consolidated.unbalancedJournalEntries || 0) ? "Review" : "Clear"],
      ["Reconciliation evidence", `${consolidated.reconciliationExceptions || 0} reconciliation exception(s) affect export confidence.`, Number(consolidated.reconciliationExceptions || 0) ? "Investigate" : "Clear"],
      ["Compliance status", `Current report status is ${labelize(consolidated.complianceStatus || (exceptions ? "review" : "clear"))}.`, exceptions ? "Review" : "Ready"]
    ]) : ""}
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
  const dataProtection = regulatoryConsolidated(rows).dataProtectionEvidence || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("registeredSaccos"), tenants.length, "All SACCO accounts", t("review"))}
      ${summary(t("activeSaccos"), tenants.filter((tenant) => normal(tenant.status) === "active").length, "Allowed to operate", t("open"))}
      ${summary(t("subscriptionRevenue"), money.format(sum(subscriptions, "amount")), "Platform billing", t("export"))}
      ${summary(t("platformAdministrators"), users.length, "Users and roles", "Audit")}
      ${summary(t("pendingRegistrations"), tenants.filter((tenant) => normal(tenant.status).includes("pending")).length, "Onboarding decisions", t("review"))}
      ${summary(t("openSaccoComplaints"), supportTickets.filter((ticket) => !["closed", "resolved"].includes(normal(ticket.status))).length, "Escalations from SACCO admins", t("review"))}
      ${summary(t("failedPayments"), dataRows("transactions").filter((transaction) => normal(transaction.status).includes("failed")).length, "Provider exceptions", t("review"))}
      ${summary(t("complianceExceptions"), exceptions, "Reconciliation and journal checks", "Investigate")}
      ${summary("Privacy requests", dataProtection.privacyRequests || 0, "Across SACCOs", "Review")}
      ${summary("KYC disposals", dataProtection.kycDocumentsDisposed || 0, "File-store evidence", "Trace")}
    </div>
    ${rolePriorityPanel(t("superAdminReportingControl"), [
      ["SACCO account status", `${tenants.length} SACCO account(s) tracked for activation, suspension and payment eligibility.`, tenants.some((tenant) => normal(tenant.status).includes("pending")) ? "Review" : "Clear"],
      ["Billing control", `${subscriptions.length} subscription record(s) available for renewal, arrears and package reporting.`, subscriptions.some((row) => normal(row.status).includes("expired")) ? "Review" : "Current"],
      ["Access governance", `${users.length} platform administrator account(s) included in role and permission reporting.`, users.length ? "Monitored" : "Setup needed"]
    ])}
    ${filterToolbar("Search Super Admin reports by SACCO, billing status, administrator, compliance status or export type", "Export report", "Schedule report")}
    ${recordTable("Super Admin SACCO report", rows, ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "privacyRequests", "openPrivacyRequests", "kycReviewDue", "kycDisposed", "dataProtectionStatus", "complianceStatus"])}
    ${recordTable("Platform administrator access report", users, ["fullName", "email", "rolesLabel", "moduleScope", "status", "lastLogin"])}
  `;
}

function regulatoryReportRows(platform) {
  const report = state.data.regulatoryReport || {};
  /** @type {TerekaRegulatoryReportRow[]} */
  const rawRows = Array.isArray(report.reports) ? report.reports : [];
  /** @type {TerekaRegulatoryReportRow[]} */
  const rows = rawRows.length ? rawRows : tenantRows().map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    memberCount: dataRows("members").filter((member) => member.tenantId === tenant.id).length,
    activeMembers: dataRows("members").filter((member) => member.tenantId === tenant.id && normal(member.status) === "active").length,
    savings: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "savingsBalance", "savings"),
    shares: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "sharesBalance", "shares"),
    welfare: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "welfareBalance", "welfare"),
    loanPortfolio: sum(dataRows("loans").filter((loan) => loan.tenantId === tenant.id), "outstandingBalance", "balance", "amount"),
    activeLoans: dataRows("loans").filter((loan) => loan.tenantId === tenant.id && !["rejected", "closed"].includes(normal(loan.status))).length,
    expenseTotal: sum(dataRows("expenses").filter((expense) => expense.tenantId === tenant.id), "amount"),
    assetNetBookValue: sum(dataRows("assets").filter((asset) => asset.tenantId === tenant.id), "netBookValue", "cost"),
    reconciliationExceptions: 0,
    openComplaints: dataRows("complaints").filter((complaint) => complaint.tenantId === tenant.id && !["resolved", "closed"].includes(normal(complaint.status))).length,
    complianceStatus: "local fallback"
  }));
  const scopedRows = platform ? rows : rows.filter((row) => !row.tenantId || row.tenantId === state.user?.tenantId || row.tenantId === state.tenant?.id);
  return scopedRows.map((row) => ({
    ...row,
    tenantName: row.tenantName || tenantName(row.tenantId),
    privacyRequests: row.dataProtectionEvidence?.privacyRequests || 0,
    openPrivacyRequests: row.dataProtectionEvidence?.openPrivacyRequests || 0,
    completedPrivacyRequests: row.dataProtectionEvidence?.completedPrivacyRequests || 0,
    erasureRequestsCompleted: row.dataProtectionEvidence?.erasureRequestsCompleted || 0,
    kycDocuments: row.dataProtectionEvidence?.kycDocuments || 0,
    kycReviewDue: row.dataProtectionEvidence?.kycDocumentsReviewDue || 0,
    kycRetained: row.dataProtectionEvidence?.kycDocumentsRetained || 0,
    kycDisposed: row.dataProtectionEvidence?.kycDocumentsDisposed || 0,
    kycStorageActions: row.dataProtectionEvidence?.kycStorageActions || 0,
    dataProtectionStatus: labelize(row.dataProtectionEvidence?.evidenceStatus || "review")
  }));
}

function regulatoryConsolidated(rows) {
  const report = state.data.regulatoryReport || {};
  if (report.consolidated && (isPlatform() || report.consolidated.tenantId === state.currentTenantId || report.reports?.length === 1)) {
    return report.consolidated;
  }
  return {
    memberCount: sum(rows, "memberCount"),
    activeMembers: sum(rows, "activeMembers"),
    savings: sum(rows, "savings"),
    shares: sum(rows, "shares"),
    welfare: sum(rows, "welfare"),
    loanPortfolio: sum(rows, "loanPortfolio"),
    activeLoans: sum(rows, "activeLoans"),
    expenseTotal: sum(rows, "expenseTotal"),
    assetNetBookValue: sum(rows, "assetNetBookValue"),
    journalEntries: sum(rows, "journalEntries"),
    unbalancedJournalEntries: sum(rows, "unbalancedJournalEntries"),
    reconciliationExceptions: sum(rows, "reconciliationExceptions"),
    openComplaints: sum(rows, "openComplaints"),
    openResolutions: sum(rows, "openResolutions"),
    dataProtectionEvidence: {
      privacyRequests: sum(rows, "privacyRequests"),
      openPrivacyRequests: sum(rows, "openPrivacyRequests"),
      completedPrivacyRequests: sum(rows, "completedPrivacyRequests"),
      erasureRequestsCompleted: sum(rows, "erasureRequestsCompleted"),
      kycDocuments: sum(rows, "kycDocuments"),
      kycDocumentsReviewDue: sum(rows, "kycReviewDue"),
      kycDocumentsRetained: sum(rows, "kycRetained"),
      kycDocumentsDisposed: sum(rows, "kycDisposed"),
      kycStorageActions: sum(rows, "kycStorageActions"),
      evidenceStatus: rows.some((row) => normal(row.dataProtectionStatus) !== "ready") ? "review" : "ready"
    },
    complianceStatus: rows.some((row) => normal(row.complianceStatus) !== "clear") ? "review" : "clear"
  };
}

function reportCatalogue(platform) {
  if (platform) {
    return [
      { title: "SACCO account register", copy: "Registered SACCOs, generated codes, activation status, contact details and member ranges.", owner: "Super Admin", output: "PDF / Excel", action: "Open SACCO accounts" },
      { title: "Registration pipeline", copy: "Platform-created registrations, self-service applications, payment status and approval outcomes.", owner: "Super Admin", output: "Onboarding pack", action: "Open applications" },
      { title: "Subscription control", copy: "Packages, billable members, received payments, arrears, renewals and operating eligibility.", owner: "Super Admin", output: "Billing pack", action: "Open billing" },
      { title: "Platform administrator access", copy: "Administrator accounts, assigned roles, module access, status and last-login review.", owner: "Super Admin", output: "Access review", action: "Open users" },
      { title: "SACCO support escalations", copy: "Complaints raised by SACCO administrators, unresolved cases and escalation status.", owner: "Super Admin", output: "Support report", action: "Open complaints" },
      { title: "Compliance and audit", copy: "Regulatory consolidation, reconciliation exceptions, sensitive activity and role changes.", owner: "Super Admin", output: "Audit pack", action: "Open audit" }
    ];
  }
  return [
    { title: "Membership", copy: "Member register, KYC status, contacts, beneficiaries and branch distribution.", owner: "Secretary", output: "Excel / PDF", action: "Open members" },
    { title: "Savings", copy: "Savings products, member deposits, withdrawals and dormant account positions.", owner: "Treasurer", output: "Statement pack", action: "Open savings" },
    { title: "Shares", copy: "Share capital, member share accounts, contribution cycles and ownership totals.", owner: "Treasurer", output: "Share register", action: "Open shares" },
    { title: "Welfare", copy: "Welfare contributions, claims, approvals, payment status and fund exposure.", owner: "Committee", output: "Claims report", action: "Open welfare" },
    { title: "Loans", copy: "Applications, guarantors, repayments, arrears, PAR and portfolio balances.", owner: "Credit", output: "Portfolio report", action: "Open loans" },
    { title: "Accounting", copy: "Chart of accounts, expenses, assets, journals and trial-balance readiness.", owner: "Accountant", output: "Ledger pack", action: "Open accounting" },
    { title: "Governance", copy: "Meetings, resolutions, action owners and committee follow-up status.", owner: "Chairperson", output: "Governance pack", action: "Open governance" },
    { title: "Audit", copy: "User activity, approvals, reversals and high-risk operational events.", owner: "Auditor", output: "Audit pack", action: "Open audit" }
  ];
}

function reportReadinessPanel(consolidated) {
  const exceptions = Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
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

function normalizedAuditRows() {
  return dataRows("auditEvents").map((event) => ({
    ...event,
    tenantName: tenantName(event.tenantId),
    actor: event.actorName || userName(event.actorUserId),
    module: event.resourceType || event.module || "system",
    recordReference: event.resourceId || event.recordReference || event.recordId || "",
    category: auditCategory(event),
    riskLevel: auditRiskLevel(event),
    result: event.result || "Recorded"
  }));
}

function auditView() {
  const rows = normalizedAuditRows();
  const sensitive = rows.filter((event) => event.riskLevel !== "Normal");
  const highRisk = rows.filter((event) => event.riskLevel === "High");
  const loginRisks = loginRiskEvents();
  const approvals = rows.filter((event) => event.category === "Approvals");
  const reversals = rows.filter((event) => event.category === "Reversals");
  const access = rows.filter((event) => event.category === "Access control");
  const finance = rows.filter((event) => event.category === "Financial activity");
  const tabs = [["evidence", isPlatform() ? t("platformAuditEvidence") : t("saccoAuditEvidence")], ["sensitive", t("sensitiveAuditQueue")], ["trail", isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail")]];
  const tab = activeModuleTab("audit", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("auditEvents"), rows.length, "Immutable activity trail", "Inspect")}
      ${summary(t("highRiskEvents"), highRisk.length, "Roles, sessions and reversals", t("review"))}
      ${summary(t("loginRiskEvents"), loginRisks.length, "Failed and blocked sign-ins", t("review"))}
      ${summary(isPlatform() ? "SACCOs affected" : t("actorsInvolved"), isPlatform() ? uniqueCount(rows, "tenantId") : uniqueCount(rows, "actorUserId"), isPlatform() ? "Across visible SACCOs" : "Within this SACCO", "Filter")}
      ${summary(t("actors"), uniqueCount(rows, "actorUserId"), "Users and system actions", "Trace")}
    </div>
    ${moduleTabs("audit", tabs, tab)}
    ${tab === "overview" ? auditControlPanel(rows, highRisk, approvals, reversals, access, finance) : ""}
    ${tab === "evidence" ? `
      ${filterToolbar("Search audit logs by SACCO, actor, action, module, IP address or record ID", "Export audit log", "Print report")}
      ${auditEvidencePanel(rows, sensitive, approvals, reversals, access, finance)}
    ` : ""}
    ${tab === "sensitive" ? recordTable("Sensitive audit queue", sensitive, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "riskLevel"]) : ""}
    ${tab === "trail" ? recordTable(isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail"), rows, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "result"]) : ""}
  `;
}

function auditControlPanel(rows, highRisk, approvals, reversals, access, finance) {
  return rolePriorityPanel(t("auditEvidenceControl"), [
    ["High-risk review", `${highRisk.length} event(s) involve sessions, roles, reversals or sensitive state changes.`, highRisk.length ? "Review" : "Clear"],
    ["Decision evidence", `${approvals.length} approval event(s) and ${reversals.length} reversal event(s) are available for follow-up.`, approvals.length || reversals.length ? "Trace" : "Empty"],
    ["Access and finance", `${access.length} access event(s) and ${finance.length} finance event(s) can be filtered for audit review.`, rows.length ? "Available" : "No events"]
  ]);
}

function auditEvidencePanel(rows, sensitive, approvals, reversals, access, finance) {
  const recent = rows[0]?.createdAt || "No event yet";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${isPlatform() ? "Platform audit evidence" : "SACCO audit evidence"}</h2>
          <p>${isPlatform() ? "System-wide oversight for administrator actions, SACCO account changes and sensitive access." : "Read-only evidence for SACCO approvals, finance actions, reversals, role changes and session activity."}</p>
        </div>
        <span class="status ${sensitive.length ? "pending" : "active"}">${sensitive.length ? "Review queue" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Latest event", recent)}
        ${mini("Approval events", approvals.length)}
        ${mini("Reversal events", reversals.length)}
        ${mini("Access events", access.length)}
        ${mini("Finance events", finance.length)}
        ${mini("Sensitive queue", sensitive.length)}
      </div>
    </section>
    <div class="report-grid">
      ${auditCategoryCard("Approvals", approvals, "Maker-checker decisions, status changes and review outcomes.")}
      ${auditCategoryCard("Reversals", reversals, "Financial corrections that require follow-up evidence.")}
      ${auditCategoryCard("Access control", access, "Logins, sessions, password, role and permission changes.")}
      ${auditCategoryCard("Financial activity", finance, "Transactions, repayments, expenses, assets and contribution setup.")}
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

function auditRiskLevel(event) {
  const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["failed", "blocked", "too many", "invalid sacco"].some((word) => text.includes(word)) && text.includes("login")) return "High";
  if (["password", "role", "permission", "session", "reversal", "disbursed", "suspended", "terminated"].some((word) => text.includes(word))) return "High";
  if (["approved", "rejected", "status", "payment", "template", "complaint", "loan"].some((word) => text.includes(word))) return "Review";
  return "Normal";
}

function auditCategory(event) {
  const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["role", "permission", "password", "session", "login", "logout", "user"].some((word) => text.includes(word))) return "Access control";
  if (["reversal", "reverse", "corrected"].some((word) => text.includes(word))) return "Reversals";
  if (["approved", "rejected", "approval", "status", "decision", "submitted"].some((word) => text.includes(word))) return "Approvals";
  if (["transaction", "payment", "loan", "repayment", "expense", "asset", "product", "account", "branch"].some((word) => text.includes(word))) return "Financial activity";
  if (["complaint", "template", "notification"].some((word) => text.includes(word))) return "Operations";
  return "General";
}

