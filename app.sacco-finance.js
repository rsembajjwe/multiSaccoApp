// SACCO savings, shares and welfare rendering extracted from app.js.

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
  const tabs = [["monthly", t("monthlyPerformance")], ["products", t("savingsProductSetup")], ["accounts", t("openSavingsAccount")], ["lists", t("savingsRecords")]];
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
    ${tab === "overview" ? rolePriorityPanel(t("savingsOperationsControl"), [
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
  const tabs = [["products", t("sharesProductSetup")], ["accounts", t("openSharesAccount")], ["register", t("shareRegister")]];
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
    ${tab === "overview" ? rolePriorityPanel(t("sharesCapitalControl"), [
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
  const tabs = [["claims", t("welfareClaims")], ["products", t("welfareProductSetup")], ["accounts", t("openWelfareAccount")], ["detail", t("welfareClaimDecision")]];
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
    ${tab === "overview" ? rolePriorityPanel(t("welfareFundControl"), [
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

function financialProductPanel(type) {
  const canCreate = hasPermission("transactions:create");
  const products = productsByType(type === "shares" ? "share" : type);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialProductTitle(type)}</h2>
          <p>Create ${labelize(type).toLowerCase()} products for this SACCO. Product codes must be unique per SACCO.</p>
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
          <p>Link an active member to a configured ${labelize(type).toLowerCase()} product. Duplicate member-product accounts are rejected by the backend.</p>
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
      ${rolePriorityPanel("Welfare claim checklist", [
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
