// SACCO finance action handlers for Tereka Online.
// Covers financial transactions, receipts, reversals, loans, guarantors and repayments.

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
    state.transactionFormMessage = `Submitted transaction ${transaction.reference} for approval.`;
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
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (shouldRender) renderShell();
  try {
    const [guarantors, repayments, schedule] = await Promise.all([
      optionalApi(`/loans/${encodeURIComponent(loanId)}/guarantors`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/repayments`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/schedule`, [])
    ]);
    state.selectedLoanGuarantors = guarantors || [];
    state.selectedLoanRepayments = repayments || [];
    state.selectedLoanSchedule = schedule || [];
  } catch (error) {
    state.selectedLoanError = error.message;
  }
  renderShell();
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
      state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} disbursed.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("loanDecisionReason") || "Reviewed in Tereka Online" })
      });
      state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} ${status}.`;
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
        reference: value("loanRepaymentReference") || `LR-${Date.now()}`,
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

