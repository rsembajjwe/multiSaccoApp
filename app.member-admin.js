// Member administration, KYC and statement rendering extracted from app.js.

function memberDuesView() {
  const subs = dataRows("memberSubscriptions");
  const members = dataRows("members");
  const canManage = hasPermission("members:create");
  const needsRenewal = subs.filter((sub) => ["expiring", "grace", "expired"].includes(sub.lifecycleState));
  const activeSubs = subs.filter((sub) => sub.status !== "expired");
  const lifecycleOrder = [["active", "Active"], ["expiring", "Expiring"], ["grace", "Grace"], ["pending_payment", "Pending"], ["expired", "Expired"]];
  const duesChart = lifecycleOrder
    .map(([key, label]) => ({ label, value: subs.filter((sub) => (sub.lifecycleState || sub.status) === key).length }))
    .filter((entry) => entry.value > 0);
  const rows = subs.map((sub) => ({
    memberName: memberName(sub.memberId),
    planName: sub.planName,
    amount: money.format(sub.amount || 0),
    paid: money.format(sub.paid || 0),
    balanceDue: money.format(sub.balanceDue || 0),
    status: labelize(sub.status || ""),
    lifecycle: labelize(sub.lifecycleState || ""),
    billingPeriod: labelize(sub.billingPeriod || ""),
    expiry: sub.expiry || ""
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Memberships", subs.length, "Member dues subscriptions", "Manage")}
      ${summary("Need renewal", needsRenewal.length, "Expiring, in grace or expired", needsRenewal.length ? "Review" : "Clear")}
    </div>
    ${duesChart.length ? `<section class="panel"><div class="panel-heading"><div><h2>Membership lifecycle</h2><p>Members by dues status.</p></div></div><div class="chart-figure">${svgBarChart(duesChart, { title: "Memberships by lifecycle", format: (value) => String(Math.round(value)) })}</div></section>` : ""}
    ${state.memberDuesMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberDuesMessage)}</strong></div>` : ""}
    ${state.memberDuesError ? `<div class="notice warning"><strong>Membership action failed.</strong><span>${escapeHtml(state.memberDuesError)}</span></div>` : ""}
    ${canManage ? `<section class="panel">
      <div class="panel-heading"><div><h2>Assign membership</h2><p>Create a dues membership; it activates once fully paid and renews by period.</p></div></div>
      <form id="memberDuesAssignForm" class="form-grid">
        <label><span>Member</span><select id="memberDuesMember">${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.fullName || member.membershipNo || member.id)}</option>`).join("")}</select></label>
        <label><span>Plan name</span><input id="memberDuesPlan" type="text" value="Annual membership" maxlength="120"></label>
        <label><span>Amount</span><input id="memberDuesAmount" type="number" min="1" step="0.01"></label>
        <label><span>Period</span><select id="memberDuesPeriod"><option value="annual">Annual</option><option value="monthly">Monthly</option></select></label>
        <div class="form-actions inline"><button class="button primary" type="button" data-assign-member-dues="1">Assign membership</button></div>
      </form>
    </section>` : ""}
    ${canManage && activeSubs.length ? `<section class="panel">
      <div class="panel-heading"><div><h2>Record dues payment</h2><p>Record a cash or mobile-money dues payment; full payment renews the membership.</p></div></div>
      <form id="memberDuesPayForm" class="form-grid">
        <label><span>Membership</span><select id="memberDuesPayId">${activeSubs.map((sub) => `<option value="${escapeHtml(sub.id)}">${escapeHtml(memberName(sub.memberId))} - ${escapeHtml(sub.planName)} (${escapeHtml(money.format(sub.balanceDue || 0))} due)</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="memberDuesPayAmount" type="number" min="1" step="0.01"></label>
        <div class="form-actions inline"><button class="button primary" type="button" data-pay-member-dues="1">Record payment</button></div>
      </form>
    </section>` : ""}
    ${recordTable("Member memberships", rows, ["memberName", "planName", "amount", "paid", "balanceDue", "status", "lifecycle", "billingPeriod", "expiry"])}
  `;
}

function memberRegistrationPanel() {
  const branches = dataRows("branches");
  const defaultBranch = branches[0]?.id || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member registration</h2>
          <p>Create a member profile and login credential. Members entered by SACCO staff are active on registration.</p>
        </div>
      </div>
      ${state.memberFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberFormMessage)}</strong></div>` : ""}
      ${state.memberFormError ? `<div class="notice warning"><strong>Member registration failed.</strong><span>${escapeHtml(state.memberFormError)}</span></div>` : ""}
      <form id="memberRegistrationForm" class="form-grid">
        <input type="hidden" id="newMemberTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Membership number</span><input id="newMemberNo" placeholder="Auto if blank"></label>
        <label><span>Branch</span><select id="newMemberBranchId">${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === defaultBranch ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Full name</span><input id="newMemberFullName" required placeholder="Member full name"></label>
        <label><span>Member type</span><select id="newMemberType">${memberTypeOptions().map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("")}</select></label>
        <label><span>Phone</span><input id="newMemberPhone" required placeholder="+256..."></label>
        <label><span>Email</span><input id="newMemberEmail" type="email" placeholder="member@example.com"></label>
        <label><span>National ID</span><input id="newMemberNationalId" placeholder="CM..."></label>
        <label><span>Temporary password</span><input id="newMemberPassword" type="password" value="Member@12345"></label>
        <label><span>Joining date</span><input id="newMemberJoiningDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <div class="form-actions inline"><button class="button primary" type="submit">Create member</button></div>
      </form>
    </section>
  `;
}

function memberDetailPanel(mode = "kyc") {
  const member = state.selectedMember || dataRows("members").find((item) => item.id === state.selectedMemberId);
  if (!member) {
    return emptyState(
      mode === "statement" ? "No member selected for statement" : mode === "contacts" ? "No member selected for contacts" : "No member selected",
      "Open a member from the Member List tab to review this section."
    );
  }
  const canManage = hasPermission("members:approve") || roleKind() === "admin" || roleKind() === "secretary";
  const canEditProfile = canManage || hasPermission("members:create");
  const branches = dataRows("branches");
  const statementLines = state.selectedMemberStatement?.lines || [];
  const statementSummary = buildMemberStatementSummary(member, statementLines);
  const detailSummary = buildMemberDetailSummary({
    beneficiaries: state.selectedMemberBeneficiaries || [],
    documents: state.selectedMemberDocuments || [],
    nextOfKin: state.selectedMemberNextOfKin || [],
    statementLines,
    statementSummary
  });
  const title = mode === "contacts" ? "Member contacts and documents" : mode === "statement" ? "Member balance statement" : "Member detail";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>${escapeHtml(member.membershipNo || "")} - ${escapeHtml(member.fullName || "")}. This is a SACCO member profile, not a staff login.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-member-detail">Close</button>
      </div>
      ${state.selectedMemberMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMemberMessage)}</strong></div>` : ""}
      ${state.selectedMemberError ? `<div class="notice warning"><strong>Member update failed.</strong><span>${escapeHtml(state.selectedMemberError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Total balance", money.format(detailSummary.totalBalance), "Savings, shares and welfare", "View")}
        ${summary("Statement lines", detailSummary.statementLines, "Posted statement activity", "Review")}
        ${summary("Documents", detailSummary.documents, "Member ID documents", "Review")}
        ${summary("Contacts", detailSummary.contacts, "Next-of-kin records", "Review")}
        ${summary("Beneficiaries", detailSummary.beneficiaries, "Allocation records", "Review")}
      </div>
      <div class="source-grid">
        ${mini("Status", member.status)}
        ${mini("Savings", money.format(member.savingsBalance || 0))}
        ${mini("Shares", money.format(member.sharesBalance || 0))}
        ${mini("Welfare", money.format(member.welfareBalance || 0))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Last movement", statementSummary.lastMovement)}
      </div>
      ${mode === "kyc" ? `
        <form id="memberProfileForm" class="form-grid">
          <input type="hidden" id="selectedMemberProfileId" value="${escapeHtml(member.id)}">
          <label><span>Membership number</span><input value="${escapeHtml(member.membershipNo || "")}" readonly></label>
          <label><span>Branch</span><select id="selectedMemberBranchId" ${canEditProfile ? "" : "disabled"}>${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === member.branchId ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
          <label><span>Full name</span><input id="selectedMemberFullName" required value="${escapeHtml(member.fullName || "")}" ${canEditProfile ? "" : "readonly"}></label>
          <label><span>Member type</span><select id="selectedMemberType" ${canEditProfile ? "" : "disabled"}>${memberTypeOptions().map((type) => `<option value="${type.value}" ${type.value === member.memberType ? "selected" : ""}>${type.label}</option>`).join("")}</select></label>
          <label><span>Phone</span><input id="selectedMemberPhone" required value="${escapeHtml(member.phone || "")}" ${canEditProfile ? "" : "readonly"}></label>
          <label><span>Email</span><input id="selectedMemberEmail" type="email" value="${escapeHtml(member.email || "")}" ${canEditProfile ? "" : "readonly"}></label>
          <label><span>National ID</span><input id="selectedMemberNationalId" value="${escapeHtml(member.nationalId || "")}" ${canEditProfile ? "" : "readonly"}></label>
          <label><span>Joining date</span><input id="selectedMemberJoiningDate" type="date" value="${escapeHtml(String(member.joiningDate || "").slice(0, 10))}" ${canEditProfile ? "" : "readonly"}></label>
          <div class="form-actions inline">
            ${canEditProfile ? `<button class="button primary" type="submit">Save member profile</button>` : `<span class="status pending">Profile view only</span>`}
          </div>
        </form>
        <form id="memberStatusForm" class="form-grid single">
          <input type="hidden" id="selectedMemberId" value="${escapeHtml(member.id)}">
          <label><span>Member status</span><select id="selectedMemberStatus" ${canManage ? "" : "disabled"}>${memberStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.status ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
          <div class="form-actions">
            ${canManage ? `
              <button class="button primary" type="submit">Save member status</button>
              <button class="button secondary" type="button" data-member-decision="approve">Approve member</button>
              <button class="button secondary" type="button" data-member-decision="changes">Request changes</button>
              <button class="button ghost" type="button" data-member-decision="suspend">Suspend member</button>
            ` : `<span class="status pending">View only</span>`}
          </div>
        </form>
        ${memberStaffLinkPanel(member, canManage)}
      ` : ""}
      ${mode === "contacts" ? `<div class="grid two">
        ${memberDocumentRetentionPanel(member)}
        ${recordTable("Member documents", buildMemberDocumentRows(state.selectedMemberDocuments || [], labelize, formatDateTime), ["documentType", "storageKey", "verificationStatus", "retentionStatus", "retentionStorageAction", "retentionReviewDueAt", "retentionReviewedAt"])}
        ${recordTable("Member contacts and next of kin", state.selectedMemberNextOfKin, ["fullName", "relationship", "phone", "address", "primaryContact"])}
        ${recordTable("Member beneficiaries", state.selectedMemberBeneficiaries, ["fullName", "relationship", "phone", "allocationPercent"])}
      </div>` : ""}
      ${mode === "statement" ? `
        ${memberStatementControlPanel(member, statementLines, statementSummary)}
        ${memberStatementReceiptPanel(statementLines)}
        ${staffStatementExportPanel(member, statementLines)}
        ${filterToolbar("Search statement by reference, channel, type, amount or date", "Download CSV", "Print statement")}
        ${recordTable("Member balance statement", statementLines, ["reference", "type", "channel", "amount", "savingsBalance", "sharesBalance", "welfareBalance", "postedAt"])}
      ` : ""}
    </section>
  `;
}

function memberDocumentRetentionPanel(member) {
  const documents = state.selectedMemberDocuments || [];
  const retention = buildMemberDocumentRetentionSummary(documents);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Document retention</h2>
          <p>Control expired member documents without deleting audit history for ${escapeHtml(member.membershipNo || "member")}.</p>
        </div>
        <span class="status ${retention.reviewDue || retention.disposalPending ? "pending" : "active"}">${retention.reviewDue || retention.disposalPending ? "Review needed" : "Current"}</span>
      </div>
      <div class="source-grid">
        ${mini("Documents", retention.documents)}
        ${mini("Review due", retention.reviewDue)}
        ${mini("Disposal pending", retention.disposalPending)}
        ${mini("Disposed markers", retention.disposed)}
      </div>
      <p>Use Dispose only after the external file has been removed or legally placed beyond access in the document store.</p>
    </section>
  `;
}

function memberStatementControlPanel(member, lines, statementSummary) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Statement control summary</h2>
          <p>Staff view for balances, posted activity, payment channel coverage and receipt follow-up.</p>
        </div>
        <span class="status active">Statement ready</span>
      </div>
      <div class="source-grid">
        ${mini("Member", member.membershipNo || member.fullName)}
        ${mini("Total balance", money.format(statementSummary.totalBalance))}
        ${mini("Posted credits", money.format(statementSummary.creditTotal))}
        ${mini("Posted debits", money.format(statementSummary.debitTotal))}
        ${mini("Statement lines", lines.length)}
        ${mini("Mobile money rows", statementSummary.mobileRows)}
        ${mini("Office/Treasurer rows", statementSummary.officeRows)}
        ${mini("Last movement", statementSummary.lastMovement)}
      </div>
    </section>
  `;
}

function memberStatementReceiptPanel(lines) {
  const receiptSummary = buildMemberReceiptEvidenceSummary(lines);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipt evidence summary</h2>
          <p>Receipt readiness by posted statement line, mobile-money evidence and Treasurer office posting.</p>
        </div>
        <span class="status ${receiptSummary.receiptRows ? "active" : "pending"}">${receiptSummary.receiptRows ? "Receipts ready" : "Awaiting receipts"}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt-ready lines", receiptSummary.receiptRows)}
        ${mini("Mobile-money evidence", receiptSummary.mobileRows)}
        ${mini("Treasurer receipt evidence", receiptSummary.treasurerRows)}
        ${mini("Last receipt reference", receiptSummary.lastReceipt)}
      </div>
    </section>
  `;
}

function staffStatementExportPanel(member, lines) {
  const exportSummary = buildStaffStatementExportSummary(lines);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Staff statement export controls</h2>
          <p>Export or print the selected member statement with balances, receipt references and payment channels.</p>
        </div>
        <span class="status active">Export ready</span>
      </div>
      <div class="source-grid">
        ${mini("CSV statement", exportSummary.csvStatement)}
        ${mini("Excel schedule", exportSummary.excelSchedule)}
        ${mini("Print statement", exportSummary.printStatement)}
        ${mini("Receipt bundle", exportSummary.receiptBundle)}
        ${mini("Statement rows", exportSummary.statementRows)}
        ${mini("Audit trail", exportSummary.auditTrail)}
      </div>
      <div class="form-actions inline">
        <button class="button primary" type="button" data-staff-statement-export="csv" data-member-id="${escapeHtml(member.id)}">Download CSV</button>
        <button class="button secondary" type="button" data-staff-statement-print="statement">Print statement</button>
      </div>
    </section>
  `;
}

function memberStaffLinkPanel(member, canManage) {
  const staffSource = dataRows("users").length ? dataRows("users") : dataRows("staffDirectory");
  const tenantUsers = staffSource.filter((user) => user.tenantId === member.tenantId);
  const linked = member.linkedUserId || "";
  const linkedUser = tenantUsers.find((user) => user.id === linked);
  const picker = tenantUsers.length
    ? `<select id="memberStaffLinkUserId" ${canManage ? "" : "disabled"}>
        <option value="">Not linked</option>
        ${tenantUsers.map((user) => `<option value="${escapeHtml(user.id)}" ${user.id === linked ? "selected" : ""}>${escapeHtml(user.fullName || user.email || user.id)}${user.email ? ` (${escapeHtml(user.email)})` : ""}</option>`).join("")}
      </select>`
    : `<input id="memberStaffLinkUserId" placeholder="Staff user ID (leave blank to unlink)" value="${escapeHtml(linked)}" ${canManage ? "" : "readonly"}>`;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Staff account link</h2>
          <p>Link this member to their staff login if they are also SACCO staff. A linked staff member cannot approve, disburse or decide their own loans or transactions.</p>
        </div>
        ${linked ? `<span class="status active">Linked</span>` : `<span class="status pending">Not linked</span>`}
      </div>
      ${state.memberStaffLinkError ? `<div class="notice warning"><span>${escapeHtml(state.memberStaffLinkError)}</span></div>` : ""}
      ${state.memberStaffLinkMessage ? `<div class="notice compact"><span>${escapeHtml(state.memberStaffLinkMessage)}</span></div>` : ""}
      <form id="memberStaffLinkForm" class="form-grid single">
        <input type="hidden" id="memberStaffLinkMemberId" value="${escapeHtml(member.id)}">
        <label><span>Staff user</span>${picker}</label>
        <div class="form-actions inline">
          ${canManage ? `<button class="button primary" type="submit">Save staff link</button>` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      ${linked ? `<p class="hint">Currently linked to ${escapeHtml(linkedUser ? (linkedUser.fullName || linkedUser.email || linked) : linked)}.</p>` : ""}
    </section>
  `;
}

