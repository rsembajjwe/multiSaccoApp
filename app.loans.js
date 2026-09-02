// Loan and guarantor workflow rendering extracted from app.js.

function loansView() {
  const cycle = currentSaccoCycleContext();
  const loans = buildLoanRows({
    loans: filterLoansBySaccoCycle(dataRows("loans"), cycle),
    memberName,
    labelize,
    formatMoney: (value) => money.format(value)
  });
  const portfolio = buildLoanPortfolioSummary(loans);
  const tabs = [["overview", "Overview"], ["application", t("loanApplicationForm")]];
  const tab = activeModuleTab("loans", tabs);
  if (tab === "application") {
    return `
      ${saccoCyclePanel(cycle, { title: "Loan cycle" })}
      <div class="page-actions">
        <button class="button ghost" type="button" data-summary-view="loans" data-summary-tab="overview">Back to loan overview</button>
      </div>
      ${loanApplicationPanel()}
    `;
  }
  const visibleLoans = filteredLoanOverviewRows(financeLoanDisplayRows(loans));
  const selectedLoan = visibleLoans.find((loan) => loan.id === state.selectedLoanId) || visibleLoans[0] || financeLoanDisplayRows(loans)[0];
  return `
    ${saccoCyclePanel(cycle, { title: "Loan cycle" })}
    <section class="panel compact-panel loan-overview-hero">
      <div class="panel-heading">
        <div>
          <h2>Loan Overview</h2>
          <p>View and manage loan applications, approvals, disbursements and repayment risk.</p>
        </div>
        <button class="button primary" type="button" data-summary-view="loans" data-summary-tab="application">New Loan</button>
      </div>
      <div class="loan-kpi-grid">
        ${loanMetricCard("Total loan portfolio", money.format(portfolio.outstandingPrincipal), `Across ${loans.length} loan(s)`, "portfolio")}
        ${loanMetricCard("Approved loans", money.format(sum(loans.filter((loan) => normal(loan.status).includes("approved")), "amount", "requestedAmount")), "Ready for disbursement", "approved")}
        ${loanMetricCard("Pending approval", portfolio.submitted, "Total applications", "pending")}
        ${loanMetricCard("Overdue loans", money.format(portfolio.arrearsTotal), `${portfolio.atRisk} loan(s)`, "overdue")}
      </div>
    </section>
    ${loanOverviewFilters(loans)}
    ${recordTable(`Loan applications - ${cycle.label}`, visibleLoans.map((loan) => ({
      ...loan,
      loanNo: loan.applicationNo,
      member: loan.memberName || memberName(loan.memberId),
      loanType: loan.product,
      amount: Number(loan.amount || loan.requestedAmount || 0),
      appliedOn: loan.createdAt || loan.submittedAt || loan.updatedAt,
      action: "loan-detail",
      actionLabel: "Open",
      actionId: loan.id,
      rowClass: selectedLoan?.id === loan.id ? "selected-table-row" : ""
    })), ["loanNo", "member", "loanType", "amount", "appliedOn", "status"])}
    ${selectedLoan ? loanOverviewDetailWorkspace(selectedLoan) : emptyState("Loan details", "Select a loan application to review details and actions.")}
  `;
}

function filteredLoanOverviewRows(loans) {
  const status = normal(state.loanStatusFilter || "all");
  const type = normal(state.loanTypeFilter || "all");
  return (loans || []).filter((loan) => {
    const statusText = normal(`${loan.status || ""} ${loan.stage || ""}`);
    const typeText = normal(loan.product || "");
    return (status === "all" || statusText.includes(status))
      && (type === "all" || typeText === type);
  });
}

function loanOverviewFilters(loans) {
  const products = [...new Set((loans || []).map((loan) => loan.product).filter(Boolean))].sort();
  const selectedStatus = state.loanStatusFilter || "all";
  const selectedType = state.loanTypeFilter || "all";
  return `
    <section class="panel compact-panel loan-filter-panel">
      <div class="filter-toolbar filter-toolbar-flex">
        <label>
          <span>Status</span>
          <select data-loan-status-filter>
            ${["all", "submitted", "approved", "active", "rejected", "closed"].map((status) => `<option value="${status}" ${selectedStatus === status ? "selected" : ""}>${status === "all" ? "All status" : labelize(status)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Loan type</span>
          <select data-loan-type-filter>
            <option value="all" ${selectedType === "all" ? "selected" : ""}>All loan types</option>
            ${products.map((product) => `<option value="${escapeHtml(normal(product))}" ${selectedType === normal(product) ? "selected" : ""}>${escapeHtml(product)}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>
  `;
}

function loanMetricCard(label, value, detail, tone) {
  return `
    <article class="loan-kpi-card ${escapeHtml(tone)}">
      <span class="loan-kpi-icon"></span>
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(String(value))}</strong>
      <em>${escapeHtml(detail)}</em>
    </article>
  `;
}

function loanOverviewDetailWorkspace(loan) {
  const canApprove = hasPermission("loans:approve");
  const canApproveLoan = canApprove && ["submitted", "pending_approval", "under_review"].includes(normal(loan.status));
  const canRejectLoan = canApprove && ["submitted", "pending_approval", "under_review"].includes(normal(loan.status));
  const canDisburseLoan = canApprove && normal(loan.status) === "approved";
  return `
    <div class="grid two loan-detail-workspace">
      <section class="panel compact-panel">
        <div class="panel-heading">
          <div>
            <h2>Loan Details <span class="inline-code">(${escapeHtml(loan.applicationNo || loanApplicationCode(loan))})</span></h2>
            <p>${escapeHtml(loan.memberName || memberName(loan.memberId))}</p>
          </div>
          <span class="status ${normal(loan.status).includes("active") || normal(loan.status).includes("approved") ? "active" : "pending"}">${escapeHtml(labelize(loan.status || "Pending"))}</span>
        </div>
        <div class="loan-detail-list">
          ${loanDetailRow("Member", loan.memberName || memberName(loan.memberId))}
          ${loanDetailRow("Loan Type", loan.product || "-")}
          ${loanDetailRow("Amount Requested", money.format(loan.amount || loan.requestedAmount || 0))}
          ${loanDetailRow("Repayment Period", `${loan.repaymentMonths || "-"} months`)}
          ${loanDetailRow("Interest Rate", `${loan.interestRate || 0}% monthly`)}
          ${loanDetailRow("Purpose", loan.purpose || "-")}
          ${loanDetailRow("Application Source", loanApplicationSourceLabel(loan))}
          ${loanDetailRow("Signed Form", loanSignedFormLabel(loan))}
          ${loanDetailRow("Paper Approval", loanPaperApprovalLabel(loan))}
          ${loanDetailRow("Approved By", loan.paperApprovalApprovers || "-")}
          ${loanDetailRow("Guarantors", loan.guarantors || 0)}
          ${loanDetailRow("Amount Payable", money.format(loan.totalPayable || loan.amount || 0))}
          ${loanDetailRow("Outstanding", money.format(loan.outstandingBalance || loan.balance || 0))}
          ${loanDetailRow("Application Date", formatDate(loan.createdAt || loan.submittedAt || loan.updatedAt))}
        </div>
      </section>
      <section class="panel compact-panel loan-actions-panel">
        <div class="panel-heading">
          <div>
            <h2>Actions</h2>
            <p>The Chairperson records the officers or committee members named on the signed paper approval.</p>
          </div>
        </div>
        <input type="hidden" id="selectedLoanId" value="${escapeHtml(loan.id)}">
        ${paperApprovalFields(canApprove, loan)}
        <label><span>Decision note</span><input id="loanDecisionReason" placeholder="Short note from the signed paper approval" ${canApprove ? "" : "disabled"}></label>
        <div class="loan-action-stack">
          <button class="button primary" type="button" data-loan-action="approve" ${canApproveLoan ? "" : "disabled"}>Record paper approval</button>
          <button class="button ghost danger" type="button" data-loan-action="reject" ${canRejectLoan ? "" : "disabled"}>Decline Loan</button>
          <button class="button secondary" type="button" data-row-action="member-detail" data-row-id="${escapeHtml(loan.memberId || "")}">View Member Profile</button>
          <button class="button secondary" type="button" data-loan-action="disburse" ${canDisburseLoan ? "" : "disabled"}>Disburse Loan</button>
        </div>
        <div class="notice compact">
          <strong>Approval audit</strong>
          <span>The signed physical form proves consent. The Chairperson records who approved it so the loan file has a clear audit trail.</span>
        </div>
      </section>
    </div>
  `;
}

function loanDetailRow(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value || "-"))}</strong></div>`;
}

function loanApplicationSourceLabel(loan) {
  const source = normal(loan.applicationSource || "");
  if (source === "online_member_application" || normal(loan.channel) === "mobile") return "Online member application";
  if (source === "staff_member_request") return "Staff captured before signing";
  if (source === "imported_loan_book" || normal(loan.channel) === "migration") return "Imported loan book";
  return "Staff captured from signed form";
}

function loanSignedFormLabel(loan) {
  const parts = [loan.signedFormReference, loan.signedFormFileName, formatDate(loan.signedFormReceivedAt)]
    .filter((item) => item && item !== "-");
  return parts.length ? parts.join(" / ") : (loanApplicationSourceLabel(loan).includes("signed form") ? "Evidence required" : "-");
}

function loanPaperApprovalLabel(loan) {
  const approvers = loanPaperApproverLabels(loan);
  return approvers.length ? `${approvers.join(", ")} / ${loan.paperApprovalReference || "reference pending"}` : "Not recorded";
}

function loanPaperApproverLabels(loan) {
  return [
    loan.paperApprovedByChairperson ? "Chairperson" : "",
    loan.paperApprovedBySecretary ? "Secretary" : "",
    loan.paperApprovedByTreasurer ? "Treasurer" : "",
    loan.paperApprovedByCommittee ? "Committee" : ""
  ].filter(Boolean);
}

function paperApprovalFields(canApprove, loan = {}) {
  const disabled = canApprove ? "" : "disabled";
  return `
    <div class="paper-approval-box">
      <label class="wide"><span>Paper approval reference</span><input id="loanResolutionReference" value="${escapeHtml(loan.paperApprovalReference || loan.resolutionReference || "")}" placeholder="Signed form no., minute no. or file reference" ${disabled}></label>
      <label class="wide"><span>People who approved</span><input id="loanPaperApprovers" value="${escapeHtml(loan.paperApprovalApprovers || "")}" placeholder="Example: Chairperson Sarah Kato; Treasurer John Ssemakula; Secretary Mary Namuli" ${disabled}></label>
      <div class="checkline-group">
        ${paperApprovalCheck("loanPaperChairperson", "Chairperson signed", loan.paperApprovedByChairperson, disabled)}
        ${paperApprovalCheck("loanPaperSecretary", "Secretary signed", loan.paperApprovedBySecretary, disabled)}
        ${paperApprovalCheck("loanPaperTreasurer", "Treasurer signed", loan.paperApprovedByTreasurer, disabled)}
        ${paperApprovalCheck("loanPaperCommittee", "Committee signed", loan.paperApprovedByCommittee, disabled)}
      </div>
    </div>
  `;
}

function paperApprovalCheck(id, label, checked, disabled) {
  return `<label class="checkline"><input id="${id}" type="checkbox" ${checked ? "checked" : ""} ${disabled}><span>${escapeHtml(label)}</span></label>`;
}

function guarantorsView() {
  const cycle = currentSaccoCycleContext();
  const requests = filterApprovalsBySaccoCycle(dataRows("guarantorRequests"), cycle).map((request) => ({
    ...request,
    memberName: memberName(request.memberId),
    product: request.loan?.product || request.product || "Loan",
    requestedAmount: request.loan?.amount || request.loan?.requestedAmount || request.requestedAmount || 0
  }));
  const loans = buildLoanRows({
    loans: filterLoansBySaccoCycle(dataRows("loans"), cycle),
    memberName,
    labelize,
    formatMoney: (value) => money.format(value)
  }).filter((loan) => normal(loan.stage).includes("guarant") || normal(loan.guarantorReadiness).includes("guarant"));
  const rows = requests.length ? requests : loans;
  const pending = rows.filter((row) => normal(row.status).includes("pending") || normal(row.guarantorReadiness).includes("pending"));
  const accepted = rows.filter((row) => normal(row.status).includes("accepted") || normal(row.guarantorReadiness).includes("accepted"));
  const tabs = [["overview", "Overview"], ["requests", "Guarantor requests"]];
  const tab = activeModuleTab("guarantors", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Guarantor cycle" })}
    <div class="dashboard-grid">
      ${summary("Guarantor requests", rows.length, "From loan workflow", "Open")}
      ${summary("Pending decisions", pending.length, "Awaiting member response", "Review")}
      ${summary("Accepted guarantees", accepted.length, "Can support approval", "Approve")}
      ${summary("Loan files with guarantors", loans.length, "Credit workflow", "View")}
      ${summary("Released guarantees", "Auto", "Cleared when loan closes", "Tracked")}
    </div>
    ${moduleTabs("guarantors", tabs, tab)}
    ${tab === "overview" ? loanControlPanel("Guarantor control focus", "Control borrower protection, guarantor consent and loan approval readiness.", [
      ["Borrower protection", "Borrowers cannot guarantee their own loan and guarantors must be active members.", "Controlled"],
      ["Member consent", `${pending.length} guarantor request(s) still need member acceptance before approval.`, pending.length ? "Pending" : "Clear"],
      ["Approval readiness", `${accepted.length} guarantee record(s) can support loan approval decisions.`, accepted.length ? "Ready" : "Waiting"],
      ["Loan clearance", "When a guaranteed loan is fully repaid, the guarantor record is released automatically.", "Tracked"]
    ]) : ""}
    ${tab === "overview" ? recordTable(`Guarantor requests - ${cycle.label}`, rows, ["memberName", "product", "requestedAmount", "guarantorReadiness", "status"]) : ""}
    ${tab === "requests" ? recordTable(`Guarantor requests - ${cycle.label}`, rows, ["memberName", "product", "requestedAmount", "guarantorReadiness", "status"]) : ""}
  `;
}

function loanApplicationPanel() {
  const canCreate = hasPermission("loans:create");
  const activeMembers = activeLoanMemberOptions(dataRows("members"));
  const products = loanProductOptions(dataRows("financialProducts"));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Loan application form</h2>
          <p>Create a SACCO loan application with member eligibility checks and approval routing.</p>
        </div>
      </div>
      ${state.loanFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.loanFormMessage)}</strong></div>` : ""}
      ${state.loanFormError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.loanFormError)}</span></div>` : ""}
      <form id="loanApplicationForm" class="form-grid">
        <input type="hidden" id="newLoanTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Borrower</span><select id="newLoanMemberId" ${canCreate ? "" : "disabled"}>${activeMembers.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.label)}</option>`).join("")}</select></label>
        <label><span>Loan product</span><select id="newLoanProduct" ${canCreate ? "" : "disabled"}>${products.map((product) => `<option value="${escapeHtml(product.name)}">${escapeHtml(product.label)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="newLoanAmount" type="number" min="1" step="1" required value="500000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Repayment period</span><input id="newLoanRepaymentMonths" type="number" min="1" max="60" step="1" required value="12" ${canCreate ? "" : "disabled"}></label>
        <label><span>Application route</span><select id="newLoanApplicationSource" ${canCreate ? "" : "disabled"}><option value="staff_captured_signed_form">Staff captured from signed form</option><option value="staff_member_request">Staff captured before signing</option></select></label>
        <label><span>Signed form received</span><input id="newLoanSignedFormReceivedAt" type="date" ${canCreate ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><input id="newLoanPurpose" placeholder="Business expansion, school fees, farming inputs..." ${canCreate ? "" : "disabled"}></label>
        <label><span>Signed form reference</span><input id="newLoanSignedFormReference" placeholder="Physical file no. or minute reference" ${canCreate ? "" : "disabled"}></label>
        <label><span>Attach signed form</span><input id="newLoanSignedFormFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" ${canCreate ? "" : "disabled"}><small class="hint">PDF/JPG/PNG/WEBP, max 1 MB.</small></label>
        <div class="notice compact wide loan-capture-note"><strong>Loan capture workflow</strong><span>Use this when the member has already signed a paper form. Online member requests continue through the member portal.</span></div>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function loanAppraisalPanel(canApprove, loan) {
  const appraisals = (state.selectedLoanAppraisals || []).map((row) => ({
    recommendation: labelize(row.recommendation || ""),
    recommendedAmount: row.recommendedAmount != null ? money.format(row.recommendedAmount) : "-",
    recommendedTermMonths: row.recommendedTermMonths != null ? `${row.recommendedTermMonths} mo` : "-",
    notes: row.notes || "-",
    createdAt: row.createdAt || "-"
  }));
  const latest = (state.selectedLoanAppraisals || [])[0];
  const inReview = ["submitted", "under_review", "pending_approval"].includes(normal(loan.status));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Credit appraisal</h2>
          <p>Loans officer assessment recorded for the loan committee before a decision.</p>
        </div>
        <span class="status ${latest ? (normal(latest.recommendation) === "recommended" ? "active" : "pending") : "pending"}">${latest ? labelize(latest.recommendation) : "Not appraised"}</span>
      </div>
      ${appraisals.length ? recordTable("Appraisal history", appraisals, ["recommendation", "recommendedAmount", "recommendedTermMonths", "notes", "createdAt"]) : emptyState("Appraisal history", "No appraisal has been recorded for this loan yet.")}
      ${canApprove && inReview ? `
        <form id="loanAppraisalForm" class="form-grid">
          <input type="hidden" id="appraisalLoanId" value="${escapeHtml(loan.id)}">
          <label><span>Recommendation</span><select id="appraisalRecommendation"><option value="recommended">Recommended</option><option value="declined">Declined</option></select></label>
          <label><span>Recommended amount</span><input id="appraisalAmount" type="number" min="0" step="1" placeholder="${escapeHtml(String(loan.amount || loan.requestedAmount || 0))}"></label>
          <label><span>Recommended term (months)</span><input id="appraisalTerm" type="number" min="1" max="60" placeholder="${escapeHtml(String(loan.repaymentMonths || 12))}"></label>
          <label class="wide"><span>Assessment notes</span><textarea id="appraisalNotes" placeholder="Affordability, character, repayment source, risks..."></textarea></label>
          <div class="form-actions inline"><button class="button secondary" type="submit">Record appraisal</button></div>
        </form>
      ` : ""}
    </section>
  `;
}

function loanCoverPanel() {
  const cover = state.selectedLoanCover;
  if (!cover) return "";
  const fullObligation = Number(cover.totalPayable || cover.amount || 0);
  const guarantorRows = (cover.guarantors || []).map((row) => ({
    membershipNo: row.membershipNo,
    fullName: row.fullName,
    loanAmount: money.format(cover.amount || 0),
    totalPayable: money.format(fullObligation),
    savings: money.format(row.savings || 0),
    availableCapacity: money.format(row.availableCapacity || 0),
    capacityReview: Number(row.availableCapacity || 0) >= fullObligation ? "Enough" : "Review",
    status: labelize(row.status || "")
  }));
  const acceptedCount = guarantorRows.filter((row) => normal(row.status) === "accepted").length;
  const pendingCount = guarantorRows.filter((row) => normal(row.status) === "pending").length;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Guarantor dashboard</h2>
          <p>Shows who is guaranteeing the loan, their savings balance and available guarantee capacity.</p>
        </div>
        <span class="status ${acceptedCount ? "active" : "pending"}">${acceptedCount ? "Guarantee accepted" : "Awaiting acceptance"}</span>
      </div>
      <div class="dashboard-grid">
        ${summary("Loan request", money.format(cover.amount || 0), "Amount applied for", "Assess")}
        ${summary("Total obligation", money.format(fullObligation), "Principal, interest and charges", "Cover")}
        ${summary("Applicant available savings", money.format(cover.applicant?.savings || 0), `${escapeHtml(cover.applicant?.membershipNo || "-")} available`, "Credit")}
        ${summary("Requested guarantors", guarantorRows.length, "People asked to guarantee", "Requests")}
        ${summary("Accepted guarantors", acceptedCount, pendingCount ? `${pendingCount} still pending` : "No pending requests", acceptedCount ? "Ready" : "Waiting")}
      </div>
      ${guarantorRows.length
        ? recordTable("Loan guarantor review", guarantorRows, ["membershipNo", "fullName", "loanAmount", "totalPayable", "savings", "availableCapacity", "capacityReview", "status"])
        : emptyState("Loan guarantors", "No guarantors have been selected for this loan yet.")}
    </section>
  `;
}

function loanDetailPanel(rows) {
  const loan = rows.find((item) => item.id === state.selectedLoanId) || rows[0];
  if (!loan) return "";
  const canCreate = hasPermission("loans:create");
  const canApprove = hasPermission("loans:approve");
  const borrowerId = loan.memberId;
  const guarantorOptions = activeLoanMemberOptions(dataRows("members"), borrowerId);
  const acceptedGuarantors = state.selectedLoanGuarantors.filter((request) => normal(request.status) === "accepted");
  const signedGuarantors = acceptedGuarantors.filter((request) => request.signedAt);
  const unsignedGuarantors = state.selectedLoanGuarantors.filter((request) => !request.signedAt && !["rejected", "released"].includes(normal(request.status)));
  const totalPayable = Number(loan.totalPayable || loan.amount || loan.requestedAmount || 0);
  const selfSecured = state.selectedLoanCover && Number(state.selectedLoanCover.applicant?.savings || 0) >= totalPayable && totalPayable > 0;
  const canApproveLoan = canApprove && ["submitted", "pending_approval", "under_review"].includes(normal(loan.status));
  const canRejectLoan = canApprove && ["submitted", "pending_approval"].includes(normal(loan.status));
  const canDisburseLoan = canApprove && normal(loan.status) === "approved";
  const canRepayLoan = canApprove && normal(loan.status) === "active";
  const balance = Number(loan.balance || loan.outstandingBalance || 0);
  const scheduleRows = state.selectedLoanSchedule || [];
  const arrearsScheduleRows = scheduleRows.filter((row) => normal(row.status) === "arrears");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Loan detail and guarantors</h2>
          <p>${escapeHtml(loanApplicationCode(loan))} - ${escapeHtml(loan.memberName || loan.memberId || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-loan-detail">Close</button>
      </div>
      ${state.selectedLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedLoanMessage)}</strong></div>` : ""}
      ${state.selectedLoanError ? `<div class="notice warning"><strong>Loan action failed.</strong><span>${escapeHtml(state.selectedLoanError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Loan stage", loan.approvalReadiness || labelize(loan.status || "review"), "Application to disbursement", "Review")}
        ${summary("Guarantors", signedGuarantors.length ? `${signedGuarantors.length} signed` : acceptedGuarantors.length ? `${acceptedGuarantors.length} accepted` : loan.guarantorReadiness || "Pending", "Consent and signature required", "Track")}
        ${summary("Outstanding", money.format(balance), "Servicing balance", "Repay")}
        ${summary("Monthly installment", money.format(loan.monthlyInstallment || 0), `${scheduleRows.length || loan.repaymentMonths || 0} scheduled installment(s)`, "Schedule")}
        ${summary("Arrears", arrearsScheduleRows.length, "Missed scheduled installments", "Follow up")}
        ${summary("Arrears amount", money.format(loan.arrearsAmount || 0), "Total past-due balance", "Collect")}
        ${summary("Oldest arrears", `${loan.oldestArrearsDays || 0} day(s)`, "Aging severity", loan.oldestArrearsDays > 90 ? "Escalate" : "Track")}
      </div>
      <div class="source-grid">
        ${mini("Product", loan.product)}
        ${mini("Amount", money.format(loan.amount || loan.requestedAmount || 0))}
        ${mini("Interest rate", `${loan.interestRate || 0}% monthly`)}
        ${mini("Total interest", money.format(loan.interestAmount || 0))}
        ${mini("Total payable", money.format(loan.totalPayable || loan.amount || 0))}
        ${mini("Monthly installment", money.format(loan.monthlyInstallment || 0))}
        ${mini("Outstanding", money.format(loan.balance || loan.outstandingBalance || 0))}
        ${mini("Status", loan.status)}
        ${mini("Stage", loan.stage)}
        ${mini("Guarantors", loan.guarantors || 0)}
        ${mini("Repayments", loan.repayments || 0)}
        ${mini("DSR", `${loan.dsr || 0}%`)}
        ${mini("Current due", money.format(loan.currentDueAmount || 0))}
        ${mini("1-30 days", money.format(loan.arrears1To30Amount || 0))}
        ${mini("31-60 days", money.format(loan.arrears31To60Amount || 0))}
        ${mini("61-90 days", money.format(loan.arrears61To90Amount || 0))}
        ${mini("90+ days", money.format(loan.arrearsOver90Amount || 0))}
      </div>
      ${loanCoverPanel()}
      ${loanAppraisalPanel(canApprove, loan)}
      ${loanControlPanel("Loan decision checklist", "Check guarantor consent, approval, disbursement and repayment conditions before action.", [
        ["Guarantor consent", acceptedGuarantors.length ? `${acceptedGuarantors.length} guarantor(s) accepted the request.` : selfSecured ? "Fully secured by the borrower's savings - no guarantor required." : "At least one accepted guarantor is required before approval.", acceptedGuarantors.length || selfSecured ? "Ready" : "Pending"],
        ["Guarantor signature", selfSecured ? "No guarantor signature required." : signedGuarantors.length ? `${signedGuarantors.length} accepted guarantor signature(s) confirmed.` : "Confirm at least one guarantor signature from the signed form.", signedGuarantors.length || selfSecured ? "Ready" : "Pending"],
        ["Approval", canApproveLoan ? "Approver can submit the decision; the backend will block it if signed consent or policy requirements are missing." : "Approval is available only while the loan is in review.", canApproveLoan ? "Available" : "Locked"],
        ["Disbursement", canDisburseLoan ? "Approved loan can be disbursed; one officer initiates and a second, different officer confirms before funds move." : "Disbursement is available only after approval.", canDisburseLoan ? "Ready" : "Waiting"],
        ["Repayment schedule", scheduleRows.length ? `${scheduleRows.length} installment(s) generated with interest and due dates.` : "A repayment schedule is generated automatically at disbursement.", scheduleRows.length ? "Ready" : "Waiting"],
        ["Repayment", canRepayLoan ? "Active loan can receive repayments; overpayments are rejected by the backend." : "Repayment starts after disbursement.", canRepayLoan ? "Active" : "Waiting"]
      ])}
      <div class="grid two">
      <form id="loanGuarantorForm" class="form-grid single">
          <input type="hidden" id="selectedLoanId" value="${escapeHtml(loan.id)}">
          <h3>Add guarantor request</h3>
          <label><span>Guarantor member</span><select id="newGuarantorMemberId" ${canCreate ? "" : "disabled"}>${guarantorOptions.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.label)}</option>`).join("")}</select></label>
          <p class="field-note">A guarantor confirms responsibility for this loan. No cash pledge amount is entered by the guarantor.</p>
          <div class="form-actions">${canCreate ? `<button class="button secondary" type="submit">Add guarantor request</button>` : `<span class="status pending">View only</span>`}</div>
        </form>
        <form id="loanGuarantorSignatureForm" class="form-grid single">
          <h3>Confirm signed consent</h3>
          <label><span>Guarantor on signed form</span><select id="signedGuarantorRequestId" ${canCreate && unsignedGuarantors.length ? "" : "disabled"}>${unsignedGuarantors.length ? unsignedGuarantors.map((request) => `<option value="${escapeHtml(request.id)}">${escapeHtml(memberName(request.memberId))} - ${escapeHtml(labelize(request.status || "pending"))}</option>`).join("") : `<option value="">No pending signature</option>`}</select></label>
          <label><span>Signed form reference</span><input id="guarantorSignatureReference" placeholder="Form page, file number, witness or upload reference" ${canCreate && unsignedGuarantors.length ? "" : "disabled"}></label>
          <p class="field-note">Use this after checking that the guarantor signed the physical loan form. This records consent and signature in one step.</p>
          <div class="form-actions">${canCreate ? `<button class="button secondary" type="submit" ${unsignedGuarantors.length ? "" : "disabled"}>Confirm signed consent</button>` : `<span class="status pending">View only</span>`}</div>
        </form>
        <form id="loanDecisionForm" class="form-grid single">
          <h3>Decision and servicing</h3>
          <p class="field-note">All SACCO approval signatures remain on the paper loan form. The loan officer records who signed so the system can continue to disbursement with an audit trail.</p>
          ${paperApprovalFields(canApprove, loan)}
          <label><span>Decision note</span><input id="loanDecisionReason" placeholder="Short note from the signed paper approval" ${canApprove ? "" : "disabled"}></label>
          <div class="form-actions">
            ${canApprove ? `
              <button class="button secondary" type="button" data-loan-action="approve" ${canApproveLoan ? "" : "disabled"}>Record paper approval</button>
              <button class="button ghost" type="button" data-loan-action="reject" ${canRejectLoan ? "" : "disabled"}>Reject loan</button>
              <button class="button primary" type="button" data-loan-action="disburse" ${canDisburseLoan ? "" : "disabled"}>Disburse loan</button>
            ` : `<span class="status pending">View only</span>`}
          </div>
        </form>
      </div>
      <form id="loanRepaymentForm" class="form-grid">
        <h3 class="wide">Record loan repayment via Treasurer cash, bank or mobile money</h3>
        <label><span>Amount</span><input id="loanRepaymentAmount" type="number" min="1" step="1" value="50000" ${canApprove ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="loanRepaymentChannel" ${canApprove ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <div class="notice compact"><strong>Receipt number is generated after posting.</strong></div>
        <label><span>Narration</span><input id="loanRepaymentNarration" placeholder="Repayment note" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions inline">${canApprove ? `<button class="button secondary" type="submit" ${canRepayLoan ? "" : "disabled"}>Record repayment</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      <div class="grid two">
        ${recordTable("Loan guarantor requests", state.selectedLoanGuarantors.map((request) => ({
          ...request,
          memberName: memberName(request.memberId),
          signature: request.signedAt ? `Signed - ${request.signatureReference || formatDate(request.signedAt)}` : normal(request.status) === "accepted" ? "Signature pending" : "-"
        })), ["memberName", "status", "signature", "createdAt"])}
        ${recordTable("Loan repayment history", state.selectedLoanRepayments, ["reference", "amount", "channel", "narration", "receivedAt"])}
      </div>
      ${recordTable("Loan repayment schedule", scheduleRows, ["installmentNo", "dueDate", "principalDue", "interestDue", "totalDue", "paidAmount", "balanceDue", "daysPastDue", "agingBucket", "status"])}
    </section>
  `;
}

function loanControlPanel(title, copy, rows) {
  const needsReview = rows.some((row) => ["pending", "locked", "waiting"].includes(normal(row[2])));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(copy)}</p>
        </div>
        <span class="status ${needsReview ? "pending" : "active"}">${needsReview ? "Review" : "Ready"}</span>
      </div>
      <div class="mini-grid">
        ${rows.map(([label, detail, status]) => mini(label, `${detail}${status ? ` (${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}
