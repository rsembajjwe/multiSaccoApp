function saccoApplications() {
  const applications = buildSaccoApplicationRows({ subscriptions: dataRows("subscriptions"), tenants: tenantRows() });
  return `
    ${filterToolbar("Search applications by SACCO, district, contact or status", "Assign reviewer", "Export applications")}
    ${saccoRegistrationReadinessPanel(applications)}
    ${saccoRegistrationTabs()}
    ${saccoRegistrationTabContent(applications)}
  `;
}

function saccoRegistrationReadinessPanel(applications) {
  const registrationSummary = buildSaccoRegistrationSummary(applications);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO registration readiness</h2>
          <p>Track payment confirmation, self-registration approval and activation before a SACCO starts operating.</p>
        </div>
        <span class="status ${registrationSummary.readyForApproval ? "pending" : "active"}">${registrationSummary.readyForApproval ? "Review due" : "Current"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Payment initiated", `${registrationSummary.paymentInitiated} SACCO(s) awaiting payment confirmation`)}
        ${mini("Callback received", `${registrationSummary.callbackReceived} SACCO(s) with confirmed payment`)}
        ${mini("Ready for approval", `${registrationSummary.readyForApproval} paid self-registration(s)`)}
        ${mini("Active", `${registrationSummary.active} SACCO(s) operating`)}
      </div>
    </section>
  `;
}

function saccoRegistrationTabs() {
  const tabs = [
    ["platform", t("platformSaccoRegistration")],
    ["applications", t("saccoApplicationList")],
    ["self", t("selfRegistrationApprovalPath")]
  ];
  if (!tabs.some(([id]) => id === state.saccoRegistrationTab)) state.saccoRegistrationTab = "platform";
  return `
    <section class="panel compact-panel">
      <div class="tabs management-tabs">
        ${tabs.map(([id, label]) => `<button class="${state.saccoRegistrationTab === id ? "active" : ""}" type="button" data-sacco-registration-tab="${id}">${label}</button>`).join("")}
      </div>
    </section>
  `;
}

function saccoRegistrationTabContent(applications) {
  if (state.saccoRegistrationTab === "applications") {
    return `
      ${tenantDetailPanel()}
      ${recordTable(t("saccoApplicationList"), applications, ["saccoCode", "name", "country", "currencyCode", "district", "registrationNo", "paymentStage", "approvalStage", "operatingAccess", "status"])}
    `;
  }
  if (state.saccoRegistrationTab === "self") return selfRegistrationApprovalPanel();
  return platformSaccoRegistrationPanel();
}

function platformSaccoRegistrationPanel() {
  const packages = dataRows("subscriptionPackages");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("platformSaccoRegistration")}</h2>
          <p>Platform administrators can create a SACCO record directly. Paid registrations activate immediately; unpaid registrations remain pending payment.</p>
        </div>
      </div>
      ${state.tenantFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.tenantFormMessage)}</strong></div>` : ""}
      ${state.tenantFormError ? `<div class="notice warning"><strong>Could not register SACCO.</strong><span>${escapeHtml(state.tenantFormError)}</span></div>` : ""}
      <form id="platformSaccoForm" class="form-grid">
        <label><span>SACCO name</span><input id="newTenantName" required placeholder="e.g. Tereka Farmers SACCO"></label>
        <label><span>SACCO code</span><input id="newTenantCode" readonly placeholder="Generated automatically"></label>
        <label><span>Registration number</span><input id="newTenantRegistrationNo" placeholder="Cooperative or UMRA registration"></label>
        <label><span>Country</span><select id="newTenantCountry">${countryRegionOptions(COUNTRY_REGIONS, "uganda").map((option) => `<option value="${escapeHtml(option.value)}" data-country-label="${escapeHtml(option.label.split(" - ")[0])}" data-locale="${escapeHtml(option.locale)}" data-currency="${escapeHtml(option.currency)}" data-digits="${option.currencyDigits}" ${option.selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>
        <label><span>Currency</span><input id="newTenantCurrencyCode" readonly value="UGX"></label>
        <label><span>District</span><input id="newTenantDistrict" required placeholder="e.g. Kampala"></label>
        <label><span>Parish</span><input id="newTenantParish" required placeholder="e.g. Central Parish"></label>
        <label><span>Village</span><input id="newTenantVillage" required placeholder="e.g. Market Zone"></label>
        <label><span>Contact number</span><input id="newTenantContactNumber" required placeholder="+256..."></label>
        <label><span>Member range</span><select id="newTenantMemberRange">${memberRangeOptions().map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}</select></label>
        <label><span>Payment status</span><select id="newTenantPaymentStatus">
          <option value="paid">Paid - activate SACCO</option>
          <option value="pending">Not paid - keep pending payment</option>
        </select></label>
        <label><span>License expiry</span><input id="newTenantLicenseExpiry" type="date" required></label>
        <label><span>Subscription package</span><select id="newTenantPackageId">${packages.map((pkg) => `<option value="${escapeHtml(pkg.id || pkg.code || "")}">${escapeHtml(pkg.name || pkg.code || "Package")}</option>`).join("") || `<option value="">Assign later</option>`}</select></label>
        <div class="form-actions inline">
          <button class="button primary" type="submit">Register SACCO</button>
          <button class="button secondary" type="button" data-action="refresh">Refresh applications</button>
        </div>
      </form>
    </section>
  `;
}

function selfRegistrationApprovalPanel() {
  const steps = ["SACCO Information", "Location and Contact", "Authorized Contact", "Leadership Details", "Document Upload", "Subscription Package", "Review and Submit"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("selfRegistrationApprovalPath")}</h2>
          <p>SACCOs can submit their own application publicly, but they cannot operate until platform review, approval, subscription confirmation and activation are completed.</p>
        </div>
      </div>
      <div class="stepper">${steps.map((step, index) => `<div><span>${index + 1}</span><strong>${step}</strong></div>`).join("")}</div>
    </section>
  `;
}

// SACCO registration detail, status and form helpers extracted from app.js.

function tenantDetailPanel() {
  const tenant = state.selectedTenant || tenantRows().find((item) => item.id === state.selectedTenantId);
  if (!tenant) return "";
  const profile = state.selectedTenantProfile || {};
  const subscription = subscriptionForTenant(tenant.id);
  const canManage = hasPermission("tenants:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO application review</h2>
          <p>${escapeHtml(tenant.name || "Selected SACCO")} - code ${escapeHtml(tenant.abbreviation || tenant.id || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-tenant-detail">Close</button>
      </div>
      ${state.selectedTenantMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTenantMessage)}</strong></div>` : ""}
      ${state.selectedTenantError ? `<div class="notice warning"><strong>Application update failed.</strong><span>${escapeHtml(state.selectedTenantError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Activation state", tenantStatusLabel(tenant.status))}
        ${mini("Payment stage", saccoPaymentStageFor(tenant || {}, subscription))}
        ${mini("Approval stage", saccoApprovalStageFor(tenant || {}, subscription))}
        ${mini("Operating access", subscriptionAccessLabelFor(subscription || {}, tenant || {}))}
        ${mini("SACCO code", tenant.abbreviation)}
        ${mini("Country", tenant.country)}
        ${mini("Currency", tenant.currencyCode)}
        ${mini("District", tenant.district)}
        ${mini("Parish", profileLocationPart(profile, "Parish"))}
        ${mini("Village", profileLocationPart(profile, "Village"))}
        ${mini("Member range", profileLocationPart(profile, "Member range"))}
        ${mini("Registration", tenant.registrationNo)}
        ${mini("License expiry", tenant.licenseExpiry)}
        ${mini("Onboarding", `${tenant.onboarding || 0}%`)}
        ${mini("Email", profile.email)}
        ${mini("Contact number", profile.phone)}
      </div>
      ${subscription ? recordTable("Subscription readiness", [{
        invoice: subscription.invoice,
        packageName: subscription.tierLabel || subscription.packageId,
        amount: subscription.amount,
        paid: subscription.paid,
        balanceDue: Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0)),
        paymentStage: saccoPaymentStageFor(tenant || {}, subscription),
        approvalStage: saccoApprovalStageFor(tenant || {}, subscription),
        operatingAccess: subscriptionAccessLabelFor(subscription || {}, tenant || {}),
        expiry: subscription.expiry
      }], ["invoice", "packageName", "amount", "paid", "balanceDue", "paymentStage", "approvalStage", "operatingAccess", "expiry"]) : ""}
      <div class="grid two">
        ${recordTable("Registration profile", [profile], ["legalName", "tin", "umraLicenseNo", "cooperativeRegistrationNo", "address", "website"])}
        ${recordTable("Approval history", dataRows("auditEvents").filter((event) => event.recordReference === tenant.id || event.recordId === tenant.id), ["createdAt", "actor", "action", "module", "result"])}
      </div>
      ${(state.selectedTenantPaymentAccounts || []).length
        ? recordTable("Collection accounts (SACCO-owned, read-only)", buildSaccoCollectionAccountReviewRows(state.selectedTenantPaymentAccounts || [], labelize), ["channel", "provider", "accountName", "accountNumber", "branch", "status"])
        : `<div class="notice compact"><span>This SACCO has not configured any collection accounts yet.</span></div>`}
      <form id="tenantStatusForm" class="form-grid single">
        <input type="hidden" id="selectedTenantId" value="${escapeHtml(tenant.id)}">
        <label>
          <span>Approval decision</span>
          <select id="selectedTenantStatus" ${canManage ? "" : "disabled"}>
            ${tenantStatusOptions().map((option) => `<option value="${option.value}" ${option.value === tenant.status ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
        <div class="form-actions">
          ${canManage ? `
            <button class="button primary" type="submit">Save decision</button>
            <button class="button secondary" type="button" data-tenant-status="approved">Approve</button>
            <button class="button secondary" type="button" data-tenant-status="active">Activate</button>
            <button class="button secondary" type="button" data-tenant-status="pending_review">Request changes</button>
            <button class="button ghost" type="button" data-tenant-status="terminated">Reject</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function generatedSaccoCode(name) {
  return generateSaccoCode(name, tenantRows());
}

function updateGeneratedSaccoCode() {
  const input = document.getElementById("newTenantCode");
  const name = value("newTenantName");
  if (input) input.value = generatedSaccoCode(name);
}
