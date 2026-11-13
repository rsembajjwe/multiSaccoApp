// SACCO finance action handlers for Tereka Online.
// Covers financial transactions, receipts, reversals, loans, guarantors and repayments.

function stValue(id) {
  const el = document.querySelector(id);
  return el ? el.value : "";
}

function parseSavingsImportCsv(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("Paste a CSV header and at least one savings row.");
  const headers = ["membershipNo", "amount", "postingDate", "reference", "channel", "narration"];
  const actual = lines[0].split(",").map((value) => value.trim());
  if (actual.join(",") !== headers.join(",")) throw new Error(`CSV headers must be: ${headers.join(",")}`);
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

async function downloadSavingsImportTemplate() {
  try {
    const template = await api(`/financial-transactions/savings/import-template?tenantId=${encodeURIComponent(state.user?.tenantId || "")}`);
    downloadClientFile(template.csv ? template.filename : "savings-import-template.csv", template.csv || "", "text/csv;charset=utf-8");
  } catch (error) {
    state.savingsImportError = error.message || "Could not download savings template.";
    renderShell();
  }
}

async function importSavingsDeposits(dryRun) {
  state.savingsImportMessage = "";
  state.savingsImportError = "";
  try {
    const rows = parseSavingsImportCsv(state.savingsImportCsv);
    const result = await api("/financial-transactions/savings/import", {
      method: "POST",
      body: JSON.stringify({ tenantId: state.user?.tenantId || "", dryRun, rows })
    });
    state.savingsImportResult = result;
    state.savingsImportMessage = dryRun ? "Savings file validated. Review errors before importing." : `${result.createdCount || 0} savings deposit(s) imported into the approval queue.`;
    if (!dryRun) state.savingsImportCsv = "";
  } catch (error) {
    state.savingsImportError = error.message || "Could not process savings import.";
  }
  renderShell();
}

async function createSavingsTransfer() {
  if (!hasPermission("savings-transfer:create") && !hasPermission("savings-transfer:manage")) {
    state.savingsTransferError = "Savings transfer creation permission is required.";
    renderShell();
    return;
  }
  const destinationType = stValue("#stDestType");
  const payload = {
    sourceMemberId: stValue("#stSource"),
    amount: Number(stValue("#stAmount") || 0),
    destinationType,
    destinationFundCode: destinationType === "own_fund" ? stValue("#stFund") : "",
    destinationMemberId: destinationType === "another_member" ? stValue("#stDestMember") : "",
    loanId: destinationType === "loan_repayment" ? stValue("#stLoan") : "",
    authorizationReference: stValue("#stAuth"),
    reason: stValue("#stReason")
  };
  state.savingsTransferMessage = "";
  state.savingsTransferError = "";
  if (!payload.sourceMemberId || !(payload.amount > 0)) {
    state.savingsTransferError = "A member and a positive amount are required.";
    renderShell();
    return;
  }
  try {
    await api("/savings-transfers", { method: "POST", body: JSON.stringify(payload) });
    await refreshAll();
    state.currentView = "savings-transfers";
    state.savingsTransferMessage = "Transfer created and awaiting approval by a different user.";
    renderShell();
  } catch (error) {
    state.savingsTransferError = error.message;
    renderShell();
  }
}

async function createGroupDeduction() {
  if (!hasPermission("savings-transfer:create") && !hasPermission("savings-transfer:manage")) {
    state.savingsTransferError = "Savings transfer creation permission is required.";
    renderShell();
    return;
  }
  const select = document.querySelector("#gdMembers");
  const memberIds = select ? Array.from(select.selectedOptions).map((option) => option.value) : [];
  const destinationType = stValue("#gdDestType");
  state.savingsTransferMessage = "";
  state.savingsTransferError = "";
  if (!memberIds.length || !(Number(stValue("#gdAmount")) > 0)) {
    state.savingsTransferError = "Select at least one member and a positive amount.";
    renderShell();
    return;
  }
  try {
    const result = await api("/savings-transfers/group-deduction", {
      method: "POST",
      body: JSON.stringify({
        memberIds,
        amount: Number(stValue("#gdAmount")),
        destinationType,
        destinationFundCode: destinationType === "own_fund" ? stValue("#gdFund") : "",
        resolutionReference: stValue("#gdResolution"),
        reason: stValue("#gdReason")
      })
    });
    await refreshAll();
    state.currentView = "savings-transfers";
    state.savingsTransferMessage = `Group deduction created for ${result.created || memberIds.length} member(s); awaiting approval.`;
    renderShell();
  } catch (error) {
    state.savingsTransferError = error.message;
    renderShell();
  }
}

async function decideSavingsTransfer(id, decision) {
  if (!id) return;
  if (!hasPermission("savings-transfer:approve") && !hasPermission("savings-transfer:manage")) {
    state.savingsTransferError = "Savings transfer approval permission is required.";
    renderShell();
    return;
  }
  if (decision === "posted" && !window.confirm("Approve and post this transfer? This moves money and cannot be undone (reverse if needed).")) return;
  state.savingsTransferMessage = "";
  state.savingsTransferError = "";
  try {
    await api(`/savings-transfers/${encodeURIComponent(id)}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ status: decision })
    });
    await refreshAll();
    state.currentView = "savings-transfers";
    state.savingsTransferMessage = decision === "posted" ? "Transfer approved and posted." : "Transfer rejected.";
    renderShell();
  } catch (error) {
    state.savingsTransferError = error.message;
    renderShell();
  }
}

async function reverseSavingsTransfer(id) {
  if (!id) return;
  if (!hasPermission("savings-transfer:approve") && !hasPermission("savings-transfer:manage")) {
    state.savingsTransferError = "Savings transfer reversal permission is required.";
    renderShell();
    return;
  }
  if (!window.confirm("Reverse this posted transfer? It mirrors the original movement back.")) return;
  state.savingsTransferMessage = "";
  state.savingsTransferError = "";
  try {
    await api(`/savings-transfers/${encodeURIComponent(id)}/reverse`, { method: "POST", body: JSON.stringify({}) });
    await refreshAll();
    state.currentView = "savings-transfers";
    state.savingsTransferMessage = "Transfer reversed.";
    renderShell();
  } catch (error) {
    state.savingsTransferError = error.message;
    renderShell();
  }
}

async function saveFundType(fundTypeId) {
  if (!hasPermission("fund-types:manage")) {
    state.fundTypeError = "Fund type management permission is required.";
    renderShell();
    return;
  }
  const payload = {
    name: (document.getElementById("ftName")?.value || "").trim(),
    code: (document.getElementById("ftCode")?.value || "").trim(),
    basis: document.getElementById("ftBasis")?.value || "welfare",
    active: (document.getElementById("ftActive")?.value || "true") === "true",
    description: (document.getElementById("ftDescription")?.value || "").trim()
  };
  state.fundTypeMessage = "";
  state.fundTypeError = "";
  if (!payload.name) { state.fundTypeError = "Enter a fund name."; renderShell(); return; }
  if (!state.networkOnline) { state.fundTypeError = t("offlineActionBlocked"); renderShell(); return; }
  try {
    if (fundTypeId) {
      await api(`/fund-types/${encodeURIComponent(fundTypeId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("/fund-types", { method: "POST", body: JSON.stringify(payload) });
    }
    state.selectedFundTypeId = "";
    await refreshAll();
    state.fundTypeMessage = fundTypeId ? "Fund updated." : "Fund added.";
  } catch (error) {
    state.fundTypeError = error.message || "Unable to save the fund.";
  }
  renderShell();
}

async function saveFundingSource(sourceId) {
  if (!hasPermission("finance-source:manage")) {
    state.fundingSourceError = "Funding source management permission is required.";
    renderShell();
    return;
  }
  const payload = {
    sourceType: document.getElementById("fsType")?.value || "",
    provider: (document.getElementById("fsProvider")?.value || "").trim(),
    amount: Number(document.getElementById("fsAmount")?.value || 0),
    currencyCode: (document.getElementById("fsCurrency")?.value || "UGX").trim(),
    reference: (document.getElementById("fsReference")?.value || "").trim(),
    dateReceived: document.getElementById("fsDate")?.value || null,
    status: document.getElementById("fsStatus")?.value || "active",
    notes: (document.getElementById("fsNotes")?.value || "").trim()
  };
  state.fundingSourceMessage = "";
  state.fundingSourceError = "";
  if (!payload.sourceType) { state.fundingSourceError = "Select a source type."; renderShell(); return; }
  if (!(payload.amount > 0)) { state.fundingSourceError = "Enter an amount greater than zero."; renderShell(); return; }
  if (!state.networkOnline) { state.fundingSourceError = t("offlineActionBlocked"); renderShell(); return; }
  try {
    if (sourceId) {
      await api(`/funding-sources/${encodeURIComponent(sourceId)}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("/funding-sources", { method: "POST", body: JSON.stringify(payload) });
    }
    state.selectedFundingSourceId = "";
    await refreshAll();
    state.fundingSourceMessage = sourceId ? "Funding source updated." : "Funding source added.";
  } catch (error) {
    state.fundingSourceError = error.message || "Unable to save the funding source.";
  }
  renderShell();
}

async function createTransactionFromForm(event) {
  event.preventDefault();
  state.transactionFormMessage = "";
  state.transactionFormError = "";
  if (!hasPermission("transactions:create")) {
    state.transactionFormError = "Transaction creation permission is required.";
    renderShell();
    return;
  }
  const channel = value("newTransactionChannel");
  const provider = channel === "mobile_money" ? value("newTransactionProvider") : "";
  try {
    const transaction = await api("/financial-transactions", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newTransactionTenantId"),
        branchId: value("newTransactionBranchId"),
        memberId: value("newTransactionMemberId"),
        type: value("newTransactionType"),
        channel,
        provider,
        paymentProvider: provider,
        amount: Number(value("newTransactionAmount")),
        narration: value("newTransactionNarration")
      })
    });
    state.transactionFormMessage = normal(transaction.status) === "posted"
      ? `Cash transaction ${transaction.reference} posted. Receipt is ready.`
      : `Submitted transaction ${transaction.reference} for verification.`;
    await refreshAll();
  } catch (error) {
    state.transactionFormError = error.message;
    renderShell();
  }
}

function openTransactionDetail(transactionId) {
  state.selectedTransactionId = transactionId;
  state.moduleTabs.transactions = "detail";
  state.selectedTransactionReceipt = null;
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  renderShell();
}

async function loadPlatformPaymentApprovals(pageNumber = 0) {
  const page = Math.max(0, Number(pageNumber || 0));
  const params = new URLSearchParams({ page: String(page), size: "50" });
  if (state.platformPaymentApprovalSearch) params.set("search", state.platformPaymentApprovalSearch);
  if (state.platformPaymentApprovalChannel) params.set("channel", state.platformPaymentApprovalChannel);
  state.platformPaymentApprovalPage = page;
  state.loading = true;
  state.platformPaymentApprovalError = "";
  renderShell();
  try {
    const [queue, summaryData, processed] = await Promise.all([
      api(`/financial-transactions/approval-queue?${params.toString()}`),
      api("/financial-transactions/approval-summary"),
      api("/financial-transactions?page=0&size=100&sort=updatedAt&direction=desc")
    ]);
    state.data.platformPaymentApprovalQueue = queue;
    state.pageMeta.platformPaymentApprovalQueue = pageEnvelope(queue);
    state.data.platformPaymentApprovalSummary = summaryData;
    state.data.platformPaymentApprovalProcessed = (Array.isArray(processed) ? processed : []).filter((item) => ["posted", "rejected"].includes(normal(item.status)));
    state.lastSync = new Date().toISOString();
  } catch (error) {
    state.platformPaymentApprovalError = friendlyUserError(error, true);
  } finally {
    state.loading = false;
    renderShell();
  }
}

async function decidePlatformPayment(transactionId, status) {
  if (!transactionId || !["posted", "rejected"].includes(status)) return;
  if (!hasPermission("transactions:approve")) {
    state.platformPaymentApprovalError = "Transaction approval permission is required.";
    renderShell();
    return;
  }
  const verb = status === "posted" ? "approval" : "rejection";
  const reason = window.prompt(`Enter the reason for this ${verb}. It will be retained in the audit record.`, "")?.trim() || "";
  if (!reason) return;
  state.platformPaymentApprovalMessage = "";
  state.platformPaymentApprovalError = "";
  try {
    const transaction = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason })
    });
    state.platformPaymentApprovalMessage = `Payment ${transaction.reference || transaction.id} ${status === "posted" ? "approved and posted" : "rejected"}.`;
    state.selectedPaymentApprovalId = "";
    await loadPlatformPaymentApprovals(state.platformPaymentApprovalPage);
  } catch (error) {
    state.platformPaymentApprovalError = friendlyUserError(error, true);
    renderShell();
  }
}

function openSubscriptionDetail(subscriptionId) {
  state.selectedSubscriptionId = subscriptionId;
  state.platformTransactionSubscriptionId = subscriptionId;
  state.moduleTabs.subscriptions = "list";
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  renderShell();
}

async function recordPlatformSubscriptionPayment() {
  if (!hasPermission("subscriptions:manage") && roleKind() !== "super" && roleKind() !== "billing") {
    state.platformTransactionError = "Subscription management permission is required to record platform-SACCO payments.";
    renderShell();
    return;
  }
  const searchedSubscription = typeof resolvePlatformTransactionSearch === "function"
    ? resolvePlatformTransactionSearch(value("platformTransactionSaccoSearch"))
    : null;
  if (searchedSubscription) {
    state.selectedSubscriptionId = searchedSubscription.id;
    state.platformTransactionSubscriptionId = searchedSubscription.id;
  }
  const subscriptionId = searchedSubscription?.id || value("selectedSubscriptionId") || state.selectedSubscriptionId || value("platformTransactionSubscriptionId");
  if (!subscriptionId) return;
  const subscription = dataRows("subscriptions").find((item) => item.id === subscriptionId);
  if (!subscription) return;
  state.platformTransactionMessage = "";
  state.platformTransactionError = "";
  try {
    const amount = Number(value("subscriptionPaymentAmount") || 0);
    const channel = value("subscriptionPaymentChannel") || "manual";
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a payment amount greater than zero.");
    if (channel === "mobile_money") {
      const provider = value("subscriptionPaymentProvider");
      const payerPhone = normalizeUgandanMobileMoneyPhone(value("subscriptionPaymentPhone"));
      if (!provider) throw new Error("Choose MTN MoMo or Airtel Money.");
      if (!payerPhone) throw new Error("Enter a valid Ugandan mobile number, for example 0772123456.");
      const networkError = ugandanMobileMoneyNetworkError(payerPhone, provider);
      if (networkError) throw new Error(networkError);
      const externalReference = value("subscriptionPaymentReference")
        || `SUB-${subscription.invoice || subscription.id}-${Date.now()}`;
      const request = await api("/integrations/mobile-money/subscription-payment-requests/staff", {
        method: "POST",
        body: JSON.stringify({
          tenantId: subscription.tenantId,
          amount,
          payerPhone,
          externalReference,
          provider,
          providerPayload: {
            source: "platform_subscription_transaction",
            provider,
            initiatedBy: state.user?.email || state.user?.id || "",
            subscriptionId
          }
        })
      });
      state.selectedSubscriptionId = subscriptionId;
      state.platformTransactionSubscriptionId = subscriptionId;
      state.platformTransactionMessage = `Payment prompt initialized for ${payerPhone}${request.externalReference ? `: ${request.externalReference}` : ""}.`;
      await refreshAll();
      renderShell();
      return;
    }
    const payload = {
      amount,
      channel,
      paymentMode: value("subscriptionPaymentMode") || "group",
      memberSlots: value("subscriptionPaymentMemberSlots") ? Number(value("subscriptionPaymentMemberSlots")) : null,
      externalReference: value("subscriptionPaymentReference") || undefined
    };
    const result = await api(`/subscriptions/${encodeURIComponent(subscriptionId)}/payments`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const payment = result.payment || {};
    const updatedSubscription = result.subscription || {};
    state.selectedSubscriptionId = updatedSubscription.id || subscriptionId;
    state.platformTransactionSubscriptionId = state.selectedSubscriptionId;
    state.platformTransactionMessage = `Recorded platform-SACCO payment ${payment.externalReference || ""}`.trim() + ".";
    await refreshAll();
    renderShell();
  } catch (error) {
    state.platformTransactionError = error.message;
    renderShell();
  }
}

function normalizeUgandanMobileMoneyPhone(rawPhone) {
  let phone = String(rawPhone || "").replace(/[\s()-]/g, "");
  if (/^0\d{9}$/.test(phone)) phone = `+256${phone.slice(1)}`;
  else if (/^256\d{9}$/.test(phone)) phone = `+${phone}`;
  return /^\+256\d{9}$/.test(phone) ? phone : "";
}

function ugandanMobileMoneyNetworkError(phone, provider) {
  const prefix = phone.slice(4, 6);
  if (provider === "mtn" && ["70", "74", "75"].includes(prefix)) {
    return "This number appears to be Airtel. Select Airtel or enter an MTN number.";
  }
  if (provider === "airtel" && ["76", "77", "78"].includes(prefix)) {
    return "This number appears to be MTN. Select MTN or enter an Airtel number.";
  }
  return "";
}

function syncSubscriptionPaymentMode() {
  const mode = value("subscriptionPaymentMode");
  const slotsInput = document.getElementById("subscriptionPaymentMemberSlots");
  const amountInput = document.getElementById("subscriptionPaymentAmount");
  const modeSelect = document.querySelector("[data-subscription-payment-mode]");
  if (!(slotsInput instanceof HTMLInputElement) || !(amountInput instanceof HTMLInputElement) || !(modeSelect instanceof HTMLSelectElement)) return;
  const perMember = mode === "per_member";
  slotsInput.disabled = !perMember;
  if (perMember) {
    const unitPrice = Number(modeSelect.dataset.unitPrice || 0);
    amountInput.value = String(unitPrice * Math.max(1, Number(slotsInput.value || 1)));
  }
}

async function runSubscriptionAction(action) {
  if (action === "renew") return recordPlatformSubscriptionPayment();
  state.selectedSubscriptionMessage = "Use SACCO Registration to update SACCO operating access.";
  renderShell();
}

async function runTransactionAction(action) {
  const transactionId = value("selectedTransactionId") || state.selectedTransactionId;
  if (!transactionId) return;
  if (action !== "receipt" && !hasPermission("transactions:approve")) {
    state.selectedTransactionError = "Transaction approval permission is required for this action.";
    renderShell();
    return;
  }
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  state.selectedTransactionReceipt = action === "receipt" ? state.selectedTransactionReceipt : null;
  try {
    if (action === "receipt") {
      state.selectedTransactionReceipt = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/receipt`);
      state.selectedTransactionMessage = "Receipt loaded.";
    } else if (action === "reverse") {
      const reversal = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/reversal`, {
        method: "POST",
        body: JSON.stringify({ reason: value("transactionDecisionReason") || "Reversal requested from Tereka Online" })
      });
      state.selectedTransactionId = reversal.id;
      state.selectedTransactionMessage = `Reversal created: ${reversal.reference}.`;
      await refreshAll();
    } else {
      const status = action === "post" ? "posted" : "rejected";
      const transaction = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("transactionDecisionReason") || "Reviewed in Tereka Online" })
      });
      state.selectedTransactionId = transaction.id;
      state.selectedTransactionMessage = `Transaction ${transaction.reference} ${status}.`;
      await refreshAll();
    }
    renderShell();
  } catch (error) {
    state.selectedTransactionError = error.message;
    renderShell();
  }
}

async function createLoanFromForm(event) {
  event.preventDefault();
  state.loanFormMessage = "";
  state.loanFormError = "";
  if (!hasPermission("loans:create")) {
    state.loanFormError = "Loan creation permission is required.";
    renderShell();
    return;
  }
  const applicationSource = value("newLoanApplicationSource") || "staff_captured_signed_form";
  const signedFormReference = value("newLoanSignedFormReference");
  const signedFormReceivedAt = value("newLoanSignedFormReceivedAt");
  const fileInput = document.getElementById("newLoanSignedFormFile");
  const signedFormFile = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] || null : null;
  if (signedFormFile && signedFormFile.size > 1024 * 1024) {
    state.loanFormError = "Signed loan form files must be 1 MB or smaller.";
    renderShell();
    return;
  }
  if (signedFormFile && !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(signedFormFile.type)) {
    state.loanFormError = "Attach a signed loan form as PDF, JPG, PNG or WEBP.";
    renderShell();
    return;
  }
  if (applicationSource === "staff_captured_signed_form" && !signedFormReference && !signedFormFile) {
    state.loanFormError = "Enter a signed form reference or attach the signed loan form before submission.";
    renderShell();
    return;
  }
  try {
    const memberId = value("newLoanMemberId");
    const loan = await api("/loans", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newLoanTenantId"),
        memberId,
        product: value("newLoanProduct"),
        amount: Number(value("newLoanAmount")),
        repaymentMonths: Number(value("newLoanRepaymentMonths")),
        purpose: value("newLoanPurpose"),
        applicationSource,
        signedFormReference,
        signedFormReceivedAt,
        signedFormFileName: signedFormFile?.name || ""
      })
    });
    if (signedFormFile) {
      const form = new FormData();
      form.append("documentType", "loan_application_form");
      form.append("verificationStatus", "pending_verification");
      form.append("file", signedFormFile);
      await api(`/members/${encodeURIComponent(memberId)}/documents/upload`, { method: "POST", body: form });
    } else if (signedFormReference) {
      await api(`/members/${encodeURIComponent(memberId)}/documents`, {
        method: "POST",
        body: JSON.stringify({
          documentType: "loan_application_form",
          storageKey: signedFormReference,
          verificationStatus: "pending_verification"
        })
      });
    }
    state.loanFormMessage = `Submitted loan ${loan.applicationNo || loan.id} for review.`;
    state.selectedLoanId = loan.id;
    await refreshAll();
    state.selectedLoanId = loan.id;
    state.loanFormMessage = `Submitted loan ${loan.applicationNo || loan.id} for review.`;
    await openLoanDetail(loan.id, false);
  } catch (error) {
    state.loanFormError = error.message;
    renderShell();
  }
}

async function openLoanDetail(loanId, shouldRender = true) {
  state.selectedLoanId = loanId;
  state.moduleTabs.loans = "detail";
  state.selectedLoanGuarantors = [];
  state.selectedLoanRepayments = [];
  state.selectedLoanSchedule = [];
  state.selectedLoanCover = null;
  state.selectedLoanAppraisals = [];
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (shouldRender) renderShell();
  try {
    const [guarantors, repayments, schedule, cover, appraisals] = await Promise.all([
      optionalApi(`/loans/${encodeURIComponent(loanId)}/guarantors`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/repayments`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/schedule`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/cover`, null),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/appraisals`, [])
    ]);
    state.selectedLoanGuarantors = guarantors || [];
    state.selectedLoanRepayments = repayments || [];
    state.selectedLoanSchedule = schedule || [];
    state.selectedLoanCover = cover || null;
    state.selectedLoanAppraisals = appraisals || [];
  } catch (error) {
    state.selectedLoanError = error.message;
  }
  renderShell();
}

async function recordLoanAppraisal(event) {
  event.preventDefault();
  const loanId = value("appraisalLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (!hasPermission("loans:create")) {
    state.selectedLoanError = "Loan creation permission is required to record appraisals.";
    renderShell();
    return;
  }
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/appraisals`, {
      method: "POST",
      body: JSON.stringify({
        recommendation: value("appraisalRecommendation"),
        recommendedAmount: value("appraisalAmount") ? Number(value("appraisalAmount")) : null,
        recommendedTermMonths: value("appraisalTerm") ? Number(value("appraisalTerm")) : null,
        notes: value("appraisalNotes") || ""
      })
    });
    const message = "Credit appraisal recorded for the committee.";
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function addLoanGuarantor(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (!hasPermission("loans:create")) {
    state.selectedLoanError = "Loan creation permission is required to add guarantors.";
    renderShell();
    return;
  }
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/guarantors`, {
      method: "POST",
      body: JSON.stringify({
        memberId: value("newGuarantorMemberId")
      })
    });
    state.selectedLoanMessage = "Guarantor request added.";
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = "Guarantor request added.";
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function markLoanGuarantorSigned(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  const guarantorId = value("signedGuarantorRequestId");
  if (!loanId || !guarantorId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (!hasPermission("loans:create")) {
    state.selectedLoanError = "Loan creation permission is required to confirm guarantor signatures.";
    renderShell();
    return;
  }
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/guarantors/${encodeURIComponent(guarantorId)}/signature`, {
      method: "PATCH",
      body: JSON.stringify({
        signatureReference: value("guarantorSignatureReference")
      })
    });
    const message = "Guarantor physical signature confirmed.";
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function runLoanAction(action) {
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (!hasPermission("loans:approve")) {
    state.selectedLoanError = "Loan approval permission is required for this action.";
    renderShell();
    return;
  }
  try {
    if (action === "disburse") {
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/disburse`, { method: "POST" });
      state.selectedLoanMessage = normal(loan.stage) === "awaiting disbursement approval"
        ? `Disbursement initiated for loan ${loan.applicationNo || loan.id}. A second, different officer must confirm before funds move.`
        : `Loan ${loan.applicationNo || loan.id} disbursed.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reason: value("loanDecisionReason") || "Reviewed in Tereka Online",
          resolutionReference: value("loanResolutionReference") || "",
          paperApprovalReference: value("loanResolutionReference") || "",
          paperApprovalApprovers: value("loanPaperApprovers") || "",
          paperApprovedByChairperson: checked("loanPaperChairperson"),
          paperApprovedBySecretary: checked("loanPaperSecretary"),
          paperApprovedByTreasurer: checked("loanPaperTreasurer"),
          paperApprovedByCommittee: checked("loanPaperCommittee")
        })
      });
      state.selectedLoanMessage = normal(loan.stage) === "awaiting second approval"
        ? `First approval recorded for loan ${loan.applicationNo || loan.id}. A second, different approver must confirm.`
        : status === "approved"
          ? `Paper approval recorded for loan ${loan.applicationNo || loan.id}.`
          : `Loan ${loan.applicationNo || loan.id} ${status}.`;
    }
    const message = state.selectedLoanMessage;
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

function checked(id) {
  const field = document.getElementById(id);
  return field instanceof HTMLInputElement && field.checked;
}

async function recordLoanRepayment(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (!hasPermission("transactions:create") && !hasPermission("transactions:approve")) {
    state.selectedLoanError = "Transaction permission is required to record loan repayments.";
    renderShell();
    return;
  }
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/repayments`, {
      method: "POST",
      body: JSON.stringify({
        amount: Number(value("loanRepaymentAmount")),
        channel: value("loanRepaymentChannel"),
        narration: value("loanRepaymentNarration") || "Loan repayment"
      })
    });
    state.selectedLoanMessage = "Loan repayment recorded.";
    const message = state.selectedLoanMessage;
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}
