function saccoApplications() {
  const applications = buildSaccoApplicationRows({ subscriptions: dataRows("subscriptions"), tenants: tenantRows() });
  return `
    ${state.saccoDeleteMessage ? `<div class="notice compact"><strong>${escapeHtml(state.saccoDeleteMessage)}</strong></div>` : ""}
    ${state.saccoDeleteError ? `<div class="notice warning"><strong>Delete did not complete.</strong><span>${escapeHtml(state.saccoDeleteError)}</span></div>` : ""}
    ${saccoRegistrationTabs()}
    ${saccoRegistrationTabContent(applications)}
  `;
}

function saccoRegistrationTabs() {
  if (state.saccoRegistrationTab === "accounts") state.saccoRegistrationTab = "applications";
  const pendingApprovalCount = tenantRows().filter((tenant) => normal(tenant.status).includes("pending")).length;
  const tabs = [
    ["applications", "All SACCOs", "layers"],
    ["platform", "Register SACCO", "user-plus"],
    ["self", "Approval Queue", "calendar", pendingApprovalCount]
  ];
  if (!tabs.some(([id]) => id === state.saccoRegistrationTab)) state.saccoRegistrationTab = "applications";
  return `
    <section class="panel compact-panel sacco-management-tabs-panel">
      <div class="tabs management-tabs">
        ${tabs.map(([id, label, icon, badge]) => `<button class="${state.saccoRegistrationTab === id ? "active" : ""}" type="button" data-sacco-registration-tab="${id}">${saccoDirectoryIcon(icon)}<span>${label}</span>${badge ? `<b class="sacco-tab-badge">${badge}</b>` : ""}</button>`).join("")}
      </div>
      ${isPlatform() && state.saccoRegistrationTab === "applications" ? `<button class="button primary sacco-register-action" type="button" data-sacco-registration-tab="platform">${saccoDirectoryIcon("plus")}<span>Register SACCO</span></button>` : ""}
    </section>
  `;
}

function saccoRegistrationTabContent(applications) {
  if (state.saccoRegistrationTab === "applications") {
    if (isPlatform()) return platformAllSaccosWorkspace();
    const filteredApplications = filterSaccoApplications(applications);
    const subscriptions = dataRows("subscriptions");
    const accountRowsById = new Map(buildSaccoAccountHealthRows({
      accountHealth: tenantAccountHealth,
      approvalStage: (tenant, subscription) => saccoApprovalStageFor(tenant || {}, subscription),
      paymentStage: (tenant, subscription) => saccoPaymentStageFor(tenant || {}, subscription),
      subscriptionForTenant,
      tenants: tenantRows()
    }).map((row) => [row.id, row]));
    const mergedRows = filteredApplications.map((application) => ({
      ...application,
      ...(accountRowsById.get(application.id) || {}),
      action: "tenant-detail",
      actionLabel: "Open SACCO",
      actionId: application.id
    }));
    const accountSummary = buildSaccoAccountSummary(Array.from(accountRowsById.values()), subscriptions);
    return `
      ${tenantDetailPanel()}
      <div class="dashboard-grid">
        ${summary(t("activeAccounts"), accountSummary.activeAccounts, "SACCOs allowed to operate", "Monitor")}
        ${summary(t("suspendedAccounts"), accountSummary.suspendedAccounts, "Access disabled", t("review"))}
        ${summary(t("withoutSubscription"), accountSummary.withoutSubscription, "Needs billing setup", "Assign")}
        ${summary(t("expiringSoon"), accountSummary.expiringSoon, "Billing and access risk", "Renew")}
      </div>
      ${saccoApplicationFilters(applications)}
      ${recordTable(t("navSaccoAccounts"), mergedRows, ["saccoCode", "name", "country", "district", "registrationNo", "registeredOn", "accountHealth", "paymentStage", "approvalStage", "subscriptionStatus", "operatingAccess", "status"], { hideSearch: true, panelClass: "application-list-panel sacco-accounts-panel" })}
    `;
  }
  if (state.saccoRegistrationTab === "self") return selfRegistrationApprovalPanel();
  return platformSaccoRegistrationPanel();
}

function platformAllSaccosWorkspace() {
  const fleetRows = dataRows("fleetTenants");
  const fleetSummary = state.data.fleetSummary || {};
  const search = normal(state.saccoDirectorySearch || "");
  const district = state.saccoDirectoryDistrict || "";
  const status = state.saccoDirectoryStatus || "";
  const subscription = state.saccoDirectorySubscription || "";
  const districts = Array.from(new Set(fleetRows.map((row) => row.district).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filtered = fleetRows.filter((row) => {
    const matchesSearch = !search || normal(`${row.name} ${row.abbreviation} ${row.registrationNo} ${row.district}`).includes(search);
    const matchesDistrict = !district || row.district === district;
    const matchesStatus = !status || normal(row.status) === normal(status);
    const matchesSubscription = !subscription || normal(row.subscriptionStatus) === normal(subscription);
    return matchesSearch && matchesDistrict && matchesStatus && matchesSubscription;
  });
  const total = Number(fleetSummary.totalOrganizations ?? fleetRows.length);
  const active = Number(fleetSummary.active ?? fleetRows.filter((row) => normal(row.status) === "active").length);
  const pending = Number(fleetSummary.pendingReview ?? fleetRows.filter((row) => normal(row.status).includes("pending")).length);
  const suspended = Number(fleetSummary.suspended ?? fleetRows.filter((row) => normal(row.status) === "suspended").length);
  const expiring = Number(fleetSummary.renewalsDueIn30Days || 0);
  const previousTotal = fleetRows.filter((row) => {
    const registered = new Date(row.createdAt || row.registeredAt || row.submittedAt || 0);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return !Number.isNaN(registered.getTime()) && registered < monthAgo;
  }).length;
  const totalChange = previousTotal ? Math.round(((total - previousTotal) / previousTotal) * 100) : 0;
  return `
    ${tenantDetailPanel()}
    <div class="sacco-directory-kpis">
      ${saccoDirectoryKpi("total", "Total SACCOs", total, totalChange ? `↑ +${totalChange}% vs last period` : "Registered organizations")}
      ${saccoDirectoryKpi("active", "Active SACCOs", active, `${fleetPercent(active, total)}% of total`)}
      ${saccoDirectoryKpi("pending", "Pending Approval", pending, "Requires review")}
      ${saccoDirectoryKpi("suspended", "Suspended", suspended, `${fleetPercent(suspended, total)}% of total`)}
      ${saccoDirectoryKpi("expiring", "Expiring (≤30 Days)", expiring, "Requires renewal")}
    </div>
    <div class="sacco-insights-grid">
      ${saccoOperationalStatusChart(total, active, pending, suspended)}
      ${saccoTrendChart(fleetRows)}
      ${saccoDistrictChart(fleetRows, total)}
    </div>
    <section class="panel sacco-directory-panel">
      <div class="sacco-directory-filters">
        <label class="sacco-directory-search"><span class="sr-only">Search SACCOs</span>${saccoDirectoryIcon("search")}<input id="saccoDirectorySearch" value="${escapeHtml(state.saccoDirectorySearch || "")}" placeholder="Search by SACCO name, code or registration number..."></label>
        <label class="sacco-directory-select">${saccoDirectoryIcon("pin")}<span><small>District</small><select id="saccoDirectoryDistrict"><option value="">All Districts</option>${districts.map((value) => `<option value="${escapeHtml(value)}" ${district === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></span></label>
        <label class="sacco-directory-select">${saccoDirectoryIcon("layers")}<span><small>Status</small><select id="saccoDirectoryStatus"><option value="">All Statuses</option>${["active", "pending_review", "pending_self_registration", "suspended", "inactive"].map((value) => `<option value="${value}" ${status === value ? "selected" : ""}>${escapeHtml(labelize(value))}</option>`).join("")}</select></span></label>
        <label class="sacco-directory-select">${saccoDirectoryIcon("calendar")}<span><small>Subscription</small><select id="saccoDirectorySubscription"><option value="">All Subscriptions</option>${["active", "trial", "pending_payment", "expired"].map((value) => `<option value="${value}" ${subscription === value ? "selected" : ""}>${escapeHtml(labelize(value))}</option>`).join("")}</select></span></label>
        <button class="button secondary sacco-clear-filters" type="button" data-action="clear-sacco-directory-filters">${saccoDirectoryIcon("filter")}<span>Clear</span></button>
      </div>
      <div class="table-wrap"><table class="sacco-directory-table"><thead><tr><th>#</th><th>SACCO name</th><th>Reg. no.</th><th>District</th><th>Operational status</th><th>Subscription status</th><th>Expiry date</th><th>Actions</th></tr></thead><tbody>
        ${filtered.map((row, index) => `<tr><td>${index + 1}</td><td><div class="sacco-name-cell">${saccoDirectoryIcon("users")}<strong>${escapeHtml(row.name || "SACCO")}</strong></div></td><td>${escapeHtml(row.registrationNo || "-")}</td><td>${escapeHtml(row.district || "-")}</td><td>${saccoDirectoryStatus(row.status)}</td><td>${saccoDirectoryStatus(row.subscriptionStatus || "unassigned")}</td><td><span class="sacco-expiry-date">${saccoDirectoryIcon("calendar")} ${row.subscriptionExpiry ? escapeHtml(formatDate(row.subscriptionExpiry)) : "-"}</span></td><td><div class="sacco-row-actions"><button class="table-action sacco-view-action" type="button" data-row-action="tenant-detail" data-row-id="${escapeHtml(row.id)}">${saccoDirectoryIcon("eye")}<span>View</span></button><button class="table-action sacco-more-action" type="button" aria-label="More actions for ${escapeHtml(row.name || "SACCO")}">•••</button></div></td></tr>`).join("") || `<tr><td colspan="8"><div class="empty-state compact"><strong>No SACCOs match these filters.</strong><span>Clear one or more filters and try again.</span></div></td></tr>`}
      </tbody></table></div>
      <footer class="sacco-directory-footer"><span>Showing <strong>${filtered.length ? `1–${filtered.length}` : "0"}</strong> of <strong>${total}</strong> SACCOs</span><div class="sacco-pagination"><span>Rows per page:</span><select aria-label="Rows per page"><option>10</option></select><button type="button" aria-label="Previous page" disabled>‹</button><b>1</b><button type="button" aria-label="Next page" disabled>›</button></div></footer>
    </section>`;
}

function saccoDirectoryIcon(name) {
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    filter: '<path d="M4 5h16M7 10h10M10 15h4M11 20h2"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M14 14c3.5 0 6 2.5 6 6"/>',
    "user-plus": '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-7 6-7 2.1 0 3.8 1 4.9 2.6M18 10v6M15 13h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M9 8v8M15 8v8"/>'
  };
  return `<svg class="sacco-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.layers}</svg>`;
}

function saccoDirectoryKpi(type, label, value, detail) {
  const icon = type === "total" ? "users" : type === "active" ? "layers" : type === "pending" ? "clock" : type === "suspended" ? "pause" : "calendar";
  return `<article class="sacco-kpi-card ${type}"><span class="sacco-kpi-icon">${saccoDirectoryIcon(icon)}</span><div><span>${escapeHtml(label)}</span><strong>${Number(value || 0).toLocaleString()}</strong><small>${escapeHtml(detail)}</small></div></article>`;
}

function saccoDirectoryStatus(value) {
  const normalized = normal(value || "unassigned");
  const icon = normalized === "active" || normalized === "trial" ? "✓" : normalized.includes("pending") ? "◷" : normalized === "unassigned" ? "⌛" : "!";
  return `<span class="status sacco-status ${statusClass(normalized)}"><b>${icon}</b>${escapeHtml(labelize(normalized))}</span>`;
}

function saccoOperationalStatusChart(total, active, pending, suspended) {
  const safeTotal = Math.max(total, 1);
  const activePercent = (active / safeTotal) * 100;
  const pendingPercent = (pending / safeTotal) * 100;
  const suspendedPercent = (suspended / safeTotal) * 100;
  return `<section class="panel sacco-insight-card sacco-status-insight"><h2>SACCOs by Operational Status</h2><div class="sacco-status-chart"><div class="sacco-donut"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="track" cx="21" cy="21" r="15.9"/><circle class="active" cx="21" cy="21" r="15.9" pathLength="100" stroke-dasharray="${activePercent} ${100 - activePercent}"/><circle class="pending" cx="21" cy="21" r="15.9" pathLength="100" stroke-dasharray="${pendingPercent} ${100 - pendingPercent}" stroke-dashoffset="${-activePercent}"/><circle class="suspended" cx="21" cy="21" r="15.9" pathLength="100" stroke-dasharray="${suspendedPercent} ${100 - suspendedPercent}" stroke-dashoffset="${-(activePercent + pendingPercent)}"/></svg><div><strong>${total}</strong><span>SACCOs</span></div></div><div class="sacco-chart-legend">${saccoStatusLegend("active", "Active", active, total)}${saccoStatusLegend("pending", "Pending Review", pending, total)}${saccoStatusLegend("suspended", "Suspended", suspended, total)}</div></div></section>`;
}

function saccoStatusLegend(type, label, value, total) {
  return `<div><i class="${type}"></i><span>${label}</span><strong>${value} (${fleetPercent(value, total)}%)</strong></div>`;
}

function saccoTrendChart(rows) {
  const today = new Date();
  const months = Array.from({ length: 6 }, (_, index) => new Date(today.getFullYear(), today.getMonth() - 5 + index, 1));
  const values = months.map((month) => {
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    return rows.filter((row) => {
      const date = new Date(row.createdAt || row.registeredAt || row.submittedAt || row.registeredOn || 0);
      return !Number.isNaN(date.getTime()) && date < end;
    }).length;
  });
  const plottedValues = rows.length && values.every((value) => value === 0)
    ? values.map((_, index) => Math.max(1, Math.round(rows.length * ((index + 1) / values.length))))
    : values;
  const max = Math.max(...plottedValues, 1);
  const points = plottedValues.map((value, index) => `${16 + index * 76},${88 - (value / max) * 58}`);
  const area = `M ${points[0]} L ${points.slice(1).join(" L ")} L ${16 + (points.length - 1) * 76} 94 L 16 94 Z`;
  return `<section class="panel sacco-insight-card sacco-trend-insight"><div class="sacco-insight-heading"><h2>SACCOs Trend</h2><span>Last 6 Months⌄</span></div><div class="sacco-trend-chart"><svg viewBox="0 0 420 110" preserveAspectRatio="none" aria-label="SACCO registrations over the last six months"><defs><linearGradient id="saccoTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#44bf80" stop-opacity=".45"/><stop offset="1" stop-color="#44bf80" stop-opacity=".05"/></linearGradient></defs><path class="grid" d="M16 30H404M16 59H404M16 88H404"/><path class="area" d="${area}"/><polyline points="${points.join(" ")}"/><g>${points.map((point) => `<circle cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="4"/>`).join("")}</g></svg><div class="sacco-trend-labels">${months.map((month) => `<span>${month.toLocaleString("en", { month: "short" })}<small>${month.getFullYear()}</small></span>`).join("")}</div></div></section>`;
}

function saccoDistrictChart(rows, total) {
  const counts = rows.reduce((result, row) => {
    const district = row.district || "Unassigned";
    result[district] = (result[district] || 0) + 1;
    return result;
  }, {});
  const districts = Object.entries(counts).sort((left, right) => right[1] - left[1]).slice(0, 5);
  const max = Math.max(...districts.map(([, count]) => count), 1);
  return `<section class="panel sacco-insight-card sacco-district-insight"><h2>SACCOs by District</h2><div class="sacco-district-bars">${districts.map(([district, count]) => {
    const widthStep = Math.max(10, Math.min(100, Math.round((count / max) * 10) * 10));
    return `<div><span>${escapeHtml(district)}</span><i><b class="width-${widthStep}"></b></i><strong>${fleetPercent(count, total)}%</strong></div>`;
  }).join("") || `<p class="muted-note">No district data available.</p>`}</div></section>`;
}

function fleetManagementWorkspace() {
  const rows = dataRows("fleetTenants");
  const fleetSummary = state.data.fleetSummary || {};
  const savedViews = dataRows("fleetSavedViews");
  const bulkJobs = dataRows("fleetBulkJobs");
  const selectedBulkJob = bulkJobs.find((job) => job.id === state.selectedFleetJobId) || null;
  const page = state.pageMeta.fleetTenants || {};
  const serverPageNumber = Number(page.number ?? page.page ?? 0);
  const total = Number(page.totalElements || rows.length);
  const selected = new Set(state.fleetSelectedIds || []);
  const tableKey = tableStateKey("SACCO fleet directory");
  const tableState = state.tableState[tableKey] || { search: "", page: 1, pageSize: 200 };
  const managers = platformUsers().filter((user) => user.tenantId === "tenant_platform" && normal(user.status) === "active");
  const districts = Array.from(new Set(rows.map((row) => row.district).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const critical = Number(fleetSummary.critical || 0);
  const attention = Number(fleetSummary.attention || 0);
  const healthy = Number(fleetSummary.healthy || 0);
  const unassigned = Number(fleetSummary.unassigned || 0);
  const renewalsDue = Number(fleetSummary.renewalsDueIn30Days || 0);
  const expiredSubscriptions = Number(fleetSummary.expiredSubscriptions || 0);
  const outstandingBalance = Number(fleetSummary.outstandingSubscriptionBalance || 0);
  const slaBreached = Number(fleetSummary.slaBreached || 0);
  const slaDueSoon = Number(fleetSummary.slaDueSoon || 0);
  const fleetTotal = Number(fleetSummary.totalOrganizations ?? total);
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  return `
    ${tenantDetailPanel()}
    <section class="fleet-command-bar">
      <div>
        <p class="eyebrow">Fleet operations</p>
        <h2>SACCO fleet management</h2>
        <p>Monitor portfolio health, renewal exposure, ownership and lifecycle controls across the entire organization fleet.</p>
      </div>
      <div class="fleet-total"><span>Total managed</span><strong>${fleetTotal.toLocaleString()}</strong></div>
    </section>
    <div class="dashboard-grid fleet-kpi-grid">
      ${summary("Healthy portfolio", healthy, `${fleetPercent(healthy, fleetTotal)}% of fleet`, "Stable")}
      ${summary("Critical health", critical, `${fleetPercent(critical, fleetTotal)}% of fleet`, "Review")}
      ${summary("Needs attention", attention, `${fleetPercent(attention, fleetTotal)}% of fleet`, "Triage")}
      ${summary("Unassigned portfolio", unassigned, `${fleetPercent(unassigned, fleetTotal)}% of fleet`, "Assign")}
    </div>
    <section class="fleet-exposure-strip fleet-exposure-six" aria-label="Fleet exposure summary">
      <div><span>Renewals due in 30 days</span><strong>${renewalsDue.toLocaleString()}</strong></div>
      <div><span>Expired subscriptions</span><strong>${expiredSubscriptions.toLocaleString()}</strong></div>
      <div><span>Outstanding subscriptions</span><strong>${money.format(outstandingBalance)}</strong></div>
      <div><span>Average onboarding</span><strong>${Number(fleetSummary.averageOnboarding || 0)}%</strong></div>
      <div><span>Selected for action</span><strong>${selected.size.toLocaleString()}</strong></div>
      <div><span>SLA breached / due soon</span><strong>${slaBreached.toLocaleString()} / ${slaDueSoon.toLocaleString()}</strong></div>
    </section>
    ${fleetRenewalForecast(fleetSummary)}
    <section class="fleet-distribution-grid" aria-label="Fleet operating distribution">
      ${fleetDistributionPanel("Lifecycle", fleetSummary.lifecycleDistribution, fleetTotal, 6)}
      ${fleetDistributionPanel("Subscription state", fleetSummary.subscriptionDistribution, fleetTotal, 6)}
      ${fleetDistributionPanel("Portfolio workload", fleetSummary.portfolioDistribution, fleetTotal, 6)}
      ${fleetDistributionPanel("District concentration", fleetSummary.districtDistribution, fleetTotal, 6)}
    </section>
    <section class="fleet-workload-grid" aria-label="Fleet workload drill-down">
      ${fleetWorkloadPanel("Portfolio owner workload", fleetSummary.portfolioWorkloads, "manager")}
      ${fleetWorkloadPanel("District risk queue", fleetSummary.districtWorkloads, "district")}
    </section>
    ${fleetRiskQueue(fleetSummary.riskQueue, dataRows("fleetIncidentStates"), managers)}
    ${state.fleetIncidentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fleetIncidentMessage)}</strong></div>` : ""}
    ${state.fleetIncidentError ? `<div class="notice warning"><strong>Incident update failed.</strong><span>${escapeHtml(state.fleetIncidentError)}</span></div>` : ""}
    <section class="panel fleet-saved-views">
      <div class="fleet-saved-view-picker">
        <label><span>Saved view</span><select id="fleetSavedViewSelect"><option value="">Select a saved view</option>${savedViews.map((view) => `<option value="${escapeHtml(view.id)}">${escapeHtml(view.name)}</option>`).join("")}</select></label>
        <button class="button secondary" type="button" data-action="apply-fleet-view">Apply</button>
        <button class="icon-button" type="button" data-action="delete-fleet-view" title="Delete selected saved view" aria-label="Delete selected saved view">×</button>
      </div>
      <form id="fleetSaveViewForm" class="fleet-save-view-form">
        <label><span>New view name</span><input id="fleetSavedViewName" maxlength="80" required placeholder="e.g. Critical western portfolio"></label>
        <button class="button primary" type="submit">Save current filters</button>
      </form>
    </section>
    ${state.fleetViewMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fleetViewMessage)}</strong></div>` : ""}
    ${state.fleetViewError ? `<div class="notice warning"><strong>Saved view action failed.</strong><span>${escapeHtml(state.fleetViewError)}</span></div>` : ""}
    ${state.fleetBulkMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fleetBulkMessage)}</strong></div>` : ""}
    ${state.fleetBulkError ? `<div class="notice warning"><strong>Fleet update failed.</strong><span>${escapeHtml(state.fleetBulkError)}</span></div>` : ""}
    <section class="panel fleet-directory-panel">
      <div class="fleet-filter-grid">
        <label class="fleet-search"><span>Search fleet</span><input value="${escapeHtml(tableState.search || "")}" data-table-search="${escapeHtml(tableKey)}" placeholder="Name, code, registration number or district" autocomplete="off"></label>
        <label><span>Health</span><select id="fleetHealthFilter"><option value="">All health states</option>${fleetFilterOptions(["healthy", "attention", "critical"], state.fleetHealthFilter)}</select></label>
        <label><span>Lifecycle</span><select id="fleetStatusFilter"><option value="">All lifecycle states</option>${fleetFilterOptions(["active", "approved", "pending_review", "inactive", "suspended"], state.fleetStatusFilter)}</select></label>
        <label><span>District</span><select id="fleetDistrictFilter"><option value="">All districts</option>${districts.map((value) => `<option value="${escapeHtml(value)}" ${state.fleetDistrictFilter === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
        <label><span>Portfolio owner</span><select id="fleetManagerFilter"><option value="">All owners</option><option value="unassigned" ${state.fleetManagerFilter === "unassigned" ? "selected" : ""}>Unassigned</option>${managers.map((user) => `<option value="${escapeHtml(user.id)}" ${state.fleetManagerFilter === user.id ? "selected" : ""}>${escapeHtml(user.fullName)}</option>`).join("")}</select></label>
        <button class="button ghost" type="button" data-action="clear-fleet-filters">Clear</button>
      </div>
      <form id="fleetBulkForm" class="fleet-bulk-bar">
        <strong>${selected.size} selected</strong>
        <label><span class="sr-only">Assign portfolio owner</span><select id="fleetBulkManager"><option value="">Keep portfolio owner</option><option value="__unassigned__">Remove portfolio owner</option>${managers.map((user) => `<option value="${escapeHtml(user.id)}" data-manager-name="${escapeHtml(user.fullName)}">Assign ${escapeHtml(user.fullName)}</option>`).join("")}</select></label>
        <label><span class="sr-only">Change lifecycle status</span><select id="fleetBulkStatus"><option value="">Keep lifecycle status</option><option value="pending_review">Move to pending review</option><option value="inactive">Set inactive</option><option value="suspended">Suspend access</option></select></label>
        <label class="fleet-bulk-reason"><span class="sr-only">Business justification</span><input id="fleetBulkReason" maxlength="500" required placeholder="Business justification"></label>
        <button class="button primary" type="submit" ${selected.size ? "" : "disabled"}>Request approval</button>
      </form>
      ${fleetBulkJobMonitor(bulkJobs)}
      ${fleetBulkJobResultPanel(selectedBulkJob)}
      <div class="table-wrap fleet-table-wrap">
        <table class="fleet-table">
          <thead><tr><th><input type="checkbox" data-fleet-select-all aria-label="Select all loaded SACCOs" ${allVisibleSelected ? "checked" : ""}></th><th>Code / SACCO</th><th>Health</th><th>Lifecycle</th><th>Subscription</th><th>District</th><th>Portfolio owner</th><th>Balance due</th><th>Action</th></tr></thead>
          <tbody>${rows.map((row) => `<tr>
            <td><input type="checkbox" data-fleet-select="${escapeHtml(row.id)}" aria-label="Select ${escapeHtml(row.name)}" ${selected.has(row.id) ? "checked" : ""}></td>
            <td><strong>${escapeHtml(row.saccoCode || "-")}</strong><span>${escapeHtml(row.name || "-")}</span></td>
            <td><span class="fleet-health ${escapeHtml(row.health)}">${escapeHtml(labelize(row.health))}</span><small>${escapeHtml(row.healthReason || "")}</small></td>
            <td><span class="status ${normal(row.status).includes("active") ? "active" : "pending"}">${escapeHtml(labelize(row.status))}</span></td>
            <td><strong>${escapeHtml(labelize(row.subscriptionStatus || "unassigned"))}</strong><small>${row.subscriptionExpiry ? escapeHtml(formatDate(row.subscriptionExpiry)) : "No expiry"}</small></td>
            <td>${escapeHtml(row.district || "-")}</td>
            <td>${escapeHtml(row.accountManagerName || "Unassigned")}</td>
            <td>${money.format(row.balanceDue || 0)}</td>
            <td><button class="table-action" type="button" data-row-action="tenant-detail" data-row-id="${escapeHtml(row.id)}">Open 360</button></td>
          </tr>`).join("") || `<tr><td colspan="9">No SACCOs match this fleet view.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="pagination server-pagination">
        <span>Server page ${serverPageNumber + 1} of ${Math.max(1, Number(page.totalPages || 1))} · ${total.toLocaleString()} SACCOs</span>
        <div><button class="table-action" type="button" data-server-table-page="${escapeHtml(tableKey)}" data-page="${serverPageNumber - 1}" ${serverPageNumber <= 0 ? "disabled" : ""}>Previous</button><button class="table-action" type="button" data-server-table-page="${escapeHtml(tableKey)}" data-page="${serverPageNumber + 1}" ${serverPageNumber + 1 >= Number(page.totalPages || 1) ? "disabled" : ""}>Next</button></div>
      </div>
    </section>`;
}

function platformFleetApprovalsView() {
  const summaryData = state.data.fleetApprovalSummary || {};
  const currentUserId = state.user?.id || "";
  const canDecide = summaryData.canDecide === true;
  const filter = state.fleetApprovalFilter || "ready";
  const search = normal(state.fleetApprovalSearch || "");
  const typeFilter = state.fleetApprovalTypeFilter || "";
  const priorityFilter = state.fleetApprovalPriorityFilter || "";
  const now = Date.now();
  const allRows = dataRows("fleetApprovalQueue")
    .map((job) => {
      const ageHours = Math.max(0, (now - new Date(job.createdAt).getTime()) / 3600000);
      const dueSoonAt = new Date(job.approvalDueSoonAt).getTime();
      const dueAt = new Date(job.approvalDueAt).getTime();
      const sla = Number.isFinite(dueAt) && now >= dueAt
        ? "breached"
        : Number.isFinite(dueSoonAt) && now >= dueSoonAt
          ? "due_soon"
          : "within_sla";
      const requestType = job.targetStatus ? "Fleet activation" : "Portfolio change";
      const priority = sla === "breached" ? "critical" : sla === "due_soon" ? "high" : "normal";
      return { ...job, ageHours, sla, requestType, priority };
    })
    .filter((job) => {
      if (filter === "ready") return canDecide && job.requestedBy !== currentUserId;
      if (filter === "mine") return job.requestedBy === currentUserId;
      if (filter === "overdue") return job.sla === "breached";
      return true;
    });
  const rows = allRows.filter((job) => {
    const matchesSearch = !search || normal(`${fleetJobAction(job)} ${job.requestReason} ${job.requestedByName} ${job.id}`).includes(search);
    const matchesType = !typeFilter || job.requestType === typeFilter;
    const matchesPriority = !priorityFilter || job.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  });
  const selected = allRows.find((job) => job.id === state.selectedFleetApprovalId) || null;
  const page = state.pageMeta.fleetApprovalQueue || {};
  const pageNumber = Number(page.number || 0);
  const totalPages = Number(page.totalPages || 0);
  return `
    <section class="module-intro approval-inbox-intro approval-inbox-hero">
      <div><p class="eyebrow">Administrative requests</p><h2>Approval Inbox</h2><p>Review and action fleet changes, portfolio updates and other controlled requests.</p></div>
      <div class="approval-hero-shield">✓</div>
    </section>
    <div class="dashboard-grid fleet-approval-kpis">
      ${summary("Pending", Number(summaryData.pending || 0), "Require action", "Queue")}
      ${summary("Ready for me", Number(summaryData.readyForMyDecision || 0), "Assigned to your role", "Review")}
      ${summary("Submitted by me", Number(summaryData.submittedByMe || 0), "Your submissions", "Track")}
      ${summary("Due soon", Number(summaryData.dueSoon || 0), `Within ${Number(summaryData.warningRemainingHours || 4)} business hours`, "Prioritize")}
      ${summary("SLA breached", Number(summaryData.overdue || 0), `Past ${Number(summaryData.slaHours || 8)} business hours`, "Escalate")}
    </div>
    ${state.fleetBulkMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fleetBulkMessage)}</strong></div>` : ""}
    ${state.fleetBulkError ? `<div class="notice warning"><strong>Approval action failed.</strong><span>${escapeHtml(state.fleetBulkError)}</span></div>` : ""}
    <section class="panel fleet-approval-inbox">
      <header class="approval-inbox-toolbar">
        <div class="segmented" role="group" aria-label="Approval queue filter">
          ${[["ready", "Ready for me"], ["all", "All pending"], ["mine", "Submitted by me"], ["overdue", "SLA breached"]].map(([value, label]) => `<button type="button" class="${filter === value ? "active" : ""}" data-fleet-approval-filter="${value}" aria-pressed="${filter === value}">${label}</button>`).join("")}
        </div>
      </header>
      <div class="approval-inbox-filters">
        <label class="approval-search"><span>Search approvals</span><input id="fleetApprovalSearch" value="${escapeHtml(state.fleetApprovalSearch || "")}" placeholder="Search by request, SACCO or reference"></label>
        <label><span>Request type</span><select id="fleetApprovalTypeFilter"><option value="">All requests</option>${["Fleet activation", "Portfolio change"].map((value) => `<option value="${value}" ${typeFilter === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Priority</span><select id="fleetApprovalPriorityFilter"><option value="">All priorities</option>${["critical", "high", "normal"].map((value) => `<option value="${value}" ${priorityFilter === value ? "selected" : ""}>${escapeHtml(labelize(value))}</option>`).join("")}</select></label>
        <button class="button secondary" type="button" data-action="refresh-fleet-approvals">Refresh</button>
      </div>
      <div class="table-wrap"><table class="fleet-approval-table redesigned"><thead><tr><th>#</th><th>Request / subject</th><th>Scope</th><th>Type</th><th>Priority</th><th>Submitted by</th><th>Submitted on</th><th>SLA</th><th>Actions</th></tr></thead><tbody>
        ${rows.map((job, index) => `<tr class="approval-row ${job.sla}"><td>${index + 1}</td><td><strong>${escapeHtml(fleetJobAction(job))}</strong><small>${escapeHtml(job.requestReason || "No justification supplied")}</small></td><td><strong>${Number(job.requestedCount || 0).toLocaleString()} SACCO${Number(job.requestedCount || 0) === 1 ? "" : "s"}</strong><small>${escapeHtml(job.id)}</small></td><td><span class="request-type">${escapeHtml(job.requestType)}</span></td><td><span class="approval-priority ${job.priority}">${escapeHtml(labelize(job.priority))}</span></td><td><strong>${escapeHtml(job.requestedByName || "-")}</strong>${job.requestedBy === currentUserId ? "<small>You submitted this</small>" : ""}</td><td>${job.createdAt ? escapeHtml(formatDateTime(job.createdAt)) : "-"}</td><td><span class="approval-sla ${job.sla}"><strong>${job.sla === "breached" ? "Breached" : job.sla === "due_soon" ? "Due soon" : "On time"}</strong><small>${fleetApprovalDeadline(job)}</small></span></td><td><button class="button primary approval-review-button" type="button" data-review-fleet-approval="${escapeHtml(job.id)}">Review</button></td></tr>`).join("") || `<tr><td colspan="9"><div class="empty-state compact"><strong>No approvals in this view</strong><span>The queue is clear for the selected filters.</span></div></td></tr>`}
      </tbody></table></div>
      <footer class="approval-inbox-pager"><span>Page ${pageNumber + 1}${totalPages ? ` of ${totalPages}` : ""} · ${Number(page.totalElements || rows.length).toLocaleString()} pending</span><div><button class="table-action" type="button" data-fleet-approval-page="${pageNumber - 1}" ${pageNumber <= 0 ? "disabled" : ""}>Previous</button><button class="table-action" type="button" data-fleet-approval-page="${pageNumber + 1}" ${!totalPages || pageNumber + 1 >= totalPages ? "disabled" : ""}>Next</button></div></footer>
    </section>
    ${selected ? fleetApprovalReviewPanel(selected, currentUserId, canDecide) : ""}`;
}

function fleetApprovalReviewPanel(job, currentUserId, canDecide) {
  const ownRequest = job.requestedBy === currentUserId;
  return `<section class="panel fleet-approval-review" id="fleetApprovalReview">
    <div class="panel-heading"><div><p class="eyebrow">Approval review</p><h2>${escapeHtml(fleetJobAction(job))}</h2><p>Reference ${escapeHtml(job.id)} · submitted ${escapeHtml(formatDateTime(job.createdAt))}</p></div><button class="button ghost" type="button" data-close-fleet-approval>Close</button></div>
    <div class="approval-review-grid">
      <section><h3>Request details</h3><div class="detail-fact-grid">${mini("Request type", job.requestType)}${mini("Organization scope", `${Number(job.requestedCount || 0)} SACCO(s)`)}${mini("Requested by", job.requestedByName || "-")}${mini("SLA deadline", fleetApprovalDeadline(job))}</div></section>
      <section><h3>Proposed changes</h3><p>${escapeHtml(fleetJobAction(job))}</p><h3>Business justification</h3><p>${escapeHtml(job.requestReason || "No justification supplied.")}</p></section>
      <section><h3>Supporting documents</h3><div class="notice compact"><span>No supporting documents were attached to this administrative request.</span></div><h3>Approval history</h3><ol class="approval-history"><li><i></i><span><strong>Request submitted</strong><small>${escapeHtml(job.requestedByName || "Unknown requester")} · ${escapeHtml(formatDateTime(job.createdAt))}</small></span></li><li><i></i><span><strong>Awaiting decision</strong><small>${escapeHtml(fleetApprovalDeadline(job))}</small></span></li></ol></section>
    </div>
    <footer class="approval-review-actions">${ownRequest ? `<span class="status pending">A different authorized operator must decide this request.</span>` : canDecide ? `<button class="button secondary" type="button" data-fleet-job-decision="correction" data-job-id="${escapeHtml(job.id)}">Return for correction</button><button class="button danger" type="button" data-fleet-job-decision="reject" data-job-id="${escapeHtml(job.id)}">Reject</button><button class="button primary" type="button" data-fleet-job-decision="approve" data-job-id="${escapeHtml(job.id)}">Approve</button>` : `<span class="status pending">Read-only oversight</span>`}</footer>
  </section>`;
}

function fleetApprovalDeadline(job) {
  if (!job.approvalDueAt) return fleetApprovalAge(job.ageHours);
  return `${job.sla === "breached" ? "Was due" : "Due"} ${formatDateTime(job.approvalDueAt)}`;
}

function fleetApprovalAge(hours) {
  if (!Number.isFinite(hours)) return "Age unavailable";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min old`;
  if (hours < 24) return `${Math.floor(hours)}h old`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h old`;
}

function fleetPercent(value, total) {
  return total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;
}

function fleetDistributionPanel(title, distribution, total, limit) {
  const entries = Object.entries(distribution || {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0])))
    .slice(0, limit);
  return `<div class="panel fleet-distribution-panel">
    <header><h3>${escapeHtml(title)}</h3><span>Entire fleet</span></header>
    <div class="fleet-distribution-list">
      ${entries.map(([label, count]) => {
        const percent = fleetPercent(count, total);
        return `<div class="fleet-distribution-row">
          <div><span title="${escapeHtml(labelize(label))}">${escapeHtml(labelize(label))}</span><strong>${Number(count).toLocaleString()}</strong></div>
          <div class="fleet-distribution-track" aria-label="${escapeHtml(labelize(label))}: ${percent}%"><i style="width:${Math.max(percent, count ? 2 : 0)}%"></i></div>
        </div>`;
      }).join("") || `<p class="empty-state">No fleet data available.</p>`}
    </div>
  </div>`;
}

function fleetRenewalForecast(fleetSummary) {
  const forecast = Array.isArray(fleetSummary.renewalForecast) ? fleetSummary.renewalForecast : [];
  const savedScenarios = dataRows("fleetForecastScenarios");
  const maxValue = Math.max(1, ...forecast.map((row) => Number(row.projectedValue || 0)));
  const scenario = fleetRenewalScenario(
    Number(fleetSummary.renewalsDueIn90Days || 0),
    Number(fleetSummary.projectedRenewalValue90Days || 0),
    Number(state.fleetRenewalRate || 0),
    Number(state.fleetRenewalPriceAdjustment || 0)
  );
  return `<section class="panel fleet-renewal-forecast">
    <header>
      <div><p class="eyebrow">Renewal forecast</p><h3>Six-month subscription schedule</h3></div>
      <div class="fleet-renewal-headline"><span>Next 90 days</span><strong>${Number(fleetSummary.renewalsDueIn90Days || 0).toLocaleString()} organizations</strong><small>${money.format(fleetSummary.projectedRenewalValue90Days || 0)} projected</small></div>
    </header>
    <div class="fleet-scenario-controls">
      <div class="fleet-scenario-presets" role="group" aria-label="Renewal scenarios"><button type="button" data-renewal-preset="conservative" class="${renewalPresetActive(65, -5)}">Conservative</button><button type="button" data-renewal-preset="expected" class="${renewalPresetActive(85, 0)}">Expected</button><button type="button" data-renewal-preset="growth" class="${renewalPresetActive(95, 8)}">Growth</button></div>
      <label><span>Renewal rate <strong>${Number(state.fleetRenewalRate || 0)}%</strong></span><input id="fleetRenewalRate" type="range" min="0" max="100" step="1" value="${Number(state.fleetRenewalRate || 0)}"></label>
      <label><span>Price adjustment <strong>${Number(state.fleetRenewalPriceAdjustment || 0)}%</strong></span><input id="fleetRenewalPriceAdjustment" type="range" min="-30" max="30" step="1" value="${Number(state.fleetRenewalPriceAdjustment || 0)}"></label>
      <div class="fleet-scenario-output"><span>Scenario outcome</span><strong>${scenario.expectedOrganizations.toLocaleString()} renewals · ${money.format(scenario.expectedValue)}</strong><small>${money.format(scenario.downsideValue)} at risk versus full adjusted renewal</small></div>
    </div>
    <div class="fleet-scenario-library">
      <form id="fleetScenarioSaveForm"><label><span>Scenario name</span><input id="fleetScenarioName" maxlength="80" required placeholder="e.g. FY27 conservative"></label><button class="button primary" type="submit">Save scenario</button></form>
      <div class="table-wrap"><table><thead><tr><th>Saved scenario</th><th>Renewal rate</th><th>Price change</th><th>Expected renewals</th><th>Expected value</th><th>Revenue at risk</th><th></th></tr></thead><tbody>
        ${savedScenarios.map((saved) => {
          const result = fleetRenewalScenario(Number(fleetSummary.renewalsDueIn90Days || 0), Number(fleetSummary.projectedRenewalValue90Days || 0), Number(saved.renewalRate || 0), Number(saved.priceAdjustment || 0));
          return `<tr><td><strong>${escapeHtml(saved.name)}</strong></td><td>${Number(saved.renewalRate)}%</td><td>${Number(saved.priceAdjustment) > 0 ? "+" : ""}${Number(saved.priceAdjustment)}%</td><td>${result.expectedOrganizations.toLocaleString()}</td><td>${money.format(result.expectedValue)}</td><td>${money.format(result.downsideValue)}</td><td><div class="fleet-scenario-actions"><button class="table-action" type="button" data-apply-renewal-scenario="${escapeHtml(saved.id)}">Apply</button><button class="icon-button" type="button" data-delete-renewal-scenario="${escapeHtml(saved.id)}" title="Delete scenario" aria-label="Delete ${escapeHtml(saved.name)}">×</button></div></td></tr>`;
        }).join("") || `<tr><td colspan="7">No saved scenarios yet.</td></tr>`}
      </tbody></table></div>
    </div>
    ${state.fleetScenarioMessage ? `<div class="notice compact"><strong>${escapeHtml(state.fleetScenarioMessage)}</strong></div>` : ""}
    ${state.fleetScenarioError ? `<div class="notice warning"><strong>Scenario action failed.</strong><span>${escapeHtml(state.fleetScenarioError)}</span></div>` : ""}
    <div class="fleet-renewal-months">
      ${forecast.map((row) => {
        const projected = Number(row.projectedValue || 0);
        const width = projected > 0 ? Math.max(3, Math.round((projected / maxValue) * 100)) : 0;
        return `<div class="fleet-renewal-month"><div><strong>${escapeHtml(formatDate(row.startDate))}</strong><span>${Number(row.organizations || 0).toLocaleString()} due</span></div><div class="fleet-renewal-track"><i style="width:${width}%"></i></div><div><strong>${money.format(projected)}</strong><span>${money.format(row.outstandingBalance || 0)} outstanding</span></div></div>`;
      }).join("") || `<p class="empty-state">No renewal forecast is available.</p>`}
    </div>
  </section>`;
}

function fleetRenewalScenario(organizations, baseValue, renewalRatePercent, priceAdjustmentPercent) {
  const renewalRate = Math.min(100, Math.max(0, renewalRatePercent)) / 100;
  const priceMultiplier = Math.max(0, 1 + priceAdjustmentPercent / 100);
  const expectedValue = Math.round(Math.max(0, baseValue) * renewalRate * priceMultiplier);
  return {
    expectedOrganizations: Math.round(Math.max(0, organizations) * renewalRate),
    expectedValue,
    downsideValue: Math.max(0, Math.round(Math.max(0, baseValue) * priceMultiplier - expectedValue))
  };
}

function renewalPresetActive(rate, adjustment) {
  return Number(state.fleetRenewalRate) === rate && Number(state.fleetRenewalPriceAdjustment) === adjustment ? "active" : "";
}

function fleetWorkloadPanel(title, workloads, filterType) {
  const rows = Array.isArray(workloads) ? workloads.slice(0, 8) : [];
  return `<div class="panel fleet-workload-panel">
    <header><div><p class="eyebrow">Operational drill-down</p><h3>${escapeHtml(title)}</h3></div><span>Top ${Math.min(rows.length, 8)}</span></header>
    <div class="table-wrap"><table><thead><tr><th>${filterType === "manager" ? "Portfolio owner" : "District"}</th><th>Total</th><th>Critical</th><th>Attention</th><th></th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td><strong>${escapeHtml(row.label || "-")}</strong></td><td>${Number(row.total || 0).toLocaleString()}</td><td><span class="fleet-risk-count critical">${Number(row.critical || 0).toLocaleString()}</span></td><td><span class="fleet-risk-count attention">${Number(row.attention || 0).toLocaleString()}</span></td><td><button class="table-action" type="button" data-fleet-drilldown="${escapeHtml(filterType)}" data-filter-value="${escapeHtml(row.id || "")}" data-filter-label="${escapeHtml(row.label || "")}">View</button></td></tr>`).join("") || `<tr><td colspan="5">No workload data available.</td></tr>`}</tbody>
    </table></div>
  </div>`;
}

function fleetRiskQueue(incidents, incidentStates, managers) {
  const rows = Array.isArray(incidents) ? incidents.slice(0, 12) : [];
  const states = new Map((incidentStates || []).map((state) => [state.incidentKey, state]));
  return `<section class="panel fleet-risk-queue">
    <header><div><p class="eyebrow">Incident and SLA queue</p><h3>Operational risks requiring response</h3></div><span>${rows.length} highest priority</span></header>
    <div class="table-wrap"><table><thead><tr><th>Organization</th><th>Severity</th><th>Issue</th><th>Owner</th><th>SLA deadline</th><th>SLA</th><th>Workflow</th><th>Actions</th></tr></thead><tbody>
      ${rows.map((incident) => {
        const workflow = states.get(incident.incidentKey) || {};
        const workflowStatus = workflow.workflowStatus || "open";
        const owner = workflow.assigneeName || incident.accountManagerName || "Unassigned";
        return `<tr><td><strong>${escapeHtml(incident.organizationCode || "-")}</strong><span>${escapeHtml(incident.organizationName || "-")}</span></td><td><span class="fleet-health ${escapeHtml(incident.severity)}">${escapeHtml(labelize(incident.severity))}</span></td><td class="fleet-risk-issue">${escapeHtml(incident.issue || "-")}${workflow.resolutionNote ? `<small>Resolution: ${escapeHtml(workflow.resolutionNote)}</small>` : ""}${workflow.escalatedAt ? `<small>Escalated by ${escapeHtml(workflow.escalatedByName || "Platform operator")} · ${escapeHtml(formatDateTime(workflow.escalatedAt))}</small>` : ""}</td><td><div class="fleet-incident-owner"><span>${escapeHtml(owner)}</span><select data-incident-assignee="${escapeHtml(incident.incidentKey)}" aria-label="Assign incident owner"><option value="">Select owner</option>${managers.map((manager) => `<option value="${escapeHtml(manager.id)}" ${workflow.assigneeUserId === manager.id ? "selected" : ""}>${escapeHtml(manager.fullName)}</option>`).join("")}</select><button class="table-action" type="button" data-assign-incident="${escapeHtml(incident.incidentKey)}">Assign</button></div></td><td>${incident.dueAt ? escapeHtml(formatDateTime(incident.dueAt)) : "-"}</td><td><span class="fleet-sla ${escapeHtml(incident.slaStatus)}">${escapeHtml(labelize(incident.slaStatus))}</span></td><td><span class="fleet-workflow ${escapeHtml(workflowStatus)}">${escapeHtml(labelize(workflowStatus))}</span></td><td><div class="fleet-incident-actions"><button class="table-action" type="button" data-row-action="tenant-detail" data-row-id="${escapeHtml(incident.tenantId)}">Open 360</button>${workflowStatus === "open" ? `<button class="table-action" type="button" data-incident-action="acknowledged" data-incident-key="${escapeHtml(incident.incidentKey)}">Acknowledge</button>` : ""}${workflowStatus !== "resolved" ? `<button class="table-action" type="button" data-incident-action="escalated" data-incident-key="${escapeHtml(incident.incidentKey)}">Escalate</button><button class="table-action" type="button" data-incident-action="resolved" data-incident-key="${escapeHtml(incident.incidentKey)}">Resolve</button>` : `<button class="table-action" type="button" data-incident-action="open" data-incident-key="${escapeHtml(incident.incidentKey)}">Reopen</button>`}</div></td></tr>`;
      }).join("") || `<tr><td colspan="8">No fleet incidents require action.</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function fleetBulkJobMonitor(jobs) {
  const rows = Array.isArray(jobs) ? jobs.slice(0, 5) : [];
  if (!rows.length) return "";
  return `<details class="fleet-job-monitor" ${rows.some((job) => ["pending_approval", "queued", "running"].includes(job.status)) ? "open" : ""}>
    <summary><span>Recent bulk jobs</span><strong>${rows.length}</strong></summary>
    <div class="table-wrap"><table><thead><tr><th>Submitted</th><th>Action / justification</th><th>Status</th><th>Requested by</th><th>Decision</th><th>Requested</th><th>Succeeded</th><th>Failed</th><th>Recovery</th><th>Actions</th></tr></thead><tbody>
      ${rows.map((job) => `<tr><td>${job.createdAt ? escapeHtml(formatDateTime(job.createdAt)) : "-"}</td><td><strong>${escapeHtml(fleetJobAction(job))}</strong><small>${escapeHtml(job.requestReason || "No justification recorded")}</small></td><td><span class="status ${job.status === "completed" ? "active" : "pending"}">${escapeHtml(labelize(job.status))}</span></td><td>${escapeHtml(job.requestedByName || "-")}</td><td>${job.decidedAt ? `<strong>${escapeHtml(job.decidedByName || "-")}</strong><small>${escapeHtml(job.decisionReason || "-")}</small>` : "Awaiting checker"}</td><td>${Number(job.requestedCount || 0).toLocaleString()}</td><td>${Number(job.succeededCount || 0).toLocaleString()}</td><td>${Number(job.failedCount || 0).toLocaleString()}</td><td>${fleetJobRecoveryStatus(job)}</td><td><div class="fleet-job-actions">${job.status === "pending_approval" && job.requestedBy !== state.user?.id ? `<button class="table-action" type="button" data-fleet-job-decision="approve" data-job-id="${escapeHtml(job.id)}">Approve</button><button class="table-action danger" type="button" data-fleet-job-decision="reject" data-job-id="${escapeHtml(job.id)}">Reject</button>` : ""}<button class="table-action" type="button" data-fleet-job-results="${escapeHtml(job.id)}">Results</button></div></td></tr>`).join("")}
    </tbody></table></div>
  </details>`;
}

function fleetBulkJobResultPanel(job) {
  if (!state.selectedFleetJobId) return "";
  const results = Array.isArray(state.selectedFleetJobResults) ? state.selectedFleetJobResults : [];
  return `<section class="fleet-job-results" aria-label="Bulk job organization results">
    <header>
      <div><p class="eyebrow">Bulk job report</p><h3>${escapeHtml(job ? fleetJobAction(job) : state.selectedFleetJobId)}</h3><span>${escapeHtml(state.selectedFleetJobId)}</span></div>
      <div><button class="button secondary" type="button" data-action="export-fleet-job-results" ${results.length ? "" : "disabled"}>Download CSV</button><button class="icon-button" type="button" data-action="close-fleet-job-results" title="Close report" aria-label="Close bulk job report">×</button></div>
    </header>
    ${state.selectedFleetJobError ? `<div class="notice warning"><strong>Could not load job results.</strong><span>${escapeHtml(state.selectedFleetJobError)}</span></div>` : ""}
    ${state.selectedFleetJobLoading ? `<div class="loading-state">Loading organization results...</div>` : `<div class="table-wrap"><table><thead><tr><th>Organization</th><th>Organization ID</th><th>Outcome</th><th>Message</th><th>Processed</th></tr></thead><tbody>
      ${results.map((result) => `<tr><td><strong>${escapeHtml(result.tenantName || "Unknown organization")}</strong></td><td>${escapeHtml(result.tenantId || "-")}</td><td><span class="status ${result.status === "completed" ? "active" : "pending"}">${escapeHtml(labelize(result.status))}</span></td><td class="fleet-result-message">${escapeHtml(result.message || "-")}</td><td>${result.processedAt ? escapeHtml(formatDateTime(result.processedAt)) : "Pending"}</td></tr>`).join("") || `<tr><td colspan="5">No organization results are available yet.</td></tr>`}
    </tbody></table></div>`}
  </section>`;
}

function fleetJobAction(job) {
  if (job.targetStatus) return `Set ${labelize(job.targetStatus)}`;
  if (job.accountManagerName) return `Assign ${job.accountManagerName}`;
  return "Remove portfolio owner";
}

function fleetJobRecoveryStatus(job) {
  const count = Math.max(0, Number(job?.recoveryCount || 0));
  if (!count) return `<span class="fleet-recovery none">Not required</span>`;
  const recoveredAt = job.lastRecoveredAt ? formatDateTime(job.lastRecoveredAt) : "Time unavailable";
  return `<span class="fleet-recovery recovered"><strong>Recovered ${count} ${count === 1 ? "time" : "times"}</strong><small>${escapeHtml(recoveredAt)}</small></span>`;
}

function fleetFilterOptions(values, selected) {
  return values.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(labelize(value))}</option>`).join("");
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
    <section class="panel registration-panel onboarding-workspace">
      <div class="registration-intro onboarding-header">
        <div>
          <p class="eyebrow">SACCO management</p>
          <h2>Register SACCO</h2>
          <p>Create a new SACCO workspace in three guided steps. Required fields are validated before activation.</p>
        </div>
        <div class="onboarding-term" aria-label="Default test period"><strong>30</strong><span>day test period</span></div>
      </div>
      ${state.tenantFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.tenantFormMessage)}</strong></div>` : ""}
      ${state.tenantFormError ? `<div class="notice warning"><strong>Could not register SACCO.</strong><span>${escapeHtml(state.tenantFormError)}</span></div>` : ""}
      <div class="onboarding-steps" aria-label="SACCO setup stages">
        ${onboardingStep("01", "SACCO Information", "Organization details", "active")}
        ${onboardingStep("02", "Administrator Details", "Primary user account", "")}
        ${onboardingStep("03", "Subscription & Activation", "Plan and trial setup", "")}
      </div>
      <form id="platformSaccoForm" class="registration-form onboarding-form">
        <section class="onboarding-section active" data-onboarding-stage="1" aria-labelledby="onboarding-data-title">
          <header><span>01</span><div><h3 id="onboarding-data-title">SACCO Information</h3><p>Organization identity, contacts, location and expected membership.</p></div></header>
          <div class="form-grid onboarding-fields">
            <label><span>SACCO name</span><input id="newTenantName" required placeholder="e.g. Tereka Farmers SACCO"></label>
            <label><span>SACCO code</span><input id="newTenantCode" readonly maxlength="4" placeholder="Generated from name"></label>
            <label><span>Registration number (optional)</span><input id="newTenantRegistrationNo" placeholder="Cooperative or UMRA registration"></label>
            <label><span>Contact number</span><input id="newTenantContactNumber" required placeholder="+256..."></label>
            <label><span>Country</span><select id="newTenantCountry">${countryRegionOptions(COUNTRY_REGIONS, "uganda").map((option) => `<option value="${escapeHtml(option.value)}" data-country-label="${escapeHtml(option.label.split(" - ")[0])}" data-locale="${escapeHtml(option.locale)}" data-currency="${escapeHtml(option.currency)}" data-digits="${option.currencyDigits}" ${option.selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>
            <label><span>Currency</span><input id="newTenantCurrencyCode" readonly value="UGX"></label>
            <label><span>District</span><input id="newTenantDistrict" required placeholder="e.g. Kampala"></label>
            <label><span>Parish</span><input id="newTenantParish" required placeholder="e.g. Central Parish"></label>
            <label><span>Village</span><input id="newTenantVillage" required placeholder="e.g. Market Zone"></label>
            <label><span>Expected membership</span><select id="newTenantMemberRange">${memberRangeOptions().map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}</select></label>
          </div>
          <div class="onboarding-stage-actions"><button class="button ghost" type="button" data-sacco-registration-tab="applications">Cancel</button><button class="button primary" type="button" data-onboarding-next="2">Next: Administrator Details →</button></div>
        </section>
        <section class="onboarding-section" data-onboarding-stage="2" aria-labelledby="onboarding-staff-title">
          <header><span>02</span><div><h3 id="onboarding-staff-title">Administrator Details</h3><p>Create the primary administrator account. Additional staff and roles can be added later.</p></div></header>
          <div class="form-grid onboarding-fields">
            <label><span>Administrator full name</span><input id="newTenantStaffFullName" required placeholder="e.g. Jane Namusoke"></label>
            <label><span>Email / username</span><input id="newTenantStaffEmail" type="email" required placeholder="admin@sacco.org"></label>
            <label><span>Phone</span><input id="newTenantStaffPhone" required placeholder="+256..."></label>
            <label><span>Temporary password</span><input id="newTenantStaffPassword" type="password" required minlength="10" placeholder="At least 10 characters"></label>
          </div>
          <div class="onboarding-policy"><strong>Access provisioned</strong><span>SACCO Administrator role, Main Branch, member setup and operating configuration.</span></div>
          <div class="onboarding-stage-actions"><button class="button ghost" type="button" data-onboarding-next="1">← Back</button><button class="button primary" type="button" data-onboarding-next="3">Next: Subscription & Activation →</button></div>
        </section>
        <section class="onboarding-section activation-section" data-onboarding-stage="3" aria-labelledby="onboarding-trial-title">
          <header><span>03</span><div><h3 id="onboarding-trial-title">Subscription & Activation</h3><p>Select the subscription package and confirm the 30-day trial activation settings.</p></div></header>
          <input id="newTenantPaymentStatus" type="hidden" value="pending">
          <div class="activation-layout">
            <div class="trial-period-summary"><strong>30 days</strong><span>Configuration and testing</span><small>Starts immediately after registration</small></div>
            <div class="activation-rules">
              <div><span>During test</span><strong>Set up staff, officials, members and products</strong></div>
              <div><span>After test</span><strong>Subscription required for continued access</strong></div>
              <div><span>Extension</span><strong>Platform administrator may grant up to 31 extra days per request</strong></div>
            </div>
          </div>
          <div class="form-grid onboarding-fields activation-config">
            <label><span>Subscription package after test</span><select id="newTenantPackageId">${packages.map((pkg) => `<option value="${escapeHtml(pkg.id || pkg.code || "")}">${escapeHtml(pkg.name || pkg.code || "Package")}</option>`).join("") || `<option value="">Assign later</option>`}</select></label>
            <label class="check-row activation-confirm"><input id="newTenantTrialAccepted" type="checkbox" required><span>I confirm the one-month test period and subscription requirement.</span></label>
          </div>
          <div class="onboarding-stage-actions"><button class="button ghost" type="button" data-onboarding-next="2">← Back</button><button class="button primary" type="submit">Create SACCO workspace</button></div>
        </section>
      </form>
    </section>
  `;
}

function onboardingStep(number, title, copy, status) {
  return `<div class="onboarding-step ${status}" data-onboarding-step="${Number(number)}"><span>${Number(number)}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(copy)}</small></div></div>`;
}

function selfRegistrationApprovalPanel() {
  const filter = state.saccoApprovalQueueFilter || "pending";
  const search = normal(state.saccoApprovalQueueSearch || "");
  const tenants = tenantRows().filter((tenant) => tenant.id !== "tenant_platform");
  const statusGroup = (tenant) => {
    const status = normal(tenant.status);
    if (status.includes("reject") || status === "terminated") return "rejected";
    if (["active", "approved"].includes(status)) return "approved";
    if (["pending_review", "pending_self_registration"].includes(status)) return "pending";
    return "";
  };
  const counts = { pending: 0, approved: 0, rejected: 0 };
  tenants.forEach((tenant) => { const group = statusGroup(tenant); if (group) counts[group] += 1; });
  const rows = tenants.filter((tenant) => statusGroup(tenant) === filter)
    .filter((tenant) => !search || normal(`${tenant.name} ${tenant.registrationNo} ${tenant.district}`).includes(search))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return `
    ${tenantDetailPanel()}
    <section class="sacco-directory-heading"><div><p class="eyebrow">Controlled onboarding</p><h2>Approval Queue</h2><p>Review self-registered SACCOs, submitted evidence and activation readiness.</p></div></section>
    <section class="panel sacco-approval-queue">
      <div class="tabs management-tabs approval-queue-tabs">
        ${[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]].map(([id, label]) => `<button class="${filter === id ? "active" : ""}" type="button" data-sacco-approval-filter="${id}">${label} (${counts[id]})</button>`).join("")}
      </div>
      <div class="approval-queue-toolbar"><label><span>Search applications</span><input id="saccoApprovalQueueSearch" value="${escapeHtml(state.saccoApprovalQueueSearch || "")}" placeholder="Search by SACCO name or registration number"></label><span class="verification-rule">Approval requires organization identity and location evidence. Registration numbers are optional.</span></div>
      <div class="table-wrap"><table class="sacco-approval-table"><thead><tr><th>#</th><th>SACCO / applicant</th><th>District</th><th>Submitted on</th><th>Verification</th><th>Actions</th></tr></thead><tbody>
        ${rows.map((tenant, index) => {
          const evidence = saccoApplicationEvidence(tenant);
          return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(tenant.name || "SACCO")}</strong><small>${escapeHtml(tenant.registrationNo || "No registration number")}</small></td><td>${escapeHtml(tenant.district || "-")}</td><td>${escapeHtml(formatDateTime(tenant.submittedAt || tenant.createdAt || tenant.registeredAt))}</td><td><span class="status ${evidence.ready ? "active" : "pending"}">${evidence.complete}/${evidence.required} checks</span><small>${escapeHtml(evidence.ready ? "Ready for decision" : `Missing ${evidence.missing.join(", ")}`)}</small></td><td><div class="table-actions"><button class="table-action" type="button" data-row-action="tenant-detail" data-row-id="${escapeHtml(tenant.id)}">View</button>${filter === "pending" ? `<button class="table-action" type="button" data-sacco-approval-decision="approved" data-tenant-id="${escapeHtml(tenant.id)}" ${evidence.ready ? "" : "disabled"}>Approve</button><button class="table-action danger" type="button" data-sacco-approval-decision="terminated" data-tenant-id="${escapeHtml(tenant.id)}">Reject</button>` : ""}</div></td></tr>`;
        }).join("") || `<tr><td colspan="6"><div class="empty-state compact"><strong>No ${escapeHtml(filter)} applications.</strong><span>Applications will appear here as their review status changes.</span></div></td></tr>`}
      </tbody></table></div>
    </section>
  `;
}

function saccoApplicationEvidence(tenant) {
  const checks = [
    ["district", Boolean(String(tenant.district || "").trim())],
    ["organization code", Boolean(String(tenant.abbreviation || "").trim())]
  ];
  const missing = checks.filter(([, ready]) => !ready).map(([label]) => label);
  return { complete: checks.length - missing.length, required: checks.length, ready: missing.length === 0, missing };
}

// SACCO registration detail, status and form helpers extracted from app.js.

function tenantDetailPanel() {
  const tenant = state.selectedTenant || tenantRows().find((item) => item.id === state.selectedTenantId);
  if (!tenant) return "";
  const profile = state.selectedTenantProfile || {};
  const subscription = subscriptionForTenant(tenant.id);
  const canManage = hasPermission("tenants:manage");
  const canDelete = hasPermission("tenants:delete");
  const members = (Array.isArray(state.selectedTenantMembers) && state.selectedTenantMembers.length)
    ? state.selectedTenantMembers
    : dataRows("members").filter((member) => member.tenantId === tenant.id);
  const officials = state.selectedTenantOfficials || [];
  const officialSummary = (office) => {
    const assignment = officials.find((item) => item.office === office);
    const label = assignment ? `${assignment.membershipNo || ""} ${assignment.fullName || ""}`.trim() : "";
    return label || "—";
  };
  const balanceDue = Math.max(0, Number(subscription?.amount || 0) - Number(subscription?.paid || 0));
  const subHistory = dataRows("auditEvents").filter((event) =>
    (event.recordReference === tenant.id || event.recordId === tenant.id)
    && /subscription|payment|trial|billing|invoice/i.test(`${event.module || ""} ${event.action || ""}`));
  const detailTabs = [["details", "Details"], ["members", `Members${members.length ? ` (${members.length})` : ""}`], ["payments", "Payment setup"], ["subscription", "Subscription"]];
  const activeDetailTab = detailTabs.some(([id]) => id === state.moduleTabs.tenantDetail) ? state.moduleTabs.tenantDetail : "details";
  return `
    <section class="panel detail-panel sacco-account-detail-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">SACCO application review</p>
          <h2>${escapeHtml(tenant.name || "Selected SACCO")}</h2>
          <p>Code ${escapeHtml(tenant.abbreviation || tenant.id || "")} &middot; ${escapeHtml(tenant.district || "-")} &middot; ${escapeHtml(tenant.registrationNo || "-")}</p>
        </div>
        <div class="detail-header-actions">
          <span class="status ${normal(tenant.status).includes("active") ? "active" : "pending"}">${escapeHtml(labelize(tenant.status || "Pending"))}</span>
          <button class="button ghost" type="button" data-action="close-tenant-detail">Close</button>
        </div>
      </div>
      ${state.selectedTenantMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTenantMessage)}</strong></div>` : ""}
      ${state.selectedTenantError ? `<div class="notice warning"><strong>Application update failed.</strong><span>${escapeHtml(state.selectedTenantError)}</span></div>` : ""}
      <div class="tabs management-tabs sacco-detail-tabs">
        ${detailTabs.map(([id, label]) => `<button class="${activeDetailTab === id ? "active" : ""}" type="button" data-module-tab-view="tenantDetail" data-module-tab="${id}">${label}</button>`).join("")}
      </div>
      ${activeDetailTab === "details" ? `<section class="detail-support-section">
        <div class="detail-section-heading"><div><h3>SACCO details</h3><span>Registration and contact profile.</span></div></div>
        <div class="detail-fact-grid">
          ${mini("SACCO code", tenant.abbreviation || tenant.id)}
          ${mini("Legal name", profile.legalName || tenant.name)}
          ${mini("District", tenant.district)}
          ${mini("Country", tenant.country || "-")}
          ${mini("Registration no.", tenant.registrationNo)}
          ${mini("Registered on", formatDate(tenant.registeredOn || tenant.createdAt || tenant.registeredAt || tenant.submittedAt))}
          ${mini("TIN", profile.tin)}
          ${mini("UMRA licence", profile.umraLicenseNo)}
          ${mini("Cooperative no.", profile.cooperativeRegistrationNo)}
          ${mini("Contact", profile.contactNumber || profile.phone)}
          ${mini("Address", profile.address)}
          ${mini("Status", labelize(tenant.status || "Pending"))}
        </div>
        ${canManage ? `<details class="detail-compact-action" open>
          <summary><span>Edit SACCO details</span><span class="status active">Editable</span></summary>
          <form id="tenantDetailsForm" class="form-grid compact-form-grid">
            <label><span>SACCO name</span><input id="editTenantName" required value="${escapeHtml(tenant.name || "")}"></label>
            <label><span>Registration number (optional)</span><input id="editTenantRegistrationNo" value="${escapeHtml(tenant.registrationNo || "")}"></label>
            <label><span>District</span><input id="editTenantDistrict" value="${escapeHtml(tenant.district || "")}"></label>
            <label><span>Country</span><input id="editTenantCountry" required value="${escapeHtml(tenant.country || "Uganda")}"></label>
            <label><span>TIN</span><input id="editTenantTin" value="${escapeHtml(profile.tin || "")}"></label>
            <label><span>UMRA licence</span><input id="editTenantUmraLicenseNo" value="${escapeHtml(profile.umraLicenseNo || "")}"></label>
            <label><span>Contact phone</span><input id="editTenantPhone" value="${escapeHtml(profile.phone || profile.contactNumber || "")}"></label>
            <label><span>Email</span><input id="editTenantEmail" type="email" value="${escapeHtml(profile.email || "")}"></label>
            <label class="wide"><span>Address</span><input id="editTenantAddress" value="${escapeHtml(profile.address || "")}"></label>
            <label class="wide"><span>Website</span><input id="editTenantWebsite" type="url" value="${escapeHtml(profile.website || "")}"></label>
            <div class="form-actions inline wide"><button class="button primary" type="submit">Save SACCO details</button></div>
          </form>
        </details>` : ""}
        <div class="detail-section-heading detail-officials-summary-heading"><div><h3>SACCO officials</h3><span>Assigned office holders. Manage them in the Members tab.</span></div></div>
        <div class="detail-fact-grid">
          ${mini("Chairperson", officialSummary("chairperson"))}
          ${mini("Secretary", officialSummary("secretary"))}
          ${mini("Treasurer", officialSummary("treasurer"))}
        </div>
        ${canDelete ? `<details class="detail-compact-action">
          <summary><span>Remove this SACCO</span><span class="status pending">Restricted</span></summary>
          <div class="notice warning"><strong>Permanent deletion is only available for test or empty SACCOs.</strong><span>SACCOs with posted financial transactions must be deactivated so their financial audit trail remains intact.</span></div>
          <form id="deleteTenantForm" class="form-grid single">
            <label><span>Type ${escapeHtml(tenant.abbreviation || "the SACCO code")} to confirm</span><input id="deleteTenantConfirmCode" required autocomplete="off"></label>
            <div class="form-actions"><button class="button danger" type="submit">Permanently delete SACCO</button></div>
          </form>
        </details>` : ""}
      </section>` : ""}
      ${activeDetailTab === "members" ? `
      ${saccoOfficialsPanel(tenant, canManage)}
      <section class="detail-support-section detail-history-full-section">
        <div class="detail-section-heading"><div><h3>Members</h3><span>${members.length} member${members.length === 1 ? "" : "s"} registered in this SACCO.</span></div></div>
        ${canManage ? `<form id="addTenantMemberForm" class="form-grid compact-form-grid detail-add-member-form">
          <label><span>Full name</span><input id="newTenantMemberName" required placeholder="e.g. Sarah Nakimuli"></label>
          <label><span>Phone</span><input id="newTenantMemberPhone" placeholder="+2567..."></label>
          <label><span>Email</span><input id="newTenantMemberEmail" type="email" autocomplete="off" placeholder="name@example.com"></label>
          <label><span>National ID (optional)</span><input id="newTenantMemberNationalId" autocomplete="off"></label>
          <p class="form-hint wide">Provide at least a phone number or an email address.</p>
          <div class="form-actions inline wide"><button class="button primary" type="submit">Add member</button></div>
        </form>` : ""}
        ${recordTable("SACCO members", (canManage ? members.map((member) => {
          const status = normal(member.status);
          const kyc = normal(member.kycStatus);
          const pending = status === "pending_approval" || status === "applicant";
          const inactive = ["inactive", "suspended", "exited", "dormant"].includes(status);
          const kycVerified = kyc === "verified";
          return (pending || inactive || !kycVerified)
            ? { ...member, action: "tenant-member", actionId: member.id, canApprove: pending, canReject: pending, canReactivate: inactive, canVerifyKyc: !kycVerified, canRejectKyc: kyc === "pending_verification" }
            : { ...member, action: "none" };
        }) : members), ["membershipNo", "fullName", "status", "kycStatus", "savingsBalance", "phone"], { panelClass: "detail-history-table" })}
      </section>` : ""}
      ${activeDetailTab === "payments" ? `<div class="detail-secondary-sections">
        ${platformCollectionModePanel(tenant)}
        ${platformTenantPaymentAccountsPanel(tenant, canManage)}
      </div>` : ""}
      ${activeDetailTab === "subscription" ? `
      <section class="detail-readiness-section">
        <div class="detail-section-heading"><div><h3>Subscription</h3><span>Billing and operating access.</span></div><span class="status ${normal(subscription?.status).includes("active") ? "active" : "pending"}">${escapeHtml(labelize(subscription?.status || "None"))}</span></div>
        ${subscription ? `<div class="detail-fact-grid detail-readiness-facts">
          ${mini("Invoice", subscription.invoice || subscription.id)}
          ${mini("Package", subscription.tierLabel || subscription.packageId || "-")}
          ${mini("Amount", money.format(subscription.amount || 0))}
          ${mini("Paid", money.format(subscription.paid || 0))}
          ${mini("Balance due", money.format(balanceDue))}
          ${mini("Member capacity", subscription.paidMemberCapacity || 0)}
          ${mini("Payment stage", saccoPaymentStageFor(tenant || {}, subscription))}
          ${mini("Operating access", subscriptionAccessLabelFor(subscription || {}, tenant || {}))}
          ${mini("Expiry", formatDate(subscription.expiry))}
        </div>` : `<div class="notice compact"><strong>No subscription on record.</strong></div>`}
      </section>
      <section class="detail-support-section detail-history-full-section">
        <div class="detail-section-heading"><div><h3>Subscription history</h3><span>Billing, payment and trial activity.</span></div></div>
        ${recordTable("Subscription history", subHistory, ["createdAt", "actor", "action", "result"], { panelClass: "detail-history-table" })}
      </section>` : ""}
      ${canManage ? `<div class="detail-compact-actions">
        ${canManage ? `<details class="detail-compact-action">
          <summary><span>Access decision</span><span class="status ${normal(tenant.status).includes("suspended") ? "pending" : "active"}">${escapeHtml(labelize(tenant.status || "Pending"))}</span></summary>
          <form id="tenantStatusForm" class="form-grid single detail-decision-form">
            <input type="hidden" id="selectedTenantId" value="${escapeHtml(tenant.id)}">
            <label><span>Approval decision</span>
              <select id="selectedTenantStatus">
                ${tenantStatusOptions().map((option) => `<option value="${option.value}" ${option.value === tenant.status ? "selected" : ""}>${option.label}</option>`).join("")}
              </select>
            </label>
            <div class="form-actions">
              <button class="button primary" type="submit">Save decision</button>
              <button class="button secondary" type="button" data-tenant-status="active">Activate</button>
              <button class="button secondary" type="button" data-tenant-status="inactive">Deactivate</button>
              <button class="button secondary" type="button" data-tenant-status="suspended">Suspend</button>
            </div>
          </form>
        </details>` : ""}
      </div>` : ""}
    </section>
  `;
}

function saccoOfficialsPanel(tenant, canManage) {
  const offices = ["chairperson", "secretary", "treasurer"];
  const officials = state.selectedTenantOfficials || [];
  const tenantMembers = (Array.isArray(state.selectedTenantMembers) && state.selectedTenantMembers.length)
    ? state.selectedTenantMembers
    : dataRows("members").filter((member) => member.tenantId === tenant.id);
  const assignedCount = offices.filter((office) => officials.find((item) => item.office === office && item.validMember)).length;
  const complete = assignedCount === offices.length;
  const memberOptions = (selectedId) => tenantMembers.map((member) => `<option value="${escapeHtml(member.id)}" ${member.id === selectedId ? "selected" : ""}>${escapeHtml(member.membershipNo || "")} - ${escapeHtml(member.fullName || "")}</option>`).join("");
  return `<section class="detail-decision-section sacco-officials-panel">
    <div class="detail-section-heading">
      <div><h3>SACCO officials</h3><span>Assign one chairperson, one secretary and one treasurer. Each official must be a registered member, and one member can hold only one office.</span></div>
      <span class="status ${complete ? "active" : "pending"}">${complete ? "Ready" : `${assignedCount}/3 assigned`}</span>
    </div>
    ${tenantMembers.length < 3 ? `<div class="notice warning"><strong>At least 3 members are required.</strong><span>Create three SACCO members before activation.</span>${canManage ? `<button class="button secondary" type="button" data-action="open-member-registration-for-tenant">Create members</button>` : ""}</div>` : ""}
    <div class="collection-account-list">
      ${offices.map((office) => {
        const assignment = officials.find((item) => item.office === office) || { office };
        const assignedMember = tenantMembers.find((member) => member.id === assignment.memberId);
        const staffLinked = Boolean(assignedMember?.linkedUserId);
        return `<div class="collection-account-row payment-account-editor">
          <div>
            <strong>${escapeHtml(labelize(office))}</strong>
            <span>${assignment.fullName ? `${escapeHtml(assignment.membershipNo || "")} / ${escapeHtml(assignment.fullName)}` : "Not assigned"}</span>
            <small>${assignment.validMember ? (staffLinked ? "Member and staff account linked" : "Registered member; staff access not granted") : "Required before activation"}</small>
          </div>
          ${canManage ? `<div class="form-grid compact-form-grid">
            <label class="wide"><span>${escapeHtml(labelize(office))}</span><select id="saccoOfficial-${office}" ${tenantMembers.length ? "" : "disabled"}>
              <option value="">Select member</option>
              ${memberOptions(assignment.memberId)}
            </select></label>
            <div class="form-actions inline wide">
              <button class="button secondary" type="button" data-assign-sacco-official="${office}" ${tenantMembers.length ? "" : "disabled"}>Save ${escapeHtml(labelize(office))}</button>
              ${assignment.memberId && !staffLinked ? `<button class="button primary" type="button" data-grant-official-staff="${office}" data-member-id="${escapeHtml(assignment.memberId)}">Grant staff access</button>` : ""}
              ${staffLinked ? `<span class="status active">Staff linked</span>` : ""}
              ${assignment.memberId ? `<button class="button secondary" type="button" data-send-member-credentials="sms" data-member-id="${escapeHtml(assignment.memberId)}">Send SMS</button><button class="button secondary" type="button" data-send-member-credentials="email" data-member-id="${escapeHtml(assignment.memberId)}">Send email</button>` : ""}
            </div>
          </div>` : ""}
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function platformTenantPaymentAccountsPanel(tenant, canManage) {
  const accounts = buildSaccoCollectionAccountReviewRows(state.selectedTenantPaymentAccounts || [], labelize);
  const editRow = (account) => {
    const id = account.id || "";
    const network = normal(account.network || "mtn");
    return `
      <div class="collection-account-row payment-account-editor">
        <div>
          <strong>${escapeHtml((account.network || account.channel || "Account").toString().toUpperCase())}</strong>
          <span>${escapeHtml(account.accountName || "")} / ${escapeHtml(account.accountNumber || "")}</span>
          <small>${escapeHtml(account.active ? "Active" : "Inactive")}${account.instructions ? " / " + escapeHtml(account.instructions) : ""}</small>
        </div>
        ${canManage ? `
          <div class="form-grid compact-form-grid">
            <label><span>Network</span><select id="caEditNetwork-${escapeHtml(id)}"><option value="mtn" ${network === "mtn" ? "selected" : ""}>MTN</option><option value="airtel" ${network === "airtel" ? "selected" : ""}>Airtel</option></select></label>
            <label><span>Account name</span><input id="caEditAccountName-${escapeHtml(id)}" value="${escapeHtml(account.accountName || "")}"></label>
            <label><span>Number / merchant code</span><input id="caEditAccountNumber-${escapeHtml(id)}" value="${escapeHtml(account.accountNumber || "")}"></label>
            <label><span>Status</span><select id="caEditActive-${escapeHtml(id)}"><option value="true" ${account.active ? "selected" : ""}>Active</option><option value="false" ${!account.active ? "selected" : ""}>Inactive</option></select></label>
            <label class="wide"><span>Instructions</span><input id="caEditInstructions-${escapeHtml(id)}" value="${escapeHtml(account.instructions || "")}"></label>
            <div class="form-actions inline wide">
              <button class="button secondary" type="button" data-update-collection-account="${escapeHtml(id)}" data-account-tenant-id="${escapeHtml(tenant.id || "")}">Update account</button>
              <button class="button ghost" type="button" data-remove-collection-account="${escapeHtml(id)}" data-account-tenant-id="${escapeHtml(tenant.id || "")}">Delete account</button>
            </div>
          </div>
        ` : ""}
      </div>`;
  };
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h3>Create / update / delete SACCO payment accounts</h3>
          <p>Manage the SACCO-owned MTN and Airtel collection accounts that members pay into.</p>
        </div>
        <span class="status ${accounts.length ? "active" : "pending"}">${accounts.length ? `${accounts.length} account(s)` : "Setup needed"}</span>
      </div>
      ${state.collectionAccountMessage ? `<div class="notice compact"><strong>${escapeHtml(state.collectionAccountMessage)}</strong></div>` : ""}
      ${state.collectionAccountError ? `<div class="notice warning"><strong>Could not save SACCO payment account.</strong><span>${escapeHtml(state.collectionAccountError)}</span></div>` : ""}
      ${accounts.length
        ? recordTable("SACCO MTN and Airtel payment accounts", accounts, ["channel", "provider", "accountName", "accountNumber", "branch", "status"])
        : `<div class="notice compact"><span>This SACCO has not configured any payment accounts yet.</span></div>`}
      <div class="collection-account-list">
        ${(state.selectedTenantPaymentAccounts || []).map(editRow).join("")}
      </div>
      <form id="tenantCollectionAccountForm" class="form-grid">
        <input type="hidden" id="caChannel" value="mobile_money">
        <label><span>Network</span><select id="caNetwork" ${canManage ? "" : "disabled"}><option value="mtn">MTN</option><option value="airtel">Airtel</option></select></label>
        <label><span>Account name</span><input id="caAccountName" placeholder="SACCO collections" ${canManage ? "" : "disabled"}></label>
        <label><span>Number / merchant code</span><input id="caAccountNumber" placeholder="+256... or merchant code" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Member payment instructions</span><input id="caInstructions" placeholder="Use membership number as reference" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManage ? `<button class="button secondary" type="button" data-add-collection-account="1" data-account-tenant-id="${escapeHtml(tenant.id || "")}">Add SACCO MTN/Airtel account</button>` : `<span class="status pending">View only</span>`}
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
