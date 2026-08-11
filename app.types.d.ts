type TerekaDirection = "ltr" | "rtl";

interface TerekaRegion {
  locale: string;
  currency: string;
  currencyDigits: number;
  direction: TerekaDirection;
}

interface TerekaLocaleMetadata {
  label: string;
  direction: TerekaDirection;
  fallback: string;
}

interface TerekaPageEnvelope {
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

interface TerekaPageArray<T = unknown> extends Array<T> {
  __page?: TerekaPageEnvelope;
}

interface TerekaApiError extends Error {
  status?: number;
  code?: string;
}

interface Error {
  status?: number;
  code?: string;
}

interface Event {
  key?: string;
}

interface EventTarget {
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  dataset?: DOMStringMap;
  closest?(selector: string): Element | null;
  textContent?: string | null;
}

interface Element {
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  type?: string;
  dataset?: DOMStringMap;
  selectedOptions?: HTMLCollectionOf<HTMLOptionElement>;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

interface HTMLElement {
  value?: string;
  checked?: boolean;
  type?: string;
  selectedOptions?: HTMLCollectionOf<HTMLOptionElement>;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

interface TerekaTableState {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  direction?: string;
}

interface TerekaMemberProfile {
  id?: string;
  fullName?: string;
  membershipNo?: string;
  memberType?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  joiningDate?: string;
  kycStatus?: string;
  status?: string;
  consentPreferences?: TerekaConsentPreferences;
  [key: string]: any;
}

interface TerekaConsentPreferences {
  privacyNoticeAccepted?: boolean;
  privacyNoticeAcceptedAt?: string;
  consentUpdatedAt?: string;
  smsConsent?: boolean;
  emailConsent?: boolean;
  mobileMoneyConsent?: boolean;
  providerDataSharingConsent?: boolean;
  [key: string]: any;
}

interface TerekaTenantSummary {
  id?: string;
  name?: string;
  abbreviation?: string;
  code?: string;
  registrationNo?: string;
  country?: string;
  operatingCountry?: string;
  countryName?: string;
  locale?: string;
  defaultLocale?: string;
  currency?: string;
  currencyCode?: string;
  currencyDigits?: number;
  direction?: TerekaDirection;
  textDirection?: TerekaDirection;
  mobileMoneyCollectionAvailable?: boolean;
  bankCollectionAvailable?: boolean;
  status?: string;
  onboarding?: number | string;
  licenseExpiry?: string;
  district?: string;
  parish?: string;
  village?: string;
  contactNumber?: string;
  [key: string]: any;
}

interface TerekaPlatformUser {
  id?: string;
  tenantId?: string;
  fullName?: string;
  email?: string;
  username?: string;
  phone?: string;
  role?: string;
  roleId?: string;
  roleIds?: string[];
  status?: string;
  mfaEnabled?: boolean;
  passwordResetRequired?: boolean;
  activeSessionCount?: number;
  lastLogin?: string;
  [key: string]: any;
}

interface TerekaRole {
  id?: string;
  name?: string;
  description?: string;
  tenantId?: string;
  permissions?: string[];
  [key: string]: any;
}

interface TerekaPermission {
  id?: string;
  name?: string;
  module?: string;
  description?: string;
  [key: string]: any;
}

interface TerekaAccessUserRow extends TerekaPlatformUser {
  accessPurpose: string;
  action: string;
  actionId?: string;
  actionLabel: string;
  activeSessions: number | string;
  mfa: string;
  moduleScope: string;
  role: string;
  status: string;
  [key: string]: any;
}

interface TerekaAccessSummary {
  activeUsers: number;
  configuredRoles: number;
  roleCoverage: string;
  totalUsers: number;
}

interface TerekaRoleCoverageRow {
  accessPurpose: string;
  assignedUsers: number;
  moduleScope: string;
  roleName?: string;
  scope: string;
  status: string;
}

interface TerekaSaccoStaffGuideRow {
  accessPurpose: string;
  configured: string;
  moduleScope: string;
  roleName: string;
}

interface TerekaPermissionMatrixRow {
  actions: string[];
  moduleId: string;
  moduleName: string;
}

interface TerekaUserDetailRoleModel {
  assignedRoleIds: string[];
  assignedRoleNamesText: string;
  assignedRoles: Array<TerekaRole & Record<string, any>>;
  primaryRole: TerekaRole & Record<string, any>;
  roleSummaryText: string;
}

interface TerekaUserSessionRow {
  action: string;
  actionId?: string;
  actionLabel: string;
  createdAt: string;
  device: string;
  expiresAt: string;
  id?: string;
  ipAddress: string;
}

interface TerekaPasswordResetRow {
  createdAt: string;
  expiresAt: string;
  id?: string;
  status: string;
  usedAt: string;
}

interface TerekaSaccoSettingsReadiness {
  activeBranches: number;
  savingsProducts: number;
  sharesProducts: number;
  welfareProducts: number;
  openAccounts: number;
  inactiveProducts: number;
  ready: boolean;
}

interface TerekaSaccoSettingsModel {
  activeBranches: number;
  activeProducts: number;
  missingProducts: string[];
  productCoverage: string;
  productCoverageDetail: string;
  readiness: TerekaSaccoSettingsReadiness;
}

type TerekaSettingsControlRow = [string, string, string];

interface TerekaProviderSetupRow {
  active: string;
  activeProvider?: string;
  balance?: string;
  channel?: string;
  liveStatus?: string;
  missingSettings: string;
  provider?: string;
  [key: string]: any;
}

interface TerekaProviderEnvironmentRow {
  channel?: string;
  configured: string;
  key?: string;
  provider?: string;
  secret: string;
  value?: string;
  [key: string]: any;
}

interface TerekaMobileMoneyIntegrationSummary {
  activeProvider: string;
  callbackSecret: string;
  failedCallbacks: number;
  paymentRequests: number;
  providerCallbacks: number;
  providerSelected: boolean;
  signedCallbacks: string;
}

interface TerekaStaffSecurityModel {
  activeCount: number;
  currentExpiry?: string;
  resetCount: number;
  resetRows: Array<Record<string, any>>;
  sessionRows: Array<Record<string, any>>;
}

interface TerekaCollectionAccountDisplayRow {
  active: boolean;
  channelLabel: string;
  detail: string;
  id?: string;
  instructions?: string;
  title: string;
}

interface TerekaNotificationProviderRiskRow {
  checkedAt?: string;
  message?: string;
  provider: string;
  severity: string;
  status: string;
  title: string;
}

interface TerekaLoginRiskSummary {
  blockedAttempts: number;
  failedCredentials: number;
  memberPortal: number;
  riskEvents: number;
  staffPortal: number;
  uniqueScopeCount: number;
}

interface TerekaLoginRiskRow {
  action?: string;
  createdAt: string;
  identity: string;
  ipAddress: string;
  portal: string;
  sacco?: string;
}

interface TerekaPlatformDashboardSummary {
  activePlatformUsers: number;
  activeSaccos: number;
  expiredSubscriptions: number;
  failedPaymentTransactions: number;
  openSaccoSupportTickets: number;
  pendingRegistrations: number;
  totalSaccos: number;
  totalSubscriptionRevenue: number;
}

interface TerekaPlatformOperationsSummary {
  failedCallbacks: number;
  openSupportTickets: number;
  operatingSaccos: number;
  pendingOnboarding: number;
  systemAlerts: number;
}

interface TerekaPlatformBillingSummary {
  activeSubscriptions: number;
  billableSaccos: number;
  expiredSubscriptions: number;
  pendingPayments: number;
  subscriptionRevenue: number;
}

interface TerekaPlatformComplianceSummary {
  auditEvents: number;
  operationsAlerts: number;
  pendingRegistrations: number;
  regulatoryReportStatus: string;
  saccoSupportTickets: number;
}

interface TerekaPlatformSupportSummary {
  notifications: number;
  pendingOnboarding: number;
  saccoSupportTickets: number;
  visibleSaccos: number;
}

type TerekaPlatformActivityRow = [string | undefined, string | undefined, string | undefined];

interface TerekaSaccoAdminDashboardSummary {
  mobileMoneyCollections: number;
  outstandingLoans: number;
  pendingApprovals: number;
  totalMembers: number;
  totalSavings: number;
}

interface TerekaSaccoAccountantDashboardSummary {
  expensesPosted: number;
  journalEntries: number;
  reconciliationExceptions: number;
  reports: number;
}

interface TerekaSaccoTellerDashboardModel {
  awaitingApproval: number;
  members: number;
  myCaptures: Array<TerekaFinancialTransaction & Record<string, any>>;
  myCaptureCount: number;
}

interface TerekaSaccoLoansOfficerDashboardModel {
  arrears: Array<TerekaLoan & Record<string, any>>;
  arrearsWatch: number;
  awaitingApproval: number;
  loanApplications: number;
  needGuarantor: Array<TerekaLoan & Record<string, any>>;
  needGuarantorCount: number;
  submitted: Array<TerekaLoan & Record<string, any>>;
}

interface TerekaSaccoAuditorDashboardModel {
  auditEvents: number;
  highValue: Array<TerekaFinancialTransaction & Record<string, any>>;
  highValueTransactions: number;
  reports: number;
  reversals: Array<TerekaFinancialTransaction & Record<string, any>>;
  reversalCount: number;
}

interface TerekaSaccoChairpersonDashboardModel {
  approvalLoans: Array<TerekaLoan & Record<string, any>>;
  arrearsLoans: Array<TerekaLoan & Record<string, any>>;
  arrearsWatch: number;
  governanceActions: number;
  highValueTransactions: Array<TerekaFinancialTransaction & Record<string, any>>;
  loansAwaitingApproval: number;
  outstandingPortfolio: number;
}

interface TerekaSaccoTreasurerDashboardModel {
  collections: number;
  failedCallbacks: Array<TerekaMobileMoneyCallback & Record<string, any>>;
  mobileMoneyExceptions: number;
  pendingApprovals: number;
  totalSavings: number;
}

interface TerekaSaccoSecretaryDashboardModel {
  governanceRecords: number;
  membersToVerify: number;
  openComplaints: number;
  pendingKyc: Array<TerekaMemberProfile & Record<string, any>>;
  totalMembers: number;
}

interface TerekaSaccoAccountHealthRow extends TerekaTenantSummary {
  accountHealth: string;
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalStage: string;
  billableMembers: number | string;
  expiry: string;
  packageName: string;
  paymentStage: string;
  saccoCode: string;
  subscriptionStatus: string;
  [key: string]: any;
}

interface TerekaSaccoAccountSummary {
  activeAccounts: number;
  expiringSoon: number;
  suspendedAccounts: number;
  withoutSubscription: number;
}

interface TerekaMemberDirectoryRow extends TerekaMemberProfile {
  action: string;
  actionId?: string;
  actionLabel: string;
  kycReadiness: string;
  totalBalance: number;
  [key: string]: any;
}

interface TerekaMemberDirectorySummary {
  activeMembers: number;
  pendingKyc: number;
  portalReady: number;
  registeredMembers: number;
  totalBalances: number;
}

interface TerekaLoanRepaymentApprovalRow {
  memberId?: string;
  memberName?: string;
  [key: string]: any;
}

interface TerekaLoanApprovalRow extends TerekaLoan {
  memberName?: string;
  [key: string]: any;
}

interface TerekaMemberApprovalRow extends TerekaMemberProfile {
  action: string;
  actionId?: string;
  actionLabel: string;
  memberName?: string;
  [key: string]: any;
}

interface TerekaApprovalQueueModel {
  loans: TerekaLoanApprovalRow[];
  members: TerekaMemberApprovalRow[];
  pendingRepayments: TerekaLoanRepaymentApprovalRow[];
  pendingTransactions: Array<TerekaFinancialTransaction & Record<string, any>>;
  viewOnlyQueue: Array<Record<string, any>>;
}

interface TerekaApprovalQueueSummary {
  loansToApprove: number;
  membersToVerify: number;
  repaymentsToApprove: number;
  transactionsToApprove: number;
}

interface TerekaSubscription {
  id?: string;
  tenantId?: string;
  invoice?: string;
  packageId?: string;
  tierLabel?: string;
  amount?: number | string;
  paid?: number | string;
  status?: string;
  expiry?: string;
  [key: string]: any;
}

interface TerekaSubscriptionPackage {
  id?: string;
  code?: string;
  name?: string;
  memberRange?: string;
  amount?: number | string;
  status?: string;
  [key: string]: any;
}

interface TerekaSaccoApplicationRow extends TerekaTenantSummary {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalStage: string;
  operatingAccess: string;
  paymentStage: string;
  [key: string]: any;
}

interface TerekaSaccoRegistrationSummary {
  active: number;
  callbackReceived: number;
  paymentInitiated: number;
  readyForApproval: number;
  totalApplications: number;
}

interface TerekaSubscriptionRow extends TerekaSubscription {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalStage: string;
  balanceDue: number;
  billableMembers: number | string;
  operatingAccess: string;
  packageName?: string;
  paymentStage: string;
  paymentStatus: string;
  saccoCode?: string;
  [key: string]: any;
}

interface TerekaSubscriptionSummary {
  activeSubscriptions: number;
  callbackReceived: number;
  expiredOrSuspended: number;
  outstandingInvoices: number;
  paidAndActive: number;
  paymentInitiated: number;
  pendingPayments: number;
  revenueThisMonth: number;
  suspendedAccess: number;
}

interface TerekaPackageCardRow extends TerekaSubscriptionPackage {
  amount: number | string;
  branchLimit: number | string;
  memberLimit: number | string;
  packageId: string;
  statusLabel: string;
  statusTone: "active" | "pending";
  [key: string]: any;
}

interface TerekaSaccoCollectionAccountReviewRow {
  accountName?: string;
  accountNumber?: string;
  branch: string;
  channel: string;
  provider: string;
  status: string;
}

interface TerekaOnboardingOption {
  currency?: string;
  currencyDigits?: number;
  label: string;
  locale?: string;
  selected?: boolean;
  value: string;
}

interface TerekaFinancialTransaction {
  id?: string;
  tenantId?: string;
  memberId?: string;
  reference?: string;
  type?: string;
  channel?: string;
  provider?: string;
  amount?: number | string;
  status?: string;
  stage?: string;
  postedAt?: string;
  createdAt?: string;
  originalTransactionId?: string;
  receiptStatus?: string;
  receiptNo?: string;
  [key: string]: any;
}

interface TerekaAuditEvent {
  id?: string;
  tenantId?: string;
  recordId?: string;
  recordReference?: string;
  actor?: string;
  actorName?: string;
  action?: string;
  module?: string;
  result?: string;
  createdAt?: string;
  [key: string]: any;
}

interface TerekaSaccoProfile {
  id?: string;
  tenantId?: string;
  legalName?: string;
  tin?: string;
  umraLicenseNo?: string;
  cooperativeRegistrationNo?: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  [key: string]: any;
}

interface TerekaBranch {
  id?: string;
  tenantId?: string;
  code?: string;
  name?: string;
  managerUserId?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

interface TerekaFinancialProduct {
  id?: string;
  tenantId?: string;
  productType?: string;
  code?: string;
  name?: string;
  contributionAmount?: number | string;
  minimumBalance?: number | string;
  interestRate?: number | string;
  status?: string;
  [key: string]: any;
}

interface TerekaFinancialAccount {
  id?: string;
  tenantId?: string;
  accountType?: string;
  productName?: string;
  productCode?: string;
  code?: string;
  name?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaWelfareClaim {
  id?: string;
  tenantId?: string;
  memberId?: string;
  amount?: number | string;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

interface TerekaAccountingPeriod {
  id?: string;
  tenantId?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaChartAccount {
  id?: string;
  tenantId?: string;
  code?: string;
  name?: string;
  type?: string;
  normalBalance?: string;
  [key: string]: any;
}

interface TerekaJournalEntry {
  id?: string;
  tenantId?: string;
  reference?: string;
  description?: string;
  amount?: number | string;
  status?: string;
  postedAt?: string;
  [key: string]: any;
}

interface TerekaSupplier {
  id?: string;
  tenantId?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaExpense {
  id?: string;
  tenantId?: string;
  supplierId?: string;
  accountCode?: string;
  amount?: number | string;
  channel?: string;
  reference?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaAsset {
  id?: string;
  tenantId?: string;
  name?: string;
  category?: string;
  cost?: number | string;
  netBookValue?: number | string;
  location?: string;
  status?: string;
  [key: string]: any;
}

type TerekaAuditRiskLevel = "High" | "Normal" | "Review";
type TerekaAuditCategory = "Access control" | "Approvals" | "Financial activity" | "General" | "Operations" | "Reversals";

interface TerekaAuditRow extends TerekaAuditEvent {
  actor: string;
  category: TerekaAuditCategory;
  module: string;
  recordReference: string;
  result: string;
  riskLevel: TerekaAuditRiskLevel;
  tenantName: string;
  [key: string]: any;
}

interface TerekaAuditRowsInput {
  events: Array<TerekaAuditEvent & Record<string, any>> | null | undefined;
  tenantName: (tenantId?: string) => string;
  userName: (userId?: string) => string;
}

interface TerekaAuditGroupModel {
  access: TerekaAuditRow[];
  approvals: TerekaAuditRow[];
  finance: TerekaAuditRow[];
  highRisk: TerekaAuditRow[];
  reversals: TerekaAuditRow[];
  sensitive: TerekaAuditRow[];
}

interface TerekaAuditSummary {
  accessEvents: number;
  actors: number;
  affectedSaccos: number;
  approvalEvents: number;
  financeEvents: number;
  highRiskEvents: number;
  latestEvent: string;
  reversalEvents: number;
  sensitiveEvents: number;
  totalEvents: number;
}

interface TerekaGovernanceMeeting {
  id?: string;
  tenantId?: string;
  title?: string;
  meetingDate?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaGovernanceResolutionRow {
  id?: string;
  meetingId?: string;
  meetingTitle?: string;
  title?: string;
  ownerUserId?: string;
  ownerName?: string;
  dueDate?: string;
  status?: string;
  createdAt?: string;
  [key: string]: any;
}

interface TerekaGovernanceMeetingRow extends TerekaGovernanceMeeting {
  id: string;
  action: string;
  actionId: string;
  actionLabel: string;
  chairName: string;
  openResolutions?: number;
  resolutions?: TerekaGovernanceResolutionRow[];
  [key: string]: any;
}

interface TerekaGovernanceSummary {
  completed: number;
  openResolutions: number;
  overdueResolutions: number;
  scheduled: number;
  totalMeetings: number;
  withMinutes: number;
}

interface TerekaGovernanceRowsInput {
  meetings: Array<TerekaGovernanceMeeting & Record<string, any>> | null | undefined;
  userName: (userId?: string) => string;
}

interface TerekaGovernanceUserOption {
  id?: string;
  label: string;
  [key: string]: any;
}

interface TerekaMobileMoneyCallback {
  id?: string;
  tenantId?: string;
  reference?: string;
  status?: string;
  duplicate?: boolean;
  amount?: number | string;
  provider?: string;
  createdAt?: string;
  [key: string]: any;
}

interface TerekaNotificationTemplate {
  id?: string;
  tenantId?: string;
  eventType?: string;
  channel?: string;
  title?: string;
  status?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface TerekaProviderJobRun {
  id?: string;
  provider?: string;
  jobType?: string;
  status?: string;
  startedAt?: string;
  finishedAt?: string;
  [key: string]: any;
}

interface TerekaDataProtectionEvidence {
  privacyRequests?: number;
  openPrivacyRequests?: number;
  completedPrivacyRequests?: number;
  erasureRequestsCompleted?: number;
  kycDocuments?: number;
  kycDocumentsReviewDue?: number;
  kycDocumentsRetained?: number;
  kycDocumentsDisposed?: number;
  kycStorageActions?: number;
  evidenceStatus?: string;
  [key: string]: any;
}

interface TerekaRegulatoryReportRow {
  tenantId?: string;
  tenantName?: string;
  memberCount?: number | string;
  activeMembers?: number | string;
  savings?: number | string;
  shares?: number | string;
  welfare?: number | string;
  loanPortfolio?: number | string;
  activeLoans?: number | string;
  expenseTotal?: number | string;
  assetNetBookValue?: number | string;
  journalEntries?: number | string;
  unbalancedJournalEntries?: number | string;
  reconciliationExceptions?: number | string;
  openComplaints?: number | string;
  complianceStatus?: string;
  dataProtectionEvidence?: TerekaDataProtectionEvidence;
  [key: string]: any;
}

interface TerekaRegulatoryReport {
  reports?: TerekaRegulatoryReportRow[];
  consolidated?: TerekaRegulatoryReportRow;
  dataProtection?: TerekaDataProtectionEvidence;
  [key: string]: any;
}

interface TerekaReportCatalogueItem {
  action: string;
  copy: string;
  output: string;
  owner: string;
  title: string;
}

interface TerekaRegulatoryReportDisplayRow extends TerekaRegulatoryReportRow {
  completedPrivacyRequests?: number;
  dataProtectionStatus?: string;
  erasureRequestsCompleted?: number;
  kycDisposed?: number;
  kycDocuments?: number;
  kycRetained?: number;
  kycReviewDue?: number;
  kycStorageActions?: number;
  openPrivacyRequests?: number;
  openResolutions?: number;
  privacyRequests?: number;
  [key: string]: any;
}

interface TerekaRegulatoryReportRowsInput {
  assets: Array<TerekaAsset & Record<string, any>>;
  complaints: Array<TerekaComplaintThread & Record<string, any>>;
  currentTenantId?: string;
  expenses: Array<TerekaExpense & Record<string, any>>;
  labelize: (value: any) => string;
  loans: Array<TerekaLoan & Record<string, any>>;
  members: Array<TerekaMemberProfile & Record<string, any>>;
  platform: boolean;
  report: TerekaRegulatoryReport | null | undefined;
  selectedTenantId?: string;
  tenantName: (tenantId?: string) => string;
  tenants: Array<TerekaTenantSummary & Record<string, any>>;
}

interface TerekaPlatformReportSummaryInput {
  complaints: Array<TerekaComplaintThread & Record<string, any>>;
  subscriptions: Array<TerekaSubscription & Record<string, any>>;
  tenants: Array<TerekaTenantSummary & Record<string, any>>;
  transactions: Array<TerekaFinancialTransaction & Record<string, any>>;
  users: Array<TerekaPlatformUser & Record<string, any>>;
}

interface TerekaPlatformReportSummary {
  activeSaccos: number;
  expiredSubscriptions: number;
  failedPayments: number;
  openSaccoComplaints: number;
  pendingRegistrations: number;
  platformAdministrators: number;
  registeredSaccos: number;
  subscriptionRevenue: number;
}

interface TerekaReconciliationSummary {
  matched?: number | string;
  matchedAmount?: number | string;
  unmatchedStatementLines?: number | string;
  unmatchedStatementAmount?: number | string;
  unmatchedLedgerLines?: number | string;
  unmatchedLedgerAmount?: number | string;
  [key: string]: any;
}

interface TerekaReconciliationData {
  summary?: TerekaReconciliationSummary;
  matches?: any[];
  unmatchedStatementLines?: any[];
  unmatchedLedgerLines?: any[];
  [key: string]: any;
}

interface TerekaProviderSetting {
  key?: string;
  value?: string;
  configured?: boolean;
  secret?: boolean;
  [key: string]: any;
}

interface TerekaProviderConfig {
  channel?: string;
  provider?: string;
  activeProvider?: string;
  active?: boolean;
  settings?: TerekaProviderSetting[];
  [key: string]: any;
}

interface TerekaIntegrationConfig {
  providers?: TerekaProviderConfig[];
  updatePolicy?: string;
  [key: string]: any;
}

interface TerekaSecuritySession {
  id?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  expiresAt?: string;
  [key: string]: any;
}

interface TerekaPasswordResetRecord {
  id?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  usedAt?: string;
  [key: string]: any;
}

interface TerekaSecuritySummary {
  activeSessions?: TerekaSecuritySession[];
  recentPasswordResets?: TerekaPasswordResetRecord[];
  activeSessionCount?: number;
  passwordResetRequestCount?: number;
  currentSessionExpiresAt?: string;
  mfaEnabled?: boolean;
  [key: string]: any;
}

interface TerekaPlatformSecurityPolicy {
  mfaEnabled?: boolean;
  lockoutFailedAttempts?: number | string;
  lockoutMinutes?: number | string;
  sessionMinutes?: number | string;
  passwordExpiryDays?: number | string;
  [key: string]: any;
}

interface TerekaBalances {
  savings?: number | string;
  shares?: number | string;
  welfare?: number | string;
  [key: string]: any;
}

interface TerekaStatementLine {
  id?: string;
  reference?: string;
  transactionReference?: string;
  description?: string;
  narration?: string;
  type?: string;
  amount?: number | string;
  debit?: number | string;
  credit?: number | string;
  runningBalance?: number | string;
  savingsBalance?: number | string;
  sharesBalance?: number | string;
  welfareBalance?: number | string;
  postedAt?: string;
  createdAt?: string;
  date?: string;
  status?: string;
  channel?: string;
  provider?: string;
  receiptStatus?: string;
  receiptNo?: string;
  [key: string]: any;
}

interface TerekaLoan {
  id?: string;
  product?: string;
  applicationNo?: string;
  status?: string;
  amount?: number | string;
  requestedAmount?: number | string;
  outstandingBalance?: number | string;
  balance?: number | string;
  nextDueDate?: string;
  memberName?: string;
  membershipNo?: string;
  memberId?: string;
  [key: string]: any;
}

interface TerekaPaymentProvider {
  network?: string;
  label?: string;
  providerId?: string;
  available?: boolean;
  [key: string]: any;
}

interface TerekaPaymentRequest {
  id?: string;
  requestedAt?: string;
  createdAt?: string;
  externalReference?: string;
  purpose?: string;
  amount?: number | string;
  status?: string;
  route?: string;
  channel?: string;
  provider?: string;
  providerPayload?: Record<string, any>;
  postedAt?: string;
  receiptStatus?: string;
  receiptNo?: string;
  [key: string]: any;
}

interface TerekaPaymentLifecycleRow {
  date?: string;
  reference?: string;
  description?: string;
  paymentRoute?: string;
  amount?: number | string;
  paymentStatus?: string;
  receiptStatus?: string;
  [key: string]: any;
}

interface TerekaCollectionAccount {
  id?: string;
  active?: boolean;
  channel?: string;
  bankName?: string;
  network?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  instructions?: string;
  [key: string]: any;
}

interface TerekaOfflineDraft {
  id?: string;
  type?: string;
  title?: string;
  status?: string;
  amount?: number | string;
  createdAt?: string;
  updatedAt?: string;
  payload?: Record<string, any>;
  [key: string]: any;
}

interface TerekaNotification {
  id?: string;
  title?: string;
  message?: string;
  body?: string;
  channel?: string;
  status?: string;
  createdAt?: string;
  sentAt?: string;
  readAt?: string;
  [key: string]: any;
}

interface TerekaComplaintThread {
  id?: string;
  tenantId?: string;
  tenantName?: string;
  memberId?: string;
  memberName?: string;
  subject?: string;
  description?: string;
  category?: string;
  type?: string;
  status?: string;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderType?: string;
  unreadCount?: number;
  [key: string]: any;
}

interface TerekaChatMessage {
  id?: string;
  threadId?: string;
  senderType?: string;
  senderName?: string;
  body?: string;
  createdAt?: string;
  readAt?: string;
  [key: string]: any;
}

interface TerekaGuarantorRequest {
  id?: string;
  status?: string;
  product?: string;
  guaranteedAmount?: number | string;
  capacity?: number | string;
  loan?: TerekaLoan;
  [key: string]: any;
}

interface TerekaPrivacyRequest {
  id?: string;
  requestType?: string;
  status?: string;
  reason?: string;
  resolutionNote?: string;
  createdAt?: string;
  handledAt?: string;
  [key: string]: any;
}

interface TerekaMemberDashboard {
  balances?: TerekaBalances;
  recentTransactions?: TerekaStatementLine[];
  statementLines?: TerekaStatementLine[];
  tenant?: TerekaTenantSummary;
  paymentProviders?: TerekaPaymentProvider[];
  sessionExpiresAt?: string;
  [key: string]: any;
}

interface TerekaMemberData {
  balances: TerekaBalances | null;
  dashboard: TerekaMemberDashboard | null;
  loans: TerekaLoan[];
  notifications: TerekaNotification[];
  pendingGuarantors: TerekaGuarantorRequest[];
  complaints: TerekaComplaintThread[];
  chatThreads: TerekaComplaintThread[];
  collectionAccounts: TerekaCollectionAccount[];
  privacyRequests: TerekaPrivacyRequest[];
  drafts: TerekaOfflineDraft[];
  paymentRequests?: TerekaPaymentRequest[];
  sessionExpiresAt: string;
  [key: string]: any;
}

interface TerekaAppData {
  tenants: TerekaTenantSummary[];
  subscriptions: TerekaSubscription[];
  subscriptionPackages: TerekaSubscriptionPackage[];
  members: TerekaMemberProfile[];
  transactions: TerekaFinancialTransaction[];
  loans: TerekaLoan[];
  operations: Record<string, any> | null;
  notifications: TerekaNotification[];
  complaints: TerekaComplaintThread[];
  chatThreads?: TerekaComplaintThread[];
  users: TerekaPlatformUser[];
  branches: TerekaBranch[];
  financialProducts: TerekaFinancialProduct[];
  financialAccounts: TerekaFinancialAccount[];
  welfareClaims: TerekaWelfareClaim[];
  accountingPeriods: TerekaAccountingPeriod[];
  chartOfAccounts: TerekaChartAccount[];
  journalEntries: TerekaJournalEntry[];
  suppliers: TerekaSupplier[];
  expenses: TerekaExpense[];
  assets: TerekaAsset[];
  saccoPaymentAccounts: TerekaCollectionAccount[];
  governanceMeetings: TerekaGovernanceMeeting[];
  statementLines: TerekaStatementLine[];
  reconciliation: TerekaReconciliationData | null;
  mobileMoneyCallbacks: TerekaMobileMoneyCallback[];
  mobileMoneyPaymentRequests?: TerekaPaymentRequest[];
  notificationTemplates: TerekaNotificationTemplate[];
  providerJobRuns: TerekaProviderJobRun[];
  roles: TerekaRole[];
  permissions: TerekaPermission[];
  auditEvents: TerekaAuditEvent[];
  regulatoryReport: TerekaRegulatoryReport | null;
  securitySummary: TerekaSecuritySummary | null;
  platformSecurityPolicy: TerekaPlatformSecurityPolicy | null;
  notificationIntegrationConfig: TerekaIntegrationConfig | null;
  mobileMoneyIntegrationConfig: TerekaIntegrationConfig | null;
  [key: string]: any;
}

interface TerekaQuickSearchResult {
  id: string;
  recordId?: string;
  group?: string;
  view: string;
  title: string;
  meta?: string;
  saccoRegistrationTab?: string;
  memberTab?: string;
  userAdminTab?: string;
  moduleTabView?: string;
  moduleTab?: string;
  selectedTenantId?: string;
  selectedMemberId?: string;
  selectedLoanId?: string;
  selectedUserId?: string;
  selectedSubscriptionId?: string;
  selectedComplaintId?: string;
  [key: string]: any;
}

interface TerekaQuickSearchModel {
  activeId: string;
  groups: Array<{
    group: string;
    rows: TerekaQuickSearchResult[];
  }>;
  results: TerekaQuickSearchResult[];
}

interface TerekaTableModelInput<T = any> {
  allRows: T[];
  backendPage: (TerekaPageEnvelope & { number?: number }) | null;
  filterRows: (rows: T[]) => T[];
  filterRowsByQuery: (rows: T[], query: string) => T[];
  globalSearch: string;
  serverTable: Record<string, any> | null;
  tableState: TerekaTableState;
}

interface TerekaTableModel<T = any> {
  backendLoaded: boolean;
  backendPageNumber: number;
  backendTotal: number;
  backendTotalPages: number;
  canLoadNextServerPage: boolean;
  canLoadPreviousServerPage: boolean;
  currentPage: number;
  filteredRows: T[];
  hasGlobalSearch: boolean;
  hasTableSearch: boolean;
  pageSize: number;
  pagedRows: T[];
  searchText: string;
  searching: boolean;
  start: number;
  totalPages: number;
}

interface TerekaFormatterBridge {
  formatMoneyValue(value: number | string | null | undefined, region: TerekaRegion): string;
  formatDateValue(value: Date | number | string | null | undefined, region: TerekaRegion): string;
  formatDateTimeValue(value: Date | number | string | null | undefined, region: TerekaRegion): string;
  formatShortDateValue(value: Date | number | string | null | undefined, region: TerekaRegion): string;
  labelizeValue(value: any): string;
  normalizeValue(value: any): string;
  sumValues(rows: Record<string, any>[], ...keys: string[]): number;
  formatTableValue(row: Record<string, any>, column: string, region: TerekaRegion): string;
  isDateColumnValue(column: string): boolean;
  formatTableDateValue(value: any, column: string, region: TerekaRegion): string;
  snakeColumn(column: string): string;
  camelFallbackColumn(column: string): string;
  statusClassValue(value: any): "active" | "danger" | "pending";
  escapeHtmlValue(value: any): string;
}

interface TerekaMonthlyPerformanceRow {
  month: string;
  date?: string;
  memberId?: string;
  memberName: string;
  savingsDeposits: number;
  shareDeposits: number;
  welfareDeposits: number;
  loanRepayments: number;
  treasurerCash: number;
  mobileMoney: number;
  totalDeposits: number;
  closingBalance?: number;
  performanceId?: string;
  action?: string;
  actionLabel?: string;
  actionId?: string;
}

interface TerekaSaccoMonthlyPerformanceInput {
  transactions: Array<TerekaFinancialTransaction & Record<string, any>>;
  callbacks: Array<TerekaMobileMoneyCallback & Record<string, any>>;
  memberName: (memberId?: string) => string;
}

interface TerekaPaymentLifecycleInput {
  dashboard: TerekaMemberDashboard | null | undefined;
  drafts: TerekaOfflineDraft[];
  labelize: (value: any) => string;
  paymentRequests: TerekaPaymentRequest[];
}

interface TerekaMemberGuarantorRow extends TerekaGuarantorRequest {
  action: string;
  actionId?: string;
  actionLabel: string;
  borrower: string;
  product: string;
  requestedAmount: any;
}

interface TerekaMemberAdminMessageRow extends TerekaNotification {
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
}

interface TerekaMemberMobileMoneyRow {
  postedAt: string;
  reference?: string;
  description: string;
  credit: any;
  paymentStatus: string;
  receiptStatus: string;
  status: string;
}

interface TerekaMemberPaymentProviderOption {
  network: string;
  label: string;
  providerId: string;
}

interface TerekaMemberDraftRow extends TerekaOfflineDraft {
  action: string;
  actionId?: string;
  actionLabel: string;
  amount: any;
  details: string;
}

interface TerekaMemberDocumentRow extends Record<string, any> {
  action: string;
  actionId?: string;
  retentionReviewDueAt: string;
  retentionReviewedAt: string;
  retentionStatus: string;
  retentionStorageAction: string;
}

interface TerekaMemberDocumentRetentionSummary {
  disposed: number;
  disposalPending: number;
  documents: number;
  reviewDue: number;
}

interface TerekaMemberStatementSummary {
  creditTotal: number;
  debitTotal: number;
  lastMovement: string;
  mobileRows: number;
  officeRows: number;
  receiptRows: number;
  totalBalance: number;
  treasurerRows: number;
}

interface TerekaMemberDetailSummary {
  beneficiaries: number;
  contacts: number;
  documents: number;
  statementLines: number;
  totalBalance: number;
}

interface TerekaMemberKycCheckRow {
  area: string;
  detail: string;
  status: string;
}

interface TerekaMemberOption {
  label: string;
  value: string;
}

interface TerekaMemberReceiptEvidenceSummary {
  lastReceipt: string;
  mobileRows: number;
  receiptRows: number;
  treasurerRows: number;
}

interface TerekaStaffStatementExportSummary {
  auditTrail: string;
  csvStatement: string;
  excelSchedule: string;
  printStatement: string;
  receiptBundle: string;
  statementRows: number;
}

interface TerekaTransactionRow extends TerekaFinancialTransaction {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalReadiness: string;
  memberName?: string;
  paymentRoute: string;
  paymentStatus: string;
  receiptStatus: string;
  reversalStatus: string;
  [key: string]: any;
}

interface TerekaReceiptingQueueRow extends TerekaTransactionRow {
  receiptingAction: string;
}

interface TerekaReceiptRegisterRow extends TerekaTransactionRow {
  receiptNo: string;
  receiptStatus: string;
}

interface TerekaTransactionRowsInput {
  memberName: (memberId?: string) => string;
  transactions: TerekaFinancialTransaction[];
}

interface TerekaTransactionReceiptSummary {
  loanRepayments: number;
  mobileMoney: number;
  receiptReady: number;
  savingsDeposits: number;
  totalAmount: number | string;
  totalRows: number;
  treasurerCash: number;
}

interface TerekaTransactionOverviewSummary {
  pendingApproval: number;
  postedValue: number | string;
  reversed: number;
  totalRows: number;
}

interface TerekaLoanRow extends TerekaLoan {
  action: string;
  actionId?: string;
  actionLabel: string;
  approvalReadiness: string;
  guarantorReadiness: string;
  memberName?: string;
  outstandingBalance: number;
  requestedAmount?: number | string;
  servicingStatus: string;
  [key: string]: any;
}

interface TerekaLoanRowsInput {
  formatMoney: (value: number | string) => string;
  labelize: (value: any) => string;
  loans: Array<TerekaLoan & Record<string, any>>;
  memberName: (memberId?: string) => string;
}

interface TerekaLoanPortfolioSummary {
  active: number;
  approved: number;
  arrearsTotal: number;
  atRisk: number;
  outstandingPrincipal: number;
  over90Total: number;
  submitted: number;
  total: number;
}

interface TerekaLoanMemberOption {
  fullName?: string;
  id?: string;
  label: string;
  membershipNo?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaLoanProductOption {
  id?: string;
  label: string;
  name: string;
  productType?: string;
  status?: string;
  [key: string]: any;
}

interface TerekaAccountingSummary {
  accountCount: number;
  assetTotal: number;
  closedPeriods: number;
  expenseTotal: number;
  journalCount: number;
  openPeriods: number;
  periodCount: number;
  unbalancedCount: number;
}

interface TerekaAccountingSummaryInput {
  accounts: TerekaChartAccount[];
  assets: Array<TerekaAsset & Record<string, any>>;
  expenses: Array<TerekaExpense & Record<string, any>>;
  journals: Array<TerekaJournalEntry & Record<string, any>>;
  periods: TerekaAccountingPeriod[];
}

interface TerekaPaymentRequestReviewRow extends TerekaPaymentRequest {
  action: string;
  actionId?: string;
  actionLabel: string;
  reviewStatus: string;
  [key: string]: any;
}

interface TerekaAccountingAccountOption {
  code?: string;
  label: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

interface TerekaReconciliationMatchRow {
  accountCode?: any;
  externalReference?: any;
  ledgerAmount?: any;
  postedAt?: any;
  sourceType?: any;
  statementAmount?: any;
}

interface TerekaReconciliationReviewModel {
  callbackExceptions: Array<TerekaMobileMoneyCallback & Record<string, any>>;
  exceptionCount: number;
  failedPaymentRequests: Array<TerekaPaymentRequest & Record<string, any>>;
  matches: Record<string, any>[];
  matchedCoverage: number;
  paymentRequestRows: TerekaPaymentRequestReviewRow[];
  pendingPaymentRequests: Array<TerekaPaymentRequest & Record<string, any>>;
  summaryData: Record<string, any>;
  unmatchedLedgerLines: Record<string, any>[];
  unmatchedStatementLines: Record<string, any>[];
}

interface TerekaSavingsSummary {
  accountCount: number;
  activeProductCount: number;
  balanceTotal: number;
  contributionTotal: number;
  productCount: number;
}

interface TerekaSharesSummary {
  accountCount: number;
  activeMemberCount: number;
  activeProductCount: number;
  balanceTotal: number;
  contributionTotal: number;
  productCount: number;
}

interface TerekaWelfareSummary {
  accountCount: number;
  approvedCount: number;
  claimCount: number;
  paidAmount: number;
  paidCount: number;
  productCount: number;
  submittedCount: number;
}

interface TerekaWelfareClaimRow extends TerekaWelfareClaim {
  action: string;
  actionId?: string;
  actionLabel: string;
  [key: string]: any;
}

interface TerekaNotificationDeliveryRow extends TerekaNotification {
  acknowledgedAt: string;
  action: string;
  actionId?: string;
  actionLabel: string;
  alertStatus?: any;
  deliveryStatus: string;
  event: string;
  memberName: string;
  resource: string;
  tenantName: string;
  [key: string]: any;
}

interface TerekaNotificationTemplateRow extends TerekaNotificationTemplate {
  action: string;
  actionId?: string;
  actionLabel: string;
  tenantName: string;
  [key: string]: any;
}

interface TerekaProviderJobRunRow extends TerekaProviderJobRun {
  finishedAtDisplay: string;
  jobLabel: string;
  runStatus: string;
  startedAtDisplay: string;
  [key: string]: any;
}

interface TerekaNotificationSummary {
  activeTemplates: number;
  deliveryCount: number;
  failedDeliveries: number;
  globalTemplates: number;
  loginRiskAlerts: number;
  paymentExceptions: number;
  unreadAlerts: number;
}

interface TerekaNotificationFilters {
  channel?: string;
  date?: string;
  provider?: string;
  status?: string;
  tenantId?: string;
}

interface TerekaNotificationRowsInput {
  canManageNotifications: boolean;
  deliveries: Array<TerekaNotification & Record<string, any>>;
  formatDateTime: (value: any) => string;
  labelize: (value: any) => string;
  memberName: (memberId?: string) => string;
  tenantName: (tenantId?: string) => string;
  userName: (userId?: string) => string;
}

type TerekaChatMode = "platform-super" | "sacco-platform" | "member-support" | "sacco-member" | string;

interface TerekaChatThreadRow extends TerekaComplaintThread {
  id: string;
  lastMessagePreview: string;
  lastMessageSenderType: string;
  memberName: string;
  tenantName: string;
  unreadCount: number;
  updatedAt?: string;
  [key: string]: any;
}

interface TerekaComplaintSummary {
  inProgress: number;
  memberLinked: number;
  memberSupport: number;
  open: number;
  platformSupport: number;
  resolved: number;
  total: number;
  unassignedOpen: number;
  urgent: number;
}

interface TerekaComplaintOption {
  label: string;
  value: string;
}

interface TerekaChatThreadRowsInput {
  memberName: (memberId?: string) => string;
  tenantName: (tenantId?: string) => string;
  threads: TerekaComplaintThread[] | null | undefined;
}

interface TerekaChatParticipantInput {
  contextName: () => string;
  memberName: (memberId?: string) => string;
  mode: TerekaChatMode;
  row: TerekaChatThreadRow | TerekaComplaintThread;
  tenantName: (tenantId?: string) => string;
}

interface TerekaState {
  auth: string;
  authTab: string;
  locale: string;
  networkOnline: boolean;
  runtime: Record<string, any>;
  token: string;
  user: TerekaPlatformUser | null;
  member: TerekaMemberProfile | null;
  tenant: TerekaTenantSummary | null;
  roleNames: string[];
  permissionIds: string[];
  currentView: string;
  search: string;
  tableState: Record<string, TerekaTableState>;
  pageMeta: Record<string, TerekaPageEnvelope>;
  chatFilters: Record<string, any>;
  chatMessages: Record<string, TerekaChatMessage[] | undefined>;
  data: TerekaAppData;
  memberData: TerekaMemberData;
  [key: string]: any;
}

declare function expireLocalSession(message?: string): void;
declare function setModuleTab(view: string, tab: string): void;
declare function filterRecordRows<T = any>(rows: T[] | null | undefined, query: string): T[];
declare function tableStateKeyFor(title: string | null | undefined): string;
declare function buildRecordTableModel<T = any>(input: TerekaTableModelInput<T>): TerekaTableModel<T>;
declare function buildMemberStatementLines(dashboard: TerekaMemberDashboard | null | undefined): TerekaStatementLine[];
declare function buildSaccoMonthlyPerformanceRows(input: TerekaSaccoMonthlyPerformanceInput): TerekaMonthlyPerformanceRow[];
declare function buildMemberMonthlyPerformanceRows(dashboard: TerekaMemberDashboard | null | undefined): TerekaMonthlyPerformanceRow[];
declare function buildMemberPaymentLifecycleRows(input: TerekaPaymentLifecycleInput): TerekaPaymentLifecycleRow[];
declare function buildMemberGuarantorRows(requests: TerekaGuarantorRequest[]): TerekaMemberGuarantorRow[];
declare function buildMemberAdminMessageRows(notifications: TerekaNotification[]): TerekaMemberAdminMessageRow[];
declare function buildMemberMobileMoneyRows(dashboard: TerekaMemberDashboard | null | undefined): TerekaMemberMobileMoneyRow[];
declare function buildMemberPaymentProviderOptions(mobileMoneyCollectionAvailable: boolean, providers: any, labelize: (value: any) => string): TerekaMemberPaymentProviderOption[];
declare function buildMemberDraftRows(drafts: TerekaOfflineDraft[], type: string, labelize: (value: any) => string): TerekaMemberDraftRow[];
declare function buildMemberPaymentRequestRows(requests: TerekaPaymentRequest[]): Array<TerekaPaymentRequest & { action: string; actionId?: string; actionLabel: string }>;
declare function buildMemberDocumentRows(documents: Record<string, any>[], labelize: (value: any) => string, formatDateTime: (value: any) => string): TerekaMemberDocumentRow[];
declare function buildMemberDocumentRetentionSummary(documents: Record<string, any>[]): TerekaMemberDocumentRetentionSummary;
declare function buildMemberStatementSummary(member: Record<string, any>, lines: TerekaStatementLine[]): TerekaMemberStatementSummary;
declare function buildMemberDetailSummary(input: { beneficiaries: Record<string, any>[]; documents: Record<string, any>[]; nextOfKin: Record<string, any>[]; statementLines: TerekaStatementLine[]; statementSummary: TerekaMemberStatementSummary }): TerekaMemberDetailSummary;
declare function memberKycReadinessFor(member: Record<string, any>): string;
declare function buildMemberKycChecklistRows(member: Record<string, any>, labelize: (value: any) => string): TerekaMemberKycCheckRow[];
declare function memberStatusOptions(): TerekaMemberOption[];
declare function memberTypeOptions(): TerekaMemberOption[];
declare function kycStatusOptions(): TerekaMemberOption[];
declare function buildReceiptReadyStatementLines(lines: TerekaStatementLine[]): TerekaStatementLine[];
declare function buildMemberReceiptEvidenceSummary(lines: TerekaStatementLine[]): TerekaMemberReceiptEvidenceSummary;
declare function buildStaffStatementExportSummary(lines: TerekaStatementLine[]): TerekaStaffStatementExportSummary;
declare function buildTransactionRows(input: TerekaTransactionRowsInput): TerekaTransactionRow[];
declare function buildTransactionReceiptingQueue(rows: TerekaTransactionRow[]): TerekaReceiptingQueueRow[];
declare function buildTransactionReceiptRegister(rows: TerekaTransactionRow[]): TerekaReceiptRegisterRow[];
declare function buildTransactionReceiptSummary(rows: TerekaTransactionRow[]): TerekaTransactionReceiptSummary;
declare function buildTransactionOverviewSummary(rows: TerekaTransactionRow[]): TerekaTransactionOverviewSummary;
declare function buildLoanRows(input: TerekaLoanRowsInput): TerekaLoanRow[];
declare function buildLoanPortfolioSummary(rows: TerekaLoanRow[]): TerekaLoanPortfolioSummary;
declare function activeLoanMemberOptions(members: Array<TerekaMemberProfile & Record<string, any>>, excludedMemberId?: string): TerekaLoanMemberOption[];
declare function loanProductOptions(products?: Array<TerekaFinancialProduct & Record<string, any>>): TerekaLoanProductOption[];
declare function buildAccountingSummary(input: TerekaAccountingSummaryInput): TerekaAccountingSummary;
declare function buildReconciliationReviewModel(input: { callbacks: Array<TerekaMobileMoneyCallback & Record<string, any>>; labelize: (value: any) => string; paymentRequests: Array<TerekaPaymentRequest & Record<string, any>>; reconciliation: TerekaReconciliationData | null | undefined }): TerekaReconciliationReviewModel;
declare function buildPaymentRequestReviewRows(requests: Array<TerekaPaymentRequest & Record<string, any>> | null | undefined, labelize: (value: any) => string): TerekaPaymentRequestReviewRow[];
declare function accountingAccountOptions(accounts: Array<TerekaChartAccount & Record<string, any>>, type: string, excludedCodes?: string[]): TerekaAccountingAccountOption[];
declare function assetCategoryOptions(): string[];
declare function buildReconciliationMatchRows(matches: Record<string, any>[] | null | undefined): TerekaReconciliationMatchRow[];
declare function reconciliationCoverage(summaryData: Record<string, any>): number;
declare function buildSavingsSummary(input: { accounts: TerekaFinancialAccount[]; members: Array<TerekaMemberProfile & Record<string, any>>; products: TerekaFinancialProduct[] }): TerekaSavingsSummary;
declare function buildSharesSummary(input: { accounts: Array<TerekaFinancialAccount & Record<string, any>>; members: Array<TerekaMemberProfile & Record<string, any>>; products: TerekaFinancialProduct[] }): TerekaSharesSummary;
declare function buildWelfareSummary(input: { accounts: TerekaFinancialAccount[]; claims: TerekaWelfareClaim[]; products: TerekaFinancialProduct[] }): TerekaWelfareSummary;
declare function buildWelfareClaimRows(claims: TerekaWelfareClaim[]): TerekaWelfareClaimRow[];
declare function activeFinanceProducts(products: TerekaFinancialProduct[]): TerekaFinancialProduct[];
declare function welfareSubmittedClaims(claims: TerekaWelfareClaim[]): TerekaWelfareClaim[];
declare function buildNotificationDeliveryRows(input: TerekaNotificationRowsInput): TerekaNotificationDeliveryRow[];
declare function buildNotificationTemplateRows(input: { templates: Array<TerekaNotificationTemplate & Record<string, any>>; tenantName: (tenantId?: string) => string }): TerekaNotificationTemplateRow[];
declare function buildProviderJobRunRows(input: { formatDateTime: (value: any) => string; jobRuns: Array<TerekaProviderJobRun & Record<string, any>>; labelize: (value: any) => string }): TerekaProviderJobRunRow[];
declare function buildNotificationSummary(deliveries: TerekaNotificationDeliveryRow[], templates: TerekaNotificationTemplateRow[]): TerekaNotificationSummary;
declare function filterNotificationDeliveryRows(deliveries: TerekaNotificationDeliveryRow[] | null | undefined, filters: TerekaNotificationFilters | null | undefined): TerekaNotificationDeliveryRow[];
declare function loginRiskDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[];
declare function unreadNotificationDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[];
declare function failedNotificationDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[];
declare function paymentExceptionDeliveries(deliveries: TerekaNotificationDeliveryRow[]): TerekaNotificationDeliveryRow[];
declare function uniqueUnreadNotificationIds(deliveries: TerekaNotificationDeliveryRow[]): string[];
declare function notificationDeliveryActionFor(delivery: Record<string, any>, canManageNotifications: boolean): string;
declare function buildChatThreadRows(input: TerekaChatThreadRowsInput): TerekaChatThreadRow[];
declare function buildComplaintSummary(rows: TerekaChatThreadRow[]): TerekaComplaintSummary;
declare function complaintOpenRows(rows: TerekaChatThreadRow[]): TerekaChatThreadRow[];
declare function complaintUrgentRows(rows: TerekaChatThreadRow[]): TerekaChatThreadRow[];
declare function filterChatThreadRows(rows: TerekaChatThreadRow[], query: any): TerekaChatThreadRow[];
declare function chatParticipantLabel(input: TerekaChatParticipantInput): string;
declare function chatInitialsFor(text: any): string;
declare function complaintCategoryOptions(): TerekaComplaintOption[];
declare function complaintStatusOptions(): TerekaComplaintOption[];
declare function buildGovernanceMeetingRows(input: TerekaGovernanceRowsInput): TerekaGovernanceMeetingRow[];
declare function buildGovernanceResolutionRows(meetings: TerekaGovernanceMeetingRow[], userName: (userId?: string) => string): TerekaGovernanceResolutionRow[];
declare function buildMeetingResolutionRows(meeting: Pick<TerekaGovernanceMeetingRow, "resolutions"> | null | undefined, userName: (userId?: string) => string): TerekaGovernanceResolutionRow[];
declare function governanceUserOptions(users: Array<TerekaPlatformUser & Record<string, any>>, tenantId?: string): TerekaGovernanceUserOption[];
declare function meetingTypeOptions(): string[];
declare function governanceScheduledMeetings(meetings: TerekaGovernanceMeetingRow[]): TerekaGovernanceMeetingRow[];
declare function governanceCompletedMeetings(meetings: TerekaGovernanceMeetingRow[]): TerekaGovernanceMeetingRow[];
declare function governanceOpenResolutions(resolutions: TerekaGovernanceResolutionRow[]): TerekaGovernanceResolutionRow[];
declare function buildGovernanceSummary(meetings: TerekaGovernanceMeetingRow[], resolutions: TerekaGovernanceResolutionRow[], now?: Date): TerekaGovernanceSummary;
declare function isGovernanceResolutionOverdue(resolution: TerekaGovernanceResolutionRow, now?: Date): boolean;
declare function buildRegulatoryReportRows(input: TerekaRegulatoryReportRowsInput): TerekaRegulatoryReportDisplayRow[];
declare function buildRegulatoryConsolidatedReport(input: { currentTenantId?: string; platform: boolean; report: TerekaRegulatoryReport | null | undefined; rows: TerekaRegulatoryReportDisplayRow[] }): TerekaRegulatoryReportDisplayRow;
declare function reportExceptionCount(consolidated: TerekaRegulatoryReportDisplayRow): number;
declare function buildReportCatalogue(platform: boolean): TerekaReportCatalogueItem[];
declare function buildPlatformReportSummary(input: TerekaPlatformReportSummaryInput): TerekaPlatformReportSummary;
declare function buildAuditRows(input: TerekaAuditRowsInput): TerekaAuditRow[];
declare function buildAuditGroups(rows: TerekaAuditRow[]): TerekaAuditGroupModel;
declare function buildAuditSummary(rows: TerekaAuditRow[], groups: TerekaAuditGroupModel): TerekaAuditSummary;
declare function auditRiskLevelFor(event: TerekaAuditEvent & Record<string, any>): TerekaAuditRiskLevel;
declare function auditCategoryFor(event: TerekaAuditEvent & Record<string, any>): TerekaAuditCategory;
declare function uniqueAuditCount(rows: TerekaAuditRow[], key: string): number;
declare function buildSaccoApplicationRows(input: { subscriptions: Array<TerekaSubscription & Record<string, any>>; tenants: Array<TerekaTenantSummary & Record<string, any>> }): TerekaSaccoApplicationRow[];
declare function buildSaccoRegistrationSummary(applications: TerekaSaccoApplicationRow[]): TerekaSaccoRegistrationSummary;
declare function buildSubscriptionRows(input: { subscriptions: Array<TerekaSubscription & Record<string, any>>; tenants: Array<TerekaTenantSummary & Record<string, any>> }): TerekaSubscriptionRow[];
declare function buildSubscriptionSummary(rows: Array<TerekaSubscription & Record<string, any>>, tableRows: TerekaSubscriptionRow[]): TerekaSubscriptionSummary;
declare function buildPackageCardRows(packages: Array<TerekaSubscriptionPackage & Record<string, any>>): TerekaPackageCardRow[];
declare function generateSaccoCode(name: any, existingTenants: Array<TerekaTenantSummary & Record<string, any>>): string;
declare function saccoLocationAddress(district: any, parish: any, village: any, memberRange?: any): string;
declare function profileLocationPart(profile: Record<string, any> | null | undefined, label: string): string;
declare function tenantStatusOptions(): TerekaOnboardingOption[];
declare function tenantStatusLabel(status: any): string;
declare function memberRangeOptions(): TerekaOnboardingOption[];
declare function countryRegionOptions(countryRegions: Record<string, TerekaRegion>, selectedCountry?: string): TerekaOnboardingOption[];
declare function buildSaccoCollectionAccountReviewRows(accounts: Array<TerekaCollectionAccount & Record<string, any>>, labelize: (value: any) => string): TerekaSaccoCollectionAccountReviewRow[];
declare function subscriptionAccessLabelFor(subscription: Partial<TerekaSubscription & Record<string, any>>, tenant?: Partial<TerekaTenantSummary & Record<string, any>>): string;
declare function saccoPaymentStageFor(tenant: Partial<TerekaTenantSummary & Record<string, any>>, subscription?: Partial<TerekaSubscription & Record<string, any>>): string;
declare function saccoApprovalStageFor(tenant: Partial<TerekaTenantSummary & Record<string, any>>, subscription?: Partial<TerekaSubscription & Record<string, any>>): string;
declare function subscriptionPaymentLabelFor(subscription: Partial<TerekaSubscription & Record<string, any>>): string;
declare function buildAccessUserRows(input: { platformOnly: boolean; roles: Array<TerekaRole & Record<string, any>>; users: Array<TerekaPlatformUser & Record<string, any>> }): TerekaAccessUserRow[];
declare function buildAccessSummary(users: Array<TerekaPlatformUser & Record<string, any>>, roles: Array<TerekaRole & Record<string, any>>): TerekaAccessSummary;
declare function filterAccessUsersForScope(users: Array<TerekaPlatformUser & Record<string, any>>, platformOnly: boolean, tenantId?: string): Array<TerekaPlatformUser & Record<string, any>>;
declare function filterRolesForScope(roles: Array<TerekaRole & Record<string, any>>, platformOnly: boolean, tenantId?: string): Array<TerekaRole & Record<string, any>>;
declare function buildRoleCoverageRows(input: { platformOnly: boolean; roles: Array<TerekaRole & Record<string, any>>; users: Array<TerekaPlatformUser & Record<string, any>> }): TerekaRoleCoverageRow[];
declare function roleCoverageFor(users: Array<TerekaPlatformUser & Record<string, any>>, roles: Array<TerekaRole & Record<string, any>>): string;
declare function rolePurposeFor(roleName: any, platformOnly: boolean): string;
declare function roleModuleScopeFor(roleName: any, platformOnly: boolean): string;
declare function buildUserDetailRoleModel(input: { platformOnly: boolean; roleIds: string[]; roles: Array<TerekaRole & Record<string, any>>; user: TerekaPlatformUser & Record<string, any> }): TerekaUserDetailRoleModel;
declare function buildUserSessionRows(input: { canManageUser: boolean; currentUserId?: string; deviceLabel: (userAgent: any) => string; formatDateTime: (value: any) => string; sessions: Array<TerekaSecuritySession & Record<string, any>>; userId?: string }): TerekaUserSessionRow[];
declare function buildPasswordResetRows(input: { formatDateTime: (value: any) => string; resets: Array<TerekaPasswordResetRecord & Record<string, any>> }): TerekaPasswordResetRow[];
declare function buildSaccoStaffGuideRows(roles: Array<TerekaRole & Record<string, any>>): TerekaSaccoStaffGuideRow[];
declare function buildPermissionMatrixRows(modules: Array<[string, string] | string[]>, permissions?: TerekaPermission[]): TerekaPermissionMatrixRow[];
declare function roleSummaryTextFor(roleIds: string[], roles: Array<TerekaRole & Record<string, any>>, platformOnly: boolean): string;
declare function buildSaccoSettingsModel(input: { accounts: Array<TerekaFinancialAccount & Record<string, any>>; branches: Array<TerekaBranch & Record<string, any>>; labelize: (value: any) => string; products: Array<TerekaFinancialProduct & Record<string, any>> }): TerekaSaccoSettingsModel;
declare function buildSaccoSettingsControlRows(input: { accounts: Array<TerekaFinancialAccount & Record<string, any>>; branches: Array<TerekaBranch & Record<string, any>>; labelize: (value: any) => string; missingProducts: string[]; products: Array<TerekaFinancialProduct & Record<string, any>> }): TerekaSettingsControlRow[];
declare function buildSaccoSettingsReadiness(branches: Array<TerekaBranch & Record<string, any>>, products: Array<TerekaFinancialProduct & Record<string, any>>, accounts: Array<TerekaFinancialAccount & Record<string, any>>): TerekaSaccoSettingsReadiness;
declare function buildPlatformSettingsControlRows(input: { canManage: boolean; packages: Array<Record<string, any>>; permissions: Array<Record<string, any>>; roles: Array<Record<string, any>>; templates: Array<Record<string, any>> }): TerekaSettingsControlRow[];
declare function buildNotificationProviderRows(input: { providers: Array<TerekaProviderConfig & Record<string, any>>; statusRows: Array<Record<string, any>>; labelize: (value: any) => string }): TerekaProviderSetupRow[];
declare function buildMobileMoneyProviderRows(providers: Array<TerekaProviderConfig & Record<string, any>>): TerekaProviderSetupRow[];
declare function buildProviderEnvironmentRows(providers: Array<TerekaProviderConfig & Record<string, any>>, providerColumn: "channel" | "provider"): TerekaProviderEnvironmentRow[];
declare function buildMobileMoneyIntegrationSummary(input: { callbacks: Array<Record<string, any>>; providers: Array<TerekaProviderConfig & Record<string, any>>; requests: Array<Record<string, any>> }): TerekaMobileMoneyIntegrationSummary;
declare function notificationProviderNameFor(config: TerekaIntegrationConfig | null | undefined, channel: string): string;
declare function buildStaffSecuritySettingsModel(input: { currentSessionExpiresAt?: string; formatDateTime: (value: any) => string; security: TerekaSecuritySummary | null | undefined }): TerekaStaffSecurityModel;
declare function buildCollectionAccountDisplayRows(accounts: Array<TerekaCollectionAccount & Record<string, any>>, labelize: (value: any) => string): TerekaCollectionAccountDisplayRow[];
declare function buildNotificationProviderRiskRows(input: { checkedAt?: string; labelize: (value: any) => string; rows: Array<Record<string, any>> }): TerekaNotificationProviderRiskRow[];
declare function filterLoginRiskEvents(events: Array<TerekaAuditEvent & Record<string, any>>): Array<TerekaAuditEvent & Record<string, any>>;
declare function buildLoginRiskSummary(events: Array<TerekaAuditEvent & Record<string, any>>, scopeKey: "tenantId" | "ipAddress"): TerekaLoginRiskSummary;
declare function buildLoginRiskRows(input: { events: Array<TerekaAuditEvent & Record<string, any>>; formatDateTime: (value: any) => string }): TerekaLoginRiskRow[];
declare function isLoginRiskEvent(event: TerekaAuditEvent & Record<string, any>): boolean;
declare function loginRiskPortalFor(event: TerekaAuditEvent & Record<string, any>): string;
declare function buildPlatformDashboardSummary(input: { supportTickets: Array<TerekaComplaintThread & Record<string, any>>; subscriptions: Array<TerekaSubscription & Record<string, any>>; tenants: Array<TerekaTenantSummary & Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>>; users: Array<TerekaPlatformUser & Record<string, any>> }): TerekaPlatformDashboardSummary;
declare function buildPlatformOperationsSummary(input: { alerts: Array<Record<string, any>>; callbacks: Array<Record<string, any>>; openSupportTickets: Array<TerekaComplaintThread & Record<string, any>>; pendingTenants: Array<TerekaTenantSummary & Record<string, any>>; tenants: Array<TerekaTenantSummary & Record<string, any>> }): TerekaPlatformOperationsSummary;
declare function buildPlatformBillingSummary(input: { subscriptions: Array<TerekaSubscription & Record<string, any>>; tenants: Array<TerekaTenantSummary & Record<string, any>> }): TerekaPlatformBillingSummary;
declare function buildPlatformComplianceSummary(input: { alerts: Array<Record<string, any>>; auditEvents: Array<TerekaAuditEvent & Record<string, any>>; openSupportTickets: Array<TerekaComplaintThread & Record<string, any>>; pendingTenants: Array<TerekaTenantSummary & Record<string, any>>; regulatoryReportReady: boolean }): TerekaPlatformComplianceSummary;
declare function buildPlatformSupportSummary(input: { notifications: Array<Record<string, any>>; pendingTenants: Array<TerekaTenantSummary & Record<string, any>>; tenants: Array<TerekaTenantSummary & Record<string, any>>; tickets: Array<TerekaComplaintThread & Record<string, any>> }): TerekaPlatformSupportSummary;
declare function buildRecentSaccoApplicationRows(tenants: Array<TerekaTenantSummary & Record<string, any>>, pendingLabel: string): TerekaPlatformActivityRow[];
declare function buildSaccoAdminDashboardSummary(input: { loans: Array<TerekaLoan & Record<string, any>>; members: Array<TerekaMemberProfile & Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>> }): TerekaSaccoAdminDashboardSummary;
declare function buildSaccoAccountantDashboardSummary(input: { chartOfAccounts: Array<Record<string, any>>; expenses: Array<TerekaExpense & Record<string, any>>; journalEntries: Array<Record<string, any>>; reconciliation: Record<string, any> | null | undefined }): TerekaSaccoAccountantDashboardSummary;
declare function buildSaccoTellerDashboardModel(input: { currentUserId?: string; members: Array<TerekaMemberProfile & Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>> }): TerekaSaccoTellerDashboardModel;
declare function buildSaccoLoansOfficerDashboardModel(loans: Array<TerekaLoan & Record<string, any>>): TerekaSaccoLoansOfficerDashboardModel;
declare function buildSaccoAuditorDashboardModel(input: { auditEvents: Array<TerekaAuditEvent & Record<string, any>>; chartOfAccounts: Array<Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>> }): TerekaSaccoAuditorDashboardModel;
declare function buildSaccoChairpersonDashboardModel(input: { governanceMeetings: Array<Record<string, any>>; loans: Array<TerekaLoan & Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>> }): TerekaSaccoChairpersonDashboardModel;
declare function buildSaccoTreasurerDashboardModel(input: { callbacks: Array<TerekaMobileMoneyCallback & Record<string, any>>; members: Array<TerekaMemberProfile & Record<string, any>>; pendingTransactions: Array<TerekaFinancialTransaction & Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>> }): TerekaSaccoTreasurerDashboardModel;
declare function buildSaccoSecretaryDashboardModel(input: { complaints: Array<TerekaComplaintThread & Record<string, any>>; governanceMeetings: Array<Record<string, any>>; members: Array<TerekaMemberProfile & Record<string, any>> }): TerekaSaccoSecretaryDashboardModel;
declare function buildSaccoAccountHealthRows(input: { accountHealth: (tenant: TerekaTenantSummary & Record<string, any>, subscription?: TerekaSubscription & Record<string, any>) => string; approvalStage: (tenant: TerekaTenantSummary & Record<string, any>, subscription?: TerekaSubscription & Record<string, any>) => string; paymentStage: (tenant: TerekaTenantSummary & Record<string, any>, subscription?: TerekaSubscription & Record<string, any>) => string; subscriptionForTenant: (tenantId?: string) => (TerekaSubscription & Record<string, any>) | undefined; tenants: Array<TerekaTenantSummary & Record<string, any>> }): TerekaSaccoAccountHealthRow[];
declare function buildSaccoAccountSummary(rows: TerekaSaccoAccountHealthRow[], subscriptions: Array<TerekaSubscription & Record<string, any>>): TerekaSaccoAccountSummary;
declare function buildMemberDirectoryRows(input: { kycReadiness: (member: TerekaMemberProfile & Record<string, any>) => string; members: Array<TerekaMemberProfile & Record<string, any>> }): TerekaMemberDirectoryRow[];
declare function buildMemberDirectorySummary(rows: TerekaMemberDirectoryRow[]): TerekaMemberDirectorySummary;
declare function pendingMemberKycRows<T extends TerekaMemberProfile & Record<string, any>>(members: T[]): T[];
declare function uniqueNavigationValues(rows: Array<Record<string, any>> | null | undefined, key: string): any[];
declare function buildQuickSearchResult(group: string, recordId: any, view: string, title: any, meta: any, options?: Partial<TerekaQuickSearchResult>): TerekaQuickSearchResult;
declare function buildQuickSearchModel(input: { activeId?: string; index: TerekaQuickSearchResult[]; limit?: number; query?: string }): TerekaQuickSearchModel;
declare function groupQuickSearchResults(results: TerekaQuickSearchResult[]): TerekaQuickSearchModel["groups"];
declare function memberUnreadNotificationCount(notifications: Array<TerekaNotification & Record<string, any>>): number;
declare function staffUnreadNotificationCount(deliveries: Array<TerekaNotification & Record<string, any>>): number;
declare function uniqueStaffUnreadNotificationIds(deliveries: Array<TerekaNotification & Record<string, any>>): string[];
declare function buildApprovalQueueModel(input: { isPlatform: boolean; loans: Array<TerekaLoan & Record<string, any>>; memberName: (memberId?: string) => string; members: Array<TerekaMemberProfile & Record<string, any>>; pendingRepayments: Array<Record<string, any>>; transactions: Array<TerekaFinancialTransaction & Record<string, any>> }): TerekaApprovalQueueModel;
declare function buildApprovalQueueSummary(model: TerekaApprovalQueueModel): TerekaApprovalQueueSummary;
declare function addPerformanceAmountToRow(target: TerekaMonthlyPerformanceRow, purpose: any, amount: number): void;
declare function performanceMonthLabel(value: any): string;
declare function performanceMonthEndDateLabel(month: any): string;
declare function performanceRowId(row: Pick<TerekaMonthlyPerformanceRow, "memberName" | "month">): string;
declare function isMobileMoneyPerformanceLine(line: Record<string, any>): boolean;
declare function paymentRouteLabelFor(row: Record<string, any>): string;
declare function paymentLifecycleStatusFor(row: Record<string, any>): string;
declare function receiptLifecycleStatusFor(row: Record<string, any>): string;
declare var TerekaFormatters: TerekaFormatterBridge;
declare function render(): void;
