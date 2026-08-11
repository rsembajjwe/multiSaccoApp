import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const [packageJson, tsconfig, srcTsconfig, declarations, domainTypes, tableModelSource, formatterSource, performanceSource, memberAdminSource, transactionSource, loanSource, accountingSource, financeSource, notificationSource, stateSource] = await Promise.all([
  readJson("package.json"),
  readJson("tsconfig.ui.json"),
  readJson("tsconfig.src.json"),
  readText("app.types.d.ts"),
  readText("src/types/domain.ts"),
  readText("src/tables/tableModel.ts"),
  readText("src/formatting/formatters.ts"),
  readText("src/member/performance.ts"),
  readText("src/member/admin.ts"),
  readText("src/transactions/transactions.ts"),
  readText("src/loans/loans.ts"),
  readText("src/accounting/accounting.ts"),
  readText("src/sacco-finance/finance.ts"),
  readText("src/notifications/notifications.ts"),
  readText("app.state.js"),
]);

assert.equal(packageJson.scripts["type:ui"], "tsc -p tsconfig.ui.json");
assert.equal(packageJson.scripts["type:check"], "node scripts/check-type-contracts.mjs");
assert.equal(packageJson.scripts["type:src"], "tsc -p tsconfig.src.json");
assert.equal(packageJson.scripts["type:evidence"], "node scripts/type-evidence.mjs");

assert.equal(tsconfig.compilerOptions.allowJs, true);
assert.equal(tsconfig.compilerOptions.checkJs, true);
assert.equal(tsconfig.compilerOptions.noEmit, true);
assert.equal(tsconfig.compilerOptions.noImplicitReturns, true);
assert.equal(tsconfig.compilerOptions.noFallthroughCasesInSwitch, true);
assert.ok(tsconfig.include.includes("app.types.d.ts"), "tsconfig.ui.json must include shared declarations");
assert.ok(tsconfig.include.includes("app*.js"), "tsconfig.ui.json must include classic frontend scripts");

assert.equal(srcTsconfig.compilerOptions.strict, true);
assert.equal(srcTsconfig.compilerOptions.noEmit, true);
assert.equal(srcTsconfig.compilerOptions.moduleResolution, "Bundler");
assert.ok(srcTsconfig.include.includes("src/**/*.ts"), "tsconfig.src.json must include TypeScript source modules");

for (const marker of [
  "interface TerekaState",
  "interface TerekaAppData",
  "interface TerekaMemberData",
  "interface TerekaMemberProfile",
  "interface TerekaPlatformUser",
  "interface TerekaTenantSummary",
  "interface TerekaSubscription",
  "interface TerekaFinancialTransaction",
  "interface TerekaLoan",
  "interface TerekaPaymentRequest",
  "interface TerekaPaymentLifecycleRow",
  "interface TerekaCollectionAccount",
  "interface TerekaComplaintThread",
  "interface TerekaChatMessage",
  "interface TerekaTableModelInput",
  "interface TerekaTableModel",
  "interface TerekaFormatterBridge",
  "interface TerekaMonthlyPerformanceRow",
  "interface TerekaSaccoMonthlyPerformanceInput",
  "interface TerekaPaymentLifecycleInput",
  "interface TerekaMemberGuarantorRow",
  "interface TerekaMemberAdminMessageRow",
  "interface TerekaMemberMobileMoneyRow",
  "interface TerekaMemberPaymentProviderOption",
  "interface TerekaMemberDraftRow",
  "interface TerekaMemberDocumentRow",
  "interface TerekaMemberDocumentRetentionSummary",
  "interface TerekaMemberStatementSummary",
  "interface TerekaTransactionRow",
  "interface TerekaReceiptingQueueRow",
  "interface TerekaReceiptRegisterRow",
  "interface TerekaTransactionRowsInput",
  "interface TerekaTransactionReceiptSummary",
  "interface TerekaLoanRow",
  "interface TerekaLoanRowsInput",
  "interface TerekaLoanPortfolioSummary",
  "interface TerekaAccountingSummary",
  "interface TerekaAccountingSummaryInput",
  "interface TerekaPaymentRequestReviewRow",
  "interface TerekaReconciliationMatchRow",
  "interface TerekaReconciliationReviewModel",
  "interface TerekaSavingsSummary",
  "interface TerekaSharesSummary",
  "interface TerekaWelfareSummary",
  "interface TerekaWelfareClaimRow",
  "interface TerekaNotificationDeliveryRow",
  "interface TerekaNotificationTemplateRow",
  "interface TerekaProviderJobRunRow",
  "interface TerekaNotificationSummary",
  "interface TerekaNotificationFilters",
  "interface TerekaNotificationRowsInput",
  "interface TerekaReconciliationData",
  "interface TerekaRegulatoryReport",
  "interface TerekaIntegrationConfig",
  "interface TerekaSecuritySummary",
  "interface TerekaQuickSearchResult",
]) {
  assert.ok(declarations.includes(marker), `app.types.d.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaState",
  "export interface TerekaAppData",
  "export interface TerekaMemberData",
  "export interface TerekaPlatformUser",
  "export interface TerekaTenantSummary",
  "export interface TerekaPaymentLifecycleRow",
  "export interface TerekaComplaintThread",
  "export interface TerekaChatMessage",
  "export type TerekaRecord = Record<string, unknown>",
]) {
  assert.ok(domainTypes.includes(marker), `src/types/domain.ts missing ${marker}`);
}

for (const marker of [
  "export function filterRecordRows",
  "export function tableStateKeyFor",
  "export interface TerekaTableModelInput",
  "export interface TerekaTableModel",
  "export function buildRecordTableModel",
]) {
  assert.ok(tableModelSource.includes(marker), `src/tables/tableModel.ts missing ${marker}`);
}

for (const marker of [
  "export function formatMoneyValue",
  "export function formatDateValue",
  "export function formatDateTimeValue",
  "export function formatShortDateValue",
  "export function labelizeValue",
  "export function normalizeValue",
  "export function sumValues",
  "export function formatTableValue",
  "export function statusClassValue",
  "export function escapeHtmlValue",
]) {
  assert.ok(formatterSource.includes(marker), `src/formatting/formatters.ts missing ${marker}`);
}

for (const marker of [
  "export function buildMemberStatementLines",
  "export function buildSaccoMonthlyPerformanceRows",
  "export function buildMemberMonthlyPerformanceRows",
  "export function buildMemberPaymentLifecycleRows",
  "export function buildMemberGuarantorRows",
  "export function buildMemberAdminMessageRows",
  "export function buildMemberMobileMoneyRows",
  "export function buildMemberPaymentProviderOptions",
  "export function buildMemberDraftRows",
  "export function buildMemberPaymentRequestRows",
  "export function addPerformanceAmount",
  "export function performanceMonthLabel",
  "export function performanceMonthEndDateLabel",
  "export function performanceRowId",
  "export function isMobileMoneyPerformanceLine",
  "export function paymentRouteLabelFor",
  "export function paymentLifecycleStatusFor",
  "export function receiptLifecycleStatusFor",
]) {
  assert.ok(performanceSource.includes(marker), `src/member/performance.ts missing ${marker}`);
}

for (const marker of [
  "export function buildMemberDocumentRows",
  "export function buildMemberDocumentRetentionSummary",
  "export function buildMemberStatementSummary",
  "export function buildReceiptReadyStatementLines",
  "export function statementCredit",
  "export function statementDebit",
]) {
  assert.ok(memberAdminSource.includes(marker), `src/member/admin.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaTransactionRow",
  "export interface TerekaReceiptingQueueRow",
  "export interface TerekaReceiptRegisterRow",
  "export interface TerekaTransactionRowsInput",
  "export interface TerekaTransactionReceiptSummary",
  "export function buildTransactionRows",
  "export function buildTransactionReceiptingQueue",
  "export function buildTransactionReceiptRegister",
  "export function buildTransactionReceiptSummary",
]) {
  assert.ok(transactionSource.includes(marker), `src/transactions/transactions.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaLoanRow",
  "export interface TerekaLoanRowsInput",
  "export interface TerekaLoanPortfolioSummary",
  "export function buildLoanRows",
  "export function buildLoanPortfolioSummary",
]) {
  assert.ok(loanSource.includes(marker), `src/loans/loans.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaAccountingSummary",
  "export interface TerekaAccountingSummaryInput",
  "export interface TerekaPaymentRequestReviewRow",
  "export interface TerekaReconciliationMatchRow",
  "export interface TerekaReconciliationReviewModel",
  "export function buildAccountingSummary",
  "export function buildReconciliationReviewModel",
  "export function buildPaymentRequestReviewRows",
  "export function buildReconciliationMatchRows",
  "export function reconciliationCoverage",
]) {
  assert.ok(accountingSource.includes(marker), `src/accounting/accounting.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaSavingsSummary",
  "export interface TerekaSharesSummary",
  "export interface TerekaWelfareSummary",
  "export interface TerekaWelfareClaimRow",
  "export function buildSavingsSummary",
  "export function buildSharesSummary",
  "export function buildWelfareSummary",
  "export function buildWelfareClaimRows",
  "export function activeFinanceProducts",
  "export function welfareSubmittedClaims",
]) {
  assert.ok(financeSource.includes(marker), `src/sacco-finance/finance.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaNotificationDeliveryRow",
  "export interface TerekaNotificationTemplateRow",
  "export interface TerekaProviderJobRunRow",
  "export interface TerekaNotificationSummary",
  "export interface TerekaNotificationFilters",
  "export interface TerekaNotificationRowsInput",
  "export function buildNotificationDeliveryRows",
  "export function buildNotificationTemplateRows",
  "export function buildProviderJobRunRows",
  "export function buildNotificationSummary",
  "export function filterNotificationDeliveryRows",
  "export function loginRiskDeliveries",
  "export function unreadNotificationDeliveries",
  "export function failedNotificationDeliveries",
  "export function paymentExceptionDeliveries",
  "export function uniqueUnreadNotificationIds",
  "export function notificationDeliveryActionFor",
]) {
  assert.ok(notificationSource.includes(marker), `src/notifications/notifications.ts missing ${marker}`);
}

assert.ok(stateSource.includes("/** @type {TerekaState} */"), "app.state.js must type the global state object");
assert.ok(declarations.includes("data: TerekaAppData;"), "TerekaState.data must use TerekaAppData");
assert.ok(declarations.includes("memberData: TerekaMemberData;"), "TerekaState.memberData must use TerekaMemberData");
assert.ok(declarations.includes("member: TerekaMemberProfile | null;"), "TerekaState.member must use TerekaMemberProfile");
assert.ok(declarations.includes("user: TerekaPlatformUser | null;"), "TerekaState.user must use TerekaPlatformUser");

console.log("Type contract check passed (classic SPA checkJs gate and strict src domain module verified).");

async function readText(file) {
  return readFile(new URL(file, root), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}
