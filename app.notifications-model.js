function buildNotificationDeliveryRows(input) {
  return input.deliveries.map((delivery) => {
    const failed = normalizeNotificationModelText(delivery.status).includes("failed");
    const notificationId = String(delivery.notificationId || delivery.id || "");
    return {
      ...delivery,
      tenantName: input.tenantName(String(delivery.tenantId || "")),
      memberName: delivery.memberId ? input.memberName(String(delivery.memberId)) : delivery.userId ? input.userName(String(delivery.userId)) : "SACCO broadcast",
      event: delivery.eventType ? input.labelize(delivery.eventType) : String(delivery.title || "Notification"),
      resource: delivery.resourceType ? `${input.labelize(delivery.resourceType)} ${delivery.resourceId || ""}`.trim() : "-",
      alertStatus: delivery.readAt ? "acknowledged" : delivery.notificationStatus || delivery.status,
      deliveryStatus: String(delivery.status || "pending"),
      acknowledgedAt: delivery.readAt ? input.formatDateTime(delivery.readAt) : "-",
      action: notificationDeliveryActionFor(delivery, input.canManageNotifications),
      actionLabel: failed && input.canManageNotifications ? "Retry" : "Acknowledge",
      actionId: failed && input.canManageNotifications ? String(delivery.id || "") : notificationId
    };
  });
}

function buildNotificationTemplateRows(input) {
  return input.templates.map((template) => ({
    ...template,
    tenantName: template.tenantId ? input.tenantName(String(template.tenantId)) : "Global template",
    action: "template-detail",
    actionLabel: "Edit",
    actionId: template.id
  }));
}

function buildProviderJobRunRows(input) {
  return input.jobRuns.map((run) => ({
    ...run,
    jobLabel: input.labelize(run.jobName || "provider_job"),
    runStatus: input.labelize(run.status || "unknown"),
    startedAtDisplay: run.startedAt ? input.formatDateTime(run.startedAt) : "-",
    finishedAtDisplay: run.finishedAt ? input.formatDateTime(run.finishedAt) : "-"
  }));
}

function buildNotificationSummary(deliveries, templates) {
  return {
    activeTemplates: templates.filter((row) => normalizeNotificationModelText(row.status) === "active").length,
    deliveryCount: deliveries.length,
    failedDeliveries: failedNotificationDeliveries(deliveries).length,
    globalTemplates: templates.filter((row) => !row.tenantId).length,
    loginRiskAlerts: loginRiskDeliveries(deliveries).length,
    paymentExceptions: paymentExceptionDeliveries(deliveries).length,
    unreadAlerts: unreadNotificationDeliveries(deliveries).length
  };
}

function filterNotificationDeliveryRows(deliveries, filters) {
  const activeFilters = filters || {};
  return (deliveries || []).filter((delivery) => {
    if (activeFilters.status && activeFilters.status !== "all" && normalizeNotificationModelText(delivery.status) !== normalizeNotificationModelText(activeFilters.status)) return false;
    if (activeFilters.channel && activeFilters.channel !== "all" && normalizeNotificationModelText(delivery.channel) !== normalizeNotificationModelText(activeFilters.channel)) return false;
    if (activeFilters.provider && activeFilters.provider !== "all" && normalizeNotificationModelText(delivery.provider) !== normalizeNotificationModelText(activeFilters.provider)) return false;
    if (activeFilters.tenantId && activeFilters.tenantId !== "all" && delivery.tenantId !== activeFilters.tenantId) return false;
    if (activeFilters.date && String(delivery.createdAt || delivery.sentAt || "").slice(0, 10) !== activeFilters.date) return false;
    return true;
  });
}

function loginRiskDeliveries(deliveries) {
  return deliveries.filter((delivery) => normalizeNotificationModelText(`${delivery.message} ${delivery.provider} ${delivery.channel}`).includes("login"));
}

function unreadNotificationDeliveries(deliveries) {
  return deliveries.filter((delivery) => !delivery.readAt && normalizeNotificationModelText(delivery.alertStatus).includes("unread"));
}

function failedNotificationDeliveries(deliveries) {
  return deliveries.filter((row) => normalizeNotificationModelText(row.status).includes("failed"));
}

function paymentExceptionDeliveries(deliveries) {
  return deliveries.filter((delivery) => normalizeNotificationModelText(delivery.eventType) === "payment_request_closed");
}

function uniqueUnreadNotificationIds(deliveries) {
  return deliveries
    .filter((delivery) => delivery.notificationId && !delivery.readAt)
    .map((delivery) => String(delivery.notificationId))
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

function notificationDeliveryActionFor(delivery, canManageNotifications) {
  if (normalizeNotificationModelText(delivery.status).includes("failed") && canManageNotifications) return "notification-retry";
  if (delivery.notificationId && !delivery.readAt) return "notification-acknowledge";
  return "none";
}

function normalizeNotificationModelText(value) {
  return String(value || "").toLowerCase();
}
