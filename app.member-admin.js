// Member administration, KYC and statement rendering extracted from app.js.

function memberRegistrationPanel() {
  const branches = dataRows("branches");
  const defaultBranch = branches[0]?.id || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member registration</h2>
          <p>Create a member profile, login credential and KYC starting state.</p>
        </div>
      </div>
      ${state.memberFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberFormMessage)}</strong></div>` : ""}
      ${state.memberFormError ? `<div class="notice warning"><strong>Member registration failed.</strong><span>${escapeHtml(state.memberFormError)}</span></div>` : ""}
      <form id="memberRegistrationForm" class="form-grid">
        <input type="hidden" id="newMemberTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Membership number</span><input id="newMemberNo" placeholder="Auto if blank"></label>
        <label><span>Branch</span><select id="newMemberBranchId">${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === defaultBranch ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Full name</span><input id="newMemberFullName" required placeholder="Member full name"></label>
        <label><span>Member type</span><select id="newMemberType"><option value="individual">Individual</option><option value="group">Group</option><option value="institutional">Institutional</option><option value="corporate">Corporate</option></select></label>
        <label><span>Phone</span><input id="newMemberPhone" required placeholder="+256..."></label>
        <label><span>Email</span><input id="newMemberEmail" type="email" placeholder="member@example.com"></label>
        <label><span>National ID</span><input id="newMemberNationalId" placeholder="CM..."></label>
        <label><span>Temporary password</span><input id="newMemberPassword" type="password" value="Member@12345"></label>
        <label><span>KYC status</span><select id="newMemberKycStatus"><option value="pending_verification">Pending verification</option><option value="not_verified">Not verified</option><option value="verified">Verified</option></select></label>
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
      mode === "statement" ? "No member selected for statement" : mode === "contacts" ? "No member selected for contacts" : "No member selected for KYC",
      "Open a member from the Member List tab to review this section."
    );
  }
  const canManage = hasPermission("members:approve") || roleKind() === "admin" || roleKind() === "secretary";
  const canEditProfile = canManage || hasPermission("members:create");
  const branches = dataRows("branches");
  const statementLines = state.selectedMemberStatement?.lines || [];
  const statementSummary = buildMemberStatementSummary(member, statementLines);
  const title = mode === "contacts" ? "Member contacts and documents" : mode === "statement" ? "Member balance statement" : "Member detail and KYC approval";
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
        ${summary("Total balance", money.format(statementSummary.totalBalance), "Savings, shares and welfare", "View")}
        ${summary("Statement lines", statementLines.length, "Posted statement activity", "Review")}
        ${summary("Documents", state.selectedMemberDocuments.length, "KYC evidence files", "Verify")}
        ${summary("Contacts", state.selectedMemberNextOfKin.length, "Next-of-kin records", "Review")}
        ${summary("Beneficiaries", state.selectedMemberBeneficiaries.length, "Allocation records", "Review")}
      </div>
      <div class="source-grid">
        ${mini("Status", member.status)}
        ${mini("KYC", member.kycStatus)}
        ${mini("KYC readiness", memberKycReadiness(member))}
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
        ${memberKycChecklist(member)}
        <form id="memberStatusForm" class="form-grid single">
          <input type="hidden" id="selectedMemberId" value="${escapeHtml(member.id)}">
          <label><span>Member status</span><select id="selectedMemberStatus" ${canManage ? "" : "disabled"}>${memberStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.status ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
          <label><span>KYC decision</span><select id="selectedMemberKycStatus" ${canManage ? "" : "disabled"}>${kycStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.kycStatus ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
          <div class="form-actions">
            ${canManage ? `
              <button class="button primary" type="submit">Save KYC decision</button>
              <button class="button secondary" type="button" data-member-decision="approve">Approve member</button>
              <button class="button secondary" type="button" data-member-decision="changes">Request changes</button>
              <button class="button ghost" type="button" data-member-decision="suspend">Suspend member</button>
            ` : `<span class="status pending">View only</span>`}
          </div>
        </form>
      ` : ""}
      ${mode === "contacts" ? `<div class="grid two">
        ${memberDocumentRetentionPanel(member)}
        ${recordTable("Member KYC documents", memberDocumentRows(), ["documentType", "storageKey", "verificationStatus", "retentionStatus", "retentionStorageAction", "retentionReviewDueAt", "retentionReviewedAt"])}
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

function memberDocumentRows() {
  return buildMemberDocumentRows(state.selectedMemberDocuments || [], labelize, formatDateTime);
}

function memberDocumentRetentionPanel(member) {
  const documents = state.selectedMemberDocuments || [];
  const retention = buildMemberDocumentRetentionSummary(documents);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>KYC document retention</h2>
          <p>Control expired KYC evidence without deleting audit history for ${escapeHtml(member.membershipNo || "member")}.</p>
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

function statementCredit(line) {
  const amount = Number(line.amount || 0);
  const credit = line.credit ?? (amount > 0 ? amount : 0);
  return Number(credit || 0);
}

function statementDebit(line) {
  const amount = Number(line.amount || 0);
  const debit = line.debit ?? (amount < 0 ? Math.abs(amount) : 0);
  return Number(debit || 0);
}

function memberStatementReceiptPanel(lines) {
  const receiptRows = buildReceiptReadyStatementLines(lines);
  const mobileRows = receiptRows.filter((line) => isMobileMoneyLine(line));
  const treasurerRows = receiptRows.filter((line) => !isMobileMoneyLine(line));
  const lastReceipt = receiptRows[0]?.receiptNo || receiptRows[0]?.reference || "No receipt yet";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipt evidence summary</h2>
          <p>Receipt readiness by posted statement line, mobile-money evidence and Treasurer office posting.</p>
        </div>
        <span class="status ${receiptRows.length ? "active" : "pending"}">${receiptRows.length ? "Receipts ready" : "Awaiting receipts"}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt-ready lines", receiptRows.length)}
        ${mini("Mobile-money evidence", mobileRows.length)}
        ${mini("Treasurer receipt evidence", treasurerRows.length)}
        ${mini("Last receipt reference", lastReceipt)}
      </div>
    </section>
  `;
}

function staffStatementExportPanel(member, lines) {
  const receiptRows = buildReceiptReadyStatementLines(lines);
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
        ${mini("CSV statement", "Backend download")}
        ${mini("Excel schedule", "Open CSV in Excel")}
        ${mini("Print statement", "Available")}
        ${mini("Receipt bundle", receiptRows.length ? "Available" : "No receipts yet")}
        ${mini("Statement rows", lines.length)}
        ${mini("Audit trail", "Included")}
      </div>
      <div class="form-actions inline">
        <button class="button primary" type="button" data-staff-statement-export="csv" data-member-id="${escapeHtml(member.id)}">Download CSV</button>
        <button class="button secondary" type="button" data-staff-statement-print="statement">Print statement</button>
      </div>
    </section>
  `;
}

function memberStatusOptions() {
  return [
    { value: "applicant", label: "Applicant" },
    { value: "pending_approval", label: "Pending approval" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "dormant", label: "Dormant" },
    { value: "suspended", label: "Suspended" },
    { value: "exited", label: "Exited" }
  ];
}

function memberTypeOptions() {
  return [
    { value: "individual", label: "Individual" },
    { value: "group", label: "Group" },
    { value: "institutional", label: "Institutional" },
    { value: "corporate", label: "Corporate" }
  ];
}

function memberKycReadiness(member) {
  const missing = [];
  if (!member.phone) missing.push("phone");
  if (!member.nationalId) missing.push("national ID");
  if (!member.fullName) missing.push("name");
  if (normal(member.kycStatus) === "verified" && normal(member.status) === "active") return "Portal ready";
  if (missing.length) return `Missing ${missing.join(", ")}`;
  if (normal(member.kycStatus).includes("pending")) return "Ready for review";
  if (normal(member.status).includes("pending")) return "Approval needed";
  return "Review";
}

function memberKycChecklist(member) {
  const checks = [
    ["Identity", member.nationalId ? "National ID captured" : "National ID missing", member.nationalId ? "Complete" : "Pending"],
    ["Contact", member.phone ? "Phone number captured" : "Phone number missing", member.phone ? "Complete" : "Pending"],
    ["KYC decision", labelize(member.kycStatus || "pending"), normal(member.kycStatus) === "verified" ? "Complete" : "Review"],
    ["Member status", labelize(member.status || "pending"), normal(member.status) === "active" ? "Active" : "Review"],
    ["Portal login", normal(member.status) === "active" ? "Member can access portal after credential setup" : "Activate member before portal access", normal(member.status) === "active" ? "Ready" : "Pending"]
  ];
  return rolePriorityPanel("Member KYC checklist", checks);
}

function kycStatusOptions() {
  return [
    { value: "not_verified", label: "Not verified" },
    { value: "pending_verification", label: "Pending verification" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "expired", label: "Expired" }
  ];
}
