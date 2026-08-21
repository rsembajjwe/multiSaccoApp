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
    ${subscriptionHealthPanel()}
    ${filterToolbar("Search by SACCO code, SACCO name, package, payment status, access status or expiry", "Record payment", "Generate invoice")}
    ${subscriptionDetailPanel(rows)}
    ${recordTable("Subscription list", tableRows, ["saccoCode", "tenantName", "packageName", "billingDescription", "billableMembers", "amount", "paid", "balanceDue", "paymentStage", "approvalStage", "operatingAccess", "expiry"])}
    ${revenueRateCardPanel()}
    ${billingBreakdownPanel()}
    ${packageCards()}
    ${packageSetupPanel()}
  `;
}

function subscriptionHealthPanel() {
  const subs = dataRows("subscriptions");
  if (!subs.length) return "";
  const stateOf = (sub) => sub.lifecycleState || sub.status || "unknown";
  const order = ["active", "trial", "expiring", "grace", "pending_payment", "expired"];
  const labels = { active: "Active", trial: "Trial", expiring: "Expiring", grace: "Grace", pending_payment: "Pending", expired: "Expired" };
  const counts = { active: 0, trial: 0, expiring: 0, grace: 0, pending_payment: 0, expired: 0 };
  subs.forEach((sub) => { const key = stateOf(sub); counts[key] = (counts[key] || 0) + 1; });
  const recurring = subs.filter((sub) => ["active", "expiring", "grace"].includes(stateOf(sub)));
  const annualRecurring = recurring.reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
  const chartData = order.filter((key) => counts[key] > 0).map((key) => ({ label: labels[key], value: counts[key] }));
  const expiringSoon = subs
    .filter((sub) => ["expiring", "grace"].includes(stateOf(sub)))
    .slice()
    .sort((a, b) => Number(a.daysToExpiry ?? 9999) - Number(b.daysToExpiry ?? 9999))
    .map((sub) => ({
      tenantName: tenantName(sub.tenantId),
      status: labelize(stateOf(sub)),
      daysToExpiry: (sub.daysToExpiry === null || sub.daysToExpiry === undefined) ? "-" : String(sub.daysToExpiry),
      expiry: sub.expiry || "-",
      amount: money.format(sub.amount || 0)
    }));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div><h2>Subscription health</h2><p>Lifecycle mix and annual recurring revenue across SACCO subscriptions.</p></div>
        <span class="status ${counts.expired ? "pending" : "active"}">${counts.expired} expired</span>
      </div>
      <div class="source-grid compact">
        ${mini("SACCO subscriptions", subs.length)}
        ${mini("Active", counts.active)}
        ${mini("On free trial", counts.trial)}
        ${mini("Expiring / grace", counts.expiring + counts.grace)}
        ${mini("Expired", counts.expired)}
        ${mini("Annual recurring", money.format(annualRecurring))}
      </div>
      <div class="chart-figure">${svgBarChart(chartData, { title: "Subscriptions by lifecycle", format: (value) => String(Math.round(value)) })}</div>
      ${expiringSoon.length ? recordTable("Expiring soon", expiringSoon, ["tenantName", "status", "daysToExpiry", "expiry", "amount"]) : `<div class="notice compact"><span>No SACCO subscriptions are expiring within the window.</span></div>`}
    </section>`;
}

function billingBreakdownPanel() {
  const saccoTenants = tenantRows().filter((tenant) => tenant.id !== "tenant_platform");
  if (!saccoTenants.length) return "";
  const selectedId = state.selectedBillingTenantId || "";
  const summary = state.billingSummary;
  const items = (state.billingItems || []).filter((item) => item.status !== "cancelled");
  const assignable = dataRows("billingCatalog").filter((rate) => rate.active !== false && ["addon_module", "support", "setup"].includes(rate.category));
  const invoiceRows = summary
    ? (summary.lines || []).map((line) => ({
        description: line.description,
        category: labelize(line.category || ""),
        quantity: line.quantity,
        unitPrice: money.format(line.unitPrice || 0),
        amount: money.format(line.amount || 0),
        billingPeriod: labelize(line.billingPeriod || "")
      }))
    : [];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO billing breakdown</h2>
          <p>Compose a SACCO's bill from its base subscription plus add-on revenue avenues.</p>
        </div>
      </div>
      ${state.billingMessage ? `<div class="notice compact"><strong>${escapeHtml(state.billingMessage)}</strong></div>` : ""}
      ${state.billingBreakdownError ? `<div class="notice warning"><strong>Billing update failed.</strong><span>${escapeHtml(state.billingBreakdownError)}</span></div>` : ""}
      <div class="form-grid">
        <label>
          <span>SACCO</span>
          <select id="billingTenantSelect">
            <option value="">Select a SACCO</option>
            ${saccoTenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${tenant.id === selectedId ? "selected" : ""}>${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${state.billingBreakdownLoading ? `<div class="notice compact"><span>Loading billing breakdown...</span></div>` : ""}
      ${summary ? `
        ${recordTable("Composed invoice", invoiceRows, ["description", "category", "quantity", "unitPrice", "amount", "billingPeriod"])}
        <div class="source-grid compact">
          ${mini("Base subscription", money.format(summary.baseSubscription || 0))}
          ${mini("Annual recurring", money.format(summary.annualRecurringTotal || 0))}
          ${mini("One-time", money.format(summary.oneTimeTotal || 0))}
          ${mini("SMS usage", money.format(summary.usageTotal || 0))}
          ${mini("Invoice total", money.format(summary.total || 0))}
        </div>
        <div class="collection-account-list">
          ${items.length ? items.map((item) => `
            <div class="collection-account-row">
              <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(labelize(item.category || ""))} / ${escapeHtml(money.format(item.amount || 0))} / ${escapeHtml(labelize(item.billingPeriod || ""))}</span></div>
              <button class="button ghost" type="button" data-cancel-billing-item="${escapeHtml(item.id)}">Remove</button>
            </div>`).join("") : `<div class="notice compact"><span>No add-ons on this SACCO yet.</span></div>`}
        </div>
        ${assignable.length ? `
        <form id="billingAddonForm" class="form-grid">
          <label><span>Add-on</span><select id="billingAddonSelect">${assignable.map((rate) => `<option value="${escapeHtml(rate.code)}">${escapeHtml(rate.name)} - ${escapeHtml(money.format(rate.unitPrice || 0))} / ${escapeHtml(labelize(rate.billingPeriod || ""))}</option>`).join("")}</select></label>
          <label><span>Quantity</span><input id="billingAddonQty" type="number" min="1" value="1"></label>
          <div class="form-actions inline"><button class="button primary" type="button" data-assign-billing-item="1">Add to SACCO</button></div>
        </form>` : ""}
      ` : (selectedId ? "" : `<div class="notice compact"><span>Select a SACCO to see its composed bill.</span></div>`)}
    </section>`;
}

function revenueRateCardPanel() {
  const catalog = dataRows("billingCatalog");
  if (!catalog.length) return "";
  const rows = catalog.map((item) => ({
    name: item.name,
    category: labelize(item.category || ""),
    unitPrice: money.format(item.unitPrice || 0),
    billingPeriod: labelize(item.billingPeriod || ""),
    status: item.active === false ? "Inactive" : "Active"
  }));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Revenue avenues (rate card)</h2>
          <p>Add-on modules, premium support, one-time setup, staff-seat and branch overage, and metered SMS — billed to each SACCO on top of the base subscription. None touch member funds.</p>
        </div>
      </div>
      ${recordTable("Billing rate card", rows, ["name", "category", "unitPrice", "billingPeriod", "status"])}
    </section>`;
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
