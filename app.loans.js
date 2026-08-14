// Loan and guarantor workflow rendering extracted from app.js.

function loansView() {
  const loans = buildLoanRows({
    loans: dataRows("loans"),
    memberName,
    labelize,
    formatMoney: (value) => money.format(value)
  });
  const portfolio = buildLoanPortfolioSummary(loans);
  const tabs = [["overview", "Overview"], ["application", t("loanApplicationForm")], ["list", t("loanApplicationList")], ["detail", t("loanDetailGuarantors")]];
  const tab = activeModuleTab("loans", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("activeLoans"), portfolio.active, "Disbursed portfolio", t("open"))}
      ${summary(t("outstandingPrincipal"), money.format(portfolio.outstandingPrincipal), "Portfolio balance", t("review"))}
      ${summary(t("awaitingApproval"), portfolio.submitted, "Guarantor and decision queue", "Approve")}
      ${summary(t("readyToDisburse"), portfolio.approved, "Approved but not active", "Disburse")}
      ${summary(t("portfolioAtRisk"), portfolio.atRisk, "Arrears and DSR risk", "Report")}
      ${summary("Arrears aging", money.format(portfolio.arrearsTotal), "Past-due credit exposure", "Follow up")}
      ${summary("90+ days", money.format(portfolio.over90Total), "High-risk overdue balances", "Escalate")}
    </div>
    ${moduleTabs("loans", tabs, tab)}
    ${tab === "overview" ? loanControlPanel(t("loanLifecycleControl"), "Track applications, guarantor consent, approval, disbursement, repayments and arrears.", [
      ["Application", `${portfolio.submitted} loan file(s) are in application, guarantor or approval review.`, portfolio.submitted ? "Pending" : "Clear"],
      ["Disbursement", `${portfolio.approved} approved loan(s) are ready for disbursement after final checks.`, portfolio.approved ? "Ready" : "Clear"],
      ["Servicing", `${portfolio.active} active loan(s) can receive repayments and arrears monitoring.`, portfolio.active ? "Active" : "Pending"]
    ]) : ""}
    ${tab === "application" ? loanApplicationPanel() : ""}
    ${tab === "detail" ? (loanDetailPanel(loans) || emptyState("Loan detail and guarantors", "Select a loan application from the list to review guarantors, decisions and repayments.")) : ""}
    ${tab === "list" ? recordTable("Loan application list", loans, ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "monthlyInstallment", "nextDueDate", "arrearsAmount", "arrears1To30Amount", "arrears31To60Amount", "arrears61To90Amount", "arrearsOver90Amount", "oldestArrearsDays", "scheduleStatus", "guarantorReadiness", "approvalReadiness", "servicingStatus", "status"]) : ""}
  `;
}

function guarantorsView() {
  const requests = dataRows("guarantorRequests").map((request) => ({ ...request, memberName: memberName(request.memberId) }));
  const loans = buildLoanRows({
    loans: dataRows("loans"),
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
    <div class="dashboard-grid">
      ${summary("Guarantor requests", rows.length, "From loan workflow", "Open")}
      ${summary("Pending decisions", pending.length, "Awaiting member response", "Review")}
      ${summary("Accepted guarantees", accepted.length, "Can support approval", "Approve")}
      ${summary("Loan files with guarantors", loans.length, "Credit workflow", "View")}
      ${summary("Member exposure", "Review", "Guarantee capacity", "Assess")}
    </div>
    ${moduleTabs("guarantors", tabs, tab)}
    ${tab === "overview" ? loanControlPanel("Guarantor control focus", "Control borrower protection, guarantor consent and loan approval readiness.", [
      ["Borrower protection", "Borrowers cannot guarantee their own loan and guarantors must be active members.", "Controlled"],
      ["Member consent", `${pending.length} guarantor request(s) still need member acceptance before approval.`, pending.length ? "Pending" : "Clear"],
      ["Approval readiness", `${accepted.length} guarantee record(s) can support loan approval decisions.`, accepted.length ? "Ready" : "Waiting"],
      ["Capacity", "Review each guarantor exposure before approval.", "Assess"]
    ]) : ""}
    ${tab === "overview" ? recordTable("Guarantor requests", rows, ["memberName", "product", "requestedAmount", "guaranteedAmount", "capacity", "guarantorReadiness", "status"]) : ""}
    ${tab === "requests" ? recordTable("Guarantor requests", rows, ["memberName", "product", "requestedAmount", "guaranteedAmount", "capacity", "guarantorReadiness", "status"]) : ""}
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
        <label class="wide"><span>Purpose</span><input id="newLoanPurpose" placeholder="Business expansion, school fees, farming inputs..." ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
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
  const canApproveLoan = canApprove && ["submitted", "pending_approval"].includes(normal(loan.status)) && acceptedGuarantors.length > 0;
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
          <p>${escapeHtml(loan.applicationNo || loan.id)} - ${escapeHtml(loan.memberName || loan.memberId || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-loan-detail">Close</button>
      </div>
      ${state.selectedLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedLoanMessage)}</strong></div>` : ""}
      ${state.selectedLoanError ? `<div class="notice warning"><strong>Loan action failed.</strong><span>${escapeHtml(state.selectedLoanError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Loan stage", loan.approvalReadiness || labelize(loan.status || "review"), "Application to disbursement", "Review")}
        ${summary("Guarantors", acceptedGuarantors.length ? `${acceptedGuarantors.length} accepted` : loan.guarantorReadiness || "Pending", "Member consent required", "Track")}
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
      ${loanControlPanel("Loan decision checklist", "Check guarantor consent, approval, disbursement and repayment conditions before action.", [
        ["Guarantor consent", acceptedGuarantors.length ? `${acceptedGuarantors.length} guarantor(s) accepted the request.` : "At least one accepted guarantor is required before approval.", acceptedGuarantors.length ? "Ready" : "Pending"],
        ["Approval", canApproveLoan ? "Loan can be approved after appraisal checks." : "Approval is locked until status and guarantor rules are satisfied.", canApproveLoan ? "Available" : "Locked"],
        ["Disbursement", canDisburseLoan ? "Approved loan can be disbursed into active servicing." : "Disbursement is available only after approval.", canDisburseLoan ? "Ready" : "Waiting"],
        ["Repayment schedule", scheduleRows.length ? `${scheduleRows.length} installment(s) generated with interest and due dates.` : "A repayment schedule is generated automatically at disbursement.", scheduleRows.length ? "Ready" : "Waiting"],
        ["Repayment", canRepayLoan ? "Active loan can receive repayments; overpayments are rejected by the backend." : "Repayment starts after disbursement.", canRepayLoan ? "Active" : "Waiting"]
      ])}
      <div class="grid two">
      <form id="loanGuarantorForm" class="form-grid single">
          <input type="hidden" id="selectedLoanId" value="${escapeHtml(loan.id)}">
          <h3>Add guarantor request</h3>
          <label><span>Guarantor member</span><select id="newGuarantorMemberId" ${canCreate ? "" : "disabled"}>${guarantorOptions.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.label)}</option>`).join("")}</select></label>
          <label><span>Guaranteed amount</span><input id="newGuarantorAmount" type="number" min="1" step="1" value="${Math.ceil(Number(loan.amount || loan.requestedAmount || 0) / 2)}" ${canCreate ? "" : "disabled"}></label>
          <div class="form-actions">${canCreate ? `<button class="button secondary" type="submit">Add guarantor request</button>` : `<span class="status pending">View only</span>`}</div>
        </form>
        <form id="loanDecisionForm" class="form-grid single">
          <h3>Decision and servicing</h3>
          <label><span>Decision reason</span><input id="loanDecisionReason" placeholder="Decision note or rejection reason" ${canApprove ? "" : "disabled"}></label>
          <div class="form-actions">
            ${canApprove ? `
              <button class="button secondary" type="button" data-loan-action="approve" ${canApproveLoan ? "" : "disabled"}>Approve loan</button>
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
        <label><span>Reference</span><input id="loanRepaymentReference" value="LR-${Date.now()}" ${canApprove ? "" : "disabled"}></label>
        <label><span>Narration</span><input id="loanRepaymentNarration" placeholder="Repayment note" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions inline">${canApprove ? `<button class="button secondary" type="submit" ${canRepayLoan ? "" : "disabled"}>Record repayment</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      <div class="grid two">
        ${recordTable("Loan guarantor requests", state.selectedLoanGuarantors.map((request) => ({ ...request, memberName: memberName(request.memberId) })), ["memberName", "guaranteedAmount", "capacity", "status", "createdAt"])}
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

