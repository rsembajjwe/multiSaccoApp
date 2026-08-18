export type TerekaDirection = "ltr" | "rtl";
export type TerekaMoney = number | string;
export type TerekaRecord = Record<string, unknown>;

export interface TerekaRegion {
  locale: string;
  currency: string;
  currencyDigits: number;
  direction: TerekaDirection;
}

export interface TerekaPageEnvelope {
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface TerekaTableState {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  direction?: "asc" | "desc" | string;
}

export interface TerekaConsentPreferences {
  privacyNoticeAccepted?: boolean;
  privacyNoticeAcceptedAt?: string;
  consentUpdatedAt?: string;
  smsConsent?: boolean;
  emailConsent?: boolean;
  mobileMoneyConsent?: boolean;
  providerDataSharingConsent?: boolean;
}

export interface TerekaMemberProfile {
  id?: string;
  tenantId?: string;
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
}

export interface TerekaTenantSummary {
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
  onboarding?: TerekaMoney;
  licenseExpiry?: string;
  district?: string;
  parish?: string;
  village?: string;
  contactNumber?: string;
}

export interface TerekaPlatformUser {
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
}

export interface TerekaRole {
  id?: string;
  name?: string;
  description?: string;
  tenantId?: string;
  permissions?: string[];
}

export interface TerekaPermission {
  id?: string;
  name?: string;
  module?: string;
  description?: string;
}

export interface TerekaSubscription {
  id?: string;
  tenantId?: string;
  invoice?: string;
  packageId?: string;
  tierLabel?: string;
  amount?: TerekaMoney;
  paid?: TerekaMoney;
  status?: string;
  expiry?: string;
}

export interface TerekaSubscriptionPackage {
  id?: string;
  code?: string;
  name?: string;
  memberRange?: string;
  amount?: TerekaMoney;
  status?: string;
}

export interface TerekaFinancialTransaction {
  id?: string;
  tenantId?: string;
  memberId?: string;
  reference?: string;
  type?: string;
  channel?: string;
  provider?: string;
  amount?: TerekaMoney;
  status?: string;
  stage?: string;
  postedAt?: string;
  createdAt?: string;
  originalTransactionId?: string;
  receiptStatus?: string;
  receiptNo?: string;
}

export interface TerekaLoan {
  id?: string;
  product?: string;
  applicationNo?: string;
  status?: string;
  amount?: TerekaMoney;
  requestedAmount?: TerekaMoney;
  outstandingBalance?: TerekaMoney;
  balance?: TerekaMoney;
  nextDueDate?: string;
  memberName?: string;
  membershipNo?: string;
  memberId?: string;
}

export interface TerekaBalances {
  savings?: TerekaMoney;
  shares?: TerekaMoney;
  welfare?: TerekaMoney;
}

export interface TerekaStatementLine {
  id?: string;
  reference?: string;
  transactionReference?: string;
  description?: string;
  narration?: string;
  type?: string;
  amount?: TerekaMoney;
  debit?: TerekaMoney;
  credit?: TerekaMoney;
  runningBalance?: TerekaMoney;
  savingsBalance?: TerekaMoney;
  sharesBalance?: TerekaMoney;
  welfareBalance?: TerekaMoney;
  postedAt?: string;
  createdAt?: string;
  date?: string;
  status?: string;
  channel?: string;
  provider?: string;
  receiptStatus?: string;
  receiptNo?: string;
  externalReference?: string;
  accountCode?: string;
  statementDate?: string;
  /** Reconciliation: SACCO collection account this line most likely settled into (matched by account number). */
  suggestedCollectionAccountId?: string;
  suggestedCollectionAccount?: string;
}

export interface TerekaPaymentProvider {
  network?: string;
  label?: string;
  providerId?: string;
  available?: boolean;
}

export interface TerekaPaymentRequest {
  id?: string;
  requestedAt?: string;
  createdAt?: string;
  externalReference?: string;
  purpose?: string;
  amount?: TerekaMoney;
  status?: string;
  route?: string;
  channel?: string;
  provider?: string;
  providerPayload?: TerekaRecord;
  postedAt?: string;
  receiptStatus?: string;
  receiptNo?: string;
}

export interface TerekaPaymentLifecycleRow {
  date?: string;
  reference?: string;
  description?: string;
  paymentRoute?: string;
  amount?: TerekaMoney;
  paymentStatus?: string;
  receiptStatus?: string;
}

export interface TerekaCollectionAccount {
  id?: string;
  tenantId?: string;
  active?: boolean;
  channel?: string;
  bankName?: string;
  network?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  instructions?: string;
}

export interface TerekaOfflineDraft {
  id?: string;
  type?: string;
  title?: string;
  status?: string;
  amount?: TerekaMoney;
  createdAt?: string;
  updatedAt?: string;
  payload?: TerekaRecord;
}

export interface TerekaNotification {
  id?: string;
  title?: string;
  message?: string;
  body?: string;
  channel?: string;
  status?: string;
  createdAt?: string;
  sentAt?: string;
  readAt?: string;
}

export interface TerekaComplaintThread {
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
}

export interface TerekaChatMessage {
  id?: string;
  threadId?: string;
  senderType?: "member" | "sacco_admin" | "platform_admin" | string;
  senderName?: string;
  body?: string;
  createdAt?: string;
  readAt?: string;
}

export interface TerekaGuarantorRequest {
  id?: string;
  status?: string;
  product?: string;
  guaranteedAmount?: TerekaMoney;
  capacity?: TerekaMoney;
  loan?: TerekaLoan;
}

export interface TerekaPrivacyRequest {
  id?: string;
  requestType?: string;
  status?: string;
  reason?: string;
  resolutionNote?: string;
  createdAt?: string;
  handledAt?: string;
}

export interface TerekaMemberDashboard {
  balances?: TerekaBalances;
  recentTransactions?: TerekaStatementLine[];
  statementLines?: TerekaStatementLine[];
  tenant?: TerekaTenantSummary;
  paymentProviders?: TerekaPaymentProvider[];
  sessionExpiresAt?: string;
}

export interface TerekaMemberData {
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
}

export interface TerekaAuditEvent {
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
}

export interface TerekaBranch {
  id?: string;
  tenantId?: string;
  code?: string;
  name?: string;
  managerUserId?: string;
  address?: string;
  status?: string;
  createdAt?: string;
}

export interface TerekaFinancialProduct {
  id?: string;
  tenantId?: string;
  productType?: string;
  code?: string;
  name?: string;
  contributionAmount?: TerekaMoney;
  minimumBalance?: TerekaMoney;
  interestRate?: TerekaMoney;
  status?: string;
}

export interface TerekaFinancialAccount {
  id?: string;
  tenantId?: string;
  accountType?: string;
  productName?: string;
  productCode?: string;
  code?: string;
  name?: string;
  status?: string;
}

export interface TerekaWelfareClaim {
  id?: string;
  tenantId?: string;
  memberId?: string;
  amount?: TerekaMoney;
  status?: string;
  createdAt?: string;
}

export interface TerekaFundingSource {
  id?: string;
  tenantId?: string;
  sourceType?: string;
  provider?: string;
  amount?: TerekaMoney;
  currencyCode?: string;
  reference?: string;
  dateReceived?: string;
  status?: string;
  notes?: string;
}

export interface TerekaAccountingPeriod {
  id?: string;
  tenantId?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface TerekaChartAccount {
  id?: string;
  tenantId?: string;
  code?: string;
  name?: string;
  type?: string;
  normalBalance?: string;
}

export interface TerekaJournalEntry {
  id?: string;
  tenantId?: string;
  reference?: string;
  description?: string;
  amount?: TerekaMoney;
  status?: string;
  postedAt?: string;
}

export interface TerekaSupplier {
  id?: string;
  tenantId?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface TerekaExpense {
  id?: string;
  tenantId?: string;
  supplierId?: string;
  accountCode?: string;
  amount?: TerekaMoney;
  channel?: string;
  reference?: string;
  status?: string;
}

export interface TerekaAsset {
  id?: string;
  tenantId?: string;
  name?: string;
  category?: string;
  cost?: TerekaMoney;
  netBookValue?: TerekaMoney;
  location?: string;
  status?: string;
}

export interface TerekaGovernanceMeeting {
  id?: string;
  tenantId?: string;
  title?: string;
  meetingDate?: string;
  status?: string;
}

export interface TerekaMobileMoneyCallback {
  id?: string;
  tenantId?: string;
  reference?: string;
  externalReference?: string;
  purpose?: string;
  status?: string;
  duplicate?: boolean;
  amount?: TerekaMoney;
  provider?: string;
  createdAt?: string;
  /** Reconciliation: SACCO mobile-money collection account whose network matches this callback's provider. */
  suggestedCollectionAccountId?: string;
  suggestedCollectionAccount?: string;
}

export interface TerekaNotificationTemplate {
  id?: string;
  tenantId?: string;
  eventType?: string;
  channel?: string;
  title?: string;
  status?: string;
  updatedAt?: string;
}

export interface TerekaProviderJobRun {
  id?: string;
  provider?: string;
  jobType?: string;
  status?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface TerekaDataProtectionEvidence {
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
}

export interface TerekaRegulatoryReportRow {
  tenantId?: string;
  tenantName?: string;
  memberCount?: TerekaMoney;
  activeMembers?: TerekaMoney;
  savings?: TerekaMoney;
  shares?: TerekaMoney;
  welfare?: TerekaMoney;
  loanPortfolio?: TerekaMoney;
  activeLoans?: TerekaMoney;
  expenseTotal?: TerekaMoney;
  assetNetBookValue?: TerekaMoney;
  journalEntries?: TerekaMoney;
  unbalancedJournalEntries?: TerekaMoney;
  reconciliationExceptions?: TerekaMoney;
  openComplaints?: TerekaMoney;
  complianceStatus?: string;
  dataProtectionEvidence?: TerekaDataProtectionEvidence;
}

export interface TerekaRegulatoryReport {
  reports?: TerekaRegulatoryReportRow[];
  consolidated?: TerekaRegulatoryReportRow;
  dataProtection?: TerekaDataProtectionEvidence;
}

export interface TerekaReconciliationSummary {
  matched?: TerekaMoney;
  matchedAmount?: TerekaMoney;
  unmatchedStatementLines?: TerekaMoney;
  unmatchedStatementAmount?: TerekaMoney;
  unmatchedLedgerLines?: TerekaMoney;
  unmatchedLedgerAmount?: TerekaMoney;
}

export interface TerekaReconciliationData {
  summary?: TerekaReconciliationSummary;
  matches?: TerekaRecord[];
  unmatchedStatementLines?: TerekaRecord[];
  unmatchedLedgerLines?: TerekaRecord[];
}

export interface TerekaProviderSetting {
  key?: string;
  value?: string;
  configured?: boolean;
  secret?: boolean;
}

export interface TerekaProviderConfig {
  channel?: string;
  provider?: string;
  activeProvider?: string;
  active?: boolean;
  settings?: TerekaProviderSetting[];
}

export interface TerekaIntegrationConfig {
  providers?: TerekaProviderConfig[];
  updatePolicy?: string;
}

export interface TerekaSecuritySession {
  id?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  expiresAt?: string;
}

export interface TerekaPasswordResetRecord {
  id?: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  usedAt?: string;
}

export interface TerekaSecuritySummary {
  activeSessions?: TerekaSecuritySession[];
  recentPasswordResets?: TerekaPasswordResetRecord[];
  activeSessionCount?: number;
  passwordResetRequestCount?: number;
  currentSessionExpiresAt?: string;
  mfaEnabled?: boolean;
}

export interface TerekaPlatformSecurityPolicy {
  mfaEnabled?: boolean;
  lockoutFailedAttempts?: TerekaMoney;
  lockoutMinutes?: TerekaMoney;
  sessionMinutes?: TerekaMoney;
  passwordExpiryDays?: TerekaMoney;
}

export interface TerekaAppData {
  tenants: TerekaTenantSummary[];
  subscriptions: TerekaSubscription[];
  subscriptionPackages: TerekaSubscriptionPackage[];
  members: TerekaMemberProfile[];
  transactions: TerekaFinancialTransaction[];
  loans: TerekaLoan[];
  operations: TerekaRecord | null;
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
}

export interface TerekaQuickSearchResult {
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
}

export interface TerekaState {
  auth: string;
  authTab: string;
  locale: string;
  networkOnline: boolean;
  runtime: TerekaRecord;
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
  chatFilters: Record<string, TerekaRecord>;
  chatMessages: Record<string, TerekaChatMessage[] | undefined>;
  data: TerekaAppData;
  memberData: TerekaMemberData;
}
