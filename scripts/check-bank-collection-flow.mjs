import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const member = await readFile(new URL("app.member.js", root), "utf8");
const actions = await readFile(new URL("app.member-actions.js", root), "utf8");
const openapi = await readFile(new URL("openapi.yaml", root), "utf8");

const checks = [
  [member, "function memberBankCollectionPanel(payableLoans)", "member bank collection panel"],
  [member, 'value="bank_collection"', "bank collection route field"],
  [member, "Prepare bank reference", "bank reference submit action"],
  [member, "Save bank draft", "bank draft action"],
  [member, "Bank collection also enabled.", "BOTH-mode bank guidance"],
  [actions, 'value("memberPaymentRoute") === "bank_collection"', "bank route action handling"],
  [actions, "Bank collection reference prepared", "bank reference user feedback"],
  [actions, '? "BANK" : "MM"', "bank reference generation"],
  [openapi, "/tenants/{tenantId}/collection-mode", "OpenAPI documents platform collection mode endpoint"],
  [openapi, "/tenants/{tenantId}/collection-settings", "OpenAPI documents SACCO collection activation endpoint"],
  [openapi, "/statement-lines/batch", "OpenAPI documents batch bank statement import endpoint"],
  [openapi, "StatementLineBatchImportResponse", "OpenAPI documents batch bank statement import response"],
  [openapi, "mobileMoneyCollectionAvailable", "OpenAPI matches TenantResponse mobile-money availability field"],
  [openapi, "bankCollectionAvailable", "OpenAPI matches TenantResponse bank availability field"]
];

for (const [content, marker, label] of checks) {
  if (!content.includes(marker)) {
    throw new Error(`${label} missing marker: ${marker}`);
  }
}

console.log(`Bank collection flow contract check passed (${checks.length} markers).`);
