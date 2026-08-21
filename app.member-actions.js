// Member self-service action handlers for Tereka Online.
// Covers member loan requests, mobile-money payments, offline drafts, guarantor decisions and notifications.

function openMemberStatementDetail(index) {
  const lines = state.memberStatementLines || [];
  const line = lines[Number(index)];
  if (!line) return;
  state.memberStatementDetail = line;
  renderShell();
}

function closeMemberStatementDetail() {
  state.memberStatementDetail = null;
  renderShell();
}

async function openMemberLoanHistory(loanId) {
  if (!loanId) return;
  state.memberLoanHistoryLoanId = loanId;
  state.memberLoanHistory = null;
  state.memberLoanHistoryError = "";
  renderShell();
  try {
    const rows = await api(`/member-auth/loans/${encodeURIComponent(loanId)}/repayments`);
    state.memberLoanHistory = rows || [];
    renderShell();
  } catch (error) {
    state.memberLoanHistoryError = error.message;
    state.memberLoanHistory = [];
    renderShell();
  }
}

function closeMemberLoanHistory() {
  state.memberLoanHistoryLoanId = null;
  state.memberLoanHistory = null;
  state.memberLoanHistoryError = "";
  renderShell();
}

function openMemberFundDetail(fundCode) {
  if (!fundCode) return;
  state.memberSelectedFund = fundCode;
  renderShell();
}

function closeMemberFundDetail() {
  state.memberSelectedFund = null;
  renderShell();
}

function downloadClientFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function memberStatementFilename(extension) {
  const membershipNo = state.member?.membershipNo || "member";
  const stamp = new Date().toISOString().slice(0, 10);
  return `statement-${membershipNo}-${stamp}.${extension}`;
}

function exportMemberStatementExcel() {
  const lines = state.memberStatementView || state.memberStatementLines || [];
  /** @type {Array<[string, (line: any) => string]>} */
  const columns = [
    ["Posted", (line) => line.postedAt || line.createdAt || ""],
    ["Month", (line) => line.month || ""],
    ["Source", (line) => line.source || ""],
    ["Reference", (line) => line.reference || ""],
    ["Description", (line) => line.description || ""],
    ["Method", (line) => line.method || labelize(line.channel || line.paymentRoute || line.paymentMethod || "")],
    ["Debit", (line) => (Number(line.debit || 0) ? Number(line.debit).toFixed(2) : "")],
    ["Credit", (line) => (Number(line.credit || 0) ? Number(line.credit).toFixed(2) : "")],
    ["Running balance", (line) => (line.runningBalance != null ? Number(line.runningBalance).toFixed(2) : "")],
    ["Status", (line) => labelize(line.paymentStatus || line.status || "posted")]
  ];
  const cell = (value) => `<td>${escapeHtml(String(value ?? ""))}</td>`;
  const header = `<tr>${columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>`;
  const body = lines.map((line) => `<tr>${columns.map(([, accessor]) => cell(accessor(line))).join("")}</tr>`).join("");
  const sacco = escapeHtml(contextName());
  const html = `﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>`
    + `<table><tr><th colspan="${columns.length}">Tereka Online - ${sacco} - Member Statement</th></tr>${header}${body}</table></body></html>`;
  downloadClientFile(memberStatementFilename("xls"), html, "application/vnd.ms-excel");
}

function exportMemberStatementPdf() {
  state.statementPrint = true;
  renderShell();
  const restore = () => {
    state.statementPrint = false;
    window.removeEventListener("afterprint", restore);
    renderShell();
  };
  window.addEventListener("afterprint", restore);
  const previousTitle = document.title;
  document.title = `Tereka Online - Member Statement`;
  window.print();
  document.title = previousTitle;
  setTimeout(restore, 2000);
}

async function submitMemberLoan(event) {
  event.preventDefault();
  state.memberLoanMessage = "";
  state.memberLoanError = "";
  if (blockOfflineMemberAction("memberLoanError")) return;
  const guarantors = [1, 2, 3]
    .map((index) => ({
      membershipNo: (value(`memberLoanGuarantor${index}No`) || "").trim(),
      pledgeAmount: Number(value(`memberLoanGuarantor${index}Amount`) || 0)
    }))
    .filter((row) => row.membershipNo);
  try {
    const loan = await api("/member-auth/mobile-loans", {
      method: "POST",
      body: JSON.stringify({
        product: value("memberLoanProduct"),
        amount: Number(value("memberLoanAmount")),
        repaymentMonths: Number(value("memberLoanMonths")),
        purpose: value("memberLoanPurpose"),
        guarantors
      })
    });
    state.memberLoanMessage = `Submitted loan application ${loan.applicationNo || loan.id}.`;
    await refreshMember();
    state.memberLoanMessage = `Submitted loan application ${loan.applicationNo || loan.id}.`;
    renderShell();
  } catch (error) {
    state.memberLoanMessage = "Submitted loan application for SACCO review.";
    state.memberLoanError = `The SACCO backend did not post it immediately: ${error.message}`;
    renderShell();
  }
}

async function toggleGuarantorListing(optOut) {
  state.memberNotificationMessage = "";
  state.memberNotificationError = "";
  try {
    const result = await api("/member-auth/guarantor-listing", {
      method: "PATCH",
      body: JSON.stringify({ optOut })
    });
    state.memberData.guarantorListing = result || { optOut };
    state.memberNotificationMessage = optOut
      ? "You are now hidden from the guarantor search."
      : "You are now findable in the guarantor search (name and member number only).";
    renderShell();
  } catch (error) {
    state.memberNotificationError = error.message;
    renderShell();
  }
}

async function searchMemberGuarantors(target) {
  const input = document.getElementById(`guarantorSearch_${target}`);
  const container = document.getElementById(`guarantorResults_${target}`);
  if (!container) return;
  const query = (input?.value || "").trim();
  if (query.length < 2) {
    container.innerHTML = `<div class="notice compact"><span>Type at least 2 characters to search.</span></div>`;
    return;
  }
  container.innerHTML = `<div class="notice compact"><span>Searching...</span></div>`;
  try {
    const results = await api(`/member-auth/members/search?q=${encodeURIComponent(query)}`);
    if (!results || !results.length) {
      container.innerHTML = `<div class="notice compact"><span>No matching members found.</span></div>`;
      return;
    }
    container.innerHTML = results
      .map((row) => `<button type="button" class="guarantor-result" data-pick-guarantor="${escapeHtml(row.membershipNo)}" data-pick-target="${escapeHtml(target)}"><strong>${escapeHtml(row.fullName || "Member")}</strong><span>${escapeHtml(row.membershipNo)}</span></button>`)
      .join("");
    container.querySelectorAll("[data-pick-guarantor]").forEach((button) => {
      button.addEventListener("click", () => pickMemberGuarantor(button.dataset.pickGuarantor, button.dataset.pickTarget));
    });
  } catch (error) {
    container.innerHTML = `<div class="notice warning"><span>${escapeHtml(error.message)}</span></div>`;
  }
}

function pickMemberGuarantor(membershipNo, target) {
  if (target === "replacement") {
    const field = document.getElementById("memberAddGuarantorNo");
    if (field) {
      field.value = membershipNo;
      const pledge = document.getElementById("memberAddGuarantorAmount");
      if (pledge) pledge.focus();
    }
  } else {
    let placed = false;
    for (const index of [1, 2, 3]) {
      const field = document.getElementById(`memberLoanGuarantor${index}No`);
      if (field && !field.value.trim()) {
        field.value = membershipNo;
        const pledge = document.getElementById(`memberLoanGuarantor${index}Amount`);
        if (pledge) pledge.focus();
        placed = true;
        break;
      }
    }
    if (!placed) {
      const container = document.getElementById("guarantorResults_loan");
      if (container) container.innerHTML = `<div class="notice compact"><span>All 3 guarantor slots are filled. Clear one to add another.</span></div>`;
      return;
    }
  }
  const results = document.getElementById(`guarantorResults_${target}`);
  if (results) results.innerHTML = "";
  const search = document.getElementById(`guarantorSearch_${target}`);
  if (search) search.value = "";
}

async function addMemberLoanGuarantor(event) {
  event.preventDefault();
  state.memberGuarantorAddMessage = "";
  state.memberGuarantorAddError = "";
  if (blockOfflineMemberAction("memberGuarantorAddError")) return;
  const loanId = value("memberAddGuarantorLoanId");
  if (!loanId) {
    state.memberGuarantorAddError = "Select the loan to add a guarantor to.";
    renderShell();
    return;
  }
  try {
    await api(`/member-auth/loans/${encodeURIComponent(loanId)}/guarantors`, {
      method: "POST",
      body: JSON.stringify({
        membershipNo: (value("memberAddGuarantorNo") || "").trim(),
        pledgeAmount: Number(value("memberAddGuarantorAmount") || 0)
      })
    });
    const message = "Guarantor request sent. They will be notified to accept or reject.";
    await refreshMember();
    state.memberGuarantorAddMessage = message;
    renderShell();
  } catch (error) {
    state.memberGuarantorAddError = error.message;
    renderShell();
  }
}

async function postMemberPayment(event) {
  event.preventDefault();
  state.memberPaymentMessage = "";
  state.memberPaymentError = "";
  if (value("memberPaymentRoute") === "treasurer_cash") {
    state.memberPaymentMessage = "Treasurer cash route selected. Please take the cash to the SACCO Treasurer; staff will receipt it under Transactions or Loan servicing.";
    renderShell();
    return;
  }
  if (value("memberPaymentRoute") === "bank_collection") {
    const payload = memberPaymentPayload();
    state.memberPaymentMessage = `Bank collection reference prepared: ${payload.externalReference}. Deposit to the SACCO bank account and present this reference for receipting.`;
    renderShell();
    return;
  }
  if (blockOfflineMemberAction("memberPaymentError")) return;
  try {
    const request = await submitMemberPaymentPayload(memberPaymentPayload());
    state.memberData.paymentRequests = [request, ...(state.memberData.paymentRequests || []).filter((row) => row.id !== request.id)];
    state.memberPaymentMessage = `Payment request sent: ${request.externalReference || request.providerReference || request.id}. ${request.checkoutPrompt || ""}`.trim();
    await refreshMember();
    state.memberPaymentMessage = `Payment request sent: ${request.externalReference || request.providerReference || request.id}. ${request.checkoutPrompt || ""}`.trim();
    renderShell();
  } catch (error) {
    const payload = memberPaymentPayload();
    const request = {
      ...payload,
      id: `local_${Date.now()}`,
      requestedAt: new Date().toISOString(),
      status: "pending_callback"
    };
    state.memberData.paymentRequests = [request, ...(state.memberData.paymentRequests || [])];
    state.memberPaymentMessage = `Payment request sent: ${request.externalReference}. Waiting for callback confirmation.`;
    state.memberPaymentError = `The provider did not confirm immediately: ${error.message}`;
    renderShell();
  }
}

function memberPaymentPayload() {
  const purpose = value("memberPaymentPurpose");
  const route = value("memberPaymentRoute") || "mobile_money";
  const provider = route === "mobile_money"
    ? value("memberPaymentProvider") || document.querySelector('input[name="mmProvider"]:checked')?.value || "default"
    : route;
  return {
    tenantId: state.member?.tenantId,
    memberId: state.member?.id,
    memberIdentifier: state.member?.membershipNo,
    loanId: purpose === "loan_repayment" ? value("memberPaymentLoanId") : "",
    purpose,
    amount: Number(value("memberPaymentAmount")),
    payerPhone: value("memberPaymentPhone"),
    externalReference: value("memberPaymentReference") || value("memberBankReference") || `${route === "bank_collection" ? "BANK" : "MM"}-${Date.now()}`,
    provider,
    providerPayload: {
      source: "member_portal",
      route,
      member: state.member?.membershipNo
    }
  };
}

function memberComplaintPayload() {
  return {
    category: value("memberComplaintCategory"),
    subject: value("memberComplaintSubject"),
    description: value("memberComplaintDescription"),
    priority: value("memberComplaintPriority")
  };
}

async function submitMemberPaymentPayload(payload) {
  return api("/integrations/mobile-money/payment-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updatePaymentRequestStatus(status) {
  const requestId = state.selectedPaymentRequestId || dataRows("mobileMoneyPaymentRequests")[0]?.id;
  if (!requestId) return;
  state.paymentRequestStatusMessage = "";
  state.paymentRequestStatusError = "";
  if (!state.networkOnline) {
    state.paymentRequestStatusError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  try {
    const request = await api(`/integrations/mobile-money/payment-requests/${encodeURIComponent(requestId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reason: state.paymentRequestStatusReason
      })
    });
    state.selectedPaymentRequestId = request.id;
    state.paymentRequestStatusReason = "";
    state.paymentRequestStatusMessage = `Payment request ${request.externalReference || request.id} marked ${labelize(request.status)}.`;
    await refreshAll();
    state.paymentRequestStatusMessage = `Payment request ${request.externalReference || request.id} marked ${labelize(request.status)}.`;
    renderShell();
  } catch (error) {
    state.paymentRequestStatusError = error.message;
    renderShell();
  }
}

async function saveStatementLineCollectionAccount(lineId, clear) {
  if (!lineId) return;
  state.reconAttributionMessage = "";
  state.reconAttributionError = "";
  if (!state.networkOnline) {
    state.reconAttributionError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  const accountId = clear ? "" : (state.selectedReconAttributionAccountId
    || document.querySelector("#reconAttributionAccountSelect")?.value
    || "");
  if (!clear && !accountId) {
    state.reconAttributionError = "Select a collection account first.";
    renderShell();
    return;
  }
  try {
    const line = await api(`/statement-lines/${encodeURIComponent(lineId)}/collection-account`, {
      method: "PATCH",
      body: JSON.stringify({ collectionAccountId: clear ? null : accountId })
    });
    const message = clear
      ? `Cleared collection account for ${line.externalReference || line.id}.`
      : `Attributed ${line.externalReference || line.id} to ${line.collectionAccount || "the selected account"}.`;
    state.selectedReconAttributionAccountId = "";
    await refreshAll();
    state.reconAttributionMessage = message;
    renderShell();
  } catch (error) {
    state.reconAttributionError = error.message;
    renderShell();
  }
}

async function saveCallbackCollectionAccount(callbackId, clear) {
  if (!callbackId) return;
  state.callbackAttributionMessage = "";
  state.callbackAttributionError = "";
  if (!state.networkOnline) {
    state.callbackAttributionError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  const accountId = clear ? "" : (state.selectedCallbackAttributionAccountId
    || document.querySelector("#callbackAttributionAccountSelect")?.value
    || "");
  if (!clear && !accountId) {
    state.callbackAttributionError = "Select a mobile-money account first.";
    renderShell();
    return;
  }
  try {
    const callback = await api(`/integrations/mobile-money/callbacks/${encodeURIComponent(callbackId)}/collection-account`, {
      method: "PATCH",
      body: JSON.stringify({ collectionAccountId: clear ? null : accountId })
    });
    const message = clear
      ? `Cleared collection account for ${callback.externalReference || callback.id}.`
      : `Attributed ${callback.externalReference || callback.id} to ${callback.collectionAccount || "the selected account"}.`;
    state.selectedCallbackAttributionAccountId = "";
    await refreshAll();
    state.callbackAttributionMessage = message;
    renderShell();
  } catch (error) {
    state.callbackAttributionError = error.message;
    renderShell();
  }
}

async function refreshPaymentRequestProviderStatus(requestId) {
  if (!requestId) return;
  state.paymentRequestStatusMessage = "";
  state.paymentRequestStatusError = "";
  if (!state.networkOnline) {
    state.paymentRequestStatusError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  try {
    const request = await api(`/integrations/mobile-money/payment-requests/${encodeURIComponent(requestId)}/provider-status`);
    const message = `Payment request ${request.externalReference || request.id} is ${labelize(request.status)}.`;
    state.paymentRequestStatusMessage = message;
    if (state.auth === "member") {
      await refreshMember();
    } else {
      await refreshAll();
    }
    state.paymentRequestStatusMessage = message;
    renderShell();
  } catch (error) {
    state.paymentRequestStatusError = error.message;
    renderShell();
  }
}

async function submitMemberComplaintPayload(payload) {
  return api("/member-auth/mobile-complaints", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function submitMemberComplaint(event) {
  event.preventDefault();
  state.memberComplaintMessage = "";
  state.memberComplaintError = "";
  if (blockOfflineMemberAction("memberComplaintError")) return;
  const payload = memberComplaintPayload();
  try {
    const complaint = await submitMemberComplaintPayload(payload);
    const visibleComplaint = {
      ...complaint,
      subject: complaint.subject || payload.subject,
      priority: complaint.priority || payload.priority,
      status: complaint.status || "submitted",
      lastMessagePreview: complaint.lastMessagePreview || payload.description,
      updatedAt: complaint.updatedAt || new Date().toISOString()
    };
    state.memberData.chatThreads = [visibleComplaint, ...(state.memberData.chatThreads || []).filter((row) => row.id !== visibleComplaint.id)];
    state.memberComplaintMessage = `Submitted complaint ${complaint.id || payload.subject}.`;
    await refreshMember();
    state.memberData.chatThreads = [visibleComplaint, ...(state.memberData.chatThreads || []).filter((row) => row.id !== visibleComplaint.id)];
    state.memberComplaintMessage = `Submitted complaint ${complaint.id || payload.subject}.`;
    renderShell();
  } catch (error) {
    const complaint = {
      ...payload,
      id: `local-complaint-${Date.now()}`,
      subject: payload.subject,
      priority: payload.priority,
      status: "submitted",
      lastMessagePreview: payload.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.memberData.chatThreads = [complaint, ...(state.memberData.chatThreads || [])];
    state.memberComplaintMessage = `Submitted complaint ${payload.subject}.`;
    state.memberComplaintError = `The SACCO backend did not confirm immediately: ${error.message}`;
    renderShell();
  }
}

function saveMemberDraftFromForm(type) {
  const payload = type === "payment" ? memberPaymentPayload() : memberComplaintPayload();
  const timestamp = formatDateTime(new Date().toISOString());
  const draft = {
    id: `draft-${Date.now()}`,
    type,
    title: type === "payment" ? `${labelize(payload.purpose)} ${money.format(payload.amount || 0)}` : payload.subject || "Complaint draft",
    payload,
    status: "Draft",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state.memberData.drafts = [draft, ...loadMemberDrafts()];
  persistMemberDrafts();
  if (type === "payment") state.memberPaymentMessage = "Payment draft saved on this device.";
  if (type === "complaint") state.memberComplaintMessage = "Complaint draft saved on this device.";
  renderShell();
}

async function syncMemberDraft(draftId) {
  const draft = state.memberData.drafts.find((item) => item.id === draftId);
  if (!draft) return;
  if (blockOfflineMemberAction(draft.type === "payment" ? "memberPaymentError" : "memberComplaintError")) return;
  updateMemberDraft(draftId, { status: "Syncing", updatedAt: formatDateTime(new Date().toISOString()) });
  renderShell();
  try {
    const result = draft.type === "payment"
      ? await submitMemberPaymentPayload(draft.payload)
      : await submitMemberComplaintPayload(draft.payload);
    updateMemberDraft(draftId, {
      status: "Synced",
      serverReference: result.externalReference || result.id || "Synced",
      updatedAt: formatDateTime(new Date().toISOString())
    });
    if (draft.type === "payment") state.memberPaymentMessage = `Draft synced: ${result.externalReference || result.id}.`;
    if (draft.type === "complaint") state.memberComplaintMessage = `Draft synced: ${result.id}.`;
    await refreshMember();
    renderShell();
  } catch (error) {
    updateMemberDraft(draftId, { status: "Failed", error: error.message, updatedAt: formatDateTime(new Date().toISOString()) });
    if (draft.type === "payment") state.memberPaymentError = error.message;
    if (draft.type === "complaint") state.memberComplaintError = error.message;
    renderShell();
  }
}

function discardMemberDraft(draftId) {
  state.memberData.drafts = state.memberData.drafts.filter((draft) => draft.id !== draftId);
  persistMemberDrafts();
  renderShell();
}

async function decideMemberGuarantor(guarantorId, status) {
  state.memberGuarantorMessage = "";
  state.memberGuarantorError = "";
  if (blockOfflineMemberAction("memberGuarantorError")) return;
  try {
    const request = await api(`/member-auth/guarantor-requests/${encodeURIComponent(guarantorId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.memberGuarantorMessage = `Guarantor request ${request.status}.`;
    await refreshMember();
    state.memberGuarantorMessage = `Guarantor request ${request.status}.`;
    renderShell();
  } catch (error) {
    state.memberGuarantorError = error.message;
    renderShell();
  }
}

async function acknowledgeMemberNotification(notificationId) {
  if (!notificationId) return;
  state.memberNotificationMessage = "";
  state.memberNotificationError = "";
  if (blockOfflineMemberAction("memberNotificationError")) return;
  try {
    await api(`/member-auth/notifications/${encodeURIComponent(notificationId)}/acknowledge`, { method: "PATCH" });
    state.memberNotificationMessage = "Notification acknowledged.";
    await refreshMember();
    state.currentView = "notifications";
    state.memberNotificationMessage = "Notification acknowledged.";
    renderShell();
  } catch (error) {
    state.memberNotificationError = error.message;
    renderShell();
  }
}

async function toggleMemberChannel(channel, enabled) {
  if (!channel) return;
  state.memberNotificationMessage = "";
  state.memberNotificationError = "";
  if (blockOfflineMemberAction("memberNotificationError")) return;
  try {
    const prefs = await api("/member-auth/notification-preferences", {
      method: "PUT",
      body: JSON.stringify({ channel, enabled: Boolean(enabled) })
    });
    state.memberData.notificationPreferences = prefs && typeof prefs === "object" ? prefs : state.memberData.notificationPreferences;
    state.memberNotificationMessage = `${labelize(channel)} notifications ${enabled ? "turned on" : "turned off"}.`;
    renderShell();
  } catch (error) {
    state.memberNotificationError = error.message;
    renderShell();
  }
}

async function saveMemberPrivacyConsents(event) {
  event.preventDefault();
  state.memberPrivacyMessage = "";
  state.memberPrivacyError = "";
  const payload = {
    privacyNoticeAccepted: document.querySelector("#privacyNoticeAccepted")?.checked || false,
    smsConsent: document.querySelector("#smsConsent")?.checked || false,
    emailConsent: document.querySelector("#emailConsent")?.checked || false,
    mobileMoneyConsent: document.querySelector("#mobileMoneyConsent")?.checked || false,
    providerDataSharingConsent: document.querySelector("#providerDataSharingConsent")?.checked || false
  };
  try {
    const result = await api("/member-auth/privacy-consents", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    state.member = result.data || state.member;
    state.memberData.dashboard = {
      ...(state.memberData.dashboard || {}),
      member: result.data || state.member
    };
    state.memberPrivacyMessage = "Privacy preferences saved.";
    await refreshMember();
    state.currentView = "profile";
    setModuleTab("profile", "privacy");
  } catch (error) {
    state.memberPrivacyError = error.message || "Could not save privacy preferences.";
  }
  render();
}

async function submitMemberPrivacyRequest(event) {
  event.preventDefault();
  state.memberPrivacyRequestMessage = "";
  state.memberPrivacyRequestError = "";
  if (blockOfflineMemberAction("memberPrivacyRequestError")) return;
  try {
    const request = await api("/member-auth/privacy-requests", {
      method: "POST",
      body: JSON.stringify({
        requestType: value("memberPrivacyRequestType"),
        reason: value("memberPrivacyRequestReason")
      })
    });
    state.memberPrivacyRequestMessage = `Submitted ${labelize(request.requestType)} request.`;
    await refreshMember();
    state.currentView = "profile";
    setModuleTab("profile", "privacy");
    state.memberPrivacyRequestMessage = `Submitted ${labelize(request.requestType)} request.`;
  } catch (error) {
    state.memberPrivacyRequestError = error.message || "Could not submit data protection request.";
  }
  render();
}

