// SACCO and platform settings rendering and collection-mode actions extracted from app.js.

function settingsView() {
  if (isPlatform()) return platformSettingsView();
  const branches = dataRows("branches");
  const products = dataRows("financialProducts");
  const accounts = dataRows("financialAccounts");
  const model = buildSaccoSettingsModel({ accounts, branches, labelize, products });
  const tab = state.saccoSettingsTab || "overview";
  const security = state.data.securitySummary || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("activeBranches"), model.activeBranches, "Service points ready for use", "Manage")}
      ${summary(t("activeProducts"), model.activeProducts, t("savingsSharesWelfare"), "Configure")}
      ${summary(t("productCoverage"), model.productCoverage, model.productCoverageDetail, t("review"))}
      ${summary(t("roles"), dataRows("roles").length, "Access profiles", t("review"))}
    </div>
    ${saccoSettingsTabs(tab)}
    ${tab === "overview" ? `
      ${paymentCollectionSettingsPanel(dataRows("tenants").find((item) => item.id === state.user?.tenantId) || {})}
      ${saccoSettingsControlPanel(branches, products, accounts, model.missingProducts)}
      ${settingsReadinessPanel(model.readiness)}
    ` : ""}
    ${tab === "membership" ? membershipCalendarSettingsPanel() : ""}
    ${tab === "branding" ? saccoLogoSettingsPanel() : ""}
    ${tab === "mobile-approval" ? mobileNumberApprovalSettingsPanel() : ""}
    ${tab === "branches" ? branchSetupPanel() : ""}
    ${tab === "funds" ? fundTypesSetupPanel() : ""}
    ${tab === "products" ? financialProductSetupPanel() : ""}
    ${tab === "records" ? `
      ${recordTable("Branch setup", branches.map((branch) => ({ ...branch, manager: userName(branch.managerUserId) })), ["code", "name", "manager", "address", "status", "createdAt"])}
      ${recordTable("Financial product setup", products, ["productType", "code", "name", "contributionAmount", "minimumBalance", "interestRate", "status"])}
    ` : ""}
    ${tab === "security" ? staffSecuritySettingsPanel(security, false) : ""}
  `;
}

function saccoSettingsTabs(activeTab) {
  const tabs = [
    ["overview", t("settingsOverview")],
    ["membership", "Membership calendar"],
    ["branding", "SACCO logo"],
    ["mobile-approval", "Mobile number approval"],
    ["branches", t("branchSetup")],
    ["funds", "Fund sources"],
    ["products", t("productSetup")],
    ["records", t("setupRecords")],
    ["security", t("security")]
  ];
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-sacco-settings-tab="${id}">${label}</button>`).join("")}
    </div>
  `;
}

function saccoLogoSettingsPanel() {
  const canManage = hasPermission("sacco-profile:manage") || hasPermission("tenants:manage") || ["admin", "chairperson"].includes(roleKind());
  const logo = currentSaccoLogoUrl();
  const isEmbedded = /^data:image\//i.test(logo);
  const preview = logo
    ? `<div class="document-preview"><img src="${escapeHtml(logo)}" alt="SACCO logo preview"></div>`
    : `<div class="document-preview empty">No SACCO logo added</div>`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO logo</h2>
          <p>Add the official SACCO logo used on member registration forms and printed records.</p>
        </div>
        <span class="status ${logo ? "active" : "pending"}">${logo ? "Logo ready" : "Missing logo"}</span>
      </div>
      ${state.saccoLogoMessage ? `<div class="notice compact"><strong>${escapeHtml(state.saccoLogoMessage)}</strong></div>` : ""}
      ${state.saccoLogoError ? `<div class="notice warning"><strong>Logo not saved.</strong><span>${escapeHtml(state.saccoLogoError)}</span></div>` : ""}
      <div class="detail-layout">
        <div>
          ${preview}
          <p class="helper-text">Use a clear square PNG or JPEG. The saved logo appears on member registration PDF forms.</p>
          <div class="mini-grid">
            ${mini("Step 1", "Choose logo")}
            ${mini("Step 2", "Save SACCO logo")}
            ${mini("Step 3", "Export member form")}
          </div>
        </div>
        <form id="saccoLogoForm" class="form-grid">
          <label class="wide"><span>Upload SACCO logo</span><input id="saccoLogoFile" type="file" accept="image/png,image/jpeg,image/webp" ${canManage ? "" : "disabled"}></label>
          <label class="wide"><span>Or paste logo URL</span><input id="saccoLogoUrl" type="url" value="${escapeHtml(isEmbedded ? "" : logo)}" placeholder="https://example.com/sacco-logo.png" ${canManage ? "" : "readonly"}></label>
          <div class="form-actions inline">
            <button class="button primary" type="button" data-save-sacco-logo="1" ${canManage ? "" : "disabled"}>Save SACCO logo</button>
            <button class="button secondary" type="button" data-clear-sacco-logo="1" ${canManage && logo ? "" : "disabled"}>Remove logo</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function saccoLogoStorageKey() {
  return `tereka-sacco-logo:${state.user?.tenantId || state.tenant?.id || "current"}`;
}

function currentSaccoLogoUrl() {
  try {
    return localStorage.getItem(saccoLogoStorageKey()) || "";
  } catch {
    return "";
  }
}

async function saveSaccoLogoSettings(clear = false) {
  state.saccoLogoMessage = "";
  state.saccoLogoError = "";
  try {
    if (clear) {
      localStorage.removeItem(saccoLogoStorageKey());
      state.saccoLogoMessage = "SACCO logo removed.";
      renderShell();
      return;
    }
    const logoInput = document.getElementById("saccoLogoFile");
    const file = logoInput instanceof HTMLInputElement ? logoInput.files?.[0] : null;
    const url = value("saccoLogoUrl").trim();
    if (file) {
      if (!String(file.type || "").startsWith("image/")) throw new Error("Choose a PNG or JPEG logo image.");
      if (file.size > 350 * 1024) throw new Error("Logo must be 350 KB or smaller.");
      localStorage.setItem(saccoLogoStorageKey(), await blobToDataUrl(file));
    } else if (url) {
      localStorage.setItem(saccoLogoStorageKey(), url);
    } else {
      throw new Error("Upload a logo or paste a logo URL.");
    }
    state.saccoLogoMessage = "SACCO logo saved for printed forms.";
  } catch (error) {
    state.saccoLogoError = error.message || "Could not save SACCO logo.";
  }
  renderShell();
}

function mobileApprovalStorageKey() {
  return `tereka-mobile-number-approval:${state.user?.tenantId || state.tenant?.id || "current"}`;
}

function currentMobileApprovalRecord() {
  try {
    return JSON.parse(localStorage.getItem(mobileApprovalStorageKey()) || "{}") || {};
  } catch {
    return {};
  }
}

function mobileNumberApprovalSettingsPanel() {
  const canManage = hasPermission("sacco-profile:manage") || ["admin", "chairperson"].includes(roleKind());
  const record = currentMobileApprovalRecord();
  const uploaded = Boolean(record.fileName || record.fileDataUrl);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile number approval</h2>
          <p>Download the approval form, let SACCO leaders sign with their contacts, then upload the signed copy before mobile-money collection goes live.</p>
        </div>
        <span class="status ${uploaded ? "active" : "pending"}">${uploaded ? "Signed copy uploaded" : "Signed copy needed"}</span>
      </div>
      ${state.mobileApprovalMessage ? `<div class="notice compact"><strong>${escapeHtml(state.mobileApprovalMessage)}</strong></div>` : ""}
      ${state.mobileApprovalError ? `<div class="notice warning"><strong>Mobile approval not saved.</strong><span>${escapeHtml(state.mobileApprovalError)}</span></div>` : ""}
      <div class="source-grid compact">
        ${mini("SACCO", contextName())}
        ${mini("Approved provider", record.provider || "Not recorded")}
        ${mini("Approved mobile number", record.mobileNumber || "Not recorded")}
        ${mini("Signed document", uploaded ? record.fileName || "Uploaded" : "Missing")}
      </div>
      <form id="mobileApprovalForm" class="form-grid">
        <label><span>Mobile-money provider</span><select id="mobileApprovalProvider" ${canManage ? "" : "disabled"}>
          ${["MTN", "Airtel"].map((provider) => `<option value="${provider}" ${record.provider === provider ? "selected" : ""}>${provider}</option>`).join("")}
        </select></label>
        <label><span>Approved SACCO mobile number</span><input id="mobileApprovalNumber" value="${escapeHtml(record.mobileNumber || "")}" placeholder="+256..." ${canManage ? "" : "readonly"}></label>
        <label><span>Chairperson name</span><input id="mobileApprovalChairName" value="${escapeHtml(record.chairName || "")}" ${canManage ? "" : "readonly"}></label>
        <label><span>Chairperson contact</span><input id="mobileApprovalChairContact" value="${escapeHtml(record.chairContact || "")}" ${canManage ? "" : "readonly"}></label>
        <label><span>Secretary name</span><input id="mobileApprovalSecretaryName" value="${escapeHtml(record.secretaryName || "")}" ${canManage ? "" : "readonly"}></label>
        <label><span>Secretary contact</span><input id="mobileApprovalSecretaryContact" value="${escapeHtml(record.secretaryContact || "")}" ${canManage ? "" : "readonly"}></label>
        <label><span>Treasurer name</span><input id="mobileApprovalTreasurerName" value="${escapeHtml(record.treasurerName || "")}" ${canManage ? "" : "readonly"}></label>
        <label><span>Treasurer contact</span><input id="mobileApprovalTreasurerContact" value="${escapeHtml(record.treasurerContact || "")}" ${canManage ? "" : "readonly"}></label>
        <label class="wide"><span>Upload signed approval copy</span><input id="mobileApprovalFile" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions inline">
          <button class="button secondary" type="button" data-download-mobile-approval="1">Download approval form</button>
          <button class="button primary" type="button" data-save-mobile-approval="1" ${canManage ? "" : "disabled"}>Save signed approval</button>
          <button class="button ghost" type="button" data-clear-mobile-approval="1" ${canManage && uploaded ? "" : "disabled"}>Remove signed copy</button>
        </div>
      </form>
      <p class="helper-text">Keep this signed copy in SACCO records. It proves that the collection number was approved by SACCO leaders and their contacts were captured.</p>
    </section>
  `;
}

function mobileApprovalPayloadFromForm(existing = {}) {
  /** @type {Record<string, any>} */
  const payload = {
    ...existing,
    provider: value("mobileApprovalProvider"),
    mobileNumber: value("mobileApprovalNumber").trim(),
    chairName: value("mobileApprovalChairName").trim(),
    chairContact: value("mobileApprovalChairContact").trim(),
    secretaryName: value("mobileApprovalSecretaryName").trim(),
    secretaryContact: value("mobileApprovalSecretaryContact").trim(),
    treasurerName: value("mobileApprovalTreasurerName").trim(),
    treasurerContact: value("mobileApprovalTreasurerContact").trim(),
    updatedAt: new Date().toISOString()
  };
  return payload;
}

async function saveMobileNumberApproval(clear = false) {
  state.mobileApprovalMessage = "";
  state.mobileApprovalError = "";
  try {
    if (clear) {
      localStorage.removeItem(mobileApprovalStorageKey());
      state.mobileApprovalMessage = "Mobile-number approval record removed.";
      renderShell();
      return;
    }
    const existing = currentMobileApprovalRecord();
    const payload = mobileApprovalPayloadFromForm(existing);
    if (!payload.mobileNumber) throw new Error("Enter the approved SACCO mobile number.");
    const fileInput = document.getElementById("mobileApprovalFile");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
    if (file) {
      if (file.size > 900 * 1024) throw new Error("Signed approval file must be 900 KB or smaller.");
      payload.fileName = file.name;
      payload.fileType = file.type || "application/octet-stream";
      payload.fileDataUrl = await blobToDataUrl(file);
    }
    if (!payload.fileDataUrl && !payload.fileName) throw new Error("Upload the signed approval copy.");
    localStorage.setItem(mobileApprovalStorageKey(), JSON.stringify(payload));
    state.mobileApprovalMessage = "Signed mobile-number approval saved.";
  } catch (error) {
    state.mobileApprovalError = error.message || "Could not save mobile-number approval.";
  }
  renderShell();
}

function downloadMobileNumberApprovalForm() {
  const record = mobileApprovalPayloadFromForm(currentMobileApprovalRecord());
  const date = formatDate(new Date().toISOString());
  const rows = [
    ["SACCO", contextName()],
    ["SACCO code", contextCode()],
    ["Mobile-money provider", record.provider || ""],
    ["Approved SACCO mobile number", record.mobileNumber || ""],
    ["Chairperson", `${record.chairName || ""} / ${record.chairContact || ""}`],
    ["Secretary", `${record.secretaryName || ""} / ${record.secretaryContact || ""}`],
    ["Treasurer", `${record.treasurerName || ""} / ${record.treasurerContact || ""}`],
    ["Generated", date]
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Mobile Number Approval</title>
    <style>
      @page{size:A4 portrait;margin:18mm}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:12px}
      h1,h2{text-align:center;margin:0}h1{font-size:20px}h2{font-size:14px;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:18px}td,th{border:1px solid #111;padding:8px;vertical-align:top}
      .section{margin-top:18px}.line{height:34px;border-bottom:1px solid #111}.signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:22px}
      .footer{position:fixed;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:10px}
    </style></head><body>
      <h1>${escapeHtml(contextName())}</h1><h2>Mobile Money Collection Number Approval Form</h2>
      <table>${rows.map(([label, text]) => `<tr><th style="width:34%;text-align:left">${escapeHtml(label)}</th><td>${escapeHtml(text)}</td></tr>`).join("")}</table>
      <div class="section"><strong>Approval statement</strong><p>We confirm that the mobile-money number above is approved for SACCO collection use. Funds collected through this number belong to the SACCO and must be reconciled in Tereka Online.</p></div>
      <div class="signatures">
        <div><strong>Chairperson</strong><div class="line"></div><small>Name, contact and signature</small></div>
        <div><strong>Secretary</strong><div class="line"></div><small>Name, contact and signature</small></div>
        <div><strong>Treasurer</strong><div class="line"></div><small>Name, contact and signature</small></div>
      </div>
      <div class="footer"><span>Signed SACCO mobile-number approval record</span><span>Powered by Tereka Online</span></div>
    </body></html>`;
  downloadSettingsFile(`${contextCode()}-mobile-number-approval.html`, html, "text/html;charset=utf-8");
  state.mobileApprovalMessage = "Approval form downloaded. Print, sign, scan and upload it here.";
  renderShell();
}

function downloadSettingsFile(filename, content, type) {
  if (typeof downloadClientFile === "function") {
    downloadClientFile(filename, content, type);
    return;
  }
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function membershipCalendarSettingsPanel() {
  const profile = state.data.saccoProfile || {};
  const canManage = hasPermission("sacco-profile:manage") || hasPermission("tenants:manage") || ["admin", "chairperson"].includes(roleKind());
  const period = normalizeMembershipPeriod(profile.membershipDuesPeriod || "annual");
  const month = Number(profile.membershipCalendarStartMonth || 1);
  const day = Number(profile.membershipCalendarStartDay || 1);
  const amount = Number(profile.membershipSubscriptionAmount || 5000);
  const periodLabel = membershipPeriodLabel(period);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Membership calendar</h2>
          <p>The Chairperson sets how this SACCO charges membership fees. New member dues follow this policy automatically.</p>
        </div>
        <span class="status ${canManage ? "active" : "pending"}">${canManage ? "Chairperson control" : "View only"}</span>
      </div>
      ${state.saccoProfileMessage ? `<div class="notice compact"><strong>${escapeHtml(state.saccoProfileMessage)}</strong></div>` : ""}
      ${state.saccoProfileError ? `<div class="notice warning"><strong>Could not save calendar.</strong><span>${escapeHtml(state.saccoProfileError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Current dues period", periodLabel)}
        ${mini("Subscription amount", money.format(amount))}
        ${mini("Annual calendar start", period === "annual" ? `${monthName(month)} ${day}` : "Not used")}
        ${mini("Policy owner", "Chairperson / SACCO Admin")}
        ${mini("Member subscription rule", membershipPolicyDescription(period, month, day))}
      </div>
      <form id="membershipCalendarForm" class="form-grid">
        <label>
          <span>Membership fee period</span>
          <select id="membershipDuesPeriod" ${canManage ? "" : "disabled"}>
            <option value="once" ${period === "once" ? "selected" : ""}>Once - pay once for life</option>
            <option value="monthly" ${period === "monthly" ? "selected" : ""}>Monthly - once every month</option>
            <option value="annual" ${period === "annual" ? "selected" : ""}>Annually - based on SACCO calendar</option>
          </select>
        </label>
        <label><span>Calendar start month</span><select id="membershipCalendarStartMonth" ${canManage ? "" : "disabled"}>${monthOptions(month)}</select></label>
        <label><span>Calendar start day</span><input id="membershipCalendarStartDay" type="number" min="1" max="31" value="${escapeHtml(String(day))}" ${canManage ? "" : "disabled"}></label>
        <label><span>Subscription amount</span><input id="membershipSubscriptionAmount" type="number" min="1" step="0.01" value="${escapeHtml(String(amount))}" ${canManage ? "" : "readonly"}></label>
        <div class="form-actions inline"><button class="button primary" type="button" data-save-membership-calendar="1" ${canManage ? "" : "disabled"}>Save membership calendar</button></div>
      </form>
      <p class="helper-text">Existing dues records keep their current period. New assignments use this SACCO calendar, and fully paid records cannot be paid twice in the same active period.</p>
    </section>
  `;
}

function normalizeMembershipPeriod(period) {
  if (String(period || "").toLowerCase() === "once") return "once";
  if (String(period || "").toLowerCase() === "monthly") return "monthly";
  return "annual";
}

function membershipPeriodLabel(period) {
  if (period === "once") return "Once - lifetime membership";
  if (period === "monthly") return "Monthly";
  return "Annual SACCO calendar";
}

function membershipPolicyDescription(period, month, day) {
  if (period === "once") return "A member pays once and remains paid up for life.";
  if (period === "monthly") return "A member pays once every month.";
  return `A member pays once per SACCO year from ${monthName(month)} ${day}.`;
}

function monthName(month) {
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return names[Math.min(11, Math.max(0, Number(month || 1) - 1))];
}

function monthOptions(selectedMonth) {
  return Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    return `<option value="${value}" ${Number(selectedMonth) === value ? "selected" : ""}>${monthName(value)}</option>`;
  }).join("");
}

async function saveMembershipCalendar() {
  const tenantId = state.user?.tenantId;
  if (!tenantId) return;
  state.saccoProfileMessage = "";
  state.saccoProfileError = "";
  try {
    await api(`/tenants/${encodeURIComponent(tenantId)}/profile`, {
      method: "PATCH",
      body: JSON.stringify({
        membershipDuesPeriod: document.getElementById("membershipDuesPeriod")?.value || "annual",
        membershipCalendarStartMonth: Number(document.getElementById("membershipCalendarStartMonth")?.value || 1),
        membershipCalendarStartDay: Number(document.getElementById("membershipCalendarStartDay")?.value || 1),
        membershipSubscriptionAmount: Number(document.getElementById("membershipSubscriptionAmount")?.value || 5000)
      })
    });
    await refreshAll();
    state.saccoSettingsTab = "membership";
    state.saccoProfileMessage = "Membership calendar saved. New member dues will follow this SACCO policy.";
  } catch (error) {
    state.saccoProfileError = error.message || "Unable to save membership calendar.";
  }
  renderShell();
}

function saccoSettingsControlPanel(branches, products, accounts, missingProducts) {
  return compactControlPanel(t("saccoSettingsControl"), "Confirm branches, contribution products and collection accounts before members transact.", buildSaccoSettingsControlRows({ accounts, branches, labelize, missingProducts, products }));
}

function settingsReadinessPanel(readiness) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO operating settings</h2>
          <p>Controls used by member onboarding, transactions, product accounts and branch reporting.</p>
        </div>
        <span class="status ${readiness.ready ? "active" : "pending"}">${readiness.ready ? "Ready" : "Setup needed"}</span>
      </div>
      <div class="source-grid">
        ${mini("Active branches", readiness.activeBranches)}
        ${mini("Savings products", readiness.savingsProducts)}
        ${mini("Share products", readiness.sharesProducts)}
        ${mini("Welfare products", readiness.welfareProducts)}
        ${mini("Open accounts", readiness.openAccounts)}
        ${mini("Inactive products", readiness.inactiveProducts)}
      </div>
    </section>
  `;
}

function branchSetupPanel() {
  const canManage = hasPermission("roles:create") || roleKind() === "admin";
  const tenantId = state.user?.tenantId || state.currentTenantId || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Branch setup</h2>
          <p>Create service points used by member registration, transactions and reports.</p>
        </div>
      </div>
      ${state.branchFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.branchFormMessage)}</strong></div>` : ""}
      ${state.branchFormError ? `<div class="notice warning"><strong>Branch setup failed.</strong><span>${escapeHtml(state.branchFormError)}</span></div>` : ""}
      <form class="form-grid" id="branchSetupForm">
        <input type="hidden" id="newBranchTenantId" value="${escapeHtml(tenantId)}">
        <label><span>Branch code</span><input id="newBranchCode" placeholder="HQ" required ${canManage ? "" : "disabled"}></label>
        <label><span>Branch name</span><input id="newBranchName" placeholder="Main branch" required ${canManage ? "" : "disabled"}></label>
        <label><span>Address</span><input id="newBranchAddress" placeholder="Town, district or street" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="newBranchStatus" ${canManage ? "" : "disabled"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <div class="form-actions"><button class="button primary" type="submit" ${canManage ? "" : "disabled"}>Create branch</button></div>
      </form>
    </section>
  `;
}

function fundTypeOptions() {
  const rows = dataRows("fundTypes").filter((fund) => fund.active !== false);
  const list = rows.length ? rows : [{ code: "savings", name: "Savings" }, { code: "shares", name: "Shares" }, { code: "welfare", name: "Welfare" }];
  return list.map((fund) => `<option value="${escapeHtml(fund.code)}">${escapeHtml(fund.name || labelize(fund.code))}</option>`).join("");
}

function fundTypesSetupPanel() {
  const canManage = hasPermission("fund-types:manage");
  const funds = dataRows("fundTypes").slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const editing = state.selectedFundTypeId ? funds.find((fund) => fund.id === state.selectedFundTypeId) : null;
  const value = editing || {};
  const basisOptions = ["savings", "shares", "welfare"]
    .map((basis) => `<option value="${basis}" ${value.basis === basis ? "selected" : ""}>${escapeHtml(labelize(basis))}</option>`)
    .join("");
  const rowItem = (fund) => `
    <div class="collection-account-row">
      <div>
        <strong>${escapeHtml(fund.name || labelize(fund.code))}</strong>
        <span>Code: ${escapeHtml(fund.code)} / behaves like ${escapeHtml(labelize(fund.basis || ""))}${fund.system ? " / built-in" : ""}${fund.active === false ? " / inactive" : ""}</span>
        ${fund.description ? `<small>${escapeHtml(fund.description)}</small>` : ""}
      </div>
      ${canManage ? `<button class="button ghost" type="button" data-edit-fund-type="${escapeHtml(fund.id)}">Edit</button>` : ""}
    </div>`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Fund sources</h2>
          <p>Savings, Shares and Welfare are built in. Add custom funds (Burial, Education, ...) — each behaves like a base fund and gives members a separate balance.</p>
        </div>
        ${editing ? `<button class="button ghost" type="button" data-cancel-fund-type="1">Cancel edit</button>` : ""}
      </div>
      ${state.fundTypeMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fundTypeMessage)}</strong></div>` : ""}
      ${state.fundTypeError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.fundTypeError)}</span></div>` : ""}
      <div class="collection-account-list">
        ${funds.length ? funds.map(rowItem).join("") : `<div class="notice compact"><span>No fund types yet.</span></div>`}
      </div>
      ${canManage ? `
      <form id="fundTypeForm" class="form-grid">
        <label><span>Fund name</span><input id="ftName" value="${escapeHtml(value.name || "")}" placeholder="e.g. Burial Fund"></label>
        <label><span>Code (optional)</span><input id="ftCode" value="${escapeHtml(value.code || "")}" placeholder="Generated from the fund name" ${editing ? "disabled" : ""}><small>Spaces and capital letters are accepted.</small></label>
        <label><span>Behaves like</span><select id="ftBasis" ${editing && editing.system ? "disabled" : ""}>${basisOptions}</select></label>
        <label><span>Active</span><select id="ftActive"><option value="true" ${value.active === false ? "" : "selected"}>Active</option><option value="false" ${value.active === false ? "selected" : ""}>Inactive</option></select></label>
        <label class="wide"><span>Description (optional)</span><input id="ftDescription" value="${escapeHtml(value.description || "")}" placeholder="Purpose of this fund"></label>
        <div class="form-actions inline">
          <button class="button primary" type="button" data-save-fund-type="${escapeHtml(editing ? editing.id : "")}">${editing ? "Update fund" : "Add fund"}</button>
        </div>
      </form>` : `<div class="notice compact"><span>You have review-only access to fund sources.</span></div>`}
    </section>
  `;
}

function financialProductSetupPanel() {
  const canManage = hasPermission("fund-types:manage");
  const tenantId = state.user?.tenantId || state.currentTenantId || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Contribution product setup</h2>
          <p>Configure the savings, shares and welfare products members can use.</p>
        </div>
      </div>
      ${state.productFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.productFormMessage)}</strong></div>` : ""}
      ${state.productFormError ? `<div class="notice warning"><strong>Product setup failed.</strong><span>${escapeHtml(state.productFormError)}</span></div>` : ""}
      <form class="form-grid" data-product-form>
        <input type="hidden" data-product-field="tenantId" value="${escapeHtml(tenantId)}">
        <label><span>Fund / product type</span><select data-product-field="productType" ${canManage ? "" : "disabled"}>${fundTypeOptions()}</select></label>
        <label><span>Product code</span><input data-product-field="code" placeholder="SAV-MONTHLY" required ${canManage ? "" : "disabled"}></label>
        <label><span>Product name</span><input data-product-field="name" placeholder="Monthly savings" required ${canManage ? "" : "disabled"}></label>
        <label><span>Contribution amount</span><input data-product-field="contributionAmount" type="number" min="0" value="5000" required ${canManage ? "" : "disabled"}></label>
        <label><span>Minimum balance</span><input data-product-field="minimumBalance" type="number" min="0" value="0" required ${canManage ? "" : "disabled"}></label>
        <label><span>Interest rate</span><input data-product-field="interestRate" type="number" min="0" step="0.1" value="0" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions"><button class="button primary" type="submit" ${canManage ? "" : "disabled"}>Create product</button></div>
      </form>
    </section>
  `;
}

function platformSettingsView() {
  const packages = dataRows("subscriptionPackages");
  const roles = dataRows("roles").filter((role) => role.tenantId === "tenant_platform");
  const permissions = dataRows("permissions");
  const templates = dataRows("notificationTemplates").filter((template) => !template.tenantId);
  const canManage = hasPermission("roles:create") || roleKind() === "super";
  const settingsTabs = [
    ["profile", "Platform Profile"],
    ["access", "Access & Roles"],
    ["billing", "Billing & Packages"],
    ["notifications", "Notifications"],
    ["security", t("security")],
    ["backup", "Backup & Recovery"]
  ];
  const tab = activeModuleTab("settings", settingsTabs);
  const security = state.data.securitySummary || {};
  return `
    <div class="system-settings-workspace">
      <section class="system-settings-heading">
        <div><p class="eyebrow">Platform Administration / System Settings</p><h2>System Settings</h2><p>Configure platform identity, access, billing, security and operational preferences.</p></div>
        <div class="table-actions"><button class="button secondary" type="button" data-export-view="settings">Export Settings</button><span class="status ${canManage ? "active" : "pending"}">${canManage ? "Protected changes enabled" : "View only"}</span></div>
      </section>
      <section class="panel system-settings-tabs">${moduleTabs("settings", settingsTabs, tab)}</section>
      ${tab === "profile" ? `<div class="system-profile-layout"><div>${platformProfileSettingsPanel(canManage)}</div><aside>${platformOverviewPanel(packages, roles, permissions, templates)}${platformSystemHealthCard()}</aside></div>${platformQuickConfigurationPanel(packages, roles, permissions, templates)}` : ""}
      ${tab === "access" ? platformRolesPermissionSettingsPanel(roles, permissions, canManage) : ""}
      ${tab === "billing" ? `${platformBillingSettingsPanel(packages, canManage)}${platformMobileMoneyIntegrationPanel(canManage, { includeReceivingAccounts: false })}${platformMobileMoneyReceivingAccountsPanel(canManage)}${compactControlPanel("SACCO payment accounts", "SACCO-owned collection accounts are managed from each SACCO profile so tenant context and collection permissions remain explicit.", [["Location", "Open SACCOs, select an organization, then manage its payment accounts.", "Moved to SACCO Management"], ["Isolation", "Every account remains scoped to its owning SACCO.", "Enforced"]])}` : ""}
      ${tab === "notifications" ? `${platformNotificationIntegrationPanel(canManage)}${recordTable("Global notification templates", templates, ["eventType", "channel", "title", "status", "updatedAt"])}` : ""}
      ${tab === "security" ? `${staffSecuritySettingsPanel(security, true)}${platformComplianceAuditSettingsPanel()}${platformOperationsHealthSettingsPanel()}` : ""}
      ${tab === "backup" ? platformBackupRecoverySettingsPanel() : ""}
    </div>
  `;
}

function platformProfileSettingsPanel(canManage) {
  const tenant = state.tenant || tenantRows().find((item) => item.id === state.user?.tenantId) || {};
  const profile = state.data.saccoProfile || {};
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Platform profile settings</h2>
          <p>Global identity, contact and operating posture for the SACCO platform.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin editable</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("App name", "Tereka Online")}
        ${mini("Default platform code", "PLATFORM")}
        ${mini("Default country", "Uganda")}
        ${mini("Default currency", "UGX")}
        ${mini("Timezone", "Africa/Kampala")}
        ${mini("Operating status", "Active")}
      </div>
      ${state.saccoProfileMessage ? `<div class="notice compact"><strong>${escapeHtml(state.saccoProfileMessage)}</strong></div>` : ""}
      ${state.saccoProfileError ? `<div class="notice warning"><strong>Could not save platform profile.</strong><span>${escapeHtml(state.saccoProfileError)}</span></div>` : ""}
      <form id="platformProfileForm" class="form-grid">
        <label><span>Platform display name</span><input value="${escapeHtml(tenant.name || "Tereka Online")}" readonly></label>
        <label><span>Legal entity name</span><input id="platformProfileLegalName" value="${escapeHtml(profile.legalName || "")}" placeholder="Methaltech / platform operator" required ${canManage ? "" : "disabled"}></label>
        <label><span>Support email</span><input id="platformProfileEmail" type="email" value="${escapeHtml(profile.email || "")}" placeholder="support@example.com" ${canManage ? "" : "disabled"}></label>
        <label><span>Support phone</span><input id="platformProfilePhone" value="${escapeHtml(profile.phone || "")}" placeholder="+256..." ${canManage ? "" : "disabled"}></label>
        <label><span>Website</span><input id="platformProfileWebsite" type="url" value="${escapeHtml(profile.website || "")}" placeholder="https://..." ${canManage ? "" : "disabled"}></label>
        <label><span>Operating status</span><input value="${escapeHtml(labelize(tenant.status || "active"))}" readonly></label>
        <label class="wide"><span>Physical address</span><input id="platformProfileAddress" value="${escapeHtml(profile.address || "")}" placeholder="Platform office address" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions wide">
          ${canManage ? `<button class="button primary" type="submit">Save platform profile</button>` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

async function savePlatformProfile(event) {
  event?.preventDefault();
  const tenantId = state.user?.tenantId;
  if (!tenantId) return;
  state.saccoProfileMessage = "";
  state.saccoProfileError = "";
  try {
    await api(`/tenants/${encodeURIComponent(tenantId)}/profile`, {
      method: "PATCH",
      body: JSON.stringify({
        legalName: value("platformProfileLegalName"),
        email: value("platformProfileEmail"),
        phone: value("platformProfilePhone"),
        website: value("platformProfileWebsite"),
        address: value("platformProfileAddress")
      })
    });
    await refreshAll();
    state.moduleTabs.settings = "profile";
    state.saccoProfileMessage = "Platform profile saved and recorded in the audit trail.";
  } catch (error) {
    state.saccoProfileError = error.message || "Unable to save platform profile.";
  }
  renderShell();
}

function platformOverviewPanel(packages, roles, permissions, templates) {
  return `
    <section class="panel platform-overview-card">
      <div class="panel-heading"><div><h2>Platform Overview</h2><p>Current configuration catalogue.</p></div></div>
      <div class="settings-overview-list">
        <div><span>Subscription Packages</span><strong>${packages.length}</strong></div>
        <div><span>Platform Roles</span><strong>${roles.length}</strong></div>
        <div><span>Permission Controls</span><strong>${permissions.length}</strong></div>
        <div><span>Notification Templates</span><strong>${templates.length}</strong></div>
      </div>
    </section>`;
}

function platformSystemHealthCard() {
  const alerts = operationAlerts();
  return `
    <section class="panel system-health-card ${alerts.length ? "attention" : "healthy"}">
      <div><span class="system-health-icon">⌁</span><div><h2>System Health</h2><p>${alerts.length ? `${alerts.length} configuration or provider issue(s) require review.` : "All core services are operational."}</p></div></div>
      <span class="status ${alerts.length ? "pending" : "active"}">${alerts.length ? "Review" : "Healthy"}</span>
    </section>`;
}

function platformQuickConfigurationPanel(packages, roles, permissions, templates) {
  const auditCount = dataRows("auditEvents").length;
  return `
    <section class="panel quick-configuration-panel">
      <div class="panel-heading"><div><h2>Quick Configuration</h2><p>Key platform settings and current readiness.</p></div></div>
      <div class="quick-configuration-grid">
        ${mini("Billing Readiness", `${packages.length} subscription package(s) · ${packages.length ? "Ready" : "Setup needed"}`)}
        ${mini("Administrator Roles", `${roles.length} role(s), ${permissions.length} permission(s)`)}
        ${mini("Protected Changes", `${auditCount} audit event(s) retained`)}
        ${mini("Notifications", `${templates.length} active template(s)`)}
      </div>
    </section>`;
}

function platformSaccoOnboardingSettingsPanel(canManage) {
  const applications = buildSaccoApplicationRows({ subscriptions: dataRows("subscriptions"), tenants: tenantRows() });
  const summaryRows = {
    active: applications.filter((row) => normal(row.operatingAccess) === "active").length,
    callbackReceived: applications.filter((row) => normal(row.paymentStage).includes("callback")).length,
    paymentInitiated: applications.filter((row) => normal(row.paymentStage).includes("initiated")).length,
    readyForApproval: applications.filter((row) => normal(row.approvalStage).includes("ready")).length,
    totalApplications: applications.length
  };
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO registration and onboarding settings</h2>
          <p>Controls for SACCO self-registration, approval, payment readiness and setup trial policy.</p>
        </div>
        ${canManage ? `<span class="status active">Governed onboarding</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("Total applications", summaryRows.totalApplications)}
        ${mini("Ready for approval", summaryRows.readyForApproval)}
        ${mini("Payment initiated", summaryRows.paymentInitiated)}
        ${mini("Callback received", summaryRows.callbackReceived)}
        ${mini("Active SACCOs", summaryRows.active)}
        ${mini("Setup trial", "One month for unpaid setup")}
      </div>
      ${compactControlPanel("Onboarding rule checklist", "Required controls for enterprise SACCO registration.", [
        ["Public self-registration", "SACCOs can submit applications from the public form.", "Enabled"],
        ["Required profile fields", "Legal name, registration number, contact person and location are captured.", "Ready"],
        ["Required documents", "Registration certificate, UMRA license, board resolution and signatory ID are tracked.", "Review"],
        ["Activation policy", "Approval, payment confirmation and operating status gate system access.", "Ready"],
        ["Trial restrictions", "Unpaid SACCOs get setup time before operational data entry is blocked.", "Ready"]
      ])}
      ${recordTable("SACCO onboarding queue", applications, ["saccoCode", "name", "paymentStage", "approvalStage", "operatingAccess", "status"])}
    </section>
  `;
}

function platformSaccoPaymentAccountSettingsPanel(canManage) {
  const rows = tenantRows().map((tenant) => {
    const mode = tenant.allowedCollectionMode || "NONE";
    return {
      ...tenant,
      saccoCode: tenant.abbreviation || tenant.code || tenant.id,
      collectionMode: mode,
      mobileMoneyReadiness: mode === "MOBILE_MONEY_ONLY" || mode === "BOTH" ? "Allowed" : "Not allowed",
      action: "tenant-detail",
      actionLabel: "Manage payment accounts",
      actionId: tenant.id
    };
  });
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO payment account management</h2>
          <p>Create, update and delete each SACCO's MTN and Airtel collection accounts from the SACCO detail view.</p>
        </div>
        ${canManage ? `<span class="status active">Tenant manage permission</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("SACCOs", rows.length)}
        ${mini("Mobile money allowed", rows.filter((row) => row.mobileMoneyReadiness === "Allowed").length)}
        ${mini("Setup needed", rows.filter((row) => row.mobileMoneyReadiness !== "Allowed").length)}
        ${mini("Supported networks", "MTN, Airtel")}
      </div>
      ${compactControlPanel("SACCO payment account rules", "Platform admins manage the SACCO-owned accounts that members pay into.", [
        ["Create", "Add MTN or Airtel number / merchant code for a selected SACCO.", canManage ? "Enabled" : "View only"],
        ["Update", "Edit network, account name, number, instructions and active status.", canManage ? "Enabled" : "View only"],
        ["Delete", "Remove inactive or incorrect SACCO collection accounts.", canManage ? "Enabled" : "View only"],
        ["Collection mode", "Mobile-money accounts are blocked when the SACCO collection mode disallows them.", "Enforced"]
      ])}
      ${recordTable("SACCO payment account setup", rows, ["saccoCode", "name", "district", "collectionMode", "mobileMoneyReadiness", "status"])}
    </section>
  `;
}

function platformRolesPermissionSettingsPanel(roles, permissions, canManage) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Roles and permission settings</h2>
          <p>Platform and SACCO access control, module scope and permission catalogue.</p>
        </div>
        ${canManage ? `<span class="status active">Role admin</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("Platform roles", roles.length)}
        ${mini("Permissions", permissions.length)}
        ${mini("Super Admin protection", "Platform-only")}
        ${mini("Audit coverage", `${dataRows("auditEvents").length} events`)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Platform role catalogue", roles, ["name", "description", "status", "createdAt"])}
      ${recordTable("Platform permission catalogue", permissions, ["id", "name", "description", "module"])}
    </div>
  `;
}

function platformBillingSettingsPanel(packages, canManage) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Subscription and billing settings</h2>
          <p>Packages, pricing, member limits, branch limits, grace periods and expiry behavior.</p>
        </div>
        ${canManage ? `<span class="status active">Billing setup</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("Packages", packages.length)}
        ${mini("Billing cycle", "Annual")}
        ${mini("Grace policy", "Trial / expiry controls")}
        ${mini("Payment route", "Platform receiving accounts")}
      </div>
      ${compactControlPanel("Billing policy checklist", "Enterprise subscription controls for SACCO access.", [
        ["Package limits", "Member and branch limits are defined per package.", packages.length ? "Ready" : "Setup needed"],
        ["Payment before activation", "Paid subscriptions can activate full operating access.", "Ready"],
        ["Expiry behavior", "Expired SACCOs can be moved to restricted access.", "Ready"],
        ["Receiving accounts", "Platform MTN/Airtel accounts hold fee payment instructions.", dataRows("platformPaymentAccounts").length ? "Ready" : "Setup needed"]
      ])}
      ${recordTable("Platform subscription packages", packages, ["name", "code", "price", "amount", "maxMembers", "maxBranches", "status"])}
    </section>
  `;
}

function platformComplianceAuditSettingsPanel() {
  const auditRows = dataRows("auditEvents");
  const privacyRows = dataRows("privacyRequests");
  const documentRows = dataRows("memberDocuments");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Compliance and audit settings</h2>
          <p>Audit retention, sensitive action logging, privacy workflow and KYC document controls.</p>
        </div>
        <span class="status active">Audited</span>
      </div>
      <div class="source-grid">
        ${mini("Audit events", auditRows.length)}
        ${mini("Privacy requests", privacyRows.length)}
        ${mini("KYC documents", documentRows.length)}
        ${mini("Sensitive actions", auditRows.filter((row) => normal(row.riskLevel).includes("high") || normal(row.category).includes("sensitive")).length)}
      </div>
      ${compactControlPanel("Compliance control checklist", "Controls required for enterprise SACCO governance.", [
        ["Audit trail", "Platform and SACCO administrative events are retained.", "Ready"],
        ["Privacy requests", "Access, correction, deletion and export requests are tracked.", privacyRows.length ? "Active" : "Ready"],
        ["Document retention", "KYC files carry retention and disposal metadata.", documentRows.length ? "Active" : "Ready"],
        ["Export controls", "Audit and report exports are permission-gated.", "Ready"]
      ])}
      ${recordTable("Recent platform audit evidence", auditRows.slice(0, 25), ["createdAt", "actor", "tenantName", "action", "module", "result"])}
    </section>
  `;
}

function platformOperationsHealthSettingsPanel() {
  const callbacks = dataRows("mobileMoneyCallbacks");
  const requests = dataRows("mobileMoneyPaymentRequests");
  const deliveries = dataRows("notificationDeliveries");
  const callbackExceptions = callbacks.filter((row) => row.duplicate || !normal(row.status).includes("posted"));
  const pendingRequests = requests.filter((row) => !["posted", "failed", "cancelled", "expired"].includes(normal(row.status)));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>System health and operations settings</h2>
          <p>Provider health, callbacks, failed jobs, duplicate alerts and operational readiness.</p>
        </div>
        <span class="status ${callbackExceptions.length || pendingRequests.length ? "pending" : "active"}">${callbackExceptions.length || pendingRequests.length ? "Review alerts" : "Healthy"}</span>
      </div>
      <div class="source-grid">
        ${mini("API health", "Java API healthy")}
        ${mini("Payment requests", requests.length)}
        ${mini("Pending callbacks", pendingRequests.length)}
        ${mini("Callback exceptions", callbackExceptions.length)}
        ${mini("Notification deliveries", deliveries.length)}
        ${mini("Maintenance mode", "Off")}
      </div>
      ${operationAlerts().length ? recordTable("Operations command center", operationAlerts(), ["title", "provider", "severity", "status", "checkedAt"]) : emptyState("Operations health", "Provider callbacks, notification delivery and health checks are clear.")}
    </section>
  `;
}

function platformBackupRecoverySettingsPanel() {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Backup and recovery settings</h2>
          <p>Continuity controls for backup frequency, retention, restore verification and disaster recovery evidence.</p>
        </div>
        <span class="status pending">Evidence review</span>
      </div>
      <div class="source-grid">
        ${mini("Backup frequency", "Daily target")}
        ${mini("Retention period", "Policy controlled")}
        ${mini("Restore test", "Evidence required")}
        ${mini("DR contact", "Platform operations")}
      </div>
      ${compactControlPanel("Recovery readiness checklist", "Operational evidence expected before production rollout.", [
        ["Backup schedule", "Automated database backups should run on the production database.", "Configure"],
        ["Retention", "Retention period should match compliance and customer contracts.", "Review"],
        ["Restore verification", "A restore test should be recorded after backup setup.", "Evidence needed"],
        ["Disaster recovery", "Escalation contacts and RTO/RPO targets should be documented.", "Review"]
      ])}
    </section>
  `;
}

function platformNotificationIntegrationPanel(canManage) {
  const config = state.data.notificationIntegrationConfig || {};
  const providers = Array.isArray(config.providers) ? config.providers : [];
  const statusRows = state.notificationProviderStatus || [];
  const rows = buildNotificationProviderRows({ providers, statusRows, labelize });
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Notification integrations</h2>
          <p>Super Admin visibility for AfroSMS and Gmail SMTP setup. Secrets stay in the server environment.</p>
        </div>
        <div class="table-actions">
          <button class="button secondary" type="button" data-action="check-notification-provider-status" ${canManage ? "" : "disabled"}>Check provider status</button>
        </div>
      </div>
      ${config.updatePolicy ? `<p class="helper-text">${escapeHtml(config.updatePolicy)}</p>` : ""}
      <div class="source-grid">
        ${mini("SMS provider", notificationProviderNameFor(config, "sms"))}
        ${mini("Email provider", notificationProviderNameFor(config, "email"))}
        ${mini("Last status check", state.notificationProviderStatusCheckedAt ? formatDateTime(state.notificationProviderStatusCheckedAt) : "Not checked")}
        ${mini("Live risks", notificationProviderRiskRows().length)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Notification provider setup", rows, ["channel", "provider", "activeProvider", "active", "liveStatus", "balance", "missingSettings"])}
      ${recordTable("Required notification environment variables", buildProviderEnvironmentRows(providers, "channel"), ["channel", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformMobileMoneyIntegrationPanel(canManage, options = {}) {
  const config = state.data.mobileMoneyIntegrationConfig || {};
  const providers = Array.isArray(config.providers) ? config.providers : [];
  const callbacks = dataRows("mobileMoneyCallbacks");
  const requests = dataRows("mobileMoneyPaymentRequests");
  const rows = buildMobileMoneyProviderRows(providers);
  const integration = buildMobileMoneyIntegrationSummary({ callbacks, providers, requests });
  const activeProvider = mobileMoneySettingValue(providers, "SACCO_MOBILE_MONEY_PROVIDER", "mtn_momo");
  const requireSignedCallbacks = mobileMoneySettingValue(providers, "SACCO_MOBILE_MONEY_REQUIRE_SIGNED_CALLBACKS", "false") === "true";
  const mtnApiUserId = mobileMoneySettingValue(providers, "SACCO_MTN_MOMO_API_USER_ID", "");
  const mtnTargetEnvironment = mobileMoneySettingValue(providers, "SACCO_MTN_MOMO_TARGET_ENVIRONMENT", "sandbox");
  const airtelClientId = mobileMoneySettingValue(providers, "SACCO_AIRTEL_MONEY_CLIENT_ID", "");
  const airtelCountryCode = mobileMoneySettingValue(providers, "SACCO_AIRTEL_MONEY_COUNTRY_CODE", "UG");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile money integrations</h2>
          <p>Platform Super Admin setup for MTN MoMo and Airtel Money collection keys. M-Pesa is intentionally excluded.</p>
        </div>
        <span class="status ${integration.providerSelected ? "active" : "pending"}">${integration.providerSelected ? "Provider selected" : "Setup needed"}</span>
      </div>
      ${config.updatePolicy ? `<p class="helper-text">${escapeHtml(config.updatePolicy)}</p>` : ""}
      ${state.mobileMoneyConfigMessage ? `<div class="notice compact"><strong>${escapeHtml(state.mobileMoneyConfigMessage)}</strong></div>` : ""}
      ${state.mobileMoneyConfigError ? `<div class="notice warning"><strong>Mobile-money keys not saved.</strong><span>${escapeHtml(state.mobileMoneyConfigError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Active provider", integration.activeProvider)}
        ${mini("Signed callbacks", integration.signedCallbacks)}
        ${mini("Callback secret", integration.callbackSecret)}
        ${mini("Payment requests", integration.paymentRequests)}
        ${mini("Provider callbacks", integration.providerCallbacks)}
        ${mini("Failed callbacks", integration.failedCallbacks)}
      </div>
      <form id="platformMobileMoneyConfigForm" class="form-grid">
        <label><span>Active platform provider</span><select id="mobileMoneyActiveProvider" ${canManage ? "" : "disabled"}>
          ${mobileMoneyProviderOption("mtn_momo", "MTN MoMo", activeProvider)}
          ${mobileMoneyProviderOption("airtel_money", "Airtel Money", activeProvider)}
          ${mobileMoneyProviderOption("demo_mobile_money", "Demo / disabled", activeProvider)}
        </select></label>
        <label class="check-row"><input id="mobileMoneyRequireSignedCallbacks" type="checkbox" ${requireSignedCallbacks ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require signed provider callbacks</span></label>
        <label class="wide"><span>Callback signing secret</span><input id="mobileMoneyCallbackSecret" type="password" autocomplete="new-password" placeholder="${mobileMoneySecretPlaceholder(providers, "SACCO_MOBILE_MONEY_CALLBACK_SECRET")}" ${canManage ? "" : "disabled"}></label>
        <div class="mini-fact wide"><span>Secret handling</span><strong>Leave secret fields blank to keep the encrypted value already stored on the server.</strong></div>
        <label><span>MTN subscription key</span><input id="mtnMomoSubscriptionKey" type="password" autocomplete="new-password" placeholder="${mobileMoneySecretPlaceholder(providers, "SACCO_MTN_MOMO_SUBSCRIPTION_KEY")}" ${canManage ? "" : "disabled"}></label>
        <label><span>MTN API user ID</span><input id="mtnMomoApiUserId" value="${escapeHtml(mtnApiUserId)}" ${canManage ? "" : "disabled"}></label>
        <label><span>MTN API key</span><input id="mtnMomoApiKey" type="password" autocomplete="new-password" placeholder="${mobileMoneySecretPlaceholder(providers, "SACCO_MTN_MOMO_API_KEY")}" ${canManage ? "" : "disabled"}></label>
        <label><span>MTN target environment</span><select id="mtnMomoTargetEnvironment" ${canManage ? "" : "disabled"}>
          ${["sandbox", "mtnuganda", "production"].map((item) => `<option value="${item}" ${normal(mtnTargetEnvironment) === item ? "selected" : ""}>${labelize(item)}</option>`).join("")}
        </select></label>
        <label><span>Airtel client ID</span><input id="airtelMoneyClientId" value="${escapeHtml(airtelClientId)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Airtel client secret</span><input id="airtelMoneyClientSecret" type="password" autocomplete="new-password" placeholder="${mobileMoneySecretPlaceholder(providers, "SACCO_AIRTEL_MONEY_CLIENT_SECRET")}" ${canManage ? "" : "disabled"}></label>
        <label><span>Airtel country code</span><input id="airtelMoneyCountryCode" maxlength="2" value="${escapeHtml(airtelCountryCode)}" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions wide">
          ${canManage ? `<button class="button primary" type="submit">Save platform mobile-money keys</button>` : `<span class="status pending">Only Platform Super Admin can save mobile-money keys</span>`}
        </div>
      </form>
    </section>
    ${options.includeReceivingAccounts === false ? "" : platformMobileMoneyReceivingAccountsPanel(canManage)}
    <div class="grid two">
      ${recordTable("Mobile-money provider setup", rows, ["channel", "provider", "activeProvider", "active", "missingSettings"])}
      ${recordTable("Stored mobile-money key status", buildProviderEnvironmentRows(providers, "provider"), ["provider", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformMobileMoneyReceivingAccountsPanel(canManage) {
  const accounts = buildCollectionAccountDisplayRows(dataRows("platformPaymentAccounts").filter((account) => normal(account.channel) === "mobile_money"), labelize);
  const row = (account) => `
    <div class="collection-account-row">
      <div>
        <strong>${escapeHtml(account.title)}</strong>
        <span>${escapeHtml(account.detail)}</span>
        <small>${escapeHtml(account.active ? "Active" : "Inactive")}${account.instructions ? " / " + escapeHtml(account.instructions) : ""}</small>
      </div>
      ${canManage ? `<button class="button ghost" type="button" data-remove-platform-mobile-money-account="${escapeHtml(account.id)}">Remove</button>` : ""}
    </div>`;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Platform mobile-money receiving accounts</h2>
          <p>MTN and Airtel accounts where platform fees, subscriptions and setup payments are made.</p>
        </div>
        <span class="status ${accounts.length ? "active" : "pending"}">${accounts.length ? `${accounts.length} account(s)` : "Setup needed"}</span>
      </div>
      ${state.collectionAccountMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionAccountMessage)}</strong></div>` : ""}
      ${state.collectionAccountError ? `<div class="notice warning"><strong>Could not save account.</strong><span>${escapeHtml(state.collectionAccountError)}</span></div>` : ""}
      <div class="collection-account-list">
        ${accounts.length ? accounts.map(row).join("") : `<div class="notice compact"><span>No platform mobile-money receiving accounts yet.</span></div>`}
      </div>
      <form id="platformMobileMoneyAccountForm" class="form-grid">
        <label><span>Network</span><select id="platformMobileMoneyNetwork" ${canManage ? "" : "disabled"}><option value="mtn">MTN</option><option value="airtel">Airtel</option></select></label>
        <label><span>Account name</span><input id="platformMobileMoneyAccountName" placeholder="Tereka Online Collections" ${canManage ? "" : "disabled"}></label>
        <label><span>Number / merchant code</span><input id="platformMobileMoneyAccountNumber" placeholder="+256... or merchant code" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Payment instructions</span><input id="platformMobileMoneyInstructions" placeholder="Use invoice or SACCO code as reference" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManage ? `<button class="button secondary" type="button" data-add-platform-mobile-money-account="1">Add platform receiving account</button>` : `<span class="status pending">Only Platform Super Admin can manage platform receiving accounts</span>`}
        </div>
      </form>
    </section>
  `;
}

function mobileMoneyProviderOption(value, label, selected) {
  return `<option value="${value}" ${normal(selected) === normal(value) ? "selected" : ""}>${label}</option>`;
}

function mobileMoneySetting(providers, key) {
  return providers.flatMap((provider) => provider.settings || []).find((setting) => setting.key === key) || {};
}

function mobileMoneySettingValue(providers, key, fallback = "") {
  const setting = mobileMoneySetting(providers, key);
  const storedValue = setting.secret ? "" : setting.value;
  return storedValue && storedValue !== "Not configured" ? String(storedValue) : fallback;
}

function mobileMoneySecretPlaceholder(providers, key) {
  return mobileMoneySetting(providers, key).configured ? "Already configured" : "Enter secret";
}

function platformSettingsControlPanel(packages, roles, permissions, templates, canManage) {
  return compactControlPanel(t("platformSettingsControl"), "Manage protected platform configuration for packages, roles, permissions and global templates.", buildPlatformSettingsControlRows({ canManage, packages, permissions, roles, templates }));
}

function staffSecuritySettingsPanel(security, platformScope) {
  const policy = state.data.platformSecurityPolicy || defaultPlatformSecurityPolicy();
  const model = buildStaffSecuritySettingsModel({ currentSessionExpiresAt: state.sessionExpiresAt, formatDateTime, security });
  return `
    <div class="dashboard-grid">
      ${summary("Active sessions", model.activeCount, "Current administrator login devices", "Review")}
      ${summary("MFA status", security.mfaEnabled ? "Enabled" : "Not enabled", "Step-up verification for sensitive login", "Manage")}
      ${summary("Password resets", model.resetCount, "Requests recorded for this administrator", "Audit")}
      ${summary("Session expiry", model.currentExpiry ? formatDateTime(model.currentExpiry) : "Not reported", "Current token lifetime", "Extend")}
    </div>
    ${compactControlPanel(platformScope ? "Platform security settings" : "SACCO security settings", "Review administrator sessions, MFA, password resets and lockout policy evidence.", [
      ["Active sessions", `${model.activeCount} active staff session(s) are server-side and expire automatically.`, model.activeCount ? "Monitor" : "None"],
      ["MFA posture", security.mfaEnabled ? "MFA is enabled for this administrator account." : "MFA is not yet enabled for this administrator account.", security.mfaEnabled ? "Ready" : "Improve"],
      ["Password reset evidence", `${model.resetCount} password reset request(s) are available in the audit trail for this account.`, model.resetCount ? "Trace" : "No resets"],
      ["Session lifecycle audit", "Login, logout and session extension events are recorded under access control audit evidence.", "Audited"]
    ])}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Security Settings</h2>
          <p>Administrator session, MFA and password-reset evidence for the current login.</p>
        </div>
        <div class="table-actions">
          <button class="button secondary" type="button" data-action="toggle-current-mfa" data-mfa-enabled="${security.mfaEnabled ? "false" : "true"}">${security.mfaEnabled ? "Disable MFA" : "Enable MFA"}</button>
          <button class="button secondary" type="button" data-action="extend-session">Extend session</button>
        </div>
      </div>
      <div class="source-grid">
        ${mini("Signed in as", state.user?.email || state.user?.fullName || "Administrator")}
        ${mini("Role", state.roleNames.join(", ") || "Assigned role")}
        ${mini("MFA", security.mfaEnabled ? "Enabled" : "Not enabled")}
        ${mini("Current expiry", model.currentExpiry ? formatDateTime(model.currentExpiry) : "Not reported")}
        ${mini("Active sessions", model.activeCount)}
        ${mini("Password resets", model.resetCount)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Active administrator sessions", model.sessionRows, ["id", "createdAt", "expiresAt", "status"])}
      ${recordTable("Password reset history", model.resetRows, ["id", "status", "createdAt", "expiresAt", "usedAt"])}
    </div>
    ${platformScope ? platformPasswordPolicyPanel(policy) : ""}
  `;
}

function compactControlPanel(title, copy, rows) {
  const needsReview = rows.some((row) => ["review", "configure", "setup needed", "improve", "incomplete"].includes(normal(row[2])));
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
        ${rows.map(([label, detail, status]) => mini(label, `${detail} ${status ? `(${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}

function platformPasswordPolicyPanel(policy) {
  const canManage = hasPermission("roles:create") || roleKind() === "super";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Password and lockout policy</h2>
          <p>Controls staff password strength, reset validation and failed-login lockout thresholds.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin editable</span>` : `<span class="status pending">View only</span>`}
      </div>
      ${state.platformPolicyMessage ? `<div class="notice compact"><strong>${escapeHtml(state.platformPolicyMessage)}</strong></div>` : ""}
      ${state.platformPolicyError ? `<div class="notice warning"><strong>Policy update failed.</strong><span>${escapeHtml(state.platformPolicyError)}</span></div>` : ""}
      <form id="platformSecurityPolicyForm" class="form-grid">
        <label><span>Minimum password length</span><input id="policyMinimumPasswordLength" type="number" min="8" max="64" value="${escapeHtml(policy.minimumPasswordLength ?? 10)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Password expiry days</span><input id="policyPasswordExpiryDays" type="number" min="0" max="365" value="${escapeHtml(policy.passwordExpiryDays ?? 90)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Failed attempts before lockout</span><input id="policyLockoutFailedAttempts" type="number" min="3" max="20" value="${escapeHtml(policy.lockoutFailedAttempts ?? 5)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Lockout minutes</span><input id="policyLockoutMinutes" type="number" min="1" max="1440" value="${escapeHtml(policy.lockoutMinutes ?? 15)}" ${canManage ? "" : "disabled"}></label>
        <label class="check-row"><input id="policyRequireUppercase" type="checkbox" ${policy.requireUppercase ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require uppercase letter</span></label>
        <label class="check-row"><input id="policyRequireLowercase" type="checkbox" ${policy.requireLowercase ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require lowercase letter</span></label>
        <label class="check-row"><input id="policyRequireNumber" type="checkbox" ${policy.requireNumber ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require number</span></label>
        <label class="check-row"><input id="policyRequireSymbol" type="checkbox" ${policy.requireSymbol ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require symbol</span></label>
        <div class="mini-fact wide">
          <span>Last updated</span>
          <strong>${policy.updatedAt ? formatDateTime(policy.updatedAt) : "Not recorded"}</strong>
        </div>
        <div class="form-actions wide">
          ${canManage ? `<button class="button primary" type="submit">Save security policy</button>` : `<span class="status pending">Only Platform Super Admin can save policy changes</span>`}
        </div>
      </form>
    </section>
  `;
}

function defaultPlatformSecurityPolicy() {
  return {
    minimumPasswordLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: false,
    passwordExpiryDays: 90,
    lockoutFailedAttempts: 5,
    lockoutMinutes: 15,
    updatedAt: ""
  };
}



const COLLECTION_MODE_LABELS = {
  NONE: "Not allowed (NONE)",
  MOBILE_MONEY_ONLY: "Mobile money only",
  BANK_ONLY: "Bank only",
  BOTH: "Mobile money and bank"
};

function platformCollectionModePanel(tenant) {
  const mode = tenant.allowedCollectionMode || "NONE";
  return `
    <div class="collection-mode-setup">
      <h3>Allowed payment collection methods</h3>
      ${state.collectionModeMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionModeMessage)}</strong></div>` : ""}
      ${state.collectionModeError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.collectionModeError)}</span></div>` : ""}
      <form id="collectionModeForm" class="form-grid single">
        <label>
          <span>Methods this SACCO may collect through Tereka</span>
          <select id="allowedCollectionMode">
            ${Object.entries(COLLECTION_MODE_LABELS).map(([value, label]) => `<option value="${value}" ${mode === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <p class="hint">The SACCO can only switch on methods allowed here.</p>
        <div class="form-actions inline"><button class="button primary" type="button" data-save-collection-mode="${escapeHtml(tenant.id || "")}">Save allowed methods</button></div>
      </form>
    </div>
  `;
}

async function saveCollectionMode(tenantId) {
  const select = document.getElementById("allowedCollectionMode");
  if (!select || !tenantId) return;
  state.collectionModeMessage = "";
  state.collectionModeError = "";
  try {
    await api(`/tenants/${encodeURIComponent(tenantId)}/collection-mode`, {
      method: "PATCH",
      body: JSON.stringify({ allowedCollectionMode: select.value })
    });
    await refreshAll();
    state.collectionModeMessage = "Allowed payment collection methods updated.";
  } catch (error) {
    state.collectionModeError = error.message || "Unable to update allowed collection methods.";
  }
  renderShell();
}

function paymentCollectionSettingsPanel(tenant) {
  const mode = tenant.allowedCollectionMode || "NONE";
  const allowsMM = mode === "MOBILE_MONEY_ONLY" || mode === "BOTH";
  const allowsBank = mode === "BANK_ONLY" || mode === "BOTH";
  const modeLabel = COLLECTION_MODE_LABELS[mode] || mode;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Payment collection</h2>
          <p>Choose which allowed methods your SACCO switches on. The platform controls what is allowed.</p>
        </div>
        <span class="status ${mode === "NONE" ? "pending" : "active"}">${escapeHtml(modeLabel)}</span>
      </div>
      ${state.collectionSettingsMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionSettingsMessage)}</strong></div>` : ""}
      ${state.collectionSettingsError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.collectionSettingsError)}</span></div>` : ""}
      <div class="notice compact"><span>Allowed by platform: <strong>${escapeHtml(modeLabel)}</strong> (read-only)</span></div>
      <div class="collection-methods">
        <label class="collection-method${allowsMM ? "" : " disabled"}">
          <input type="checkbox" data-collection-toggle="mobileMoney" ${tenant.mobileMoneyCollectionActive ? "checked" : ""} ${allowsMM ? "" : "disabled"}>
          <span><b>Mobile money</b><small>${allowsMM ? "Let members pay by MTN / Airtel." : "Not allowed by the platform."}</small></span>
        </label>
        <label class="collection-method${allowsBank ? "" : " disabled"}">
          <input type="checkbox" data-collection-toggle="bank" ${tenant.bankCollectionActive ? "checked" : ""} ${allowsBank ? "" : "disabled"}>
          <span><b>Bank collection</b><small>${allowsBank ? "Record bank-led collections." : "Not allowed by the platform."}</small></span>
        </label>
      </div>
      <div class="form-actions inline"><button class="button primary" type="button" data-save-collection-settings="${escapeHtml(tenant.id || state.user?.tenantId || "")}">Save collection settings</button></div>
      ${saccoCollectionAccountsPanel(allowsMM, allowsBank)}
    </section>
  `;
}

function saccoCollectionAccountsPanel(allowsMM, allowsBank) {
  const accounts = buildCollectionAccountDisplayRows(dataRows("saccoPaymentAccounts"), labelize);
  const row = (a) => `
    <div class="collection-account-row">
      <div>
        <strong>${escapeHtml(a.title)}</strong>
        <span>${escapeHtml(a.detail)}</span>
        <small>${escapeHtml(a.channelLabel)}${a.active ? "" : " / inactive"}${a.instructions ? " / " + escapeHtml(a.instructions) : ""}</small>
      </div>
      <button class="button ghost" type="button" data-remove-collection-account="${escapeHtml(a.id)}">Remove</button>
    </div>`;
  return `
    <div class="collection-accounts-setup">
      <h3>Your collection accounts</h3>
      <p class="hint">Add the SACCO's own mobile-money numbers and bank accounts. Members pay into these directly; you record and reconcile the deposits.</p>
      ${state.collectionAccountMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionAccountMessage)}</strong></div>` : ""}
      ${state.collectionAccountError ? `<div class="notice warning"><strong>Could not save.</strong><span>${escapeHtml(state.collectionAccountError)}</span></div>` : ""}
      <div class="collection-account-list">
        ${accounts.length ? accounts.map(row).join("") : `<div class="notice compact"><span>No collection accounts yet.</span></div>`}
      </div>
      <form id="collectionAccountForm" class="form-grid">
        <label><span>Type</span>
          <select id="caChannel">
            ${allowsMM ? `<option value="mobile_money">Mobile money</option>` : ""}
            ${allowsBank ? `<option value="bank">Bank account</option>` : ""}
          </select>
        </label>
        <label><span>Network (mobile money)</span>
          <select id="caNetwork"><option value="mtn">MTN</option><option value="airtel">Airtel</option></select>
        </label>
        <label><span>Account name</span><input id="caAccountName" placeholder="SACCO account holder name"></label>
        <label><span>Number</span><input id="caAccountNumber" placeholder="MoMo number / merchant code, or bank account no."></label>
        <label><span>Bank name (bank only)</span><input id="caBankName" placeholder="e.g. Stanbic"></label>
        <label><span>Branch (bank only)</span><input id="caBranch" placeholder="Branch"></label>
        <label class="wide"><span>Instructions (optional)</span><input id="caInstructions" placeholder="e.g. Use your membership number as the reference"></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-add-collection-account="1">Add account</button></div>
      </form>
    </div>
  `;
}

async function saveCollectionSettings(tenantId) {
  if (!tenantId) return;
  const mm = document.querySelector('[data-collection-toggle="mobileMoney"]');
  const bank = document.querySelector('[data-collection-toggle="bank"]');
  state.collectionSettingsMessage = "";
  state.collectionSettingsError = "";
  try {
    await api(`/tenants/${encodeURIComponent(tenantId)}/collection-settings`, {
      method: "PATCH",
      body: JSON.stringify({ mobileMoneyActive: !!(mm && mm.checked), bankActive: !!(bank && bank.checked) })
    });
    await refreshAll();
    state.collectionSettingsMessage = "Payment collection settings saved.";
  } catch (error) {
    state.collectionSettingsError = error.code === "COLLECTION_METHOD_NOT_ALLOWED"
      ? (error.message || "That method is not allowed for this SACCO.")
      : (error.message || "Unable to save collection settings.");
  }
  renderShell();
}

async function saveCollectionAccount(tenantId = "") {
  const channel = document.getElementById("caChannel")?.value || "";
  const payload = {
    channel,
    network: channel === "mobile_money" ? (document.getElementById("caNetwork")?.value || "") : null,
    accountName: (document.getElementById("caAccountName")?.value || "").trim(),
    accountNumber: (document.getElementById("caAccountNumber")?.value || "").trim(),
    bankName: (document.getElementById("caBankName")?.value || "").trim(),
    branch: (document.getElementById("caBranch")?.value || "").trim(),
    instructions: (document.getElementById("caInstructions")?.value || "").trim()
  };
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  if (!channel) { state.collectionAccountError = "Select an account type."; renderShell(); return; }
  if (!payload.accountName || !payload.accountNumber) { state.collectionAccountError = "Account name and number are required."; renderShell(); return; }
  try {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    await api(`/sacco-payment-accounts${query}`, { method: "POST", body: JSON.stringify(payload) });
    if (tenantId && isPlatform()) await openTenantDetail(tenantId);
    else await refreshAll();
    state.collectionAccountMessage = "Collection account added.";
  } catch (error) {
    state.collectionAccountError = error.code === "COLLECTION_METHOD_NOT_ALLOWED"
      ? (error.message || "That channel is not allowed for this SACCO.")
      : (error.message || "Unable to add the collection account.");
  }
  renderShell();
}

async function removeCollectionAccount(accountId, tenantId = "") {
  if (!accountId) return;
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  try {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    await api(`/sacco-payment-accounts/${encodeURIComponent(accountId)}${query}`, { method: "DELETE" });
    if (tenantId && isPlatform()) await openTenantDetail(tenantId);
    else await refreshAll();
    state.collectionAccountMessage = "Collection account removed.";
  } catch (error) {
    state.collectionAccountError = error.message || "Unable to remove the collection account.";
  }
  renderShell();
}

async function updateCollectionAccount(accountId, tenantId = "") {
  if (!accountId) return;
  const payload = {
    channel: "mobile_money",
    network: value(`caEditNetwork-${accountId}`),
    accountName: value(`caEditAccountName-${accountId}`).trim(),
    accountNumber: value(`caEditAccountNumber-${accountId}`).trim(),
    instructions: value(`caEditInstructions-${accountId}`).trim(),
    active: value(`caEditActive-${accountId}`) !== "false"
  };
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  if (!payload.accountName || !payload.accountNumber) {
    state.collectionAccountError = "Account name and number are required.";
    renderShell();
    return;
  }
  try {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    await api(`/sacco-payment-accounts/${encodeURIComponent(accountId)}${query}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (tenantId && isPlatform()) await openTenantDetail(tenantId);
    else await refreshAll();
    state.collectionAccountMessage = "Collection account updated.";
  } catch (error) {
    state.collectionAccountError = error.message || "Unable to update the collection account.";
  }
  renderShell();
}

async function savePlatformMobileMoneyAccount() {
  const payload = {
    channel: "mobile_money",
    network: value("platformMobileMoneyNetwork"),
    accountName: value("platformMobileMoneyAccountName").trim(),
    accountNumber: value("platformMobileMoneyAccountNumber").trim(),
    instructions: value("platformMobileMoneyInstructions").trim()
  };
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  if (!payload.accountName || !payload.accountNumber) {
    state.collectionAccountError = "Platform account name and number are required.";
    renderShell();
    return;
  }
  try {
    await api("/sacco-payment-accounts?tenantId=tenant_platform", { method: "POST", body: JSON.stringify(payload) });
    await refreshAll();
    state.collectionAccountMessage = "Platform mobile-money receiving account added.";
  } catch (error) {
    state.collectionAccountError = error.message || "Unable to add the platform receiving account.";
  }
  renderShell();
}

async function removePlatformMobileMoneyAccount(accountId) {
  if (!accountId) return;
  state.collectionAccountMessage = "";
  state.collectionAccountError = "";
  try {
    await api(`/sacco-payment-accounts/${encodeURIComponent(accountId)}?tenantId=tenant_platform`, { method: "DELETE" });
    await refreshAll();
    state.collectionAccountMessage = "Platform mobile-money receiving account removed.";
  } catch (error) {
    state.collectionAccountError = error.message || "Unable to remove the platform receiving account.";
  }
  renderShell();
}
