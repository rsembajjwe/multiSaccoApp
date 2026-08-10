// Approval queue rendering and decision handlers extracted from app.js.

function approvalsView() {
  const pendingTx = transactionRows().filter((row) => normal(row.status).includes("pending"));
  const pendingRepayments = dataRows("pendingLoanRepayments").map((row) => ({ ...row, memberName: memberName(row.memberId) }));
  const loans = isPlatform() ? [] : dataRows("loans").filter((row) => normal(row.status).includes("review") || normal(row.status).includes("submitted")).map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId) }));
  const members = isPlatform() ? [] : dataRows("members").filter((row) => normal(row.status).includes("pending")).map((row) => ({ ...row, memberName: row.fullName, action: "member-detail", actionLabel: "Review", actionId: row.id }));
  const canApproveTx = hasPermission("transactions:approve");
  const canApproveLoans = !isPlatform() && hasPermission("loans:approve");
  const canApproveMembers = !isPlatform() && hasPermission("members:approve");
  const viewOnly = !canApproveTx && !canApproveLoans && !canApproveMembers;
  return `
    <div class="dashboard-grid">
      ${canApproveTx || pendingTx.length ? summary("Transactions to approve", pendingTx.length, "Finance maker-checker", "Decide") : ""}
      ${canApproveTx || pendingRepayments.length ? summary("Loan repayments to approve", pendingRepayments.length, "Mobile-money collections", "Decide") : ""}
      ${canApproveLoans || (!isPlatform() && loans.length) ? summary("Loans to approve", loans.length, "Credit workflow", "Decide") : ""}
      ${canApproveMembers || (!isPlatform() && members.length) ? summary("Members to verify", members.length, "KYC and onboarding", "Review") : ""}
    </div>
    ${state.selectedTransactionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTransactionMessage)}</strong></div>` : ""}
    ${state.selectedTransactionError ? `<div class="notice warning"><strong>Approval action failed.</strong><span>${escapeHtml(state.selectedTransactionError)}</span></div>` : ""}
    ${state.selectedLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedLoanMessage)}</strong></div>` : ""}
    ${state.selectedLoanError ? `<div class="notice warning"><strong>Loan decision failed.</strong><span>${escapeHtml(state.selectedLoanError)}</span></div>` : ""}
    ${state.selectedMemberMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMemberMessage)}</strong></div>` : ""}
    ${state.selectedMemberError ? `<div class="notice warning"><strong>Member decision failed.</strong><span>${escapeHtml(state.selectedMemberError)}</span></div>` : ""}
    ${state.selectedRepaymentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedRepaymentMessage)}</strong></div>` : ""}
    ${state.selectedRepaymentError ? `<div class="notice warning"><strong>Repayment decision failed.</strong><span>${escapeHtml(state.selectedRepaymentError)}</span></div>` : ""}
    ${canApproveTx ? transactionApprovalPanel(pendingTx, true) : ""}
    ${canApproveTx ? repaymentApprovalPanel(pendingRepayments, true) : ""}
    ${canApproveLoans ? loanApprovalPanel(loans, true) : ""}
    ${canApproveMembers ? memberApprovalPanel(members, true) : ""}
    ${viewOnly ? recordTable("Approval queue", [...pendingTx, ...pendingRepayments, ...loans, ...members], ["reference", "applicationNo", "membershipNo", "memberName", "type", "amount", "status"]) : ""}
  `;
}

function loanApprovalPanel(rows, canApprove) {
  if (!rows.length) {
    return emptyState("No loans to approve", "Submitted loan applications appear here for approval.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Loans awaiting approval</h2>
          <p>Approve or reject applications. A loan needs at least one accepted guarantor before approval.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      <div class="approval-list">
        ${rows.map((row) => `
          <div class="approval-item">
            <div class="approval-item-main">
              <strong>${escapeHtml(row.applicationNo || row.id)}</strong>
              <span>${escapeHtml(row.memberName || memberName(row.memberId) || "Member")} Â· ${escapeHtml(row.product || "Loan")} Â· ${money.format(row.amount || row.requestedAmount || 0)}</span>
              <small>${row.guarantors ? `${row.guarantors} accepted guarantor(s)` : "No accepted guarantor yet"}${row.dsr != null ? " Â· DSR " + row.dsr + "%" : ""} Â· ${escapeHtml(labelize(row.status || ""))}</small>
            </div>
            ${canApprove ? `
              <div class="approval-item-actions">
                <input class="approval-reason" data-loan-reason="${escapeHtml(row.id)}" placeholder="Reason (for reject)">
                <button class="button primary" type="button" data-approve-loan="${escapeHtml(row.id)}">Approve</button>
                <button class="button ghost" type="button" data-reject-loan="${escapeHtml(row.id)}">Reject</button>
                <button class="button secondary" type="button" data-row-action="loan-detail" data-row-id="${escapeHtml(row.id)}">Details</button>
              </div>
            ` : `<span class="status pending">View only</span>`}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function decideApprovalLoan(id, action) {
  if (!id || state.approvalDeciding) return;
  const reasonEl = document.querySelector(`[data-loan-reason="${id}"]`);
  const reason = reasonEl ? reasonEl.value.trim() : "";
  if (action === "reject" && !reason) {
    state.selectedLoanError = "Enter a reason before rejecting.";
    state.selectedLoanMessage = "";
    renderShell();
    return;
  }
  state.approvalDeciding = true;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    const status = action === "approve" ? "approved" : "rejected";
    const loan = await api(`/loans/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason: reason || "Approved in Tereka Online" })
    });
    await refreshAll();
    state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} ${status}.`;
  } catch (error) {
    state.selectedLoanError = error.code === "GUARANTOR_REQUIRED"
      ? "This loan needs at least one accepted guarantor before it can be approved."
      : (error.message || "Unable to complete the loan decision.");
  }
  state.approvalDeciding = false;
  renderShell();
}

function memberApprovalPanel(rows, canApprove) {
  if (!rows.length) {
    return emptyState("No members to verify", "New member registrations appear here for KYC verification and activation.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Members awaiting verification</h2>
          <p>Approve to verify KYC and activate the member, or reject the registration.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      <div class="approval-list">
        ${rows.map((row) => `
          <div class="approval-item">
            <div class="approval-item-main">
              <strong>${escapeHtml(row.membershipNo || row.id)}</strong>
              <span>${escapeHtml(row.memberName || row.fullName || "Member")}${row.phone ? " Â· " + escapeHtml(row.phone) : ""}</span>
              <small>KYC ${escapeHtml(labelize(row.kycStatus || "pending"))} Â· ${escapeHtml(labelize(row.status || ""))}</small>
            </div>
            ${canApprove ? `
              <div class="approval-item-actions">
                <button class="button primary" type="button" data-approve-member="${escapeHtml(row.id)}">Approve</button>
                <button class="button ghost" type="button" data-reject-member="${escapeHtml(row.id)}">Reject</button>
                <button class="button secondary" type="button" data-row-action="member-detail" data-row-id="${escapeHtml(row.id)}">Details</button>
              </div>
            ` : `<span class="status pending">View only</span>`}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function decideApprovalMember(id, action) {
  if (!id || state.approvalDeciding) return;
  state.approvalDeciding = true;
  try {
    if (action === "approve") {
      await saveMemberDecision(id, "active", "verified");
    } else {
      await saveMemberDecision(id, "rejected", "");
    }
  } finally {
    state.approvalDeciding = false;
  }
}

function transactionApprovalPanel(rows, canApprove) {
  if (!rows.length) {
    return emptyState("No transactions to approve", "New deposits, withdrawals and repayments appear here for maker-checker approval.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Transactions awaiting approval</h2>
          <p>Approve to post, or reject with a reason. You cannot approve a transaction you captured.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      <div class="approval-list">
        ${rows.map((row) => `
          <div class="approval-item">
            <div class="approval-item-main">
              <strong>${escapeHtml(row.reference || row.id)}</strong>
              <span>${escapeHtml(row.memberName || memberName(row.memberId) || "Member")} Â· ${escapeHtml(labelize(row.type || ""))} Â· ${money.format(row.amount || 0)} Â· ${escapeHtml(labelize(row.channel || ""))}</span>
              <small>Captured by ${escapeHtml(userName(row.makerUserId) || "staff")}${row.createdAt ? " Â· " + formatDateTime(row.createdAt) : ""}</small>
            </div>
            ${canApprove ? `
              <div class="approval-item-actions">
                <input class="approval-reason" data-approval-reason="${escapeHtml(row.id)}" placeholder="Reason (for reject)">
                <button class="button primary" type="button" data-approve-transaction="${escapeHtml(row.id)}">Approve</button>
                <button class="button ghost" type="button" data-reject-transaction="${escapeHtml(row.id)}">Reject</button>
              </div>
            ` : `<span class="status pending">View only</span>`}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function decideApprovalTransaction(id, action) {
  if (!id || state.approvalDeciding) return;
  const reasonEl = document.querySelector(`[data-approval-reason="${id}"]`);
  const reason = reasonEl ? reasonEl.value.trim() : "";
  if (action === "reject" && !reason) {
    state.selectedTransactionError = "Enter a reason before rejecting.";
    state.selectedTransactionMessage = "";
    renderShell();
    return;
  }
  state.approvalDeciding = true;
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  try {
    const status = action === "approve" ? "posted" : "rejected";
    const transaction = await api(`/financial-transactions/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason: reason || "Approved in Tereka Online" })
    });
    await refreshAll();
    state.selectedTransactionMessage = `Transaction ${transaction.reference} ${status}.`;
  } catch (error) {
    state.selectedTransactionError = error.code === "MAKER_CHECKER_REQUIRED"
      ? "You cannot approve a transaction you captured. Another officer must approve it."
      : (error.message || "Unable to complete the approval.");
  }
  state.approvalDeciding = false;
  renderShell();
}

function repaymentApprovalPanel(rows, canApprove) {
  if (!rows.length) {
    return emptyState("No loan repayments to approve", "Member mobile-money loan repayments appear here for approval before the loan balance is reduced.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Loan repayments awaiting approval</h2>
          <p>Approve to reduce the loan balance, or reject with a reason. You cannot approve a repayment you captured.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      <div class="approval-list">
        ${rows.map((row) => `
          <div class="approval-item">
            <div class="approval-item-main">
              <strong>${escapeHtml(row.reference || row.id)}</strong>
              <span>${escapeHtml(row.memberName || memberName(row.memberId) || "Member")} Â· ${money.format(row.amount || 0)} Â· ${escapeHtml(labelize(row.channel || "mobile_money"))}</span>
              <small>Received${row.receivedAt ? " " + formatDateTime(row.receivedAt) : ""} Â· ${escapeHtml(labelize(row.status || "pending_approval"))}</small>
            </div>
            ${canApprove ? `
              <div class="approval-item-actions">
                <input class="approval-reason" data-repayment-reason="${escapeHtml(row.id)}" placeholder="Reason (for reject)">
                <button class="button primary" type="button" data-approve-repayment="${escapeHtml(row.id)}" data-repayment-loan="${escapeHtml(row.loanId)}">Approve</button>
                <button class="button ghost" type="button" data-reject-repayment="${escapeHtml(row.id)}" data-repayment-loan="${escapeHtml(row.loanId)}">Reject</button>
              </div>
            ` : `<span class="status pending">View only</span>`}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

async function decideApprovalRepayment(id, loanId, action) {
  if (!id || !loanId || state.approvalDeciding) return;
  const reasonEl = document.querySelector(`[data-repayment-reason="${id}"]`);
  const reason = reasonEl ? reasonEl.value.trim() : "";
  if (action === "reject" && !reason) {
    state.selectedRepaymentError = "Enter a reason before rejecting.";
    state.selectedRepaymentMessage = "";
    renderShell();
    return;
  }
  state.approvalDeciding = true;
  state.selectedRepaymentMessage = "";
  state.selectedRepaymentError = "";
  try {
    const status = action === "approve" ? "posted" : "rejected";
    const repayment = await api(`/loans/${encodeURIComponent(loanId)}/repayments/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body: JSON.stringify({ status, reason: reason || "Approved in Tereka Online" })
    });
    await refreshAll();
    state.selectedRepaymentMessage = `Repayment ${repayment.reference} ${status === "posted" ? "approved" : "rejected"}.`;
  } catch (error) {
    state.selectedRepaymentError = error.code === "MAKER_CHECKER_REQUIRED"
      ? "You cannot approve a repayment you captured. Another officer must approve it."
      : (error.message || "Unable to complete the repayment decision.");
  }
  state.approvalDeciding = false;
  renderShell();
}

