import type {
  TerekaNotification,
  TerekaNotificationTemplate,
  TerekaProviderJobRun,
  TerekaRecord,
} from "../types/domain";

export interface TerekaNotificationDeliveryRow extends TerekaNotification, TerekaRecord {
  acknowledgedAt: string;
  action: string;
  actionId?: string;
  actionLabel: string;
  alertStatus?: unknown;
  deliveryStatus: string;
  event: string;
  memberName: string;
  resource: string;
  tenantName: string;
}

export interface TerekaNotificationTemplateRow extends TerekaNotificationTemplate, TerekaRecord {
  action: string;
  actionId?: string;
  actionLabel: string;
  tenantName: string;
}

export interface TerekaProviderJobRunRow extends TerekaProviderJobRun, TerekaRecord {
  finishedAtDisplay: string;
  jobLabel: string;
  runStatus: string;
  startedAtDisplay: string;
}

export interface TerekaNotificationSummary {
  activeTemplates: number;
  deliveryCount: number;
  failedDeliveries: number;
  globalTemplates: number;
  loginRiskAlerts: number;
  paymentExceptions: number;
  unreadAlerts: number;
}

export interface TerekaNotificationFilters {
  channel?: string;
  date?: string;
  provider?: string;
  status?: string;
  tenantId?: string;
}

export interface TerekaNotificationRowsInput {
  canManageNotifications: boolean;
  deliveries: Array<TerekaNotification & TerekaRecord>;
  formatDateTime: (value: unknown) => string;
  labelize: (value: unknown) => string;
  memberName: (memberId?: string) => string;
  tenantName: (tenantId?: string) => string;
  userName: (userId?: string) => string;
}

export function buildNotificationDeliveryRows(input: TerekaNotificationRowsInput): TerekaNotificationDeliveryRow[] {
  return input.deliveries.map((delivery) => {
    const failed = normalizeNotificationText(delivery.status).includes("failed");
    const notificationId = String(delivery.notificationId || delivery.id || "");
    return {
      ...delivery,
      tenantName: input.tenantName(String(delivery.tenantId || "")),
      memberName: delivery.memberId
        ? input.memberName(String(delivery.memberId))
        : delivery.userId
          ? input.userName(String(delivery.userId))
          : "SACCO broadcast",
      event: delivery.eventType ? input.labelize(delivery.eventType) : String(delivery.title || "Notification"),
      resource: delivery.resourceType ? `${input.labelize(delivery.resourceType)} ${delivery.resourceId || ""}`.trim() : "-",
      alertStatus: delivery.readAt ? "acknowledged" : delivery.notificationStatus || delivery.status,
      deliveryStatus: String(delivery.status || "pending"),
      acknowledgedAt: delivery.readAt ? input.formatDateTime(delivery.readAt) : "-",
      action: notificationDeliveryActionFor(delivery, input.canManageNotifications),
      actionLabel: failed && input.canManageNotifications ? "Retry" : "Acknowledge",
      actionId: failed && input.canManageNotifications ? String(delivery.id || "") : notificationId,
    };
  });
}

export function buildNotificationTemplateRows(input: {
  templates: Array<TerekaNotificationTemplate & TerekaRecord>;
  tenantName: (tenantId?: string) => string;
}): TerekaNotificationTemplateRow[] {
  return input.templates.map((template) => ({
    ...template,
    tenantName: template.tenantId ? input.tenantName(String(template.tenantId)) : "Global template",
    action: "template-detail",
    actionLabel: "Edit",
    actionId: template.id,
  }));
}

export function buildProviderJobRunRows(input: {
  formatDateTime: (value: unknown) => string;
  jobRuns: Array<TerekaProviderJobRun & TerekaRecord>;
  labelize: (value: unknown) => string;
}): TerekaProviderJobRunRow[] {
  return input.jobRuns.map((run) => ({
    ...run,
    jobLabel: input.labelize(run.jobName || "provider_job"),
    runStatus: input.labelize(run.status || "unknown"),
    startedAtDisplay: run.startedAt ? input.formatDateTime(run.startedAt) : "-",
    finishedAtDisplay: run.finishedAt ? input.formatDateTime(run.finishedAt) : "-",
  }));
}

export function buildNotificationSummary(
  deliveries: TerekaNotificationDeliveryRow[],
  templates: TerekaNotificationTemplateRow[],
): TerekaNotificationSummary {
  return {
    activeTemplates: templates.filter((row) => normalizeNotificationText(row.status) === "active").length,
    deliveryCount: deliveries.length,
    failedDeliveries: failedNotificationDeliveries(deliveries).length,
    globalTemplates: templates.filter((row) => !row.tenantId).length,
    loginRiskAlerts: loginRiskDeliveries(deliveries).length,
    paymentExceptions: paymentExceptionDeliveries(deliveries).length,
    unreadAlerts: unreadNotificationDeliveries(deliveries).length,
  };
}

export function filterNotificationDeliveryRows(
  deliveries: TerekaNotificationDeliveryRow[] | null | undefined,
  filters: TerekaNotificationFilters | null | undefined,
): TerekaNotificationDeliveryRow[] {
  const activeFilters = filters || {};
  return (deliveries || []).filter((delivery) => {
    if (activeFilters.status && activeFilters.status !== "all" && normalizeNotificationText(delivery.status) !== normalizeNotificationText(activeFilters.status)) return false;
    if (activeFilters.channel && activeFilters.channel !== "all" && normalizeNotificationText(delivery.channel) !== normalizeNotificationText(activeFilters.channel)) return false;
    if (activeFilters.provider && activeFilters.provider !== "all" && normalizeNotificationText(delivery.provider) !== normalizeNotificationText(activeFilters.provider)) return false;
    if (activeFilters.tenantId && activeFilters.tenantId !== "all" && delivery.tenantId !== activeFilters.tenantId) return false;
    if (activeFilters.date && String(delivery.createdAt || delivery.sentAt || "").slice(0, 10) !== activeFilters.date) return false;
    return true;
  });
}

export function loginRiskDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[] {
  return deliveries.filter((delivery) => normalizeNotificationText(`${delivery.message} ${delivery.provider} ${delivery.channel}`).includes("login"));
}

export function unreadNotificationDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[] {
  return deliveries.filter((delivery) => !delivery.readAt && normalizeNotificationText(delivery.alertStatus).includes("unread"));
}

export function failedNotificationDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[] {
  return deliveries.filter((row) => normalizeNotificationText(row.status).includes("failed"));
}

export function paymentExceptionDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[] {
  return deliveries.filter((delivery) => normalizeNotificationText(delivery.eventType) === "payment_request_closed");
}

export function uniqueUnreadNotificationIds(deliveries: TerekaNotificationDeliveryRow[]): string[] {
  return deliveries
    .filter((delivery) => delivery.notificationId && !delivery.readAt)
    .map((delivery) => String(delivery.notificationId))
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function notificationDeliveryActionFor(delivery: TerekaRecord, canManageNotifications: boolean): string {
  if (normalizeNotificationText(delivery.status).includes("failed") && canManageNotifications) return "notification-retry";
  if (delivery.notificationId && !delivery.readAt) return "notification-acknowledge";
  return "none";
}

function normalizeNotificationText(value: unknown): string {
  return String(value || "").toLowerCase();
}
