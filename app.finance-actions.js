// SACCO finance action handlers for Tereka Online.
// Covers financial transactions, receipts, reversals, loans, guarantors and repayments.

function stValue(id) {
  const el = document.querySelector(id);
  return el ? el.value : "";
}

async function createSavingsTransfer() {
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
  const payload = {
    name: (document.getElementById("ftName")?.value || "").trim(),
    code: (document.getElementById("ftCode")?.value || "").trim().toLowerCase(),
    basis: document.getElementById("ftBasis")?.value || "welfare",
    active: (document.getElementById("ftActive")?.value || "true") === "true",
    description: (document.getElementById("ftDescription")?.value || "").trim()
  };
  state.fundTypeMessage = "";
  state.fundTypeError = "";
  if (!payload.name) { state.fundTypeError = "Enter a fund name."; renderShell(); return; }
  if (!fundTypeId && !payload.code) { state.fundTypeError = "Enter a fund code."; renderShell(); return; }
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
  try {
    const transaction = await api("/financial-transactions", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newTransactionTenantId"),
        branchId: value("newTransactionBranchId"),
        memberId: value("newTransactionMemberId"),
        type: value("newTransactionType"),
        channel: value("newTransactionChannel"),
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

async function runTransactionAction(action) {
  const transactionId = value("selectedTransactionId") || state.selectedTransactionId;
  if (!transactionId) return;
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
  try {
    const loan = await api("/loans", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newLoanTenantId"),
        memberId: value("newLoanMemberId"),
        product: value("newLoanProduct"),
        amount: Number(value("newLoanAmount")),
        repaymentMonths: Number(value("newLoanRepaymentMonths")),
        purpose: value("newLoanPurpose")
      })
    });
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
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/guarantors`, {
      method: "POST",
      body: JSON.stringify({
        memberId: value("newGuarantorMemberId"),
        guaranteedAmount: Number(value("newGuarantorAmount"))
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

async function runLoanAction(action) {
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
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
          resolutionReference: value("loanResolutionReference") || ""
        })
      });
      state.selectedLoanMessage = normal(loan.stage) === "awaiting second approval"
        ? `First approval recorded for loan ${loan.applicationNo || loan.id}. A second, different approver must confirm.`
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

async function recordLoanRepayment(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
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
