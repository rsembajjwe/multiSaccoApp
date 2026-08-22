function reportsView() {
  const platform = isPlatform();
  const cycle = platform ? null : currentSaccoCycleContext();
  const rows = reportRowsForCurrentContext(platform, cycle);
  const consolidated = buildRegulatoryConsolidatedReport({ currentTenantId: state.currentTenantId, platform, report: platform ? state.data.regulatoryReport || {} : {}, rows });
  const catalogue = buildReportCatalogue(platform);
  const exceptions = reportExceptionCount(consolidated);
  const dataProtection = consolidated.dataProtectionEvidence || {};
  if (platform) return platformSuperAdminReportsView(rows, exceptions);
  const tabs = [["overview", "Overview"], ["catalogue", "Report catalogue"], ["readiness", "Report readiness"], ["regulatory", "SACCO regulatory report"], ["member-form", "Member registration form"]];
  const tab = activeModuleTab("reports", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Report cycle" })}
    <div class="dashboard-grid">
      ${summary("Members in report", consolidated.memberCount, "Active and inactive members", "Review")}
      ${summary("Savings reported", money.format(consolidated.savings || 0), "Member deposit balances", "Export")}
      ${summary("Loan portfolio", money.format(consolidated.loanPortfolio || 0), "Credit exposure", "Open")}
      ${summary("Compliance exceptions", exceptions, "Reconciliation and journal checks", "Investigate")}
      ${summary("Privacy requests", dataProtection.privacyRequests || 0, "Member data rights", "Review")}
      ${summary("Document disposals", dataProtection.kycDocumentsDisposed || 0, "Document retention actions", "Trace")}
    </div>
    ${moduleTabs("reports", tabs, tab)}
    ${tab === "overview" ? `${secretaryReportCommandPanel(rows, consolidated, cycle)}${reportEvidenceControlPanel(consolidated, exceptions)}` : ""}
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
    ${tab === "regulatory" ? recordTable(`SACCO regulatory report - ${cycle.label}`, rows, ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "loanPortfolio", "activeLoans", "privacyRequests", "openPrivacyRequests", "kycReviewDue", "kycDisposed", "kycStorageActions", "dataProtectionStatus", "complianceStatus"]) : ""}
    ${tab === "member-form" ? memberRegistrationFormExportPanel() : ""}
  `;
}

function reportCyclePanel(cycle) {
  const periodLabel = typeof membershipPeriodLabel === "function"
    ? membershipPeriodLabel(cycle.period)
    : labelize(cycle.period);
  const selectedYear = Number(cycle.year);
  const selectedMonth = Number(cycle.month);
  return `
    <section class="filter-toolbar compact-toolbar">
      <label><span>SACCO cycle</span><input value="${escapeHtml(periodLabel)}" readonly></label>
      ${cycle.period !== "once" ? `<label><span>Year</span><select data-report-cycle-year>${governanceCycleYearOptions().map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}</select></label>` : ""}
      ${cycle.period === "monthly" ? `<label><span>Month</span><select data-report-cycle-month>${governanceCycleMonthOptions(currentRegion().locale).map(([value, label]) => `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>` : ""}
      <label><span>Report period</span><input value="${escapeHtml(cycle.label)}" readonly></label>
    </section>
  `;
}

function secretaryReportCommandPanel(rows, consolidated, cycle) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Secretary reporting workspace</h2>
          <p>Cycle-based member, governance and compliance reports for filing, committee review and statutory evidence.</p>
        </div>
        <span class="status active">${escapeHtml(cycle.label)}</span>
      </div>
      <div class="source-grid">
        ${mini("Report period", cycle.label)}
        ${mini("Members", consolidated.memberCount || 0)}
        ${mini("Open complaints", consolidated.openComplaints || 0)}
        ${mini("Open resolutions", consolidated.openResolutions || 0)}
      </div>
      <div class="form-actions inline">
        <button class="button primary" type="button" data-action="export-secretary-report-pdf">Export Secretary PDF</button>
        <button class="button secondary" type="button" data-action="open-member-registration-report">Member registration form</button>
      </div>
      <span class="sr-only">${rows.length} cycle-scoped report row(s)</span>
    </section>
  `;
}

function memberRegistrationFormExportPanel() {
  const members = dataRows("members")
    .slice()
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
  const selectedId = state.reportMemberFormMemberId || members[0]?.id || "";
  const selected = members.find((member) => member.id === selectedId) || members[0] || {};
  const documentCount = selected.id === state.selectedMemberId ? (state.selectedMemberDocuments || []).length : "-";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member registration form export</h2>
          <p>Generate a one-page A4 registration form for physical signature and filing. Passport photo is included when a photo URL has been attached to the member documents.</p>
        </div>
        <span class="status active">A4 filing form</span>
      </div>
      ${state.reportExportMessage ? `<div class="notice compact"><strong>${escapeHtml(state.reportExportMessage)}</strong></div>` : ""}
      ${state.reportExportError ? `<div class="notice warning"><strong>Report export failed.</strong><span>${escapeHtml(state.reportExportError)}</span></div>` : ""}
      <form class="form-grid">
        <label class="wide"><span>Member</span><select id="reportMemberFormMemberId" data-report-member-form-select>
          ${members.map((member) => `<option value="${escapeHtml(member.id)}" ${member.id === selected.id ? "selected" : ""}>${escapeHtml(member.membershipNo || member.id)} - ${escapeHtml(member.fullName || "Unnamed member")}</option>`).join("")}
        </select></label>
        <label><span>Membership number</span><input value="${escapeHtml(selected.membershipNo || "")}" readonly></label>
        <label><span>Phone</span><input value="${escapeHtml(selected.phone || "")}" readonly></label>
        <label><span>Status</span><input value="${escapeHtml(labelize(selected.status || ""))}" readonly></label>
        <label><span>Attached documents</span><input value="${escapeHtml(String(documentCount))}" readonly></label>
        <div class="form-actions inline">
          <button class="button primary" type="button" data-action="export-member-registration-form-pdf" ${selected.id ? "" : "disabled"}>Export registration PDF</button>
          <button class="button secondary" type="button" data-action="open-selected-member-documents" ${selected.id ? "" : "disabled"}>Upload / view passport photo</button>
        </div>
      </form>
      <p class="hint">Use Members &gt; Contacts and Documents to attach a document of type Photo. Enter a secure image URL when you want the passport photo to appear inside the printable form.</p>
    </section>
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
      ${summary("Document disposals", dataProtection.kycDocumentsDisposed || 0, "File-store evidence", "Trace")}
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

function reportRowsForCurrentContext(platform, cycle = null) {
  const rows = buildRegulatoryReportRows({
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
  return platform || !cycle ? rows : applySaccoReportCycle(rows, cycle);
}

function applySaccoReportCycle(rows, cycle) {
  if (!rows.length || !cycle || cycle.period === "once") return rows;
  const tenantId = String(state.currentTenantId || state.tenant?.id || state.user?.tenantId || "");
  const scopedTransactions = reportRowsInCycle(dataRows("transactions"), cycle, ["postedAt", "createdAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId)
    .filter((row) => normal(row.status) === "posted");
  const scopedLoans = reportRowsInCycle(dataRows("loans"), cycle, ["disbursedAt", "approvedAt", "createdAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedExpenses = reportRowsInCycle(dataRows("expenses"), cycle, ["expenseDate", "createdAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedAssets = reportRowsInCycle(dataRows("assets"), cycle, ["acquiredAt", "purchaseDate", "createdAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedJournals = reportRowsInCycle(dataRows("journalEntries"), cycle, ["postedAt", "createdAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedComplaints = reportRowsInCycle(dataRows("complaints"), cycle, ["createdAt", "updatedAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedGovernance = reportRowsInCycle(dataRows("governanceMeetings"), cycle, ["scheduledAt", "createdAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedMembers = filterMembersBySaccoCycle(dataRows("members"), cycle)
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedPrivacyRequests = reportRowsInCycle(dataRows("privacyRequests"), cycle, ["submittedAt", "createdAt", "updatedAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);
  const scopedDocuments = reportRowsInCycle(dataRows("memberDocuments"), cycle, ["createdAt", "retentionReviewedAt", "retentionReviewDueAt"])
    .filter((row) => !tenantId || String(row.tenantId || "") === tenantId);

  return rows.map((row) => {
    if (tenantId && String(row.tenantId || tenantId) !== tenantId) return row;
    const openResolutions = scopedGovernance.flatMap((meeting) => meeting.resolutions || [])
      .filter((resolution) => normal(resolution.status) !== "closed").length;
    return {
      ...row,
      reportCycle: cycle.label,
      memberCount: scopedMembers.length,
      activeMembers: scopedMembers.filter((member) => normal(member.status) === "active").length,
      savings: reportTransactionTypeTotal(scopedTransactions, "saving"),
      shares: reportTransactionTypeTotal(scopedTransactions, "share"),
      welfare: reportTransactionTypeTotal(scopedTransactions, "welfare"),
      loanPortfolio: reportRowsSum(scopedLoans, "outstandingBalance", "balance", "amount"),
      activeLoans: scopedLoans.filter((loan) => !["rejected", "closed"].includes(normal(loan.status))).length,
      expenseTotal: reportRowsSum(scopedExpenses, "amount"),
      assetNetBookValue: reportRowsSum(scopedAssets, "netBookValue", "cost"),
      journalEntries: scopedJournals.length,
      openComplaints: scopedComplaints.filter((complaint) => !["resolved", "closed"].includes(normal(complaint.status))).length,
      openResolutions,
      privacyRequests: scopedPrivacyRequests.length,
      openPrivacyRequests: scopedPrivacyRequests.filter((request) => !["resolved", "closed", "completed"].includes(normal(request.status))).length,
      kycReviewDue: scopedDocuments.filter((document) => normal(document.retentionStatus).includes("review")).length,
      kycDisposed: scopedDocuments.filter((document) => normal(document.retentionStatus).includes("disposed")).length
    };
  });
}

function reportRowsInCycle(rows, cycle, dateKeys) {
  return (rows || []).filter((row) => dateKeys.some((key) => governanceDateFallsInCycle(row[key], cycle)));
}

function reportTransactionTypeTotal(rows, typeText) {
  return (rows || [])
    .filter((row) => normal(row.type).includes(typeText))
    .reduce((total, row) => total + Number(row.amount || row.credit || 0), 0);
}

function reportRowsSum(rows, ...keys) {
  return (rows || []).reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + Number(row[key] || 0), 0), 0);
}

function exportSecretaryReportPdf() {
  state.reportExportMessage = "";
  state.reportExportError = "";
  try {
    const cycle = currentSaccoCycleContext();
    const rows = reportRowsForCurrentContext(false, cycle);
    downloadPdfTable({
      filename: `secretary-report-${safeExportName(contextName())}-${safeExportName(cycle.label)}-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: contextName(),
      subtitle: `Secretary Report | ${cycle.label} | Powered by Tereka Online | Generated ${formatDateTime(new Date().toISOString())}`,
      columns: [
        ["SACCO", "tenantName"],
        ["Members", "memberCount"],
        ["Active", "activeMembers"],
        ["Savings", "savings", "money"],
        ["Shares", "shares", "money"],
        ["Welfare", "welfare", "money"],
        ["Loans", "loanPortfolio", "money"],
        ["Complaints", "openComplaints"],
        ["Resolutions", "openResolutions"],
        ["Compliance", "complianceStatus"]
      ],
      rows,
      note: "Secretary report is scoped to the SACCO cycle selected in Tereka Online."
    });
    state.reportExportMessage = `Secretary PDF report exported for ${cycle.label}.`;
  } catch (error) {
    state.reportExportError = error.message || "Could not export Secretary report.";
  }
  renderShell();
}

async function exportMemberRegistrationFormPdf(event = null) {
  const memberId = event?.currentTarget?.dataset?.memberId || value("reportMemberFormMemberId") || state.reportMemberFormMemberId || state.selectedMemberId || state.selectedMember?.id;
  state.reportExportMessage = "";
  state.reportExportError = "";
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  if (!memberId) {
    const message = "Select a member first.";
    state.reportExportError = message;
    state.selectedMemberError = message;
    renderShell();
    return;
  }
  try {
    const member = await optionalApi(`/members/${encodeURIComponent(memberId)}`, dataRows("members").find((row) => row.id === memberId) || {});
    const documents = await optionalApi(`/members/${encodeURIComponent(memberId)}/documents`, []);
    const documentRows = Array.isArray(documents) ? documents : [];
    const photo = memberRegistrationPhotoDocument(documentRows);
    const [photoImage, logoImage] = await Promise.all([
      memberRegistrationPhotoDataUrl(memberId, photo).then((dataUrl) => pdfImageResourceFromDataUrl(dataUrl, "PassportPhoto", 260, 320)).catch(() => null),
      saccoLogoDataUrl().then((dataUrl) => pdfImageResourceFromDataUrl(dataUrl, "SaccoLogo", 180, 120, false)).catch(() => null)
    ]);
    const pdf = createMemberRegistrationFormPdf(member || {}, documentRows, { logoImage, photoImage });
    downloadClientFile(memberRegistrationFormFilename(member || {}), pdf, "application/pdf");
    const message = `Registration PDF downloaded for ${member.membershipNo || member.fullName || "selected member"}.`;
    state.reportExportMessage = message;
    state.selectedMemberMessage = message;
  } catch (error) {
    const message = error.message || "Could not prepare member registration form.";
    state.reportExportError = message;
    state.selectedMemberError = message;
  }
  renderShell();
}

function memberRegistrationFormFilename(member) {
  return `member-registration-form-${safeExportName(member.membershipNo || member.fullName || "member")}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function memberRegistrationFormsFilename() {
  return `member-registration-forms-${safeExportName(contextName())}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

async function exportMemberRegistrationFormsPdf() {
  state.memberListMessage = "";
  state.memberListError = "";
  state.reportExportMessage = "";
  state.reportExportError = "";
  try {
    const cycle = typeof currentSaccoCycleContext === "function" ? currentSaccoCycleContext() : null;
    const members = (typeof filterMembersBySaccoCycle === "function" ? filterMembersBySaccoCycle(dataRows("members"), cycle) : dataRows("members"))
      .filter((member) => String(member.status || "").toLowerCase() !== "deleted")
      .sort((left, right) => String(left.membershipNo || left.fullName || "").localeCompare(String(right.membershipNo || right.fullName || "")));
    if (!members.length) throw new Error("No members are available for registration-form export.");

    const logoImage = await saccoLogoDataUrl()
      .then((dataUrl) => pdfImageResourceFromDataUrl(dataUrl, "SaccoLogo", 180, 120, false))
      .catch(() => null);
    const pageStreams = [];
    const images = logoImage ? [logoImage] : [];
    for (let index = 0; index < members.length; index += 1) {
      const member = await optionalApi(`/members/${encodeURIComponent(members[index].id)}`, members[index]);
      const documents = await optionalApi(`/members/${encodeURIComponent(member.id)}/documents`, []);
      const documentRows = Array.isArray(documents) ? documents : [];
      const photo = memberRegistrationPhotoDocument(documentRows);
      const photoImage = await memberRegistrationPhotoDataUrl(member.id, photo)
        .then((dataUrl) => pdfImageResourceFromDataUrl(dataUrl, `PassportPhoto${index + 1}`, 260, 320))
        .catch(() => null);
      if (photoImage) images.push(photoImage);
      pageStreams.push(memberRegistrationFormPageStream(member, documentRows, { logoImage, photoImage }));
    }
    const pdf = buildPdfDocumentWithImages(pageStreams, 595, 842, images);
    downloadClientFile(memberRegistrationFormsFilename(), pdf, "application/pdf");
    state.memberListMessage = `Registration forms PDF downloaded for ${members.length} member(s).`;
    state.reportExportMessage = state.memberListMessage;
  } catch (error) {
    const message = error.message || "Could not export member registration forms.";
    state.memberListError = message;
    state.reportExportError = message;
  }
  renderShell();
}

function createMemberRegistrationFormPdf(member, documents = [], assets = {}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const images = [assets.logoImage, assets.photoImage].filter(Boolean);
  const stream = memberRegistrationFormPageStream(member, documents, assets);
  return buildPdfDocumentWithImages([stream], pageWidth, pageHeight, images);
}

function memberRegistrationFormPageStream(member, documents = [], assets = {}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 34;
  const saccoName = contextName();
  const saccoAddress = saccoRegistrationFormAddress();
  const branch = dataRows("branches").find((row) => row.id === member.branchId);
  const photo = memberRegistrationPhotoDocument(documents);
  const signedForm = documents.find((document) => normal(document.documentType) === "signed_registration_form");
  const nextOfKin = state.selectedMemberId === member.id ? state.selectedMemberNextOfKin || [] : [];
  const beneficiaries = state.selectedMemberId === member.id ? state.selectedMemberBeneficiaries || [] : [];
  let stream = "";

  stream += `1 1 1 rg 0 0 ${pageWidth} ${pageHeight} re f\n`;
  stream += `0 0 0 RG ${margin} 30 ${pageWidth - margin * 2} ${pageHeight - 60} re S\n`;
  stream += `0.94 0.94 0.94 rg ${margin} 762 ${pageWidth - margin * 2} 58 re f\n`;
  stream += `0 0 0 RG ${margin} 762 ${pageWidth - margin * 2} 58 re S\n`;
  stream += `0 0 0 RG ${margin + 10} 777 42 30 re S\n`;
  if (assets.logoImage) {
    stream += drawPdfImage(assets.logoImage, margin + 12, 779, 38, 26);
  } else {
    stream += pdfText(margin + 12, 795, "SACCO", 5.6, true, 38, [0, 0, 0], "center");
    stream += pdfText(margin + 12, 787, "LOGO", 5.6, true, 38, [0, 0, 0], "center");
  }
  stream += pdfText(margin + 70, 801, saccoName, Math.min(12.6, pdfHeaderTitleSize(saccoName) + 0.8), true, pageWidth - margin * 2 - 140, [0, 0, 0], "center");
  stream += pdfText(margin + 70, 789, "Member Registration Form", 7.4, true, pageWidth - margin * 2 - 140, [0, 0, 0], "center");
  stream += pdfText(margin + 70, 780, saccoAddress || "Powered by Tereka Online", 5.8, false, pageWidth - margin * 2 - 140, [0, 0, 0], "center");
  if (saccoAddress) stream += pdfText(margin + 70, 772, "Powered by Tereka Online", 5.6, false, pageWidth - margin * 2 - 140, [0, 0, 0], "center");
  stream += pdfText(pageWidth - margin - 118, 766, formatDate(new Date().toISOString()), 5.6, false, 106, [0, 0, 0], "right");

  stream += `0 0 0 RG ${pageWidth - 132} 592 96 120 re S\n`;
  if (assets.photoImage) {
    stream += drawPdfImage(assets.photoImage, pageWidth - 128, 596, 88, 112);
  } else {
    stream += pdfText(pageWidth - 124, 658, "Passport photo", 7.2, true, 80, [0, 0, 0], "center");
    stream += pdfText(pageWidth - 124, 645, photo ? "Image file not readable" : "Attach photo", 6.2, false, 80, [0, 0, 0], "center");
  }

  let y = 740;
  stream += pdfSectionTitle(margin, y, "Member details");
  y -= 20;
  const fields = [
    ["Membership number", member.membershipNo || "-"],
    ["Full name", member.fullName || "-"],
    ["Member type", labelize(member.memberType || "member")],
    ["Phone", member.phone || "-"],
    ["Email", member.email || "-"],
    ["National ID", member.nationalId || "-"],
    ["Branch", branch?.name || member.branchId || "-"],
    ["Joining date", member.joiningDate ? formatDate(member.joiningDate) : "-"],
    ["KYC status", labelize(member.kycStatus || "pending")],
    ["Member status", labelize(member.status || "pending")]
  ];
  fields.forEach((field, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    stream += pdfFormField(margin + col * 164, y - row * 34, 154, field[0], field[1]);
  });

  y -= 196;
  stream += pdfSectionTitle(margin, y, "Contacts and beneficiaries");
  y -= 20;
  const kin = nextOfKin[0] || {};
  const beneficiary = beneficiaries[0] || {};
  stream += pdfFormField(margin, y, 256, "Primary next of kin", kin.fullName ? `${kin.fullName} / ${kin.relationship || "Relationship"} / ${kin.phone || "No phone"}` : "Not captured");
  stream += pdfFormField(margin + 270, y, 256, "Primary beneficiary", beneficiary.fullName ? `${beneficiary.fullName} / ${beneficiary.relationship || "Relationship"} / ${beneficiary.allocationPercent || 0}%` : "Not captured");

  y -= 58;
  stream += pdfSectionTitle(margin, y, "Documents and filing checklist");
  y -= 20;
  const documentSummary = [
    ["Passport photo", photo ? "Attached" : "Pending"],
    ["Signed registration form", signedForm ? "Uploaded" : "Pending after signature"],
    ["National ID", documents.some((document) => normal(document.documentType) === "national_id") ? "Attached" : "Pending"],
    ["Signature specimen", documents.some((document) => normal(document.documentType) === "signature") ? "Attached" : "Pending"]
  ];
  documentSummary.forEach((field, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    stream += pdfFormField(margin + col * 270, y - row * 32, 256, field[0], field[1]);
  });

  y -= 88;
  stream += pdfSectionTitle(margin, y, "Member declaration");
  y -= 20;
  stream += pdfWrappedText(margin + 6, y, "I confirm that the information on this form is true and complete. I agree to follow the SACCO constitution, bylaws, savings rules, member subscription cycle, loan policies and data protection requirements.", 7.3, pageWidth - margin * 2 - 12, [0, 0, 0]);

  y -= 58;
  stream += pdfSectionTitle(margin, y, "Signatures");
  y -= 24;
  stream += pdfSignatureBlock(margin, y, "Member signature", "Date");
  stream += pdfSignatureBlock(margin + 280, y, "Secretary / SACCO officer", "Date and stamp");
  y -= 70;
  stream += pdfFormField(margin, y, 256, "Approved by", "");
  stream += pdfFormField(margin + 270, y, 256, "Approval date", "");
  stream += pdfText(margin + 4, 44, "Confidential member registration record", 6.4, false, 220, [0, 0, 0]);
  stream += pdfText(pageWidth - margin - 180, 44, "Powered by Tereka Online", 6.4, false, 170, [0, 0, 0], "right");
  return stream;
}

function drawPdfImage(image, x, y, boxWidth, boxHeight) {
  if (!image?.name || !image.width || !image.height) return "";
  const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const left = x + (boxWidth - width) / 2;
  const bottom = y + (boxHeight - height) / 2;
  return `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${left.toFixed(2)} ${bottom.toFixed(2)} cm /${image.name} Do Q\n`;
}

function saccoRegistrationFormAddress() {
  const profile = state.data.saccoProfile || {};
  const tenant = dataRows("tenants").find((item) => item.id === state.user?.tenantId) || state.tenant || {};
  const parts = [
    profile.address,
    tenant.village,
    tenant.parish,
    tenant.district,
    tenant.country
  ].filter(Boolean);
  return [...new Set(parts.map((part) => String(part).trim()).filter(Boolean))].join(", ");
}

function pdfSectionTitle(x, y, title) {
  return `0 0 0 rg ${x} ${y - 5} 526 18 re f\n`
    + pdfText(x + 8, y, title, 8.2, true, 506, [1, 1, 1]);
}

function pdfFormField(x, y, width, label, value) {
  let stream = `0.985 0.985 0.985 rg ${x} ${y - 18} ${width} 28 re f\n0 0 0 RG ${x} ${y - 18} ${width} 28 re S\n`;
  stream += pdfText(x + 7, y, label, 5.9, true, width - 14, [0, 0, 0]);
  stream += pdfText(x + 7, y - 11, value || "-", 7, false, width - 14, [0, 0, 0]);
  return stream;
}

function pdfWrappedText(x, y, value, size, maxWidth, color) {
  const words = pdfSafeText(value).split(" ");
  const maxChars = Math.max(12, Math.floor(maxWidth / (size * 0.48)));
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.slice(0, 5).map((item, index) => pdfText(x, y - index * 12, item, size, false, maxWidth, color)).join("");
}

function pdfSignatureBlock(x, y, label, dateLabel) {
  let stream = `0.10 0.18 0.15 RG ${x} ${y} m ${x + 230} ${y} l S\n`;
  stream += pdfText(x + 4, y - 14, label, 7.2, true, 216, [0, 0, 0]);
  stream += `0.10 0.18 0.15 RG ${x} ${y - 40} m ${x + 160} ${y - 40} l S\n`;
  stream += pdfText(x + 4, y - 54, dateLabel, 6.7, false, 156, [0, 0, 0]);
  return stream;
}

function openMemberRegistrationPdfPrintView(member, documents, photoUrl = "") {
  const html = memberRegistrationFormPrintHtml(member, documents, photoUrl);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!popup) {
    throw new Error("Allow pop-ups for this site to open the PDF registration form.");
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
}

function memberRegistrationPhotoDocument(documents) {
  return (documents || []).find((document) => {
    const text = normal(`${document.documentType || ""} ${document.storageKey || ""}`);
    return text.includes("photo") || text.includes("passport");
  });
}

function memberRegistrationPhotoUrl(storageKey) {
  const key = String(storageKey || "").trim();
  if (/^(https?:|data:image\/)/i.test(key)) return key;
  return "";
}

async function memberRegistrationPhotoDataUrl(memberId, photo) {
  const directUrl = memberRegistrationPhotoUrl(photo?.storageKey || "");
  if (directUrl) return directUrl;
  if (!photo?.id) return "";
  try {
    const blob = await fetchMemberDocumentBlob(memberId, photo.id);
    if (!String(blob.type || "").startsWith("image/")) return "";
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
}

async function saccoLogoDataUrl() {
  const logo = typeof currentSaccoLogoUrl === "function" ? currentSaccoLogoUrl() : "";
  if (!logo) return "";
  if (/^data:image\//i.test(logo)) return logo;
  try {
    const response = await fetch(logo, { mode: "cors" });
    if (!response.ok) return "";
    const blob = await response.blob();
    if (!String(blob.type || "").startsWith("image/")) return "";
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
}

async function pdfImageResourceFromDataUrl(dataUrl, name, maxWidth, maxHeight, grayscale = true) {
  if (!/^data:image\//i.test(String(dataUrl || ""))) return null;
  const image = await loadPdfImage(dataUrl);
  const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  if (grayscale) {
    const pixels = context.getImageData(0, 0, width, height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const grey = Math.round(pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114);
      pixels.data[index] = grey;
      pixels.data[index + 1] = grey;
      pixels.data[index + 2] = grey;
    }
    context.putImageData(pixels, 0, 0);
  }
  const jpeg = canvas.toDataURL("image/jpeg", 0.82);
  return {
    name,
    width,
    height,
    bytes: base64ToBytes(jpeg.split(",")[1] || "")
  };
}

function loadPdfImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image for PDF."));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function buildPdfDocumentWithImages(pageStreams, pageWidth, pageHeight, images = []) {
  const encoder = new TextEncoder();
  const objects = [];
  objects[1] = pdfAscii("<< /Type /Catalog /Pages 2 0 R >>");
  objects[3] = pdfAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects[4] = pdfAscii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const imageEntries = images.map((image) => {
    const objectId = objects.length;
    objects[objectId] = pdfBinaryObject(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      image.bytes,
      "\nendstream"
    );
    return { name: image.name, objectId };
  });
  const xobjects = imageEntries.length
    ? `/XObject << ${imageEntries.map((image) => `/${image.name} ${image.objectId} 0 R`).join(" ")} >>`
    : "";
  const pageIds = [];
  pageStreams.forEach((stream) => {
    const contentBytes = encoder.encode(stream);
    const contentId = objects.length;
    objects[contentId] = pdfBinaryObject(`<< /Length ${contentBytes.length} >>\nstream\n`, contentBytes, "endstream");
    const pageId = objects.length;
    objects[pageId] = pdfAscii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xobjects} >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });
  objects[2] = pdfAscii(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

  const chunks = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let length = chunks[0].length;
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = length;
    const prefix = encoder.encode(`${id} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    chunks.push(prefix, objects[id], suffix);
    length += prefix.length + objects[id].length + suffix.length;
  }
  const xrefOffset = length;
  let trailer = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) trailer += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  trailer += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(trailer));
  return concatPdfBytes(chunks);
}

function pdfAscii(value) {
  return new TextEncoder().encode(value);
}

function pdfBinaryObject(header, bytes, footer) {
  return concatPdfBytes([new TextEncoder().encode(header), bytes, new TextEncoder().encode(footer)]);
}

function concatPdfBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read uploaded image."));
    reader.readAsDataURL(blob);
  });
}

function memberRegistrationFormPrintHtml(member, documents, photoUrl) {
  const saccoName = contextName();
  const branch = dataRows("branches").find((row) => row.id === member.branchId);
  const photoText = memberRegistrationPhotoDocument(documents)?.storageKey || "Passport photo";
  const fields = [
    ["Membership number", member.membershipNo],
    ["Full name", member.fullName],
    ["Member type", labelize(member.memberType || "")],
    ["Phone number", member.phone],
    ["Email", member.email],
    ["National ID", member.nationalId],
    ["Branch", branch?.name || member.branchId],
    ["Joining date", member.joiningDate ? formatDate(member.joiningDate) : ""],
    ["KYC status", labelize(member.kycStatus || "")],
    ["Member status", labelize(member.status || "")]
  ];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(saccoName)} - Member Registration Form</title>
  <style>
    @page{size:A4 portrait;margin:12mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#10231e;margin:0;background:#fff;font-size:11px}
    .page{width:186mm;min-height:273mm;margin:0 auto;border:1px solid #b9cbc4;padding:10mm;position:relative}
    header{display:grid;grid-template-columns:1fr 34mm;gap:8mm;align-items:start;border-bottom:2px solid #0f4a3d;padding-bottom:5mm;margin-bottom:5mm}
    .brand{font-size:9px;font-weight:700;color:#0f766e;text-transform:uppercase}
    h1{font-size:18px;margin:2mm 0;color:#0f2f28}
    h2{font-size:12px;margin:5mm 0 2mm;color:#0f4a3d}
    .subtitle{font-size:10px;color:#50625d}
    .photo{width:34mm;height:42mm;border:1px solid #0f4a3d;background:#f4faf8;display:flex;align-items:center;justify-content:center;text-align:center;color:#53645f;font-size:9px;overflow:hidden}
    .photo img{width:100%;height:100%;object-fit:cover}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 5mm}
    .field{border:1px solid #d4e1dc;min-height:12mm;padding:2mm;background:#fbfdfc}
    .field span{display:block;font-size:8px;text-transform:uppercase;color:#0f766e;font-weight:700;margin-bottom:1mm}
    .field strong{font-size:11px;color:#10231e}
    .wide{grid-column:1 / -1}
    .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:6mm}
    .line{border-bottom:1px solid #10231e;height:12mm;margin-bottom:1mm}
    .note{border:1px solid #d4e1dc;padding:3mm;margin-top:4mm;line-height:1.45;color:#344640}
    footer{position:absolute;left:10mm;right:10mm;bottom:7mm;border-top:1px solid #d4e1dc;padding-top:2mm;display:flex;justify-content:space-between;color:#53645f;font-size:9px}
    .actions{position:fixed;right:12px;top:12px;display:flex;gap:8px}
    button{border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:6px;padding:8px 12px;font-weight:700}
    @media print{.actions{display:none}.page{border:0;padding:0;width:auto;min-height:auto}body{font-size:11px}}
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <main class="page">
    <header>
      <div>
        <div class="brand">Powered by Tereka Online</div>
        <h1>${escapeHtml(saccoName)}</h1>
        <div class="subtitle">Member Registration Form | Generated ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
      </div>
      <div class="photo">${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="Passport photo">` : escapeHtml(photoText)}</div>
    </header>
    <h2>Member details</h2>
    <section class="grid">
      ${fields.map(([label, detail]) => `<div class="field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(detail || "-")}</strong></div>`).join("")}
    </section>
    <h2>Declaration</h2>
    <div class="note">I confirm that the information on this form is true and complete. I agree to follow the SACCO constitution, bylaws, savings rules, subscription cycle, loan policies and data protection requirements.</div>
    <section class="signature-grid">
      <div><div class="line"></div><strong>Member signature</strong><br><span>Date</span></div>
      <div><div class="line"></div><strong>Secretary / SACCO officer</strong><br><span>Date and stamp</span></div>
    </section>
    <h2>Office use</h2>
    <section class="grid">
      <div class="field"><span>Approved by</span><strong>&nbsp;</strong></div>
      <div class="field"><span>Approval date</span><strong>&nbsp;</strong></div>
      <div class="field wide"><span>Physical file reference</span><strong>&nbsp;</strong></div>
    </section>
    <footer><span>Confidential member registration record</span><span>Tereka Online powers ${escapeHtml(saccoName)}</span></footer>
  </main>
</body>
</html>`;
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
        ${mini("Documents review due", dataProtection.kycDocumentsReviewDue || 0)}
        ${mini("Document disposals", dataProtection.kycDocumentsDisposed || 0)}
        ${mini("Storage actions", dataProtection.kycStorageActions || 0)}
        ${mini("Data protection", dataProtection.evidenceStatus || "review")}
        ${mini("Compliance status", consolidated.complianceStatus || "review")}
      </div>
    </section>
  `;
}

function auditView() {
  const cycle = isPlatform() ? null : currentSaccoCycleContext();
  const rows = buildAuditRows({ events: isPlatform() ? dataRows("auditEvents") : filterAuditEventsBySaccoCycle(dataRows("auditEvents"), cycle), tenantName, userName });
  const auditGroups = buildAuditGroups(rows);
  const auditSummary = buildAuditSummary(rows, auditGroups);
  const loginRisks = loginRiskEvents();
  const tabs = [["overview", "Overview"], ["evidence", isPlatform() ? t("platformAuditEvidence") : t("saccoAuditEvidence")], ["sensitive", t("sensitiveAuditQueue")], ["trail", isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail")]];
  const tab = activeModuleTab("audit", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Audit cycle" })}
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
    ${tab === "trail" ? recordTable(isPlatform() ? t("platformAuditTrail") : `${t("saccoAuditTrail")} - ${cycle.label}`, rows, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "result"]) : ""}
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
