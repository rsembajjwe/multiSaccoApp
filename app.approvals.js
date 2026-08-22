// Approval queue rendering and decision handlers extracted from app.js.

function approvalsView() {
  const cycle = isPlatform() ? null : currentSaccoCycleContext();
  const queue = buildApprovalQueueModel({
    isPlatform: isPlatform(),
    loans: isPlatform() ? dataRows("loans") : filterLoansBySaccoCycle(dataRows("loans"), cycle),
    memberName,
    members: isPlatform() ? dataRows("members") : filterMembersBySaccoCycle(dataRows("members"), cycle),
    pendingRepayments: isPlatform() ? dataRows("pendingLoanRepayments") : filterApprovalsBySaccoCycle(dataRows("pendingLoanRepayments"), cycle),
    transactions: isPlatform() ? transactionRows() : filterApprovalsBySaccoCycle(transactionRows(), cycle)
  });
  if (!isPlatform() && roleKind() === "secretary") return secretaryApprovalsView(queue);
  const queueSummary = buildApprovalQueueSummary(queue);
  const canApproveTx = hasPermission("transactions:approve");
  const canApproveLoans = !isPlatform() && hasPermission("loans:approve");
  const canApproveMembers = !isPlatform() && hasPermission("members:approve");
  const viewOnly = !canApproveTx && !canApproveLoans && !canApproveMembers;
  const tabs = [["overview", "Overview"], ["queue", "Approval queue"]];
  const tab = activeModuleTab("approvals", tabs);
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${canApproveTx || queueSummary.transactionsToApprove ? summary("Transactions to approve", queueSummary.transactionsToApprove, "Finance maker-checker", "Decide") : ""}
      ${canApproveTx || queueSummary.repaymentsToApprove ? summary("Loan repayments to approve", queueSummary.repaymentsToApprove, "Mobile-money collections", "Decide") : ""}
      ${canApproveLoans || (!isPlatform() && queueSummary.loansToApprove) ? summary("Loans to approve", queueSummary.loansToApprove, "Credit workflow", "Decide") : ""}
      ${canApproveMembers || (!isPlatform() && queueSummary.membersToVerify) ? summary("Members to activate", queueSummary.membersToVerify, "Member onboarding", "Review") : ""}
    </div>
    ${state.selectedTransactionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTransactionMessage)}</strong></div>` : ""}
    ${state.selectedTransactionError ? `<div class="notice warning"><strong>Approval action failed.</strong><span>${escapeHtml(state.selectedTransactionError)}</span></div>` : ""}
    ${state.selectedLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedLoanMessage)}</strong></div>` : ""}
    ${state.selectedLoanError ? `<div class="notice warning"><strong>Loan decision failed.</strong><span>${escapeHtml(state.selectedLoanError)}</span></div>` : ""}
    ${state.selectedMemberMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMemberMessage)}</strong></div>` : ""}
    ${state.selectedMemberError ? `<div class="notice warning"><strong>Member decision failed.</strong><span>${escapeHtml(state.selectedMemberError)}</span></div>` : ""}
    ${state.selectedRepaymentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedRepaymentMessage)}</strong></div>` : ""}
    ${state.selectedRepaymentError ? `<div class="notice warning"><strong>Repayment decision failed.</strong><span>${escapeHtml(state.selectedRepaymentError)}</span></div>` : ""}
    ${moduleTabs("approvals", tabs, tab)}
    ${tab === "overview" ? approvalDecisionCenterPanel(queueSummary) : ""}
    ${tab === "queue" ? `
      ${canApproveTx ? transactionApprovalPanel(queue.pendingTransactions, true) : ""}
      ${canApproveTx ? repaymentApprovalPanel(queue.pendingRepayments, true) : ""}
      ${canApproveLoans ? loanApprovalPanel(queue.loans, true) : ""}
      ${canApproveMembers ? memberApprovalPanel(queue.members, true) : ""}
      ${viewOnly ? recordTable("Approval queue", queue.viewOnlyQueue, ["reference", "applicationNo", "membershipNo", "memberName", "type", "amount", "status"]) : ""}
    ` : ""}
  `;
}

function secretaryApprovalsView(queue) {
  const cycle = currentSaccoCycleContext();
  const model = buildSecretaryApprovalWorkspaceModel(queue, cycle);
  const tabs = [
    ["overview", "Overview"],
    ["membership", "Membership and KYC"],
    ["governance", "Governance records"],
    ["complaints", "Complaint routing"],
    ["profile", "Profile requests"]
  ];
  const tab = activeModuleTab("approvals", tabs);
  return `
    ${saccoCyclePanel(cycle)}
    <div class="dashboard-grid">
      ${summary("Members awaiting activation", model.membership.length, "KYC and admission records", "Review")}
      ${summary("Governance follow-up", model.governance.length, "Meetings, minutes and resolutions", "Prepare")}
      ${summary("Open member complaints", model.complaints.length, "Route and follow up", "Open")}
      ${summary("Profile requests", model.profileRequests.length, "Member data change requests", "Review")}
    </div>
    ${state.selectedMemberMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMemberMessage)}</strong></div>` : ""}
    ${state.selectedMemberError ? `<div class="notice warning"><strong>Member decision failed.</strong><span>${escapeHtml(state.selectedMemberError)}</span></div>` : ""}
    ${moduleTabs("approvals", tabs, tab)}
    ${tab === "overview" ? secretaryApprovalOverviewPanel(model) : ""}
    ${tab === "membership" ? secretaryMembershipApprovalPanel(model.membership) : ""}
    ${tab === "governance" ? secretaryGovernanceApprovalPanel(model.governance) : ""}
    ${tab === "complaints" ? secretaryComplaintRoutingPanel(model.complaints) : ""}
    ${tab === "profile" ? secretaryProfileRequestPanel(model.profileRequests) : ""}
  `;
}

function buildSecretaryApprovalWorkspaceModel(queue, cycle = currentSaccoCycleContext()) {
  const openStatuses = ["pending", "submitted", "open", "in_progress", "draft", "review"];
  const activeMembers = filterMembersBySaccoCycle(dataRows("members"), cycle).filter((row) => normal(row.status) === "active");
  const profileRequests = dataRows("privacyRequests")
    .filter((row) => governanceDateFallsInCycle(row.createdAt || row.updatedAt, cycle))
    .filter((row) => openStatuses.some((status) => normal(row.status).includes(status)))
    .map((row) => ({
      ...row,
      memberName: row.memberName || memberName(row.memberId),
      action: "member-detail",
      actionLabel: "Open member",
      actionId: row.memberId || row.id
    }));
  const governance = buildGovernanceMeetingRows({ meetings: filterGovernanceMeetingsByCycle(dataRows("governanceMeetings"), cycle), memberName, userName })
    .filter((row) => !["closed", "completed", "cancelled"].includes(normal(row.status)))
    .map((row) => ({
      ...row,
      action: "governance-meeting-detail",
      actionLabel: "Open record",
      actionId: row.id
    }));
  const complaints = filterComplaintsBySaccoCycle(dataRows("complaints"), cycle)
    .filter((row) => row.memberId && !["closed", "resolved", "cancelled"].includes(normal(row.status)))
    .map((row) => ({
      ...row,
      memberName: row.memberName || memberName(row.memberId),
      action: "complaint-chat",
      actionLabel: "Open chat",
      actionId: row.id
    }));
  return {
    activeMembers,
    complaints,
    governance,
    membership: queue.members,
    profileRequests,
    restrictedQueues: {
      loans: queue.loans.length,
      repayments: queue.pendingRepayments.length,
      transactions: queue.pendingTransactions.length
    }
  };
}

function secretaryApprovalOverviewPanel(model) {
  const restrictedTotal = model.restrictedQueues.loans + model.restrictedQueues.repayments + model.restrictedQueues.transactions;
  return `
    <section class="secretary-approval-layout">
      <div class="panel">
        <div class="panel-heading">
          <div>
            <h2>Secretary decision scope</h2>
            <p>The Secretary handles records and member administration. Money movement and credit decisions are routed to Treasurer, Chairperson or Finance roles.</p>
          </div>
          <span class="status ${restrictedTotal ? "pending" : "active"}">${restrictedTotal ? "Protected" : "Clear"}</span>
        </div>
        <div class="secretary-scope-grid">
          ${secretaryScopeCard("Allowed", "Member registration and KYC readiness", "Activate or reject pending member files after record checks.", "active")}
          ${secretaryScopeCard("Allowed", "Governance documentation", "Prepare meeting records, resolutions and follow-up evidence.", "active")}
          ${secretaryScopeCard("Allowed", "Complaint routing", "Open member complaint chats and coordinate administrative closure.", "active")}
          ${secretaryScopeCard("Blocked", "Financial approvals", "Transactions, repayments, loans, reversals and journals are hidden from this desk.", "danger")}
        </div>
      </div>
      <div class="panel secretary-approval-sidebar">
        <div class="panel-heading">
          <div>
            <h2>Protected queues</h2>
            <p>These are intentionally not actionable for Secretary.</p>
          </div>
        </div>
        <div class="mini-grid">
          ${mini("Transactions", model.restrictedQueues.transactions)}
          ${mini("Loan repayments", model.restrictedQueues.repayments)}
          ${mini("Loans", model.restrictedQueues.loans)}
        </div>
      </div>
    </section>
    ${secretaryMembershipApprovalPanel(model.membership)}
  `;
}

function secretaryScopeCard(label, title, copy, tone) {
  return `
    <article class="secretary-scope-card ${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(copy)}</p>
    </article>
  `;
}

function secretaryMembershipApprovalPanel(rows) {
  if (!rows.length) {
    return emptyState("No member files awaiting activation", "Pending member registrations will appear here after capture or self-registration.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Membership and KYC activation</h2>
          <p>Confirm the member record, contact details and KYC status before activating membership.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      <div class="approval-list secretary-approval-list">
        ${rows.map((row) => `
          <div class="approval-item secretary-approval-item">
            <div class="approval-item-main">
              <strong>${escapeHtml(row.memberName || row.fullName || "Member")}</strong>
              <span>${escapeHtml(row.membershipNo || row.id)}${row.phone ? " / " + escapeHtml(row.phone) : ""}</span>
              <small>KYC ${escapeHtml(labelize(row.kycStatus || "pending"))} / Status ${escapeHtml(labelize(row.status || "pending"))}</small>
            </div>
            <div class="approval-item-actions">
              <button class="button primary" type="button" data-approve-member="${escapeHtml(row.id)}">Activate member</button>
              <button class="button ghost" type="button" data-reject-member="${escapeHtml(row.id)}">Reject</button>
              <button class="button secondary" type="button" data-row-action="member-detail" data-row-id="${escapeHtml(row.id)}">Open file</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function secretaryGovernanceApprovalPanel(rows) {
  if (!rows.length) {
    return emptyState("No governance records awaiting follow-up", "Meeting records, minutes and resolutions that need Secretary attention will appear here.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Governance record follow-up</h2>
          <p>Prepare minutes, resolutions and action evidence. Final governance decisions remain with the relevant committee or Chairperson.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      ${recordTable("Governance records", rows, ["title", "meetingType", "scheduledAt", "status", "createdByName"])}
    </section>
  `;
}

function secretaryComplaintRoutingPanel(rows) {
  if (!rows.length) {
    return `
      <section class="panel complaint-routing-panel">
        <div class="panel-heading">
          <div>
            <h2>Member complaint routing</h2>
            <p>Member complaint chats that need administrative follow-up will appear here.</p>
          </div>
          <span class="status active">Clear</span>
        </div>
        <div class="complaint-routing-guide">
          ${secretaryComplaintRoutingStep("1", "Member writes to SACCO", "Complaints start in the member portal or SACCO office capture.")}
          ${secretaryComplaintRoutingStep("2", "Secretary routes", "Open chat, confirm ownership and keep the member informed.")}
          ${secretaryComplaintRoutingStep("3", "Escalate if needed", "Financial decisions go to Treasurer or Chairperson. Platform issues go to SACCO admin.")}
        </div>
      </section>
    `;
  }
  return `
    <section class="panel complaint-routing-panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint routing</h2>
          <p>Open the chat, confirm the member issue, route the follow-up and keep the member informed. Platform complaints are handled separately by SACCO admins.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      <div class="complaint-routing-guide">
        ${secretaryComplaintRoutingStep("Check", "Read the chat first", "Understand the member request before changing status.")}
        ${secretaryComplaintRoutingStep("Route", "Send to the right officer", "Treasurer handles money proof; Chairperson handles policy decisions.")}
        ${secretaryComplaintRoutingStep("Close", "Reply before resolving", "A member should see the final answer in chat.")}
      </div>
      ${recordTable("Member complaints", complaintTableRows(rows), ["memberName", "subject", "priority", "status", "routedTo", "latestActivity", "updatedAt"])}
    </section>
  `;
}

function secretaryComplaintRoutingStep(label, title, copy) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(copy)}</p>
    </div>
  `;
}

function secretaryProfileRequestPanel(rows) {
  if (!rows.length) {
    return emptyState("No profile requests awaiting review", "Member data correction or privacy requests will appear here for administrative follow-up.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Profile and data requests</h2>
          <p>Review member profile updates, privacy requests and supporting records before action.</p>
        </div>
        <span class="status pending">${rows.length}</span>
      </div>
      ${recordTable("Profile requests", rows, ["memberName", "requestType", "status", "submittedAt", "resolvedAt"])}
    </section>
  `;
}

function approvalDecisionCenterPanel(queueSummary) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Approval decision center</h2>
          <p>Maker-checker queue for transaction posting, repayments, loans and member verification.</p>
        </div>
        <span class="status ${queueSummary.total ? "pending" : "active"}">${queueSummary.total ? "Decision queue" : "Clear"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Transactions", queueSummary.transactionsToApprove)}
        ${mini("Loan repayments", queueSummary.repaymentsToApprove)}
        ${mini("Loans", queueSummary.loansToApprove)}
        ${mini("Members", queueSummary.membersToVerify)}
      </div>
    </section>
    ${recordTable("Approval queue", [], ["reference", "type", "amount", "status"])}
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
    return emptyState("No members to activate", "New member registrations appear here for review and activation.");
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Members awaiting activation</h2>
          <p>Approve to review and activate the member, or reject the registration.</p>
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
