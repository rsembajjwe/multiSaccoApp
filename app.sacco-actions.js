// SACCO operating action handlers for Tereka Online.
// Covers branches, products, accounts, welfare claims, expenses, assets and governance records.

async function createFinancialProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.productFormMessage = "";
  state.productFormError = "";
  try {
    const product = await api("/financial-products", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "product", "tenantId"),
        productType: scopedValue(form, "product", "productType"),
        code: scopedValue(form, "product", "code"),
        name: scopedValue(form, "product", "name"),
        contributionAmount: Number(scopedValue(form, "product", "contributionAmount")),
        minimumBalance: Number(scopedValue(form, "product", "minimumBalance")),
        interestRate: Number(scopedValue(form, "product", "interestRate"))
      })
    });
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    await refreshAll();
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    renderShell();
  } catch (error) {
    state.productFormError = error.message;
    renderShell();
  }
}

async function createBranchFromForm(event) {
  event.preventDefault();
  state.branchFormMessage = "";
  state.branchFormError = "";
  try {
    const branch = await api("/branches", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newBranchTenantId"),
        code: value("newBranchCode"),
        name: value("newBranchName"),
        address: value("newBranchAddress"),
        status: value("newBranchStatus")
      })
    });
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    await refreshAll();
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    renderShell();
  } catch (error) {
    state.branchFormError = error.message;
    renderShell();
  }
}

async function openFinancialAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.accountFormMessage = "";
  state.accountFormError = "";
  try {
    const account = await api("/financial-accounts", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "account", "tenantId"),
        memberId: scopedValue(form, "account", "memberId"),
        productId: scopedValue(form, "account", "productId"),
        accountType: scopedValue(form, "account", "accountType"),
        accountNo: scopedValue(form, "account", "accountNo")
      })
    });
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    await refreshAll();
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    renderShell();
  } catch (error) {
    state.accountFormError = error.message;
    renderShell();
  }
}

async function submitWelfareClaim(event) {
  event.preventDefault();
  state.welfareClaimMessage = "";
  state.welfareClaimError = "";
  try {
    const claim = await api("/welfare-claims", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newWelfareTenantId"),
        memberId: value("newWelfareMemberId"),
        claimType: value("newWelfareClaimType"),
        amount: Number(value("newWelfareAmount")),
        reference: value("newWelfareReference"),
        description: value("newWelfareDescription")
      })
    });
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    state.selectedWelfareClaimId = claim.id;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    renderShell();
  } catch (error) {
    state.welfareClaimError = error.message;
    renderShell();
  }
}

function openWelfareClaimDetail(claimId) {
  state.selectedWelfareClaimId = claimId;
  state.moduleTabs.welfare = "detail";
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  renderShell();
}

async function runWelfareClaimAction(action) {
  const claimId = value("selectedWelfareClaimId") || state.selectedWelfareClaimId;
  if (!claimId) return;
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  try {
    let claim;
    if (action === "pay") {
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/payment`, {
        method: "POST",
        body: JSON.stringify({ channel: value("welfarePaymentChannel") || "cash" })
      });
      state.selectedWelfareClaimMessage = `Paid welfare claim ${claim.reference}.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("welfareClaimReason") || "Reviewed in Tereka Online" })
      });
      state.selectedWelfareClaimMessage = `Welfare claim ${claim.reference} ${status}.`;
    }
    const message = state.selectedWelfareClaimMessage;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.selectedWelfareClaimMessage = message;
    renderShell();
  } catch (error) {
    state.selectedWelfareClaimError = error.message;
    renderShell();
  }
}

function scopedValue(form, group, field) {
  return form.querySelector(`[data-${group}-field='${field}']`)?.value || "";
}

async function postExpense(event) {
  event.preventDefault();
  state.expenseFormMessage = "";
  state.expenseFormError = "";
  try {
    const expense = await api("/expenses", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newExpenseTenantId"),
        accountCode: value("newExpenseAccountCode"),
        amount: Number(value("newExpenseAmount")),
        channel: value("newExpenseChannel"),
        reference: value("newExpenseReference"),
        description: value("newExpenseDescription"),
        expenseDate: value("newExpenseDate")
      })
    });
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    await refreshAll();
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    renderShell();
  } catch (error) {
    state.expenseFormError = error.message;
    renderShell();
  }
}

async function registerAsset(event) {
  event.preventDefault();
  state.assetFormMessage = "";
  state.assetFormError = "";
  try {
    const asset = await api("/assets", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newAssetTenantId"),
        name: value("newAssetName"),
        category: value("newAssetCategory"),
        assetAccountCode: value("newAssetAccountCode"),
        cost: Number(value("newAssetCost")),
        salvageValue: Number(value("newAssetSalvageValue")),
        usefulLifeMonths: Number(value("newAssetLifeMonths")),
        purchaseDate: value("newAssetPurchaseDate"),
        depreciationStartDate: value("newAssetPurchaseDate"),
        channel: value("newAssetChannel"),
        reference: value("newAssetReference"),
        location: value("newAssetLocation")
      })
    });
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    await refreshAll();
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    renderShell();
  } catch (error) {
    state.assetFormError = error.message;
    renderShell();
  }
}

async function createGovernanceMeeting(event) {
  event.preventDefault();
  state.governanceMeetingMessage = "";
  state.governanceMeetingError = "";
  try {
    const meeting = await api("/governance-meetings", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMeetingTenantId"),
        title: value("newMeetingTitle"),
        meetingType: value("newMeetingType"),
        scheduledAt: new Date(value("newMeetingScheduledAt")).toISOString(),
        chairUserId: value("newMeetingChairUserId"),
        status: value("newMeetingStatus"),
        minutes: value("newMeetingMinutes")
      })
    });
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    state.selectedMeetingId = meeting.id;
    await refreshAll();
    state.selectedMeetingId = meeting.id;
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    renderShell();
  } catch (error) {
    state.governanceMeetingError = error.message;
    renderShell();
  }
}

function openGovernanceMeetingDetail(meetingId) {
  state.selectedMeetingId = meetingId;
  state.moduleTabs.governance = "detail";
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  renderShell();
}

async function createGovernanceResolution(event) {
  event.preventDefault();
  const meetingId = value("selectedMeetingId") || state.selectedMeetingId;
  if (!meetingId) return;
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  try {
    const resolution = await api(`/governance-meetings/${encodeURIComponent(meetingId)}/resolutions`, {
      method: "POST",
      body: JSON.stringify({
        title: value("newResolutionTitle"),
        decision: value("newResolutionDecision"),
        ownerUserId: value("newResolutionOwnerUserId"),
        dueDate: value("newResolutionDueDate") || null,
        status: value("newResolutionStatus")
      })
    });
    state.selectedMeetingMessage = `Recorded resolution ${resolution.title}.`;
    const message = state.selectedMeetingMessage;
    await refreshAll();
    state.selectedMeetingId = meetingId;
    state.selectedMeetingMessage = message;
    renderShell();
  } catch (error) {
    state.selectedMeetingError = error.message;
    renderShell();
  }
}

