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

interface TerekaGuarantorRequest {
  id?: string;
  status?: string;
  product?: string;
  guaranteedAmount?: number | string;
  capacity?: number | string;
  loan?: TerekaLoan;
  [key: string]: any;
}

interface TerekaChatThread {
  id?: string;
  unreadCount?: number;
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
  complaints: any[];
  chatThreads: TerekaChatThread[];
  collectionAccounts: TerekaCollectionAccount[];
  privacyRequests: TerekaPrivacyRequest[];
  drafts: TerekaOfflineDraft[];
  paymentRequests?: TerekaPaymentRequest[];
  sessionExpiresAt: string;
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

interface TerekaState {
  auth: string;
  authTab: string;
  locale: string;
  networkOnline: boolean;
  runtime: Record<string, any>;
  token: string;
  user: Record<string, any> | null;
  member: TerekaMemberProfile | null;
  tenant: TerekaTenantSummary | null;
  roleNames: string[];
  permissionIds: string[];
  currentView: string;
  search: string;
  tableState: Record<string, TerekaTableState>;
  pageMeta: Record<string, TerekaPageEnvelope>;
  chatFilters: Record<string, any>;
  chatMessages: Record<string, any[]>;
  data: Record<string, any>;
  memberData: TerekaMemberData;
  [key: string]: any;
}

declare function expireLocalSession(message?: string): void;
declare function setModuleTab(view: string, tab: string): void;
declare function render(): void;
