// API helpers for Tereka Online.
// Loaded before app.js as a classic browser script.

const API_BASE = "/api/v1";
const STAFF_TOKEN_KEY = "tereka-staff-token";
const MEMBER_TOKEN_KEY = "tereka-member-token";
const HIGH_VOLUME_PAGE_SIZE = 200;
const HIGH_VOLUME_ENDPOINTS = new Set(["members", "transactions", "loans", "notifications", "auditEvents", "messages"]);
const HIGH_VOLUME_TABLES = [
  {
    key: "members",
    path: "/members",
    titles: ["member-list"],
    sortColumns: { membershipNo: "membershipNo", fullName: "fullName", phone: "phone", email: "email", kycStatus: "kycStatus", status: "status", joiningDate: "joiningDate" }
  },
  {
    key: "transactions",
    path: "/financial-transactions",
    titles: ["transaction-list", "recent-transactions"],
    sortColumns: { reference: "reference", postedAt: "postedAt", createdAt: "createdAt", type: "type", channel: "channel", amount: "amount", status: "status" }
  },
  {
    key: "loans",
    path: "/loans",
    titles: ["loan-application-list", "loan-work-queue"],
    sortColumns: { product: "product", requestedAmount: "amount", amount: "amount", outstandingBalance: "balance", balance: "balance", monthlyInstallment: "monthlyInstallment", status: "status", stage: "stage", createdAt: "createdAt", disbursedAt: "disbursedAt" }
  },
  {
    key: "notifications",
    path: "/notifications/deliveries",
    titles: ["notification-delivery-monitor"],
    sortColumns: { channel: "channel", provider: "provider", recipient: "recipient", status: "status", deliveryStatus: "status", sentAt: "sentAt", createdAt: "createdAt" }
  },
  {
    key: "auditEvents",
    path: "/audit-events",
    titles: ["audit-log", "recent-audit-events", "sensitive-audit-queue", "platform-audit-trail", "sacco-audit-trail"],
    sortColumns: { createdAt: "createdAt", actor: "actorName", actorName: "actorName", action: "action", resourceType: "resourceType", recordReference: "resourceId", resourceId: "resourceId", ipAddress: "ipAddress", tenantName: "tenantId", tenantId: "tenantId" }
  }
];

function pagedEndpointPath(key, path) {
  if (!HIGH_VOLUME_ENDPOINTS.has(key)) return path;
  return `${path}${path.includes("?") ? "&" : "?"}page=0&size=${HIGH_VOLUME_PAGE_SIZE}`;
}

function pageEnvelope(value) {
  return value && typeof value === "object" && value.__page ? value.__page : null;
}

function highVolumeTableConfig(tableKey) {
  return HIGH_VOLUME_TABLES.find((config) => config.titles.some((title) => tableKey === title || tableKey.startsWith(`${title}-`))) || null;
}

function serverTablePagePath(config, page, search, sort, direction) {
  const params = new URLSearchParams({
    page: String(Math.max(0, Number(page || 0))),
    size: String(HIGH_VOLUME_PAGE_SIZE)
  });
  if (search && String(search).trim()) params.set("search", String(search).trim());
  if (sort && String(sort).trim()) params.set("sort", String(sort).trim());
  if (direction && String(direction).trim()) params.set("direction", String(direction).trim());
  return `${config.path}?${params.toString()}`;
}

function serverSortColumn(config, column) {
  return config?.sortColumns?.[column] || null;
}

async function optionalApi(path, fallback) {
  try {
    return await api(path);
  } catch (error) {
    if (![401, 403, 404].includes(error.status)) state.lastError = error.message;
    return fallback;
  }
}

async function api(path, options = {}, token = state.token) {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.code = payload.error?.code || payload.code || "";
    if (response.status === 401 && token && token === state.token && state.auth !== "none") {
      expireLocalSession("Your session has expired. Please login again.");
    }
    throw error;
  }
  if (payload.page && Array.isArray(payload.data)) {
    Object.defineProperty(payload.data, "__page", {
      value: payload.page,
      enumerable: false
    });
  }
  return payload.data ?? payload;
}

async function downloadApiFile(path, filename, token = state.token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error?.message || payload.message || `Download failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
