import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const [packageJson, tsconfig, srcTsconfig, declarations, domainTypes, tableModelSource, formatterSource, performanceSource, memberAdminSource, transactionSource, loanSource, accountingSource, financeSource, notificationSource, complaintSource, governanceSource, reportSource, auditSource, onboardingSource, accessSource, settingsSource, operationsSource, platformSource, saccoSource, navigationSource, approvalsSource, stateSource] = await Promise.all([
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
  readText("src/complaints/complaints.ts"),
  readText("src/governance/governance.ts"),
  readText("src/reports/reports.ts"),
  readText("src/audit/audit.ts"),
  readText("src/onboarding/onboarding.ts"),
  readText("src/access/access.ts"),
  readText("src/settings/settings.ts"),
  readText("src/operations/operations.ts"),
  readText("src/platform/platform.ts"),
  readText("src/sacco/sacco.ts"),
  readText("src/navigation/navigation.ts"),
  readText("src/approvals/approvals.ts"),
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
  "interface TerekaMemberDetailSummary",
  "interface TerekaMemberKycCheckRow",
  "interface TerekaMemberReceiptEvidenceSummary",
  "interface TerekaStaffStatementExportSummary",
  "interface TerekaTransactionRow",
  "interface TerekaReceiptingQueueRow",
  "interface TerekaReceiptRegisterRow",
  "interface TerekaTransactionRowsInput",
  "interface TerekaTransactionReceiptSummary",
  "interface TerekaTransactionOverviewSummary",
  "interface TerekaLoanRow",
  "interface TerekaLoanRowsInput",
  "interface TerekaLoanPortfolioSummary",
  "interface TerekaLoanMemberOption",
  "interface TerekaLoanProductOption",
  "interface TerekaAccountingSummary",
  "interface TerekaAccountingSummaryInput",
  "interface TerekaPaymentRequestReviewRow",
  "interface TerekaAccountingAccountOption",
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
  "interface TerekaChatThreadRow",
  "interface TerekaComplaintSummary",
  "interface TerekaChatThreadRowsInput",
  "interface TerekaChatParticipantInput",
  "interface TerekaGovernanceResolutionRow",
  "interface TerekaGovernanceMeetingRow",
  "interface TerekaGovernanceSummary",
  "interface TerekaGovernanceRowsInput",
  "interface TerekaGovernanceUserOption",
  "interface TerekaReportCatalogueItem",
  "interface TerekaRegulatoryReportDisplayRow",
  "interface TerekaRegulatoryReportRowsInput",
  "interface TerekaPlatformReportSummaryInput",
  "interface TerekaPlatformReportSummary",
  "interface TerekaAuditRow",
  "interface TerekaAuditRowsInput",
  "interface TerekaAuditGroupModel",
  "interface TerekaAuditSummary",
  "interface TerekaSaccoApplicationRow",
  "interface TerekaSaccoRegistrationSummary",
  "interface TerekaSubscriptionRow",
  "interface TerekaSubscriptionSummary",
  "interface TerekaPackageCardRow",
  "interface TerekaAccessUserRow",
  "interface TerekaAccessSummary",
  "interface TerekaRoleCoverageRow",
  "interface TerekaSaccoStaffGuideRow",
  "interface TerekaPermissionMatrixRow",
  "interface TerekaUserDetailRoleModel",
  "interface TerekaUserSessionRow",
  "interface TerekaPasswordResetRow",
  "interface TerekaReconciliationData",
  "interface TerekaRegulatoryReport",
  "interface TerekaIntegrationConfig",
  "interface TerekaSecuritySummary",
  "interface TerekaQuickSearchResult",
  "interface TerekaQuickSearchModel",
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
  "export function buildMemberDetailSummary",
  "export function memberKycReadinessFor",
  "export function buildMemberKycChecklistRows",
  "export function buildReceiptReadyStatementLines",
  "export function buildMemberReceiptEvidenceSummary",
  "export function buildStaffStatementExportSummary",
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
  "export function buildTransactionOverviewSummary",
]) {
  assert.ok(transactionSource.includes(marker), `src/transactions/transactions.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaLoanRow",
  "export interface TerekaLoanRowsInput",
  "export interface TerekaLoanPortfolioSummary",
  "export interface TerekaLoanMemberOption",
  "export interface TerekaLoanProductOption",
  "export function buildLoanRows",
  "export function activeLoanMemberOptions",
  "export function loanProductOptions",
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
  "export function accountingAccountOptions",
  "export function assetCategoryOptions",
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

for (const marker of [
  "export type TerekaChatMode",
  "export interface TerekaChatThreadRow",
  "export interface TerekaComplaintSummary",
  "export interface TerekaChatThreadRowsInput",
  "export interface TerekaChatParticipantInput",
  "export function buildChatThreadRows",
  "export function buildComplaintSummary",
  "export function complaintOpenRows",
  "export function complaintUrgentRows",
  "export function filterChatThreadRows",
  "export function chatParticipantLabel",
  "export function chatInitialsFor",
]) {
  assert.ok(complaintSource.includes(marker), `src/complaints/complaints.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaGovernanceResolutionRow",
  "export interface TerekaGovernanceMeetingRow",
  "export interface TerekaGovernanceSummary",
  "export interface TerekaGovernanceRowsInput",
  "export interface TerekaGovernanceUserOption",
  "export function buildGovernanceMeetingRows",
  "export function buildGovernanceResolutionRows",
  "export function buildMeetingResolutionRows",
  "export function governanceUserOptions",
  "export function meetingTypeOptions",
  "export function governanceScheduledMeetings",
  "export function governanceCompletedMeetings",
  "export function governanceOpenResolutions",
  "export function buildGovernanceSummary",
  "export function isGovernanceResolutionOverdue",
]) {
  assert.ok(governanceSource.includes(marker), `src/governance/governance.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaReportCatalogueItem",
  "export interface TerekaRegulatoryReportDisplayRow",
  "export interface TerekaRegulatoryReportRowsInput",
  "export interface TerekaPlatformReportSummaryInput",
  "export interface TerekaPlatformReportSummary",
  "export function buildRegulatoryReportRows",
  "export function buildRegulatoryConsolidatedReport",
  "export function reportExceptionCount",
  "export function buildReportCatalogue",
  "export function buildPlatformReportSummary",
]) {
  assert.ok(reportSource.includes(marker), `src/reports/reports.ts missing ${marker}`);
}

for (const marker of [
  "export type TerekaAuditRiskLevel",
  "export type TerekaAuditCategory",
  "export interface TerekaAuditRow",
  "export interface TerekaAuditRowsInput",
  "export interface TerekaAuditGroupModel",
  "export interface TerekaAuditSummary",
  "export function buildAuditRows",
  "export function buildAuditGroups",
  "export function buildAuditSummary",
  "export function auditRiskLevelFor",
  "export function auditCategoryFor",
  "export function uniqueAuditCount",
]) {
  assert.ok(auditSource.includes(marker), `src/audit/audit.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaSaccoApplicationRow",
  "export interface TerekaSaccoRegistrationSummary",
  "export interface TerekaSubscriptionRow",
  "export interface TerekaSubscriptionSummary",
  "export interface TerekaPackageCardRow",
  "export interface TerekaSaccoCollectionAccountReviewRow",
  "export function buildSaccoApplicationRows",
  "export function buildSaccoRegistrationSummary",
  "export function buildSubscriptionRows",
  "export function buildSubscriptionSummary",
  "export function buildPackageCardRows",
  "export function generateSaccoCode",
  "export function saccoLocationAddress",
  "export function profileLocationPart",
  "export function buildSaccoCollectionAccountReviewRows",
  "export function subscriptionAccessLabelFor",
  "export function saccoPaymentStageFor",
  "export function saccoApprovalStageFor",
  "export function subscriptionPaymentLabelFor",
]) {
  assert.ok(onboardingSource.includes(marker), `src/onboarding/onboarding.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaAccessUserRow",
  "export interface TerekaAccessSummary",
  "export interface TerekaRoleCoverageRow",
  "export interface TerekaSaccoStaffGuideRow",
  "export interface TerekaPermissionMatrixRow",
  "export function buildAccessUserRows",
  "export function buildAccessSummary",
  "export function filterAccessUsersForScope",
  "export function filterRolesForScope",
  "export function buildRoleCoverageRows",
  "export function roleCoverageFor",
  "export function rolePurposeFor",
  "export function roleModuleScopeFor",
  "export function buildUserDetailRoleModel",
  "export function buildUserSessionRows",
  "export function buildPasswordResetRows",
  "export function buildSaccoStaffGuideRows",
  "export function buildPermissionMatrixRows",
  "export function roleSummaryTextFor",
]) {
  assert.ok(accessSource.includes(marker), `src/access/access.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaSaccoSettingsModel",
  "export interface TerekaSaccoSettingsReadiness",
  "export type TerekaSettingsControlRow",
  "export interface TerekaProviderSetupRow",
  "export interface TerekaProviderEnvironmentRow",
  "export interface TerekaMobileMoneyIntegrationSummary",
  "export interface TerekaStaffSecurityModel",
  "export interface TerekaCollectionAccountDisplayRow",
  "export function buildSaccoSettingsModel",
  "export function buildSaccoSettingsControlRows",
  "export function buildSaccoSettingsReadiness",
  "export function buildPlatformSettingsControlRows",
  "export function buildNotificationProviderRows",
  "export function buildMobileMoneyProviderRows",
  "export function buildProviderEnvironmentRows",
  "export function buildMobileMoneyIntegrationSummary",
  "export function notificationProviderNameFor",
  "export function buildStaffSecuritySettingsModel",
  "export function buildCollectionAccountDisplayRows",
]) {
  assert.ok(settingsSource.includes(marker), `src/settings/settings.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaNotificationProviderRiskRow",
  "export interface TerekaLoginRiskSummary",
  "export interface TerekaLoginRiskRow",
  "export function buildNotificationProviderRiskRows",
  "export function filterLoginRiskEvents",
  "export function buildLoginRiskSummary",
  "export function buildLoginRiskRows",
  "export function isLoginRiskEvent",
  "export function loginRiskPortalFor",
]) {
  assert.ok(operationsSource.includes(marker), `src/operations/operations.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaPlatformDashboardSummary",
  "export interface TerekaPlatformOperationsSummary",
  "export interface TerekaPlatformBillingSummary",
  "export interface TerekaPlatformComplianceSummary",
  "export interface TerekaPlatformSupportSummary",
  "export type TerekaPlatformActivityRow",
  "export function buildPlatformDashboardSummary",
  "export function buildPlatformOperationsSummary",
  "export function buildPlatformBillingSummary",
  "export function buildPlatformComplianceSummary",
  "export function buildPlatformSupportSummary",
  "export function buildRecentSaccoApplicationRows",
]) {
  assert.ok(platformSource.includes(marker), `src/platform/platform.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaSaccoAdminDashboardSummary",
  "export interface TerekaSaccoAccountantDashboardSummary",
  "export interface TerekaSaccoTellerDashboardModel",
  "export interface TerekaSaccoLoansOfficerDashboardModel",
  "export interface TerekaSaccoAuditorDashboardModel",
  "export interface TerekaSaccoChairpersonDashboardModel",
  "export interface TerekaSaccoTreasurerDashboardModel",
  "export interface TerekaSaccoSecretaryDashboardModel",
  "export function buildSaccoAdminDashboardSummary",
  "export function buildSaccoAccountantDashboardSummary",
  "export function buildSaccoTellerDashboardModel",
  "export function buildSaccoLoansOfficerDashboardModel",
  "export function buildSaccoAuditorDashboardModel",
  "export function buildSaccoChairpersonDashboardModel",
  "export function buildSaccoTreasurerDashboardModel",
  "export function buildSaccoSecretaryDashboardModel",
]) {
  assert.ok(saccoSource.includes(marker), `src/sacco/sacco.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaSaccoAccountHealthRow",
  "export interface TerekaSaccoAccountSummary",
  "export interface TerekaMemberDirectoryRow",
  "export interface TerekaMemberDirectorySummary",
  "export function buildSaccoAccountHealthRows",
  "export function buildSaccoAccountSummary",
  "export function buildMemberDirectoryRows",
  "export function buildMemberDirectorySummary",
  "export function pendingMemberKycRows",
  "export function uniqueNavigationValues",
  "export function buildQuickSearchResult",
  "export function buildQuickSearchModel",
  "export function groupQuickSearchResults",
  "export function memberUnreadNotificationCount",
  "export function staffUnreadNotificationCount",
  "export function uniqueStaffUnreadNotificationIds",
]) {
  assert.ok(navigationSource.includes(marker), `src/navigation/navigation.ts missing ${marker}`);
}

for (const marker of [
  "export interface TerekaLoanRepaymentApprovalRow",
  "export interface TerekaLoanApprovalRow",
  "export interface TerekaMemberApprovalRow",
  "export interface TerekaApprovalQueueModel",
  "export interface TerekaApprovalQueueSummary",
  "export function buildApprovalQueueModel",
  "export function buildApprovalQueueSummary",
]) {
  assert.ok(approvalsSource.includes(marker), `src/approvals/approvals.ts missing ${marker}`);
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
