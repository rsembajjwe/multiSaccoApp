// Shared UI rendering primitives extracted from app.js.

function dashboardIntro(title, copy) {
  return `
    <div class="role-banner">
      <div><p class="eyebrow">${escapeHtml(title)}</p><h2>${escapeHtml(copy)}</h2></div>
      <span class="status active">Role filtered</span>
    </div>
  `;
}

function rolePriorityPanel(_title, _rows) {
  // Removed: decorative "role dashboard" priority panels are no longer rendered (production declutter).
  return "";
}

function roleAccessPanel(title = "My role access") {
  const visible = visibleModules();
  const source = state.auth === "member" ? memberModules : isPlatform() ? platformModules : saccoModules;
  const hidden = source.filter((item) => !visible.some((allowed) => allowed[0] === item[0]));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>${escapeHtml(roleLabel())} can use ${visible.length} module(s). Protected modules are hidden from the menu and dashboard actions.</p>
        </div>
        <span class="status active">Access filtered</span>
      </div>
      <div class="access-grid">
        ${visible.map((item) => `<div><strong>${escapeHtml(item[1])}</strong><span>${escapeHtml(item[2])}</span></div>`).join("")}
      </div>
      ${hidden.length ? `<p class="muted-note">Hidden for this role: ${hidden.map((item) => escapeHtml(item[1])).join(", ")}.</p>` : ""}
    </section>
  `;
}

function summary(label, value, detail, action) {
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button">${action}</button></article>`;
}

function summaryLink(label, value, detail, action, view) {
  const allowed = canAccessView(view);
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button" ${allowed ? `data-summary-view="${escapeHtml(view)}"` : "disabled"}>${allowed ? action : t("dashboardOnly")}</button></article>`;
}

function mini(label, value) {
  return `<div class="mini-fact"><span>${label}</span><strong>${escapeHtml(String(value || t("none")))}</strong></div>`;
}

function chartCard(title, labels, values) {
  const max = Math.max(...values, 1);
  return `<section class="panel"><h2>${title}</h2><div class="bar-chart">${labels.map((label, index) => `<div><span>${label}</span><b style="width:${Math.max(8, values[index] / max * 100)}%"></b><strong>${values[index]}</strong></div>`).join("")}</div></section>`;
}

function activityPanel(title, rows) {
  return `<section class="panel"><h2>${title}</h2><ul class="activity-list">${rows.map((row) => `<li><strong>${row[0] || t("record")}</strong><span>${row[1] || ""}</span><em>${row[2] || t("pending")}</em></li>`).join("") || `<li><strong>${t("noRecordsYet")}</strong><span>${t("refreshToTryAgain")}</span><em>${t("empty")}</em></li>`}</ul></section>`;
}

function rowAction(row) {
  if (row.action === "none") return `<span class="status pending">No action</span>`;
  if (row.action === "member-draft" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-member-draft-sync="${escapeHtml(row.actionId)}">Sync</button>
        <button class="table-action danger" type="button" data-member-draft-discard="${escapeHtml(row.actionId)}">Discard</button>
      </div>
    `;
  }
  if (row.action === "member-guarantor" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-member-guarantor-action="accepted" data-row-id="${escapeHtml(row.actionId)}">Accept</button>
        <button class="table-action danger" type="button" data-member-guarantor-action="rejected" data-row-id="${escapeHtml(row.actionId)}">Reject</button>
      </div>
    `;
  }
  if (row.action === "member-loan-history" && row.actionId) {
    return `<button class="table-action" type="button" data-member-loan-history="${escapeHtml(row.actionId)}">History</button>`;
  }
  if (row.action === "notification-acknowledge" && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="notification-acknowledge" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Acknowledge")}</button>`;
  }
  if (row.action === "notification-retry" && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="notification-retry" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Retry")}</button>`;
  }
  if (row.action === "member-notification-acknowledge" && row.actionId) {
    return `<button class="table-action" type="button" data-member-notification-acknowledge="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Acknowledge")}</button>`;
  }
  if (row.action === "payment-provider-status" && row.actionId) {
    return `<button class="table-action" type="button" data-payment-provider-status="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Check status")}</button>`;
  }
  if (row.action === "document-retention" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-document-retention-action="review_due" data-row-id="${escapeHtml(row.actionId)}">Review</button>
        <button class="table-action" type="button" data-document-retention-action="retained" data-row-id="${escapeHtml(row.actionId)}">Retain</button>
        <button class="table-action danger" type="button" data-document-retention-action="disposed" data-row-id="${escapeHtml(row.actionId)}">Dispose</button>
      </div>
    `;
  }
  if (row.action && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="${escapeHtml(row.action)}" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "View")}</button>`;
  }
  return `<button class="table-action" type="button">View</button>`;
}

function filterToolbar(placeholder, primary, secondary) {
  return `
    <section class="filter-toolbar">
      <label><span>Search</span><input value="${escapeHtml(state.search)}" data-search-input placeholder="${placeholder}"></label>
      <label><span>Status</span><select><option>All statuses</option><option>Active</option><option>Pending</option><option>Failed</option></select></label>
      <label><span>Date range</span><input type="date"></label>
      <button class="button primary" type="button">${primary}</button>
      <button class="button secondary" type="button">${secondary}</button>
    </section>
  `;
}

function wizardCard(title, steps) {
  return `<section class="panel"><h2>${title}</h2><div class="stepper">${steps.map((step, index) => `<div><span>${index + 1}</span><strong>${step}</strong></div>`).join("")}</div></section>`;
}

function tabsCard(title, tabs) {
  return `<section class="panel"><h2>${title}</h2><div class="tabs">${tabs.map((tab, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</div><div class="blueprint">This screen follows the uploaded UI/UX requirement and is ready for deeper actions, validation, confirmations and exports.</div></section>`;
}

function formPreview(title, fields) {
  return `<section class="panel"><h2>${title}</h2><div class="form-grid">${fields.map((item) => `<label><span>${item}</span><input placeholder="${item}"></label>`).join("")}</div><div class="form-actions"><button class="button secondary" type="button">Save draft</button><button class="button primary" type="button">Submit</button></div></section>`;
}

function emptyState(title, detail) {
  return `<div class="empty-state"><strong>${title}</strong><p>${detail}</p></div>`;
}

function renderLoading(message) {
  setHtml(`<main class="loading-screen"><div class="loader"></div><h1>${message}</h1><p>Please wait while Tereka Online prepares your workspace.</p></main>`);
}
