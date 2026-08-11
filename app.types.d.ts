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

interface TerekaGovernanceMeeting {
  id?: string;
  tenantId?: string;
  title?: string;
  meetingDate?: string;
  status?: string;
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
declare function buildRecordTableModel<T = any>(input: TerekaTableModelInput<T>): TerekaTableModel<T>;
declare var TerekaFormatters: TerekaFormatterBridge;
declare function render(): void;
