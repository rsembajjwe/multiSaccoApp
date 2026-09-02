function saccoApplications() {
  const applications = buildSaccoApplicationRows({ subscriptions: dataRows("subscriptions"), tenants: tenantRows() });
  return `
    ${saccoRegistrationTabs()}
    ${saccoRegistrationTabContent(applications)}
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
    const filteredApplications = filterSaccoApplications(applications);
    return `
      ${tenantDetailPanel()}
      ${saccoApplicationFilters(applications)}
      ${recordTable(t("saccoApplicationList"), filteredApplications, ["saccoCode", "name", "country", "currencyCode", "district", "registrationNo", "registeredOn", "paymentStage", "approvalStage", "operatingAccess", "status"], { hideSearch: true })}
    `;
  }
  if (state.saccoRegistrationTab === "self") return selfRegistrationApprovalPanel();
  return platformSaccoRegistrationPanel();
}

function saccoApplicationFilters(applications) {
  const approvalStages = uniqueRegistrationFilterOptions(applications, "approvalStage");
  const operatingAccess = uniqueRegistrationFilterOptions(applications, "operatingAccess");
  const registrationYears = uniqueRegistrationYears(applications);
  return `
    <section class="panel compact-panel">
      <div class="filter-toolbar compact-filter-toolbar">
        <label>
          <span>Approval stage</span>
          <select id="saccoApplicationApprovalFilter">
            <option value="">All approval stages</option>
            ${approvalStages.map((value) => `<option value="${escapeHtml(value)}" ${state.saccoApplicationApprovalFilter === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Operating access</span>
          <select id="saccoApplicationAccessFilter">
            <option value="">All operating access</option>
            ${operatingAccess.map((value) => `<option value="${escapeHtml(value)}" ${state.saccoApplicationAccessFilter === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Registration year</span>
          <select id="saccoApplicationYearFilter">
            <option value="">All years</option>
            ${registrationYears.map((value) => `<option value="${escapeHtml(value)}" ${state.saccoApplicationYearFilter === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Registration month</span>
          <select id="saccoApplicationMonthFilter">
            <option value="">All months</option>
            ${registrationMonthOptions().map((option) => `<option value="${escapeHtml(option.value)}" ${state.saccoApplicationMonthFilter === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
          </select>
        </label>
        <button class="button secondary" type="button" data-action="clear-sacco-application-filters">Clear filters</button>
      </div>
    </section>
  `;
}

function uniqueRegistrationFilterOptions(rows, key) {
  return Array.from(new Set((rows || []).map((row) => String(row[key] || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function uniqueRegistrationYears(rows) {
  return Array.from(new Set((rows || []).map((row) => registrationDatePart(row, 0)).filter(Boolean))).sort((a, b) => b.localeCompare(a));
}

function registrationMonthOptions() {
  return [
    ["01", "January"],
    ["02", "February"],
    ["03", "March"],
    ["04", "April"],
    ["05", "May"],
    ["06", "June"],
    ["07", "July"],
    ["08", "August"],
    ["09", "September"],
    ["10", "October"],
    ["11", "November"],
    ["12", "December"]
  ].map(([value, label]) => ({ value, label }));
}

function filterSaccoApplications(applications) {
  const approval = normal(state.saccoApplicationApprovalFilter);
  const access = normal(state.saccoApplicationAccessFilter);
  const year = String(state.saccoApplicationYearFilter || "");
  const month = String(state.saccoApplicationMonthFilter || "");
  return (applications || []).filter((row) => {
    const matchesApproval = !approval || normal(row.approvalStage) === approval;
    const matchesAccess = !access || normal(row.operatingAccess) === access;
    const matchesYear = !year || registrationDatePart(row, 0) === year;
    const matchesMonth = !month || registrationDatePart(row, 1) === month;
    return matchesApproval && matchesAccess && matchesYear && matchesMonth;
  });
}

function registrationDatePart(row, index) {
  const value = String(row.registeredOn || row.createdAt || row.registeredAt || row.submittedAt || row.updatedAt || "");
  if (!value) return "";
  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return index === 0 ? isoMatch[1] : index === 1 ? isoMatch[2] : isoMatch[3];
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) {
    if (index === 0) return String(date.getFullYear());
    if (index === 1) return String(date.getMonth() + 1).padStart(2, "0");
    return String(date.getDate()).padStart(2, "0");
  }
  const yearMatch = value.match(/\b(20\d{2}|19\d{2})\b/);
  return index === 0 && yearMatch ? yearMatch[1] : "";
}

function platformSaccoRegistrationPanel() {
  const packages = dataRows("subscriptionPackages");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("platformSaccoRegistration")}</h2>
          <p>Platform administrators can create a SACCO record directly. Paid registrations activate for the subscription year; unpaid registrations get one month for setup and testing, then data entry stops until subscription payment is completed.</p>
        </div>
      </div>
      ${state.tenantFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.tenantFormMessage)}</strong></div>` : ""}
      ${state.tenantFormError ? `<div class="notice warning"><strong>Could not register SACCO.</strong><span>${escapeHtml(state.tenantFormError)}</span></div>` : ""}
      <form id="platformSaccoForm" class="form-grid">
        <label><span>SACCO name</span><input id="newTenantName" required placeholder="e.g. Tereka Farmers SACCO"></label>
        <label><span>SACCO code</span><input id="newTenantCode" readonly maxlength="4" placeholder="Auto-generated 4-letter code"></label>
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
          <option value="pending">Not paid - activate one-month setup trial</option>
        </select></label>
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
      ${subscription ? recordTable("Subscription readiness", [{
        invoice: subscription.invoice,
        packageName: subscription.tierLabel || subscription.packageId,
        amount: subscription.amount,
        paid: subscription.paid,
        balanceDue: Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0)),
        paidMemberCapacity: subscription.paidMemberCapacity || 0,
        inactiveMemberOverflow: subscription.inactiveMemberOverflow || 0,
        paymentStage: saccoPaymentStageFor(tenant || {}, subscription),
        approvalStage: saccoApprovalStageFor(tenant || {}, subscription),
        operatingAccess: subscriptionAccessLabelFor(subscription || {}, tenant || {}),
        expiry: subscription.expiry
      }], ["invoice", "packageName", "amount", "paid", "balanceDue", "paidMemberCapacity", "inactiveMemberOverflow", "paymentStage", "approvalStage", "operatingAccess", "expiry"]) : ""}
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
            <button class="button secondary" type="button" data-tenant-status="active">Activate</button>
            <button class="button secondary" type="button" data-tenant-status="inactive">Deactivate</button>
            <button class="button secondary" type="button" data-tenant-status="suspended">Suspend</button>
            <button class="button secondary" type="button" data-tenant-status="active">Unsuspend</button>
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
