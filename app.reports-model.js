function buildRegulatoryReportRows(input) {
  const rawRows = Array.isArray(input.report?.reports) ? input.report.reports : [];
  const rows = rawRows.length ? rawRows : buildFallbackRegulatoryRows(input);
  const scopedRows = input.platform
    ? rows
    : rows.filter((row) => !row.tenantId || row.tenantId === input.currentTenantId || row.tenantId === input.selectedTenantId);

  return scopedRows.map((row) => ({
    ...row,
    tenantName: row.tenantName || input.tenantName(row.tenantId),
    privacyRequests: row.dataProtectionEvidence?.privacyRequests || 0,
    openPrivacyRequests: row.dataProtectionEvidence?.openPrivacyRequests || 0,
    completedPrivacyRequests: row.dataProtectionEvidence?.completedPrivacyRequests || 0,
    erasureRequestsCompleted: row.dataProtectionEvidence?.erasureRequestsCompleted || 0,
    kycDocuments: row.dataProtectionEvidence?.kycDocuments || 0,
    kycReviewDue: row.dataProtectionEvidence?.kycDocumentsReviewDue || 0,
    kycRetained: row.dataProtectionEvidence?.kycDocumentsRetained || 0,
    kycDisposed: row.dataProtectionEvidence?.kycDocumentsDisposed || 0,
    kycStorageActions: row.dataProtectionEvidence?.kycStorageActions || 0,
    dataProtectionStatus: input.labelize(row.dataProtectionEvidence?.evidenceStatus || "review")
  }));
}

function buildRegulatoryConsolidatedReport(input) {
  const report = input.report || {};
  if (report.consolidated && (input.platform || report.consolidated.tenantId === input.currentTenantId || report.reports?.length === 1)) {
    return report.consolidated;
  }
  return {
    memberCount: sumReportModelValues(input.rows, "memberCount"),
    activeMembers: sumReportModelValues(input.rows, "activeMembers"),
    savings: sumReportModelValues(input.rows, "savings"),
    shares: sumReportModelValues(input.rows, "shares"),
    welfare: sumReportModelValues(input.rows, "welfare"),
    loanPortfolio: sumReportModelValues(input.rows, "loanPortfolio"),
    activeLoans: sumReportModelValues(input.rows, "activeLoans"),
    expenseTotal: sumReportModelValues(input.rows, "expenseTotal"),
    assetNetBookValue: sumReportModelValues(input.rows, "assetNetBookValue"),
    journalEntries: sumReportModelValues(input.rows, "journalEntries"),
    unbalancedJournalEntries: sumReportModelValues(input.rows, "unbalancedJournalEntries"),
    reconciliationExceptions: sumReportModelValues(input.rows, "reconciliationExceptions"),
    openComplaints: sumReportModelValues(input.rows, "openComplaints"),
    openResolutions: sumReportModelValues(input.rows, "openResolutions"),
    dataProtectionEvidence: {
      privacyRequests: sumReportModelValues(input.rows, "privacyRequests"),
      openPrivacyRequests: sumReportModelValues(input.rows, "openPrivacyRequests"),
      completedPrivacyRequests: sumReportModelValues(input.rows, "completedPrivacyRequests"),
      erasureRequestsCompleted: sumReportModelValues(input.rows, "erasureRequestsCompleted"),
      kycDocuments: sumReportModelValues(input.rows, "kycDocuments"),
      kycDocumentsReviewDue: sumReportModelValues(input.rows, "kycReviewDue"),
      kycDocumentsRetained: sumReportModelValues(input.rows, "kycRetained"),
      kycDocumentsDisposed: sumReportModelValues(input.rows, "kycDisposed"),
      kycStorageActions: sumReportModelValues(input.rows, "kycStorageActions"),
      evidenceStatus: input.rows.some((row) => normalizeReportModelText(row.dataProtectionStatus) !== "ready") ? "review" : "ready"
    },
    complianceStatus: input.rows.some((row) => normalizeReportModelText(row.complianceStatus) !== "clear") ? "review" : "clear"
  };
}

function reportExceptionCount(consolidated) {
  return Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
}

function buildReportCatalogue(platform) {
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

function buildPlatformReportSummary(input) {
  return {
    activeSaccos: input.tenants.filter((tenant) => normalizeReportModelText(tenant.status) === "active").length,
    expiredSubscriptions: input.subscriptions.filter((row) => normalizeReportModelText(row.status).includes("expired")).length,
    failedPayments: input.transactions.filter((transaction) => normalizeReportModelText(transaction.status).includes("failed")).length,
    openSaccoComplaints: input.complaints.filter((ticket) => !["closed", "resolved"].includes(normalizeReportModelText(ticket.status))).length,
    pendingRegistrations: input.tenants.filter((tenant) => normalizeReportModelText(tenant.status).includes("pending")).length,
    platformAdministrators: input.users.length,
    registeredSaccos: input.tenants.length,
    subscriptionRevenue: sumReportModelValues(input.subscriptions, "amount")
  };
}

function buildFallbackRegulatoryRows(input) {
  return input.tenants.map((tenant) => {
    const tenantId = String(tenant.id || "");
    const tenantMembers = input.members.filter((member) => member.tenantId === tenantId);
    const tenantLoans = input.loans.filter((loan) => loan.tenantId === tenantId);
    return {
      tenantId,
      tenantName: tenant.name,
      memberCount: tenantMembers.length,
      activeMembers: tenantMembers.filter((member) => normalizeReportModelText(member.status) === "active").length,
      savings: sumReportModelValues(tenantMembers, "savingsBalance", "savings"),
      shares: sumReportModelValues(tenantMembers, "sharesBalance", "shares"),
      welfare: sumReportModelValues(tenantMembers, "welfareBalance", "welfare"),
      loanPortfolio: sumReportModelValues(tenantLoans, "outstandingBalance", "balance", "amount"),
      activeLoans: tenantLoans.filter((loan) => !["rejected", "closed"].includes(normalizeReportModelText(loan.status))).length,
      expenseTotal: sumReportModelValues(input.expenses.filter((expense) => expense.tenantId === tenantId), "amount"),
      assetNetBookValue: sumReportModelValues(input.assets.filter((asset) => asset.tenantId === tenantId), "netBookValue", "cost"),
      reconciliationExceptions: 0,
      openComplaints: input.complaints.filter((complaint) => complaint.tenantId === tenantId && !["resolved", "closed"].includes(normalizeReportModelText(complaint.status))).length,
      complianceStatus: "local fallback"
    };
  });
}

function sumReportModelValues(rows, ...keys) {
  return rows.reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + Number(row[key] || 0), 0), 0);
}

function normalizeReportModelText(value) {
  return String(value || "").toLowerCase();
}
