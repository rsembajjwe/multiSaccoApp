function subscriptionsView() {
  const rows = dataRows("subscriptions");
  const tableRows = buildSubscriptionRows({ subscriptions: rows, tenants: tenantRows() });
  const subscriptionSummary = buildSubscriptionSummary(rows, tableRows);
  return `
    <div class="dashboard-grid">
      ${summary(t("activeSubscriptions"), subscriptionSummary.activeSubscriptions, "Operating access", "View")}
      ${summary(t("pendingPayments"), subscriptionSummary.pendingPayments, "Awaiting confirmation", "Record payment")}
      ${summary(t("suspendedAccess"), subscriptionSummary.suspendedAccess, "Blocked from operating", t("review"))}
      ${summary(t("revenueThisMonth"), money.format(subscriptionSummary.revenueThisMonth), "Invoice value", t("export"))}
      ${summary(t("outstandingInvoices"), money.format(subscriptionSummary.outstandingInvoices), "Unpaid balance", "Follow up")}
    </div>
    ${subscriptionStatusGuide(subscriptionSummary)}
    ${filterToolbar("Search by SACCO code, SACCO name, package, payment status, access status or expiry", "Record payment", "Generate invoice")}
    ${subscriptionDetailPanel(rows)}
    ${recordTable("Subscription list", tableRows, ["saccoCode", "tenantName", "packageName", "billingDescription", "billableMembers", "amount", "paid", "balanceDue", "paymentStage", "approvalStage", "operatingAccess", "expiry"])}
    ${packageCards()}
    ${packageSetupPanel()}
  `;
}

function subscriptionStatusGuide(subscriptionSummary) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(t("subscriptionPaymentAccessStatus"))}</h2>
          <p>Track subscription payment, callback confirmation and operating access before a SACCO can transact.</p>
        </div>
        <span class="status ${subscriptionSummary.pendingPayments || subscriptionSummary.expiredOrSuspended ? "pending" : "active"}">${subscriptionSummary.pendingPayments || subscriptionSummary.expiredOrSuspended ? "Follow up" : "Current"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Paid and active", `${subscriptionSummary.paidAndActive} SACCO(s)`)}
        ${mini("Payment initiated", `${subscriptionSummary.paymentInitiated} SACCO(s) waiting for confirmation`)}
        ${mini("Callback received", `${subscriptionSummary.callbackReceived} SACCO(s) confirmed`)}
        ${mini("Expired or suspended", `${subscriptionSummary.expiredOrSuspended} SACCO(s)`)}
      </div>
    </section>
  `;
}

function subscriptionDetailPanel(rows) {
  const subscription = rows.find((item) => item.id === state.selectedSubscriptionId);
  if (!subscription) return "";
  const tenant = tenantRows().find((item) => item.id === subscription.tenantId) || {};
  const canManage = isPlatform() && (hasPermission("subscriptions:manage") || roleKind() === "super" || roleKind() === "billing");
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Subscription control</h2>
          <p>${escapeHtml(tenant.name || subscription.tenantId)} - invoice ${escapeHtml(subscription.invoice || subscription.id)}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-subscription-detail">Close</button>
      </div>
      ${state.selectedSubscriptionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedSubscriptionMessage)}</strong></div>` : ""}
      ${state.selectedSubscriptionError ? `<div class="notice warning"><strong>Subscription update failed.</strong><span>${escapeHtml(state.selectedSubscriptionError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Operating access", subscriptionAccessLabelFor(subscription || {}, tenant || {}))}
        ${mini("Payment status", subscriptionPaymentLabelFor(subscription || {}))}
        ${mini("Payment stage", saccoPaymentStageFor(tenant || {}, subscription))}
        ${mini("Approval stage", saccoApprovalStageFor(tenant || {}, subscription))}
        ${mini("Subscription status", subscription.status)}
        ${mini("SACCO code", tenant.abbreviation || tenant.code || subscription.tenantCode || subscription.tenantId)}
        ${mini("Package", subscription.tierLabel || subscription.packageId)}
        ${mini("Billable members", subscription.billableMembers || subscription.memberCount)}
        ${mini("Amount", money.format(subscription.amount || 0))}
        ${mini("Paid", money.format(subscription.paid || 0))}
        ${mini("Balance due", money.format(due))}
        ${mini("Expiry", subscription.expiry)}
      </div>
      <form id="subscriptionPaymentForm" class="form-grid">
        <input type="hidden" id="selectedSubscriptionId" value="${escapeHtml(subscription.id)}">
        <input type="hidden" id="selectedSubscriptionTenantId" value="${escapeHtml(subscription.tenantId)}">
        <label><span>Payment amount</span><input id="subscriptionPaymentAmount" type="number" min="1" step="1" value="${due || subscription.amount || 0}" ${canManage ? "" : "disabled"}></label>
        <label><span>Payment channel</span><select id="subscriptionPaymentChannel" ${canManage ? "" : "disabled"}><option value="manual">Manual</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option></select></label>
        <label><span>Reference</span><input id="subscriptionPaymentReference" value="PAY-${Date.now()}" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManage ? `
            <button class="button primary" type="submit">Record payment</button>
            <button class="button secondary" type="button" data-subscription-action="renew">Renew full year</button>
            <button class="button secondary" type="button" data-subscription-action="activate-tenant">Activate access</button>
            <button class="button ghost" type="button" data-subscription-action="suspend-tenant">Suspend access</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      ${isPlatform() && hasPermission("tenants:manage") ? platformCollectionModePanel(tenant) : ""}
    </section>
  `;
}

function packageCards() {
  const packages = dataRows("subscriptionPackages");
  const rows = buildPackageCardRows(packages.length ? packages : fallbackPackages());
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Package Setup</h2>
          <p>Active subscription packages, member ranges and annual billing rules used when SACCOs register or renew.</p>
        </div>
        <span class="status active">${rows.length} active package(s)</span>
      </div>
      <div class="package-grid">
        ${rows.map((pkg) => `
            <article>
              <div class="card-title-row">
                <h3>${escapeHtml(pkg.name || pkg.packageName || "Subscription package")}</h3>
                <span class="status ${pkg.statusTone}">${escapeHtml(pkg.statusLabel)}</span>
              </div>
              <strong>${money.format(pkg.amount)}</strong>
              <p>${escapeHtml(pkg.memberLimit)} members / ${escapeHtml(pkg.branchLimit)} branch${String(pkg.branchLimit) === "1" ? "" : "es"}</p>
              <span>${escapeHtml(pkg.modules || pkg.description || "Included modules, SMS, storage and support level")}</span>
              <button class="button secondary" type="button" data-package-manage="${escapeHtml(pkg.packageId)}">Manage package</button>
            </article>
          `).join("")}
      </div>
    </section>
  `;
}

function packageSetupPanel() {
  const packages = dataRows("subscriptionPackages").length ? dataRows("subscriptionPackages") : fallbackPackages();
  const pkg = packages.find((item) => String(item.id || item.packageId || item.name) === String(state.selectedPackageId));
  if (!pkg) return "";
  const canManage = isPlatform() && (roleKind() === "super" || roleKind() === "billing" || hasPermission("subscriptions:manage"));
  return `
    <section class="panel detail-panel package-dialog-panel">
      <div class="panel-heading">
        <div>
          <h2>Package Setup</h2>
          <p>Update the subscription package used for SACCO billing and registration pricing.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-package-setup">Close</button>
      </div>
      ${state.selectedPackageMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedPackageMessage)}</strong></div>` : ""}
      ${state.selectedPackageError ? `<div class="notice warning"><strong>Package update failed.</strong><span>${escapeHtml(state.selectedPackageError)}</span></div>` : ""}
      <form id="packageSetupForm" class="form-grid">
        <input type="hidden" id="selectedPackageId" value="${escapeHtml(pkg.id || pkg.packageId || pkg.name)}">
        <label><span>Package name</span><input id="packageSetupName" value="${escapeHtml(pkg.name || pkg.packageName || "")}" ${canManage ? "" : "disabled"}></label>
        <label><span>Member range</span><input id="packageSetupTierLabel" value="${escapeHtml(pkg.tierLabel || pkg.memberRange || pkg.name || "")}" ${canManage ? "" : "disabled"}></label>
        <label><span>Annual amount</span><input id="packageSetupPrice" type="number" min="0" step="1000" value="${Number(pkg.price || pkg.amount || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Minimum members</span><input id="packageSetupMinMembers" type="number" min="0" step="1" value="${Number(pkg.minMembers || 100)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Maximum members</span><input id="packageSetupMembers" type="number" min="0" step="1" value="${Number(pkg.members || pkg.maxMembers || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Branches</span><input id="packageSetupBranches" type="number" min="0" step="1" value="${Number(pkg.branches || pkg.maxBranches || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>User accounts</span><input id="packageSetupUsers" type="number" min="0" step="1" value="${Number(pkg.users || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="packageSetupStatus" ${canManage ? "" : "disabled"}><option value="active" ${normal(pkg.status || "active") === "active" ? "selected" : ""}>Active</option><option value="inactive" ${normal(pkg.status) === "inactive" ? "selected" : ""}>Inactive</option></select></label>
        <label class="wide"><span>Included modules</span><textarea id="packageSetupModules" ${canManage ? "" : "disabled"}>${escapeHtml(pkg.modules || pkg.description || "")}</textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Save package</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}
