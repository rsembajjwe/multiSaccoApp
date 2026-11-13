import { readFile } from "node:fs/promises";

const openapi = await readFile("openapi.yaml", "utf8");

const requiredRoutes = [
  ["get", "/health"],
  ["post", "/auth/login"],
  ["get", "/auth/me"],
  ["post", "/auth/logout"],
  ["get", "/operations/status"],
  ["get", "/tenants"],
  ["post", "/tenants"],
  ["get", "/tenants/{tenantId}"],
  ["patch", "/tenants/{tenantId}/status"],
  ["patch", "/tenants/{tenantId}/collection-mode"],
  ["patch", "/tenants/{tenantId}/collection-settings"],
  ["get", "/users"],
  ["post", "/users"],
  ["get", "/users/{userId}/roles"],
  ["put", "/users/{userId}/roles"],
  ["get", "/roles"],
  ["post", "/roles"],
  ["get", "/permissions"],
  ["get", "/audit-events"],
  ["get", "/platform-integrations/mobile-money-config"],
  ["put", "/platform-integrations/mobile-money-config"],
  ["post", "/member-auth/login"],
  ["get", "/member-auth/me"],
  ["post", "/member-auth/logout"],
  ["get", "/member-auth/mobile-dashboard"],
  ["get", "/member-auth/statement"],
  ["get", "/member-auth/fund-balances"],
  ["get", "/member-auth/membership"],
  ["patch", "/member-auth/profile"],
  ["get", "/member-auth/profile-photo"],
  ["post", "/member-auth/profile-photo"],
  ["get", "/member-auth/notification-preferences"],
  ["put", "/member-auth/notification-preferences"],
  ["get", "/member-auth/notifications"],
  ["patch", "/member-auth/notifications/{notificationId}/acknowledge"],
  ["post", "/member-auth/password-reset/request"],
  ["post", "/member-auth/password-reset/confirm"],
  ["post", "/member-auth/mobile-complaints"],
  ["get", "/member-auth/complaints"],
  ["get", "/member-auth/governance-meetings"],
  ["get", "/member-auth/loan-products"],
  ["get", "/member-auth/loans/{loanId}/repayments"],
  ["get", "/member-auth/guarantor-requests"],
  ["get", "/member-auth/chat/threads"],
  ["post", "/member-auth/chat/threads"],
  ["get", "/member-auth/chat/threads/{threadId}/messages"],
  ["post", "/member-auth/chat/threads/{threadId}/messages"],
  ["post", "/member-auth/chat/threads/{threadId}/read"],
  ["get", "/member-auth/collection-accounts"],
  ["post", "/integrations/mobile-money/payment-requests"],
  ["post", "/member-auth/mobile-loans"],
  ["get", "/member-auth/guarantor-requests"],
  ["get", "/members"],
  ["post", "/members"],
  ["get", "/financial-transactions"],
  ["post", "/financial-transactions"],
  ["patch", "/financial-transactions/{transactionId}/status"],
  ["get", "/loans"],
  ["post", "/loans"],
  ["post", "/integrations/mobile-money/callback"],
  ["get", "/notifications/provider-evidence"],
  ["post", "/statement-lines/batch"]
];

const requiredSchemas = [
  "OperationsStatusResponse",
  "UserResponse",
  "RoleResponse",
  "PermissionResponse",
  "AuditEventResponse",
  "TenantResponse",
  "MemberDashboard",
  "SaccoPaymentAccount",
  "FinancialTransaction",
  "MobileMoneyCallbackRequest"
];

const missingRoutes = requiredRoutes.filter(([method, path]) => !hasOperation(method, path));
const missingSchemas = requiredSchemas.filter((schema) => !openapi.includes(`    ${schema}:`));

if (missingRoutes.length || missingSchemas.length) {
  if (missingRoutes.length) {
    console.error(`OpenAPI is missing required operations:\n${missingRoutes.map(([method, path]) => `- ${method.toUpperCase()} ${path}`).join("\n")}`);
  }
  if (missingSchemas.length) {
    console.error(`OpenAPI is missing required schemas:\n${missingSchemas.map((schema) => `- ${schema}`).join("\n")}`);
  }
  process.exit(1);
}

console.log(`OpenAPI coverage check passed (${requiredRoutes.length} operations, ${requiredSchemas.length} schemas).`);

function hasOperation(method, path) {
  const pathIndex = openapi.indexOf(`  ${path}:`);
  if (pathIndex < 0) return false;
  const nextPathIndex = openapi.indexOf("\n  /", pathIndex + 1);
  const block = openapi.slice(pathIndex, nextPathIndex < 0 ? openapi.length : nextPathIndex);
  return block.includes(`    ${method}:`);
}
