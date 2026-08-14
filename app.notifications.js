function notificationsView() {
  const deliveries = buildNotificationDeliveryRows({
    deliveries: dataRows("notifications"),
    tenantName,
    memberName,
    userName,
    labelize,
    formatDateTime,
    canManageNotifications: hasPermission("notifications:manage")
  });
  const securityAlerts = loginRiskDeliveries(deliveries);
  const unreadAlerts = unreadNotificationDeliveries(deliveries);
  const failedDeliveries = failedNotificationDeliveries(deliveries);
  const notificationContractMarker = "payment_request_closed";
  const paymentExceptions = paymentExceptionDeliveries(deliveries);
  const jobRuns = buildProviderJobRunRows({ jobRuns: dataRows("providerJobRuns"), labelize, formatDateTime });
  const tabs = [["delivery-log", "Delivery log"], ["payment-exceptions", "Payment exceptions"], ["failed", "Failed"], ["unread", "Unread"], ["login-risk", "Login risk"], ["templates", "Templates"], ["job-history", "Job history"]];
  const tab = activeModuleTab("notifications", tabs);
  const deliveryTabs = ["delivery-log", "payment-exceptions", "failed", "unread", "login-risk"];
  const tabDeliveries = tab === "login-risk"
    ? securityAlerts
    : tab === "payment-exceptions"
      ? paymentExceptions
      : tab === "failed"
        ? failedDeliveries
        : tab === "unread"
          ? unreadAlerts
          : deliveries;
  const visibleDeliveries = deliveryTabs.includes(tab) ? filterNotificationDeliveryRows(tabDeliveries, state.notificationFilters || {}) : [];
  const bulkAcknowledgeIds = uniqueUnreadNotificationIds(visibleDeliveries);
  const templates = buildNotificationTemplateRows({ templates: dataRows("notificationTemplates"), tenantName });
  const notificationSummary = buildNotificationSummary(deliveries, templates);
  return `
    <div class="dashboard-grid">
      ${summary(t("deliveries"), notificationSummary.deliveryCount, "SMS, email and in-app events", "Monitor")}
      ${summary("Payment exceptions", notificationSummary.paymentExceptions, "Manually closed mobile-money requests", notificationSummary.paymentExceptions ? "Review" : "Clear")}
      ${summary(t("failedDeliveries"), notificationSummary.failedDeliveries, "Provider exceptions", "Investigate")}
      ${summary(t("loginRiskAlerts"), notificationSummary.loginRiskAlerts, "In-app admin security alerts", t("review"))}
      ${summary(t("unreadAlerts"), notificationSummary.unreadAlerts, "Need acknowledgement", "Clear")}
      ${summary(t("activeTemplates"), notificationSummary.activeTemplates, "Reusable message rules", "Edit")}
      ${summary(t("globalTemplates"), notificationSummary.globalTemplates, "Platform defaults", t("review"))}
    </div>
    ${state.notificationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.notificationMessage)}</strong></div>` : ""}
    ${state.notificationError ? `<div class="notice warning"><strong>Notification action failed.</strong><span>${escapeHtml(state.notificationError)}</span></div>` : ""}
    ${notificationDeliveryControlPanel(deliveries, templates)}
    ${notificationTemplateReadinessPanel(templates)}
    ${providerOperationalEvidencePanel(deliveries)}
    ${notificationProviderStatusPanel()}
    ${moduleTabs("notifications", tabs, tab)}
    ${deliveryTabs.includes(tab) ? `<section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(tabs.find(([id]) => id === tab)?.[1] || "Delivery log")}</h2>
          <p>${visibleDeliveries.length} delivery attempt(s) after filters. ${bulkAcknowledgeIds.length} visible unread alert(s) can be acknowledged.</p>
        </div>
        <button class="button secondary" type="button" data-notification-bulk-ack="${escapeHtml(bulkAcknowledgeIds.join(","))}" ${bulkAcknowledgeIds.length ? "" : "disabled"}>Acknowledge visible alerts</button>
      </div>
    </section>` : ""}
    ${deliveryTabs.includes(tab) ? notificationDeliveryFilters(deliveries) : ""}
    ${tab === "payment-exceptions" ? paymentExceptionGuide(visibleDeliveries) : ""}
    ${deliveryTabs.includes(tab) ? recordTable(`Notification delivery monitor - ${tabs.find(([id]) => id === tab)?.[1] || "Delivery log"}`, visibleDeliveries, ["tenantName", "event", "channel", "provider", "recipient", "deliveryStatus", "alertStatus", "message", "resource", "sentAt", "createdAt"]) : ""}
    ${tab === "templates" ? `${notificationTemplatePanel()}${notificationTemplateDetailPanel(templates)}${recordTable("Notification templates", templates, ["tenantName", "eventType", "channel", "title", "status", "updatedAt"])}` : ""}
    ${tab === "job-history" ? `${providerJobHistoryPanel(jobRuns)}${recordTable("Provider job run history", jobRuns, ["jobLabel", "runStatus", "scanned", "updated", "failed", "message", "startedAtDisplay", "finishedAtDisplay"])}` : ""}
  `;
}

function paymentExceptionGuide(rows) {
  const unread = rows.filter((row) => !row.readAt).length;
  const latest = rows[0];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Payment exception alerts</h2>
          <p>Staff-visible alerts for mobile-money requests manually marked failed, expired or cancelled.</p>
        </div>
        <span class="status ${unread ? "pending" : "active"}">${unread ? `${unread} unread` : "Clear"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Exception alerts", rows.length)}
        ${mini("Unread alerts", unread)}
        ${mini("Latest exception", latest?.createdAt ? formatDateTime(latest.createdAt) : "None")}
        ${mini("Action", rows.length ? "Review request and member follow-up" : "No staff action pending")}
      </div>
    </section>
  `;
}

function providerJobHistoryPanel(jobRuns) {
  const latest = jobRuns[0] || {};
  const failures = jobRuns.filter((run) => Number(run.failed || 0) > 0 || normal(run.status).includes("failed"));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Provider job history</h2>
          <p>Manual and scheduled provider reconciliation runs for operations review.</p>
        </div>
        ${hasPermission("notifications:manage") ? `<button class="button primary" type="button" data-action="run-mobile-money-reconciliation">Run reconciliation now</button>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="mini-grid">
        ${mini("Recorded job runs", jobRuns.length ? `${jobRuns.length} latest run(s)` : "None")}
        ${mini("Latest run", latest.finishedAt ? `${labelize(latest.jobName || "job")} - ${formatDateTime(latest.finishedAt)}` : "No run recorded")}
        ${mini("Latest status", latest.status ? labelize(latest.status) : "Pending")}
        ${mini("Runs needing review", failures.length ? `${failures.length} run(s)` : "Clear")}
      </div>
    </section>
  `;
}

function providerOperationalEvidencePanel(deliveries) {
  const evidence = state.providerOperationalEvidence || {};
  const mobileMoney = evidence.mobileMoney || {};
  const deliveryCount = evidence.notificationDeliveries ?? deliveries.length;
  const failed = evidence.failedNotificationDeliveries ?? deliveries.filter((row) => normal(row.status).includes("failed")).length;
  const pendingPayments = mobileMoney.pendingPaymentRequests ?? 0;
  const failedPayments = mobileMoney.failedPaymentRequests ?? 0;
  const callbacks = mobileMoney.callbacksReceived ?? 0;
  const providerOptions = Array.isArray(mobileMoney.providerOptions) ? mobileMoney.providerOptions : [];
  const reconciliation = mobileMoney.reconciliationSummary || {};
  const status = evidence.evidenceStatus || (failed || pendingPayments || failedPayments ? "review" : "ready");
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Provider operational evidence</h2>
          <p>SMS, email and mobile-money readiness from backend records.</p>
        </div>
        <div class="button-row">
          ${hasPermission("notifications:manage") ? `<button class="button secondary" type="button" data-action="run-mobile-money-reconciliation">Run reconciliation now</button>` : ""}
          <span class="status ${normal(status) === "ready" ? "active" : "pending"}">${escapeHtml(labelize(status))}</span>
        </div>
      </div>
      <div class="mini-grid">
        ${mini("Notification deliveries", deliveryCount)}
        ${mini("Failed deliveries", failed)}
        ${mini("Providers ready", evidence.notificationProvidersReady ?? "-")}
        ${mini("Provider issues", evidence.notificationProvidersUnavailable ?? "-")}
        ${mini("Payment requests", mobileMoney.paymentRequests ?? 0)}
        ${mini("Pending payments", pendingPayments)}
        ${mini("Failed payments", failedPayments)}
        ${mini("Provider callbacks", callbacks)}
      </div>
      <div class="mini-grid">
        ${mini("Active payment rails", providerOptions.length ? providerOptions.map((row) => row.label || row.providerId || row.network).join(", ") : "Default mobile money")}
        ${mini("Mobile money evidence", labelize(mobileMoney.evidenceStatus || "ready"))}
        ${mini("Reconciliation job", reconciliation.ranAt ? formatDateTime(reconciliation.ranAt) : "Not run yet")}
        ${mini("Job run status", labelize(reconciliation.status || "not_run"))}
        ${mini("Requests checked", reconciliation.scanned ?? 0)}
        ${mini("Requests updated", reconciliation.updated ?? 0)}
        ${mini("Check failures", reconciliation.failed ?? 0)}
        ${mini("Last evidence check", evidence.checkedAt ? formatDateTime(evidence.checkedAt) : state.notificationProviderStatusCheckedAt ? formatDateTime(state.notificationProviderStatusCheckedAt) : "-")}
      </div>
      ${normal(status) !== "ready" ? `<div class="notice warning"><strong>Provider follow-up required.</strong><span>Review failed deliveries, pending payment requests, provider status and callback reconciliation before closing operations.</span></div>` : ""}
    </section>
  `;
}

function notificationDeliveryControlPanel(deliveries, templates) {
  const failed = deliveries.filter((row) => normal(row.status).includes("failed"));
  const activeTemplates = templates.filter((row) => normal(row.status) === "active");
  const channels = ["sms", "email", "in_app"];
  const missingChannels = channels.filter((channel) => !activeTemplates.some((template) => normal(template.channel) === channel));
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(t("notificationDeliveryControl"))}</h2>
          <p>Review delivery failures, template coverage and channels before retrying member or SACCO messages.</p>
        </div>
        <span class="status ${failed.length || missingChannels.length ? "pending" : "active"}">${failed.length || missingChannels.length ? "Needs review" : "Ready"}</span>
      </div>
      <div class="mini-grid">
        ${mini("Delivery exceptions", failed.length ? `${failed.length} failed notification(s)` : "Clear")}
        ${mini("Template coverage", `${activeTemplates.length} active template(s) across ${uniqueCount(activeTemplates, "channel")} channel(s)`)}
        ${mini("Missing channels", missingChannels.length ? missingChannels.map(labelize).join(", ") : "SMS, email and in-app ready")}
        ${mini("Action", failed.length ? "Investigate provider or recipient issue" : missingChannels.length ? "Configure template coverage" : "Monitor delivery log")}
      </div>
    </section>
  `;
}

function notificationTemplateReadinessPanel(templates) {
  const activeTemplates = templates.filter((row) => normal(row.status) === "active");
  const globalTemplates = activeTemplates.filter((row) => !row.tenantId);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template setup</h2>
          <p>Notification templates define reusable SMS, email and in-app messages for platform and SACCO communication.</p>
        </div>
        <button class="button secondary" type="button" data-module-tab-view="notifications" data-module-tab="templates">Notification templates</button>
      </div>
      <div class="mini-grid">
        ${mini("Notification templates", templates.length)}
        ${mini("Active templates", activeTemplates.length)}
        ${mini("Global templates", globalTemplates.length)}
        ${mini("Template scope", isPlatform() ? "Platform and SACCO overrides" : "Current SACCO overrides")}
      </div>
    </section>
  `;
}

function notificationProviderStatusPanel() {
  const rows = state.notificationProviderStatus || [];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Notification provider status</h2>
          <p>Check AfroSMS credits and Gmail SMTP readiness before retrying failed SMS or email deliveries.</p>
        </div>
        <button class="button secondary" type="button" data-action="check-notification-provider-status">Check provider status</button>
      </div>
      ${state.notificationProviderStatusCheckedAt ? `<p class="helper-text">Last checked ${escapeHtml(formatDateTime(state.notificationProviderStatusCheckedAt))}</p>` : ""}
      ${rows.length ? `<div class="mini-grid">${rows.map((row) => mini(
        `${labelize(row.channel)} - ${labelize(row.provider)}`,
        `${labelize(row.status)}${row.balance ? `, ${row.balance} SMS credits` : ""}`
      )).join("")}</div>` : emptyState("Provider status not checked", "Use Check provider status to verify AfroSMS credits and Gmail readiness.")}
      ${rows.some((row) => normal(row.status) !== "ready") ? `<div class="notice warning"><strong>Provider issue detected.</strong><span>${escapeHtml(rows.filter((row) => normal(row.status) !== "ready").map((row) => row.message).join(" "))}</span></div>` : ""}
    </section>
  `;
}

function notificationDeliveryFilters(deliveries) {
  const filters = state.notificationFilters || {};
  const statuses = uniqueValues(deliveries, "status");
  const channels = uniqueValues(deliveries, "channel");
  const providers = uniqueValues(deliveries, "provider");
  const tenantOptions = uniqueValues(deliveries, "tenantId").map((tenantId) => [tenantId, tenantName(tenantId)]);
  return `
    <section class="filter-toolbar notification-filters">
      <label><span>Status</span><select data-notification-filter="status">
        ${selectOption("all", "All statuses", filters.status)}
        ${statuses.map((status) => selectOption(status, labelize(status), filters.status)).join("")}
      </select></label>
      <label><span>Channel</span><select data-notification-filter="channel">
        ${selectOption("all", "All channels", filters.channel)}
        ${channels.map((channel) => selectOption(channel, labelize(channel), filters.channel)).join("")}
      </select></label>
      <label><span>Provider</span><select data-notification-filter="provider">
        ${selectOption("all", "All providers", filters.provider)}
        ${providers.map((provider) => selectOption(provider, labelize(provider), filters.provider)).join("")}
      </select></label>
      <label><span>SACCO</span><select data-notification-filter="tenantId">
        ${selectOption("all", isPlatform() ? "All SACCOs" : "Current SACCO", filters.tenantId)}
        ${tenantOptions.map(([tenantId, name]) => selectOption(tenantId, name, filters.tenantId)).join("")}
      </select></label>
      <label><span>Date</span><input type="date" value="${escapeHtml(filters.date || "")}" data-notification-filter="date"></label>
      <button class="button secondary" type="button" data-action="clear-notification-filters">Clear filters</button>
    </section>
  `;
}

function notificationTemplatePanel() {
  const canManage = hasPermission("notifications:manage");
  const tenants = tenantRows();
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template setup</h2>
          <p>Create global platform templates or SACCO-specific overrides for notification delivery.</p>
        </div>
      </div>
      ${state.notificationTemplateMessage ? `<div class="notice compact"><strong>${escapeHtml(state.notificationTemplateMessage)}</strong></div>` : ""}
      ${state.notificationTemplateError ? `<div class="notice warning"><strong>Template setup failed.</strong><span>${escapeHtml(state.notificationTemplateError)}</span></div>` : ""}
      <form id="notificationTemplateForm" class="form-grid">
        <label><span>Template scope</span><select id="newTemplateTenantId" ${canManage ? "" : "disabled"}><option value="">Global platform template</option>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}">${escapeHtml(tenant.abbreviation || tenant.name)} - ${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        <label><span>Event type</span><select id="newTemplateEventType" ${canManage ? "" : "disabled"}>${notificationEventOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Channel</span><select id="newTemplateChannel" ${canManage ? "" : "disabled"}>${notificationChannelOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="newTemplateStatus" ${canManage ? "" : "disabled"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label><span>Title</span><input id="newTemplateTitle" required placeholder="Message title" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message body</span><textarea id="newTemplateBody" required placeholder="Use clear plain language for SMS, email or in-app messages" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create template</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function notificationTemplateDetailPanel(rows) {
  const template = rows.find((item) => item.id === state.selectedTemplateId);
  if (!template) return "";
  const canManage = hasPermission("notifications:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template editor</h2>
          <p>${escapeHtml(template.eventType)} - ${escapeHtml(template.channel)} - ${escapeHtml(template.tenantName || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-template-detail">Close</button>
      </div>
      ${state.selectedTemplateMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTemplateMessage)}</strong></div>` : ""}
      ${state.selectedTemplateError ? `<div class="notice warning"><strong>Template update failed.</strong><span>${escapeHtml(state.selectedTemplateError)}</span></div>` : ""}
      <form id="notificationTemplateEditForm" class="form-grid">
        <input type="hidden" id="selectedTemplateId" value="${escapeHtml(template.id)}">
        <label><span>Event type</span><select id="selectedTemplateEventType" ${canManage ? "" : "disabled"}>${notificationEventOptions(template.eventType).map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === template.eventType ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
        <label><span>Channel</span><select id="selectedTemplateChannel" ${canManage ? "" : "disabled"}>${notificationChannelOptions().map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === template.channel ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="selectedTemplateStatus" ${canManage ? "" : "disabled"}><option value="active" ${template.status === "active" ? "selected" : ""}>Active</option><option value="inactive" ${template.status === "inactive" ? "selected" : ""}>Inactive</option></select></label>
        <label><span>Title</span><input id="selectedTemplateTitle" value="${escapeHtml(template.title || "")}" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message body</span><textarea id="selectedTemplateBody" ${canManage ? "" : "disabled"}>${escapeHtml(template.body || "")}</textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Save template</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

