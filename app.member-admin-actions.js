// SACCO member administration action handlers for Tereka Online.
// Covers member creation, profile detail loading, statements, KYC decisions and profile updates.

async function assignMemberDues() {
  const memberId = document.querySelector("#memberDuesMember")?.value || "";
  const planName = (document.querySelector("#memberDuesPlan")?.value || "").trim();
  const amount = Number(document.querySelector("#memberDuesAmount")?.value || 0);
  const billingPeriod = document.querySelector("#memberDuesPeriod")?.value || "annual";
  state.memberDuesMessage = "";
  state.memberDuesError = "";
  if (!memberId || !planName || !(amount > 0)) {
    state.memberDuesError = "Member, plan name and a positive amount are required.";
    renderShell();
    return;
  }
  try {
    await api("/member-subscriptions", {
      method: "POST",
      body: JSON.stringify({ memberId, planName, amount, billingPeriod })
    });
    await refreshAll();
    state.currentView = "member-dues";
    state.memberDuesMessage = "Membership assigned.";
    renderShell();
  } catch (error) {
    state.memberDuesError = error.message;
    renderShell();
  }
}

async function recordMemberDuesPayment() {
  const id = document.querySelector("#memberDuesPayId")?.value || "";
  const amount = Number(document.querySelector("#memberDuesPayAmount")?.value || 0);
  state.memberDuesMessage = "";
  state.memberDuesError = "";
  if (!id || !(amount > 0)) {
    state.memberDuesError = "Select a membership and enter a positive amount.";
    renderShell();
    return;
  }
  try {
    await api(`/member-subscriptions/${encodeURIComponent(id)}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount })
    });
    await refreshAll();
    state.currentView = "member-dues";
    state.memberDuesMessage = "Dues payment recorded.";
    renderShell();
  } catch (error) {
    state.memberDuesError = error.message;
    renderShell();
  }
}

async function createMemberFromForm(event) {
  event.preventDefault();
  state.memberFormMessage = "";
  state.memberFormError = "";
  try {
    const created = await api("/members", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMemberTenantId"),
        branchId: value("newMemberBranchId"),
        membershipNo: value("newMemberNo"),
        fullName: value("newMemberFullName"),
        memberType: value("newMemberType"),
        phone: value("newMemberPhone"),
        email: value("newMemberEmail"),
        nationalId: value("newMemberNationalId"),
        password: value("newMemberPassword") || "Member@12345",
        kycStatus: value("newMemberKycStatus"),
        joiningDate: value("newMemberJoiningDate")
      })
    });
    state.memberFormMessage = `Created member ${created.membershipNo} - ${created.fullName}.`;
    await refreshAll();
  } catch (error) {
    state.memberFormError = error.message;
    renderShell();
  }
}

async function openMemberDetail(memberId, targetTab = "kyc") {
  state.selectedMemberId = memberId;
  state.memberTab = targetTab;
  state.selectedMember = null;
  state.selectedMemberStatement = null;
  state.selectedMemberNextOfKin = [];
  state.selectedMemberBeneficiaries = [];
  state.selectedMemberDocuments = [];
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  renderShell();
  try {
    const [member, statement, nextOfKin, beneficiaries, documents] = await Promise.all([
      api(`/members/${encodeURIComponent(memberId)}`),
      optionalApi(`/members/${encodeURIComponent(memberId)}/statement`, null),
      optionalApi(`/members/${encodeURIComponent(memberId)}/next-of-kin`, []),
      optionalApi(`/members/${encodeURIComponent(memberId)}/beneficiaries`, []),
      optionalApi(`/members/${encodeURIComponent(memberId)}/documents`, [])
    ]);
    state.selectedMember = member;
    state.selectedMemberStatement = statement;
    state.selectedMemberNextOfKin = nextOfKin || [];
    state.selectedMemberBeneficiaries = beneficiaries || [];
    state.selectedMemberDocuments = documents || [];
  } catch (error) {
    state.selectedMemberError = error.message;
  }
  renderShell();
}

async function exportStaffMemberStatementCsv(memberId) {
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  try {
    const member = state.selectedMember || dataRows("members").find((item) => item.id === memberId) || {};
    const membershipNo = member.membershipNo || memberId || "member";
    await downloadApiFile(
      `/members/${encodeURIComponent(memberId)}/statement/export.csv`,
      `member-statement-${membershipNo}.csv`
    );
    state.selectedMemberMessage = "Statement CSV download started.";
  } catch (error) {
    state.selectedMemberError = error.message;
  }
  renderShell();
}

async function saveMemberStaffLink(event) {
  if (event) event.preventDefault();
  state.memberStaffLinkError = "";
  state.memberStaffLinkMessage = "";
  const memberId = value("memberStaffLinkMemberId");
  const userId = (value("memberStaffLinkUserId") || "").trim();
  if (!memberId) return;
  try {
    const member = await api(`/members/${encodeURIComponent(memberId)}/staff-link`, {
      method: "PATCH",
      body: JSON.stringify({ userId })
    });
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.memberStaffLinkMessage = userId ? "Staff account linked." : "Staff link removed.";
    renderShell();
  } catch (error) {
    state.memberStaffLinkError = error.message;
    renderShell();
  }
}

async function saveMemberDecision(memberId, memberStatus, kycStatus) {
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  try {
    let member = await api(`/members/${encodeURIComponent(memberId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: memberStatus })
    });
    if (kycStatus) {
      await api("/members/metadata-import", {
        method: "POST",
        body: JSON.stringify({
          tenantId: member.tenantId,
          dryRun: false,
          rows: [{ recordType: "kyc_status", membershipNo: member.membershipNo, kycStatus }]
        })
      });
      member = await api(`/members/${encodeURIComponent(memberId)}`);
    }
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Member updated: ${member.status}, KYC ${member.kycStatus}.`;
    await refreshAll();
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Member updated: ${member.status}, KYC ${member.kycStatus}.`;
    renderShell();
  } catch (error) {
    state.selectedMemberError = error.message;
    renderShell();
  }
}

async function saveMemberProfile(event) {
  event.preventDefault();
  const memberId = value("selectedMemberProfileId") || state.selectedMemberId;
  if (!memberId) return;
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  try {
    const member = await api(`/members/${encodeURIComponent(memberId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        branchId: value("selectedMemberBranchId"),
        fullName: value("selectedMemberFullName"),
        memberType: value("selectedMemberType"),
        phone: value("selectedMemberPhone"),
        email: value("selectedMemberEmail"),
        nationalId: value("selectedMemberNationalId"),
        joiningDate: value("selectedMemberJoiningDate"),
        status: value("selectedMemberStatus") || state.selectedMember?.status || "pending_approval",
        kycStatus: value("selectedMemberKycStatus") || state.selectedMember?.kycStatus || "pending_verification"
      })
    });
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Saved profile for ${member.membershipNo} - ${member.fullName}.`;
    await refreshAll();
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.memberTab = "kyc";
    state.selectedMemberMessage = `Saved profile for ${member.membershipNo} - ${member.fullName}.`;
    renderShell();
  } catch (error) {
    state.selectedMemberError = error.message;
    renderShell();
  }
}

async function updateMemberDocumentRetention(documentId, retentionStatus) {
  if (!state.selectedMemberId || !documentId) return;
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  const reason = window.prompt(
    `Reason for marking this document ${labelize(retentionStatus)}:`,
    retentionStatus === "disposed"
      ? "External member document deleted or access removed after retention review."
      : retentionStatus === "retained"
        ? "Retained for active legal/audit evidence."
        : "Member documents require retention review."
  );
  if (reason === null) return;
  const dueDate = retentionStatus === "review_due"
    ? window.prompt("Review due date (YYYY-MM-DD). Leave blank for no due date:", new Date().toISOString().slice(0, 10))
    : "";
  try {
    const updated = await api(`/members/${encodeURIComponent(state.selectedMemberId)}/documents/${encodeURIComponent(documentId)}/retention`, {
      method: "PATCH",
      body: JSON.stringify({
        retentionStatus,
        retentionReason: reason,
        retentionReviewDueAt: dueDate || null
      })
    });
    state.selectedMemberDocuments = (state.selectedMemberDocuments || []).map((document) => document.id === updated.id ? updated : document);
    state.selectedMemberMessage = `Document retention marked ${labelize(updated.retentionStatus)}.`;
    await refreshAll();
    await openMemberDetail(state.selectedMemberId, "contacts");
    state.selectedMemberMessage = `Document retention marked ${labelize(updated.retentionStatus)}.`;
  } catch (error) {
    state.selectedMemberError = error.message || "Could not update document retention.";
  }
  renderShell();
}

function runMemberDecision(action) {
  const memberId = value("selectedMemberId") || state.selectedMemberId;
  if (!memberId) return;
  if (action === "approve") {
    saveMemberDecision(memberId, "active", "verified");
    return;
  }
  if (action === "changes") {
    saveMemberDecision(memberId, "pending_approval", "pending_verification");
    return;
  }
  if (action === "suspend") {
    saveMemberDecision(memberId, "suspended", state.selectedMember?.kycStatus || value("selectedMemberKycStatus"));
    return;
  }
  saveMemberDecision(memberId, value("selectedMemberStatus"), value("selectedMemberKycStatus"));
}

