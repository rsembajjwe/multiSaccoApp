// SACCO savings, shares and welfare rendering extracted from app.js.

function savingsTransfersView() {
  const transfers = dataRows("savingsTransfers");
  const members = dataRows("members");
  const fundTypes = dataRows("fundTypes");
  const loans = dataRows("loans");
  const canCreate = hasPermission("savings-transfer:create");
  const canApprove = hasPermission("savings-transfer:approve");
  const memberOptions = members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.fullName || member.membershipNo || member.id)}</option>`).join("");
  const fundCodes = ["shares", "welfare"].concat(fundTypes.map((fund) => fund.code).filter((code) => code && !["savings", "shares", "welfare"].includes(code)));
  const fundOptions = fundCodes.map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(labelize(code))}</option>`).join("");
  const loanOptions = loans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(memberName(loan.memberId))} - ${escapeHtml(loan.product || "loan")}</option>`).join("");
  const pending = transfers.filter((transfer) => transfer.status === "pending" || transfer.status === "awaiting_second_approval");
  const rows = transfers.map((transfer) => ({
    reference: transfer.reference,
    member: memberName(transfer.sourceMemberId),
    amount: money.format(transfer.amount || 0),
    destination: labelize(transfer.destinationType || "")
      + (transfer.destinationFundCode ? ` (${labelize(transfer.destinationFundCode)})` : "")
      + (transfer.destinationMemberId ? ` (${memberName(transfer.destinationMemberId)})` : ""),
    status: labelize(transfer.status || ""),
    kind: transfer.batchId ? "Group" : "Single",
    createdAt: formatDateTime(transfer.createdAt)
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Transfers", transfers.length, "Savings transfers and deductions", "Manage")}
      ${summary("Pending approval", pending.length, "Awaiting a checker", pending.length ? "Review" : "Clear")}
    </div>
    ${state.savingsTransferMessage ? `<div class="notice compact"><strong>${escapeHtml(state.savingsTransferMessage)}</strong></div>` : ""}
    ${state.savingsTransferError ? `<div class="notice warning"><strong>Transfer action failed.</strong><span>${escapeHtml(state.savingsTransferError)}</span></div>` : ""}
    ${canCreate ? `
    <section class="panel">
      <div class="panel-heading"><div><h2>New savings transfer</h2><p>Initiate a movement out of a member's savings. A board/chairperson approver posts it (maker-checker).</p></div></div>
      <form id="savingsTransferForm" class="form-grid">
        <label><span>From member</span><select id="stSource">${memberOptions}</select></label>
        <label><span>Amount</span><input id="stAmount" type="number" min="1" step="0.01"></label>
        <label><span>Destination</span><select id="stDestType"><option value="own_fund">Member's other fund</option><option value="loan_repayment">Loan repayment</option><option value="sacco_income">SACCO income / fee</option><option value="another_member">Another member</option></select></label>
        <label><span>To fund (own fund)</span><select id="stFund">${fundOptions}</select></label>
        <label><span>To loan (loan repayment)</span><select id="stLoan"><option value="">-</option>${loanOptions}</select></label>
        <label><span>To member (another member)</span><select id="stDestMember"><option value="">-</option>${memberOptions}</select></label>
        <label><span>Member authorization ref</span><input id="stAuth" type="text" maxlength="240" placeholder="Required for fees / another member / large amounts"></label>
        <label class="full"><span>Reason</span><input id="stReason" type="text" maxlength="240"></label>
        <div class="form-actions inline"><button class="button primary" type="button" data-create-savings-transfer="1">Create transfer</button></div>
      </form>
    </section>
    <section class="panel">
      <div class="panel-heading"><div><h2>Group deduction</h2><p>Deduct the same amount from savings for a selected list of members. Requires a board/AGM resolution.</p></div></div>
      <form id="groupDeductionForm" class="form-grid">
        <label class="full"><span>Members (multi-select)</span><select id="gdMembers" multiple size="5">${memberOptions}</select></label>
        <label><span>Amount</span><input id="gdAmount" type="number" min="1" step="0.01"></label>
        <label><span>Destination</span><select id="gdDestType"><option value="sacco_income">SACCO income / fee</option><option value="own_fund">Member's other fund</option></select></label>
        <label><span>To fund (own fund)</span><select id="gdFund">${fundOptions}</select></label>
        <label><span>Board/AGM resolution ref</span><input id="gdResolution" type="text" maxlength="240" placeholder="Required"></label>
        <label class="full"><span>Reason</span><input id="gdReason" type="text" maxlength="240"></label>
        <div class="form-actions inline"><button class="button primary" type="button" data-create-group-deduction="1">Create group deduction</button></div>
      </form>
    </section>` : ""}
    ${recordTable("Savings transfers", rows, ["reference", "member", "amount", "destination", "status", "kind", "createdAt"])}
    ${canApprove && transfers.some((transfer) => transfer.status === "posted") ? `
    <section class="panel compact-panel">
      <div class="panel-heading"><div><h2>Reverse a posted transfer</h2><p>Reversal mirrors the original movement (money is not deleted).</p></div></div>
      <div class="collection-account-list">
        ${transfers.filter((transfer) => transfer.status === "posted").slice(0, 20).map((transfer) => `<div class="collection-account-row">
          <div><strong>${escapeHtml(transfer.reference)}</strong><span>${escapeHtml(memberName(transfer.sourceMemberId))} / ${escapeHtml(money.format(transfer.amount || 0))} / ${escapeHtml(labelize(transfer.destinationType || ""))}</span></div>
          <button class="button ghost" type="button" data-reverse-savings-transfer="${escapeHtml(transfer.id)}">Reverse</button>
        </div>`).join("")}
      </div>
    </section>` : ""}
    ${canApprove && pending.length ? `
    <section class="panel compact-panel">
      <div class="panel-heading"><div><h2>Pending approvals</h2><p>Approve or reject. The creator cannot approve their own transfer.</p></div></div>
      <div class="collection-account-list">
        ${pending.map((transfer) => `<div class="collection-account-row">
          <div><strong>${escapeHtml(transfer.reference)}</strong><span>${escapeHtml(memberName(transfer.sourceMemberId))} / ${escapeHtml(money.format(transfer.amount || 0))} / ${escapeHtml(labelize(transfer.destinationType || ""))}${transfer.status === "awaiting_second_approval" ? " / awaiting 2nd approval" : ""}</span></div>
          <div><button class="button primary" type="button" data-decide-savings-transfer="${escapeHtml(transfer.id)}" data-decision="posted">${transfer.status === "awaiting_second_approval" ? "Give final approval" : "Approve"}</button> <button class="button ghost" type="button" data-decide-savings-transfer="${escapeHtml(transfer.id)}" data-decision="rejected">Reject</button></div>
        </div>`).join("")}
      </div>
    </section>` : ""}
  `;
}

function savingsView() {
  const products = productsByType("savings");
  const accounts = accountsByType("savings");
  const members = dataRows("members");
  const finance = buildSavingsSummary({ products, accounts, members });
  const monthlyPerformance = buildSaccoMonthlyPerformanceRows({
    transactions: transactionRows(),
    callbacks: dataRows("mobileMoneyCallbacks"),
    memberName,
  });
  const tabs = [["overview", "Overview"], ["monthly", t("monthlyPerformance")], ["products", t("savingsProductSetup")], ["accounts", t("openSavingsAccount")], ["lists", t("savingsRecords")]];
  const tab = activeModuleTab("savings", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("savingsProducts"), finance.productCount, "Configured products", "Manage")}
      ${summary(t("savingsAccounts"), finance.accountCount, "Member accounts", t("open"))}
      ${summary(t("activeProducts"), finance.activeProductCount, "Available to members", t("review"))}
      ${summary(t("minimumContribution"), money.format(finance.contributionTotal), "Configured product totals", "View")}
      ${summary(t("savingsBalances"), money.format(finance.balanceTotal), "Member ledger total", "Statements")}
    </div>
    ${moduleTabs("savings", tabs, tab)}
    ${tab === "overview" ? financeControlPanel(t("savingsOperationsControl"), "Savings setup links member accounts, monthly deposits and SACCO collection channels.", [
      ["Product setup", `${finance.activeProductCount} active savings product(s) are available for account opening.`, finance.activeProductCount ? "Ready" : "Setup"],
      ["Member accounts", `${finance.accountCount} savings account(s) are open for active members.`, finance.accountCount ? "Active" : "Open"],
      ["Contribution flow", "Savings deposits post through Transactions and member mobile payments.", "Connected"]
    ]) : ""}
    ${tab === "monthly" ? `
      ${paymentRoutePanel()}
      ${saccoMonthlyPerformancePanel(monthlyPerformance)}
      ${recordTable("Member monthly performance", monthlyPerformance, ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"])}
    ` : ""}
    ${tab === "products" ? financialProductPanel("savings") : ""}
    ${tab === "accounts" ? financialAccountPanel("savings", products) : ""}
    ${tab === "lists" ? `
      ${recordTable("Savings product list", products, ["name", "code", "contributionAmount", "minimumBalance", "interestRate", "status"])}
      ${recordTable("Savings accounts", accounts, ["membershipNo", "memberName", "productName", "accountNo", "status", "openedAt"])}
    ` : ""}
  `;
}

function sharesView() {
  const products = productsByType("share");
  const accounts = accountsByType("share");
  const members = dataRows("members");
  const finance = buildSharesSummary({ products, accounts, members });
  const tabs = [["overview", "Overview"], ["products", t("sharesProductSetup")], ["accounts", t("openSharesAccount")], ["register", t("shareRegister")]];
  const tab = activeModuleTab("shares", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("shareProducts"), finance.productCount, "Share capital products", "Manage")}
      ${summary(t("shareAccounts"), finance.accountCount, "Member share ledgers", t("open"))}
      ${summary(t("activeMembers"), finance.activeMemberCount, "Holding shares", "View")}
      ${summary(t("shareContributionSetup"), money.format(finance.contributionTotal), "Configured value", t("review"))}
      ${summary(t("shareBalances"), money.format(finance.balanceTotal), "Member share capital", "Register")}
    </div>
    ${moduleTabs("shares", tabs, tab)}
    ${tab === "overview" ? financeControlPanel(t("sharesCapitalControl"), "Share controls track capital products, member share accounts and share purchase posting.", [
      ["Product setup", `${finance.activeProductCount} active share product(s) define contribution rules.`, finance.activeProductCount ? "Ready" : "Setup"],
      ["Share register", `${finance.accountCount} member share account(s) are available for reporting.`, finance.accountCount ? "Active" : "Open"],
      ["Contribution flow", "Share purchases post through Transactions and member mobile payments.", "Connected"]
    ]) : ""}
    ${tab === "products" ? financialProductPanel("shares") : ""}
    ${tab === "accounts" ? financialAccountPanel("shares", products) : ""}
    ${tab === "register" ? `
      ${recordTable("Share product list", products, ["name", "code", "contributionAmount", "minimumBalance", "status"])}
      ${recordTable("Share register", accounts, ["membershipNo", "memberName", "productName", "accountNo", "status", "openedAt"])}
    ` : ""}
  `;
}

function welfareView() {
  const products = productsByType("welfare");
  const claims = dataRows("welfareClaims");
  const accounts = accountsByType("welfare");
  const finance = buildWelfareSummary({ products, claims, accounts });
  const tabs = [["overview", "Overview"], ["products", t("welfareProductSetup")], ["claims", t("welfareClaims")], ["detail", t("welfareClaimDecision")]];
  const tab = activeModuleTab("welfare", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("welfareProducts"), finance.productCount, "Contribution rules", "Manage")}
      ${summary(t("welfareAccounts"), finance.accountCount, "Member welfare ledgers", t("open"))}
      ${summary(t("claims"), finance.claimCount, "Submitted claims", t("open"))}
      ${summary(t("pendingClaims"), finance.submittedCount, "Decision queue", t("review"))}
      ${summary(t("approvedForPayment"), finance.approvedCount, "Payment queue", "Pay")}
      ${summary(t("paidClaims"), money.format(finance.paidAmount), "Settled welfare support", "Report")}
    </div>
    ${moduleTabs("welfare", tabs, tab)}
    ${tab === "overview" ? financeControlPanel(t("welfareFundControl"), "Welfare controls manage contributions, balances, claims and approved payouts.", [
      ["Contribution setup", `${finance.productCount} welfare product(s) and ${finance.accountCount} welfare account(s) support member balances.`, finance.productCount && finance.accountCount ? "Ready" : "Setup"],
      ["Claim decisions", `${finance.submittedCount} submitted claim(s) need approval or rejection.`, finance.submittedCount ? "Pending" : "Clear"],
      ["Claim payments", `${finance.approvedCount} approved claim(s) are ready for payment if member welfare balance is sufficient.`, finance.approvedCount ? "Ready" : "Clear"]
    ]) : ""}
    ${tab === "products" ? financialProductPanel("welfare") : ""}
    ${tab === "accounts" ? financialAccountPanel("welfare", products) : ""}
    ${tab === "claims" ? `
      ${welfareClaimPanel()}
      ${recordTable("Welfare product list", products, ["name", "code", "contributionAmount", "status"])}
      ${recordTable("Welfare claims", buildWelfareClaimRows(claims), ["membershipNo", "memberName", "claimType", "amount", "channel", "reference", "status", "submittedAt"])}
    ` : ""}
    ${tab === "detail" ? (welfareClaimDetailPanel(claims) || emptyState("Welfare claim decision", "Select a welfare claim from the list to approve, reject or pay.")) : ""}
  `;
}

const FUNDING_SOURCE_TYPES = ["share_capital", "member_savings", "grant", "donation", "external_borrowing", "retained_earnings", "investment_income", "other"];

function fundingSourcesView() {
  const sources = dataRows("fundingSources");
  const canManage = hasPermission("finance-source:manage");
  const register = buildFundingSourceSummary(sources);
  const editing = state.selectedFundingSourceId ? sources.find((row) => row.id === state.selectedFundingSourceId) : null;
  const registerRows = sources.map((row) => ({
    ...row,
    sourceTypeLabel: labelize(row.sourceType || ""),
    recordedAmount: money.format(row.amount || 0),
    received: row.dateReceived ? formatDate(row.dateReceived) : "-",
    action: canManage ? "funding-source-edit" : "none",
    actionId: row.id,
    actionLabel: "Edit"
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Active funding", money.format(register.activeTotal), "Total capital currently in the register", "Review")}
      ${summary("Sources on record", register.count, "All capital, grants and borrowings", "Open")}
      ${summary("Closed entries", register.closedCount, "Repaid or retired sources", "Archive")}
    </div>
    ${state.fundingSourceMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fundingSourceMessage)}</strong></div>` : ""}
    ${state.fundingSourceError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.fundingSourceError)}</span></div>` : ""}
    ${canManage ? fundingSourceForm(editing) : `<div class="notice compact"><span>You have review-only access to the sources-of-funds register.</span></div>`}
    ${recordTable("Sources of funds register", registerRows, ["sourceTypeLabel", "provider", "recordedAmount", "currencyCode", "reference", "received", "status"])}
  `;
}

function fundingSourceForm(editing) {
  const value = editing || {};
  const typeOptions = FUNDING_SOURCE_TYPES
    .map((type) => `<option value="${type}" ${value.sourceType === type ? "selected" : ""}>${escapeHtml(labelize(type))}</option>`)
    .join("");
  const statusOptions = ["active", "closed"]
    .map((status) => `<option value="${status}" ${value.status === status ? "selected" : ""}>${escapeHtml(labelize(status))}</option>`)
    .join("");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${editing ? "Edit funding source" : "Add funding source"}</h2>
          <p>Record where the SACCO's capital comes from.</p>
        </div>
        ${editing ? `<button class="button ghost" type="button" data-cancel-funding-source="1">Cancel edit</button>` : ""}
      </div>
      <form id="fundingSourceForm" class="form-grid">
        <label><span>Source type</span><select id="fsType">${typeOptions}</select></label>
        <label><span>Provider / origin</span><input id="fsProvider" value="${escapeHtml(value.provider || "")}" placeholder="e.g. Centenary Bank, member share capital"></label>
        <label><span>Amount</span><input id="fsAmount" type="number" min="0" step="0.01" value="${escapeHtml(value.amount != null ? String(value.amount) : "")}" placeholder="0.00"></label>
        <label><span>Currency</span><input id="fsCurrency" value="${escapeHtml(value.currencyCode || "UGX")}" placeholder="UGX"></label>
        <label><span>Reference</span><input id="fsReference" value="${escapeHtml(value.reference || "")}" placeholder="Cheque / agreement ref"></label>
        <label><span>Date received</span><input id="fsDate" type="date" value="${escapeHtml(value.dateReceived || "")}"></label>
        <label><span>Status</span><select id="fsStatus">${statusOptions}</select></label>
        <label class="wide"><span>Notes (optional)</span><input id="fsNotes" value="${escapeHtml(value.notes || "")}" placeholder="Conditions, term, purpose"></label>
        <div class="form-actions inline">
          <button class="button primary" type="button" data-save-funding-source="${escapeHtml(editing ? editing.id : "")}">${editing ? "Update source" : "Add source"}</button>
        </div>
      </form>
    </section>
  `;
}

function financialProductPanel(type) {
  const canCreate = hasPermission("transactions:create");
  const products = productsByType(type === "shares" ? "share" : type);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialProductTitle(type)}</h2>
          <p>Create ${labelize(type).toLowerCase()} products. Codes must be unique.</p>
        </div>
        <span class="status ${products.length ? "active" : "pending"}">${products.length ? "Configured" : "Setup needed"}</span>
      </div>
      ${state.productFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.productFormMessage)}</strong></div>` : ""}
      ${state.productFormError ? `<div class="notice warning"><strong>Product setup failed.</strong><span>${escapeHtml(state.productFormError)}</span></div>` : ""}
      <form class="form-grid" data-product-form="${escapeHtml(type)}">
        <input type="hidden" data-product-field="tenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <input type="hidden" data-product-field="productType" value="${escapeHtml(type)}">
        <label><span>Code</span><input data-product-field="code" required placeholder="${type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}" ${canCreate ? "" : "disabled"}></label>
        <label><span>Name</span><input data-product-field="name" required placeholder="${labelize(type)} product name" ${canCreate ? "" : "disabled"}></label>
        <label><span>Contribution amount</span><input data-product-field="contributionAmount" type="number" min="0" step="1" value="${type === "shares" ? "5000" : "10000"}" ${canCreate ? "" : "disabled"}></label>
        <label><span>Minimum balance</span><input data-product-field="minimumBalance" type="number" min="0" step="1" value="0" ${canCreate ? "" : "disabled"}></label>
        <label><span>Interest rate</span><input data-product-field="interestRate" type="number" min="0" step="0.01" value="0" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Create ${labelize(type)} product</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function financialAccountPanel(type, products) {
  const canCreate = hasPermission("transactions:create");
  const members = activeFinanceMemberOptions(dataRows("members"));
  const accounts = accountsByType(type === "shares" ? "share" : type);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialAccountTitle(type)}</h2>
          <p>Link an active member to a ${labelize(type).toLowerCase()} product.</p>
        </div>
        <span class="status ${products.length && members.length ? "active" : "pending"}">${accounts.length} account(s)</span>
      </div>
      ${state.accountFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.accountFormMessage)}</strong></div>` : ""}
      ${state.accountFormError ? `<div class="notice warning"><strong>Account opening failed.</strong><span>${escapeHtml(state.accountFormError)}</span></div>` : ""}
      <form class="form-grid" data-account-form="${escapeHtml(type)}">
        <input type="hidden" data-account-field="tenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <input type="hidden" data-account-field="accountType" value="${escapeHtml(type)}">
        <label><span>Member</span><select data-account-field="memberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.label)}</option>`).join("")}</select></label>
        <label><span>Product</span><select data-account-field="productId" ${canCreate ? "" : "disabled"}>${products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.code)} - ${escapeHtml(product.name)}</option>`).join("")}</select></label>
        <label><span>Account number</span><input data-account-field="accountNo" placeholder="Auto if blank" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button secondary" type="submit">Open ${labelize(type)} account</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function welfareClaimPanel() {
  const canCreate = hasPermission("transactions:create");
  const members = activeFinanceMemberOptions(dataRows("members"));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Welfare claim submission</h2>
          <p>Submit member welfare claims for approval and payment.</p>
        </div>
      </div>
      ${state.welfareClaimMessage ? `<div class="notice compact"><strong>${escapeHtml(state.welfareClaimMessage)}</strong></div>` : ""}
      ${state.welfareClaimError ? `<div class="notice warning"><strong>Welfare claim failed.</strong><span>${escapeHtml(state.welfareClaimError)}</span></div>` : ""}
      <form id="welfareClaimForm" class="form-grid">
        <input type="hidden" id="newWelfareTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newWelfareMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.label)}</option>`).join("")}</select></label>
        <label><span>Claim type</span><input id="newWelfareClaimType" required value="medical" ${canCreate ? "" : "disabled"}></label>
        <label><span>Amount</span><input id="newWelfareAmount" type="number" min="1" step="1" value="50000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Reference</span><input id="newWelfareReference" placeholder="Auto if blank" ${canCreate ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><textarea id="newWelfareDescription" placeholder="Claim reason and supporting details" ${canCreate ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit welfare claim</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function welfareClaimDetailPanel(claims) {
  const claim = claims.find((item) => item.id === state.selectedWelfareClaimId);
  if (!claim) return "";
  const canApprove = hasPermission("transactions:approve");
  const canPost = hasPermission("accounting:post");
  const submitted = ["submitted", "pending", "pending_approval"].some((word) => normal(claim.status).includes(word));
  const payable = normal(claim.status) === "approved";
  const paid = normal(claim.status) === "paid";
  const member = dataRows("members").find((item) => item.id === claim.memberId) || {};
  const welfareBalance = Number(member.welfareBalance || claim.welfareBalance || 0);
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Welfare claim decision</h2>
          <p>${escapeHtml(claim.reference || claim.id)} - ${escapeHtml(claim.memberName || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-welfare-claim-detail">Close</button>
      </div>
      ${state.selectedWelfareClaimMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedWelfareClaimMessage)}</strong></div>` : ""}
      ${state.selectedWelfareClaimError ? `<div class="notice warning"><strong>Welfare action failed.</strong><span>${escapeHtml(state.selectedWelfareClaimError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Claim amount", money.format(claim.amount || 0), "Requested welfare support", "Review")}
        ${summary("Member welfare balance", money.format(welfareBalance), "Available contribution balance", "Check")}
        ${summary("Decision state", payable ? "Approved" : paid ? "Paid" : submitted ? "Submitted" : labelize(claim.status || "Review"), "Approval workflow", "Decide")}
        ${summary("Payment readiness", payable ? "Ready to pay" : paid ? "Paid" : "Approve first", "Backend validates balance", "Pay")}
      </div>
      <div class="source-grid">
        ${mini("Member", `${claim.membershipNo || ""} ${claim.memberName || ""}`)}
        ${mini("Amount", money.format(claim.amount || 0))}
        ${mini("Claim type", claim.claimType)}
        ${mini("Status", claim.status)}
        ${mini("Paid channel", claim.channel)}
        ${mini("Submitted", claim.submittedAt)}
      </div>
      ${financeControlPanel("Welfare claim checklist", "Check eligibility, decision status and payment readiness before paying a welfare claim.", [
        ["Eligibility", "Only active members can receive welfare claims.", "Checked"],
        ["Decision", submitted ? "Approve or reject the submitted claim with a reason where needed." : "Decision step is complete or unavailable.", submitted ? "Pending" : "Done"],
        ["Payment", payable ? "Approved claim can be paid through cash, mobile money or bank if balance is sufficient." : "Payment is locked until approval.", payable ? "Ready" : "Locked"]
      ])}
      <form id="welfareClaimDecisionForm" class="form-grid">
        <input type="hidden" id="selectedWelfareClaimId" value="${escapeHtml(claim.id)}">
        <label class="wide"><span>Decision reason</span><input id="welfareClaimReason" placeholder="Required for rejection"></label>
        <label><span>Payment channel</span><select id="welfarePaymentChannel"><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option></select></label>
        <div class="form-actions inline">
          ${canApprove ? `<button class="button secondary" type="button" data-welfare-claim-action="approve" ${submitted ? "" : "disabled"}>Approve claim</button><button class="button ghost" type="button" data-welfare-claim-action="reject" ${submitted ? "" : "disabled"}>Reject claim</button>` : ""}
          ${canPost ? `<button class="button primary" type="button" data-welfare-claim-action="pay" ${payable ? "" : "disabled"}>Pay claim</button>` : ""}
          ${!canApprove && !canPost ? `<span class="status pending">View only</span>` : ""}
        </div>
      </form>
    </section>
  `;
}

function financeControlPanel(title, copy, rows) {
  const needsReview = rows.some((row) => ["setup", "open", "pending", "locked"].includes(normal(row[2])));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(copy)}</p>
        </div>
        <span class="status ${needsReview ? "pending" : "active"}">${needsReview ? "Review" : "Ready"}</span>
      </div>
      <div class="mini-grid">
        ${rows.map(([label, detail, status]) => mini(label, `${detail}${status ? ` (${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}

function financialProductTitle(type) {
  if (type === "savings") return "Savings product setup";
  if (type === "shares") return "Shares product setup";
  if (type === "welfare") return "Welfare product setup";
  return `${labelize(type)} product setup`;
}

function financialAccountTitle(type) {
  if (type === "savings") return "Open Savings account";
  if (type === "shares") return "Open Shares account";
  if (type === "welfare") return "Open Welfare account";
  return `Open ${labelize(type)} account`;
}
