const API_BASE = "/api/v1";
const STAFF_TOKEN_KEY = "tereka-staff-token";
const MEMBER_TOKEN_KEY = "tereka-member-token";
const MEMBER_DRAFTS_KEY = "tereka-member-offline-drafts-v1";
const LOCALE_KEY = "tereka-locale";
const DEMO_TOOLS_REQUESTED = new URLSearchParams(window.location.search).has("demo");

const DEFAULT_REGION = Object.freeze({
  locale: "en-UG",
  currency: "UGX",
  currencyDigits: 0,
  direction: "ltr"
});

const COUNTRY_REGIONS = Object.freeze({
  uganda: DEFAULT_REGION,
  kenya: { locale: "en-KE", currency: "KES", currencyDigits: 0, direction: "ltr" },
  tanzania: { locale: "sw-TZ", currency: "TZS", currencyDigits: 0, direction: "ltr" },
  rwanda: { locale: "rw-RW", currency: "RWF", currencyDigits: 0, direction: "ltr" },
  nigeria: { locale: "en-NG", currency: "NGN", currencyDigits: 2, direction: "ltr" },
  ghana: { locale: "en-GH", currency: "GHS", currencyDigits: 2, direction: "ltr" },
  "south africa": { locale: "en-ZA", currency: "ZAR", currencyDigits: 2, direction: "ltr" },
  ethiopia: { locale: "am-ET", currency: "ETB", currencyDigits: 2, direction: "ltr" },
  mozambique: { locale: "pt-MZ", currency: "MZN", currencyDigits: 2, direction: "ltr" },
  angola: { locale: "pt-AO", currency: "AOA", currencyDigits: 2, direction: "ltr" },
  senegal: { locale: "fr-SN", currency: "XOF", currencyDigits: 0, direction: "ltr" },
  "cote d'ivoire": { locale: "fr-CI", currency: "XOF", currencyDigits: 0, direction: "ltr" },
  "ivory coast": { locale: "fr-CI", currency: "XOF", currencyDigits: 0, direction: "ltr" },
  cameroon: { locale: "fr-CM", currency: "XAF", currencyDigits: 0, direction: "ltr" },
  egypt: { locale: "ar-EG", currency: "EGP", currencyDigits: 2, direction: "rtl" },
  sudan: { locale: "ar-SD", currency: "SDG", currencyDigits: 2, direction: "rtl" },
  morocco: { locale: "ar-MA", currency: "MAD", currencyDigits: 2, direction: "rtl" }
});

const money = {
  format(value) {
    const region = currentRegion();
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      minimumFractionDigits: region.currencyDigits,
      maximumFractionDigits: region.currencyDigits
    }).format(Number(value || 0));
  }
};

const supportedLocales = [
  { code: "en-UG", label: "English" },
  { code: "fr-FR", label: "Francais" }
];

const messages = {
  "en-UG": {
    loginHeroTitle: "Enterprise SACCO access gateway",
    securePortal: "Secure portal",
    loginHeroCopy: "One controlled entry point for Platform Administrators, SACCO staff, and members. The SACCO code routes the user, and role permissions decide the workspace after authentication.",
    platformAdmin: "Platform Admin",
    platformAdminCopy: "Super Admin, Billing, Compliance, Operations and Support roles",
    saccoStaff: "SACCO Staff",
    saccoStaffCopy: "Chairperson, Treasurer, Secretary, Accountant, Teller and admin roles",
    member: "Member",
    membershipNo: "Membership no.",
    memberCopy: "Balances, deposits, loans, statements, guarantors and complaints",
    trustAccess: "Role-based access and SACCO isolation",
    trustApprovals: "Maker-checker approvals and audit trail",
    trustPayments: "Mobile-money, cash and loan repayment controls",
    trustLowBandwidth: "Low-bandwidth screens for branch operations",
    login: "Login",
    registerSacco: "Register SACCO",
    forgotPassword: "Forgot password",
    support: "Support",
    demoAccess: "Demo access",
    demoAccessCopy: "Choose a role to fill the login fields.",
    fillDemo: "Fill demo",
    protectedSession: "Protected session",
    protectedSessionCopy: "Tokens are stored server-side and expire automatically.",
    correctPortal: "Correct portal",
    correctPortalCopy: "Code + username decides Platform, SACCO staff or member access.",
    productionReady: "Production ready",
    productionReadyCopy: "Demo accounts stay profile-gated outside dev/demo mode.",
    privacyPolicy: "Privacy policy",
    terms: "Terms and conditions",
    maintenanceNotices: "Maintenance notices",
    secureAccess: "Secure access",
    loginTitle: "Login to Tereka Online",
    loginCopy: "Enter the code, user identity and password. The system opens only the views allowed for that role.",
    platformCode: "Platform code",
    saccoCode: "SACCO code",
    saccoCodeExample: "Example: GVS",
    memberLogin: "Member login",
    memberLoginCopy: "Membership no. / phone / email",
    code: "Code",
    codePlaceholder: "PLATFORM or SACCO code",
    codeHelp: "Required. Use PLATFORM for platform users or a SACCO code such as GVS.",
    usernameLabel: "Username, email, phone or membership number",
    usernameHelp: "Platform and SACCO staff may use email. Members may use membership number, phone or email.",
    password: "Password",
    enterPassword: "Enter password",
    show: "Show",
    rememberDevice: "Remember this device",
    loginSecurely: "Login securely",
    loginRequired: "Code, username and password are required.",
    verifyingAccess: "Verifying access...",
    invalidLogin: "Invalid code, username, or password.",
    selfRegistration: "Self-registration",
    registerSaccoCopy: "Complete SACCO details. Mobile-money payment is initiated after submission, then platform approval activates the SACCO.",
    registrationFailed: "Registration failed.",
    saccoName: "SACCO name",
    saccoCodeGenerated: "Generated automatically",
    registrationNumber: "Registration number",
    registrationNumberPlaceholder: "Cooperative or UMRA registration",
    district: "District",
    parish: "Parish",
    village: "Village",
    contactNumber: "Contact number",
    memberRange: "Member range",
    mobileMoneyNumber: "Mobile money number",
    paymentStep: "Payment step",
    paymentStepCopy: "Mobile-money payment prompt is initiated after submission.",
    submitAndPay: "Submit and initiate payment",
    memberDashboardTitle: "Member dashboard",
    memberWelcomeCopy: "Balances and requests update after every refresh.",
    memberPortalStatus: "Member portal",
    overview: "Overview",
    monthlySavings: "Monthly savings",
    loans: "Loans",
    messages: "Messages",
    mobileMoney: "Mobile money",
    transactions: "Transactions",
    totalBalance: "Total balance",
    savings: "Savings",
    shares: "Shares",
    welfare: "Welfare",
    notifications: "Notifications",
    guaranteeRequests: "Guarantee requests",
    offlineDrafts: "Offline drafts",
    savingsSharesWelfare: "Savings, shares and welfare",
    viewAccounts: "View accounts",
    lastTransactionStatement: "Last transaction available in statement",
    details: "Details",
    shareBalance: "Share balance",
    welfareContributions: "Welfare contributions",
    activePendingLoans: "Active and pending loans",
    open: "Open",
    unreadAndRecent: "Unread and recent",
    read: "Read",
    pendingGuarantors: "Pending guarantors",
    respond: "Respond",
    syncDrafts: "Sync drafts",
    sync: "Sync",
    memberQuickActions: "Member quick actions",
    memberQuickActionsCopy: "Common member tasks open directly in the right workspace.",
    selfService: "Self-service",
    payByMobileMoney: "Pay by mobile money",
    payByMobileMoneyCopy: "Start a mobile-money savings, shares, welfare or loan payment.",
    treasurerCashHandoff: "Treasurer cash handoff",
    treasurerCashHandoffCopy: "Review cash deposit rules before paying through the Treasurer.",
    viewStatement: "View statement",
    viewStatementCopy: "Open posted activity, monthly savings and export controls.",
    viewReceipts: "View receipts",
    viewReceiptsCopy: "Confirm posted receipts and printable payment evidence.",
    readSaccoMessages: "Read SACCO messages",
    readSaccoMessagesCopy: "Open notices and reminders from the SACCO admin office.",
    submitComplaint: "Submit complaint",
    submitComplaintCopy: "Raise a service issue for SACCO admin follow-up.",
    memberCommandCenter: "Member command center",
    memberCommandCenterCopy: "One view for monthly savings, loans, SACCO admin messages and mobile-money deposit status.",
    memberReady: "Member-ready",
    thisMonthDeposits: "This month deposits",
    loanBalance: "Loan balance",
    saccoAdminMessages: "SACCO admin messages",
    mobileMoneyDeposits: "Mobile money deposits",
    noMonthYet: "No month yet",
    serviceReady: "Service ready",
    memberServiceAssurance: "Member service assurance",
    memberServiceAssuranceCopy: "Enterprise controls for balances, messages, deposits, receipts and session safety.",
    memberIdentity: "Member identity",
    kycStatus: "KYC status",
    balanceControl: "Balance control",
    thisMonth: "This month",
    unreadMessages: "Unread messages",
    mobileDeposits: "Mobile deposits",
    receipts: "Receipts",
    lastSync: "Last sync",
    available: "Available",
    pending: "Pending",
    ready: "Ready",
    verified: "Verified",
    review: "Review",
    download: "Download",
    export: "Export",
    refresh: "Refresh",
    paymentOptions: "Payment options",
    payableLoans: "Payable loans",
    treasurerCash: "Treasurer cash",
    paymentDrafts: "Payment drafts",
    enabled: "Enabled",
    repay: "Repay",
    use: "Use",
    visitOffice: "Visit office",
    memberPaymentCenter: "Member payment center",
    memberPaymentCenterCopy: "Deposit savings, shares, welfare contributions or loan repayments by mobile money, or prepare a Treasurer cash handoff for office receipting.",
    readyToPost: "Ready to post",
    paymentRoute: "Payment route",
    paymentPurpose: "Payment purpose",
    amount: "Amount",
    provider: "Provider",
    reference: "Reference",
    loanForRepayment: "Loan for repayment",
    saveDraft: "Save draft",
    postPayment: "Post payment",
    statementLines: "Statement lines",
    statementActivity: "Statement activity",
    exports: "Exports",
    readiness: "Readiness",
    savingsBalance: "Savings balance",
    statementReadiness: "Member statement readiness",
    statementReadinessCopy: "Balances and statement lines are refreshed from SACCO records.",
    receiptStatus: "Receipt status",
    totalReceived: "Total received",
    withdrawals: "Withdrawals",
    receiptEvidenceControls: "Receipt evidence controls",
    receiptEvidenceCopy: "Receipts are produced from posted transactions and carry reference numbers for SACCO follow-up.",
    evidenceReady: "Evidence ready",
    receiptExportPrint: "Receipt export and print",
    receiptExportPrintCopy: "Members can download or print receipt evidence for mobile-money deposits, Treasurer cash deposits and repayments.",
    printReady: "Print ready",
    myComplaints: "My complaints",
    openCases: "Open cases",
    resolvedCases: "Resolved cases",
    memberComplaintCenter: "Member complaint center",
    memberComplaintCenterCopy: "Submit service issues, save offline drafts, sync to the SACCO support desk and track status.",
    noOpenCases: "No open cases",
    followUpActive: "Follow-up active",
    submit: "Submit",
    drafts: "Drafts",
    tracking: "Tracking",
    evidence: "Evidence",
    memberSecurityCenter: "Member security center",
    memberSecurityCenterCopy: "Review login requirements, device session state and account safety reminders.",
    session: "Session",
    recovery: "Recovery",
    safety: "Safety",
    active: "Active",
    signedOut: "Signed out",
    loginCode: "Login code",
    protected: "Protected",
    demoAccessHidden: "Hidden",
    memberManagementFocus: "Member management focus",
    memberOverview: "Member Overview",
    registerMember: "Register Member",
    memberList: "Member List",
    kycDetail: "KYC Detail",
    contactsDocuments: "Contacts & Documents",
    statement: "Statement",
    registeredMembers: "Registered members",
    activeMembers: "Active members",
    pendingKyc: "Pending KYC",
    portalReady: "Portal-ready",
    transactionControlFocus: "Transaction control focus",
    control: "Control",
    newTransactionScreen: "New transaction screen",
    transactionDetail: "Transaction detail",
    transactionList: "Transaction list",
    pendingApproval: "Pending approval",
    postedValue: "Posted value",
    reversals: "Reversals",
    savingsControl: "Savings control",
    savingsOperationsControl: "Savings operations control",
    monthlyPerformance: "Monthly performance",
    savingsProductSetup: "Savings product setup",
    openSavingsAccount: "Open Savings account",
    savingsRecords: "Savings records",
    savingsProducts: "Savings products",
    savingsAccounts: "Savings accounts",
    activeProducts: "Active products",
    minimumContribution: "Minimum contribution",
    savingsBalances: "Savings balances",
    loanLifecycleControl: "Loan lifecycle control",
    lifecycle: "Lifecycle",
    loanApplicationForm: "Loan application form",
    loanDetailGuarantors: "Loan detail and guarantors",
    loanApplicationList: "Loan application list",
    activeLoans: "Active loans",
    outstandingPrincipal: "Outstanding principal",
    awaitingApproval: "Awaiting approval",
    readyToDisburse: "Ready to disburse",
    portfolioAtRisk: "Portfolio at risk",
    reportingEvidenceControl: "Reporting evidence control",
    sharesControl: "Shares control",
    sharesCapitalControl: "Shares capital control",
    sharesProductSetup: "Shares product setup",
    openSharesAccount: "Open Shares account",
    shareRegister: "Share register",
    shareProducts: "Share products",
    shareAccounts: "Share accounts",
    shareContributionSetup: "Share contribution setup",
    shareBalances: "Share balances",
    welfareControl: "Welfare control",
    welfareFundControl: "Welfare fund control",
    welfareProductSetup: "Welfare product setup",
    openWelfareAccount: "Open Welfare account",
    welfareClaims: "Welfare claims",
    welfareClaimDecision: "Welfare claim decision",
    welfareProducts: "Welfare products",
    welfareAccounts: "Welfare accounts",
    claims: "Claims",
    pendingClaims: "Pending claims",
    approvedForPayment: "Approved for payment",
    paidClaims: "Paid claims",
    accountingLedgerConfidence: "Accounting ledger confidence",
    ledgerControl: "Ledger control",
    expenseAssetCapture: "Expense and asset capture",
    chartPeriods: "Chart and periods",
    recentJournalEntries: "Recent journal entries",
    expenseAssetRegisters: "Expense and asset registers",
    chartAccounts: "Chart accounts",
    accountingPeriods: "Accounting periods",
    journalEntries: "Journal entries",
    unbalancedJournals: "Unbalanced journals",
    expenses: "Expenses",
    assets: "Assets",
    reconciliationReadinessChecks: "Reconciliation readiness checks",
    reconciliationControl: "Reconciliation control",
    bankMobileMoneyMatching: "Bank and mobile-money matching",
    exceptions: "Exceptions",
    providerCallbacks: "Provider callbacks",
    matchedRecords: "Matched records",
    unmatchedStatementLines: "Unmatched statement lines",
    unmatchedLedgerLines: "Unmatched ledger lines",
    callbackExceptions: "Callback exceptions",
    governanceActionControl: "Governance action control",
    governanceControl: "Governance control",
    governanceMeetingSetup: "Governance meeting setup",
    governanceMeetingDetail: "Governance meeting detail",
    governanceMeetingRegister: "Governance meeting register",
    resolutionActionList: "Resolution action list",
    meetings: "Meetings",
    scheduledMeetings: "Scheduled meetings",
    openResolutions: "Open resolutions",
    completedMeetings: "Completed meetings",
    saccoSettingsControl: "SACCO settings control",
    settingsOverview: "Settings Overview",
    branchSetup: "Branch Setup",
    productSetup: "Product Setup",
    setupRecords: "Setup Records",
    security: "Security",
    activeBranches: "Active branches",
    productCoverage: "Product coverage",
    roles: "Roles",
    auditEvidenceControl: "Audit evidence control",
    auditControl: "Audit control",
    saccoAuditEvidence: "SACCO audit evidence",
    sensitiveAuditQueue: "Sensitive audit queue",
    saccoAuditTrail: "SACCO audit trail",
    auditEvents: "Audit events",
    highRiskEvents: "High-risk events",
    loginRiskEvents: "Login risk events",
    actorsInvolved: "Actors involved",
    actors: "Actors",
    totalSaccos: "Total SACCOs",
    activeSaccos: "Active SACCOs",
    pendingRegistrations: "Pending registrations",
    expiredSubscriptions: "Expired subscriptions",
    totalSubscriptionRevenue: "Total subscription revenue",
    saccoSupportTickets: "SACCO support tickets",
    failedPaymentTransactions: "Failed payment transactions",
    activePlatformUsers: "Active platform users",
    recentSaccoApplications: "Recent SACCO applications",
    platformSaccoRegistration: "Register SACCO inside platform",
    saccoApplicationList: "SACCO application list",
    selfRegistrationApprovalPath: "Self-registration approval path",
    activeSubscriptions: "Active subscriptions",
    pendingPayments: "Pending payments",
    suspendedAccess: "Suspended access",
    revenueThisMonth: "Revenue this month",
    outstandingInvoices: "Outstanding invoices",
    subscriptionPaymentAccessStatus: "Subscription payment and access status",
    activeAccounts: "Active accounts",
    suspendedAccounts: "Suspended accounts",
    withoutSubscription: "Without subscription",
    expiringSoon: "Expiring soon",
    registeredSaccos: "Registered SACCOs",
    subscriptionRevenue: "Subscription revenue",
    platformAdministrators: "Platform administrators",
    openSaccoComplaints: "Open SACCO complaints",
    failedPayments: "Failed payments",
    complianceExceptions: "Compliance exceptions",
    superAdminReportingControl: "Super admin reporting control",
    complaintsFromSaccoAdmins: "Complaints from SACCO admins",
    complaintReview: "Complaint review",
    urgentComplaints: "Urgent complaints",
    inProgress: "In progress",
    resolved: "Resolved",
    deliveries: "Deliveries",
    failedDeliveries: "Failed deliveries",
    loginRiskAlerts: "Login risk alerts",
    unreadAlerts: "Unread alerts",
    activeTemplates: "Active templates",
    globalTemplates: "Global templates",
    notificationDeliveryControl: "Notification delivery control",
    platformUsers: "Platform users",
    activeUsers: "Active users",
    configuredRoles: "Configured roles",
    roleCoverage: "Role coverage",
    addPlatformUser: "Add platform user",
    userDetailRoleAssignment: "User detail and role assignment",
    platformRoleCoverage: "Platform role coverage",
    platformAdministratorList: "Platform administrator list",
    permissionMatrix: "Permission matrix",
    subscriptionPackages: "Subscription packages",
    platformRoles: "Platform roles",
    permissionControls: "Permission controls",
    platformSettingsControl: "Platform settings control",
    configuration: "Configuration",
    protectedPlatformConfiguration: "Protected platform configuration",
    platformAuditEvidence: "Platform audit evidence",
    platformAuditTrail: "Platform audit trail",
    platformAdministrationPortal: "Platform Administration Portal",
    saccoAdministrationPortal: "SACCO Administration Portal",
    memberSelfServicePortal: "Member Self-Service Portal",
    navDashboard: "Dashboard",
    navDashboardPlatformDesc: "Platform performance and alerts",
    navSaccoRegistration: "SACCO Registration",
    navSaccoRegistrationDesc: "Applications and approvals",
    navSubscriptions: "Subscriptions",
    navSubscriptionsDesc: "Packages and renewals",
    navSaccoAccounts: "SACCO Accounts",
    navSaccoAccountsDesc: "SACCO account health",
    navTransactions: "Transactions",
    navPlatformTransactionsDesc: "Platform finance monitoring",
    navReports: "Reports",
    navPlatformReportsDesc: "Super admin reporting",
    navComplaints: "Complaints",
    navPlatformComplaintsDesc: "Support tickets and escalations",
    navNotifications: "Notifications",
    navNotificationsDesc: "SMS, email and in-app",
    navUsersRoles: "Users and Roles",
    navPlatformUsersDesc: "Administrator access",
    navAuditLogs: "Audit Logs",
    navPlatformAuditDesc: "Read-only platform audit trail",
    navSystemSettings: "System Settings",
    navPlatformSettingsDesc: "Protected platform configuration",
    navSaccoDashboardDesc: "Role-specific SACCO operating view",
    navMembers: "Members",
    navMembersDesc: "KYC, profiles, statements",
    navSaccoTransactionsDesc: "Deposits and reversals",
    navSavings: "Savings",
    navSavingsDesc: "Products, accounts and statements",
    navShares: "Shares",
    navSharesDesc: "Share register and certificates",
    navWelfare: "Welfare",
    navWelfareDesc: "Contributions, balances and claims",
    navLoans: "Loans",
    navLoansDesc: "Applications and repayments",
    navGuarantors: "Guarantors",
    navGuarantorsDesc: "Guarantee requests and obligations",
    navApprovals: "Approvals",
    navApprovalsDesc: "Maker-checker decisions",
    navAccounting: "Accounting",
    navAccountingDesc: "Trial balance, journals and reports",
    navReconciliation: "Reconciliation",
    navReconciliationDesc: "Bank and mobile money",
    navSaccoReportsDesc: "Operational and financial reporting",
    navGovernance: "Governance",
    navGovernanceDesc: "Meetings, minutes and resolutions",
    navSaccoComplaintsDesc: "Member cases and support",
    navSaccoUsersDesc: "SACCO staff access",
    navSettings: "Settings",
    navSettingsDesc: "Products, branches and controls",
    navSaccoAuditDesc: "Read-only sensitive activity",
    navHome: "Home",
    navHomeDesc: "Balances, next repayment and alerts",
    navMyAccounts: "My Accounts",
    navMyAccountsDesc: "Savings, shares and welfare",
    navMemberLoansDesc: "Active loans and applications",
    navGuarantorRequests: "Guarantor Requests",
    navGuarantorRequestsDesc: "Accept or reject requests",
    navPayments: "Payments",
    navPaymentsDesc: "Deposit, repay, shares, welfare",
    navStatements: "Statements",
    navStatementsDesc: "Download PDF, Excel or print",
    navReceipts: "Receipts",
    navReceiptsDesc: "Posted transaction receipts",
    navMemberNotificationsDesc: "Messages and alerts",
    navMemberComplaintsDesc: "Draft, submit and track cases",
    navProfile: "Profile",
    navProfileDesc: "Personal details and KYC",
    navSecurityDesc: "Password and device settings",
    home: "Home",
    search: "Search",
    searchPlaceholder: "Search records, members, SACCOs",
    logout: "Logout",
    exportSummary: "Export summary",
    searchThisTable: "Search this table",
    rowsPerPage: "Rows per page",
    clearSearch: "Clear search",
    shown: "shown",
    records: "record(s)",
    showingRange: "Showing",
    noRowsToShow: "No rows to show",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    actions: "Actions",
    noRecordsFound: "No records found",
    noRecordsFoundCopy: "Use refresh, adjust filters, or add the first record where your role allows it.",
    dashboardOnly: "Dashboard only",
    none: "None",
    record: "Record",
    noRecordsYet: "No records yet",
    refreshToTryAgain: "Refresh the page to try again.",
    empty: "Empty",
    loadingCopy: "Please wait while Tereka Online prepares your workspace.",
    online: "Online",
    offlineMode: "Offline mode",
    offlineNoticeTitle: "You are offline.",
    offlineNoticeCopy: "You can keep reviewing cached screens and saving member drafts. Refresh, sync and posting actions need the connection back.",
    backOnlineNotice: "Connection restored",
    offlineActionBlocked: "This action needs internet. Reconnect, then try again.",
    refreshUnavailableOffline: "Refresh unavailable offline",
    passwordRecovery: "Password recovery"
  },
  "fr-FR": {
    loginHeroTitle: "Portail d'acces SACCO d'entreprise",
    securePortal: "Portail securise",
    loginHeroCopy: "Un point d'entree controle pour les administrateurs plateforme, le personnel SACCO et les membres. Le code SACCO oriente l'utilisateur, puis les permissions ouvrent l'espace autorise.",
    platformAdmin: "Administration plateforme",
    platformAdminCopy: "Roles Super Admin, facturation, conformite, operations et support",
    saccoStaff: "Personnel SACCO",
    saccoStaffCopy: "Roles president, tresorier, secretaire, comptable, guichetier et administrateur",
    member: "Membre",
    membershipNo: "Numero membre",
    memberCopy: "Soldes, depots, prets, releves, garanties et plaintes",
    trustAccess: "Acces par role et isolation SACCO",
    trustApprovals: "Approbations maker-checker et piste d'audit",
    trustPayments: "Controle mobile money, especes et remboursements",
    trustLowBandwidth: "Ecrans sobres pour les agences",
    login: "Connexion",
    registerSacco: "Enregistrer SACCO",
    forgotPassword: "Mot de passe oublie",
    support: "Support",
    demoAccess: "Acces demo",
    demoAccessCopy: "Choisissez un role pour remplir les champs.",
    fillDemo: "Remplir demo",
    protectedSession: "Session protegee",
    protectedSessionCopy: "Les jetons sont stockes cote serveur et expirent automatiquement.",
    correctPortal: "Bon portail",
    correctPortalCopy: "Code + identifiant determine l'acces plateforme, personnel SACCO ou membre.",
    productionReady: "Pret pour production",
    productionReadyCopy: "Les comptes demo restent limites aux profils dev/demo.",
    privacyPolicy: "Politique de confidentialite",
    terms: "Conditions d'utilisation",
    maintenanceNotices: "Avis de maintenance",
    secureAccess: "Acces securise",
    loginTitle: "Connexion a Tereka Online",
    loginCopy: "Entrez le code, l'identite utilisateur et le mot de passe. Le systeme ouvre seulement les vues autorisees pour ce role.",
    platformCode: "Code plateforme",
    saccoCode: "Code SACCO",
    saccoCodeExample: "Exemple : GVS",
    memberLogin: "Connexion membre",
    memberLoginCopy: "Numero membre / telephone / email",
    code: "Code",
    codePlaceholder: "PLATFORM ou code SACCO",
    codeHelp: "Obligatoire. Utilisez PLATFORM pour la plateforme ou un code SACCO comme GVS.",
    usernameLabel: "Nom d'utilisateur, email, telephone ou numero membre",
    usernameHelp: "Le personnel peut utiliser l'email. Les membres peuvent utiliser numero membre, telephone ou email.",
    password: "Mot de passe",
    enterPassword: "Entrer le mot de passe",
    show: "Afficher",
    rememberDevice: "Se souvenir de cet appareil",
    loginSecurely: "Connexion securisee",
    loginRequired: "Code, identifiant et mot de passe sont obligatoires.",
    verifyingAccess: "Verification de l'acces...",
    invalidLogin: "Code, identifiant ou mot de passe invalide.",
    selfRegistration: "Auto-enregistrement",
    registerSaccoCopy: "Completez les details SACCO. Le paiement mobile money est lance apres soumission, puis l'approbation plateforme active le SACCO.",
    registrationFailed: "Echec de l'enregistrement.",
    saccoName: "Nom du SACCO",
    saccoCodeGenerated: "Genere automatiquement",
    registrationNumber: "Numero d'enregistrement",
    registrationNumberPlaceholder: "Enregistrement cooperatif ou regulateur",
    district: "District",
    parish: "Paroisse",
    village: "Village",
    contactNumber: "Numero de contact",
    memberRange: "Tranche de membres",
    mobileMoneyNumber: "Numero mobile money",
    paymentStep: "Etape de paiement",
    paymentStepCopy: "Une demande de paiement mobile money est lancee apres soumission.",
    submitAndPay: "Soumettre et lancer le paiement",
    memberDashboardTitle: "Tableau de bord membre",
    memberWelcomeCopy: "Les soldes et demandes se mettent a jour apres chaque actualisation.",
    memberPortalStatus: "Portail membre",
    overview: "Vue d'ensemble",
    monthlySavings: "Epargne mensuelle",
    loans: "Prets",
    messages: "Messages",
    mobileMoney: "Mobile money",
    transactions: "Transactions",
    totalBalance: "Solde total",
    savings: "Epargne",
    shares: "Parts sociales",
    welfare: "Solidarite",
    notifications: "Notifications",
    guaranteeRequests: "Demandes de garantie",
    offlineDrafts: "Brouillons hors ligne",
    savingsSharesWelfare: "Epargne, parts sociales et solidarite",
    viewAccounts: "Voir comptes",
    lastTransactionStatement: "Derniere operation disponible dans le releve",
    details: "Details",
    shareBalance: "Solde des parts",
    welfareContributions: "Contributions solidarite",
    activePendingLoans: "Prets actifs et en attente",
    open: "Ouvrir",
    unreadAndRecent: "Non lus et recents",
    read: "Lire",
    pendingGuarantors: "Garanties en attente",
    respond: "Repondre",
    syncDrafts: "Synchroniser brouillons",
    sync: "Sync",
    memberQuickActions: "Actions rapides membre",
    memberQuickActionsCopy: "Les taches courantes ouvrent directement le bon espace.",
    selfService: "Libre-service",
    payByMobileMoney: "Payer par mobile money",
    payByMobileMoneyCopy: "Demarrer un paiement epargne, parts, solidarite ou pret par mobile money.",
    treasurerCashHandoff: "Versement chez tresorier",
    treasurerCashHandoffCopy: "Verifier les regles avant de payer en especes chez le tresorier.",
    viewStatement: "Voir releve",
    viewStatementCopy: "Ouvrir les operations, l'epargne mensuelle et les exports.",
    viewReceipts: "Voir recus",
    viewReceiptsCopy: "Confirmer les recus publies et les preuves imprimables.",
    readSaccoMessages: "Lire messages SACCO",
    readSaccoMessagesCopy: "Ouvrir les avis et rappels du bureau SACCO.",
    submitComplaint: "Soumettre plainte",
    submitComplaintCopy: "Signaler un probleme de service au SACCO.",
    memberCommandCenter: "Centre de commande membre",
    memberCommandCenterCopy: "Une vue pour l'epargne mensuelle, les prets, les messages SACCO et les depots mobile money.",
    memberReady: "Pret membre",
    thisMonthDeposits: "Depots du mois",
    loanBalance: "Solde pret",
    saccoAdminMessages: "Messages admin SACCO",
    mobileMoneyDeposits: "Depots mobile money",
    noMonthYet: "Aucun mois",
    serviceReady: "Service pret",
    memberServiceAssurance: "Assurance service membre",
    memberServiceAssuranceCopy: "Controles entreprise pour soldes, messages, depots, recus et securite de session.",
    memberIdentity: "Identite membre",
    kycStatus: "Statut KYC",
    balanceControl: "Controle solde",
    thisMonth: "Ce mois",
    unreadMessages: "Messages non lus",
    mobileDeposits: "Depots mobiles",
    receipts: "Recus",
    lastSync: "Derniere synchro",
    available: "Disponible",
    pending: "En attente",
    ready: "Pret",
    verified: "Verifie",
    review: "Revoir",
    download: "Telecharger",
    export: "Exporter",
    refresh: "Actualiser",
    paymentOptions: "Options de paiement",
    payableLoans: "Prets payables",
    treasurerCash: "Especes tresorier",
    paymentDrafts: "Brouillons paiement",
    enabled: "Active",
    repay: "Rembourser",
    use: "Utiliser",
    visitOffice: "Visiter bureau",
    memberPaymentCenter: "Centre de paiement membre",
    memberPaymentCenterCopy: "Deposer epargne, parts, solidarite ou remboursements par mobile money, ou preparer un versement chez le tresorier.",
    readyToPost: "Pret a publier",
    paymentRoute: "Mode de paiement",
    paymentPurpose: "Objet du paiement",
    amount: "Montant",
    provider: "Fournisseur",
    reference: "Reference",
    loanForRepayment: "Pret a rembourser",
    saveDraft: "Enregistrer brouillon",
    postPayment: "Publier paiement",
    statementLines: "Lignes de releve",
    statementActivity: "Activite du releve",
    exports: "Exports",
    readiness: "Preparation",
    savingsBalance: "Solde epargne",
    statementReadiness: "Preparation du releve membre",
    statementReadinessCopy: "Les soldes et lignes de releve viennent des dossiers SACCO.",
    receiptStatus: "Statut recu",
    totalReceived: "Total recu",
    withdrawals: "Retraits",
    receiptEvidenceControls: "Controles preuve recu",
    receiptEvidenceCopy: "Les recus proviennent des transactions publiees et portent des references pour suivi SACCO.",
    evidenceReady: "Preuve prete",
    receiptExportPrint: "Export et impression recus",
    receiptExportPrintCopy: "Les membres peuvent telecharger ou imprimer les preuves de depots et remboursements.",
    printReady: "Pret a imprimer",
    myComplaints: "Mes plaintes",
    openCases: "Cas ouverts",
    resolvedCases: "Cas resolus",
    memberComplaintCenter: "Centre plaintes membre",
    memberComplaintCenterCopy: "Soumettre des problemes, garder des brouillons, synchroniser et suivre le statut.",
    noOpenCases: "Aucun cas ouvert",
    followUpActive: "Suivi actif",
    submit: "Soumettre",
    drafts: "Brouillons",
    tracking: "Suivi",
    evidence: "Preuve",
    memberSecurityCenter: "Centre securite membre",
    memberSecurityCenterCopy: "Verifier les exigences de connexion, la session appareil et les rappels de securite.",
    session: "Session",
    recovery: "Recuperation",
    safety: "Securite",
    active: "Actif",
    signedOut: "Deconnecte",
    loginCode: "Code connexion",
    protected: "Protege",
    demoAccessHidden: "Cache",
    memberManagementFocus: "Controle gestion membres",
    memberOverview: "Vue membres",
    registerMember: "Enregistrer membre",
    memberList: "Liste membres",
    kycDetail: "Detail KYC",
    contactsDocuments: "Contacts et documents",
    statement: "Releve",
    registeredMembers: "Membres inscrits",
    activeMembers: "Membres actifs",
    pendingKyc: "KYC en attente",
    portalReady: "Pret portail",
    transactionControlFocus: "Controle transactions",
    control: "Controle",
    newTransactionScreen: "Nouvelle transaction",
    transactionDetail: "Detail transaction",
    transactionList: "Liste transactions",
    pendingApproval: "Approbation en attente",
    postedValue: "Valeur publiee",
    reversals: "Annulations",
    savingsControl: "Controle epargne",
    savingsOperationsControl: "Controle operations epargne",
    monthlyPerformance: "Performance mensuelle",
    savingsProductSetup: "Configuration produit epargne",
    openSavingsAccount: "Ouvrir compte epargne",
    savingsRecords: "Dossiers epargne",
    savingsProducts: "Produits epargne",
    savingsAccounts: "Comptes epargne",
    activeProducts: "Produits actifs",
    minimumContribution: "Contribution minimum",
    savingsBalances: "Soldes epargne",
    loanLifecycleControl: "Controle cycle pret",
    lifecycle: "Cycle",
    loanApplicationForm: "Formulaire demande pret",
    loanDetailGuarantors: "Detail pret et garants",
    loanApplicationList: "Liste demandes pret",
    activeLoans: "Prets actifs",
    outstandingPrincipal: "Principal restant",
    awaitingApproval: "En attente approbation",
    readyToDisburse: "Pret decaissement",
    portfolioAtRisk: "Portefeuille a risque",
    reportingEvidenceControl: "Controle preuves rapports",
    sharesControl: "Controle parts",
    sharesCapitalControl: "Controle capital parts",
    sharesProductSetup: "Configuration produit parts",
    openSharesAccount: "Ouvrir compte parts",
    shareRegister: "Registre parts",
    shareProducts: "Produits parts",
    shareAccounts: "Comptes parts",
    shareContributionSetup: "Configuration contribution parts",
    shareBalances: "Soldes parts",
    welfareControl: "Controle solidarite",
    welfareFundControl: "Controle fonds solidarite",
    welfareProductSetup: "Configuration produit solidarite",
    openWelfareAccount: "Ouvrir compte solidarite",
    welfareClaims: "Demandes solidarite",
    welfareClaimDecision: "Decision demande solidarite",
    welfareProducts: "Produits solidarite",
    welfareAccounts: "Comptes solidarite",
    claims: "Demandes",
    pendingClaims: "Demandes en attente",
    approvedForPayment: "Approuve paiement",
    paidClaims: "Demandes payees",
    accountingLedgerConfidence: "Confiance grand livre",
    ledgerControl: "Controle grand livre",
    expenseAssetCapture: "Saisie depenses et actifs",
    chartPeriods: "Plan et periodes",
    recentJournalEntries: "Ecritures recentes",
    expenseAssetRegisters: "Registres depenses et actifs",
    chartAccounts: "Plan comptes",
    accountingPeriods: "Periodes comptables",
    journalEntries: "Ecritures journal",
    unbalancedJournals: "Journaux desequilibres",
    expenses: "Depenses",
    assets: "Actifs",
    reconciliationReadinessChecks: "Controles rapprochement",
    reconciliationControl: "Controle rapprochement",
    bankMobileMoneyMatching: "Correspondance banque et mobile money",
    exceptions: "Exceptions",
    providerCallbacks: "Callbacks fournisseur",
    matchedRecords: "Enregistrements rapproches",
    unmatchedStatementLines: "Lignes releve non rapprochees",
    unmatchedLedgerLines: "Lignes livre non rapprochees",
    callbackExceptions: "Exceptions callback",
    governanceActionControl: "Controle actions gouvernance",
    governanceControl: "Controle gouvernance",
    governanceMeetingSetup: "Configuration reunion gouvernance",
    governanceMeetingDetail: "Detail reunion gouvernance",
    governanceMeetingRegister: "Registre reunions gouvernance",
    resolutionActionList: "Liste actions resolution",
    meetings: "Reunions",
    scheduledMeetings: "Reunions planifiees",
    openResolutions: "Resolutions ouvertes",
    completedMeetings: "Reunions terminees",
    saccoSettingsControl: "Controle parametres SACCO",
    settingsOverview: "Vue parametres",
    branchSetup: "Configuration agence",
    productSetup: "Configuration produit",
    setupRecords: "Dossiers configuration",
    security: "Securite",
    activeBranches: "Agences actives",
    productCoverage: "Couverture produits",
    roles: "Roles",
    auditEvidenceControl: "Controle preuves audit",
    auditControl: "Controle audit",
    saccoAuditEvidence: "Preuves audit SACCO",
    sensitiveAuditQueue: "File audit sensible",
    saccoAuditTrail: "Piste audit SACCO",
    auditEvents: "Evenements audit",
    highRiskEvents: "Evenements haut risque",
    loginRiskEvents: "Risques connexion",
    actorsInvolved: "Acteurs impliques",
    actors: "Acteurs",
    totalSaccos: "Total SACCOs",
    activeSaccos: "SACCOs actifs",
    pendingRegistrations: "Inscriptions en attente",
    expiredSubscriptions: "Abonnements expires",
    totalSubscriptionRevenue: "Revenu total abonnements",
    saccoSupportTickets: "Tickets support SACCO",
    failedPaymentTransactions: "Paiements echoues",
    activePlatformUsers: "Utilisateurs plateforme actifs",
    recentSaccoApplications: "Demandes SACCO recentes",
    platformSaccoRegistration: "Enregistrer SACCO dans plateforme",
    saccoApplicationList: "Liste demandes SACCO",
    selfRegistrationApprovalPath: "Parcours approbation auto-inscription",
    activeSubscriptions: "Abonnements actifs",
    pendingPayments: "Paiements en attente",
    suspendedAccess: "Acces suspendu",
    revenueThisMonth: "Revenu du mois",
    outstandingInvoices: "Factures ouvertes",
    subscriptionPaymentAccessStatus: "Statut paiement et acces abonnement",
    activeAccounts: "Comptes actifs",
    suspendedAccounts: "Comptes suspendus",
    withoutSubscription: "Sans abonnement",
    expiringSoon: "Expiration proche",
    registeredSaccos: "SACCOs inscrits",
    subscriptionRevenue: "Revenu abonnements",
    platformAdministrators: "Administrateurs plateforme",
    openSaccoComplaints: "Plaintes SACCO ouvertes",
    failedPayments: "Paiements echoues",
    complianceExceptions: "Exceptions conformite",
    superAdminReportingControl: "Controle rapports super admin",
    complaintsFromSaccoAdmins: "Plaintes des admins SACCO",
    complaintReview: "Revue plainte",
    urgentComplaints: "Plaintes urgentes",
    inProgress: "En cours",
    resolved: "Resolues",
    deliveries: "Livraisons",
    failedDeliveries: "Livraisons echouees",
    loginRiskAlerts: "Alertes risque connexion",
    unreadAlerts: "Alertes non lues",
    activeTemplates: "Modeles actifs",
    globalTemplates: "Modeles globaux",
    notificationDeliveryControl: "Controle livraison notifications",
    platformUsers: "Utilisateurs plateforme",
    activeUsers: "Utilisateurs actifs",
    configuredRoles: "Roles configures",
    roleCoverage: "Couverture roles",
    addPlatformUser: "Ajouter utilisateur plateforme",
    userDetailRoleAssignment: "Detail utilisateur et roles",
    platformRoleCoverage: "Couverture roles plateforme",
    platformAdministratorList: "Liste administrateurs plateforme",
    permissionMatrix: "Matrice permissions",
    subscriptionPackages: "Packages abonnement",
    platformRoles: "Roles plateforme",
    permissionControls: "Controles permissions",
    platformSettingsControl: "Controle parametres plateforme",
    configuration: "Configuration",
    protectedPlatformConfiguration: "Configuration plateforme protegee",
    platformAuditEvidence: "Preuves audit plateforme",
    platformAuditTrail: "Piste audit plateforme",
    platformAdministrationPortal: "Portail administration plateforme",
    saccoAdministrationPortal: "Portail administration SACCO",
    memberSelfServicePortal: "Portail libre-service membre",
    navDashboard: "Tableau de bord",
    navDashboardPlatformDesc: "Performance plateforme et alertes",
    navSaccoRegistration: "Inscription SACCO",
    navSaccoRegistrationDesc: "Demandes et approbations",
    navSubscriptions: "Abonnements",
    navSubscriptionsDesc: "Packages et renouvellements",
    navSaccoAccounts: "Comptes SACCO",
    navSaccoAccountsDesc: "Sante des comptes SACCO",
    navTransactions: "Transactions",
    navPlatformTransactionsDesc: "Suivi finance plateforme",
    navReports: "Rapports",
    navPlatformReportsDesc: "Rapports super admin",
    navComplaints: "Plaintes",
    navPlatformComplaintsDesc: "Tickets support et escalades",
    navNotifications: "Notifications",
    navNotificationsDesc: "SMS, email et in-app",
    navUsersRoles: "Utilisateurs et roles",
    navPlatformUsersDesc: "Acces administrateurs",
    navAuditLogs: "Journaux audit",
    navPlatformAuditDesc: "Piste audit plateforme lecture seule",
    navSystemSettings: "Parametres systeme",
    navPlatformSettingsDesc: "Configuration plateforme protegee",
    navSaccoDashboardDesc: "Vue operationnelle SACCO par role",
    navMembers: "Membres",
    navMembersDesc: "KYC, profils, releves",
    navSaccoTransactionsDesc: "Depots et annulations",
    navSavings: "Epargne",
    navSavingsDesc: "Produits, comptes et releves",
    navShares: "Parts",
    navSharesDesc: "Registre parts et certificats",
    navWelfare: "Solidarite",
    navWelfareDesc: "Contributions, soldes et demandes",
    navLoans: "Prets",
    navLoansDesc: "Demandes et remboursements",
    navGuarantors: "Garants",
    navGuarantorsDesc: "Demandes et obligations de garantie",
    navApprovals: "Approbations",
    navApprovalsDesc: "Decisions maker-checker",
    navAccounting: "Comptabilite",
    navAccountingDesc: "Balance, journaux et rapports",
    navReconciliation: "Rapprochement",
    navReconciliationDesc: "Banque et mobile money",
    navSaccoReportsDesc: "Rapports operationnels et financiers",
    navGovernance: "Gouvernance",
    navGovernanceDesc: "Reunions, minutes et resolutions",
    navSaccoComplaintsDesc: "Cas membres et support",
    navSaccoUsersDesc: "Acces personnel SACCO",
    navSettings: "Parametres",
    navSettingsDesc: "Produits, agences et controles",
    navSaccoAuditDesc: "Activite sensible lecture seule",
    navHome: "Accueil",
    navHomeDesc: "Soldes, prochain paiement et alertes",
    navMyAccounts: "Mes comptes",
    navMyAccountsDesc: "Epargne, parts et solidarite",
    navMemberLoansDesc: "Prets actifs et demandes",
    navGuarantorRequests: "Demandes garant",
    navGuarantorRequestsDesc: "Accepter ou refuser",
    navPayments: "Paiements",
    navPaymentsDesc: "Deposer, rembourser, parts, solidarite",
    navStatements: "Releves",
    navStatementsDesc: "Telecharger PDF, Excel ou imprimer",
    navReceipts: "Recus",
    navReceiptsDesc: "Recus transactions publiees",
    navMemberNotificationsDesc: "Messages et alertes",
    navMemberComplaintsDesc: "Brouillon, soumettre et suivre",
    navProfile: "Profil",
    navProfileDesc: "Details personnels et KYC",
    navSecurityDesc: "Mot de passe et appareils",
    home: "Accueil",
    search: "Recherche",
    searchPlaceholder: "Rechercher dossiers, membres, SACCOs",
    logout: "Deconnexion",
    exportSummary: "Exporter resume",
    searchThisTable: "Rechercher dans ce tableau",
    rowsPerPage: "Lignes par page",
    clearSearch: "Effacer recherche",
    shown: "affiches",
    records: "enregistrement(s)",
    showingRange: "Affichage",
    noRowsToShow: "Aucune ligne a afficher",
    page: "Page",
    of: "sur",
    previous: "Precedent",
    next: "Suivant",
    actions: "Actions",
    noRecordsFound: "Aucun enregistrement trouve",
    noRecordsFoundCopy: "Actualisez, ajustez les filtres ou ajoutez le premier enregistrement si votre role le permet.",
    dashboardOnly: "Tableau seulement",
    none: "Aucun",
    record: "Enregistrement",
    noRecordsYet: "Aucun enregistrement",
    refreshToTryAgain: "Actualisez la page pour reessayer.",
    empty: "Vide",
    loadingCopy: "Veuillez patienter pendant que Tereka Online prepare votre espace.",
    online: "En ligne",
    offlineMode: "Mode hors ligne",
    offlineNoticeTitle: "Vous etes hors ligne.",
    offlineNoticeCopy: "Vous pouvez consulter les ecrans en cache et garder les brouillons membre. Actualisation, sync et publication exigent la connexion.",
    backOnlineNotice: "Connexion retablie",
    offlineActionBlocked: "Cette action exige internet. Reconnectez-vous, puis reessayez.",
    refreshUnavailableOffline: "Actualisation indisponible hors ligne",
    passwordRecovery: "Recuperation du mot de passe"
  }
};

const demoAccounts = [
  { label: "Platform Super Admin", code: "PLATFORM", username: "admin@platform.local", password: "Admin@12345", portal: "Platform" },
  { label: "Platform Operations", code: "PLATFORM", username: "operations@platform.local", password: "Operations@12345", portal: "Platform" },
  { label: "Platform Billing", code: "PLATFORM", username: "billing@platform.local", password: "Billing@12345", portal: "Platform" },
  { label: "Platform Compliance", code: "PLATFORM", username: "compliance@platform.local", password: "Compliance@12345", portal: "Platform" },
  { label: "Platform Support", code: "PLATFORM", username: "support@platform.local", password: "Support@12345", portal: "Platform" },
  { label: "SACCO Admin", code: "GVS", username: "admin@greenvalley.local", password: "Sacco@12345", portal: "SACCO" },
  { label: "Treasurer", code: "GVS", username: "treasurer@greenvalley.local", password: "Treasurer@12345", portal: "SACCO" },
  { label: "Secretary", code: "GVS", username: "secretary@greenvalley.local", password: "Secretary@12345", portal: "SACCO" },
  { label: "Chairperson", code: "GVS", username: "chairperson@greenvalley.local", password: "Chair@12345", portal: "SACCO" },
  { label: "Member", code: "GVS", username: "GVS-0001", password: "Member@12345", portal: "Member" }
];

const state = {
  auth: "none",
  authTab: "login",
  locale: localStorage.getItem(LOCALE_KEY) || "en-UG",
  networkOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  runtime: {
    demoLoginsEnabled: false,
    healthChecked: false
  },
  token: "",
  user: null,
  member: null,
  tenant: null,
  roleNames: [],
  permissionIds: [],
  currentView: "dashboard",
  search: "",
  quickSearchActiveId: "",
  sessionMenuOpen: false,
  helpMenuOpen: false,
  accountMenuOpen: false,
  tableState: {},
  moduleTabs: {},
  sessionExpiresAt: "",
  loading: false,
  lastSync: "",
  lastError: "",
  passwordResetMessage: "",
  passwordResetError: "",
  passwordResetToken: "",
  passwordResetExpiresAt: "",
  passwordResetConfirmMessage: "",
  passwordResetConfirmError: "",
  mfaChallengeId: "",
  mfaDeliveryChannel: "",
  mfaDemoCode: "",
  mfaExpiresAt: "",
  mfaMessage: "",
  mfaError: "",
  userFormMessage: "",
  userFormError: "",
  selectedUserId: "",
  selectedUserRoles: [],
  selectedUserSessions: [],
  selectedUserPasswordResets: [],
  selectedUserResetToken: "",
  selectedUserResetExpiresAt: "",
  selectedUserLoading: false,
  selectedUserMessage: "",
  selectedUserError: "",
  userAdminTab: "add",
  selectedTenantId: "",
  selectedTenant: null,
  selectedTenantProfile: null,
  selectedTenantMessage: "",
  selectedTenantError: "",
  tenantFormMessage: "",
  tenantFormError: "",
  saccoRegistrationTab: "platform",
  publicRegistrationMessage: "",
  publicRegistrationError: "",
  selectedSubscriptionId: "",
  selectedSubscriptionMessage: "",
  selectedSubscriptionError: "",
  selectedPackageId: "",
  selectedPackageMessage: "",
  selectedPackageError: "",
  selectedPaymentRequestId: "",
  paymentRequestStatusReason: "",
  paymentRequestStatusMessage: "",
  paymentRequestStatusError: "",
  platformPolicyMessage: "",
  platformPolicyError: "",
  memberFormMessage: "",
  memberFormError: "",
  memberTab: "overview",
  selectedMemberId: "",
  selectedMember: null,
  selectedMemberStatement: null,
  selectedMemberNextOfKin: [],
  selectedMemberBeneficiaries: [],
  selectedMemberDocuments: [],
  selectedMemberMessage: "",
  selectedMemberError: "",
  selectedMonthlyPerformanceId: "",
  transactionFormMessage: "",
  transactionFormError: "",
  selectedTransactionId: "",
  selectedTransactionReceipt: null,
  selectedTransactionMessage: "",
  selectedTransactionError: "",
  loanFormMessage: "",
  loanFormError: "",
  selectedLoanId: "",
  selectedLoanGuarantors: [],
  selectedLoanRepayments: [],
  selectedLoanSchedule: [],
  selectedLoanMessage: "",
  selectedLoanError: "",
  complaintFormMessage: "",
  complaintFormError: "",
  selectedComplaintId: "",
  selectedComplaintMessage: "",
  selectedComplaintError: "",
  notificationTemplateMessage: "",
  notificationTemplateError: "",
  notificationMessage: "",
  notificationError: "",
  notificationProviderStatus: [],
  notificationProviderStatusCheckedAt: "",
  notificationFilters: {
    status: "all",
    channel: "all",
    provider: "all",
    tenantId: "all",
    date: ""
  },
  selectedTemplateId: "",
  selectedTemplateMessage: "",
  selectedTemplateError: "",
  branchFormMessage: "",
  branchFormError: "",
  productFormMessage: "",
  productFormError: "",
  saccoSettingsTab: "overview",
  accountFormMessage: "",
  accountFormError: "",
  memberLoanMessage: "",
  memberLoanError: "",
  memberPaymentMessage: "",
  memberPaymentError: "",
  memberComplaintMessage: "",
  memberComplaintError: "",
  memberNotificationMessage: "",
  memberNotificationError: "",
  memberGuarantorMessage: "",
  memberGuarantorError: "",
  welfareClaimMessage: "",
  welfareClaimError: "",
  selectedWelfareClaimId: "",
  selectedWelfareClaimMessage: "",
  selectedWelfareClaimError: "",
  expenseFormMessage: "",
  expenseFormError: "",
  assetFormMessage: "",
  assetFormError: "",
  governanceMeetingMessage: "",
  governanceMeetingError: "",
  selectedMeetingId: "",
  selectedMeetingMessage: "",
  selectedMeetingError: "",
  data: emptyData(),
  memberData: emptyMemberData()
};

const platformModules = [
  ["dashboard", "Dashboard", "Platform performance and alerts", "dashboard:view", ["super", "operations", "billing", "compliance", "support"]],
  ["sacco-applications", "SACCO Registration", "Applications and approvals", "tenants:view", ["super", "operations", "billing", "compliance", "support"]],
  ["subscriptions", "Subscriptions", "Packages and renewals", "subscriptions:view", ["super", "billing"]],
  ["sacco-accounts", "SACCO Accounts", "SACCO account health", "tenants:view", ["super", "billing", "compliance"]],
  ["transactions", "Transactions", "Platform finance monitoring", "transactions:view", ["super"]],
  ["reports", "Reports", "Super admin reporting", "reports:view", ["super"]],
  ["complaints", "Complaints", "Support tickets and escalations", "complaints:view", ["super", "operations", "support"]],
  ["notifications", "Notifications", "SMS, email and in-app", "notifications:view", ["super", "operations"]],
  ["users", "Users and Roles", "Administrator access", "roles:view", ["super"]],
  ["audit", "Audit Logs", "Read-only platform audit trail", "reports:view", ["super", "compliance"]],
  ["settings", "System Settings", "Protected platform configuration", "roles:create", ["super"]]
];

const saccoModules = [
  ["dashboard", "Dashboard", "Role-specific SACCO operating view", "dashboard:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "teller", "auditor"]],
  ["members", "Members", "KYC, profiles, statements", "members:view", ["admin", "chairperson", "secretary", "loans", "auditor"]],
  ["transactions", "Transactions", "Deposits and reversals", "transactions:view", ["admin", "treasurer", "accountant", "teller", "auditor"]],
  ["savings", "Savings", "Products, accounts and statements", "transactions:view", ["admin", "treasurer", "accountant", "auditor"]],
  ["shares", "Shares", "Share register and certificates", "transactions:view", ["admin", "treasurer", "secretary", "auditor"]],
  ["welfare", "Welfare", "Contributions, balances and claims", "transactions:view", ["admin", "treasurer", "secretary"]],
  ["loans", "Loans", "Applications and repayments", "loans:view", ["admin", "chairperson", "loans", "auditor"]],
  ["guarantors", "Guarantors", "Guarantee requests and obligations", "loans:view", ["admin", "chairperson", "loans"]],
  ["approvals", "Approvals", "Maker-checker decisions", "approvals:view", ["admin", "chairperson", "treasurer", "secretary", "loans"]],
  ["accounting", "Accounting", "Trial balance, journals and reports", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reconciliation", "Reconciliation", "Bank and mobile money", "transactions:view", ["admin", "treasurer", "accountant"]],
  ["reports", "Reports", "Operational and financial reporting", "reports:view", ["admin", "chairperson", "treasurer", "secretary", "loans", "accountant", "auditor"]],
  ["governance", "Governance", "Meetings, minutes and resolutions", "governance:view", ["admin", "chairperson", "secretary"]],
  ["complaints", "Complaints", "Member cases and support", "complaints:view", ["admin", "secretary"]],
  ["users", "Users and Roles", "SACCO staff access", "roles:view", ["admin"]],
  ["settings", "Settings", "Products, branches and controls", "roles:create", ["admin"]],
  ["audit", "Audit Logs", "Read-only sensitive activity", "reports:view", ["admin", "auditor"]]
];

const memberModules = [
  ["home", "Home", "Balances, next repayment and alerts"],
  ["accounts", "My Accounts", "Savings, shares and welfare"],
  ["loans", "Loans", "Active loans and applications"],
  ["guarantor-requests", "Guarantor Requests", "Accept or reject requests"],
  ["payments", "Payments", "Deposit, repay, shares, welfare"],
  ["statements", "Statements", "Download PDF, Excel or print"],
  ["receipts", "Receipts", "Posted transaction receipts"],
  ["notifications", "Notifications", "Messages and alerts"],
  ["complaints", "Complaints", "Draft, submit and track cases"],
  ["profile", "Profile", "Personal details and KYC"],
  ["security", "Security", "Password and device settings"]
];

function emptyData() {
  return {
    tenants: [],
    subscriptions: [],
    subscriptionPackages: [],
    members: [],
    transactions: [],
    loans: [],
    operations: null,
    notifications: [],
    complaints: [],
    users: [],
    branches: [],
    financialProducts: [],
    financialAccounts: [],
    welfareClaims: [],
    accountingPeriods: [],
    chartOfAccounts: [],
    journalEntries: [],
    suppliers: [],
    expenses: [],
    assets: [],
    governanceMeetings: [],
    statementLines: [],
    reconciliation: null,
    mobileMoneyCallbacks: [],
    notificationTemplates: [],
    roles: [],
    permissions: [],
    auditEvents: [],
    regulatoryReport: null,
    securitySummary: null,
    platformSecurityPolicy: null,
    notificationIntegrationConfig: null
  };
}

function emptyMemberData() {
  return {
    balances: null,
    dashboard: null,
    loans: [],
    notifications: [],
    pendingGuarantors: [],
    complaints: [],
    drafts: [],
    sessionExpiresAt: ""
  };
}

function app() {
  return document.getElementById("app");
}

function setHtml(markup) {
  const focusState = captureFocusState();
  applyRegionalDocumentSettings();
  app().innerHTML = markup;
  bindEvents();
  restoreFocusState(focusState);
}

function captureFocusState() {
  const element = document.activeElement;
  if (!element || !["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return null;
  const selector = element.id
    ? `#${CSS.escape(element.id)}`
    : element.dataset.tableSearch
      ? `[data-table-search="${CSS.escape(element.dataset.tableSearch)}"]`
      : element.dataset.notificationFilter
        ? `[data-notification-filter="${CSS.escape(element.dataset.notificationFilter)}"]`
      : element.dataset.searchInput !== undefined
        ? "[data-search-input]"
        : null;
  if (!selector) return null;
  return {
    selector,
    start: typeof element.selectionStart === "number" ? element.selectionStart : null,
    end: typeof element.selectionEnd === "number" ? element.selectionEnd : null
  };
}

function restoreFocusState(focusState) {
  if (!focusState) return;
  const element = document.querySelector(focusState.selector);
  if (!element) return;
  element.focus({ preventScroll: true });
  if (typeof element.setSelectionRange === "function" && focusState.start !== null && focusState.end !== null) {
    element.setSelectionRange(focusState.start, focusState.end);
  }
}

function hasPermission(permission) {
  if (!permission) return true;
  if (permission === "dashboard:view") return true;
  if (state.roleNames.join(" ").toLowerCase().includes("super admin")) return true;
  if (isPlatform() && roleKind() === "super") return true;
  return state.permissionIds.includes(permission);
}

function roleKind() {
  const roles = state.roleNames.join(" ").toLowerCase();
  if (state.auth === "member") return "member";
  if (state.user?.tenantId === "tenant_platform") {
    if (roles.includes("billing")) return "billing";
    if (roles.includes("compliance")) return "compliance";
    if (roles.includes("support")) return "support";
    if (roles.includes("operations")) return "operations";
    return "super";
  }
  if (roles.includes("chairperson")) return "chairperson";
  if (roles.includes("treasurer")) return "treasurer";
  if (roles.includes("secretary")) return "secretary";
  if (roles.includes("loan")) return "loans";
  if (roles.includes("accountant")) return "accountant";
  if (roles.includes("teller") || roles.includes("cashier")) return "teller";
  if (roles.includes("auditor")) return "auditor";
  return "admin";
}

function isPlatform() {
  return state.auth === "staff" && state.user?.tenantId === "tenant_platform";
}

function visibleModules() {
  if (state.auth === "member") return memberModules.map(localizeModule);
  const kind = roleKind();
  const source = isPlatform() ? platformModules : saccoModules;
  return source.filter((item) => item[4].includes(kind) && hasPermission(item[3])).map(localizeModule);
}

function localizeModule(item) {
  const [id, label, description, permission, roles] = item;
  const scope = state.auth === "member" ? "member" : isPlatform() ? "platform" : "sacco";
  const titleKeys = {
    platform: {
      dashboard: "navDashboard",
      "sacco-applications": "navSaccoRegistration",
      subscriptions: "navSubscriptions",
      "sacco-accounts": "navSaccoAccounts",
      transactions: "navTransactions",
      reports: "navReports",
      complaints: "navComplaints",
      notifications: "navNotifications",
      users: "navUsersRoles",
      audit: "navAuditLogs",
      settings: "navSystemSettings"
    },
    sacco: {
      dashboard: "navDashboard",
      members: "navMembers",
      transactions: "navTransactions",
      savings: "navSavings",
      shares: "navShares",
      welfare: "navWelfare",
      loans: "navLoans",
      guarantors: "navGuarantors",
      approvals: "navApprovals",
      accounting: "navAccounting",
      reconciliation: "navReconciliation",
      reports: "navReports",
      governance: "navGovernance",
      complaints: "navComplaints",
      users: "navUsersRoles",
      settings: "navSettings",
      audit: "navAuditLogs"
    },
    member: {
      home: "navHome",
      accounts: "navMyAccounts",
      loans: "navLoans",
      "guarantor-requests": "navGuarantorRequests",
      payments: "navPayments",
      statements: "navStatements",
      receipts: "navReceipts",
      notifications: "navNotifications",
      complaints: "navComplaints",
      profile: "navProfile",
      security: "security"
    }
  };
  const descriptionKeys = {
    platform: {
      dashboard: "navDashboardPlatformDesc",
      "sacco-applications": "navSaccoRegistrationDesc",
      subscriptions: "navSubscriptionsDesc",
      "sacco-accounts": "navSaccoAccountsDesc",
      transactions: "navPlatformTransactionsDesc",
      reports: "navPlatformReportsDesc",
      complaints: "navPlatformComplaintsDesc",
      notifications: "navNotificationsDesc",
      users: "navPlatformUsersDesc",
      audit: "navPlatformAuditDesc",
      settings: "navPlatformSettingsDesc"
    },
    sacco: {
      dashboard: "navSaccoDashboardDesc",
      members: "navMembersDesc",
      transactions: "navSaccoTransactionsDesc",
      savings: "navSavingsDesc",
      shares: "navSharesDesc",
      welfare: "navWelfareDesc",
      loans: "navLoansDesc",
      guarantors: "navGuarantorsDesc",
      approvals: "navApprovalsDesc",
      accounting: "navAccountingDesc",
      reconciliation: "navReconciliationDesc",
      reports: "navSaccoReportsDesc",
      governance: "navGovernanceDesc",
      complaints: "navSaccoComplaintsDesc",
      users: "navSaccoUsersDesc",
      settings: "navSettingsDesc",
      audit: "navSaccoAuditDesc"
    },
    member: {
      home: "navHomeDesc",
      accounts: "navMyAccountsDesc",
      loans: "navMemberLoansDesc",
      "guarantor-requests": "navGuarantorRequestsDesc",
      payments: "navPaymentsDesc",
      statements: "navStatementsDesc",
      receipts: "navReceiptsDesc",
      notifications: "navMemberNotificationsDesc",
      complaints: "navMemberComplaintsDesc",
      profile: "navProfileDesc",
      security: "navSecurityDesc"
    }
  };
  return [
    id,
    titleKeys[scope]?.[id] ? t(titleKeys[scope][id]) : label,
    descriptionKeys[scope]?.[id] ? t(descriptionKeys[scope][id]) : description,
    permission,
    roles
  ];
}

function canAccessView(view) {
  return visibleModules().some((item) => item[0] === view);
}

function currentModule() {
  return visibleModules().find((item) => item[0] === state.currentView) || visibleModules()[0];
}

async function init() {
  applyRegionalDocumentSettings();
  bindNetworkStatusEvents();
  await loadRuntimeMetadata();
  state.token = localStorage.getItem(STAFF_TOKEN_KEY) || "";
  const memberToken = localStorage.getItem(MEMBER_TOKEN_KEY) || "";
  if (state.token) {
    restoreStaff();
  } else if (memberToken) {
    state.token = memberToken;
    restoreMember();
  } else {
    renderLogin();
  }
}

async function loadRuntimeMetadata() {
  try {
    const health = await api("/health", {}, "");
    state.runtime = {
      ...state.runtime,
      demoLoginsEnabled: health.demoLoginsEnabled === true,
      healthChecked: true
    };
  } catch {
    state.runtime = {
      ...state.runtime,
      demoLoginsEnabled: false,
      healthChecked: true
    };
  }
}

function demoToolsEnabled() {
  return DEMO_TOOLS_REQUESTED && state.runtime.demoLoginsEnabled === true;
}

function bindNetworkStatusEvents() {
  window.addEventListener("online", () => {
    state.networkOnline = true;
    if (state.auth !== "none") renderShell();
  });
  window.addEventListener("offline", () => {
    state.networkOnline = false;
    if (state.auth !== "none") renderShell();
  });
}

async function restoreStaff() {
  state.auth = "staff";
  renderLoading("Restoring staff session");
  try {
    const session = await api("/auth/me");
    applyStaffSession(session);
    await refreshAll();
  } catch {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    state.auth = "none";
    state.token = "";
    renderLogin();
  }
}

async function restoreMember() {
  state.auth = "member";
  renderLoading("Restoring member session");
  try {
    const session = await api("/member-auth/me");
    state.member = session.member;
    state.tenant = session.tenant;
    state.memberData.balances = session.balances;
    state.memberData.sessionExpiresAt = session.expiresAt || "";
    state.sessionExpiresAt = session.expiresAt || "";
    state.memberData.drafts = loadMemberDrafts(session.member);
    await refreshMember();
  } catch {
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    state.auth = "none";
    state.token = "";
    renderLogin();
  }
}

function renderLogin() {
  document.body.className = "login-page";
  setHtml(`
    <main class="login-layout">
      <section class="login-hero">
        <div class="login-hero-top">
          <div class="logo-lockup">
            ${logo("large")}
            <div>
              <p class="eyebrow">Tereka Online</p>
              <h1>${t("loginHeroTitle")}</h1>
            </div>
          </div>
          <div class="login-locale-row">
            <label class="sr-only" for="loginLocale">Language</label>
            <select id="loginLocale" class="locale-select" aria-label="Language">
              ${supportedLocales.map((locale) => `<option value="${escapeHtml(locale.code)}" ${locale.code === state.locale ? "selected" : ""}>${escapeHtml(locale.label)}</option>`).join("")}
            </select>
            <span class="environment-pill">${t("securePortal")}</span>
          </div>
        </div>
        <p class="hero-copy">${t("loginHeroCopy")}</p>
        <div class="portal-route-grid">
          ${portalRouteCard(t("platformAdmin"), "PLATFORM", t("platformAdminCopy"))}
          ${portalRouteCard(t("saccoStaff"), t("saccoCode"), t("saccoStaffCopy"))}
          ${portalRouteCard(t("member"), t("membershipNo"), t("memberCopy"))}
        </div>
        <div class="trust-list">
          <span>${t("trustAccess")}</span>
          <span>${t("trustApprovals")}</span>
          <span>${t("trustPayments")}</span>
          <span>${t("trustLowBandwidth")}</span>
        </div>
        <div class="login-links">
          ${authTabButton("login", t("login"))}
          ${authTabButton("register", t("registerSacco"))}
          ${authTabButton("forgot", t("forgotPassword"))}
          ${authTabButton("support", t("support"))}
        </div>
      </section>
      <section class="login-card">
        ${authPanelContent()}
        ${demoToolsEnabled() ? `<section class="demo-panel">
          <div>
            <strong>${t("demoAccess")}</strong>
            <span>${t("demoAccessCopy")}</span>
          </div>
          <div class="demo-picker">
            <select id="demoAccountSelect">
              ${demoAccounts.map((account, index) => `<option value="${index}">${account.label} - ${account.portal}</option>`).join("")}
            </select>
            <button class="button secondary" type="button" data-action="fill-demo">${t("fillDemo")}</button>
          </div>
        </section>` : ""}
        <section class="login-assurance">
          <div><strong>${t("protectedSession")}</strong><span>${t("protectedSessionCopy")}</span></div>
          <div><strong>${t("correctPortal")}</strong><span>${t("correctPortalCopy")}</span></div>
          <div><strong>${t("productionReady")}</strong><span>${t("productionReadyCopy")}</span></div>
        </section>
        <div class="login-footer-links">
          <button type="button">${t("privacyPolicy")}</button>
          <button type="button">${t("terms")}</button>
          <button type="button">${t("maintenanceNotices")}</button>
        </div>
      </section>
    </main>
  `);
}

function authTabButton(tab, label) {
  return `<button class="${state.authTab === tab ? "active" : ""}" type="button" data-auth-tab="${tab}">${label}</button>`;
}

function portalRouteCard(title, code, copy) {
  return `
    <article class="portal-route-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(code)}</span>
      <p>${escapeHtml(copy)}</p>
    </article>
  `;
}

function authPanelContent() {
  if (state.mfaChallengeId) return mfaVerificationPanel();
  if (state.authTab === "register") return publicSaccoRegistrationPanel();
  if (state.authTab === "forgot") return passwordRecoveryPanel();
  if (state.authTab === "support") return authInfoPanel("Support", "For onboarding, payment, login or member-access support, share your SACCO code, role, phone number and the error shown on this screen.", "Open support request");
  return loginPanel();
}

function mfaVerificationPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">Step-up verification</p>
      <h2>Verify secure login</h2>
      <p>This staff account requires a second verification code before the portal opens.</p>
    </div>
    <section class="support-checklist">
      <div><strong>1</strong><span>Enter the verification code from ${escapeHtml(labelize(state.mfaDeliveryChannel || "verification channel"))}.</span></div>
      <div><strong>2</strong><span>The challenge expires ${state.mfaExpiresAt ? escapeHtml(formatDateTime(state.mfaExpiresAt)) : "soon"}.</span></div>
      <div><strong>3</strong><span>Successful verification creates the staff session and records an audit event.</span></div>
    </section>
    ${state.mfaDemoCode ? `<div class="notice compact"><strong>Development MFA code</strong><span>${escapeHtml(state.mfaDemoCode)}</span></div>` : ""}
    ${state.mfaMessage ? `<div class="notice compact"><strong>${escapeHtml(state.mfaMessage)}</strong></div>` : ""}
    ${state.mfaError ? `<div class="notice warning"><strong>MFA verification failed.</strong><span>${escapeHtml(state.mfaError)}</span></div>` : ""}
    <form id="mfaVerifyForm" class="form-grid single">
      <label><span>Verification code</span><input id="mfaCode" required inputmode="numeric" maxlength="6" placeholder="6-digit code" autocomplete="one-time-code"></label>
      <button id="mfaVerifyButton" class="button primary" type="submit">Verify and continue</button>
    </form>
    <button class="button ghost" type="button" data-action="cancel-mfa">Cancel login</button>
  `;
}

function loginPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">${t("secureAccess")}</p>
      <h2>${t("loginTitle")}</h2>
      <p>${t("loginCopy")}</p>
    </div>
    ${state.lastError ? `<div class="alert error">${escapeHtml(state.lastError)}</div>` : ""}
    <div class="login-context-strip">
      <div><span>${t("platformCode")}</span><strong>PLATFORM</strong></div>
      <div><span>${t("saccoCode")}</span><strong>${t("saccoCodeExample")}</strong></div>
      <div><span>${t("memberLogin")}</span><strong>${t("memberLoginCopy")}</strong></div>
    </div>
    <form id="loginForm" class="form-grid single">
      ${field(t("code"), "code", "text", t("codePlaceholder"), t("codeHelp"))}
      ${field(t("usernameLabel"), "username", "text", t("usernameLabel"), t("usernameHelp"))}
      <label>
        <span>${t("password")}</span>
        <div class="password-row">
          <input id="password" type="password" placeholder="${escapeHtml(t("enterPassword"))}" autocomplete="current-password" required>
          <button type="button" data-action="toggle-password">${t("show")}</button>
        </div>
      </label>
      <label class="check-row"><input id="remember" type="checkbox" checked> <span>${t("rememberDevice")}</span></label>
      <div id="loginError" class="alert error" hidden></div>
      <button id="loginButton" class="button primary" type="submit">${t("loginSecurely")}</button>
    </form>
  `;
}

function publicSaccoRegistrationPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">${t("selfRegistration")}</p>
      <h2>${t("registerSacco")}</h2>
      <p>${t("registerSaccoCopy")}</p>
    </div>
    ${state.publicRegistrationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.publicRegistrationMessage)}</strong></div>` : ""}
    ${state.publicRegistrationError ? `<div class="notice warning"><strong>${t("registrationFailed")}</strong><span>${escapeHtml(state.publicRegistrationError)}</span></div>` : ""}
    <form id="publicSaccoRegistrationForm" class="form-grid">
      <label><span>${t("saccoName")}</span><input id="publicTenantName" required placeholder="e.g. Tereka Farmers SACCO"></label>
      <label><span>${t("saccoCode")}</span><input id="publicTenantCode" readonly placeholder="${escapeHtml(t("saccoCodeGenerated"))}"></label>
      <label><span>${t("registrationNumber")}</span><input id="publicTenantRegistrationNo" required placeholder="${escapeHtml(t("registrationNumberPlaceholder"))}"></label>
      <label><span>Country</span><select id="publicTenantCountry">${countryRegionOptions("uganda")}</select></label>
      <label><span>Currency</span><input id="publicTenantCurrencyCode" readonly value="UGX"></label>
      <label><span>${t("district")}</span><input id="publicTenantDistrict" required></label>
      <label><span>${t("parish")}</span><input id="publicTenantParish" required></label>
      <label><span>${t("village")}</span><input id="publicTenantVillage" required></label>
      <label><span>${t("contactNumber")}</span><input id="publicTenantContactNumber" required placeholder="+256..."></label>
      <label><span>${t("memberRange")}</span><select id="publicTenantMemberRange">${memberRangeOptions()}</select></label>
      <label class="wide"><span>${t("mobileMoneyNumber")}</span><input id="publicTenantPaymentPhone" required placeholder="+256..."></label>
      <div class="mini-fact wide">
        <span>${t("paymentStep")}</span>
        <strong>${t("paymentStepCopy")}</strong>
      </div>
      <button class="button primary wide" type="submit">${t("submitAndPay")}</button>
    </form>
  `;
}

function passwordRecoveryPanel() {
  return `
    <div class="form-heading">
      <p class="eyebrow">Account recovery</p>
      <h2>Password recovery</h2>
      <p>Platform and SACCO staff can request a reset by email. SACCO members should contact their SACCO administrator for member-password reset.</p>
    </div>
    <section class="support-checklist">
      <div><strong>1</strong><span>Enter the staff email registered on Tereka Online.</span></div>
      <div><strong>2</strong><span>If the user exists and is active, a reset request is recorded without exposing whether the email exists.</span></div>
      <div><strong>3</strong><span>After reset, active staff sessions are revoked for safety.</span></div>
    </section>
    ${state.passwordResetMessage ? `<div class="notice compact"><strong>${escapeHtml(state.passwordResetMessage)}</strong>${state.passwordResetExpiresAt ? `<span>Expires ${escapeHtml(formatDateTime(state.passwordResetExpiresAt))}</span>` : ""}</div>` : ""}
    ${state.passwordResetError ? `<div class="notice warning"><strong>Password reset request failed.</strong><span>${escapeHtml(state.passwordResetError)}</span></div>` : ""}
    <form id="passwordResetRequestForm" class="form-grid single">
      <label><span>Staff email</span><input id="passwordResetEmail" type="email" required placeholder="name@sacco.org"></label>
      <button class="button primary" type="submit">Request password reset</button>
    </form>
    ${state.passwordResetToken ? `
      <section class="demo-panel">
        <div>
          <strong>Development reset token</strong>
          <span>This token is shown only when demo logins are enabled.</span>
        </div>
        <code class="token-box">${escapeHtml(state.passwordResetToken)}</code>
      </section>
      ${state.passwordResetConfirmMessage ? `<div class="notice compact"><strong>${escapeHtml(state.passwordResetConfirmMessage)}</strong></div>` : ""}
      ${state.passwordResetConfirmError ? `<div class="notice warning"><strong>Password reset failed.</strong><span>${escapeHtml(state.passwordResetConfirmError)}</span></div>` : ""}
      <form id="passwordResetConfirmForm" class="form-grid single">
        <label><span>Reset token</span><input id="passwordResetToken" required value="${escapeHtml(state.passwordResetToken)}"></label>
        <label><span>New password</span><input id="passwordResetNewPassword" type="password" required minlength="10" placeholder="At least 10 characters"></label>
        <button class="button secondary" type="submit">Set new password</button>
      </form>
    ` : ""}
    <button class="button ghost" type="button" data-auth-tab="login">Back to login</button>
  `;
}

function authInfoPanel(title, copy, action = "Back to login") {
  return `
    <div class="form-heading">
      <p class="eyebrow">Tereka Online</p>
      <h2>${title}</h2>
      <p>${copy}</p>
    </div>
    <section class="support-checklist">
      <div><strong>1</strong><span>Confirm the SACCO code or PLATFORM code.</span></div>
      <div><strong>2</strong><span>Confirm username, email, phone or membership number.</span></div>
      <div><strong>3</strong><span>Authorized admin verifies identity before reset or support action.</span></div>
    </section>
    <button class="button primary" type="button" data-auth-tab="login">${escapeHtml(action)}</button>
  `;
}

function renderShell() {
  document.body.className = "";
  const module = currentModule();
  const modules = visibleModules();
  const portal = state.auth === "member" ? t("memberSelfServicePortal") : isPlatform() ? t("platformAdministrationPortal") : t("saccoAdministrationPortal");
  const notificationButton = topbarNotificationButton(modules);
  const quickResults = quickSearchResults();
  const sessionMenu = sessionSecurityMenu();
  const helpMenu = helpSupportMenu();
  const accountMenu = accountProfileMenu();
  setHtml(`
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-top">
          <div class="logo-lockup compact">${logo()}<div><strong>Tereka Online</strong><span>${portal}</span></div></div>
          <button class="icon-button menu-button" type="button" data-action="toggle-sidebar" aria-label="Toggle sidebar"><span class="menu-bars" aria-hidden="true"></span></button>
        </div>
        <div class="context-card">
          <small>${state.auth === "member" ? "SACCO" : isPlatform() ? "Context" : "SACCO"}</small>
          <strong>${contextName()}</strong>
          <span>${roleLabel()}</span>
        </div>
        <nav class="nav-list">
          ${modules.map((item) => `
            <button class="nav-link ${item[0] === module[0] ? "active" : ""}" type="button" data-view="${item[0]}">
              <span>${item[1]}</span><small>${item[2]}</small>
            </button>
          `).join("")}
        </nav>
        <button class="logout-button" type="button" data-action="logout">${t("logout")}</button>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="icon-button mobile-only menu-button" type="button" data-action="toggle-sidebar" aria-label="Open menu"><span class="menu-bars" aria-hidden="true"></span></button>
          <div class="breadcrumbs">${t("home")} / ${portal} / <strong>${module[1]}</strong></div>
          <div class="topbar-actions">
            <label class="topbar-locale">
              <span class="sr-only">Language</span>
              <select id="shellLocale" aria-label="Language">
                ${supportedLocales.map((locale) => `<option value="${escapeHtml(locale.code)}" ${state.locale === locale.code ? "selected" : ""}>${escapeHtml(locale.label)}</option>`).join("")}
              </select>
            </label>
            ${networkStatusChip()}
            <div class="quick-search">
              <label class="search-box"><span>${t("search")}</span><input id="globalSearch" value="${escapeHtml(state.search)}" placeholder="${t("searchPlaceholder")}" autocomplete="off" aria-autocomplete="list" aria-controls="quickSearchResults"></label>
              ${quickSearchPanel(quickResults)}
            </div>
            <div class="session-control">
              <button class="session-chip ${sessionStatusClass()}" type="button" data-action="toggle-session-menu" aria-expanded="${state.sessionMenuOpen ? "true" : "false"}">${sessionTimeLabel()}</button>
              ${sessionMenu}
            </div>
            ${notificationButton}
            <div class="help-control">
              <button class="icon-button" type="button" title="Help" data-action="toggle-help-menu" aria-expanded="${state.helpMenuOpen ? "true" : "false"}">?</button>
              ${helpMenu}
            </div>
            <div class="account-control">
              <button class="profile-chip" type="button" title="Account" data-action="toggle-account-menu" aria-expanded="${state.accountMenuOpen ? "true" : "false"}">${initials(displayName())}</button>
              ${accountMenu}
            </div>
          </div>
        </header>
        <section class="page-header">
          <div>
            <p class="eyebrow">${portal}</p>
            <h1>${module[1]}</h1>
            <p>${module[2]}</p>
          </div>
          <div class="page-actions">
            ${state.auth === "member" ? `<button class="button secondary" data-action="refresh-member" type="button" ${state.networkOnline ? "" : "disabled"} title="${state.networkOnline ? "" : t("refreshUnavailableOffline")}">${t("refresh")}</button>` : `<button class="button secondary" data-action="refresh" type="button" ${state.networkOnline ? "" : "disabled"} title="${state.networkOnline ? "" : t("refreshUnavailableOffline")}">${t("refresh")}</button>`}
            <button class="button ghost" type="button">${t("exportSummary")}</button>
          </div>
        </section>
        <section class="content-area">
          ${runtimeNotice()}
          ${renderView(module[0])}
        </section>
        <footer class="footer">Tereka Online</footer>
      </main>
    </div>
  `);
}

function quickSearchPanel(results) {
  if (!state.search.trim()) return "";
  const grouped = results.reduce((groups, result) => {
    groups[result.group] = [...(groups[result.group] || []), result];
    return groups;
  }, {});
  return `
    <div class="quick-search-panel" id="quickSearchResults" role="listbox" aria-label="Quick search results">
      ${results.length ? Object.entries(grouped).map(([group, rows]) => `
        <div class="quick-search-group">
          <strong>${escapeHtml(group)}</strong>
          ${rows.map((result) => `
            <button class="${result.id === state.quickSearchActiveId ? "active" : ""}" type="button" role="option" aria-selected="${result.id === state.quickSearchActiveId ? "true" : "false"}" data-quick-result="${escapeHtml(result.id)}">
              <span>${escapeHtml(result.title)}</span>
              <small>${escapeHtml(result.meta)}</small>
            </button>
          `).join("")}
        </div>
      `).join("") : `<div class="quick-search-empty">No quick results. Tables below still filter by this search.</div>`}
    </div>
  `;
}

function networkStatusChip() {
  return `<span class="network-chip ${state.networkOnline ? "online" : "offline"}">${state.networkOnline ? t("online") : t("offlineMode")}</span>`;
}

function quickSearchResults() {
  const query = state.search.trim();
  if (query.length < 2) return [];
  const results = quickSearchIndex()
    .filter((result) => normal(`${result.group} ${result.title} ${result.meta}`).includes(normal(query)))
    .slice(0, 8);
  if (state.quickSearchActiveId && !results.some((result) => result.id === state.quickSearchActiveId)) {
    state.quickSearchActiveId = "";
  }
  return results;
}

function quickSearchIndex() {
  if (state.auth === "member") {
    return [
      ...state.memberData.loans.map((loan) => quickResult("Loans", loan.id, "loans", loan.applicationNo || loan.product || "Loan", `${loan.product || ""} ${money.format(loan.requestedAmount || loan.outstandingBalance || 0)} ${loan.status || ""}`)),
      ...state.memberData.notifications.map((notification) => quickResult("Notifications", notification.id, "notifications", notification.title || "Notification", `${notification.status || ""} ${formatDateTime(notification.createdAt)}`)),
      ...state.memberData.pendingGuarantors.map((request) => quickResult("Guarantor Requests", request.id, "guarantor-requests", request.loan?.applicationNo || request.borrower || "Guarantor request", `${request.status || ""} ${money.format(request.guaranteedAmount || 0)}`)),
      ...state.memberData.complaints.map((complaint) => quickResult("Complaints", complaint.id, "complaints", complaint.subject || complaint.category || "Complaint", `${complaint.status || ""} ${complaint.priority || ""}`))
    ];
  }
  const visible = new Set(visibleModules().map((module) => module[0]));
  const results = [];
  if (visible.has("sacco-applications")) {
    results.push(...tenantRows().map((tenant) => quickResult("SACCOs", tenant.id, "sacco-applications", tenant.name, `${tenant.saccoCode || tenant.abbreviation || ""} ${tenant.status || ""}`, { selectedTenantId: tenant.id, saccoRegistrationTab: "applications" })));
  }
  if (visible.has("subscriptions")) {
    results.push(...dataRows("subscriptions").map((subscription) => quickResult("Subscriptions", subscription.id, "subscriptions", subscription.tenantName || tenantName(subscription.tenantId), `${subscription.packageName || ""} ${subscription.status || ""}`, { selectedSubscriptionId: subscription.id })));
  }
  if (visible.has("members")) {
    results.push(...dataRows("members").map((member) => quickResult("Members", member.id, "members", member.fullName, `${member.membershipNo || ""} ${member.phone || ""}`, { selectedMemberId: member.id, memberTab: "kyc" })));
  }
  if (visible.has("transactions")) {
    results.push(...dataRows("transactions").map((transaction) => quickResult("Transactions", transaction.id, "transactions", transaction.reference || transaction.id, `${memberName(transaction.memberId)} ${money.format(transaction.amount || 0)} ${transaction.status || ""}`)));
  }
  if (visible.has("loans")) {
    results.push(...dataRows("loans").map((loan) => quickResult("Loans", loan.id, "loans", loan.applicationNo || loan.id, `${loan.memberName || memberName(loan.memberId)} ${money.format(loan.requestedAmount || loan.outstandingBalance || 0)} ${loan.status || ""}`, { selectedLoanId: loan.id, moduleTabView: "loans", moduleTab: "detail" })));
  }
  if (visible.has("users")) {
    results.push(...dataRows("users").map((user) => quickResult(isPlatform() ? "Platform Users" : "SACCO Users", user.id, "users", user.fullName || user.email, `${user.email || ""} ${user.status || ""}`, { selectedUserId: user.id, userAdminTab: "detail" })));
  }
  if (visible.has("complaints")) {
    results.push(...dataRows("complaints").map((complaint) => quickResult("Complaints", complaint.id, "complaints", complaint.subject || complaint.category || complaint.id, `${complaint.status || ""} ${complaint.priority || ""}`, { selectedComplaintId: complaint.id })));
  }
  return results;
}

function quickResult(group, recordId, view, title, meta, options = {}) {
  return {
    id: `${view}:${recordId}`,
    recordId,
    group,
    view,
    title: title || recordId || "Record",
    meta: meta || view,
    ...options
  };
}

function topbarNotificationButton(modules) {
  const canOpen = modules.some((item) => item[0] === "notifications");
  const unreadCount = unreadNotificationCount();
  const countLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const title = unreadCount ? `${countLabel} unread notification${unreadCount === 1 ? "" : "s"}` : "No unread notifications";
  return `
    <button class="icon-button notification-button ${unreadCount ? "has-alerts" : ""}" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" data-action="open-notifications" ${canOpen ? "" : "disabled"}>
      <span aria-hidden="true">!</span>
      ${unreadCount ? `<strong class="notification-badge">${escapeHtml(countLabel)}</strong>` : ""}
    </button>
  `;
}

function unreadNotificationCount() {
  if (state.auth === "member") {
    return state.memberData.notifications.filter((row) => !row.readAt && !normal(row.status).includes("read")).length;
  }
  return dataRows("notifications")
    .filter((row) => row.notificationId && !row.readAt)
    .map((row) => row.notificationId)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .length;
}

function sessionSecurityMenu() {
  if (!state.sessionMenuOpen || state.auth === "none") return "";
  const minutes = sessionMinutesRemaining();
  const expiresAt = sessionExpiryValue();
  const security = state.data.securitySummary || {};
  const policy = state.data.platformSecurityPolicy || defaultPlatformSecurityPolicy();
  const mfaLabel = state.auth === "staff" ? (security.mfaEnabled || state.user?.mfaEnabled ? "Enabled" : "Not enabled") : "Member password";
  const expiryLabel = expiresAt ? formatDateTime(expiresAt) : "Not reported";
  const urgency = minutes === null ? "Active" : minutes <= 0 ? "Expired" : minutes <= 15 ? "Expires soon" : "Active";
  return `
    <div class="session-menu">
      <div class="session-menu-heading">
        <strong>Session and security</strong>
        <span class="status ${sessionStatusClass()}">${escapeHtml(urgency)}</span>
      </div>
      <div class="source-grid compact-source-grid">
        ${mini("Expires", expiryLabel)}
        ${mini("MFA", mfaLabel)}
        ${mini("Login", state.auth === "member" ? state.member?.membershipNo || "Member" : state.user?.email || "Staff")}
        ${mini("Role", roleLabel())}
      </div>
      ${isPlatform() ? `<p class="session-policy">Lockout after ${escapeHtml(policy.lockoutFailedAttempts ?? 5)} failed login attempts for ${escapeHtml(policy.lockoutMinutes ?? 15)} minute(s).</p>` : ""}
      <div class="session-menu-actions">
        <button class="button secondary" type="button" data-action="extend-session">Extend session</button>
        ${state.auth === "staff" ? `<button class="button ghost" type="button" data-action="open-security-settings">Security settings</button>` : `<button class="button ghost" type="button" data-action="open-member-security">Member security</button>`}
      </div>
    </div>
  `;
}

function helpSupportMenu() {
  if (!state.helpMenuOpen || state.auth === "none") return "";
  const role = roleLabel();
  const context = contextName();
  const primaryAction = state.auth === "member"
    ? ["open-help-complaints", "Submit complaint"]
    : isPlatform()
      ? ["open-help-complaints", "Open SACCO admin complaints"]
      : ["open-help-complaints", "Open member complaints"];
  const secondaryAction = state.auth === "member"
    ? ["open-help-security", "Security help"]
    : ["open-help-notifications", "Notification help"];
  return `
    <div class="help-menu">
      <div class="session-menu-heading">
        <strong>Help and support</strong>
        <span class="status active">Available</span>
      </div>
      <div class="source-grid compact-source-grid">
        ${mini("Portal", state.auth === "member" ? "Member" : isPlatform() ? "Platform" : "SACCO")}
        ${mini("Context", context)}
        ${mini("Role", role)}
        ${mini("Support path", state.auth === "member" ? "SACCO admin" : isPlatform() ? "SACCO admins" : "Members")}
      </div>
      <p class="session-policy">${escapeHtml(helpMenuGuidance())}</p>
      <div class="session-menu-actions">
        <button class="button secondary" type="button" data-action="${primaryAction[0]}">${primaryAction[1]}</button>
        <button class="button ghost" type="button" data-action="${secondaryAction[0]}">${secondaryAction[1]}</button>
      </div>
    </div>
  `;
}

function helpMenuGuidance() {
  if (state.auth === "member") return "Members raise account, payment, loan or profile issues to their SACCO administration team.";
  if (isPlatform()) return "The platform desk handles complaints and escalations submitted by SACCO administrators.";
  return "SACCO administrators resolve member complaints locally and escalate platform or billing issues when needed.";
}

function accountProfileMenu() {
  if (!state.accountMenuOpen || state.auth === "none") return "";
  const identity = state.auth === "member"
    ? state.member?.membershipNo || state.member?.email || state.member?.phone || "Member account"
    : state.user?.email || state.user?.phone || "Staff account";
  const primaryAction = state.auth === "member"
    ? ["open-account-profile", "Open profile"]
    : ["open-account-profile", "My access"];
  return `
    <div class="account-menu">
      <div class="account-menu-heading">
        <span class="profile-avatar">${initials(displayName())}</span>
        <div>
          <strong>${escapeHtml(displayName())}</strong>
          <small>${escapeHtml(identity)}</small>
        </div>
      </div>
      <div class="source-grid compact-source-grid">
        ${mini("Role", roleLabel())}
        ${mini("Context", contextName())}
        ${mini("Session", sessionTimeLabel())}
        ${mini("MFA", state.auth === "staff" ? ((state.data.securitySummary || {}).mfaEnabled || state.user?.mfaEnabled ? "Enabled" : "Not enabled") : "Member password")}
      </div>
      <div class="session-menu-actions">
        <button class="button secondary" type="button" data-action="${primaryAction[0]}">${primaryAction[1]}</button>
        <button class="button ghost" type="button" data-action="${state.auth === "member" ? "open-member-security" : "open-security-settings"}">Security</button>
        <button class="button ghost danger-text" type="button" data-action="logout">Logout</button>
      </div>
    </div>
  `;
}

function closeTopbarMenus({ clearSearch = false } = {}) {
  state.sessionMenuOpen = false;
  state.helpMenuOpen = false;
  state.accountMenuOpen = false;
  state.quickSearchActiveId = "";
  if (clearSearch) {
    state.search = "";
    state.tableState = {};
  }
}

function renderView(view) {
  if (state.auth === "member") return renderMemberView(view);
  if (view === "dashboard") return isPlatform() ? platformDashboard() : saccoDashboard();
  if (view === "sacco-applications") return saccoApplications();
  if (view === "subscriptions") return subscriptionsView();
  if (view === "sacco-accounts") return saccoAccounts();
  if (view === "members") return membersView();
  if (view === "transactions") return transactionsView();
  if (view === "loans") return loansView();
  if (view === "approvals") return approvalsView();
  if (view === "operations") return operationsView();
  if (view === "reports") return reportsView();
  if (view === "complaints") return complaintsView();
  if (view === "notifications") return notificationsView();
  if (view === "users") return usersView();
  if (view === "audit") return auditView();
  if (["savings", "shares", "welfare", "guarantors", "accounting", "reconciliation", "governance", "settings"].includes(view)) return moduleBlueprint(view);
  return emptyState("Module coming next", "This module has a document-driven shell and will be connected to deeper backend workflows next.");
}

function platformDashboard() {
  const role = roleKind();
  if (role === "operations") return platformOperationsDashboard();
  if (role === "billing") return platformBillingDashboard();
  if (role === "compliance") return platformComplianceDashboard();
  if (role === "support") return platformSupportDashboard();
  const tenants = dataRows("tenants").filter((tenant) => tenant.id !== "tenant_platform");
  const subs = dataRows("subscriptions");
  const transactions = dataRows("transactions");
  const users = platformUsers();
  const platformSupportTickets = saccoSupportTickets();
  return `
    <div class="dashboard-grid">
      ${summaryLink(t("totalSaccos"), tenants.length, "All registered SACCOs", "Open applications", "sacco-applications")}
      ${summaryLink(t("activeSaccos"), tenants.filter((t) => normal(t.status) === "active").length, "Operating SACCOs", "View accounts", "sacco-accounts")}
      ${summaryLink(t("pendingRegistrations"), tenants.filter((t) => normal(t.status).includes("pending")).length, "Reviewer queue", t("review"), "sacco-applications")}
      ${summaryLink(t("expiredSubscriptions"), subs.filter((s) => normal(s.status).includes("expired")).length, "Billing risk", "Renew", "subscriptions")}
      ${summaryLink(t("totalSubscriptionRevenue"), money.format(sum(subs, "amount")), "Current records", "Open billing", "subscriptions")}
      ${summaryLink(t("saccoSupportTickets"), platformSupportTickets.filter((c) => !["closed", "resolved"].includes(normal(c.status))).length, "SACCO admin escalations", t("open"), "complaints")}
      ${summaryLink(t("failedPaymentTransactions"), transactions.filter((t) => normal(t.status).includes("failed")).length, "Provider exceptions", t("review"), "transactions")}
      ${summaryLink(t("activePlatformUsers"), users.filter((user) => normal(user.status) === "active").length || users.length, "Administrators and roles", "Manage access", "users")}
    </div>
    ${notificationProviderRiskPanel()}
    ${loginRiskSummaryPanel(true)}
    <div class="split-layout">
      ${chartCard("SACCO registrations by month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], [2, 3, 4, 5, 7, tenants.length || 3])}
      ${activityPanel(t("recentSaccoApplications"), tenants.slice(0, 5).map((tenant) => [tenant.name || tenant.legalName, tenant.district || "Uganda", tenant.status || t("pending")]))}
    </div>
    <div class="grid two">
      ${recordTable("Subscriptions expiring soon", subs, ["tenantName", "packageName", "expiryDate", "status"])}
      ${recordTable("System alerts", operationAlerts(), ["title", "severity", "status", "checkedAt"])}
    </div>
  `;
}

function platformOperationsDashboard() {
  const tenants = tenantRows();
  const complaints = openSaccoSupportTickets();
  return `
    ${dashboardIntro("Platform Operations Officer", "Monitor service health, onboarding queues, callbacks, incidents and SACCO operating status.")}
    <div class="dashboard-grid">
      ${summary("Operating SACCOs", tenants.filter((t) => normal(t.status) === "active").length, "Live SACCOs", "Monitor")}
      ${summary("Pending onboarding", pendingTenants().length, "Applications needing follow-up", "Open queue")}
      ${summary("Open support tickets", complaints.length, "Operational workload", "Assign")}
      ${summary("Failed callbacks", dataRows("mobileMoneyCallbacks").filter((row) => normal(row.status).includes("failed")).length, "Provider exceptions", "Retry")}
      ${summary("System alerts", operationAlerts().length, "Health checks", "Open")}
    </div>
    ${notificationProviderRiskPanel()}
    ${loginRiskSummaryPanel(true)}
    <div class="grid two">
      ${recordTable("Operations command center", operationAlerts(), ["title", "provider", "severity", "status", "checkedAt"])}
      ${recordTable("SACCO admin support tickets", complaints, ["id", "tenantName", "category", "subject", "priority", "status"])}
    </div>
  `;
}

function platformBillingDashboard() {
  const subs = dataRows("subscriptions");
  return `
    ${dashboardIntro("Platform Billing Officer", "Control subscriptions, invoices, payment access and SACCO operating eligibility.")}
    <div class="dashboard-grid">
      ${summary("Active subscriptions", subs.filter((row) => normal(row.status) === "active").length, "Allowed to operate", "Review")}
      ${summary("Pending payments", subs.filter((row) => normal(row.paymentStatus || row.status).includes("pending")).length, "Awaiting confirmation", "Record")}
      ${summary("Expired subscriptions", subs.filter((row) => normal(row.status).includes("expired")).length, "Access risk", "Renew")}
      ${summary("Subscription revenue", money.format(sum(subs, "amount")), "Current records", "Export")}
      ${summary("Billable SACCOs", tenantRows().length, "Registered SACCOs", "Open")}
    </div>
    ${recordTable("Subscription list", subs, ["tenantName", "packageName", "billingPeriod", "expiryDate", "amount", "memberCount", "status"])}
    ${recordTable("SACCO billing access", tenantRows(), ["name", "district", "memberCount", "status"])}
  `;
}

function platformComplianceDashboard() {
  return `
    ${dashboardIntro("Platform Compliance Officer", "Oversight view for SACCO approvals, audit events, reports and operating exceptions.")}
    <div class="dashboard-grid">
      ${summary("Pending registrations", pendingTenants().length, "Approval oversight", "Review")}
      ${summary("Audit events", dataRows("auditEvents").length, "Sensitive actions", "Inspect")}
      ${summary("SACCO support tickets", openSaccoSupportTickets().length, "SACCO escalation cases", "Open")}
      ${summary("Operations alerts", operationAlerts().length, "System exceptions", "Review")}
      ${summary("Regulatory report", state.data.regulatoryReport ? "Ready" : "Pending", "Export readiness", "Open")}
    </div>
    ${loginRiskSummaryPanel(true)}
    <div class="grid two">
      ${recordTable("Audit log", dataRows("auditEvents"), ["createdAt", "actor", "role", "tenantName", "action", "module", "result"])}
      ${recordTable("SACCO approval oversight", tenantRows(), ["name", "district", "contactPerson", "memberCount", "status"])}
    </div>
  `;
}

function platformSupportDashboard() {
  const tickets = openSaccoSupportTickets();
  return `
    ${dashboardIntro("Platform Support Officer", "Help SACCO admins resolve onboarding, subscription and operating issues without member-level access.")}
    <div class="dashboard-grid">
      ${summary("SACCO support tickets", tickets.length, "SACCO admin escalations", "Open")}
      ${summary("Visible SACCOs", tenantRows().length, "SACCO support context", "View")}
      ${summary("Pending onboarding", pendingTenants().length, "Applicant follow-up", "Assist")}
      ${summary("Notifications", dataRows("notifications").length, "Recent messages", "Open")}
    </div>
    <div class="grid two">
      ${recordTable("SACCO admin support tickets", tickets, ["id", "tenantName", "category", "subject", "assignedOfficer", "priority", "status"])}
      ${recordTable("SACCO support list", tenantRows(), ["name", "district", "contactPerson", "phone", "status"])}
    </div>
  `;
}

function saccoDashboard() {
  const role = roleKind();
  if (role === "chairperson") return saccoChairpersonDashboard();
  if (role === "treasurer") return saccoTreasurerDashboard();
  if (role === "secretary") return saccoSecretaryDashboard();
  const members = dataRows("members");
  const transactions = dataRows("transactions");
  const loans = dataRows("loans");
  const monthlyPerformance = saccoMonthlyPerformanceRows();
  return `
    <div class="dashboard-grid">
      ${summary("Total members", members.length, "Membership register", "Open members")}
      ${summary("Active members", members.filter((m) => normal(m.status) === "active").length, "Can transact", "Review")}
      ${summary("Total savings", money.format(sum(members, "savingsBalance", "savings")), "Verified member balances", "Statements")}
      ${summary("Total shares", money.format(sum(members, "sharesBalance", "shares")), "Share capital", "Share register")}
      ${summary("Welfare fund", money.format(sum(members, "welfareBalance", "welfare")), "Claims coverage", "Claims")}
      ${summary("Outstanding loans", money.format(sum(loans, "outstandingBalance", "balance")), "Loan portfolio", "Open loans")}
      ${summary("Pending approvals", dataRows("approvals").length || transactions.filter((t) => normal(t.status).includes("pending")).length, "Maker-checker", "Approve")}
      ${summary("Mobile-money collections", money.format(sum(transactions.filter((t) => normal(t.channel).includes("mobile")), "amount")), "Provider channel", "Reconcile")}
    </div>
    ${loginRiskSummaryPanel(false)}
    ${paymentRoutePanel()}
    ${saccoMonthlyPerformancePanel(monthlyPerformance)}
    ${recordTable("Member monthly performance", monthlyPerformance, ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"])}
    <div class="grid two">
      ${recordTable("Recent transactions", transactions, ["reference", "memberName", "type", "amount", "status"])}
      ${recordTable("Loan work queue", loans, ["applicationNo", "memberName", "product", "requestedAmount", "status"])}
    </div>
  `;
}

function saccoChairpersonDashboard() {
  const loans = dataRows("loans");
  const transactions = dataRows("transactions");
  const members = dataRows("members");
  const approvalLoans = loans.filter((row) => ["pending", "review", "approval", "submitted"].some((word) => normal(`${row.status} ${row.stage}`).includes(word)));
  const arrearsLoans = loans.filter((row) => ["arrears", "overdue", "default"].some((word) => normal(`${row.status} ${row.riskLevel}`).includes(word)));
  const highValueTransactions = transactions.filter((row) => Number(row.amount || row.credit || row.debit || 0) >= 1000000);
  const governance = dataRows("governanceMeetings");
  return `
    ${dashboardIntro("SACCO Chairperson", "Oversight dashboard for approvals, portfolio health, governance actions and high-value exceptions.")}
    ${roleAccessPanel("Chairperson access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", members.length, "SACCO membership base", "Open", "members")}
      ${summaryLink("Loans awaiting approval", approvalLoans.length, "Chairperson approval queue", "Decide", "approvals")}
      ${summaryLink("Outstanding portfolio", money.format(sum(loans, "outstandingBalance", "balance")), "Credit exposure", "Review", "loans")}
      ${summaryLink("Arrears watch", arrearsLoans.length, "Loans requiring board attention", "Assess", "loans")}
      ${summaryLink("High-value transactions", highValueTransactions.length, "Large movements to review", "Review", "approvals")}
      ${summaryLink("Governance actions", governance.length, "Meetings and resolutions", "Open", "governance")}
    </div>
    ${rolePriorityPanel("Chairperson decision focus", [
      ["Approval discipline", `${approvalLoans.length} loan item(s) require board-level review before disbursement.`, approvalLoans.length ? "Pending" : "Clear"],
      ["Portfolio risk", `${arrearsLoans.length} loan account(s) are marked for arrears or default follow-up.`, arrearsLoans.length ? "Review" : "Healthy"],
      ["Member confidence", `${openComplaints().length} open complaint(s) may need leadership escalation.`, openComplaints().length ? "Follow up" : "Stable"]
    ])}
    <div class="grid two">
      ${recordTable("Chairperson approval queue", [...approvalLoans, ...pendingTransactions()], ["reference", "applicationNo", "memberName", "type", "requestedAmount", "amount", "status"])}
      ${recordTable("Board risk watch", [...arrearsLoans, ...highValueTransactions], ["applicationNo", "reference", "memberName", "product", "amount", "outstandingBalance", "status"])}
    </div>
  `;
}

function saccoTreasurerDashboard() {
  const transactions = dataRows("transactions");
  const callbacks = dataRows("mobileMoneyCallbacks");
  const accounts = dataRows("financialAccounts");
  const reconciliation = state.data.reconciliation || {};
  const expenses = dataRows("expenses");
  const cashAccounts = accounts.filter((row) => ["cash", "bank", "mobile"].some((word) => normal(`${row.accountType} ${row.productType} ${row.name}`).includes(word)));
  const failedCallbacks = callbacks.filter((row) => ["failed", "exception", "pending"].some((word) => normal(row.status).includes(word)));
  const monthlyPerformance = saccoMonthlyPerformanceRows();
  return `
    ${dashboardIntro("SACCO Treasurer", "Cash, collections, withdrawals, reconciliation and finance approvals for daily control.")}
    ${roleAccessPanel("Treasurer access")}
    <div class="dashboard-grid">
      ${summaryLink("Total savings", money.format(sum(dataRows("members"), "savingsBalance", "savings")), "Member deposits", "Statements", "savings")}
      ${summaryLink("Collections", money.format(sum(transactions.filter((row) => Number(row.credit || 0) > 0), "credit", "amount")), "Posted inflows", "Open", "transactions")}
      ${summaryLink("Withdrawals", money.format(sum(transactions.filter((row) => Number(row.debit || 0) > 0), "debit", "amount")), "Posted outflows", "Review", "transactions")}
      ${summaryLink("Pending finance approvals", pendingTransactions().length, "Maker-checker queue", "Approve", "approvals")}
      ${summaryLink("Mobile-money exceptions", failedCallbacks.length, "Provider callbacks needing action", "Reconcile", "reconciliation")}
      ${summaryLink("Expenses posted", money.format(sum(expenses, "amount", "totalAmount")), "Operating spend", "Review", "accounting")}
    </div>
    ${rolePriorityPanel("Treasurer daily control", [
      ["Cash position", `${cashAccounts.length || accounts.length} account(s) available for cash, bank or mobile-money review.`, cashAccounts.length ? "Review" : "Setup"],
      ["Reconciliation", `${Number(reconciliation.unmatchedBankLines || reconciliation.unmatchedLedgerLines || 0)} unmatched item(s) reported by reconciliation data.`, Number(reconciliation.unmatchedBankLines || reconciliation.unmatchedLedgerLines || 0) ? "Match" : "Clear"],
      ["Payment exceptions", `${failedCallbacks.length} mobile-money callback(s) need follow-up before reports are final.`, failedCallbacks.length ? "Investigate" : "Clear"]
    ])}
    ${paymentRoutePanel()}
    ${saccoMonthlyPerformancePanel(monthlyPerformance)}
    ${recordTable("Member monthly performance", monthlyPerformance, ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"])}
    <div class="grid two">
      ${recordTable("Finance approval queue", pendingTransactions(), ["reference", "memberName", "type", "amount", "channel", "status"])}
      ${recordTable("Treasurer reconciliation watch", [...failedCallbacks, ...callbacks].slice(0, 12), ["externalReference", "provider", "purpose", "amount", "status", "receivedAt"])}
    </div>
  `;
}

function saccoSecretaryDashboard() {
  const members = dataRows("members");
  const pendingKyc = members.filter((row) => normal(row.kycStatus).includes("pending") || normal(row.status).includes("pending"));
  const governance = dataRows("governanceMeetings");
  const recentNotifications = dataRows("notifications");
  return `
    ${dashboardIntro("SACCO Secretary", "Membership, KYC, records, complaints and governance follow-up for the SACCO office.")}
    ${roleAccessPanel("Secretary access")}
    <div class="dashboard-grid">
      ${summaryLink("Total members", members.length, "Member register", "Open", "members")}
      ${summaryLink("Pending KYC", pendingKyc.length, "Needs verification", "Review", "members")}
      ${summaryLink("Open complaints", openComplaints().length, "Member support queue", "Assign", "complaints")}
      ${summaryLink("Governance records", governance.length, "Meetings and minutes", "Open", "governance")}
      ${summaryLink("Branches", dataRows("branches").length, "Service points", "View", "settings")}
      ${summaryLink("Notifications", recentNotifications.length, "Member communication", "Open", "reports")}
    </div>
    ${rolePriorityPanel("Secretary office focus", [
      ["KYC completion", `${pendingKyc.length} member profile(s) need verification or follow-up documents.`, pendingKyc.length ? "Pending" : "Clear"],
      ["Member cases", `${openComplaints().length} open complaint(s) require tracking notes or assignment.`, openComplaints().length ? "Follow up" : "Stable"],
      ["Governance records", `${governance.length} meeting record(s) are available for minutes and resolutions.`, governance.length ? "Maintain" : "Schedule"]
    ])}
    <div class="grid two">
      ${recordTable("Member follow-up list", pendingKyc.length ? pendingKyc : members, ["membershipNo", "fullName", "phone", "branchName", "kycStatus", "status"])}
      ${recordTable("Secretary governance and complaint follow-up", [...openComplaints(), ...governance], ["id", "memberName", "category", "subject", "scheduledAt", "priority", "status"])}
    </div>
  `;
}

function saccoApplications() {
  const applications = tenantRows().map((tenant) => {
    const subscription = subscriptionForTenant(tenant.id);
    return {
      ...tenant,
      paymentStage: saccoPaymentStage(tenant, subscription),
      approvalStage: saccoApprovalStage(tenant, subscription),
      operatingAccess: subscriptionAccessLabel(subscription || {}, tenant),
      action: "tenant-detail",
      actionLabel: "Review",
      actionId: tenant.id
    };
  });
  return `
    ${filterToolbar("Search applications by SACCO, district, contact or status", "Assign reviewer", "Export applications")}
    ${saccoRegistrationReadinessPanel(applications)}
    ${saccoRegistrationTabs()}
    ${saccoRegistrationTabContent(applications)}
  `;
}

function saccoRegistrationReadinessPanel(applications) {
  return rolePriorityPanel("SACCO registration readiness", [
    ["Payment initiated", `${applications.filter((row) => normal(row.paymentStage).includes("initiated")).length} SACCO(s) have a subscription bill awaiting mobile-money callback or manual payment.`, "Track"],
    ["Callback received", `${applications.filter((row) => normal(row.paymentStage).includes("callback")).length} SACCO(s) have confirmed subscription payment.`, "Confirm"],
    ["Ready for approval", `${applications.filter((row) => normal(row.approvalStage).includes("ready")).length} paid self-registration(s) are ready for platform review.`, "Review"],
    ["Active", `${applications.filter((row) => normal(row.operatingAccess) === "active").length} SACCO(s) have active subscription and operating access.`, "Live"]
  ]);
}

function saccoRegistrationTabs() {
  const tabs = [
    ["platform", t("platformSaccoRegistration")],
    ["applications", t("saccoApplicationList")],
    ["self", t("selfRegistrationApprovalPath")]
  ];
  if (!tabs.some(([id]) => id === state.saccoRegistrationTab)) state.saccoRegistrationTab = "platform";
  return `
    <section class="panel compact-panel">
      <div class="tabs management-tabs">
        ${tabs.map(([id, label]) => `<button class="${state.saccoRegistrationTab === id ? "active" : ""}" type="button" data-sacco-registration-tab="${id}">${label}</button>`).join("")}
      </div>
    </section>
  `;
}

function saccoRegistrationTabContent(applications) {
  if (state.saccoRegistrationTab === "applications") {
    return `
      ${tenantDetailPanel()}
      ${recordTable(t("saccoApplicationList"), applications, ["saccoCode", "name", "country", "currencyCode", "district", "registrationNo", "paymentStage", "approvalStage", "operatingAccess", "status"])}
    `;
  }
  if (state.saccoRegistrationTab === "self") return selfRegistrationApprovalPanel();
  return platformSaccoRegistrationPanel();
}

function platformSaccoRegistrationPanel() {
  const packages = dataRows("subscriptionPackages");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("platformSaccoRegistration")}</h2>
          <p>Platform administrators can create a SACCO record directly. Paid registrations activate immediately; unpaid registrations remain pending payment.</p>
        </div>
      </div>
      ${state.tenantFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.tenantFormMessage)}</strong></div>` : ""}
      ${state.tenantFormError ? `<div class="notice warning"><strong>Could not register SACCO.</strong><span>${escapeHtml(state.tenantFormError)}</span></div>` : ""}
      <form id="platformSaccoForm" class="form-grid">
        <label><span>SACCO name</span><input id="newTenantName" required placeholder="e.g. Tereka Farmers SACCO"></label>
        <label><span>SACCO code</span><input id="newTenantCode" readonly placeholder="Generated automatically"></label>
        <label><span>Registration number</span><input id="newTenantRegistrationNo" placeholder="Cooperative or UMRA registration"></label>
        <label><span>Country</span><select id="newTenantCountry">${countryRegionOptions("uganda")}</select></label>
        <label><span>Currency</span><input id="newTenantCurrencyCode" readonly value="UGX"></label>
        <label><span>District</span><input id="newTenantDistrict" required placeholder="e.g. Kampala"></label>
        <label><span>Parish</span><input id="newTenantParish" required placeholder="e.g. Central Parish"></label>
        <label><span>Village</span><input id="newTenantVillage" required placeholder="e.g. Market Zone"></label>
        <label><span>Contact number</span><input id="newTenantContactNumber" required placeholder="+256..."></label>
        <label><span>Member range</span><select id="newTenantMemberRange">${memberRangeOptions()}</select></label>
        <label><span>Payment status</span><select id="newTenantPaymentStatus">
          <option value="paid">Paid - activate SACCO</option>
          <option value="pending">Not paid - keep pending payment</option>
        </select></label>
        <label><span>License expiry</span><input id="newTenantLicenseExpiry" type="date" required></label>
        <label><span>Subscription package</span><select id="newTenantPackageId">${packages.map((pkg) => `<option value="${escapeHtml(pkg.id || pkg.code || "")}">${escapeHtml(pkg.name || pkg.code || "Package")}</option>`).join("") || `<option value="">Assign later</option>`}</select></label>
        <div class="form-actions inline">
          <button class="button primary" type="submit">Register SACCO</button>
          <button class="button secondary" type="button" data-action="refresh">Refresh applications</button>
        </div>
      </form>
    </section>
  `;
}

function selfRegistrationApprovalPanel() {
  const steps = ["SACCO Information", "Location and Contact", "Authorized Contact", "Leadership Details", "Document Upload", "Subscription Package", "Review and Submit"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("selfRegistrationApprovalPath")}</h2>
          <p>SACCOs can submit their own application publicly, but they cannot operate until platform review, approval, subscription confirmation and activation are completed.</p>
        </div>
      </div>
      <div class="stepper">${steps.map((step, index) => `<div><span>${index + 1}</span><strong>${step}</strong></div>`).join("")}</div>
    </section>
  `;
}

function subscriptionsView() {
  const rows = dataRows("subscriptions");
  const tableRows = rows.map((subscription) => {
    const tenant = tenantRows().find((item) => item.id === subscription.tenantId) || {};
    return {
      ...subscription,
      saccoCode: tenant.abbreviation || tenant.code || subscription.tenantCode || subscription.tenantId,
      packageName: subscription.tierLabel || subscription.packageName || subscription.packageId,
      paymentStatus: subscriptionPaymentLabel(subscription),
      paymentStage: saccoPaymentStage(tenant, subscription),
      operatingAccess: subscriptionAccessLabel(subscription, tenant),
      approvalStage: saccoApprovalStage(tenant, subscription),
      billableMembers: subscription.billableMembers || subscription.memberCount || tenant.memberCount || 0,
      balanceDue: Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || subscription.amountPaid || 0)),
      action: "subscription-detail",
      actionLabel: "Manage",
      actionId: subscription.id
    };
  });
  return `
    <div class="dashboard-grid">
      ${summary(t("activeSubscriptions"), rows.filter((row) => normal(row.status) === "active").length, "Operating access", "View")}
      ${summary(t("pendingPayments"), rows.filter((row) => normal(row.paymentStatus || row.status).includes("pending")).length, "Awaiting confirmation", "Record payment")}
      ${summary(t("suspendedAccess"), tableRows.filter((row) => normal(row.operatingAccess).includes("suspended")).length, "Blocked from operating", t("review"))}
      ${summary(t("revenueThisMonth"), money.format(sum(rows, "amount")), "Invoice value", t("export"))}
      ${summary(t("outstandingInvoices"), money.format(rows.reduce((total, row) => total + Number(row.amount || 0) - Number(row.paid || row.amountPaid || 0), 0)), "Unpaid balance", "Follow up")}
    </div>
    ${subscriptionStatusGuide(rows, tableRows)}
    ${filterToolbar("Search by SACCO code, SACCO name, package, payment status, access status or expiry", "Record payment", "Generate invoice")}
    ${subscriptionDetailPanel(rows)}
    ${recordTable("Subscription list", tableRows, ["saccoCode", "tenantName", "packageName", "billingDescription", "billableMembers", "amount", "paid", "balanceDue", "paymentStage", "approvalStage", "operatingAccess", "expiry"])}
    ${packageCards()}
    ${packageSetupPanel()}
  `;
}

function subscriptionStatusGuide(rows, tableRows) {
  return rolePriorityPanel(t("subscriptionPaymentAccessStatus"), [
    ["Paid and active", `${tableRows.filter((row) => normal(row.paymentStatus) === "paid" && normal(row.operatingAccess) === "active").length} SACCO(s) have confirmed payment and operating access.`, "Active"],
    ["Payment initiated", `${tableRows.filter((row) => normal(row.paymentStage).includes("initiated")).length} SACCO(s) are waiting for payment confirmation before activation or renewal.`, "Follow up"],
    ["Callback received", `${tableRows.filter((row) => normal(row.paymentStage).includes("callback")).length} SACCO(s) have confirmed payment and need approval or activation follow-through.`, "Review"],
    ["Expired or suspended", `${tableRows.filter((row) => normal(row.operatingAccess).includes("expired") || normal(row.operatingAccess).includes("suspended")).length} SACCO(s) need renewal, payment confirmation or manual access review.`, "Review"]
  ]);
}

function saccoAccounts() {
  const subscriptions = dataRows("subscriptions");
  const rows = tenantRows().map((tenant) => {
    const subscription = subscriptionForTenant(tenant.id);
    return {
      ...tenant,
      saccoCode: tenant.abbreviation || tenant.code || tenant.id,
      accountHealth: tenantAccountHealth(tenant, subscription),
      subscriptionStatus: subscription?.status || "No subscription",
      packageName: subscription?.tierLabel || subscription?.packageName || subscription?.packageId || "Not assigned",
      expiry: subscription?.expiry || subscription?.expiryDate || "",
      billableMembers: subscription?.billableMembers || subscription?.memberCount || tenant.memberCount || 0,
      paymentStage: saccoPaymentStage(tenant, subscription),
      approvalStage: saccoApprovalStage(tenant, subscription),
      action: "tenant-detail",
      actionLabel: "Open",
      actionId: tenant.id
    };
  });
  return `
    <div class="dashboard-grid">
      ${summary(t("activeAccounts"), rows.filter((row) => normal(row.status) === "active").length, "SACCOs allowed to operate", "Monitor")}
      ${summary(t("suspendedAccounts"), rows.filter((row) => normal(row.status).includes("suspended")).length, "Access disabled", t("review"))}
      ${summary(t("withoutSubscription"), rows.filter((row) => !subscriptions.some((sub) => sub.tenantId === row.id)).length, "Needs billing setup", "Assign")}
      ${summary(t("expiringSoon"), rows.filter((row) => normal(row.subscriptionStatus).includes("expired") || normal(row.accountHealth).includes("risk")).length, "Billing and access risk", "Renew")}
    </div>
    ${filterToolbar("Search SACCO code, name, country, currency, district, status, subscription or package", "Activate SACCO", "Export accounts")}
    ${tenantDetailPanel()}
    ${recordTable("SACCO account health", rows, ["saccoCode", "name", "country", "currencyCode", "district", "status", "accountHealth", "paymentStage", "approvalStage", "subscriptionStatus", "packageName", "billableMembers", "expiry"])}
  `;
}

function membersView() {
  const members = dataRows("members");
  const pendingKyc = members.filter((member) => normal(member.kycStatus).includes("pending") || normal(member.status).includes("pending"));
  const active = members.filter((member) => normal(member.status) === "active");
  const rows = members.map((member) => ({
    ...member,
    totalBalance: Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0),
    kycReadiness: memberKycReadiness(member),
    action: "member-detail",
    actionLabel: "Open profile",
    actionId: member.id
  }));
  const tab = state.memberTab || "overview";
  return `
    <div class="dashboard-grid">
      ${summary(t("registeredMembers"), members.length, "Member register only, not staff users", t("review"))}
      ${summary(t("activeMembers"), active.length, "Can transact and use portal", "Monitor")}
      ${summary(t("pendingKyc"), pendingKyc.length, "Needs document or approval follow-up", t("review"))}
      ${summary("Total balances", money.format(sum(rows, "totalBalance")), t("savingsSharesWelfare"), "Statements")}
      ${summary(t("portalReady"), rows.filter((member) => normal(member.status) === "active" && normal(member.kycStatus) === "verified").length, "Can use member login", "Audit")}
    </div>
    ${memberTabs(tab)}
    ${tab === "overview" ? rolePriorityPanel(t("memberManagementFocus"), [
      ["Member and staff separation", "Members are managed here. SACCO staff logins are managed under Users and Roles.", "Clear"],
      ["KYC workflow", `${pendingKyc.length} member profile(s) need verification, document review or approval action.`, pendingKyc.length ? "Pending" : "Clear"],
      ["Balances and statements", "Open a member profile to review balances, contacts, beneficiaries, documents and statement lines.", "Ready"]
    ]) : ""}
    ${tab === "register" ? memberRegistrationPanel() : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search by member number, name, phone, branch, KYC or status", "Register member", "Download statement")}
      ${recordTable("Member list", rows, ["membershipNo", "fullName", "phone", "email", "totalBalance", "kycReadiness", "kycStatus", "status"])}
    ` : ""}
    ${tab === "kyc" ? memberDetailPanel("kyc") : ""}
    ${tab === "contacts" ? memberDetailPanel("contacts") : ""}
    ${tab === "statement" ? memberDetailPanel("statement") : ""}
  `;
}

function memberTabs(activeTab) {
  const tabs = [
    ["overview", t("memberOverview")],
    ["register", t("registerMember")],
    ["list", t("memberList")],
    ["kyc", t("kycDetail")],
    ["contacts", t("contactsDocuments")],
    ["statement", t("statement")]
  ];
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-member-tab="${id}">${label}</button>`).join("")}
    </div>
  `;
}

function activeModuleTab(view, tabs) {
  const fallback = tabs[0]?.[0] || "overview";
  return tabs.some(([id]) => id === state.moduleTabs[view]) ? state.moduleTabs[view] : fallback;
}

function moduleTabs(view, tabs, activeTab = activeModuleTab(view, tabs)) {
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-module-tab-view="${escapeHtml(view)}" data-module-tab="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
}

function transactionsView() {
  const rows = transactionRows();
  const pending = rows.filter((row) => normal(row.status).includes("pending"));
  const posted = rows.filter((row) => normal(row.status) === "posted");
  const reversed = rows.filter((row) => row.originalTransactionId || normal(row.status).includes("reversed"));
  const receiptingQueue = transactionReceiptingQueue(rows);
  const receiptRegister = transactionReceiptRegister(rows);
  const tabs = [["overview", t("control")], ["capture", t("newTransactionScreen")], ["receipting", "Receipting queue"], ["receipts", "Receipt register"], ["detail", t("transactionDetail")], ["list", t("transactionList")]];
  const tab = activeModuleTab("transactions", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("transactions"), rows.length, "Deposits, withdrawals and corrections", t("review"))}
      ${summary(t("pendingApproval"), pending.length, "Maker-checker queue", "Approve")}
      ${summary(t("postedValue"), money.format(sum(posted, "amount")), "Receipt-ready transactions", t("receipts"))}
      ${summary(t("reversals"), reversed.length, "Corrections with reason trail", "Audit")}
      ${summary(t("mobileMoney"), money.format(sum(rows.filter((row) => normal(row.channel).includes("mobile")), "amount")), "Provider channel", "Reconcile")}
    </div>
    ${moduleTabs("transactions", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("transactionControlFocus"), [
      ["Maker-checker", `${pending.length} transaction(s) are waiting for Treasurer/Admin approval.`, pending.length ? "Pending" : "Clear"],
      ["Receipts", `${posted.length} posted transaction(s) can produce member receipts.`, posted.length ? "Ready" : "Pending"],
      ["Receipting queue", `${receiptingQueue.length} payment item(s) need posting, receipt loading or member follow-up.`, receiptingQueue.length ? "Open" : "Clear"],
      ["Receipt register", `${receiptRegister.length} posted receipt record(s) are available for member follow-up.`, receiptRegister.length ? "Available" : "Pending"],
      ["Treasurer cash", "Cash savings deposits and loan repayments are captured here, approved, then receipted for the member.", "Office route"],
      ["Mobile money", "Member self-service payments arrive through provider callbacks and are reconciled against posted transactions.", "Provider route"],
      ["Reversals", "Posted original transactions require a reason before reversal is created.", "Controlled"]
    ]) : ""}
    ${tab === "capture" ? transactionFormPanel() : ""}
    ${tab === "receipting" ? transactionReceiptingPanel(receiptingQueue) : ""}
    ${tab === "receipts" ? transactionReceiptRegisterPanel(receiptRegister) : ""}
    ${tab === "detail" ? (transactionDetailPanel(rows) || emptyState("Transaction detail and reversal", "Select a transaction from the list to review receipt, approval and reversal actions.")) : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search by reference, member, channel, status, amount or user", "New transaction", "Print receipt")}
      ${recordTable("Transaction list", rows, ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "reversalStatus", "status"])}
    ` : ""}
  `;
}

function transactionReceiptRegisterPanel(rows) {
  const mobile = rows.filter((row) => row.paymentRoute === "Mobile money");
  const treasurer = rows.filter((row) => row.paymentRoute === "Treasurer cash");
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipt register</h2>
          <p>Posted member receipts for Treasurer/Admin printing, member follow-up and audit evidence.</p>
        </div>
        <span class="status ${rows.length ? "active" : "pending"}">${rows.length ? "Receipts available" : "No receipts"}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipts", rows.length)}
        ${mini("Total receipted", money.format(sum(rows, "amount")))}
        ${mini("Mobile money", mobile.length)}
        ${mini("Treasurer cash", treasurer.length)}
        ${mini("Loan repayments", rows.filter((row) => normal(row.type).includes("loan")).length)}
        ${mini("Savings deposits", rows.filter((row) => normal(row.type).includes("saving")).length)}
      </div>
    </section>
    ${filterToolbar("Search receipts by receipt number, member, route, reference or amount", "Download register", "Print receipts")}
    ${recordTable("SACCO receipt register", rows, ["receiptNo", "postedAt", "memberName", "type", "paymentRoute", "amount", "receiptStatus", "reference"])}
  `;
}

function transactionReceiptingPanel(rows) {
  const pending = rows.filter((row) => normal(row.status).includes("pending"));
  const ready = rows.filter((row) => normal(row.status) === "posted");
  const mobile = rows.filter((row) => row.paymentRoute === "Mobile money");
  const treasurer = rows.filter((row) => row.paymentRoute === "Treasurer cash");
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipting queue</h2>
          <p>Treasurer/Admin queue for deposits, loan repayments, mobile-money callbacks and receipt follow-up.</p>
        </div>
        <span class="status ${rows.length ? "pending" : "active"}">${rows.length ? "Action queue" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Pending posting", pending.length)}
        ${mini("Receipt ready", ready.length)}
        ${mini("Mobile money", mobile.length)}
        ${mini("Treasurer cash", treasurer.length)}
        ${mini("Loan repayments", rows.filter((row) => normal(row.type).includes("loan")).length)}
        ${mini("Savings deposits", rows.filter((row) => normal(row.type).includes("saving")).length)}
      </div>
      <ul class="activity-list">
        <li><strong>Pending posting</strong><span>Approve/post verified Treasurer cash, bank or manual entries before issuing receipts.</span><em>${pending.length ? "Review" : "Clear"}</em></li>
        <li><strong>Receipt ready</strong><span>Load receipt for posted transactions, then confirm the member can see the same reference in the member portal.</span><em>${ready.length ? "Ready" : "Waiting"}</em></li>
        <li><strong>Payment route</strong><span>Mobile-money and Treasurer cash are separated so reconciliation and monthly performance remain clear.</span><em>Controlled</em></li>
      </ul>
    </section>
    ${filterToolbar("Search receipting queue by member, reference, route, status or amount", "Post selected", "Load receipt")}
    ${recordTable("Receipting queue", rows, ["reference", "postedAt", "memberName", "type", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "receiptingAction", "status"])}
  `;
}

function loansView() {
  const loans = loanRows();
  const submitted = loans.filter((loan) => ["submitted", "pending_approval"].includes(normal(loan.status)) || normal(loan.stage).includes("guarant"));
  const approved = loans.filter((loan) => normal(loan.status) === "approved");
  const active = loans.filter((loan) => normal(loan.status) === "active");
  const atRisk = loans.filter((loan) => Number(loan.dsr || 0) >= 40 || ["arrears", "overdue", "default"].some((word) => normal(`${loan.status} ${loan.stage}`).includes(word)));
  const tabs = [["overview", t("lifecycle")], ["application", t("loanApplicationForm")], ["detail", t("loanDetailGuarantors")], ["list", t("loanApplicationList")]];
  const tab = activeModuleTab("loans", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("activeLoans"), active.length, "Disbursed portfolio", t("open"))}
      ${summary(t("outstandingPrincipal"), money.format(sum(loans, "outstandingBalance", "balance")), "Portfolio balance", t("review"))}
      ${summary(t("awaitingApproval"), submitted.length, "Guarantor and decision queue", "Approve")}
      ${summary(t("readyToDisburse"), approved.length, "Approved but not active", "Disburse")}
      ${summary(t("portfolioAtRisk"), atRisk.length, "Arrears and DSR risk", "Report")}
    </div>
    ${moduleTabs("loans", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("loanLifecycleControl"), [
      ["Application", `${submitted.length} loan file(s) are in application, guarantor or approval review.`, submitted.length ? "Pending" : "Clear"],
      ["Disbursement", `${approved.length} approved loan(s) are ready for disbursement after final checks.`, approved.length ? "Ready" : "Clear"],
      ["Servicing", `${active.length} active loan(s) can receive repayments and arrears monitoring.`, active.length ? "Active" : "Pending"]
    ]) : ""}
    ${tab === "application" ? loanApplicationPanel() : ""}
    ${tab === "detail" ? (loanDetailPanel(loans) || emptyState("Loan detail and guarantors", "Select a loan application from the list to review guarantors, decisions and repayments.")) : ""}
    ${tab === "list" ? recordTable("Loan application list", loans, ["applicationNo", "memberName", "product", "requestedAmount", "outstandingBalance", "monthlyInstallment", "nextDueDate", "arrearsAmount", "scheduleStatus", "guarantorReadiness", "approvalReadiness", "servicingStatus", "status"]) : ""}
  `;
}

function approvalsView() {
  const transactions = transactionRows().filter((row) => normal(row.status).includes("pending"));
  const loans = isPlatform() ? [] : dataRows("loans").filter((row) => normal(row.status).includes("review") || normal(row.status).includes("submitted")).map((row) => ({ ...row, memberName: row.memberName || memberName(row.memberId), action: "loan-detail", actionLabel: "Review loan", actionId: row.id }));
  const members = isPlatform() ? [] : dataRows("members").filter((row) => normal(row.status).includes("pending")).map((row) => ({ ...row, type: "member_kyc", amount: 0, memberName: row.fullName, action: "member-detail", actionLabel: "Review member", actionId: row.id }));
  const queue = [...transactions, ...loans, ...members];
  const tabs = [["overview", "Decision center"], ["queue", "Approval queue"]];
  const tab = activeModuleTab("approvals", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("Pending member approvals", members.length, "KYC and onboarding", "Review")}
      ${summary(isPlatform() ? "Pending platform approvals" : "Pending loan approvals", loans.length, isPlatform() ? "SACCO and support workflow" : "Credit workflow", "Review")}
      ${summary("Pending transactions", transactions.length, "Finance maker-checker", "Review")}
      ${summary("Total approval queue", queue.length, "Role-filtered work list", "Open")}
    </div>
    ${moduleTabs("approvals", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel("Approval decision center", [
      ["Transaction approvals", `${transactions.length} transaction(s) require finance review before posting.`, transactions.length ? "Pending" : "Clear"],
      ["Loan approvals", `${loans.length} loan application(s) require credit or chairperson decision.`, loans.length ? "Pending" : "Clear"],
      ["Member approvals", `${members.length} member profile(s) require KYC or activation decision.`, members.length ? "Pending" : "Clear"]
    ]) : ""}
    ${tab === "queue" ? recordTable("Approval queue", queue, ["reference", "applicationNo", "membershipNo", "memberName", "type", "amount", "stage", "approvalReadiness", "status"]) : ""}
  `;
}

function operationsView() {
  const alerts = operationAlerts();
  return `
    <div class="dashboard-grid">
      ${summary("Platform health", state.data.operations?.health || "Healthy", "Service status", "Open")}
      ${summary("Failed callbacks", alerts.filter((a) => normal(a.status).includes("failed")).length, "Payment provider", "Retry")}
      ${summary("Notification delivery", dataRows("notifications").length, "SMS/email/push", "Open")}
      ${summary("User sessions", "Active", "Security monitor", "View")}
    </div>
    ${operationsReadinessPanel(alerts)}
    ${recordTable("Operations command center", alerts, ["title", "provider", "severity", "status", "checkedAt"])}
    ${tabsCard("Operations coverage", ["Payment monitoring", "Failed transactions", "Notification delivery", "Integration status", "Scheduled jobs", "Data-import monitoring", "User-session monitoring", "Maintenance notices"])}
  `;
}

function operationsReadinessPanel(alerts) {
  const callbacks = dataRows("mobileMoneyCallbacks");
  const failedCallbacks = callbacks.filter((row) => normal(row.status).includes("failed")).length;
  const failedDeliveries = dataRows("notifications").filter((row) => normal(row.status).includes("failed")).length;
  const openSupport = openComplaints().length;
  const incidentCount = alerts.filter((row) => ["failed", "warning", "error", "pending"].some((word) => normal(`${row.status} ${row.severity}`).includes(word))).length + failedCallbacks + failedDeliveries + openSupport;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Operations readiness control</h2>
          <p>Live production watch for API health, payment callbacks, notification delivery and support workload.</p>
        </div>
        <span class="status ${incidentCount ? "pending" : "active"}">${incidentCount ? "Attention needed" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("System checks", alerts.length)}
        ${mini("Failed callbacks", failedCallbacks)}
        ${mini("Failed notifications", failedDeliveries)}
        ${mini("Open support cases", openSupport)}
        ${mini("Database", state.data.operations?.database || "Online")}
        ${mini("Last check", state.lastSync || "Pending")}
      </div>
    </section>
  `;
}

function reportsView() {
  const platform = isPlatform();
  const rows = regulatoryReportRows(platform);
  const consolidated = regulatoryConsolidated(rows);
  const catalogue = reportCatalogue(platform);
  const exceptions = Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
  if (platform) return platformSuperAdminReportsView(rows, exceptions);
  const tabs = [["overview", "Reporting control"], ["catalogue", "Report catalogue"], ["readiness", "Report readiness"], ["regulatory", "SACCO regulatory report"]];
  const tab = activeModuleTab("reports", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("Members in report", consolidated.memberCount, "Active and inactive members", "Review")}
      ${summary("Savings reported", money.format(consolidated.savings || 0), "Member deposit balances", "Export")}
      ${summary("Loan portfolio", money.format(consolidated.loanPortfolio || 0), "Credit exposure", "Open")}
      ${summary("Compliance exceptions", exceptions, "Reconciliation and journal checks", "Investigate")}
    </div>
    ${moduleTabs("reports", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("reportingEvidenceControl"), [
      ["Ledger evidence", `${consolidated.journalEntries || 0} journal entr${Number(consolidated.journalEntries || 0) === 1 ? "y" : "ies"} available for report support.`, Number(consolidated.unbalancedJournalEntries || 0) ? "Review" : "Clear"],
      ["Reconciliation evidence", `${consolidated.reconciliationExceptions || 0} reconciliation exception(s) affect export confidence.`, Number(consolidated.reconciliationExceptions || 0) ? "Investigate" : "Clear"],
      ["Compliance status", `Current report status is ${labelize(consolidated.complianceStatus || (exceptions ? "review" : "clear"))}.`, exceptions ? "Review" : "Ready"]
    ]) : ""}
    ${tab === "catalogue" ? `
      ${filterToolbar("Search reports by module, member group, product or compliance status", "Export report", "Schedule report")}
      <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report catalogue</h2>
          <p>SACCO reports focus on members, finance, accounting, governance and statutory evidence.</p>
        </div>
        <span>${catalogue.length} report group(s)</span>
      </div>
      <div class="report-grid">
        ${catalogue.map((report) => `
          <article class="report-card">
            <h3>${escapeHtml(report.title)}</h3>
            <p>${escapeHtml(report.copy)}</p>
            <div class="mini-grid">
              ${mini("Owner", report.owner)}
              ${mini("Output", report.output)}
            </div>
            <button class="button secondary" type="button">${escapeHtml(report.action)}</button>
          </article>
        `).join("")}
      </div>
    </section>
    ` : ""}
    ${tab === "readiness" ? reportReadinessPanel(consolidated) : ""}
    ${tab === "regulatory" ? recordTable("SACCO regulatory report", rows, ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "loanPortfolio", "activeLoans", "expenseTotal", "assetNetBookValue", "complianceStatus"]) : ""}
  `;
}

function platformSuperAdminReportsView(rows, exceptions) {
  const tenants = tenantRows();
  const subscriptions = dataRows("subscriptions");
  const users = platformUsers();
  const supportTickets = saccoSupportTickets();
  return `
    <div class="dashboard-grid">
      ${summary(t("registeredSaccos"), tenants.length, "All SACCO accounts", t("review"))}
      ${summary(t("activeSaccos"), tenants.filter((tenant) => normal(tenant.status) === "active").length, "Allowed to operate", t("open"))}
      ${summary(t("subscriptionRevenue"), money.format(sum(subscriptions, "amount")), "Platform billing", t("export"))}
      ${summary(t("platformAdministrators"), users.length, "Users and roles", "Audit")}
      ${summary(t("pendingRegistrations"), tenants.filter((tenant) => normal(tenant.status).includes("pending")).length, "Onboarding decisions", t("review"))}
      ${summary(t("openSaccoComplaints"), supportTickets.filter((ticket) => !["closed", "resolved"].includes(normal(ticket.status))).length, "Escalations from SACCO admins", t("review"))}
      ${summary(t("failedPayments"), dataRows("transactions").filter((transaction) => normal(transaction.status).includes("failed")).length, "Provider exceptions", t("review"))}
      ${summary(t("complianceExceptions"), exceptions, "Reconciliation and journal checks", "Investigate")}
    </div>
    ${rolePriorityPanel(t("superAdminReportingControl"), [
      ["SACCO account status", `${tenants.length} SACCO account(s) tracked for activation, suspension and payment eligibility.`, tenants.some((tenant) => normal(tenant.status).includes("pending")) ? "Review" : "Clear"],
      ["Billing control", `${subscriptions.length} subscription record(s) available for renewal, arrears and package reporting.`, subscriptions.some((row) => normal(row.status).includes("expired")) ? "Review" : "Current"],
      ["Access governance", `${users.length} platform administrator account(s) included in role and permission reporting.`, users.length ? "Monitored" : "Setup needed"]
    ])}
    ${filterToolbar("Search Super Admin reports by SACCO, billing status, administrator, compliance status or export type", "Export report", "Schedule report")}
    ${recordTable("Super Admin SACCO report", rows, ["tenantName", "memberCount", "activeMembers", "savings", "shares", "welfare", "reconciliationExceptions", "openComplaints", "complianceStatus"])}
    ${recordTable("Platform administrator access report", users, ["fullName", "email", "rolesLabel", "moduleScope", "status", "lastLogin"])}
  `;
}

function regulatoryReportRows(platform) {
  const report = state.data.regulatoryReport || {};
  const rawRows = Array.isArray(report.reports) ? report.reports : [];
  const rows = rawRows.length ? rawRows : tenantRows().map((tenant) => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    memberCount: dataRows("members").filter((member) => member.tenantId === tenant.id).length,
    activeMembers: dataRows("members").filter((member) => member.tenantId === tenant.id && normal(member.status) === "active").length,
    savings: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "savingsBalance", "savings"),
    shares: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "sharesBalance", "shares"),
    welfare: sum(dataRows("members").filter((member) => member.tenantId === tenant.id), "welfareBalance", "welfare"),
    loanPortfolio: sum(dataRows("loans").filter((loan) => loan.tenantId === tenant.id), "outstandingBalance", "balance", "amount"),
    activeLoans: dataRows("loans").filter((loan) => loan.tenantId === tenant.id && !["rejected", "closed"].includes(normal(loan.status))).length,
    expenseTotal: sum(dataRows("expenses").filter((expense) => expense.tenantId === tenant.id), "amount"),
    assetNetBookValue: sum(dataRows("assets").filter((asset) => asset.tenantId === tenant.id), "netBookValue", "cost"),
    reconciliationExceptions: 0,
    openComplaints: dataRows("complaints").filter((complaint) => complaint.tenantId === tenant.id && !["resolved", "closed"].includes(normal(complaint.status))).length,
    complianceStatus: "local fallback"
  }));
  const scopedRows = platform ? rows : rows.filter((row) => !row.tenantId || row.tenantId === state.user?.tenantId || row.tenantId === state.tenant?.id);
  return scopedRows.map((row) => ({
    ...row,
    tenantName: row.tenantName || tenantName(row.tenantId)
  }));
}

function regulatoryConsolidated(rows) {
  const report = state.data.regulatoryReport || {};
  if (report.consolidated && (isPlatform() || report.consolidated.tenantId === state.currentTenantId || report.reports?.length === 1)) {
    return report.consolidated;
  }
  return {
    memberCount: sum(rows, "memberCount"),
    activeMembers: sum(rows, "activeMembers"),
    savings: sum(rows, "savings"),
    shares: sum(rows, "shares"),
    welfare: sum(rows, "welfare"),
    loanPortfolio: sum(rows, "loanPortfolio"),
    activeLoans: sum(rows, "activeLoans"),
    expenseTotal: sum(rows, "expenseTotal"),
    assetNetBookValue: sum(rows, "assetNetBookValue"),
    journalEntries: sum(rows, "journalEntries"),
    unbalancedJournalEntries: sum(rows, "unbalancedJournalEntries"),
    reconciliationExceptions: sum(rows, "reconciliationExceptions"),
    openComplaints: sum(rows, "openComplaints"),
    openResolutions: sum(rows, "openResolutions"),
    complianceStatus: rows.some((row) => normal(row.complianceStatus) !== "clear") ? "review" : "clear"
  };
}

function reportCatalogue(platform) {
  if (platform) {
    return [
      { title: "SACCO account register", copy: "Registered SACCOs, generated codes, activation status, contact details and member ranges.", owner: "Super Admin", output: "PDF / Excel", action: "Open SACCO accounts" },
      { title: "Registration pipeline", copy: "Platform-created registrations, self-service applications, payment status and approval outcomes.", owner: "Super Admin", output: "Onboarding pack", action: "Open applications" },
      { title: "Subscription control", copy: "Packages, billable members, received payments, arrears, renewals and operating eligibility.", owner: "Super Admin", output: "Billing pack", action: "Open billing" },
      { title: "Platform administrator access", copy: "Administrator accounts, assigned roles, module access, status and last-login review.", owner: "Super Admin", output: "Access review", action: "Open users" },
      { title: "SACCO support escalations", copy: "Complaints raised by SACCO administrators, unresolved cases and escalation status.", owner: "Super Admin", output: "Support report", action: "Open complaints" },
      { title: "Compliance and audit", copy: "Regulatory consolidation, reconciliation exceptions, sensitive activity and role changes.", owner: "Super Admin", output: "Audit pack", action: "Open audit" }
    ];
  }
  return [
    { title: "Membership", copy: "Member register, KYC status, contacts, beneficiaries and branch distribution.", owner: "Secretary", output: "Excel / PDF", action: "Open members" },
    { title: "Savings", copy: "Savings products, member deposits, withdrawals and dormant account positions.", owner: "Treasurer", output: "Statement pack", action: "Open savings" },
    { title: "Shares", copy: "Share capital, member share accounts, contribution cycles and ownership totals.", owner: "Treasurer", output: "Share register", action: "Open shares" },
    { title: "Welfare", copy: "Welfare contributions, claims, approvals, payment status and fund exposure.", owner: "Committee", output: "Claims report", action: "Open welfare" },
    { title: "Loans", copy: "Applications, guarantors, repayments, arrears, PAR and portfolio balances.", owner: "Credit", output: "Portfolio report", action: "Open loans" },
    { title: "Accounting", copy: "Chart of accounts, expenses, assets, journals and trial-balance readiness.", owner: "Accountant", output: "Ledger pack", action: "Open accounting" },
    { title: "Governance", copy: "Meetings, resolutions, action owners and committee follow-up status.", owner: "Chairperson", output: "Governance pack", action: "Open governance" },
    { title: "Audit", copy: "User activity, approvals, reversals and high-risk operational events.", owner: "Auditor", output: "Audit pack", action: "Open audit" }
  ];
}

function reportReadinessPanel(consolidated) {
  const exceptions = Number(consolidated.reconciliationExceptions || 0) + Number(consolidated.unbalancedJournalEntries || 0);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Report readiness</h2>
          <p>Evidence checks before exporting board, regulator or management reports.</p>
        </div>
        <span class="status ${exceptions ? "pending" : "active"}">${exceptions ? "Review needed" : "Ready"}</span>
      </div>
      <div class="source-grid">
        ${mini("Ledger entries", consolidated.journalEntries || 0)}
        ${mini("Unbalanced journals", consolidated.unbalancedJournalEntries || 0)}
        ${mini("Reconciliation exceptions", consolidated.reconciliationExceptions || 0)}
        ${mini("Open complaints", consolidated.openComplaints || 0)}
        ${mini("Open resolutions", consolidated.openResolutions || 0)}
        ${mini("Compliance status", consolidated.complianceStatus || "review")}
      </div>
    </section>
  `;
}

function complaintsView() {
  const sourceRows = isPlatform() ? saccoSupportTickets() : dataRows("complaints");
  const rows = sourceRows.map((complaint) => ({
    ...complaint,
    tenantName: tenantName(complaint.tenantId),
    memberName: complaint.memberId ? memberName(complaint.memberId) : (isPlatform() ? "SACCO admin" : "SACCO-level case"),
    assignedOfficer: userName(complaint.assignedUserId),
    action: "complaint-detail",
    actionLabel: "Review",
    actionId: complaint.id
  }));
  const open = rows.filter((row) => !["closed", "resolved"].includes(normal(row.status)));
  const urgent = rows.filter((row) => normal(row.priority) === "urgent");
  const assigned = rows.filter((row) => row.assignedUserId);
  if (isPlatform()) {
    const tabs = [["list", t("complaintsFromSaccoAdmins")], ["detail", t("complaintReview")]];
    const tab = activeModuleTab("complaints", tabs);
    return `
      <div class="dashboard-grid">
        ${summary(t("complaintsFromSaccoAdmins"), open.length, "Open platform support cases", t("review"))}
        ${summary(t("urgentComplaints"), urgent.length, "Needs same-day action", "Escalate")}
        ${summary(t("inProgress"), rows.filter((row) => normal(row.status) === "in_progress").length, "Being handled", "Track")}
        ${summary(t("resolved"), rows.filter((row) => normal(row.status) === "resolved" || normal(row.status) === "closed").length, "Closed support cases", t("review"))}
      </div>
      ${moduleTabs("complaints", tabs, tab)}
      ${tab === "list" ? `
        ${filterToolbar("Search complaints by SACCO, category, priority, status or officer", "Export complaints", "Assign officer")}
        ${recordTable(t("complaintsFromSaccoAdmins"), rows, ["tenantName", "category", "subject", "assignedOfficer", "priority", "status", "createdAt"])}
      ` : ""}
      ${tab === "detail" ? (complaintDetailPanel(rows) || emptyState(t("complaintReview"), "Select a SACCO admin complaint from the list to review status and assignment.")) : ""}
    `;
  }
  const tabs = [["overview", "Complaint control"], ["capture", "Member complaint intake"], ["detail", "Complaint review"], ["list", "SACCO member complaint desk"]];
  const tab = activeModuleTab("complaints", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("Open complaints", open.length, "Member support workload", "Assign")}
      ${summary("Urgent complaints", urgent.length, "Needs same-day action", "Escalate")}
      ${summary("In progress", rows.filter((row) => normal(row.status) === "in_progress").length, "Being handled", "Track")}
      ${summary("Resolved", rows.filter((row) => normal(row.status) === "resolved" || normal(row.status) === "closed").length, "Closed support cases", "Review")}
    </div>
    ${moduleTabs("complaints", tabs, tab)}
    ${tab === "overview" ? complaintServiceControlPanel(rows, open, urgent, assigned) : ""}
    ${tab === "capture" ? complaintCapturePanel() : ""}
    ${tab === "detail" ? (complaintDetailPanel(rows) || emptyState("Complaint review", "Select a complaint from the list to review priority, assignment and closure.")) : ""}
    ${tab === "list" ? `
      ${filterToolbar("Search complaints by member, category, priority, status or officer", "New complaint", "Assign officer")}
      ${recordTable("SACCO member complaint desk", rows, ["memberName", "category", "subject", "assignedOfficer", "priority", "status", "createdAt"])}
    ` : ""}
  `;
}

function complaintServiceControlPanel(rows, open, urgent, assigned) {
  const memberLinked = rows.filter((row) => row.memberId).length;
  const unassigned = open.filter((row) => !row.assignedUserId).length;
  return rolePriorityPanel(isPlatform() ? "SACCO admin complaint control" : "Complaint service control", [
    ["Urgent queue", `${urgent.length} urgent complaint(s) need same-day follow-up.`, urgent.length ? "Escalate" : "Clear"],
    ["Assignment coverage", `${assigned.length} complaint(s) have a named officer; ${unassigned} open case(s) are unassigned.`, unassigned ? "Assign" : "Covered"],
    [isPlatform() ? "Platform scope" : "Member impact", isPlatform() ? "Platform receives complaints from SACCO administrators only. Member complaints stay inside each SACCO portal." : `${memberLinked} complaint(s) are linked to member records for traceable resolution.`, isPlatform() ? "SACCO admins only" : memberLinked ? "Traceable" : "SACCO-level"]
  ]);
}

function notificationsView() {
  const deliveries = dataRows("notifications").map((delivery) => ({
    ...delivery,
    tenantName: tenantName(delivery.tenantId),
    memberName: delivery.memberId ? memberName(delivery.memberId) : delivery.userId ? userName(delivery.userId) : "SACCO broadcast",
    event: delivery.eventType ? labelize(delivery.eventType) : delivery.title || "Notification",
    resource: delivery.resourceType ? `${labelize(delivery.resourceType)} ${delivery.resourceId || ""}`.trim() : "-",
    alertStatus: delivery.readAt ? "acknowledged" : delivery.notificationStatus || delivery.status,
    deliveryStatus: delivery.status || "pending",
    acknowledgedAt: delivery.readAt ? formatDateTime(delivery.readAt) : "-",
    action: notificationDeliveryAction(delivery),
    actionLabel: normal(delivery.status).includes("failed") && hasPermission("notifications:manage") ? "Retry" : "Acknowledge",
    actionId: normal(delivery.status).includes("failed") && hasPermission("notifications:manage") ? delivery.id : delivery.notificationId || delivery.id
  }));
  const securityAlerts = deliveries.filter((delivery) => normal(`${delivery.message} ${delivery.provider} ${delivery.channel}`).includes("login"));
  const unreadAlerts = deliveries.filter((delivery) => !delivery.readAt && normal(delivery.alertStatus).includes("unread"));
  const failedDeliveries = deliveries.filter((row) => normal(row.status).includes("failed"));
  const tabs = [["delivery-log", "Delivery log"], ["failed", "Failed"], ["unread", "Unread"], ["login-risk", "Login risk"], ["templates", "Templates"]];
  const tab = activeModuleTab("notifications", tabs);
  const tabDeliveries = tab === "login-risk"
    ? securityAlerts
    : tab === "failed"
      ? failedDeliveries
      : tab === "unread"
        ? unreadAlerts
        : deliveries;
  const visibleDeliveries = tab === "templates" ? [] : filterNotificationDeliveries(tabDeliveries);
  const bulkAcknowledgeIds = visibleDeliveries
    .filter((delivery) => delivery.notificationId && !delivery.readAt)
    .map((delivery) => delivery.notificationId)
    .filter((id, index, ids) => ids.indexOf(id) === index);
  const templates = dataRows("notificationTemplates").map((template) => ({
    ...template,
    tenantName: template.tenantId ? tenantName(template.tenantId) : "Global template",
    action: "template-detail",
    actionLabel: "Edit",
    actionId: template.id
  }));
  return `
    <div class="dashboard-grid">
      ${summary(t("deliveries"), deliveries.length, "SMS, email and in-app events", "Monitor")}
      ${summary(t("failedDeliveries"), failedDeliveries.length, "Provider exceptions", "Investigate")}
      ${summary(t("loginRiskAlerts"), securityAlerts.length, "In-app admin security alerts", t("review"))}
      ${summary(t("unreadAlerts"), unreadAlerts.length, "Need acknowledgement", "Clear")}
      ${summary(t("activeTemplates"), templates.filter((row) => normal(row.status) === "active").length, "Reusable message rules", "Edit")}
      ${summary(t("globalTemplates"), templates.filter((row) => !row.tenantId).length, "Platform defaults", t("review"))}
    </div>
    ${state.notificationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.notificationMessage)}</strong></div>` : ""}
    ${state.notificationError ? `<div class="notice warning"><strong>Notification action failed.</strong><span>${escapeHtml(state.notificationError)}</span></div>` : ""}
    ${notificationDeliveryControlPanel(deliveries, templates)}
    ${notificationProviderStatusPanel()}
    ${moduleTabs("notifications", tabs, tab)}
    ${tab !== "templates" ? `<section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(tabs.find(([id]) => id === tab)?.[1] || "Delivery log")}</h2>
          <p>${visibleDeliveries.length} delivery attempt(s) after filters. ${bulkAcknowledgeIds.length} visible unread alert(s) can be acknowledged.</p>
        </div>
        <button class="button secondary" type="button" data-notification-bulk-ack="${escapeHtml(bulkAcknowledgeIds.join(","))}" ${bulkAcknowledgeIds.length ? "" : "disabled"}>Acknowledge visible alerts</button>
      </div>
    </section>` : ""}
    ${tab !== "templates" ? notificationDeliveryFilters(deliveries) : ""}
    ${tab !== "templates" ? recordTable(`Notification delivery monitor - ${tabs.find(([id]) => id === tab)?.[1] || "Delivery log"}`, visibleDeliveries, ["tenantName", "event", "channel", "provider", "recipient", "deliveryStatus", "alertStatus", "message", "resource", "sentAt", "createdAt"]) : ""}
    ${tab === "templates" ? `${notificationTemplatePanel()}${notificationTemplateDetailPanel(templates)}${recordTable("Notification templates", templates, ["tenantName", "eventType", "channel", "title", "status", "updatedAt"])}` : ""}
  `;
}

function notificationDeliveryControlPanel(deliveries, templates) {
  const failed = deliveries.filter((row) => normal(row.status).includes("failed"));
  const activeTemplates = templates.filter((row) => normal(row.status) === "active");
  const channels = ["sms", "email", "in_app"];
  const missingChannels = channels.filter((channel) => !activeTemplates.some((template) => normal(template.channel) === channel));
  return rolePriorityPanel(t("notificationDeliveryControl"), [
    ["Delivery exceptions", `${failed.length} failed notification(s) require provider or recipient review.`, failed.length ? "Investigate" : "Clear"],
    ["Template coverage", `${activeTemplates.length} active template(s) are available across ${uniqueCount(activeTemplates, "channel")} channel(s).`, missingChannels.length ? "Incomplete" : "Ready"],
    ["Missing channels", missingChannels.length ? `No active template for ${missingChannels.map(labelize).join(", ")}.` : "SMS, email and in-app template coverage is ready.", missingChannels.length ? "Configure" : "Ready"]
  ]);
}

function notificationProviderStatusPanel() {
  const rows = state.notificationProviderStatus || [];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Notification provider status</h2>
          <p>Check AfroSMS credits and Gmail SMTP readiness before retrying failed SMS or email deliveries.</p>
        </div>
        <button class="button secondary" type="button" data-action="check-notification-provider-status">Check provider status</button>
      </div>
      ${state.notificationProviderStatusCheckedAt ? `<p class="helper-text">Last checked ${escapeHtml(formatDateTime(state.notificationProviderStatusCheckedAt))}</p>` : ""}
      ${rows.length ? `<div class="mini-grid">${rows.map((row) => mini(
        `${labelize(row.channel)} - ${labelize(row.provider)}`,
        `${labelize(row.status)}${row.balance ? `, ${row.balance} SMS credits` : ""}`
      )).join("")}</div>` : emptyState("Provider status not checked", "Use Check provider status to verify AfroSMS credits and Gmail readiness.")}
      ${rows.some((row) => normal(row.status) !== "ready") ? `<div class="notice warning"><strong>Provider issue detected.</strong><span>${escapeHtml(rows.filter((row) => normal(row.status) !== "ready").map((row) => row.message).join(" "))}</span></div>` : ""}
    </section>
  `;
}

function notificationProviderRiskRows() {
  const rows = state.notificationProviderStatus || [];
  return rows
    .map((row) => {
      const balance = Number(row.balance);
      const unavailable = normal(row.status) !== "ready";
      const lowBalance = row.channel === "sms" && Number.isFinite(balance) && balance < 100;
      if (!unavailable && !lowBalance) return null;
      return {
        title: `${labelize(row.channel)} provider`,
        provider: labelize(row.provider),
        severity: unavailable ? "Critical" : "Warning",
        status: unavailable ? "Unavailable" : "Low credits",
        checkedAt: row.checkedAt || state.notificationProviderStatusCheckedAt || state.lastSync,
        message: unavailable ? row.message : `${balance} SMS credits remaining.`
      };
    })
    .filter(Boolean);
}

function notificationProviderRiskPanel() {
  const rows = notificationProviderRiskRows();
  if (!rows.length) return "";
  return `
    <section class="notice warning">
      <strong>Notification provider attention needed.</strong>
      <span>${escapeHtml(rows.map((row) => `${row.title}: ${row.status}`).join("; "))}</span>
      ${canAccessView("notifications") ? `<button class="button secondary" type="button" data-summary-view="notifications">Open notifications</button>` : ""}
    </section>
  `;
}

function notificationDeliveryAction(delivery) {
  if (normal(delivery.status).includes("failed") && hasPermission("notifications:manage")) return "notification-retry";
  if (delivery.notificationId && !delivery.readAt) return "notification-acknowledge";
  return "none";
}

function notificationDeliveryFilters(deliveries) {
  const filters = state.notificationFilters || {};
  const statuses = uniqueValues(deliveries, "status");
  const channels = uniqueValues(deliveries, "channel");
  const providers = uniqueValues(deliveries, "provider");
  const tenantOptions = uniqueValues(deliveries, "tenantId").map((tenantId) => [tenantId, tenantName(tenantId)]);
  return `
    <section class="filter-toolbar notification-filters">
      <label><span>Status</span><select data-notification-filter="status">
        ${selectOption("all", "All statuses", filters.status)}
        ${statuses.map((status) => selectOption(status, labelize(status), filters.status)).join("")}
      </select></label>
      <label><span>Channel</span><select data-notification-filter="channel">
        ${selectOption("all", "All channels", filters.channel)}
        ${channels.map((channel) => selectOption(channel, labelize(channel), filters.channel)).join("")}
      </select></label>
      <label><span>Provider</span><select data-notification-filter="provider">
        ${selectOption("all", "All providers", filters.provider)}
        ${providers.map((provider) => selectOption(provider, labelize(provider), filters.provider)).join("")}
      </select></label>
      <label><span>SACCO</span><select data-notification-filter="tenantId">
        ${selectOption("all", isPlatform() ? "All SACCOs" : "Current SACCO", filters.tenantId)}
        ${tenantOptions.map(([tenantId, name]) => selectOption(tenantId, name, filters.tenantId)).join("")}
      </select></label>
      <label><span>Date</span><input type="date" value="${escapeHtml(filters.date || "")}" data-notification-filter="date"></label>
      <button class="button secondary" type="button" data-action="clear-notification-filters">Clear filters</button>
    </section>
  `;
}

function filterNotificationDeliveries(deliveries) {
  const filters = state.notificationFilters || {};
  return (deliveries || []).filter((delivery) => {
    if (filters.status && filters.status !== "all" && normal(delivery.status) !== normal(filters.status)) return false;
    if (filters.channel && filters.channel !== "all" && normal(delivery.channel) !== normal(filters.channel)) return false;
    if (filters.provider && filters.provider !== "all" && normal(delivery.provider) !== normal(filters.provider)) return false;
    if (filters.tenantId && filters.tenantId !== "all" && delivery.tenantId !== filters.tenantId) return false;
    if (filters.date && String(delivery.createdAt || delivery.sentAt || "").slice(0, 10) !== filters.date) return false;
    return true;
  });
}

function uniqueValues(rows, key) {
  return [...new Set((rows || []).map((row) => row[key]).filter((value) => value !== undefined && value !== null && String(value).trim()))].sort((a, b) => String(a).localeCompare(String(b)));
}

function selectOption(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${String(selected || "all") === String(value) ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function usersView() {
  const platformOnly = isPlatform();
  const users = platformOnly ? dataRows("users").filter((user) => user.tenantId === "tenant_platform") : dataRows("users");
  const canCreate = hasPermission("users:create") || hasPermission("roles:create");
  const rows = users.map((user) => ({ ...staffAccessRow(user, platformOnly), action: "user-detail", actionLabel: "Manage access", actionId: user.id }));
  const roles = userRoleOptions(platformOnly);
  const listPanel = recordTable(platformOnly ? "Platform administrator list" : "SACCO staff access list", rows, ["fullName", "email", "phone", "role", "mfa", "activeSessions", "accessPurpose", "moduleScope", "lastLogin", "status"]);
  const detailPanel = userDetailPanel(users, canCreate) || emptyState("User detail and role assignment", "Select Manage access from the administrator list to review roles and module access.");
  if (platformOnly) {
    return `
      <div class="dashboard-grid">
        ${summary(t("platformUsers"), users.length, "Administrators only", t("review"))}
        ${summary(t("activeUsers"), users.filter((user) => normal(user.status) === "active").length, "Can sign in", "Monitor")}
        ${summary(t("configuredRoles"), roles.length, "Available assignments", "Manage")}
        ${summary(t("roleCoverage"), roleCoverage(users, roles), "Users with assigned roles", "Audit")}
      </div>
      ${userManagementTabs(canCreate)}
      ${platformUserTabContent({
        activeTab: state.userAdminTab,
        canCreate,
        addPanel: canCreate ? addUserPanel(true) : emptyState(t("addPlatformUser"), "Only Platform Super Admin users can add platform administrators."),
        detailPanel,
        coveragePanel: roleCoveragePanel(users, roles, true),
        listPanel,
        permissionPanel: permissionMatrix()
      })}
    `;
  }
  return `
    <div class="dashboard-grid">
      ${summary("SACCO staff users", users.length, "Staff accounts only, not members", "Review")}
      ${summary("Active users", users.filter((user) => normal(user.status) === "active").length, "Can sign in", "Monitor")}
      ${summary("Configured roles", roles.length, "Available assignments", "Manage")}
      ${summary("Role coverage", roleCoverage(users, roles), "Users with assigned roles", "Audit")}
    </div>
    ${!platformOnly ? saccoStaffAccessGuide(roles) : ""}
    ${canCreate ? addUserPanel(platformOnly) : ""}
    ${userDetailPanel(users, canCreate)}
    ${roleCoveragePanel(users, roles, platformOnly)}
    ${listPanel}
    ${permissionMatrix()}
  `;
}

function userManagementTabs(canCreate) {
  const tabs = [
    ["add", t("addPlatformUser"), canCreate],
    ["detail", t("userDetailRoleAssignment"), true],
    ["coverage", t("platformRoleCoverage"), true],
    ["list", t("platformAdministratorList"), true],
    ["matrix", t("permissionMatrix"), true]
  ];
  if (!tabs.some(([id]) => id === state.userAdminTab)) state.userAdminTab = "list";
  if (state.userAdminTab === "add" && !canCreate) state.userAdminTab = "list";
  return `
    <section class="panel compact-panel">
      <div class="tabs management-tabs">
        ${tabs.map(([id, label, enabled]) => `<button class="${state.userAdminTab === id ? "active" : ""}" type="button" data-user-tab="${id}" ${enabled ? "" : "disabled"}>${label}</button>`).join("")}
      </div>
    </section>
  `;
}

function platformUserTabContent({ activeTab, addPanel, detailPanel, coveragePanel, listPanel, permissionPanel }) {
  if (activeTab === "add") return addPanel;
  if (activeTab === "detail") return detailPanel;
  if (activeTab === "coverage") return coveragePanel;
  if (activeTab === "matrix") return permissionPanel;
  return listPanel;
}

function normalizedAuditRows() {
  return dataRows("auditEvents").map((event) => ({
    ...event,
    tenantName: tenantName(event.tenantId),
    actor: event.actorName || userName(event.actorUserId),
    module: event.resourceType || event.module || "system",
    recordReference: event.resourceId || event.recordReference || event.recordId || "",
    category: auditCategory(event),
    riskLevel: auditRiskLevel(event),
    result: event.result || "Recorded"
  }));
}

function loginRiskEvents() {
  return normalizedAuditRows().filter((event) => {
    const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
    return text.includes("login") && ["failed", "blocked", "invalid"].some((word) => text.includes(word));
  });
}

function loginRiskSummaryPanel(platformScope) {
  const events = loginRiskEvents();
  const blocked = events.filter((event) => normal(event.action).includes("blocked"));
  const failed = events.filter((event) => normal(event.action).includes("failed"));
  const staff = events.filter((event) => normal(event.resourceType || event.module).includes("auth_login"));
  const members = events.filter((event) => normal(event.resourceType || event.module).includes("member_login"));
  const rows = events.slice(0, 6).map((event) => ({
    createdAt: formatDateTime(event.createdAt),
    sacco: event.tenantName,
    portal: normal(event.resourceType || event.module).includes("member") ? "Member" : "Staff",
    identity: event.recordReference || "Hidden",
    action: event.action,
    ipAddress: event.ipAddress || "-"
  }));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${platformScope ? "Platform login risk" : "SACCO login risk"}</h2>
          <p>${platformScope ? "Failed and blocked sign-in attempts across platform and SACCO portals." : "Failed and blocked sign-in attempts affecting this SACCO."}</p>
        </div>
        <span class="status ${events.length ? "pending" : "active"}">${events.length ? "Review" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Risk events", events.length)}
        ${mini("Blocked attempts", blocked.length)}
        ${mini("Failed credentials", failed.length)}
        ${mini(platformScope ? "SACCOs affected" : "IP addresses", platformScope ? uniqueCount(events, "tenantId") : uniqueCount(events, "ipAddress"))}
        ${mini("Staff portal", staff.length)}
        ${mini("Member portal", members.length)}
      </div>
      ${recordTable("Recent login risk events", rows, ["createdAt", "sacco", "portal", "identity", "action", "ipAddress"])}
    </section>
  `;
}

function friendlyUserError(error, platformOnly = isPlatform()) {
  const message = error?.message || String(error || "Could not complete request.");
  const lower = normal(message);
  if (lower.includes("user with that email") && lower.includes("exists")) {
    return platformOnly
      ? "A platform administrator with that email already exists. Open the Platform administrator list to manage that user, or use a different email."
      : "A SACCO staff user with that email already exists. Open the SACCO staff access list to manage that user, or use a different email.";
  }
  return message.replace(/\btenants\b/gi, platformOnly ? "platform accounts" : "SACCOs").replace(/\btenant\b/gi, platformOnly ? "platform account" : "SACCO");
}

function auditView() {
  const rows = normalizedAuditRows();
  const sensitive = rows.filter((event) => event.riskLevel !== "Normal");
  const highRisk = rows.filter((event) => event.riskLevel === "High");
  const loginRisks = loginRiskEvents();
  const approvals = rows.filter((event) => event.category === "Approvals");
  const reversals = rows.filter((event) => event.category === "Reversals");
  const access = rows.filter((event) => event.category === "Access control");
  const finance = rows.filter((event) => event.category === "Financial activity");
  const tabs = [["overview", t("auditControl")], ["evidence", isPlatform() ? t("platformAuditEvidence") : t("saccoAuditEvidence")], ["sensitive", t("sensitiveAuditQueue")], ["trail", isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail")]];
  const tab = activeModuleTab("audit", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("auditEvents"), rows.length, "Immutable activity trail", "Inspect")}
      ${summary(t("highRiskEvents"), highRisk.length, "Roles, sessions and reversals", t("review"))}
      ${summary(t("loginRiskEvents"), loginRisks.length, "Failed and blocked sign-ins", t("review"))}
      ${summary(isPlatform() ? "SACCOs affected" : t("actorsInvolved"), isPlatform() ? uniqueCount(rows, "tenantId") : uniqueCount(rows, "actorUserId"), isPlatform() ? "Across visible SACCOs" : "Within this SACCO", "Filter")}
      ${summary(t("actors"), uniqueCount(rows, "actorUserId"), "Users and system actions", "Trace")}
    </div>
    ${moduleTabs("audit", tabs, tab)}
    ${tab === "overview" ? auditControlPanel(rows, highRisk, approvals, reversals, access, finance) : ""}
    ${tab === "evidence" ? `
      ${filterToolbar("Search audit logs by SACCO, actor, action, module, IP address or record ID", "Export audit log", "Print report")}
      ${auditEvidencePanel(rows, sensitive, approvals, reversals, access, finance)}
    ` : ""}
    ${tab === "sensitive" ? recordTable("Sensitive audit queue", sensitive, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "riskLevel"]) : ""}
    ${tab === "trail" ? recordTable(isPlatform() ? t("platformAuditTrail") : t("saccoAuditTrail"), rows, ["createdAt", "tenantName", "actor", "category", "action", "module", "recordReference", "ipAddress", "result"]) : ""}
  `;
}

function auditControlPanel(rows, highRisk, approvals, reversals, access, finance) {
  return rolePriorityPanel(t("auditEvidenceControl"), [
    ["High-risk review", `${highRisk.length} event(s) involve sessions, roles, reversals or sensitive state changes.`, highRisk.length ? "Review" : "Clear"],
    ["Decision evidence", `${approvals.length} approval event(s) and ${reversals.length} reversal event(s) are available for follow-up.`, approvals.length || reversals.length ? "Trace" : "Empty"],
    ["Access and finance", `${access.length} access event(s) and ${finance.length} finance event(s) can be filtered for audit review.`, rows.length ? "Available" : "No events"]
  ]);
}

function auditEvidencePanel(rows, sensitive, approvals, reversals, access, finance) {
  const recent = rows[0]?.createdAt || "No event yet";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${isPlatform() ? "Platform audit evidence" : "SACCO audit evidence"}</h2>
          <p>${isPlatform() ? "System-wide oversight for administrator actions, SACCO account changes and sensitive access." : "Read-only evidence for SACCO approvals, finance actions, reversals, role changes and session activity."}</p>
        </div>
        <span class="status ${sensitive.length ? "pending" : "active"}">${sensitive.length ? "Review queue" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Latest event", recent)}
        ${mini("Approval events", approvals.length)}
        ${mini("Reversal events", reversals.length)}
        ${mini("Access events", access.length)}
        ${mini("Finance events", finance.length)}
        ${mini("Sensitive queue", sensitive.length)}
      </div>
    </section>
    <div class="report-grid">
      ${auditCategoryCard("Approvals", approvals, "Maker-checker decisions, status changes and review outcomes.")}
      ${auditCategoryCard("Reversals", reversals, "Financial corrections that require follow-up evidence.")}
      ${auditCategoryCard("Access control", access, "Logins, sessions, password, role and permission changes.")}
      ${auditCategoryCard("Financial activity", finance, "Transactions, repayments, expenses, assets and contribution setup.")}
    </div>
  `;
}

function auditCategoryCard(title, rows, copy) {
  const latest = rows[0]?.createdAt || "No events";
  return `
    <article class="report-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      <div class="mini-grid">
        ${mini("Events", rows.length)}
        ${mini("Latest", latest)}
      </div>
      <button class="button secondary" type="button">Review</button>
    </article>
  `;
}

function moduleBlueprint(view) {
  if (view === "savings") return savingsView();
  if (view === "shares") return sharesView();
  if (view === "welfare") return welfareView();
  if (view === "accounting") return accountingView();
  if (view === "reconciliation") return reconciliationView();
  if (view === "governance") return governanceView();
  if (view === "settings") return settingsView();
  if (view === "guarantors") return guarantorsView();
  const labels = {
  };
  const item = labels[view] || ["Module", ["Search", "Filters", "Tables", "Actions"]];
  return tabsCard(item[0], item[1]);
}

function savingsView() {
  const products = productsByType("savings");
  const accounts = accountsByType("savings");
  const members = dataRows("members");
  const activeProducts = products.filter((row) => normal(row.status) === "active");
  const monthlyPerformance = saccoMonthlyPerformanceRows();
  const tabs = [["overview", t("savingsControl")], ["monthly", t("monthlyPerformance")], ["products", t("savingsProductSetup")], ["accounts", t("openSavingsAccount")], ["lists", t("savingsRecords")]];
  const tab = activeModuleTab("savings", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("savingsProducts"), products.length, "Configured products", "Manage")}
      ${summary(t("savingsAccounts"), accounts.length, "Member accounts", t("open"))}
      ${summary(t("activeProducts"), activeProducts.length, "Available to members", t("review"))}
      ${summary(t("minimumContribution"), money.format(sum(products, "contributionAmount", "minimumBalance")), "Configured product totals", "View")}
      ${summary(t("savingsBalances"), money.format(sum(members, "savingsBalance", "savings")), "Member ledger total", "Statements")}
    </div>
    ${moduleTabs("savings", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("savingsOperationsControl"), [
      ["Product setup", `${activeProducts.length} active savings product(s) are available for account opening.`, activeProducts.length ? "Ready" : "Setup"],
      ["Member accounts", `${accounts.length} savings account(s) are open for active members.`, accounts.length ? "Active" : "Open"],
      ["Contribution flow", "Savings deposits post through Transactions and member mobile payments.", "Connected"]
    ]) : ""}
    ${tab === "monthly" ? `
      ${paymentRoutePanel()}
      ${saccoMonthlyPerformancePanel(monthlyPerformance)}
      ${recordTable("Member monthly performance", monthlyPerformance, ["month", "memberName", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits"])}
    ` : ""}
    ${tab === "products" ? financialProductPanel("savings") : ""}
    ${tab === "accounts" ? financialAccountPanel("savings", products) : ""}
    ${tab === "lists" ? `
      ${recordTable("Savings product list", products, ["name", "code", "contributionAmount", "minimumBalance", "interestRate", "status"])}
      ${recordTable("Savings accounts", accounts, ["membershipNo", "memberName", "productName", "accountNo", "status", "openedAt"])}
    ` : ""}
  `;
}

function sharesView() {
  const products = productsByType("share");
  const accounts = accountsByType("share");
  const members = dataRows("members");
  const activeProducts = products.filter((row) => normal(row.status) === "active");
  const tabs = [["overview", t("sharesControl")], ["products", t("sharesProductSetup")], ["accounts", t("openSharesAccount")], ["register", t("shareRegister")]];
  const tab = activeModuleTab("shares", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("shareProducts"), products.length, "Share capital products", "Manage")}
      ${summary(t("shareAccounts"), accounts.length, "Member share ledgers", t("open"))}
      ${summary(t("activeMembers"), uniqueCount(accounts, "memberId"), "Holding shares", "View")}
      ${summary(t("shareContributionSetup"), money.format(sum(products, "contributionAmount")), "Configured value", t("review"))}
      ${summary(t("shareBalances"), money.format(sum(members, "sharesBalance", "shares")), "Member share capital", "Register")}
    </div>
    ${moduleTabs("shares", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("sharesCapitalControl"), [
      ["Product setup", `${activeProducts.length} active share product(s) define contribution rules.`, activeProducts.length ? "Ready" : "Setup"],
      ["Share register", `${accounts.length} member share account(s) are available for reporting.`, accounts.length ? "Active" : "Open"],
      ["Contribution flow", "Share purchases post through Transactions and member mobile payments.", "Connected"]
    ]) : ""}
    ${tab === "products" ? financialProductPanel("shares") : ""}
    ${tab === "accounts" ? financialAccountPanel("shares", products) : ""}
    ${tab === "register" ? `
      ${recordTable("Share product list", products, ["name", "code", "contributionAmount", "minimumBalance", "status"])}
      ${recordTable("Share register", accounts, ["membershipNo", "memberName", "productName", "accountNo", "status", "openedAt"])}
    ` : ""}
  `;
}

function welfareView() {
  const products = productsByType("welfare");
  const claims = dataRows("welfareClaims");
  const accounts = accountsByType("welfare");
  const submitted = claims.filter((row) => ["submitted", "pending", "pending_approval"].some((word) => normal(row.status).includes(word)));
  const approved = claims.filter((row) => normal(row.status) === "approved");
  const paid = claims.filter((row) => normal(row.status) === "paid");
  const tabs = [["overview", t("welfareControl")], ["products", t("welfareProductSetup")], ["accounts", t("openWelfareAccount")], ["claims", t("welfareClaims")], ["detail", t("welfareClaimDecision")]];
  const tab = activeModuleTab("welfare", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("welfareProducts"), products.length, "Contribution rules", "Manage")}
      ${summary(t("welfareAccounts"), accounts.length, "Member welfare ledgers", t("open"))}
      ${summary(t("claims"), claims.length, "Submitted claims", t("open"))}
      ${summary(t("pendingClaims"), submitted.length, "Decision queue", t("review"))}
      ${summary(t("approvedForPayment"), approved.length, "Payment queue", "Pay")}
      ${summary(t("paidClaims"), money.format(sum(paid, "amount")), "Settled welfare support", "Report")}
    </div>
    ${moduleTabs("welfare", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("welfareFundControl"), [
      ["Contribution setup", `${products.length} welfare product(s) and ${accounts.length} welfare account(s) support member balances.`, products.length && accounts.length ? "Ready" : "Setup"],
      ["Claim decisions", `${submitted.length} submitted claim(s) need approval or rejection.`, submitted.length ? "Pending" : "Clear"],
      ["Claim payments", `${approved.length} approved claim(s) are ready for payment if member welfare balance is sufficient.`, approved.length ? "Ready" : "Clear"]
    ]) : ""}
    ${tab === "products" ? financialProductPanel("welfare") : ""}
    ${tab === "accounts" ? financialAccountPanel("welfare", products) : ""}
    ${tab === "claims" ? `
      ${welfareClaimPanel()}
      ${recordTable("Welfare product list", products, ["name", "code", "contributionAmount", "status"])}
      ${recordTable("Welfare claims", claims.map((claim) => ({ ...claim, action: "welfare-claim-detail", actionLabel: "Review", actionId: claim.id })), ["membershipNo", "memberName", "claimType", "amount", "channel", "reference", "status", "submittedAt"])}
    ` : ""}
    ${tab === "detail" ? (welfareClaimDetailPanel(claims) || emptyState("Welfare claim decision", "Select a welfare claim from the list to approve, reject or pay.")) : ""}
  `;
}

function financialProductPanel(type) {
  const canCreate = hasPermission("transactions:create");
  const products = productsByType(type === "shares" ? "share" : type);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialProductTitle(type)}</h2>
          <p>Create ${labelize(type).toLowerCase()} products for this SACCO. Product codes must be unique per SACCO.</p>
        </div>
        <span class="status ${products.length ? "active" : "pending"}">${products.length ? "Configured" : "Setup needed"}</span>
      </div>
      ${state.productFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.productFormMessage)}</strong></div>` : ""}
      ${state.productFormError ? `<div class="notice warning"><strong>Product setup failed.</strong><span>${escapeHtml(state.productFormError)}</span></div>` : ""}
      <form class="form-grid" data-product-form="${escapeHtml(type)}">
        <input type="hidden" data-product-field="tenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <input type="hidden" data-product-field="productType" value="${escapeHtml(type)}">
        <label><span>Code</span><input data-product-field="code" required placeholder="${type.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}" ${canCreate ? "" : "disabled"}></label>
        <label><span>Name</span><input data-product-field="name" required placeholder="${labelize(type)} product name" ${canCreate ? "" : "disabled"}></label>
        <label><span>Contribution amount</span><input data-product-field="contributionAmount" type="number" min="0" step="1" value="${type === "shares" ? "5000" : "10000"}" ${canCreate ? "" : "disabled"}></label>
        <label><span>Minimum balance</span><input data-product-field="minimumBalance" type="number" min="0" step="1" value="0" ${canCreate ? "" : "disabled"}></label>
        <label><span>Interest rate</span><input data-product-field="interestRate" type="number" min="0" step="0.01" value="0" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Create ${labelize(type)} product</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function financialAccountPanel(type, products) {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members").filter((member) => normal(member.status) === "active");
  const accounts = accountsByType(type === "shares" ? "share" : type);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${financialAccountTitle(type)}</h2>
          <p>Link an active member to a configured ${labelize(type).toLowerCase()} product. Duplicate member-product accounts are rejected by the backend.</p>
        </div>
        <span class="status ${products.length && members.length ? "active" : "pending"}">${accounts.length} account(s)</span>
      </div>
      ${state.accountFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.accountFormMessage)}</strong></div>` : ""}
      ${state.accountFormError ? `<div class="notice warning"><strong>Account opening failed.</strong><span>${escapeHtml(state.accountFormError)}</span></div>` : ""}
      <form class="form-grid" data-account-form="${escapeHtml(type)}">
        <input type="hidden" data-account-field="tenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <input type="hidden" data-account-field="accountType" value="${escapeHtml(type)}">
        <label><span>Member</span><select data-account-field="memberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Product</span><select data-account-field="productId" ${canCreate ? "" : "disabled"}>${products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.code)} - ${escapeHtml(product.name)}</option>`).join("")}</select></label>
        <label><span>Account number</span><input data-account-field="accountNo" placeholder="Auto if blank" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button secondary" type="submit">Open ${labelize(type)} account</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function welfareClaimPanel() {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members").filter((member) => normal(member.status) === "active");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Welfare claim submission</h2>
          <p>Submit member welfare claims for approval and payment.</p>
        </div>
      </div>
      ${state.welfareClaimMessage ? `<div class="notice compact"><strong>${escapeHtml(state.welfareClaimMessage)}</strong></div>` : ""}
      ${state.welfareClaimError ? `<div class="notice warning"><strong>Welfare claim failed.</strong><span>${escapeHtml(state.welfareClaimError)}</span></div>` : ""}
      <form id="welfareClaimForm" class="form-grid">
        <input type="hidden" id="newWelfareTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newWelfareMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Claim type</span><input id="newWelfareClaimType" required value="medical" ${canCreate ? "" : "disabled"}></label>
        <label><span>Amount</span><input id="newWelfareAmount" type="number" min="1" step="1" value="50000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Reference</span><input id="newWelfareReference" placeholder="Auto if blank" ${canCreate ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><textarea id="newWelfareDescription" placeholder="Claim reason and supporting details" ${canCreate ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit welfare claim</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function welfareClaimDetailPanel(claims) {
  const claim = claims.find((item) => item.id === state.selectedWelfareClaimId);
  if (!claim) return "";
  const canApprove = hasPermission("transactions:approve");
  const canPost = hasPermission("accounting:post");
  const submitted = ["submitted", "pending", "pending_approval"].some((word) => normal(claim.status).includes(word));
  const payable = normal(claim.status) === "approved";
  const paid = normal(claim.status) === "paid";
  const member = dataRows("members").find((item) => item.id === claim.memberId) || {};
  const welfareBalance = Number(member.welfareBalance || claim.welfareBalance || 0);
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Welfare claim decision</h2>
          <p>${escapeHtml(claim.reference || claim.id)} - ${escapeHtml(claim.memberName || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-welfare-claim-detail">Close</button>
      </div>
      ${state.selectedWelfareClaimMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedWelfareClaimMessage)}</strong></div>` : ""}
      ${state.selectedWelfareClaimError ? `<div class="notice warning"><strong>Welfare action failed.</strong><span>${escapeHtml(state.selectedWelfareClaimError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Claim amount", money.format(claim.amount || 0), "Requested welfare support", "Review")}
        ${summary("Member welfare balance", money.format(welfareBalance), "Available contribution balance", "Check")}
        ${summary("Decision state", payable ? "Approved" : paid ? "Paid" : submitted ? "Submitted" : labelize(claim.status || "Review"), "Approval workflow", "Decide")}
        ${summary("Payment readiness", payable ? "Ready to pay" : paid ? "Paid" : "Approve first", "Backend validates balance", "Pay")}
      </div>
      <div class="source-grid">
        ${mini("Member", `${claim.membershipNo || ""} ${claim.memberName || ""}`)}
        ${mini("Amount", money.format(claim.amount || 0))}
        ${mini("Claim type", claim.claimType)}
        ${mini("Status", claim.status)}
        ${mini("Paid channel", claim.channel)}
        ${mini("Submitted", claim.submittedAt)}
      </div>
      ${rolePriorityPanel("Welfare claim checklist", [
        ["Eligibility", "Only active members can receive welfare claims.", "Checked"],
        ["Decision", submitted ? "Approve or reject the submitted claim with a reason where needed." : "Decision step is complete or unavailable.", submitted ? "Pending" : "Done"],
        ["Payment", payable ? "Approved claim can be paid through cash, mobile money or bank if balance is sufficient." : "Payment is locked until approval.", payable ? "Ready" : "Locked"]
      ])}
      <form id="welfareClaimDecisionForm" class="form-grid">
        <input type="hidden" id="selectedWelfareClaimId" value="${escapeHtml(claim.id)}">
        <label class="wide"><span>Decision reason</span><input id="welfareClaimReason" placeholder="Required for rejection"></label>
        <label><span>Payment channel</span><select id="welfarePaymentChannel"><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option></select></label>
        <div class="form-actions inline">
          ${canApprove ? `<button class="button secondary" type="button" data-welfare-claim-action="approve" ${submitted ? "" : "disabled"}>Approve claim</button><button class="button ghost" type="button" data-welfare-claim-action="reject" ${submitted ? "" : "disabled"}>Reject claim</button>` : ""}
          ${canPost ? `<button class="button primary" type="button" data-welfare-claim-action="pay" ${payable ? "" : "disabled"}>Pay claim</button>` : ""}
          ${!canApprove && !canPost ? `<span class="status pending">View only</span>` : ""}
        </div>
      </form>
    </section>
  `;
}

function financialProductTitle(type) {
  if (type === "savings") return "Savings product setup";
  if (type === "shares") return "Shares product setup";
  if (type === "welfare") return "Welfare product setup";
  return `${labelize(type)} product setup`;
}

function financialAccountTitle(type) {
  if (type === "savings") return "Open Savings account";
  if (type === "shares") return "Open Shares account";
  if (type === "welfare") return "Open Welfare account";
  return `Open ${labelize(type)} account`;
}

function expenseCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const expenseAccounts = dataRows("chartOfAccounts").filter((account) => normal(account.type) === "expense");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Expense capture</h2>
          <p>Post operating expenses into the SACCO accounting ledger.</p>
        </div>
      </div>
      ${state.expenseFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.expenseFormMessage)}</strong></div>` : ""}
      ${state.expenseFormError ? `<div class="notice warning"><strong>Expense posting failed.</strong><span>${escapeHtml(state.expenseFormError)}</span></div>` : ""}
      <form id="expenseForm" class="form-grid">
        <input type="hidden" id="newExpenseTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Expense account</span><select id="newExpenseAccountCode" ${canPost ? "" : "disabled"}>${expenseAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} - ${escapeHtml(account.name)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="newExpenseAmount" type="number" min="1" step="1" value="25000" ${canPost ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="newExpenseChannel" ${canPost ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Expense date</span><input id="newExpenseDate" type="date" value="${new Date().toISOString().slice(0, 10)}" ${canPost ? "" : "disabled"}></label>
        <label><span>Reference</span><input id="newExpenseReference" placeholder="Auto if blank" ${canPost ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><input id="newExpenseDescription" placeholder="Expense purpose" ${canPost ? "" : "disabled"}></label>
        <div class="form-actions inline">${canPost ? `<button class="button primary" type="submit">Post expense</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function assetCapturePanel() {
  const canPost = hasPermission("accounting:post");
  const assetAccounts = dataRows("chartOfAccounts").filter((account) => normal(account.type) === "asset" && account.code !== "1310");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Fixed asset register</h2>
          <p>Register SACCO assets with depreciation inputs and acquisition journals.</p>
        </div>
      </div>
      ${state.assetFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.assetFormMessage)}</strong></div>` : ""}
      ${state.assetFormError ? `<div class="notice warning"><strong>Asset registration failed.</strong><span>${escapeHtml(state.assetFormError)}</span></div>` : ""}
      <form id="assetForm" class="form-grid">
        <input type="hidden" id="newAssetTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Asset name</span><input id="newAssetName" required placeholder="Laptop, printer, motorcycle..." ${canPost ? "" : "disabled"}></label>
        <label><span>Category</span><select id="newAssetCategory" ${canPost ? "" : "disabled"}>${assetCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Asset account</span><select id="newAssetAccountCode" ${canPost ? "" : "disabled"}>${assetAccounts.map((account) => `<option value="${escapeHtml(account.code)}">${escapeHtml(account.code)} - ${escapeHtml(account.name)}</option>`).join("")}</select></label>
        <label><span>Cost</span><input id="newAssetCost" type="number" min="1" step="1" value="1500000" ${canPost ? "" : "disabled"}></label>
        <label><span>Salvage value</span><input id="newAssetSalvageValue" type="number" min="0" step="1" value="0" ${canPost ? "" : "disabled"}></label>
        <label><span>Useful life months</span><input id="newAssetLifeMonths" type="number" min="1" step="1" value="36" ${canPost ? "" : "disabled"}></label>
        <label><span>Purchase date</span><input id="newAssetPurchaseDate" type="date" value="${new Date().toISOString().slice(0, 10)}" ${canPost ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="newAssetChannel" ${canPost ? "" : "disabled"}><option value="bank">Bank</option><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Reference</span><input id="newAssetReference" placeholder="Auto if blank" ${canPost ? "" : "disabled"}></label>
        <label><span>Location</span><input id="newAssetLocation" placeholder="Branch or office" ${canPost ? "" : "disabled"}></label>
        <div class="form-actions inline">${canPost ? `<button class="button primary" type="submit">Register asset</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function assetCategoryOptions() {
  return ["equipment", "furniture", "vehicle", "building", "technology", "other"];
}

function guarantorsView() {
  const requests = dataRows("guarantorRequests").map((request) => ({ ...request, memberName: memberName(request.memberId) }));
  const loans = loanRows().filter((loan) => normal(loan.stage).includes("guarant") || normal(loan.guarantorReadiness).includes("guarant"));
  const rows = requests.length ? requests : loans;
  const pending = rows.filter((row) => normal(row.status).includes("pending") || normal(row.guarantorReadiness).includes("pending"));
  const accepted = rows.filter((row) => normal(row.status).includes("accepted") || normal(row.guarantorReadiness).includes("accepted"));
  const tabs = [["overview", "Guarantor control"], ["requests", "Guarantor requests"]];
  const tab = activeModuleTab("guarantors", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("Guarantor requests", rows.length, "From loan workflow", "Open")}
      ${summary("Pending decisions", pending.length, "Awaiting member response", "Review")}
      ${summary("Accepted guarantees", accepted.length, "Can support approval", "Approve")}
      ${summary("Loan files with guarantors", loans.length, "Credit workflow", "View")}
      ${summary("Member exposure", "Review", "Guarantee capacity", "Assess")}
    </div>
    ${moduleTabs("guarantors", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel("Guarantor control focus", [
      ["Borrower protection", "Borrowers cannot guarantee their own loan and guarantors must be active members.", "Controlled"],
      ["Member consent", `${pending.length} guarantor request(s) still need member acceptance before approval.`, pending.length ? "Pending" : "Clear"],
      ["Approval readiness", `${accepted.length} guarantee record(s) can support loan approval decisions.`, accepted.length ? "Ready" : "Waiting"]
    ]) : ""}
    ${tab === "requests" ? recordTable("Guarantor requests", rows, ["memberName", "product", "requestedAmount", "guaranteedAmount", "capacity", "guarantorReadiness", "status"]) : ""}
  `;
}

function accountingView() {
  const accounts = dataRows("chartOfAccounts");
  const periods = dataRows("accountingPeriods");
  const journals = dataRows("journalEntries");
  const expenses = dataRows("expenses");
  const assets = dataRows("assets");
  const unbalanced = journals.filter((journal) => journal.isBalanced === false || Number(journal.debitTotal || 0) !== Number(journal.creditTotal || 0));
  const closedPeriods = periods.filter((period) => normal(period.status) === "closed");
  const openPeriods = periods.filter((period) => normal(period.status) === "open");
  const tabs = [["overview", t("ledgerControl")], ["capture", t("expenseAssetCapture")], ["setup", t("chartPeriods")], ["journals", t("recentJournalEntries")], ["registers", t("expenseAssetRegisters")]];
  const tab = activeModuleTab("accounting", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("chartAccounts"), accounts.length, "Ledger structure", t("open"))}
      ${summary(t("accountingPeriods"), periods.length, "Financial years", "View")}
      ${summary(t("journalEntries"), journals.length, "Posted entries", t("review"))}
      ${summary(t("unbalancedJournals"), unbalanced.length, "Must remain zero", "Investigate")}
      ${summary(t("expenses"), money.format(sum(expenses, "amount")), "Supplier and operating costs", t("open"))}
      ${summary(t("assets"), money.format(sum(assets, "netBookValue", "cost")), "Fixed asset register", "View")}
    </div>
    ${moduleTabs("accounting", tabs, tab)}
    ${tab === "overview" ? rolePriorityPanel(t("accountingLedgerConfidence"), [
      ["Trial balance", unbalanced.length ? `${unbalanced.length} unbalanced journal entr${unbalanced.length === 1 ? "y" : "ies"} need correction.` : "All loaded journal entries are balanced.", unbalanced.length ? "Review" : "Clear"],
      ["Period control", `${openPeriods.length} open period(s), ${closedPeriods.length} closed period(s). Closed periods block ordinary postings.`, openPeriods.length ? "Open" : "Review"],
      ["Asset and expense evidence", `${expenses.length} expense record(s) and ${assets.length} asset record(s) support management reports.`, "Ready"]
    ]) : ""}
    ${tab === "capture" ? `<div class="grid two">
      ${expenseCapturePanel()}
      ${assetCapturePanel()}
    </div>` : ""}
    ${tab === "setup" ? `<div class="grid two">
      ${recordTable("Chart of accounts", accounts, ["code", "name", "type", "normalBalance"])}
      ${recordTable("Accounting periods", periods, ["name", "startDate", "endDate", "status"])}
    </div>` : ""}
    ${tab === "journals" ? recordTable("Recent journal entries", journals, ["reference", "description", "amount", "status", "postedAt"]) : ""}
    ${tab === "registers" ? `<div class="grid two">
      ${recordTable("Expenses", expenses, ["supplierId", "accountCode", "amount", "channel", "reference", "status"])}
      ${recordTable("Assets", assets, ["name", "category", "cost", "netBookValue", "location", "status"])}
    </div>` : ""}
  `;
}

function reconciliationView() {
  const callbacks = dataRows("mobileMoneyCallbacks");
  const paymentRequests = dataRows("mobileMoneyPaymentRequests");
  const reconciliation = state.data.reconciliation || {};
  const summaryData = reconciliation.summary || {};
  const matches = Array.isArray(reconciliation.matches) ? reconciliation.matches : [];
  const unmatchedStatementLines = Array.isArray(reconciliation.unmatchedStatementLines) ? reconciliation.unmatchedStatementLines : [];
  const unmatchedLedgerLines = Array.isArray(reconciliation.unmatchedLedgerLines) ? reconciliation.unmatchedLedgerLines : [];
  const callbackExceptions = callbacks.filter((row) => !normal(row.status).includes("posted") || row.duplicate);
  const pendingPaymentRequests = paymentRequests.filter((row) => !normal(row.status).includes("posted"));
  const exceptionCount = Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length) + Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length) + callbackExceptions.length + pendingPaymentRequests.length;
  const tabs = [["overview", t("reconciliationControl")], ["matches", t("bankMobileMoneyMatching")], ["exceptions", t("exceptions")], ["requests", "Payment requests"], ["callbacks", t("providerCallbacks")]];
  const tab = activeModuleTab("reconciliation", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("providerCallbacks"), callbacks.length, "Mobile money events", t("open"))}
      ${summary(t("matchedRecords"), summaryData.matched ?? matches.length, money.format(summaryData.matchedAmount || 0), t("review"))}
      ${summary(t("unmatchedStatementLines"), summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length, money.format(summaryData.unmatchedStatementAmount || 0), "Investigate")}
      ${summary(t("unmatchedLedgerLines"), summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length, money.format(summaryData.unmatchedLedgerAmount || 0), "Investigate")}
      ${summary("Pending requests", pendingPaymentRequests.length, "Awaiting provider callback", "Track")}
      ${summary(t("callbackExceptions"), callbackExceptions.length, "Failed or duplicate provider events", "Resolve")}
    </div>
    ${moduleTabs("reconciliation", tabs, tab)}
    ${tab === "overview" ? `
      ${reconciliationControlPanel(summaryData)}
      ${rolePriorityPanel(t("reconciliationReadinessChecks"), [
      ["Statement matching", `${summaryData.matched ?? matches.length} matched record(s) against ${summaryData.statementLines || unmatchedStatementLines.length + matches.length} statement line(s).`, Number(summaryData.unmatchedStatementLines ?? unmatchedStatementLines.length) ? "Review" : "Clear"],
      ["Ledger exceptions", `${summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length} ledger line(s) remain unmatched.`, Number(summaryData.unmatchedLedgerLines ?? unmatchedLedgerLines.length) ? "Investigate" : "Clear"],
      ["Payment requests", `${pendingPaymentRequests.length} mobile-money request(s) are awaiting provider callback posting.`, pendingPaymentRequests.length ? "Track" : "Clear"],
      ["Provider callbacks", `${callbackExceptions.length} callback exception(s) need provider or posting review.`, callbackExceptions.length ? "Resolve" : "Clear"],
      ["Close readiness", exceptionCount ? "Resolve reconciliation exceptions before period close or regulatory export." : "Reconciliation evidence is ready for reporting.", exceptionCount ? "Blocked" : "Ready"]
    ])}` : ""}
    ${tab === "matches" ? `<div class="grid two">
      ${recordTable("Bank and mobile-money matching", reconciliationMatchRows(matches), ["externalReference", "statementAmount", "ledgerAmount", "accountCode", "sourceType", "postedAt"])}
      ${recordTable("Provider callback exceptions", callbackExceptions, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"])}
    </div>` : ""}
    ${tab === "exceptions" ? `<div class="grid two">
      ${recordTable("Unmatched bank statement lines", unmatchedStatementLines, ["externalReference", "accountCode", "channel", "amount", "description", "statementDate"])}
      ${recordTable("Unmatched ledger lines", unmatchedLedgerLines, ["reference", "accountCode", "accountName", "sourceType", "amount", "postedAt"])}
    </div>` : ""}
    ${tab === "requests" ? `
      ${paymentRequestOperationsPanel(paymentRequests)}
      ${recordTable("Mobile-money payment requests", paymentRequests, ["externalReference", "provider", "purpose", "amount", "currencyCode", "payerPhone", "status", "requestedAt", "completedAt"])}
    ` : ""}
    ${tab === "callbacks" ? recordTable("Provider callbacks", callbacks, ["externalReference", "provider", "purpose", "amount", "resourceType", "status", "receivedAt"]) : ""}
  `;
}

function reconciliationControlPanel(summaryData) {
  const statementTotal = Number(summaryData.statementLines || 0);
  const ledgerTotal = Number(summaryData.ledgerLines || 0);
  const matched = Number(summaryData.matched || 0);
  const coverage = Math.round((matched / Math.max(statementTotal, ledgerTotal, 1)) * 100);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Reconciliation command center</h2>
          <p>Review backend-matched bank statement lines against cash ledger lines before period close.</p>
        </div>
        <span class="status ${coverage >= 90 ? "active" : "pending"}">${coverage}% matched</span>
      </div>
      <div class="source-grid">
        ${mini("Statement lines", statementTotal)}
        ${mini("Cash ledger lines", ledgerTotal)}
        ${mini("Matched lines", matched)}
        ${mini("Unmatched statement amount", money.format(summaryData.unmatchedStatementAmount || 0))}
        ${mini("Unmatched ledger amount", money.format(summaryData.unmatchedLedgerAmount || 0))}
        ${mini("Matched amount", money.format(summaryData.matchedAmount || 0))}
      </div>
    </section>
  `;
}

function paymentRequestOperationsPanel(requests) {
  const rows = requests || [];
  const terminalStatuses = new Set(["posted", "failed", "expired", "cancelled"]);
  const actionable = rows.filter((row) => !terminalStatuses.has(normal(row.status)));
  const selected = rows.find((row) => row.id === state.selectedPaymentRequestId) || actionable[0] || rows[0];
  if (!rows.length) {
    return emptyState("No payment requests yet", "Member mobile-money requests will appear here after they are initiated from the member portal.");
  }
  const canManage = hasPermission("accounting:post");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Payment request operations</h2>
          <p>Track member-initiated mobile-money requests and close stale provider prompts with audit-ready statuses.</p>
        </div>
        <span class="status ${actionable.length ? "pending" : "active"}">${actionable.length ? `${actionable.length} open` : "All closed"}</span>
      </div>
      ${state.paymentRequestStatusMessage ? `<div class="notice success">${escapeHtml(state.paymentRequestStatusMessage)}</div>` : ""}
      ${state.paymentRequestStatusError ? `<div class="notice warning">${escapeHtml(state.paymentRequestStatusError)}</div>` : ""}
      <div class="form-grid">
        <label>
          <span>Request</span>
          <select id="paymentRequestSelect" ${canManage ? "" : "disabled"}>
            ${rows.map((row) => `<option value="${escapeHtml(row.id)}" ${selected?.id === row.id ? "selected" : ""}>${escapeHtml(row.externalReference || row.id)} - ${escapeHtml(labelize(row.status || "pending"))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status note</span>
          <input id="paymentRequestReason" value="${escapeHtml(state.paymentRequestStatusReason)}" placeholder="Reason for status update">
        </label>
      </div>
      ${selected ? `<div class="source-grid compact">
        ${mini("Selected request", selected.externalReference || selected.id)}
        ${mini("Member", selected.memberIdentifier || selected.memberId)}
        ${mini("Amount", money.format(selected.amount || 0))}
        ${mini("Phone", selected.payerPhone || t("none"))}
        ${mini("Status", labelize(selected.status || "pending"))}
        ${mini("Requested", formatDateTime(selected.requestedAt))}
      </div>` : ""}
      <div class="action-row">
        <button class="button secondary" type="button" data-payment-request-status="failed" ${canManage && selected && !terminalStatuses.has(normal(selected.status)) ? "" : "disabled"}>Mark failed</button>
        <button class="button secondary" type="button" data-payment-request-status="expired" ${canManage && selected && !terminalStatuses.has(normal(selected.status)) ? "" : "disabled"}>Mark expired</button>
        <button class="button danger" type="button" data-payment-request-status="cancelled" ${canManage && selected && !terminalStatuses.has(normal(selected.status)) ? "" : "disabled"}>Cancel request</button>
      </div>
      ${canManage ? "" : `<p class="muted-note">Only users with posting rights can change payment request status.</p>`}
    </section>
  `;
}

function reconciliationMatchRows(matches) {
  return (matches || []).map((match) => ({
    externalReference: match.statementLine?.externalReference || match.ledgerLine?.reference,
    statementAmount: match.statementLine?.amount,
    ledgerAmount: match.ledgerLine?.amount,
    accountCode: match.statementLine?.accountCode || match.ledgerLine?.accountCode,
    sourceType: match.ledgerLine?.sourceType,
    postedAt: match.ledgerLine?.postedAt || match.statementLine?.statementDate
  }));
}

function governanceView() {
  const meetings = dataRows("governanceMeetings").map((meeting) => ({
    ...meeting,
    chairName: userName(meeting.chairUserId),
    action: "governance-meeting-detail",
    actionLabel: "Open",
    actionId: meeting.id
  }));
  const resolutions = meetings.flatMap((meeting) => (meeting.resolutions || []).map((resolution) => ({
    ...resolution,
    meetingTitle: meeting.title,
    ownerName: userName(resolution.ownerUserId)
  })));
  const scheduled = meetings.filter((row) => normal(row.status) === "scheduled");
  const openResolutions = resolutions.filter((row) => normal(row.status) !== "closed");
  const tabs = [["overview", t("governanceControl")], ["setup", t("governanceMeetingSetup")], ["detail", t("governanceMeetingDetail")], ["register", t("governanceMeetingRegister")], ["resolutions", t("resolutionActionList")]];
  const tab = activeModuleTab("governance", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("meetings"), meetings.length, "Board, AGM and committee records", t("open"))}
      ${summary(t("scheduledMeetings"), scheduled.length, "Upcoming governance events", "Prepare")}
      ${summary(t("openResolutions"), openResolutions.length, "Action items needing follow-up", "Track")}
      ${summary(t("completedMeetings"), meetings.filter((row) => normal(row.status) === "completed").length, "Minutes and decisions", t("review"))}
    </div>
    ${moduleTabs("governance", tabs, tab)}
    ${tab === "overview" ? governanceActionControlPanel(meetings, scheduled, resolutions, openResolutions) : ""}
    ${tab === "setup" ? governanceMeetingPanel() : ""}
    ${tab === "detail" ? (governanceMeetingDetailPanel(meetings) || emptyState("Governance meeting detail", "Select a meeting from the register to record resolutions and decisions.")) : ""}
    ${tab === "register" ? recordTable("Governance meeting register", meetings, ["title", "meetingType", "scheduledAt", "chairName", "status", "openResolutions"]) : ""}
    ${tab === "resolutions" ? recordTable("Resolution action list", resolutions, ["meetingTitle", "title", "ownerName", "dueDate", "status", "createdAt"]) : ""}
  `;
}

function governanceActionControlPanel(meetings, scheduled, resolutions, openResolutions) {
  const withMinutes = meetings.filter((meeting) => meeting.minutes).length;
  const overdue = openResolutions.filter((resolution) => resolution.dueDate && new Date(resolution.dueDate) < new Date()).length;
  return rolePriorityPanel(t("governanceActionControl"), [
    ["Meeting preparedness", `${scheduled.length} scheduled meeting(s) need agenda, chairperson and attendance readiness.`, scheduled.length ? "Prepare" : "Clear"],
    ["Resolution follow-up", `${openResolutions.length} open resolution(s), including ${overdue} overdue action(s).`, overdue ? "Escalate" : openResolutions.length ? "Track" : "Clear"],
    ["Minutes evidence", `${withMinutes}/${meetings.length || 0} meeting(s) have captured minutes for audit and member trust.`, withMinutes === meetings.length && meetings.length ? "Complete" : "Capture"]
  ]);
}

function governanceMeetingPanel() {
  const canManage = hasPermission("governance:manage");
  const users = dataRows("users").filter((user) => user.tenantId === state.user?.tenantId);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Governance meeting setup</h2>
          <p>Create board, AGM, committee, and management meetings with minutes.</p>
        </div>
      </div>
      ${state.governanceMeetingMessage ? `<div class="notice compact"><strong>${escapeHtml(state.governanceMeetingMessage)}</strong></div>` : ""}
      ${state.governanceMeetingError ? `<div class="notice warning"><strong>Meeting setup failed.</strong><span>${escapeHtml(state.governanceMeetingError)}</span></div>` : ""}
      <form id="governanceMeetingForm" class="form-grid">
        <input type="hidden" id="newMeetingTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Title</span><input id="newMeetingTitle" required placeholder="Monthly board meeting" ${canManage ? "" : "disabled"}></label>
        <label><span>Meeting type</span><select id="newMeetingType" ${canManage ? "" : "disabled"}>${meetingTypeOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Scheduled time</span><input id="newMeetingScheduledAt" type="datetime-local" value="${localDateTimeValue()}" ${canManage ? "" : "disabled"}></label>
        <label><span>Chairperson</span><select id="newMeetingChairUserId" ${canManage ? "" : "disabled"}><option value="">Use current user</option>${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName || user.email)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="newMeetingStatus" ${canManage ? "" : "disabled"}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label class="wide"><span>Minutes / agenda</span><textarea id="newMeetingMinutes" placeholder="Agenda, attendance notes, or minutes summary" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create governance meeting</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function governanceMeetingDetailPanel(meetings) {
  const meeting = meetings.find((item) => item.id === state.selectedMeetingId);
  if (!meeting) return "";
  const canManage = hasPermission("governance:manage");
  const users = dataRows("users").filter((user) => user.tenantId === state.user?.tenantId);
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Governance meeting detail</h2>
          <p>${escapeHtml(meeting.title)} - ${escapeHtml(labelize(meeting.meetingType || ""))}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-governance-meeting-detail">Close</button>
      </div>
      ${state.selectedMeetingMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMeetingMessage)}</strong></div>` : ""}
      ${state.selectedMeetingError ? `<div class="notice warning"><strong>Resolution update failed.</strong><span>${escapeHtml(state.selectedMeetingError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Chairperson", meeting.chairName)}
        ${mini("Status", meeting.status)}
        ${mini("Scheduled", meeting.scheduledAt)}
        ${mini("Open resolutions", meeting.openResolutions || 0)}
        ${mini("Minutes", meeting.minutes ? "Captured" : "Pending")}
      </div>
      <form id="governanceResolutionForm" class="form-grid">
        <input type="hidden" id="selectedMeetingId" value="${escapeHtml(meeting.id)}">
        <label><span>Resolution title</span><input id="newResolutionTitle" required placeholder="Resolution or action item" ${canManage ? "" : "disabled"}></label>
        <label><span>Owner</span><select id="newResolutionOwnerUserId" ${canManage ? "" : "disabled"}><option value="">Use current user</option>${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName || user.email)}</option>`).join("")}</select></label>
        <label><span>Due date</span><input id="newResolutionDueDate" type="date" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="newResolutionStatus" ${canManage ? "" : "disabled"}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
        <label class="wide"><span>Decision</span><textarea id="newResolutionDecision" placeholder="Decision text, follow-up requirement, or governance action" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Record resolution</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      ${recordTable("Meeting resolutions", (meeting.resolutions || []).map((resolution) => ({ ...resolution, ownerName: userName(resolution.ownerUserId) })), ["title", "ownerName", "dueDate", "status", "createdAt"])}
    </section>
  `;
}

function meetingTypeOptions() {
  return ["board", "agm", "credit_committee", "audit_committee", "management"];
}

function localDateTimeValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function settingsView() {
  if (isPlatform()) return platformSettingsView();
  const branches = dataRows("branches");
  const products = dataRows("financialProducts");
  const accounts = dataRows("financialAccounts");
  const activeBranches = branches.filter((branch) => normal(branch.status) === "active");
  const activeProducts = products.filter((product) => normal(product.status) === "active");
  const productTypes = ["savings", "shares", "welfare"];
  const missingProducts = productTypes.filter((type) => !products.some((product) => normal(product.productType) === type));
  const tab = state.saccoSettingsTab || "overview";
  const security = state.data.securitySummary || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("activeBranches"), activeBranches.length, "Service points ready for use", "Manage")}
      ${summary(t("activeProducts"), activeProducts.length, t("savingsSharesWelfare"), "Configure")}
      ${summary(t("productCoverage"), missingProducts.length ? `${productTypes.length - missingProducts.length}/${productTypes.length}` : "Complete", missingProducts.length ? `Missing ${missingProducts.map(labelize).join(", ")}` : "Core contribution types ready", t("review"))}
      ${summary(t("roles"), dataRows("roles").length, "Access profiles", t("review"))}
    </div>
    ${saccoSettingsTabs(tab)}
    ${tab === "overview" ? `
      ${saccoSettingsControlPanel(branches, products, accounts, missingProducts)}
      ${settingsReadinessPanel(branches, products, accounts)}
    ` : ""}
    ${tab === "branches" ? branchSetupPanel() : ""}
    ${tab === "products" ? financialProductSetupPanel() : ""}
    ${tab === "records" ? `
      ${recordTable("Branch setup", branches.map((branch) => ({ ...branch, manager: userName(branch.managerUserId) })), ["code", "name", "manager", "address", "status", "createdAt"])}
      ${recordTable("Financial product setup", products, ["productType", "code", "name", "contributionAmount", "minimumBalance", "interestRate", "status"])}
    ` : ""}
    ${tab === "security" ? staffSecuritySettingsPanel(security, false) : ""}
  `;
}

function saccoSettingsTabs(activeTab) {
  const tabs = [
    ["overview", t("settingsOverview")],
    ["branches", t("branchSetup")],
    ["products", t("productSetup")],
    ["records", t("setupRecords")],
    ["security", t("security")]
  ];
  return `
    <div class="tabs management-tabs">
      ${tabs.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" type="button" data-sacco-settings-tab="${id}">${label}</button>`).join("")}
    </div>
  `;
}

function saccoSettingsControlPanel(branches, products, accounts, missingProducts) {
  const inactiveBranches = branches.filter((branch) => normal(branch.status) !== "active").length;
  const inactiveProducts = products.filter((product) => normal(product.status) !== "active").length;
  return rolePriorityPanel(t("saccoSettingsControl"), [
    ["Branch readiness", `${branches.length} branch record(s), with ${inactiveBranches} inactive service point(s).`, inactiveBranches ? "Review" : "Ready"],
    ["Contribution setup", missingProducts.length ? `Missing ${missingProducts.map(labelize).join(", ")} product setup.` : "Savings, shares and welfare product coverage is configured.", missingProducts.length ? "Configure" : "Ready"],
    ["Ledger linkage", `${accounts.length} financial account(s) support product and reporting setup; ${inactiveProducts} product(s) are inactive.`, accounts.length ? "Linked" : "Setup"]
  ]);
}

function settingsReadinessPanel(branches, products, accounts) {
  const activeBranches = branches.filter((branch) => normal(branch.status) === "active").length;
  const savingsProducts = products.filter((product) => normal(product.productType) === "savings").length;
  const sharesProducts = products.filter((product) => normal(product.productType) === "shares").length;
  const welfareProducts = products.filter((product) => normal(product.productType) === "welfare").length;
  const inactiveProducts = products.filter((product) => normal(product.status) !== "active").length;
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO operating settings</h2>
          <p>Controls used by member onboarding, transactions, product accounts and branch reporting.</p>
        </div>
        <span class="status ${activeBranches && savingsProducts && sharesProducts && welfareProducts ? "active" : "pending"}">${activeBranches && savingsProducts && sharesProducts && welfareProducts ? "Ready" : "Setup needed"}</span>
      </div>
      <div class="source-grid">
        ${mini("Active branches", activeBranches)}
        ${mini("Savings products", savingsProducts)}
        ${mini("Share products", sharesProducts)}
        ${mini("Welfare products", welfareProducts)}
        ${mini("Open accounts", accounts.length)}
        ${mini("Inactive products", inactiveProducts)}
      </div>
    </section>
  `;
}

function branchSetupPanel() {
  const canManage = hasPermission("roles:create") || roleKind() === "admin";
  const tenantId = state.user?.tenantId || state.currentTenantId || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Branch setup</h2>
          <p>Create service points used by member registration, transactions and reports.</p>
        </div>
      </div>
      ${state.branchFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.branchFormMessage)}</strong></div>` : ""}
      ${state.branchFormError ? `<div class="notice warning"><strong>Branch setup failed.</strong><span>${escapeHtml(state.branchFormError)}</span></div>` : ""}
      <form class="form-grid" id="branchSetupForm">
        <input type="hidden" id="newBranchTenantId" value="${escapeHtml(tenantId)}">
        <label><span>Branch code</span><input id="newBranchCode" placeholder="HQ" required ${canManage ? "" : "disabled"}></label>
        <label><span>Branch name</span><input id="newBranchName" placeholder="Main branch" required ${canManage ? "" : "disabled"}></label>
        <label><span>Address</span><input id="newBranchAddress" placeholder="Town, district or street" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="newBranchStatus" ${canManage ? "" : "disabled"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <div class="form-actions"><button class="button primary" type="submit" ${canManage ? "" : "disabled"}>Create branch</button></div>
      </form>
    </section>
  `;
}

function financialProductSetupPanel() {
  const canManage = hasPermission("transactions:create") || roleKind() === "admin";
  const tenantId = state.user?.tenantId || state.currentTenantId || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Contribution product setup</h2>
          <p>Configure the savings, shares and welfare products members can use.</p>
        </div>
      </div>
      ${state.productFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.productFormMessage)}</strong></div>` : ""}
      ${state.productFormError ? `<div class="notice warning"><strong>Product setup failed.</strong><span>${escapeHtml(state.productFormError)}</span></div>` : ""}
      <form class="form-grid" data-product-form>
        <input type="hidden" data-product-field="tenantId" value="${escapeHtml(tenantId)}">
        <label><span>Product type</span><select data-product-field="productType" ${canManage ? "" : "disabled"}><option value="savings">Savings</option><option value="shares">Shares</option><option value="welfare">Welfare</option></select></label>
        <label><span>Product code</span><input data-product-field="code" placeholder="SAV-MONTHLY" required ${canManage ? "" : "disabled"}></label>
        <label><span>Product name</span><input data-product-field="name" placeholder="Monthly savings" required ${canManage ? "" : "disabled"}></label>
        <label><span>Contribution amount</span><input data-product-field="contributionAmount" type="number" min="0" value="5000" required ${canManage ? "" : "disabled"}></label>
        <label><span>Minimum balance</span><input data-product-field="minimumBalance" type="number" min="0" value="0" required ${canManage ? "" : "disabled"}></label>
        <label><span>Interest rate</span><input data-product-field="interestRate" type="number" min="0" step="0.1" value="0" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions"><button class="button primary" type="submit" ${canManage ? "" : "disabled"}>Create product</button></div>
      </form>
    </section>
  `;
}

function platformSettingsView() {
  const packages = dataRows("subscriptionPackages");
  const roles = dataRows("roles").filter((role) => role.tenantId === "tenant_platform");
  const permissions = dataRows("permissions");
  const templates = dataRows("notificationTemplates").filter((template) => !template.tenantId);
  const canManage = hasPermission("roles:create") || roleKind() === "super";
  const settingsTabs = [["configuration", t("configuration")], ["integrations", "Integrations"], ["security", t("security")]];
  const tab = activeModuleTab("settings", settingsTabs);
  const security = state.data.securitySummary || {};
  return `
    <div class="dashboard-grid">
      ${summary(t("subscriptionPackages"), packages.length, "Platform billing plans", t("review"))}
      ${summary(t("platformRoles"), roles.length, "Administrator access profiles", "Manage")}
      ${summary(t("permissionControls"), permissions.length, "Route and action permissions", "Audit")}
      ${summary(t("globalTemplates"), templates.length, "Default notification content", "Edit")}
    </div>
    ${moduleTabs("settings", settingsTabs, tab)}
    ${tab === "configuration" ? `
      ${platformSettingsControlPanel(packages, roles, permissions, templates, canManage)}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("protectedPlatformConfiguration")}</h2>
          <p>System-level settings are restricted to Platform Super Admin users and should be changed with audit review.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin controls</span>` : `<span class="status pending">View only</span>`}
      </div>
      <div class="source-grid">
        ${mini("App name", "Tereka Online")}
        ${mini("Default platform code", "PLATFORM")}
        ${mini("Production demo access", "Disabled outside dev/demo")}
        ${mini("SACCO code login", "Required")}
        ${mini("SACCO isolation", "Role and token enforced")}
        ${mini("Audit coverage", `${dataRows("auditEvents").length} events`)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Platform subscription packages", packages, ["name", "code", "price", "amount", "maxMembers", "maxBranches", "status"])}
      ${recordTable("Platform role catalogue", roles, ["name", "description", "status", "createdAt"])}
    </div>
    <div class="grid two">
      ${recordTable("Platform permission catalogue", permissions, ["id", "name", "description", "module"])}
      ${recordTable("Global notification templates", templates, ["eventType", "channel", "title", "status", "updatedAt"])}
    </div>
    ` : ""}
    ${tab === "integrations" ? platformNotificationIntegrationPanel(canManage) : ""}
    ${tab === "security" ? staffSecuritySettingsPanel(security, true) : ""}
  `;
}

function platformNotificationIntegrationPanel(canManage) {
  const config = state.data.notificationIntegrationConfig || {};
  const providers = Array.isArray(config.providers) ? config.providers : [];
  const statusRows = state.notificationProviderStatus || [];
  const rows = providers.map((provider) => {
    const live = statusRows.find((row) => normal(row.channel) === normal(provider.channel));
    const missing = (provider.settings || []).filter((setting) => !setting.configured).map((setting) => setting.key).join(", ") || "None";
    return {
      channel: provider.channel,
      provider: provider.provider,
      activeProvider: provider.activeProvider,
      active: provider.active ? "Active" : "Not active",
      liveStatus: live ? labelize(live.status) : "Not checked",
      balance: live?.balance ? `${live.balance} SMS credits` : "-",
      missingSettings: missing
    };
  });
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Notification integrations</h2>
          <p>Super Admin visibility for AfroSMS and Gmail SMTP setup. Secrets stay in the server environment.</p>
        </div>
        <div class="table-actions">
          <button class="button secondary" type="button" data-action="check-notification-provider-status" ${canManage ? "" : "disabled"}>Check provider status</button>
        </div>
      </div>
      ${config.updatePolicy ? `<p class="helper-text">${escapeHtml(config.updatePolicy)}</p>` : ""}
      <div class="source-grid">
        ${mini("SMS provider", providers.find((row) => normal(row.channel) === "sms")?.activeProvider || "Not configured")}
        ${mini("Email provider", providers.find((row) => normal(row.channel) === "email")?.activeProvider || "Not configured")}
        ${mini("Last status check", state.notificationProviderStatusCheckedAt ? formatDateTime(state.notificationProviderStatusCheckedAt) : "Not checked")}
        ${mini("Live risks", notificationProviderRiskRows().length)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Notification provider setup", rows, ["channel", "provider", "activeProvider", "active", "liveStatus", "balance", "missingSettings"])}
      ${recordTable("Required notification environment variables", providers.flatMap((provider) => (provider.settings || []).map((setting) => ({
        channel: provider.channel,
        key: setting.key,
        configured: setting.configured ? "Yes" : "Missing",
        secret: setting.secret ? "Secret" : "Visible",
        value: setting.secret ? (setting.configured ? "Configured" : "Missing") : setting.value
      }))), ["channel", "key", "configured", "secret", "value"])}
    </div>
  `;
}

function platformSettingsControlPanel(packages, roles, permissions, templates, canManage) {
  const inactivePackages = packages.filter((item) => normal(item.status) !== "active").length;
  const inactiveTemplates = templates.filter((item) => normal(item.status) !== "active").length;
  return rolePriorityPanel(t("platformSettingsControl"), [
    ["Billing readiness", `${packages.length} subscription package(s), with ${inactivePackages} inactive plan(s).`, inactivePackages ? "Review" : "Ready"],
    ["Administrator roles", `${roles.length} platform role(s) mapped to ${permissions.length} permission control(s).`, roles.length && permissions.length ? "Ready" : "Configure"],
    ["Protected changes", canManage ? "Current role can update protected platform configuration with audit trail." : "Current role is view-only for protected platform configuration.", canManage ? "Allowed" : "Restricted"],
    ["Global messages", `${templates.length} global template(s), with ${inactiveTemplates} inactive template(s).`, inactiveTemplates ? "Review" : "Ready"]
  ]);
}

function staffSecuritySettingsPanel(security, platformScope) {
  const sessions = Array.isArray(security.activeSessions) ? security.activeSessions : [];
  const resets = Array.isArray(security.recentPasswordResets) ? security.recentPasswordResets : [];
  const policy = state.data.platformSecurityPolicy || defaultPlatformSecurityPolicy();
  const currentExpiry = security.currentSessionExpiresAt || state.sessionExpiresAt;
  const activeCount = security.activeSessionCount ?? sessions.length;
  const resetCount = security.passwordResetRequestCount ?? resets.length;
  const sessionRows = sessions.map((session) => ({
    id: session.id,
    createdAt: formatDateTime(session.createdAt),
    expiresAt: formatDateTime(session.expiresAt),
    status: new Date(session.expiresAt).getTime() > Date.now() ? "active" : "expired"
  }));
  const resetRows = resets.map((request) => ({
    id: request.id,
    status: request.status,
    createdAt: formatDateTime(request.createdAt),
    expiresAt: formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? formatDateTime(request.usedAt) : "-"
  }));
  return `
    <div class="dashboard-grid">
      ${summary("Active sessions", activeCount, "Current administrator login devices", "Review")}
      ${summary("MFA status", security.mfaEnabled ? "Enabled" : "Not enabled", "Step-up verification for sensitive login", "Manage")}
      ${summary("Password resets", resetCount, "Requests recorded for this administrator", "Audit")}
      ${summary("Session expiry", currentExpiry ? formatDateTime(currentExpiry) : "Not reported", "Current token lifetime", "Extend")}
    </div>
    ${rolePriorityPanel(platformScope ? "Platform security settings" : "SACCO security settings", [
      ["Active sessions", `${activeCount} active staff session(s) are server-side and expire automatically.`, activeCount ? "Monitor" : "None"],
      ["MFA posture", security.mfaEnabled ? "MFA is enabled for this administrator account." : "MFA is not yet enabled for this administrator account.", security.mfaEnabled ? "Ready" : "Improve"],
      ["Password reset evidence", `${resetCount} password reset request(s) are available in the audit trail for this account.`, resetCount ? "Trace" : "No resets"],
      ["Session lifecycle audit", "Login, logout and session extension events are recorded under access control audit evidence.", "Audited"]
    ])}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Security Settings</h2>
          <p>Administrator session, MFA and password-reset evidence for the current login.</p>
        </div>
        <div class="table-actions">
          <button class="button secondary" type="button" data-action="toggle-current-mfa" data-mfa-enabled="${security.mfaEnabled ? "false" : "true"}">${security.mfaEnabled ? "Disable MFA" : "Enable MFA"}</button>
          <button class="button secondary" type="button" data-action="extend-session">Extend session</button>
        </div>
      </div>
      <div class="source-grid">
        ${mini("Signed in as", state.user?.email || state.user?.fullName || "Administrator")}
        ${mini("Role", state.roleNames.join(", ") || "Assigned role")}
        ${mini("MFA", security.mfaEnabled ? "Enabled" : "Not enabled")}
        ${mini("Current expiry", currentExpiry ? formatDateTime(currentExpiry) : "Not reported")}
        ${mini("Active sessions", activeCount)}
        ${mini("Password resets", resetCount)}
      </div>
    </section>
    <div class="grid two">
      ${recordTable("Active administrator sessions", sessionRows, ["id", "createdAt", "expiresAt", "status"])}
      ${recordTable("Password reset history", resetRows, ["id", "status", "createdAt", "expiresAt", "usedAt"])}
    </div>
    ${platformScope ? platformPasswordPolicyPanel(policy) : ""}
  `;
}

function platformPasswordPolicyPanel(policy) {
  const canManage = hasPermission("roles:create") || roleKind() === "super";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Password and lockout policy</h2>
          <p>Controls staff password strength, reset validation and failed-login lockout thresholds.</p>
        </div>
        ${canManage ? `<span class="status active">Super Admin editable</span>` : `<span class="status pending">View only</span>`}
      </div>
      ${state.platformPolicyMessage ? `<div class="notice compact"><strong>${escapeHtml(state.platformPolicyMessage)}</strong></div>` : ""}
      ${state.platformPolicyError ? `<div class="notice warning"><strong>Policy update failed.</strong><span>${escapeHtml(state.platformPolicyError)}</span></div>` : ""}
      <form id="platformSecurityPolicyForm" class="form-grid">
        <label><span>Minimum password length</span><input id="policyMinimumPasswordLength" type="number" min="8" max="64" value="${escapeHtml(policy.minimumPasswordLength ?? 10)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Password expiry days</span><input id="policyPasswordExpiryDays" type="number" min="0" max="365" value="${escapeHtml(policy.passwordExpiryDays ?? 90)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Failed attempts before lockout</span><input id="policyLockoutFailedAttempts" type="number" min="3" max="20" value="${escapeHtml(policy.lockoutFailedAttempts ?? 5)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Lockout minutes</span><input id="policyLockoutMinutes" type="number" min="1" max="1440" value="${escapeHtml(policy.lockoutMinutes ?? 15)}" ${canManage ? "" : "disabled"}></label>
        <label class="check-row"><input id="policyRequireUppercase" type="checkbox" ${policy.requireUppercase ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require uppercase letter</span></label>
        <label class="check-row"><input id="policyRequireLowercase" type="checkbox" ${policy.requireLowercase ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require lowercase letter</span></label>
        <label class="check-row"><input id="policyRequireNumber" type="checkbox" ${policy.requireNumber ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require number</span></label>
        <label class="check-row"><input id="policyRequireSymbol" type="checkbox" ${policy.requireSymbol ? "checked" : ""} ${canManage ? "" : "disabled"}><span>Require symbol</span></label>
        <div class="mini-fact wide">
          <span>Last updated</span>
          <strong>${policy.updatedAt ? formatDateTime(policy.updatedAt) : "Not recorded"}</strong>
        </div>
        <div class="form-actions wide">
          ${canManage ? `<button class="button primary" type="submit">Save security policy</button>` : `<span class="status pending">Only Platform Super Admin can save policy changes</span>`}
        </div>
      </form>
    </section>
  `;
}

function defaultPlatformSecurityPolicy() {
  return {
    minimumPasswordLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: false,
    passwordExpiryDays: 90,
    lockoutFailedAttempts: 5,
    lockoutMinutes: 15,
    updatedAt: ""
  };
}

function renderMemberView(view) {
  const dash = state.memberData.dashboard || {};
  const balances = state.memberData.balances || dash.balances || {};
  if (view === "home") {
    const monthlyPerformance = memberMonthlyPerformanceRows(dash);
    const tabs = [["overview", t("overview")], ["monthly", t("monthlySavings")], ["loans", t("loans")], ["messages", t("messages")], ["mobile-money", t("mobileMoney")], ["transactions", t("transactions")]];
    const tab = activeModuleTab("home", tabs);
    return `
      <div class="member-hero">
        <div><p class="eyebrow">${t("memberDashboardTitle")}</p><h2>${displayName()}, welcome back</h2><p>${t("memberWelcomeCopy")}</p></div>
        <span class="status active">${t("memberPortalStatus")}</span>
      </div>
      <div class="dashboard-grid">
        ${summary(t("totalBalance"), money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)), t("savingsSharesWelfare"), t("viewAccounts"))}
        ${summary(t("savings"), money.format(balances.savings || 0), t("lastTransactionStatement"), t("details"))}
        ${summary(t("shares"), money.format(balances.shares || 0), t("shareBalance"), t("details"))}
        ${summary(t("welfare"), money.format(balances.welfare || 0), t("welfareContributions"), t("details"))}
        ${summary(t("loans"), state.memberData.loans.length, t("activePendingLoans"), t("open"))}
        ${summary(t("notifications"), state.memberData.notifications.length, t("unreadAndRecent"), t("read"))}
        ${summary(t("guaranteeRequests"), state.memberData.pendingGuarantors.length, t("pendingGuarantors"), t("respond"))}
        ${summary(t("offlineDrafts"), state.memberData.drafts.length, t("syncDrafts"), t("sync"))}
      </div>
      ${memberQuickActionsPanel()}
      ${memberServiceAssurancePanel(dash, balances, monthlyPerformance)}
      ${moduleTabs("home", tabs, tab)}
      ${tab === "overview" ? `${memberCommandCenter(dash, balances, monthlyPerformance)}${memberPaymentRoutePanel()}` : ""}
      ${tab === "monthly" ? `${memberTabReadinessPanel("Monthly savings workspace", "Review full-date deposit performance across savings, shares, welfare, loan repayments and payment channel.", [["Statement source", "Posted activity"], ["Date display", "Full date with year"], ["Payment channels", "Treasurer/Mobile"]])}${recordTable("Monthly savings and deposit performance", monthlyPerformance, ["date", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"])}` : ""}
      ${tab === "loans" ? `${memberTabReadinessPanel("Loan servicing workspace", "Track active loans, next due dates and outstanding balances before making repayments.", [["Repayment route", "Mobile money or Treasurer"], ["Guarantor checks", state.memberData.pendingGuarantors.length], ["Loan files", state.memberData.loans.length]])}${recordTable("Member loan position", state.memberData.loans || [], ["product", "requestedAmount", "outstandingBalance", "monthlyInstallment", "nextDueDate", "arrearsAmount", "scheduleStatus", "status"])}` : ""}
      ${tab === "messages" ? `${memberTabReadinessPanel("SACCO admin message center", "Read official notices, reminders and approval updates sent by the SACCO office.", [["Unread messages", memberAdminMessageRows().filter((message) => !normal(`${message.status} ${message.readAt}`).includes("read")).length], ["Channel", "In-app/SMS/email"], ["Source", "SACCO admin"]])}${recordTable("SACCO admin messages", memberAdminMessageRows(), ["title", "message", "channel", "status", "createdAt"])}` : ""}
    ${tab === "mobile-money" ? `${memberTabReadinessPanel("Mobile money deposit workspace", "Confirm mobile-money payments that have posted through provider callback records.", [["Provider posting", "Callback based"], ["Receipt", "After posting"], ["Records", memberMobileMoneyRows(dash).length]])}${recordTable("Mobile money deposit activity", memberMobileMoneyRows(dash), ["postedAt", "reference", "description", "credit", "paymentStatus", "receiptStatus"])}` : ""}
      ${tab === "transactions" ? `${memberTabReadinessPanel("Statement activity workspace", "Review posted deposits, withdrawals, loan repayments and running balance movements.", [["Statement status", "Verified"], ["Receipt trail", "Available"], ["Rows", (dash.recentTransactions || []).length]])}${recordTable("Recent transactions", dash.recentTransactions || [], ["reference", "description", "debit", "credit", "runningBalance", "postedAt"])}` : ""}
    `;
  }
  if (view === "accounts") return memberAccountsView(balances);
  if (view === "loans") return memberLoansView();
  if (view === "guarantor-requests") return memberGuarantorRequestsView();
  if (view === "payments") return memberPaymentsView();
  if (view === "notifications") return memberNotificationsView();
  if (view === "complaints") return memberComplaintsView();
  if (view === "statements") return memberStatementsView(dash, balances);
  if (view === "receipts") return memberReceiptsView(dash);
  if (view === "profile") return memberProfileView(balances);
  if (view === "security") return memberSecurityView();
  return moduleBlueprint(view);
}

function memberQuickActionsPanel() {
  const actions = [
    [t("payByMobileMoney"), t("payByMobileMoneyCopy"), "payments", "mobile-money"],
    [t("treasurerCashHandoff"), t("treasurerCashHandoffCopy"), "payments", "treasurer-cash"],
    [t("viewStatement"), t("viewStatementCopy"), "statements", "activity"],
    [t("viewReceipts"), t("viewReceiptsCopy"), "receipts", "receipts"],
    [t("readSaccoMessages"), t("readSaccoMessagesCopy"), "notifications", "inbox"],
    [t("submitComplaint"), t("submitComplaintCopy"), "complaints", "submit"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberQuickActions")}</h2>
          <p>${t("memberQuickActionsCopy")}</p>
        </div>
        <span class="status active">${t("selfService")}</span>
      </div>
      <div class="access-grid">
        ${actions.map(([label, detail, view, tab]) => `
          <div>
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(detail)}</span>
            <button class="button secondary" type="button" data-member-shortcut-view="${escapeHtml(view)}" data-member-shortcut-tab="${escapeHtml(tab)}">${escapeHtml(label)}</button>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function memberAccountsView(balances) {
  const accounts = [
    { account: "Savings", accountType: "savings", balance: balances.savings || 0, purpose: "Regular member deposits", action: "Deposit" },
    { account: "Shares", accountType: "shares", balance: balances.shares || 0, purpose: "Share capital contributions", action: "Buy shares" },
    { account: "Welfare", accountType: "welfare", balance: balances.welfare || 0, purpose: "Welfare fund contributions", action: "Contribute" }
  ];
  return `
    <div class="dashboard-grid">
      ${summary("Savings", money.format(balances.savings || 0), "Available member deposits", "Deposit")}
      ${summary("Shares", money.format(balances.shares || 0), "Member share capital", "Buy shares")}
      ${summary("Welfare", money.format(balances.welfare || 0), "Welfare contribution balance", "Contribute")}
      ${summary("Total balance", money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)), "All member balances", "Statement")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member account overview</h2>
          <p>Savings, shares and welfare balances are refreshed from your SACCO records.</p>
        </div>
        <span class="status active">Verified</span>
      </div>
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("SACCO", contextName())}
        ${mini("Account groups", accounts.length)}
        ${mini("Last sync", state.lastSync || "Pending")}
        ${mini("Statements", "Available")}
        ${mini("Receipts", "Posted transactions")}
      </div>
    </section>
    ${recordTable("Member account balances", accounts, ["account", "accountType", "balance", "purpose", "action"])}
  `;
}

function memberCommandCenter(dash, balances, monthlyPerformance) {
  const loans = state.memberData.loans || [];
  const activeLoans = loans.filter((loan) => ["active", "approved", "disbursed"].includes(normal(loan.status)));
  const messages = memberAdminMessageRows();
  const unreadMessages = messages.filter((message) => !normal(`${message.status} ${message.readAt}`).includes("read"));
  const mobileDeposits = memberMobileMoneyRows(dash);
  const latestMonth = monthlyPerformance[0] || {};
  const totalBalance = Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberCommandCenter")}</h2>
          <p>${t("memberCommandCenterCopy")}</p>
        </div>
        <span class="status active">${t("memberReady")}</span>
      </div>
      <div class="source-grid">
        ${mini(t("totalBalance"), money.format(totalBalance))}
        ${mini(t("thisMonthDeposits"), money.format(latestMonth.totalDeposits || 0))}
        ${mini(t("monthlySavings"), money.format(latestMonth.savingsDeposits || 0))}
        ${mini(t("loanBalance"), money.format(sum(loans, "outstandingBalance", "balance")))}
        ${mini(t("saccoAdminMessages"), `${messages.length} message(s)`)}
        ${mini(t("mobileMoneyDeposits"), `${mobileDeposits.length} record(s)`)}
      </div>
      <ul class="activity-list">
        <li><strong>${t("monthlySavings")}</strong><span>Your posted savings, shares, welfare and loan repayments are grouped by month for quick review.</span><em>${latestMonth.month || t("noMonthYet")}</em></li>
        <li><strong>${t("loans")}</strong><span>${activeLoans.length} active or approved loan file(s), with next repayment dates visible in the loan position table.</span><em>${activeLoans.length ? "Track" : "No active loan"}</em></li>
        <li><strong>${t("saccoAdminMessages")}</strong><span>${unreadMessages.length} unread message(s) from your SACCO office, including notices, approvals and reminders.</span><em>${unreadMessages.length ? t("read") : "Clear"}</em></li>
        <li><strong>${t("mobileMoneyDeposits")}</strong><span>Mobile-money payments appear after provider callback posting and then become visible in receipts and statements.</span><em>${mobileDeposits.length ? "Posted" : "No posted mobile record"}</em></li>
      </ul>
    </section>
  `;
}

function memberServiceAssurancePanel(dash, balances, monthlyPerformance) {
  const messages = memberAdminMessageRows();
  const unreadMessages = messages.filter((message) => !normal(`${message.status} ${message.readAt}`).includes("read"));
  const mobileDeposits = memberMobileMoneyRows(dash);
  const latestMonth = monthlyPerformance[0] || {};
  const totalBalance = Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0);
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberServiceAssurance")}</h2>
          <p>${t("memberServiceAssuranceCopy")}</p>
        </div>
        <span class="status active">${t("serviceReady")}</span>
      </div>
      <div class="source-grid">
        ${mini(t("memberIdentity"), state.member?.membershipNo || "Confirmed")}
        ${mini(t("kycStatus"), labelize(state.member?.kycStatus || "pending"))}
        ${mini(t("balanceControl"), money.format(totalBalance))}
        ${mini(t("thisMonth"), money.format(latestMonth.totalDeposits || 0))}
        ${mini(t("unreadMessages"), unreadMessages.length)}
        ${mini(t("mobileDeposits"), mobileDeposits.length)}
        ${mini(t("receipts"), t("available"))}
        ${mini(t("lastSync"), state.lastSync ? formatDateTime(state.lastSync) : t("pending"))}
      </div>
    </section>
  `;
}

function memberTabReadinessPanel(title, copy, facts) {
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(copy)}</p>
        </div>
        <span class="status active">${t("ready")}</span>
      </div>
      <div class="source-grid">
        ${facts.map(([label, value]) => mini(label, value)).join("")}
      </div>
    </section>
  `;
}

function memberLoansView() {
  const loans = state.memberData.loans || [];
  const activeLoans = loans.filter((loan) => ["active", "approved", "disbursed"].includes(normal(loan.status)));
  return `
    <div class="dashboard-grid">
      ${summary("Loan files", loans.length, "Applications and active loans", "Review")}
      ${summary("Active loans", activeLoans.length, "Repayment expected", "Pay")}
      ${summary("Outstanding", money.format(sum(loans, "outstandingBalance", "balance")), "Portfolio balance", "Statement")}
      ${summary("Guarantee requests", state.memberData.pendingGuarantors.length, "Pending guarantor decisions", "Respond")}
    </div>
    ${memberLoanApplicationPanel()}
    ${recordTable("Member loans", loans, ["product", "requestedAmount", "outstandingBalance", "nextDueDate", "status"])}
  `;
}

function memberLoanApplicationPanel() {
  const memberActive = normal(state.member?.status) === "active";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Mobile loan application</h2>
          <p>Submit a loan request directly to the SACCO credit workflow.</p>
        </div>
        <span class="status ${memberActive ? "active" : "pending"}">${memberActive ? "Eligible to submit" : "Member not active"}</span>
      </div>
      ${state.memberLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberLoanMessage)}</strong></div>` : ""}
      ${state.memberLoanError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.memberLoanError)}</span></div>` : ""}
      <form id="memberLoanForm" class="form-grid">
        <label><span>Loan product</span><select id="memberLoanProduct" ${memberActive ? "" : "disabled"}>${loanProductOptions().map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="memberLoanAmount" type="number" min="1" step="1" value="100000" ${memberActive ? "" : "disabled"}></label>
        <label><span>Repayment months</span><input id="memberLoanMonths" type="number" min="1" max="60" value="12" ${memberActive ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><textarea id="memberLoanPurpose" placeholder="Business, school fees, farming input, emergency..." ${memberActive ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${memberActive ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">Contact SACCO office</span>`}</div>
      </form>
    </section>
  `;
}

function memberPaymentsView() {
  const loans = state.memberData.loans || [];
  const payableLoans = loans.filter((loan) => ["active", "disbursed"].includes(normal(loan.status)));
  const paymentDrafts = memberDraftRows("payment");
  const monthlyPerformance = memberMonthlyPerformanceRows(state.memberData.dashboard || {});
  const paymentRows = memberPaymentLifecycleRows(state.memberData.dashboard || {});
  const requestRows = memberPaymentRequestRows();
  const tabs = [["mobile-money", t("mobileMoney")], ["treasurer-cash", t("treasurerCash")], ["drafts", t("drafts")], ["loans", "Loan repayments"], ["tracking", t("tracking")]];
  const tab = activeModuleTab("payments", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("paymentOptions"), 4, "Savings, shares, welfare and loans", "Pay")}
      ${summary(t("payableLoans"), payableLoans.length, "Active loan balances", t("repay"))}
      ${summary(t("mobileMoney"), t("enabled"), "Provider callback posting", t("use"))}
      ${summary(t("treasurerCash"), t("available"), "Deposits and loan repayments", t("visitOffice"))}
      ${summary(t("paymentDrafts"), paymentDrafts.length, "Saved locally before sync", t("sync"))}
    </div>
    ${moduleTabs("payments", tabs, tab)}
    ${tab === "mobile-money" ? `${memberPaymentControlPanel(payableLoans.length, paymentDrafts.length)}${memberPaymentFormPanel(payableLoans)}` : ""}
    ${tab === "treasurer-cash" ? `${memberTabReadinessPanel("Treasurer cash handoff", "Prepare cash deposits or loan repayments for SACCO Treasurer office receipting.", [["Route", "Visit SACCO office"], ["Receipt", "After staff posting"], ["Loan repayment", payableLoans.length ? "Available" : "No active loan"]])}${memberPaymentRoutePanel()}` : ""}
    ${tab === "drafts" ? `${memberTabReadinessPanel("Payment draft workspace", "Save incomplete mobile-money payment details on this device and sync them when ready.", [["Drafts saved", paymentDrafts.length], ["Storage", "Local device"], ["Sync status", paymentDrafts.length ? "Action needed" : "Clear"]])}${memberDraftPanel("Payment offline drafts", paymentDrafts)}` : ""}
    ${tab === "loans" ? `${memberTabReadinessPanel("Loan repayment workspace", "Review payable loan balances before choosing mobile money or Treasurer cash repayment.", [["Payable loans", payableLoans.length], ["Route options", "Mobile/Treasurer"], ["Receipt", "After posting"]])}${recordTable("Payable loans", payableLoans, ["product", "outstandingBalance", "monthlyInstallment", "nextDueDate", "arrearsAmount", "scheduleStatus", "status"])}` : ""}
    ${tab === "tracking" ? `${memberTabReadinessPanel("Payment tracking workspace", "Track monthly deposits, repayments, Treasurer cash and mobile-money collections.", [["Payment records", paymentRows.length], ["Provider requests", requestRows.length], ["Treasurer cash", money.format(sum(monthlyPerformance, "treasurerCash"))], ["Mobile money", money.format(sum(monthlyPerformance, "mobileMoney"))]])}${paymentRequestStatusNotice()}${recordTable("Mobile-money request tracking", requestRows, ["externalReference", "provider", "purpose", "amount", "currencyCode", "payerPhone", "status", "statusMessage", "requestedAt", "completedAt"])}${recordTable("Payment lifecycle", paymentRows, ["date", "reference", "description", "paymentRoute", "amount", "paymentStatus", "receiptStatus"])}${recordTable("Monthly savings and deposit performance", monthlyPerformance, ["date", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"])}` : ""}
  `;
}

function memberPaymentFormPanel(payableLoans) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberPaymentCenter")}</h2>
          <p>${t("memberPaymentCenterCopy")}</p>
        </div>
        <span class="status active">${t("readyToPost")}</span>
      </div>
      ${state.memberPaymentMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberPaymentMessage)}</strong></div>` : ""}
      ${state.memberPaymentError ? `<div class="notice warning"><strong>Payment failed.</strong><span>${escapeHtml(state.memberPaymentError)}</span></div>` : ""}
      <form id="memberPaymentForm" class="form-grid">
        <label><span>${t("paymentRoute")}</span><select id="memberPaymentRoute"><option value="mobile_money">Mobile money self payment</option><option value="treasurer_cash">Treasurer cash deposit</option></select><small>Mobile money posts from provider callback. Treasurer cash is receipted by SACCO staff.</small></label>
        <label><span>${t("paymentPurpose")}</span><select id="memberPaymentPurpose"><option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="loan_repayment">Loan repayment</option></select></label>
        <label><span>${t("amount")}</span><input id="memberPaymentAmount" type="number" min="1" step="1" value="5000"></label>
        <label><span>${t("provider")}</span><select id="memberPaymentProvider"><option value="mtn">MTN Mobile Money</option><option value="airtel">Airtel Money</option><option value="mpesa">M-PESA</option><option value="demo">Demo provider</option></select></label>
        <label><span>Mobile money phone</span><input id="memberPaymentPhone" value="${escapeHtml(state.member?.phone || "")}" placeholder="+256700000001"></label>
        <label><span>${t("reference")}</span><input id="memberPaymentReference" value="MM-${Date.now()}"></label>
        <label class="wide"><span>${t("loanForRepayment")}</span><select id="memberPaymentLoanId"><option value="">Not a loan repayment</option>${payableLoans.map((loan) => `<option value="${escapeHtml(loan.id)}">${escapeHtml(loan.product || loan.applicationNo || loan.id)} - ${money.format(loan.outstandingBalance || loan.balance || 0)}</option>`).join("")}</select></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="payment">${t("saveDraft")}</button><button class="button primary" type="submit">${t("postPayment")}</button></div>
      </form>
    </section>
  `;
}

function memberGuarantorRequestsView() {
  const requests = memberGuarantorRows();
  const pending = requests.filter((row) => normal(row.status) === "pending");
  const accepted = requests.filter((row) => normal(row.status) === "accepted");
  const totalGuarantee = sum(requests, "guaranteedAmount");
  const availableCapacity = requests.length ? Math.max(...requests.map((row) => Number(row.capacity || 0))) : 0;
  return `
    <div class="dashboard-grid">
      ${summary("Pending requests", pending.length, "Awaiting your decision", "Review")}
      ${summary("Accepted guarantees", accepted.length, "Active obligations", "Track")}
      ${summary("Guarantee exposure", money.format(totalGuarantee), "Requested and accepted amount", "Assess")}
      ${summary("Available capacity", money.format(availableCapacity), "Based on savings balance", "Confirm")}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member guarantor decision center</h2>
          <p>Accept or reject guarantor requests after reviewing loan purpose, amount and your guarantee capacity.</p>
        </div>
        <span class="status ${pending.length ? "pending" : "active"}">${pending.length ? "Decision needed" : "No pending requests"}</span>
      </div>
      ${state.memberGuarantorMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberGuarantorMessage)}</strong></div>` : ""}
      ${state.memberGuarantorError ? `<div class="notice warning"><strong>Guarantor decision failed.</strong><span>${escapeHtml(state.memberGuarantorError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("Savings balance", money.format(state.memberData.balances?.savings || 0))}
        ${mini("Pending decisions", pending.length)}
        ${mini("Accepted amount", money.format(sum(accepted, "guaranteedAmount")))}
        ${mini("Rejected requests", requests.filter((row) => normal(row.status) === "rejected").length)}
        ${mini("Last sync", state.lastSync || "Pending")}
      </div>
    </section>
    ${recordTable("Member guarantor requests", requests, ["borrower", "product", "requestedAmount", "guaranteedAmount", "capacity", "status"])}
  `;
}

function memberGuarantorRows() {
  return (state.memberData.pendingGuarantors || []).map((request) => ({
    ...request,
    borrower: request.loan?.memberName || request.loan?.membershipNo || request.loan?.memberId || "Borrower",
    product: request.loan?.product || request.product || "Loan",
    requestedAmount: request.loan?.amount || request.loan?.requestedAmount || 0,
    action: normal(request.status) === "pending" ? "member-guarantor" : "",
    actionLabel: normal(request.status) === "pending" ? "Decide" : "View",
    actionId: request.id
  }));
}

function memberAdminMessageRows() {
  return (state.memberData.notifications || []).map((notification) => ({
    ...notification,
    title: notification.title || "SACCO admin message",
    message: notification.message || notification.body || "Message from SACCO administration",
    channel: notification.channel || "in-app",
    status: notification.status || (notification.readAt ? "read" : "unread"),
    createdAt: notification.createdAt || notification.sentAt || ""
  }));
}

function memberMobileMoneyRows(dash) {
  return memberStatementLines(dash)
    .filter((line) => isMobileMoneyLine(line))
    .map((line) => ({
      postedAt: line.postedAt || line.createdAt || "",
      reference: line.reference,
      description: line.description || "Mobile money deposit",
      credit: line.credit || line.amount || 0,
      paymentStatus: paymentLifecycleStatus(line),
      receiptStatus: receiptLifecycleStatus(line),
      status: line.status || "posted"
    }));
}

function memberPaymentLifecycleRows(dash) {
  const requestRows = (state.memberData.paymentRequests || []).map((request) => ({
    date: request.requestedAt || request.createdAt || "",
    reference: request.externalReference,
    description: `${labelize(request.purpose)} request`,
    paymentRoute: paymentRouteLabel(request),
    amount: Number(request.amount || 0),
    paymentStatus: paymentLifecycleStatus(request),
    receiptStatus: receiptLifecycleStatus(request)
  }));
  const postedRows = memberStatementLines(dash)
    .filter((line) => Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0)
    .map((line) => ({
      date: line.postedAt || line.createdAt || "",
      reference: line.reference,
      description: line.description || "Member payment",
      paymentRoute: paymentRouteLabel(line),
      amount: Number(line.credit || 0) || Number(line.debit || 0),
      paymentStatus: paymentLifecycleStatus(line),
      receiptStatus: receiptLifecycleStatus(line)
    }));
  const draftRows = memberDraftRows("payment").map((draft) => ({
    date: draft.updatedAt || draft.createdAt || "",
    reference: draft.payload?.externalReference || draft.id,
    description: draft.title || "Payment draft",
    paymentRoute: paymentRouteLabel(draft.payload || draft),
    amount: Number(draft.amount || draft.payload?.amount || 0),
    paymentStatus: paymentLifecycleStatus(draft),
    receiptStatus: "Not receipted"
  }));
  return [...draftRows, ...requestRows, ...postedRows].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function memberPaymentRequestRows() {
  return (state.memberData.paymentRequests || []).map((request) => ({
    ...request,
    action: "payment-provider-status",
    actionLabel: normal(request.status) === "posted" ? "View status" : "Check status",
    actionId: request.id
  }));
}

function paymentRequestStatusNotice() {
  if (!state.paymentRequestStatusMessage && !state.paymentRequestStatusError) return "";
  return `
    <div class="notice ${state.paymentRequestStatusError ? "warning" : "compact"}">
      <strong>${state.paymentRequestStatusError ? "Payment status check failed." : "Payment status updated."}</strong>
      <span>${escapeHtml(state.paymentRequestStatusError || state.paymentRequestStatusMessage)}</span>
    </div>
  `;
}

function paymentRouteLabel(row) {
  const text = normal(`${row.route || ""} ${row.channel || ""} ${row.provider || ""} ${row.reference || ""} ${row.externalReference || ""} ${row.providerPayload?.route || ""}`);
  if (text.includes("treasurer") || text.includes("cash")) return "Treasurer cash";
  if (text.includes("mobile") || text.includes("mtn") || text.includes("airtel") || text.includes("mm-")) return "Mobile money";
  if (text.includes("bank")) return "Bank";
  return "Treasurer cash";
}

function paymentLifecycleStatus(row) {
  const text = normal(`${row.status || ""} ${row.receiptStatus || ""}`);
  if (text.includes("failed")) return "Failed";
  if (text.includes("draft")) return "Draft";
  if (text.includes("pending") || text.includes("syncing")) return paymentRouteLabel(row) === "Mobile money" ? "Pending mobile money" : "Pending posting";
  if (text.includes("receipt ready") || text.includes("available") || text.includes("receipted")) return "Receipted";
  if (text.includes("posted") || text.includes("synced") || row.postedAt) return "Posted";
  return "Draft";
}

function receiptLifecycleStatus(row) {
  const text = normal(`${row.receiptStatus || ""} ${row.status || ""}`);
  if (text.includes("failed")) return "Failed";
  if (text.includes("posted") || text.includes("available") || text.includes("receipt ready") || row.receiptNo) return "Receipted";
  if (text.includes("pending")) return "Pending posting";
  return "Not receipted";
}

function isMobileMoneyLine(line) {
  const text = normal(`${line.channel || ""} ${line.provider || ""} ${line.reference || ""} ${line.description || ""} ${line.type || ""}`);
  return text.includes("mobile") || text.includes("mtn") || text.includes("airtel") || text.includes("mm-");
}

function memberStatementsView(dash, balances) {
  const lines = memberStatementLines(dash);
  const monthlyRows = memberMonthlyPerformanceRows(dash);
  const tabs = [["readiness", t("readiness")], ["activity", t("statementActivity")], ["monthly", t("monthlySavings")], ["exports", t("exports")]];
  const tab = activeModuleTab("statements", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("statementLines"), lines.length, "Posted statement activity", t("review"))}
      ${summary(t("savingsBalance"), money.format(balances.savings || 0), "Verified balance", t("download"))}
      ${summary(t("shareBalance"), money.format(balances.shares || 0), "Verified balance", t("download"))}
      ${summary(t("welfare"), money.format(balances.welfare || 0), "Verified balance", t("download"))}
    </div>
    ${moduleTabs("statements", tabs, tab)}
    ${tab === "readiness" ? memberStatementEvidencePanel(lines, balances) : ""}
    ${tab === "activity" ? `${filterToolbar("Filter by reference, account, channel, narration or date", "Download PDF", "Download Excel")}${recordTable("Member statement", lines, ["reference", "description", "debit", "credit", "runningBalance", "postedAt"])}` : ""}
    ${tab === "monthly" ? `${memberTabReadinessPanel("Statement monthly evidence", "Review monthly deposits and repayments using full-date statement grouping and payment channels.", [["Monthly rows", monthlyRows.length], ["Treasurer cash", money.format(sum(monthlyRows, "treasurerCash"))], ["Mobile money", money.format(sum(monthlyRows, "mobileMoney"))]])}${recordTable("Monthly savings and deposit performance", monthlyRows, ["date", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits", "closingBalance"])}` : ""}
    ${tab === "exports" ? memberStatementExportPanel(lines) : ""}
  `;
}

function memberStatementEvidencePanel(lines, balances) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("statementReadiness")}</h2>
          <p>${t("statementReadinessCopy")}</p>
        </div>
        <span class="status active">${t("verified")}</span>
      </div>
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("SACCO", contextName())}
        ${mini("Last sync", state.lastSync || "Pending")}
        ${mini("Opening balance", money.format(lines[0]?.runningBalance || 0))}
        ${mini("Closing balance", money.format(lines.at(-1)?.runningBalance || Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)))}
        ${mini("Export formats", "PDF / Excel")}
      </div>
      <ul class="activity-list">
        <li><strong>Statement evidence</strong><span>Only posted transactions appear in the member statement and receipt trail.</span><em>Verified</em></li>
        <li><strong>Full-date display</strong><span>Statement dates include the year so members can distinguish current and historical activity.</span><em>Production</em></li>
        <li><strong>Support path</strong><span>If a line is unclear, the member can raise a complaint with the transaction reference.</span><em>Traceable</em></li>
      </ul>
    </section>
  `;
}

function memberStatementExportPanel(lines) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Statement export controls</h2>
          <p>Download or print statement evidence after confirming posted activity and balances.</p>
        </div>
        <span class="status active">Export ready</span>
      </div>
      <div class="source-grid">
        ${mini("PDF", "Available")}
        ${mini("Excel", "Available")}
        ${mini("Print", "Available")}
        ${mini("Statement rows", lines.length)}
        ${mini("Date format", "Full date")}
        ${mini("Reference trail", "Included")}
      </div>
    </section>
  `;
}

function memberReceiptsView(dash) {
  const receipts = memberStatementLines(dash)
    .filter((line) => line.reference && (Number(line.credit || 0) > 0 || Number(line.debit || 0) > 0))
    .map((line) => ({
      ...line,
      receiptNo: `RCT-${line.reference}`,
      paymentRoute: paymentRouteLabel(line),
      paymentStatus: paymentLifecycleStatus(line),
      receiptStatus: receiptLifecycleStatus({ ...line, receiptStatus: "Available" }),
      amount: Number(line.credit || 0) || Number(line.debit || 0)
    }))
    .sort((a, b) => new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0));
  const tabs = [["receipts", t("receipts")], ["evidence", t("evidence")], ["exports", "Export/print"]];
  const tab = activeModuleTab("receipts", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("receipts"), receipts.length, "Posted transactions with evidence", "View")}
      ${summary(t("totalReceived"), money.format(sum(receipts.filter((row) => Number(row.credit || 0) > 0), "credit")), "Deposits and repayments", t("export"))}
      ${summary(t("withdrawals"), money.format(sum(receipts.filter((row) => Number(row.debit || 0) > 0), "debit")), "Cash-out evidence", t("review"))}
      ${summary(t("receiptStatus"), receipts.length ? t("available") : t("pending"), "Only posted transactions", t("refresh"))}
    </div>
    ${moduleTabs("receipts", tabs, tab)}
    ${tab === "receipts" ? `${filterToolbar("Search receipts by number, reference, narration or date", "Download receipt", "Print")}${recordTable("Member receipts", receipts, ["receiptNo", "reference", "description", "paymentRoute", "amount", "paymentStatus", "receiptStatus", "postedAt"])}` : ""}
    ${tab === "evidence" ? memberReceiptEvidencePanel(receipts) : ""}
    ${tab === "exports" ? memberReceiptExportPanel(receipts) : ""}
  `;
}

function memberReceiptEvidencePanel(receipts) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("receiptEvidenceControls")}</h2>
          <p>${t("receiptEvidenceCopy")}</p>
        </div>
        <span class="status active">${t("evidenceReady")}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt count", receipts.length)}
        ${mini("Posted only", "Yes")}
        ${mini("Reference trail", "Required")}
        ${mini("Full dates", "Enabled")}
        ${mini("Support ready", "Use complaints")}
        ${mini("Last sync", state.lastSync ? formatDateTime(state.lastSync) : "Pending")}
      </div>
    </section>
  `;
}

function memberReceiptExportPanel(receipts) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("receiptExportPrint")}</h2>
          <p>${t("receiptExportPrintCopy")}</p>
        </div>
        <span class="status active">${t("printReady")}</span>
      </div>
      <div class="source-grid">
        ${mini("Download receipt", receipts.length ? "Available" : "No receipt yet")}
        ${mini("Print", "Available")}
        ${mini("Mobile money", "Included")}
        ${mini("Treasurer cash", "After posting")}
      </div>
    </section>
  `;
}

function memberNotificationsView() {
  const rows = memberAdminMessageRows().map((notification) => ({
    ...notification,
    action: !notification.readAt && !normal(notification.status).includes("read") ? "member-notification-acknowledge" : "none",
    actionLabel: "Acknowledge",
    actionId: notification.id
  }));
  const unread = rows.filter((row) => !normal(`${row.status} ${row.readAt}`).includes("read"));
  const tabs = [["inbox", "Inbox"], ["unread", "Unread"], ["evidence", "Delivery evidence"]];
  const tab = activeModuleTab("notifications", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("SACCO admin messages", rows.length, "Official SACCO communication", "Read")}
      ${summary("Unread", unread.length, "Needs acknowledgement", "Acknowledge")}
      ${summary("Channels", uniqueCount(rows, "channel"), "SMS, email and in-app", "Review")}
      ${summary("Last message", rows[0]?.createdAt ? formatDateTime(rows[0].createdAt) : "None", "Latest communication", "Open")}
    </div>
    ${moduleTabs("notifications", tabs, tab)}
    ${state.memberNotificationMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberNotificationMessage)}</strong></div>` : ""}
    ${state.memberNotificationError ? `<div class="notice warning"><strong>Notification update failed.</strong><span>${escapeHtml(state.memberNotificationError)}</span></div>` : ""}
    ${tab === "inbox" ? `${memberTabReadinessPanel("Member message inbox", "Read SACCO admin notices, reminders and approval updates in one controlled inbox.", [["Messages", rows.length], ["Unread", unread.length], ["Source", "SACCO admin"]])}${recordTable("Notifications", rows, ["title", "message", "channel", "status", "createdAt", "readAt"])}` : ""}
    ${tab === "unread" ? `${memberTabReadinessPanel("Unread message queue", "Acknowledge unread SACCO admin messages so the SACCO can confirm delivery.", [["Unread", unread.length], ["Action", "Acknowledge"], ["Audit", "Read timestamp"]])}${recordTable("Unread SACCO admin messages", unread, ["title", "message", "channel", "status", "createdAt", "readAt"])}` : ""}
    ${tab === "evidence" ? memberNotificationEvidencePanel(rows) : ""}
  `;
}

function memberNotificationEvidencePanel(rows) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Message delivery evidence</h2>
          <p>Member messages keep channel, status and acknowledgement dates for SACCO follow-up.</p>
        </div>
        <span class="status active">Traceable</span>
      </div>
      <div class="source-grid">
        ${mini("Messages", rows.length)}
        ${mini("Channels", uniqueCount(rows, "channel"))}
        ${mini("Acknowledgement", "Read timestamp")}
        ${mini("Full dates", "Enabled")}
        ${mini("Support path", "Complaints")}
        ${mini("Last sync", state.lastSync ? formatDateTime(state.lastSync) : "Pending")}
      </div>
    </section>
  `;
}

function memberComplaintsView() {
  const complaints = state.memberData.complaints || [];
  const open = complaints.filter((row) => !["closed", "resolved"].includes(normal(row.status)));
  const complaintDrafts = memberDraftRows("complaint");
  const tabs = [["submit", t("submit")], ["drafts", t("drafts")], ["tracking", t("tracking")], ["evidence", t("evidence")]];
  const tab = activeModuleTab("complaints", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("myComplaints"), complaints.length, "Submitted support cases", "Track")}
      ${summary(t("openCases"), open.length, "Awaiting action", "Follow up")}
      ${summary(t("resolvedCases"), complaints.length - open.length, "Closed support history", t("review"))}
      ${summary(t("offlineDrafts"), complaintDrafts.length, "Saved before sync", t("sync"))}
    </div>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberComplaintCenter")}</h2>
          <p>${t("memberComplaintCenterCopy")}</p>
        </div>
        <span class="status ${open.length ? "pending" : "active"}">${open.length ? t("followUpActive") : t("noOpenCases")}</span>
      </div>
      <div class="source-grid">
        ${mini("Member", state.member?.membershipNo)}
        ${mini("SACCO", contextName())}
        ${mini("Sync state", state.lastError ? "Retry needed" : "Ready")}
        ${mini("Attachments", "Supported")}
        ${mini("Priority", "Low / Medium / High")}
        ${mini("Tracking", "Status history")}
      </div>
    </section>
    ${moduleTabs("complaints", tabs, tab)}
    ${tab === "submit" ? memberComplaintForm() : ""}
    ${tab === "drafts" ? `${memberTabReadinessPanel("Complaint draft workspace", "Save support cases locally and sync them when you are ready.", [["Drafts", complaintDrafts.length], ["Storage", "Local device"], ["Sync", complaintDrafts.length ? "Action available" : "Clear"]])}${memberDraftPanel("Complaint offline drafts", complaintDrafts)}` : ""}
    ${tab === "tracking" ? `${memberTabReadinessPanel("Complaint tracking workspace", "Track submitted cases, priority and SACCO support status with full dates.", [["Open cases", open.length], ["Resolved", complaints.length - open.length], ["Support desk", "SACCO admin"]])}${recordTable("My complaints", complaints, ["id", "category", "subject", "priority", "status", "createdAt"])}` : ""}
    ${tab === "evidence" ? memberComplaintEvidencePanel(complaints, open) : ""}
  `;
}

function memberComplaintEvidencePanel(complaints, open) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint evidence controls</h2>
          <p>Use references, dates, priority and status to follow up with SACCO administration.</p>
        </div>
        <span class="status ${open.length ? "pending" : "active"}">${open.length ? "Follow-up active" : "Clear"}</span>
      </div>
      <div class="source-grid">
        ${mini("Submitted cases", complaints.length)}
        ${mini("Open cases", open.length)}
        ${mini("Full dates", "Enabled")}
        ${mini("Attachments", "Supported")}
        ${mini("Support owner", "SACCO admin")}
        ${mini("Last sync", state.lastSync ? formatDateTime(state.lastSync) : "Pending")}
      </div>
    </section>
  `;
}

function memberComplaintForm() {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member complaint submission</h2>
          <p>Send a member case directly to the SACCO support queue from the member portal.</p>
        </div>
        <span class="status active">Ready to sync</span>
      </div>
      ${state.memberComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberComplaintMessage)}</strong></div>` : ""}
      ${state.memberComplaintError ? `<div class="notice warning"><strong>Complaint submission failed.</strong><span>${escapeHtml(state.memberComplaintError)}</span></div>` : ""}
      <form id="memberComplaintForm" class="form-grid">
        <label><span>Category</span><select id="memberComplaintCategory">${complaintCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Priority</span><select id="memberComplaintPriority"><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
        <label class="wide"><span>Subject</span><input id="memberComplaintSubject" required placeholder="Short complaint title"></label>
        <label class="wide"><span>Message</span><textarea id="memberComplaintDescription" required placeholder="Describe the issue, date, amount/reference if any, and expected help"></textarea></label>
        <div class="form-actions inline"><button class="button secondary" type="button" data-member-draft-save="complaint">Save draft</button><button class="button primary" type="submit">Submit complaint</button></div>
      </form>
    </section>
  `;
}

function memberDraftPanel(title, drafts) {
  const filtered = filterRows(drafts || []);
  const columns = ["type", "title", "amount", "details", "status", "updatedAt"];
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>Drafts are saved on this device and can be synced when the backend is reachable.</p>
        </div>
        <span class="status ${drafts.some((draft) => normal(draft.status) === "failed") ? "danger" : drafts.length ? "pending" : "active"}">${drafts.length ? "Drafts available" : "No drafts"}</span>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${labelize(column)}</th>`).join("")}<th>Actions</th></tr></thead>
            <tbody>${filtered.map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      ` : emptyState("No offline drafts", "Use Save draft to keep a payment or complaint on this device before syncing.")}
    </section>
  `;
}

function memberDraftRows(type = "") {
  return (state.memberData.drafts || [])
    .filter((draft) => !type || draft.type === type)
    .map((draft) => ({
      ...draft,
      amount: draft.payload?.amount || 0,
      details: draft.type === "payment"
        ? `${labelize(draft.payload?.purpose || "payment")} / ${draft.payload?.provider || "provider"} / ${draft.payload?.externalReference || "no reference"}`
        : draft.payload?.description || "Complaint case",
      action: "member-draft",
      actionId: draft.id,
      actionLabel: "Sync"
    }));
}

function memberProfileView(balances) {
  const member = state.member || {};
  const tabs = [["overview", "Overview"], ["kyc", "KYC"], ["contacts", "Contacts"], ["balances", "Balances"]];
  const tab = activeModuleTab("profile", tabs);
  return `
    <div class="dashboard-grid">
      ${summary("Membership No", member.membershipNo || "-", "Unique SACCO member identity", "Copy")}
      ${summary("Member status", labelize(member.status || "pending"), "Operating access", "Review")}
      ${summary("KYC status", labelize(member.kycStatus || "pending"), "Profile verification", "Open")}
      ${summary("Total balance", money.format(Number(balances.savings || 0) + Number(balances.shares || 0) + Number(balances.welfare || 0)), "Savings, shares and welfare", "View")}
    </div>
    ${moduleTabs("profile", tabs, tab)}
    ${tab === "overview" ? memberProfileOverviewPanel(member) : ""}
    ${tab === "kyc" ? memberProfileKycPanel(member) : ""}
    ${tab === "contacts" ? `${memberTabReadinessPanel("Member contact controls", "Contact details are used for SACCO notices, support follow-up and account recovery.", [["Phone", member.phone || "Missing"], ["Email", member.email || "Missing"], ["Update route", "SACCO office"]])}${recordTable("Profile contacts", [member], ["fullName", "membershipNo", "phone", "email", "nationalId", "status"])}` : ""}
    ${tab === "balances" ? `${memberTabReadinessPanel("Member balance identity", "Balances are shown beside identity details so the member can confirm the correct account.", [["Savings", money.format(balances.savings || 0)], ["Shares", money.format(balances.shares || 0)], ["Welfare", money.format(balances.welfare || 0)]])}${recordTable("Balance summary", [{ account: "Savings", balance: balances.savings || 0 }, { account: "Shares", balance: balances.shares || 0 }, { account: "Welfare", balance: balances.welfare || 0 }], ["account", "balance"])}` : ""}
  `;
}

function memberProfileOverviewPanel(member) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member profile and KYC</h2>
          <p>Personal details shown here come from the member session and SACCO KYC record.</p>
        </div>
        <span class="status ${normal(member.kycStatus) === "approved" ? "active" : "pending"}">${labelize(member.kycStatus || "pending")}</span>
      </div>
      <div class="source-grid">
        ${mini("Full name", member.fullName)}
        ${mini("Member type", labelize(member.memberType || "member"))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Joining date", member.joiningDate)}
      </div>
    </section>
  `;
}

function memberProfileKycPanel(member) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member KYC readiness</h2>
          <p>KYC status controls whether the member can transact, borrow and receive SACCO services.</p>
        </div>
        <span class="status ${normal(member.kycStatus) === "approved" ? "active" : "pending"}">${labelize(member.kycStatus || "pending")}</span>
      </div>
      <div class="source-grid">
        ${mini("KYC status", labelize(member.kycStatus || "pending"))}
        ${mini("Member status", labelize(member.status || "pending"))}
        ${mini("National ID", member.nationalId || "Missing")}
        ${mini("Member type", labelize(member.memberType || "member"))}
        ${mini("Review owner", "SACCO admin")}
        ${mini("Support path", "Complaints")}
      </div>
      <ul class="activity-list">
        <li><strong>Identity confirmation</strong><span>Full name, membership number, phone and national ID must match SACCO KYC records.</span><em>Required</em></li>
        <li><strong>Service access</strong><span>Approved KYC improves access to payments, loan applications and guarantor requests.</span><em>Controlled</em></li>
        <li><strong>Correction path</strong><span>Members should contact the SACCO office or submit a complaint to correct profile details.</span><em>Traceable</em></li>
      </ul>
    </section>
  `;
}

function memberSecurityView() {
  const expiresAt = state.memberData.sessionExpiresAt || state.memberData.dashboard?.sessionExpiresAt || "Current browser session";
  const tabs = [["session", t("session")], ["login", t("login")], ["recovery", t("recovery")], ["safety", t("safety")]];
  const tab = activeModuleTab("security", tabs);
  return `
    <div class="dashboard-grid">
      ${summary(t("session"), state.token ? t("active") : t("signedOut"), "Bearer token stored on this device", t("review"))}
      ${summary(t("loginCode"), contextCode(), "Required with username and password", "Confirm")}
      ${summary(t("password"), t("protected"), "Never displayed by Tereka Online", "Change")}
      ${summary(t("demoAccess"), demoToolsEnabled() ? "Visible" : t("demoAccessHidden"), "Disabled outside dev/demo", "Audit")}
    </div>
    ${moduleTabs("security", tabs, tab)}
    ${tab === "session" ? memberSecuritySessionPanel(expiresAt) : ""}
    ${tab === "login" ? memberSecurityLoginPanel() : ""}
    ${tab === "recovery" ? memberSecurityRecoveryPanel() : ""}
    ${tab === "safety" ? memberSecuritySafetyPanel() : ""}
  `;
}

function memberSecuritySessionPanel(expiresAt) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${t("memberSecurityCenter")}</h2>
          <p>${t("memberSecurityCenterCopy")}</p>
        </div>
        <span class="status active">${t("protected")}</span>
      </div>
      <div class="source-grid">
        ${mini("SACCO code", contextCode())}
        ${mini("Username", state.member?.membershipNo || state.member?.email || state.member?.phone)}
        ${mini("Session expiry", expiresAt)}
        ${mini("Token storage", "Local device")}
        ${mini("Password reset", "Staff-assisted")}
        ${mini("Last sync", state.lastSync || "Pending")}
      </div>
    </section>
  `;
}

function memberSecurityLoginPanel() {
  return memberTabReadinessPanel("Member login requirements", "Members sign in with SACCO code plus username, email, phone or membership number and password.", [
    ["SACCO code", contextCode()],
    ["Username options", "Username/email/phone/member no"],
    ["Password", "Required"],
    ["Role", "Member"]
  ]);
}

function memberSecurityRecoveryPanel() {
  return memberTabReadinessPanel("Member recovery controls", "Account recovery is staff-assisted so the SACCO can verify identity before resetting access.", [
    ["Password reset", "Staff-assisted"],
    ["Contact update", "SACCO office"],
    ["Identity check", "KYC record"],
    ["Support path", "Complaint"]
  ]);
}

function memberSecuritySafetyPanel() {
  return `
    ${memberTabReadinessPanel("Member safety actions", "Use these actions when a device, password or account detail looks suspicious.", [["Report issue", "Available"], ["Logout", "Immediate"], ["Demo access", demoToolsEnabled() ? "Visible" : "Hidden"], ["Audit", "Session tracked"]])}
    ${tabsCard("Security actions", ["Change password request", "Logout current device", "Report suspicious access", "Update phone/email", "Review login code"])}
  `;
}

function dashboardIntro(title, copy) {
  return `
    <div class="role-banner">
      <div><p class="eyebrow">${escapeHtml(title)}</p><h2>${escapeHtml(copy)}</h2></div>
      <span class="status active">Role filtered</span>
    </div>
  `;
}

function rolePriorityPanel(title, rows) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>Role-specific work areas based on current records and permissions.</p>
        </div>
        <span class="status active">Role dashboard</span>
      </div>
      <ul class="activity-list">
        ${rows.map((row) => `<li><strong>${escapeHtml(row[0])}</strong><span>${escapeHtml(row[1])}</span><em>${escapeHtml(row[2])}</em></li>`).join("")}
      </ul>
    </section>
  `;
}

function roleAccessPanel(title = "My role access") {
  const visible = visibleModules();
  const source = state.auth === "member" ? memberModules : isPlatform() ? platformModules : saccoModules;
  const hidden = source.filter((item) => !visible.some((allowed) => allowed[0] === item[0]));
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>${escapeHtml(roleLabel())} can use ${visible.length} module(s). Protected modules are hidden from the menu and dashboard actions.</p>
        </div>
        <span class="status active">Access filtered</span>
      </div>
      <div class="access-grid">
        ${visible.map((item) => `<div><strong>${escapeHtml(item[1])}</strong><span>${escapeHtml(item[2])}</span></div>`).join("")}
      </div>
      ${hidden.length ? `<p class="muted-note">Hidden for this role: ${hidden.map((item) => escapeHtml(item[1])).join(", ")}.</p>` : ""}
    </section>
  `;
}

function summary(label, value, detail, action) {
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button">${action}</button></article>`;
}

function summaryLink(label, value, detail, action, view) {
  const allowed = canAccessView(view);
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small><button type="button" ${allowed ? `data-summary-view="${escapeHtml(view)}"` : "disabled"}>${allowed ? action : t("dashboardOnly")}</button></article>`;
}

function mini(label, value) {
  return `<div class="mini-fact"><span>${label}</span><strong>${escapeHtml(String(value || t("none")))}</strong></div>`;
}

function chartCard(title, labels, values) {
  const max = Math.max(...values, 1);
  return `<section class="panel"><h2>${title}</h2><div class="bar-chart">${labels.map((label, index) => `<div><span>${label}</span><b style="width:${Math.max(8, values[index] / max * 100)}%"></b><strong>${values[index]}</strong></div>`).join("")}</div></section>`;
}

function activityPanel(title, rows) {
  return `<section class="panel"><h2>${title}</h2><ul class="activity-list">${rows.map((row) => `<li><strong>${row[0] || t("record")}</strong><span>${row[1] || ""}</span><em>${row[2] || t("pending")}</em></li>`).join("") || `<li><strong>${t("noRecordsYet")}</strong><span>${t("refreshToTryAgain")}</span><em>${t("empty")}</em></li>`}</ul></section>`;
}

function recordTable(title, rows, columns) {
  const tableKey = tableStateKey(title);
  const tableState = state.tableState[tableKey] || { search: "", page: 1, pageSize: 10 };
  const allRows = rows || [];
  const globalFiltered = filterRows(allRows);
  const tableSearch = tableState.search || "";
  const filtered = filterRowsByQuery(globalFiltered, tableSearch);
  const pageSize = Number(tableState.pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(tableState.page || 1)), totalPages);
  if (currentPage !== tableState.page) state.tableState[tableKey] = { ...tableState, page: currentPage };
  const start = filtered.length ? (currentPage - 1) * pageSize : 0;
  const pagedRows = filtered.slice(start, start + pageSize);
  const hasGlobalSearch = Boolean(state.search.trim());
  const hasTableSearch = Boolean(tableSearch.trim());
  const searching = hasGlobalSearch || hasTableSearch;
  const countLabel = searching ? `${filtered.length} ${t("of")} ${allRows.length} ${t("shown")}` : `${filtered.length} ${t("records")}`;
  const rangeLabel = filtered.length ? `${t("showingRange")} ${start + 1}-${Math.min(start + pageSize, filtered.length)} ${t("of")} ${filtered.length}` : t("noRowsToShow");
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>${title}</h2>
        <div class="table-count">
          <span>${countLabel}</span>
          ${searching ? `<button class="table-action" type="button" data-action="clear-search">${t("clearSearch")}</button>` : ""}
        </div>
      </div>
      <div class="table-tools">
        <label>
          <span>${t("searchThisTable")}</span>
          <input value="${escapeHtml(tableSearch)}" data-table-search="${escapeHtml(tableKey)}" placeholder="Search ${escapeHtml(title.toLowerCase())}">
        </label>
        <label>
          <span>${t("rowsPerPage")}</span>
          <select data-table-page-size="${escapeHtml(tableKey)}">
            ${[10, 25, 50, 100].map((size) => `<option value="${size}" ${pageSize === size ? "selected" : ""}>${size}</option>`).join("")}
          </select>
        </label>
      </div>
      ${filtered.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>${columns.map((column) => `<th>${labelize(column)}</th>`).join("")}<th>${t("actions")}</th></tr></thead>
            <tbody>${pagedRows.map((row) => `<tr>${columns.map((column) => `<td>${formatValue(row, column)}</td>`).join("")}<td>${rowAction(row)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
        <div class="pagination">
          <span>${rangeLabel}</span>
          <div>
            <button class="table-action" type="button" data-table-page="${escapeHtml(tableKey)}" data-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>${t("previous")}</button>
            <strong>${t("page")} ${currentPage} ${t("of")} ${totalPages}</strong>
            <button class="table-action" type="button" data-table-page="${escapeHtml(tableKey)}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>${t("next")}</button>
          </div>
        </div>
      ` : emptyState(t("noRecordsFound"), t("noRecordsFoundCopy"))}
    </section>
  `;
}

function rowAction(row) {
  if (row.action === "none") return `<span class="status pending">No action</span>`;
  if (row.action === "member-draft" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-member-draft-sync="${escapeHtml(row.actionId)}">Sync</button>
        <button class="table-action danger" type="button" data-member-draft-discard="${escapeHtml(row.actionId)}">Discard</button>
      </div>
    `;
  }
  if (row.action === "member-guarantor" && row.actionId) {
    return `
      <div class="table-actions">
        <button class="table-action" type="button" data-member-guarantor-action="accepted" data-row-id="${escapeHtml(row.actionId)}">Accept</button>
        <button class="table-action danger" type="button" data-member-guarantor-action="rejected" data-row-id="${escapeHtml(row.actionId)}">Reject</button>
      </div>
    `;
  }
  if (row.action === "notification-acknowledge" && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="notification-acknowledge" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Acknowledge")}</button>`;
  }
  if (row.action === "notification-retry" && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="notification-retry" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Retry")}</button>`;
  }
  if (row.action === "member-notification-acknowledge" && row.actionId) {
    return `<button class="table-action" type="button" data-member-notification-acknowledge="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Acknowledge")}</button>`;
  }
  if (row.action === "payment-provider-status" && row.actionId) {
    return `<button class="table-action" type="button" data-payment-provider-status="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "Check status")}</button>`;
  }
  if (row.action && row.actionId) {
    return `<button class="table-action" type="button" data-row-action="${escapeHtml(row.action)}" data-row-id="${escapeHtml(row.actionId)}">${escapeHtml(row.actionLabel || "View")}</button>`;
  }
  return `<button class="table-action" type="button">View</button>`;
}

function filterToolbar(placeholder, primary, secondary) {
  return `
    <section class="filter-toolbar">
      <label><span>Search</span><input value="${escapeHtml(state.search)}" data-search-input placeholder="${placeholder}"></label>
      <label><span>Status</span><select><option>All statuses</option><option>Active</option><option>Pending</option><option>Failed</option></select></label>
      <label><span>Date range</span><input type="date"></label>
      <button class="button primary" type="button">${primary}</button>
      <button class="button secondary" type="button">${secondary}</button>
    </section>
  `;
}

function wizardCard(title, steps) {
  return `<section class="panel"><h2>${title}</h2><div class="stepper">${steps.map((step, index) => `<div><span>${index + 1}</span><strong>${step}</strong></div>`).join("")}</div></section>`;
}

function tabsCard(title, tabs) {
  return `<section class="panel"><h2>${title}</h2><div class="tabs">${tabs.map((tab, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</div><div class="blueprint">This screen follows the uploaded UI/UX requirement and is ready for deeper actions, validation, confirmations and exports.</div></section>`;
}

function formPreview(title, fields) {
  return `<section class="panel"><h2>${title}</h2><div class="form-grid">${fields.map((item) => `<label><span>${item}</span><input placeholder="${item}"></label>`).join("")}</div><div class="form-actions"><button class="button secondary" type="button">Save draft</button><button class="button primary" type="button">Submit</button></div></section>`;
}

function addUserPanel(platformOnly) {
  const roles = userRoleOptions(platformOnly);
  const defaultRole = roles[0] || {};
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${platformOnly ? "Add platform user" : "Add SACCO staff user"}</h2>
          <p>${platformOnly ? "Create a platform administrator and assign the role that controls their views." : "Create a SACCO staff login for Treasurer, Secretary, Chairperson or another staff role. Members are managed in the Members screen."}</p>
        </div>
      </div>
      ${state.userFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.userFormMessage)}</strong></div>` : ""}
      ${state.userFormError ? `<div class="notice warning"><strong>Could not create user.</strong><span>${escapeHtml(state.userFormError)}</span></div>` : ""}
      <form id="addUserForm" class="form-grid">
        <input type="hidden" id="newUserTenantId" value="${platformOnly ? "tenant_platform" : escapeHtml(state.user?.tenantId || "")}">
        <label><span>Full name</span><input id="newUserFullName" required placeholder="${platformOnly ? "e.g. Platform Support Officer" : "e.g. Branch Teller"}"></label>
        <label><span>Email / username</span><input id="newUserEmail" type="email" required placeholder="name@tereka.online"></label>
        <label><span>Phone</span><input id="newUserPhone" placeholder="+256..."></label>
        <label><span>Temporary password</span><input id="newUserPassword" type="password" required minlength="10" placeholder="At least 10 characters"></label>
        <div class="wide">
          <span class="field-label">Roles</span>
          <div class="role-checkbox-grid">
            ${roles.map((role, index) => `
              <label class="check-row">
                <input type="checkbox" name="newUserRoleIds" value="${escapeHtml(role.id)}" data-role-checkbox="new" ${index === 0 ? "checked" : ""}>
                <span>${escapeHtml(role.name)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="mini-fact wide">
          <span>Role access preview</span>
          <strong id="newUserRolePreview">${escapeHtml(roleSummaryText(defaultRole.id ? [defaultRole.id] : [], platformOnly))}</strong>
        </div>
        <div class="form-actions inline">
          <button class="button primary" type="submit">Create user</button>
          <button class="button secondary" type="button" data-action="refresh">Refresh list</button>
        </div>
      </form>
    </section>
  `;
}

function userDetailPanel(users, canManageRoles) {
  const selected = users.find((user) => user.id === state.selectedUserId);
  if (!selected) return "";
  const roles = userRoleOptions(selected.tenantId === "tenant_platform");
  const assignedRoleIds = state.selectedUserRoles || [];
  const assignedRoles = roles.filter((role) => assignedRoleIds.includes(role.id));
  const primaryRole = assignedRoles[0] || roles[0] || {};
  const platformUser = selected.tenantId === "tenant_platform";
  const canManageUser = canManageRoles && (!platformUser || roleKind() === "super");
  const nextStatus = normal(selected.status) === "active" ? "suspended" : "active";
  const sessionRows = (state.selectedUserSessions || []).map((session) => ({
    id: session.id,
    ipAddress: session.ipAddress || "Not captured",
    device: deviceLabel(session.userAgent),
    createdAt: formatDateTime(session.createdAt),
    expiresAt: formatDateTime(session.expiresAt),
    action: canManageUser && selected.id !== state.user?.id ? "user-session-revoke" : "none",
    actionLabel: "Revoke",
    actionId: `${selected.id}|${session.id}`
  }));
  const resetRows = (state.selectedUserPasswordResets || []).map((request) => ({
    id: request.id,
    status: request.status,
    createdAt: formatDateTime(request.createdAt),
    expiresAt: formatDateTime(request.expiresAt),
    usedAt: request.usedAt ? formatDateTime(request.usedAt) : "-"
  }));
  const latestReset = resetRows[0];
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>User detail and role assignment</h2>
          <p>${escapeHtml(selected.fullName || selected.email)} - ${escapeHtml(selected.email || "No email")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-user-detail">Close</button>
      </div>
      ${state.selectedUserMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedUserMessage)}</strong></div>` : ""}
      ${state.selectedUserResetToken ? `<div class="notice compact"><strong>Development reset token</strong><span>${escapeHtml(state.selectedUserResetToken)} expires ${escapeHtml(formatDateTime(state.selectedUserResetExpiresAt))}</span></div>` : ""}
      ${state.selectedUserError ? `<div class="notice warning"><strong>User update failed.</strong><span>${escapeHtml(state.selectedUserError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("SACCO", platformUser ? "Platform Administration" : selected.tenantId)}
        ${mini("Status", selected.status)}
        ${mini("Phone", selected.phone)}
        ${mini("User ID", selected.id)}
        ${mini("Current roles", assignedRoles.length ? assignedRoles.map((role) => role.name).join(", ") : "Unassigned")}
        ${mini("MFA", selected.mfaEnabled ? "Enabled" : "Not enabled")}
        ${mini("Login reset required", selected.passwordResetRequired ? "Yes" : "No")}
        ${mini("Password reset", latestReset ? `${latestReset.status} until ${latestReset.expiresAt}` : "No pending reset")}
        ${mini("Active sessions", selected.activeSessionCount || 0)}
        ${mini("Access purpose", rolePurpose(primaryRole.name || selected.role || "", platformUser))}
        ${mini("Module scope", roleModuleScope(primaryRole.name || selected.role || "", platformUser))}
        ${mini("User type", platformUser ? "Platform administrator" : "SACCO staff")}
      </div>
      <form id="userProfileForm" class="form-grid">
        <input type="hidden" id="profileUserId" value="${escapeHtml(selected.id)}">
        <label><span>Full name</span><input id="profileUserFullName" value="${escapeHtml(selected.fullName || "")}" ${canManageUser ? "" : "disabled"} required></label>
        <label><span>Email / username</span><input id="profileUserEmail" type="email" value="${escapeHtml(selected.email || "")}" ${canManageUser ? "" : "disabled"} required></label>
        <label><span>Phone</span><input id="profileUserPhone" value="${escapeHtml(selected.phone || "")}" ${canManageUser ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManageUser ? `<button class="button primary" type="submit">Save user details</button>` : `<span class="status pending">Profile view only</span>`}
        </div>
      </form>
      <form id="userRoleForm" class="form-grid single">
        <input type="hidden" id="selectedUserId" value="${escapeHtml(selected.id)}">
        <div>
          <span class="field-label">${platformUser ? "Assigned platform roles" : "Assigned SACCO staff roles"}</span>
          <div class="role-checkbox-grid">
            ${roles.map((role) => `
              <label class="check-row">
                <input type="checkbox" name="selectedUserRoleIds" value="${escapeHtml(role.id)}" data-role-checkbox="selected" ${assignedRoleIds.includes(role.id) ? "checked" : ""} ${canManageUser ? "" : "disabled"}>
                <span>${escapeHtml(role.name)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="mini-fact">
          <span>Selected access</span>
          <strong id="selectedUserRolePreview">${escapeHtml(roleSummaryText(assignedRoleIds, platformUser))}</strong>
        </div>
        <div class="form-actions">
          ${canManageUser ? `<button class="button primary" type="submit">Save role</button>` : `<span class="status pending">Role view only</span>`}
        </div>
      </form>
      <div class="danger-zone">
        <div>
          <strong>Administrator status</strong>
          <span>${canManageUser ? "Suspend, reactivate or delete this login while preserving audit history." : "Only Platform Super Admin can manage platform administrator status."}</span>
        </div>
        <div class="table-actions">
          ${canManageUser ? `
            <button class="table-action" type="button" data-user-mfa="${selected.mfaEnabled ? "false" : "true"}" data-row-id="${escapeHtml(selected.id)}">${selected.mfaEnabled ? "Disable MFA" : "Enable MFA"}</button>
            <button class="table-action" type="button" data-user-password-reset="${escapeHtml(selected.id)}">Request password reset</button>
            ${selected.id !== state.user?.id ? `<button class="table-action" type="button" data-user-revoke-sessions="${escapeHtml(selected.id)}">Force logout sessions</button>` : ""}
            <button class="table-action" type="button" data-user-status="${nextStatus}" data-row-id="${escapeHtml(selected.id)}">${normal(selected.status) === "active" ? "Suspend user" : "Reactivate user"}</button>
            <button class="table-action danger" type="button" data-user-delete="${escapeHtml(selected.id)}">Delete user</button>
          ` : `<span class="status pending">Restricted</span>`}
        </div>
      </div>
      ${canManageUser ? recordTable("Active session detail", sessionRows, ["ipAddress", "device", "createdAt", "expiresAt"]) : ""}
      ${canManageUser ? recordTable("Password reset history", resetRows, ["status", "createdAt", "expiresAt", "usedAt"]) : ""}
    </section>
  `;
}

function roleCoveragePanel(users, roles, platformOnly) {
  const rows = roles.map((role) => {
    const assignedUsers = users.filter((user) => normal(user.role).includes(normal(role.name)) || user.roleId === role.id);
    return {
      roleName: role.name,
      scope: platformOnly ? "Platform administration" : "SACCO staff",
      assignedUsers: assignedUsers.length,
      accessPurpose: rolePurpose(role.name, platformOnly),
      moduleScope: roleModuleScope(role.name, platformOnly),
      status: role.status || "active"
    };
  });
  return recordTable(platformOnly ? "Platform role coverage" : "SACCO staff role coverage", rows, ["roleName", "scope", "assignedUsers", "accessPurpose", "moduleScope", "status"]);
}

function roleCoverage(users, roles) {
  if (!users.length) return "0%";
  const assigned = users.filter((user) => user.role || user.roleId || roles.some((role) => normal(user.role).includes(normal(role.name)))).length;
  return `${Math.round((assigned / users.length) * 100)}%`;
}

function rolePurpose(roleName, platformOnly) {
  const name = normal(roleName);
  if (platformOnly) {
    if (name.includes("super")) return "Full platform control";
    if (name.includes("billing")) return "Subscriptions and payments";
    if (name.includes("compliance")) return "Audit and oversight";
    if (name.includes("support")) return "SACCO support";
    if (name.includes("operations")) return "Monitoring and operations";
    return "Platform administration";
  }
  if (name.includes("treasurer")) return "Finance and cash control";
  if (name.includes("secretary")) return "Membership and governance";
  if (name.includes("chair")) return "Oversight and approvals";
  if (name.includes("accountant")) return "Accounting and reconciliation";
  if (name.includes("teller")) return "Transactions and cashiering";
  if (name.includes("auditor")) return "Read-only audit review";
  if (name.includes("loan")) return "Loan origination";
  return "SACCO administration";
}

function roleModuleScope(roleName, platformOnly) {
  const name = normal(roleName);
  if (platformOnly) {
    if (name.includes("super")) return "All platform modules";
    if (name.includes("billing")) return "Dashboard, subscriptions, reports";
    if (name.includes("compliance")) return "Dashboard, reports, audit";
    if (name.includes("support")) return "Dashboard, SACCOs, complaints";
    if (name.includes("operations")) return "Dashboard, SACCOs, complaints, notifications";
    return "Platform administration";
  }
  if (name.includes("administrator") || name.includes("admin")) return "All SACCO modules";
  if (name.includes("treasurer")) return "Transactions, savings, shares, welfare, approvals, accounting, reconciliation, reports";
  if (name.includes("secretary")) return "Members, shares, welfare, approvals, reports, governance, complaints";
  if (name.includes("chair")) return "Loans, guarantors, approvals, reports, governance";
  if (name.includes("accountant")) return "Transactions, accounting, reconciliation, reports";
  if (name.includes("teller")) return "Transactions and receipts";
  if (name.includes("auditor")) return "Read-only reports and audit";
  if (name.includes("loan")) return "Members, loans, guarantors, approvals, reports";
  return "Configured SACCO modules";
}

function staffAccessRow(user, platformOnly) {
  const role = user.role || user.roleName || roleNameFromId(user.roleId, platformOnly) || "Unassigned";
  return {
    ...user,
    role,
    mfa: user.mfaEnabled ? "Enabled" : "Not enabled",
    activeSessions: user.activeSessionCount || 0,
    accessPurpose: rolePurpose(role, platformOnly),
    moduleScope: roleModuleScope(role, platformOnly),
    status: user.status || "active"
  };
}

function deviceLabel(userAgent) {
  const value = String(userAgent || "").trim();
  if (!value) return "Not captured";
  const browser = value.includes("Edg/") ? "Edge"
    : value.includes("Chrome/") ? "Chrome"
    : value.includes("Firefox/") ? "Firefox"
    : value.includes("Safari/") ? "Safari"
    : "Browser";
  const os = value.includes("Windows") ? "Windows"
    : value.includes("Android") ? "Android"
    : value.includes("iPhone") || value.includes("iPad") ? "iOS"
    : value.includes("Mac OS") ? "macOS"
    : value.includes("Linux") ? "Linux"
    : "Device";
  return `${browser} on ${os}`;
}

function roleNameFromId(roleId, platformOnly) {
  return userRoleOptions(platformOnly).find((role) => role.id === roleId)?.name || "";
}

function saccoStaffAccessGuide(roles) {
  const preferred = ["SACCO Chairperson", "SACCO Treasurer", "SACCO Secretary", "Loans Officer", "Accountant", "Teller", "Auditor"];
  const rows = preferred.map((name) => {
    const configured = roles.find((role) => normal(role.name) === normal(name) || normal(role.name).includes(normal(name.replace("SACCO ", ""))));
    return {
      roleName: configured?.name || name,
      accessPurpose: rolePurpose(configured?.name || name, false),
      moduleScope: roleModuleScope(configured?.name || name, false),
      configured: configured ? "Available" : "Template"
    };
  });
  return recordTable("SACCO staff role guide", rows, ["roleName", "accessPurpose", "moduleScope", "configured"]);
}

function tenantDetailPanel() {
  const tenant = state.selectedTenant || tenantRows().find((item) => item.id === state.selectedTenantId);
  if (!tenant) return "";
  const profile = state.selectedTenantProfile || {};
  const subscription = subscriptionForTenant(tenant.id);
  const canManage = hasPermission("tenants:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO application review</h2>
          <p>${escapeHtml(tenant.name || "Selected SACCO")} - code ${escapeHtml(tenant.abbreviation || tenant.id || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-tenant-detail">Close</button>
      </div>
      ${state.selectedTenantMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTenantMessage)}</strong></div>` : ""}
      ${state.selectedTenantError ? `<div class="notice warning"><strong>Application update failed.</strong><span>${escapeHtml(state.selectedTenantError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Activation state", tenantStatusLabel(tenant.status))}
        ${mini("Payment stage", saccoPaymentStage(tenant, subscription))}
        ${mini("Approval stage", saccoApprovalStage(tenant, subscription))}
        ${mini("Operating access", subscriptionAccessLabel(subscription || {}, tenant))}
        ${mini("SACCO code", tenant.abbreviation)}
        ${mini("Country", tenant.country)}
        ${mini("Currency", tenant.currencyCode)}
        ${mini("District", tenant.district)}
        ${mini("Parish", profileLocationPart(profile, "Parish"))}
        ${mini("Village", profileLocationPart(profile, "Village"))}
        ${mini("Member range", profileLocationPart(profile, "Member range"))}
        ${mini("Registration", tenant.registrationNo)}
        ${mini("License expiry", tenant.licenseExpiry)}
        ${mini("Onboarding", `${tenant.onboarding || 0}%`)}
        ${mini("Email", profile.email)}
        ${mini("Contact number", profile.phone)}
      </div>
      ${subscription ? recordTable("Subscription readiness", [{
        invoice: subscription.invoice,
        packageName: subscription.tierLabel || subscription.packageId,
        amount: subscription.amount,
        paid: subscription.paid,
        balanceDue: Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0)),
        paymentStage: saccoPaymentStage(tenant, subscription),
        approvalStage: saccoApprovalStage(tenant, subscription),
        operatingAccess: subscriptionAccessLabel(subscription, tenant),
        expiry: subscription.expiry
      }], ["invoice", "packageName", "amount", "paid", "balanceDue", "paymentStage", "approvalStage", "operatingAccess", "expiry"]) : ""}
      <div class="grid two">
        ${recordTable("Registration profile", [profile], ["legalName", "tin", "umraLicenseNo", "cooperativeRegistrationNo", "address", "website"])}
        ${recordTable("Approval history", dataRows("auditEvents").filter((event) => event.recordReference === tenant.id || event.recordId === tenant.id), ["createdAt", "actor", "action", "module", "result"])}
      </div>
      <form id="tenantStatusForm" class="form-grid single">
        <input type="hidden" id="selectedTenantId" value="${escapeHtml(tenant.id)}">
        <label>
          <span>Approval decision</span>
          <select id="selectedTenantStatus" ${canManage ? "" : "disabled"}>
            ${tenantStatusOptions().map((option) => `<option value="${option.value}" ${option.value === tenant.status ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
        <div class="form-actions">
          ${canManage ? `
            <button class="button primary" type="submit">Save decision</button>
            <button class="button secondary" type="button" data-tenant-status="approved">Approve</button>
            <button class="button secondary" type="button" data-tenant-status="active">Activate</button>
            <button class="button secondary" type="button" data-tenant-status="pending_review">Request changes</button>
            <button class="button ghost" type="button" data-tenant-status="terminated">Reject</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function tenantStatusOptions() {
  return [
    { value: "pending_review", label: "Pending review / request changes" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active / operating" },
    { value: "suspended", label: "Suspended" },
    { value: "terminated", label: "Rejected / terminated" }
  ];
}

function tenantStatusLabel(status) {
  return tenantStatusOptions().find((option) => option.value === status)?.label || status || "Pending";
}

function subscriptionDetailPanel(rows) {
  const subscription = rows.find((item) => item.id === state.selectedSubscriptionId);
  if (!subscription) return "";
  const tenant = tenantRows().find((item) => item.id === subscription.tenantId) || {};
  const canManage = isPlatform() && (hasPermission("subscriptions:manage") || roleKind() === "super" || roleKind() === "billing");
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Subscription control</h2>
          <p>${escapeHtml(tenant.name || subscription.tenantId)} - invoice ${escapeHtml(subscription.invoice || subscription.id)}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-subscription-detail">Close</button>
      </div>
      ${state.selectedSubscriptionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedSubscriptionMessage)}</strong></div>` : ""}
      ${state.selectedSubscriptionError ? `<div class="notice warning"><strong>Subscription update failed.</strong><span>${escapeHtml(state.selectedSubscriptionError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Operating access", subscriptionAccessLabel(subscription, tenant))}
        ${mini("Payment status", subscriptionPaymentLabel(subscription))}
        ${mini("Payment stage", saccoPaymentStage(tenant, subscription))}
        ${mini("Approval stage", saccoApprovalStage(tenant, subscription))}
        ${mini("Subscription status", subscription.status)}
        ${mini("SACCO code", tenant.abbreviation || tenant.code || subscription.tenantCode || subscription.tenantId)}
        ${mini("Package", subscription.tierLabel || subscription.packageId)}
        ${mini("Billable members", subscription.billableMembers || subscription.memberCount)}
        ${mini("Amount", money.format(subscription.amount || 0))}
        ${mini("Paid", money.format(subscription.paid || 0))}
        ${mini("Balance due", money.format(due))}
        ${mini("Expiry", subscription.expiry)}
      </div>
      <form id="subscriptionPaymentForm" class="form-grid">
        <input type="hidden" id="selectedSubscriptionId" value="${escapeHtml(subscription.id)}">
        <input type="hidden" id="selectedSubscriptionTenantId" value="${escapeHtml(subscription.tenantId)}">
        <label><span>Payment amount</span><input id="subscriptionPaymentAmount" type="number" min="1" step="1" value="${due || subscription.amount || 0}" ${canManage ? "" : "disabled"}></label>
        <label><span>Payment channel</span><select id="subscriptionPaymentChannel" ${canManage ? "" : "disabled"}><option value="manual">Manual</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="mobile_money">Mobile money</option></select></label>
        <label><span>Reference</span><input id="subscriptionPaymentReference" value="PAY-${Date.now()}" ${canManage ? "" : "disabled"}></label>
        <div class="form-actions inline">
          ${canManage ? `
            <button class="button primary" type="submit">Record payment</button>
            <button class="button secondary" type="button" data-subscription-action="renew">Renew full year</button>
            <button class="button secondary" type="button" data-subscription-action="activate-tenant">Activate access</button>
            <button class="button ghost" type="button" data-subscription-action="suspend-tenant">Suspend access</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function subscriptionAccessLabel(subscription, tenant) {
  tenant = tenant || {};
  subscription = subscription || {};
  if (normal(tenant.status).includes("suspended")) return "Suspended";
  if (normal(subscription.status) === "active" && normal(tenant.status) === "active") return "Active";
  if (normal(subscription.status).includes("pending")) return "Payment pending";
  if (normal(subscription.status).includes("expired")) return "Expired";
  return subscription.status || tenant.status || "Pending";
}

function saccoPaymentStage(tenant, subscription) {
  tenant = tenant || {};
  if (!subscription) return "No subscription";
  const paid = Number(subscription.paid || subscription.amountPaid || 0);
  const amount = Number(subscription.amount || 0);
  const status = normal(subscription.status);
  if (amount > 0 && paid >= amount) return "Callback received";
  if (paid > 0) return "Part payment received";
  if (normal(tenant.status).includes("pending_self_registration") || status.includes("pending")) return "Payment initiated";
  if (status === "active") return "Callback received";
  if (status.includes("expired")) return "Expired";
  return "Payment pending";
}

function saccoApprovalStage(tenant, subscription) {
  tenant = tenant || {};
  const tenantStatus = normal(tenant.status);
  const paymentStage = normal(saccoPaymentStage(tenant, subscription));
  if (tenantStatus === "active" && paymentStage.includes("callback")) return "Active";
  if (tenantStatus === "pending_review" && paymentStage.includes("callback")) return "Ready for approval";
  if (tenantStatus === "pending_self_registration") return "Awaiting payment";
  if (tenantStatus === "approved" && paymentStage.includes("callback")) return "Ready for activation";
  if (tenantStatus.includes("pending")) return "Application review";
  if (tenantStatus.includes("suspended")) return "Suspended";
  if (tenantStatus.includes("terminated")) return "Rejected";
  return tenantStatus ? tenantStatus.replaceAll("_", " ") : "Pending";
}

function subscriptionPaymentLabel(subscription) {
  const amount = Number(subscription.amount || 0);
  const paid = Number(subscription.paid || subscription.amountPaid || 0);
  const status = normal(subscription.paymentStatus || subscription.status);
  if (amount > 0 && paid >= amount) return "Paid";
  if (status.includes("paid") || status === "active") return paid > 0 ? "Part paid" : "Payment confirmed";
  if (paid > 0) return "Part paid";
  if (status.includes("expired")) return "Expired";
  return "Pending payment";
}

function memberRegistrationPanel() {
  const branches = dataRows("branches");
  const defaultBranch = branches[0]?.id || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member registration</h2>
          <p>Create a member profile, login credential and KYC starting state.</p>
        </div>
      </div>
      ${state.memberFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberFormMessage)}</strong></div>` : ""}
      ${state.memberFormError ? `<div class="notice warning"><strong>Member registration failed.</strong><span>${escapeHtml(state.memberFormError)}</span></div>` : ""}
      <form id="memberRegistrationForm" class="form-grid">
        <input type="hidden" id="newMemberTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Membership number</span><input id="newMemberNo" placeholder="Auto if blank"></label>
        <label><span>Branch</span><select id="newMemberBranchId">${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === defaultBranch ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Full name</span><input id="newMemberFullName" required placeholder="Member full name"></label>
        <label><span>Member type</span><select id="newMemberType"><option value="individual">Individual</option><option value="group">Group</option><option value="institutional">Institutional</option><option value="corporate">Corporate</option></select></label>
        <label><span>Phone</span><input id="newMemberPhone" required placeholder="+256..."></label>
        <label><span>Email</span><input id="newMemberEmail" type="email" placeholder="member@example.com"></label>
        <label><span>National ID</span><input id="newMemberNationalId" placeholder="CM..."></label>
        <label><span>Temporary password</span><input id="newMemberPassword" type="password" value="Member@12345"></label>
        <label><span>KYC status</span><select id="newMemberKycStatus"><option value="pending_verification">Pending verification</option><option value="not_verified">Not verified</option><option value="verified">Verified</option></select></label>
        <label><span>Joining date</span><input id="newMemberJoiningDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
        <div class="form-actions inline"><button class="button primary" type="submit">Create member</button></div>
      </form>
    </section>
  `;
}

function memberDetailPanel(mode = "kyc") {
  const member = state.selectedMember || dataRows("members").find((item) => item.id === state.selectedMemberId);
  if (!member) {
    return emptyState(
      mode === "statement" ? "No member selected for statement" : mode === "contacts" ? "No member selected for contacts" : "No member selected for KYC",
      "Open a member from the Member List tab to review this section."
    );
  }
  const canManage = hasPermission("members:approve") || roleKind() === "admin" || roleKind() === "secretary";
  const statementLines = state.selectedMemberStatement?.lines || [];
  const totalBalance = Number(member.savingsBalance || 0) + Number(member.sharesBalance || 0) + Number(member.welfareBalance || 0);
  const lastMovement = statementLines[0]?.postedAt || statementLines[0]?.createdAt || "No statement activity";
  const statementCreditTotal = statementLines.reduce((total, line) => total + statementCredit(line), 0);
  const statementDebitTotal = statementLines.reduce((total, line) => total + statementDebit(line), 0);
  const title = mode === "contacts" ? "Member contacts and documents" : mode === "statement" ? "Member balance statement" : "Member detail and KYC approval";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>${title}</h2>
          <p>${escapeHtml(member.membershipNo || "")} - ${escapeHtml(member.fullName || "")}. This is a SACCO member profile, not a staff login.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-member-detail">Close</button>
      </div>
      ${state.selectedMemberMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMemberMessage)}</strong></div>` : ""}
      ${state.selectedMemberError ? `<div class="notice warning"><strong>Member update failed.</strong><span>${escapeHtml(state.selectedMemberError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Total balance", money.format(totalBalance), "Savings, shares and welfare", "View")}
        ${summary("Statement lines", statementLines.length, "Posted statement activity", "Review")}
        ${summary("Documents", state.selectedMemberDocuments.length, "KYC evidence files", "Verify")}
        ${summary("Contacts", state.selectedMemberNextOfKin.length, "Next-of-kin records", "Review")}
        ${summary("Beneficiaries", state.selectedMemberBeneficiaries.length, "Allocation records", "Review")}
      </div>
      <div class="source-grid">
        ${mini("Status", member.status)}
        ${mini("KYC", member.kycStatus)}
        ${mini("KYC readiness", memberKycReadiness(member))}
        ${mini("Savings", money.format(member.savingsBalance || 0))}
        ${mini("Shares", money.format(member.sharesBalance || 0))}
        ${mini("Welfare", money.format(member.welfareBalance || 0))}
        ${mini("Phone", member.phone)}
        ${mini("Email", member.email)}
        ${mini("National ID", member.nationalId)}
        ${mini("Last movement", lastMovement)}
      </div>
      ${mode === "kyc" ? `
        ${memberKycChecklist(member)}
        <form id="memberStatusForm" class="form-grid single">
          <input type="hidden" id="selectedMemberId" value="${escapeHtml(member.id)}">
          <label><span>Member status</span><select id="selectedMemberStatus" ${canManage ? "" : "disabled"}>${memberStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.status ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
          <label><span>KYC decision</span><select id="selectedMemberKycStatus" ${canManage ? "" : "disabled"}>${kycStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.kycStatus ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
          <div class="form-actions">
            ${canManage ? `
              <button class="button primary" type="submit">Save KYC decision</button>
              <button class="button secondary" type="button" data-member-decision="approve">Approve member</button>
              <button class="button secondary" type="button" data-member-decision="changes">Request changes</button>
              <button class="button ghost" type="button" data-member-decision="suspend">Suspend member</button>
            ` : `<span class="status pending">View only</span>`}
          </div>
        </form>
      ` : ""}
      ${mode === "contacts" ? `<div class="grid two">
        ${recordTable("Member KYC documents", state.selectedMemberDocuments, ["documentType", "storageKey", "verificationStatus", "createdAt"])}
        ${recordTable("Member contacts and next of kin", state.selectedMemberNextOfKin, ["fullName", "relationship", "phone", "address", "primaryContact"])}
        ${recordTable("Member beneficiaries", state.selectedMemberBeneficiaries, ["fullName", "relationship", "phone", "allocationPercent"])}
      </div>` : ""}
      ${mode === "statement" ? `
        ${memberStatementControlPanel(member, statementLines, totalBalance, statementCreditTotal, statementDebitTotal, lastMovement)}
        ${memberStatementReceiptPanel(statementLines)}
        ${staffStatementExportPanel(member, statementLines)}
        ${filterToolbar("Search statement by reference, channel, type, amount or date", "Download CSV", "Print statement")}
        ${recordTable("Member balance statement", statementLines, ["reference", "type", "channel", "amount", "savingsBalance", "sharesBalance", "welfareBalance", "postedAt"])}
      ` : ""}
    </section>
  `;
}

function memberStatementControlPanel(member, lines, totalBalance, creditTotal, debitTotal, lastMovement) {
  const mobileRows = lines.filter((line) => isMobileMoneyLine(line)).length;
  const officeRows = Math.max(0, lines.length - mobileRows);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Statement control summary</h2>
          <p>Staff view for balances, posted activity, payment channel coverage and receipt follow-up.</p>
        </div>
        <span class="status active">Statement ready</span>
      </div>
      <div class="source-grid">
        ${mini("Member", member.membershipNo || member.fullName)}
        ${mini("Total balance", money.format(totalBalance))}
        ${mini("Posted credits", money.format(creditTotal))}
        ${mini("Posted debits", money.format(debitTotal))}
        ${mini("Statement lines", lines.length)}
        ${mini("Mobile money rows", mobileRows)}
        ${mini("Office/Treasurer rows", officeRows)}
        ${mini("Last movement", lastMovement)}
      </div>
    </section>
  `;
}

function statementCredit(line) {
  const amount = Number(line.amount || 0);
  const credit = line.credit ?? (amount > 0 ? amount : 0);
  return Number(credit || 0);
}

function statementDebit(line) {
  const amount = Number(line.amount || 0);
  const debit = line.debit ?? (amount < 0 ? Math.abs(amount) : 0);
  return Number(debit || 0);
}

function memberStatementReceiptPanel(lines) {
  const receiptRows = lines.filter((line) => line.reference || line.receiptNo || normal(line.status) === "posted");
  const mobileRows = receiptRows.filter((line) => isMobileMoneyLine(line));
  const treasurerRows = receiptRows.filter((line) => !isMobileMoneyLine(line));
  const lastReceipt = receiptRows[0]?.receiptNo || receiptRows[0]?.reference || "No receipt yet";
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipt evidence summary</h2>
          <p>Receipt readiness by posted statement line, mobile-money evidence and Treasurer office posting.</p>
        </div>
        <span class="status ${receiptRows.length ? "active" : "pending"}">${receiptRows.length ? "Receipts ready" : "Awaiting receipts"}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt-ready lines", receiptRows.length)}
        ${mini("Mobile-money evidence", mobileRows.length)}
        ${mini("Treasurer receipt evidence", treasurerRows.length)}
        ${mini("Last receipt reference", lastReceipt)}
      </div>
    </section>
  `;
}

function staffStatementExportPanel(member, lines) {
  const receiptRows = lines.filter((line) => line.reference || line.receiptNo || normal(line.status) === "posted");
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Staff statement export controls</h2>
          <p>Export or print the selected member statement with balances, receipt references and payment channels.</p>
        </div>
        <span class="status active">Export ready</span>
      </div>
      <div class="source-grid">
        ${mini("CSV statement", "Backend download")}
        ${mini("Excel schedule", "Open CSV in Excel")}
        ${mini("Print statement", "Available")}
        ${mini("Receipt bundle", receiptRows.length ? "Available" : "No receipts yet")}
        ${mini("Statement rows", lines.length)}
        ${mini("Audit trail", "Included")}
      </div>
      <div class="form-actions inline">
        <button class="button primary" type="button" data-staff-statement-export="csv" data-member-id="${escapeHtml(member.id)}">Download CSV</button>
        <button class="button secondary" type="button" data-staff-statement-print="statement">Print statement</button>
      </div>
    </section>
  `;
}

function memberStatusOptions() {
  return [
    { value: "applicant", label: "Applicant" },
    { value: "pending_approval", label: "Pending approval" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "dormant", label: "Dormant" },
    { value: "suspended", label: "Suspended" },
    { value: "exited", label: "Exited" }
  ];
}

function memberKycReadiness(member) {
  const missing = [];
  if (!member.phone) missing.push("phone");
  if (!member.nationalId) missing.push("national ID");
  if (!member.fullName) missing.push("name");
  if (normal(member.kycStatus) === "verified" && normal(member.status) === "active") return "Portal ready";
  if (missing.length) return `Missing ${missing.join(", ")}`;
  if (normal(member.kycStatus).includes("pending")) return "Ready for review";
  if (normal(member.status).includes("pending")) return "Approval needed";
  return "Review";
}

function memberKycChecklist(member) {
  const checks = [
    ["Identity", member.nationalId ? "National ID captured" : "National ID missing", member.nationalId ? "Complete" : "Pending"],
    ["Contact", member.phone ? "Phone number captured" : "Phone number missing", member.phone ? "Complete" : "Pending"],
    ["KYC decision", labelize(member.kycStatus || "pending"), normal(member.kycStatus) === "verified" ? "Complete" : "Review"],
    ["Member status", labelize(member.status || "pending"), normal(member.status) === "active" ? "Active" : "Review"],
    ["Portal login", normal(member.status) === "active" ? "Member can access portal after credential setup" : "Activate member before portal access", normal(member.status) === "active" ? "Ready" : "Pending"]
  ];
  return rolePriorityPanel("Member KYC checklist", checks);
}

function kycStatusOptions() {
  return [
    { value: "not_verified", label: "Not verified" },
    { value: "pending_verification", label: "Pending verification" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "expired", label: "Expired" }
  ];
}

function transactionFormPanel() {
  const canCreate = hasPermission("transactions:create");
  const members = dataRows("members");
  const branches = dataRows("branches");
  return `
    ${transactionCaptureControlPanel()}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>New transaction screen</h2>
          <p>Capture Treasurer cash receipts, office bank deposits, mobile-money adjustments and withdrawals for approval.</p>
        </div>
      </div>
      ${state.transactionFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.transactionFormMessage)}</strong></div>` : ""}
      ${state.transactionFormError ? `<div class="notice warning"><strong>Transaction failed.</strong><span>${escapeHtml(state.transactionFormError)}</span></div>` : ""}
      <form id="transactionForm" class="form-grid">
        <input type="hidden" id="newTransactionTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Member</span><select id="newTransactionMemberId" ${canCreate ? "" : "disabled"}>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Branch</span><select id="newTransactionBranchId" ${canCreate ? "" : "disabled"}><option value="">Use member branch</option>${branches.map((branch) => `<option value="${escapeHtml(branch.id)}">${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Transaction type</span><select id="newTransactionType" ${canCreate ? "" : "disabled"}><option value="savings_deposit">Savings deposit</option><option value="share_purchase">Share purchase</option><option value="welfare_contribution">Welfare contribution</option><option value="loan_repayment">Loan repayment</option><option value="withdrawal">Withdrawal</option></select><small>Use Loan repayment when the member pays a loan through Treasurer cash, bank or mobile money.</small></label>
        <label><span>Payment channel</span><select id="newTransactionChannel" ${canCreate ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Amount</span><input id="newTransactionAmount" type="number" min="1" step="1" required value="10000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Receipt note</span><input id="newTransactionNarration" placeholder="Cash receipt, loan repayment note or provider reference" ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit transaction</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function transactionCaptureControlPanel() {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Office receipt controls</h2>
          <p>Treasurer/Admin capture rules for deposits, loan repayments and member receipts.</p>
        </div>
        <span class="status active">Maker-checker</span>
      </div>
      <div class="source-grid">
        ${mini("Treasurer cash", "Capture here")}
        ${mini("Loan repayment", "Allowed")}
        ${mini("Receipt status", "After posting")}
        ${mini("Monthly performance", "Updates reports")}
      </div>
      <ul class="activity-list">
        <li><strong>Cash deposit at office</strong><span>Treasurer records savings, shares, welfare or loan repayment cash and submits it for approval before issuing a receipt.</span><em>Staff route</em></li>
        <li><strong>Mobile money adjustment</strong><span>Use mobile money channel only when staff are reconciling a provider callback or verified mobile payment reference.</span><em>Reconcile</em></li>
        <li><strong>Loan repayment receipt</strong><span>Loan repayments captured here feed member monthly performance; use the Loans detail screen when guarantor or repayment schedule review is needed.</span><em>Loan route</em></li>
      </ul>
    </section>
  `;
}

function transactionRows() {
  return dataRows("transactions").map((transaction) => {
    const status = normal(transaction.status);
    const original = Boolean(transaction.originalTransactionId);
    const postedOriginal = status === "posted" && !original;
    const paymentRoute = paymentRouteLabel(transaction);
    return {
      ...transaction,
      memberName: memberName(transaction.memberId),
      paymentRoute,
      paymentStatus: paymentLifecycleStatus(transaction),
      approvalReadiness: status.includes("pending") ? "Awaiting approval" : status === "posted" ? "Posted" : status.includes("rejected") ? "Rejected" : "Review",
      receiptStatus: status === "posted" ? "Receipt ready" : "Post first",
      reversalStatus: postedOriginal ? "Reversible with reason" : original ? "Reversal entry" : "Not available",
      action: "transaction-detail",
      actionLabel: status.includes("pending") ? "Approve" : "Review",
      actionId: transaction.id
    };
  });
}

function transactionReceiptingQueue(rows) {
  return rows
    .filter((row) => {
      const status = normal(row.status);
      const type = normal(row.type);
      return (status.includes("pending") || status === "posted") && ["deposit", "repayment", "share", "welfare", "saving"].some((word) => type.includes(word));
    })
    .map((row) => ({
      ...row,
      receiptingAction: normal(row.status).includes("pending") ? "Approve/post first" : "Load receipt",
      action: "transaction-detail",
      actionLabel: normal(row.status).includes("pending") ? "Post" : "Receipt",
      actionId: row.id
    }))
    .sort((a, b) => {
      const aPending = normal(a.status).includes("pending") ? 0 : 1;
      const bPending = normal(b.status).includes("pending") ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0);
    });
}

function transactionReceiptRegister(rows) {
  return rows
    .filter((row) => normal(row.status) === "posted" && !row.originalTransactionId)
    .map((row) => ({
      ...row,
      receiptNo: `RCT-${row.reference || row.id}`,
      receiptStatus: "Receipted",
      action: "transaction-detail",
      actionLabel: "Receipt",
      actionId: row.id
    }))
    .sort((a, b) => new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0));
}

function transactionDetailPanel(rows) {
  const transaction = rows.find((item) => item.id === state.selectedTransactionId);
  if (!transaction) return "";
  const canApprove = hasPermission("transactions:approve");
  const pending = normal(transaction.status).includes("pending");
  const postedOriginal = normal(transaction.status) === "posted" && !transaction.originalTransactionId;
  const receiptReady = normal(transaction.status) === "posted";
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Transaction detail and reversal</h2>
          <p>${escapeHtml(transaction.reference || transaction.id)} - ${escapeHtml(transaction.type || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-transaction-detail">Close</button>
      </div>
      ${state.selectedTransactionMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTransactionMessage)}</strong></div>` : ""}
      ${state.selectedTransactionError ? `<div class="notice warning"><strong>Transaction action failed.</strong><span>${escapeHtml(state.selectedTransactionError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Approval state", transaction.approvalReadiness || labelize(transaction.status || "review"), "Maker-checker status", "Review")}
        ${summary("Receipt", transaction.receiptStatus || "Post first", "Available after posting", "Load")}
        ${summary("Reversal", transaction.reversalStatus || "Not available", "Requires reason and balance check", "Control")}
        ${summary("Amount", money.format(transaction.amount || 0), labelize(transaction.type || "transaction"), "Verify")}
      </div>
      <div class="source-grid">
        ${mini("Member", transaction.memberName || transaction.memberId)}
        ${mini("Amount", money.format(transaction.amount || 0))}
        ${mini("Status", transaction.status)}
        ${mini("Channel", transaction.channel)}
        ${mini("Posted at", transaction.postedAt)}
        ${mini("Original transaction", transaction.originalTransactionId)}
        ${mini("Reversal reason", transaction.reversalReason)}
        ${mini("Rejection reason", transaction.rejectionReason)}
      </div>
      ${rolePriorityPanel("Transaction decision checklist", [
        ["Approval", pending ? "Review member, amount, channel and narration before posting or rejecting." : "Approval action is only available while pending.", pending ? "Pending" : "Done"],
        ["Receipt", receiptReady ? "Posted transaction can generate an official receipt preview." : "Receipt becomes available after posting.", receiptReady ? "Ready" : "Waiting"],
        ["Reversal", postedOriginal ? "Enter a reason before reversing this original posted transaction." : "Reversal is only available for posted original transactions.", postedOriginal ? "Available" : "Locked"]
      ])}
      <form id="transactionDecisionForm" class="form-grid single">
        <input type="hidden" id="selectedTransactionId" value="${escapeHtml(transaction.id)}">
        <label><span>Decision / reversal reason</span><input id="transactionDecisionReason" placeholder="Required for rejection or reversal" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions">
          ${canApprove ? `
            <button class="button secondary" type="button" data-transaction-action="post" ${pending ? "" : "disabled"}>Approve/post transaction</button>
            <button class="button ghost" type="button" data-transaction-action="reject" ${pending ? "" : "disabled"}>Reject transaction</button>
            <button class="button secondary" type="button" data-transaction-action="receipt" ${receiptReady ? "" : "disabled"}>Load receipt</button>
            <button class="button ghost" type="button" data-transaction-action="reverse" ${postedOriginal ? "" : "disabled"}>Reverse posted transaction</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      ${state.selectedTransactionReceipt ? transactionReceiptPreview(state.selectedTransactionReceipt) : ""}
    </section>
  `;
}

function transactionReceiptPreview(receipt) {
  return `
    <section class="receipt-box">
      <div class="panel-heading">
        <div>
          <h3>Receipt preview</h3>
          <p>${escapeHtml(receipt.receiptNo || "Receipt")} - ${escapeHtml(receipt.memberName || receipt.membershipNo || "Member")}</p>
        </div>
        <span class="status active">Receipted</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt number", receipt.receiptNo)}
        ${mini("SACCO", receipt.tenantName)}
        ${mini("Member", receipt.membershipNo ? `${receipt.memberName || "Member"} (${receipt.membershipNo})` : receipt.memberName)}
        ${mini("Payment route", paymentRouteLabel(receipt))}
        ${mini("Amount", money.format(receipt.amount || 0))}
        ${mini("Issued at", receipt.issuedAt ? formatDateTime(receipt.issuedAt) : formatDateTime(new Date().toISOString()))}
      </div>
      <pre>${escapeHtml(receipt.printableText || "")}</pre>
    </section>
  `;
}

function loanApplicationPanel() {
  const canCreate = hasPermission("loans:create");
  const activeMembers = dataRows("members").filter((member) => normal(member.status) === "active");
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Loan application form</h2>
          <p>Create a SACCO loan application with member eligibility checks and approval routing.</p>
        </div>
      </div>
      ${state.loanFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.loanFormMessage)}</strong></div>` : ""}
      ${state.loanFormError ? `<div class="notice warning"><strong>Loan application failed.</strong><span>${escapeHtml(state.loanFormError)}</span></div>` : ""}
      <form id="loanApplicationForm" class="form-grid">
        <input type="hidden" id="newLoanTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Borrower</span><select id="newLoanMemberId" ${canCreate ? "" : "disabled"}>${activeMembers.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
        <label><span>Loan product</span><select id="newLoanProduct" ${canCreate ? "" : "disabled"}>${loanProductOptions().map((product) => `<option value="${escapeHtml(product)}">${escapeHtml(product)}</option>`).join("")}</select></label>
        <label><span>Amount</span><input id="newLoanAmount" type="number" min="1" step="1" required value="500000" ${canCreate ? "" : "disabled"}></label>
        <label><span>Repayment period</span><input id="newLoanRepaymentMonths" type="number" min="1" max="60" step="1" required value="12" ${canCreate ? "" : "disabled"}></label>
        <label class="wide"><span>Purpose</span><input id="newLoanPurpose" placeholder="Business expansion, school fees, farming inputs..." ${canCreate ? "" : "disabled"}></label>
        <div class="form-actions inline">${canCreate ? `<button class="button primary" type="submit">Submit loan application</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function loanRows() {
  return dataRows("loans").map((loan) => {
    const status = normal(loan.status);
    const stage = normal(loan.stage);
    const guarantors = Number(loan.guarantors || loan.guarantorCount || 0);
    const repaymentTotal = Number(loan.repaymentTotal || loan.repayments || 0);
    const balance = Number(loan.outstandingBalance ?? loan.balance ?? loan.amount ?? 0);
    return {
      ...loan,
      memberName: loan.memberName || memberName(loan.memberId),
      requestedAmount: loan.requestedAmount || loan.amount,
      outstandingBalance: balance,
      guarantorReadiness: guarantors ? `${guarantors} guarantor(s)` : stage.includes("guarant") ? "Guarantor pending" : "Needs guarantor",
      approvalReadiness: status === "approved" ? "Ready for disbursement" : status === "active" ? "Disbursed" : ["submitted", "pending_approval"].includes(status) ? "Awaiting approval" : labelize(loan.status || "review"),
      servicingStatus: status === "active" ? `Outstanding ${money.format(balance)}` : repaymentTotal ? `Repaid ${money.format(repaymentTotal)}` : "Not in servicing",
      action: "loan-detail",
      actionLabel: status === "approved" ? "Disburse" : status === "active" ? "Service" : "Review",
      actionId: loan.id
    };
  });
}

function loanDetailPanel(rows) {
  const loan = rows.find((item) => item.id === state.selectedLoanId) || rows[0];
  if (!loan) return "";
  const canCreate = hasPermission("loans:create");
  const canApprove = hasPermission("loans:approve");
  const borrowerId = loan.memberId;
  const guarantorOptions = dataRows("members").filter((member) => normal(member.status) === "active" && member.id !== borrowerId);
  const acceptedGuarantors = state.selectedLoanGuarantors.filter((request) => normal(request.status) === "accepted");
  const canApproveLoan = canApprove && ["submitted", "pending_approval"].includes(normal(loan.status)) && acceptedGuarantors.length > 0;
  const canRejectLoan = canApprove && ["submitted", "pending_approval"].includes(normal(loan.status));
  const canDisburseLoan = canApprove && normal(loan.status) === "approved";
  const canRepayLoan = canApprove && normal(loan.status) === "active";
  const balance = Number(loan.balance || loan.outstandingBalance || 0);
  const scheduleRows = state.selectedLoanSchedule || [];
  const arrearsScheduleRows = scheduleRows.filter((row) => normal(row.status) === "arrears");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Loan detail and guarantors</h2>
          <p>${escapeHtml(loan.applicationNo || loan.id)} - ${escapeHtml(loan.memberName || loan.memberId || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-loan-detail">Close</button>
      </div>
      ${state.selectedLoanMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedLoanMessage)}</strong></div>` : ""}
      ${state.selectedLoanError ? `<div class="notice warning"><strong>Loan action failed.</strong><span>${escapeHtml(state.selectedLoanError)}</span></div>` : ""}
      <div class="dashboard-grid">
        ${summary("Loan stage", loan.approvalReadiness || labelize(loan.status || "review"), "Application to disbursement", "Review")}
        ${summary("Guarantors", acceptedGuarantors.length ? `${acceptedGuarantors.length} accepted` : loan.guarantorReadiness || "Pending", "Member consent required", "Track")}
        ${summary("Outstanding", money.format(balance), "Servicing balance", "Repay")}
        ${summary("Monthly installment", money.format(loan.monthlyInstallment || 0), `${scheduleRows.length || loan.repaymentMonths || 0} scheduled installment(s)`, "Schedule")}
        ${summary("Arrears", arrearsScheduleRows.length, "Missed scheduled installments", "Follow up")}
      </div>
      <div class="source-grid">
        ${mini("Product", loan.product)}
        ${mini("Amount", money.format(loan.amount || loan.requestedAmount || 0))}
        ${mini("Interest rate", `${loan.interestRate || 0}% monthly`)}
        ${mini("Total interest", money.format(loan.interestAmount || 0))}
        ${mini("Total payable", money.format(loan.totalPayable || loan.amount || 0))}
        ${mini("Monthly installment", money.format(loan.monthlyInstallment || 0))}
        ${mini("Outstanding", money.format(loan.balance || loan.outstandingBalance || 0))}
        ${mini("Status", loan.status)}
        ${mini("Stage", loan.stage)}
        ${mini("Guarantors", loan.guarantors || 0)}
        ${mini("Repayments", loan.repayments || 0)}
        ${mini("DSR", `${loan.dsr || 0}%`)}
      </div>
      ${rolePriorityPanel("Loan decision checklist", [
        ["Guarantor consent", acceptedGuarantors.length ? `${acceptedGuarantors.length} guarantor(s) accepted the request.` : "At least one accepted guarantor is required before approval.", acceptedGuarantors.length ? "Ready" : "Pending"],
        ["Approval", canApproveLoan ? "Loan can be approved after appraisal checks." : "Approval is locked until status and guarantor rules are satisfied.", canApproveLoan ? "Available" : "Locked"],
        ["Disbursement", canDisburseLoan ? "Approved loan can be disbursed into active servicing." : "Disbursement is available only after approval.", canDisburseLoan ? "Ready" : "Waiting"],
        ["Repayment schedule", scheduleRows.length ? `${scheduleRows.length} installment(s) generated with interest and due dates.` : "A repayment schedule is generated automatically at disbursement.", scheduleRows.length ? "Ready" : "Waiting"],
        ["Repayment", canRepayLoan ? "Active loan can receive repayments; overpayments are rejected by the backend." : "Repayment starts after disbursement.", canRepayLoan ? "Active" : "Waiting"]
      ])}
      <div class="grid two">
      <form id="loanGuarantorForm" class="form-grid single">
          <input type="hidden" id="selectedLoanId" value="${escapeHtml(loan.id)}">
          <h3>Add guarantor request</h3>
          <label><span>Guarantor member</span><select id="newGuarantorMemberId" ${canCreate ? "" : "disabled"}>${guarantorOptions.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>
          <label><span>Guaranteed amount</span><input id="newGuarantorAmount" type="number" min="1" step="1" value="${Math.ceil(Number(loan.amount || loan.requestedAmount || 0) / 2)}" ${canCreate ? "" : "disabled"}></label>
          <div class="form-actions">${canCreate ? `<button class="button secondary" type="submit">Add guarantor request</button>` : `<span class="status pending">View only</span>`}</div>
        </form>
        <form id="loanDecisionForm" class="form-grid single">
          <h3>Decision and servicing</h3>
          <label><span>Decision reason</span><input id="loanDecisionReason" placeholder="Decision note or rejection reason" ${canApprove ? "" : "disabled"}></label>
          <div class="form-actions">
            ${canApprove ? `
              <button class="button secondary" type="button" data-loan-action="approve" ${canApproveLoan ? "" : "disabled"}>Approve loan</button>
              <button class="button ghost" type="button" data-loan-action="reject" ${canRejectLoan ? "" : "disabled"}>Reject loan</button>
              <button class="button primary" type="button" data-loan-action="disburse" ${canDisburseLoan ? "" : "disabled"}>Disburse loan</button>
            ` : `<span class="status pending">View only</span>`}
          </div>
        </form>
      </div>
      <form id="loanRepaymentForm" class="form-grid">
        <h3 class="wide">Record loan repayment via Treasurer cash, bank or mobile money</h3>
        <label><span>Amount</span><input id="loanRepaymentAmount" type="number" min="1" step="1" value="50000" ${canApprove ? "" : "disabled"}></label>
        <label><span>Channel</span><select id="loanRepaymentChannel" ${canApprove ? "" : "disabled"}><option value="cash">Cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank</option><option value="payroll_deduction">Payroll deduction</option></select></label>
        <label><span>Reference</span><input id="loanRepaymentReference" value="LR-${Date.now()}" ${canApprove ? "" : "disabled"}></label>
        <label><span>Narration</span><input id="loanRepaymentNarration" placeholder="Repayment note" ${canApprove ? "" : "disabled"}></label>
        <div class="form-actions inline">${canApprove ? `<button class="button secondary" type="submit" ${canRepayLoan ? "" : "disabled"}>Record repayment</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      <div class="grid two">
        ${recordTable("Loan guarantor requests", state.selectedLoanGuarantors.map((request) => ({ ...request, memberName: memberName(request.memberId) })), ["memberName", "guaranteedAmount", "capacity", "status", "createdAt"])}
        ${recordTable("Loan repayment history", state.selectedLoanRepayments, ["reference", "amount", "channel", "narration", "receivedAt"])}
      </div>
      ${recordTable("Loan repayment schedule", scheduleRows, ["installmentNo", "dueDate", "principalDue", "interestDue", "totalDue", "paidAmount", "balanceDue", "status"])}
    </section>
  `;
}

function loanProductOptions() {
  return ["Development Loan", "Emergency Loan"];
}

function complaintCapturePanel() {
  const canManage = hasPermission("complaints:manage");
  const tenants = tenantRows();
  const tenantId = isPlatform() ? tenants[0]?.id || "" : state.user?.tenantId || "";
  const members = dataRows("members").filter((member) => !tenantId || member.tenantId === tenantId || !isPlatform());
  const platformScope = isPlatform();
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>${platformScope ? "SACCO admin complaint capture" : "Member complaint intake"}</h2>
          <p>${platformScope ? "Create a complaint submitted by or on behalf of a SACCO administrator only." : "SACCO admins receive, assign and resolve complaints submitted by SACCO members."}</p>
        </div>
      </div>
      ${state.complaintFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.complaintFormMessage)}</strong></div>` : ""}
      ${state.complaintFormError ? `<div class="notice warning"><strong>Complaint capture failed.</strong><span>${escapeHtml(state.complaintFormError)}</span></div>` : ""}
      <form id="complaintForm" class="form-grid">
        <label><span>SACCO</span><select id="newComplaintTenantId" ${isPlatform() && canManage ? "" : "disabled"}>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${tenant.id === tenantId ? "selected" : ""}>${escapeHtml(tenant.abbreviation || tenant.code || tenant.name)} - ${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        ${platformScope ? `<input type="hidden" id="newComplaintMemberId" value="">` : `<label><span>Member</span><select id="newComplaintMemberId" ${canManage ? "" : "disabled"}><option value="">SACCO-level case</option>${members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.membershipNo)} - ${escapeHtml(member.fullName)}</option>`).join("")}</select></label>`}
        <label><span>Category</span><select id="newComplaintCategory" ${canManage ? "" : "disabled"}>${complaintCategoryOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Priority</span><select id="newComplaintPriority" ${canManage ? "" : "disabled"}><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="low">Low</option></select></label>
        <label><span>Channel</span><select id="newComplaintChannel" ${canManage ? "" : "disabled"}><option value="branch">Branch</option><option value="phone">Phone</option><option value="email">Email</option><option value="web">Web</option><option value="mobile">Mobile</option></select></label>
        <label><span>Subject</span><input id="newComplaintSubject" required placeholder="${platformScope ? "SACCO admin complaint title" : "Short complaint title"}" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Description</span><textarea id="newComplaintDescription" placeholder="${platformScope ? "What issue has the SACCO administrator raised with the platform?" : "What happened, when, and what action is expected"}" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">${platformScope ? "Create SACCO admin complaint" : "Create member complaint"}</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function complaintDetailPanel(rows) {
  const complaint = rows.find((item) => item.id === state.selectedComplaintId);
  if (!complaint) return "";
  const canManage = hasPermission("complaints:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Complaint review</h2>
          <p>${escapeHtml(complaint.subject || complaint.id)} - ${escapeHtml(complaint.tenantName || complaint.tenantId || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-complaint-detail">Close</button>
      </div>
      ${state.selectedComplaintMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedComplaintMessage)}</strong></div>` : ""}
      ${state.selectedComplaintError ? `<div class="notice warning"><strong>Complaint update failed.</strong><span>${escapeHtml(state.selectedComplaintError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("SACCO", complaint.tenantName || complaint.tenantId)}
        ${mini("Member", complaint.memberName)}
        ${mini("Category", labelize(complaint.category))}
        ${mini("Priority", complaint.priority)}
        ${mini("Status", complaint.status)}
        ${mini("Channel", complaint.channel)}
        ${mini("Assigned officer", complaint.assignedOfficer)}
        ${mini("Created", complaint.createdAt)}
      </div>
      <form id="complaintStatusForm" class="form-grid single">
        <input type="hidden" id="selectedComplaintId" value="${escapeHtml(complaint.id)}">
        <label><span>Status</span><select id="selectedComplaintStatus" ${canManage ? "" : "disabled"}>${complaintStatusOptions().map((status) => `<option value="${escapeHtml(status)}" ${status === complaint.status ? "selected" : ""}>${labelize(status)}</option>`).join("")}</select></label>
        <label><span>Resolution notes</span><textarea id="selectedComplaintNotes" placeholder="Action taken, follow-up notes, or closure reason" ${canManage ? "" : "disabled"}>${escapeHtml(complaint.resolutionNotes || "")}</textarea></label>
        <div class="form-actions">
          ${canManage ? `
            <button class="button primary" type="submit">Save complaint status</button>
            <button class="button secondary" type="button" data-complaint-status="in_progress">Mark in progress</button>
            <button class="button secondary" type="button" data-complaint-status="resolved">Resolve</button>
            <button class="button ghost" type="button" data-complaint-status="closed">Close</button>
          ` : `<span class="status pending">View only</span>`}
        </div>
      </form>
    </section>
  `;
}

function complaintCategoryOptions() {
  return ["statement", "loan", "savings", "shares", "service", "other"];
}

function complaintStatusOptions() {
  return ["open", "in_progress", "resolved", "closed"];
}

function notificationTemplatePanel() {
  const canManage = hasPermission("notifications:manage");
  const tenants = tenantRows();
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template setup</h2>
          <p>Create global platform templates or SACCO-specific overrides for notification delivery.</p>
        </div>
      </div>
      ${state.notificationTemplateMessage ? `<div class="notice compact"><strong>${escapeHtml(state.notificationTemplateMessage)}</strong></div>` : ""}
      ${state.notificationTemplateError ? `<div class="notice warning"><strong>Template setup failed.</strong><span>${escapeHtml(state.notificationTemplateError)}</span></div>` : ""}
      <form id="notificationTemplateForm" class="form-grid">
        <label><span>Template scope</span><select id="newTemplateTenantId" ${canManage ? "" : "disabled"}><option value="">Global platform template</option>${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}">${escapeHtml(tenant.abbreviation || tenant.name)} - ${escapeHtml(tenant.name || tenant.id)}</option>`).join("")}</select></label>
        <label><span>Event type</span><select id="newTemplateEventType" ${canManage ? "" : "disabled"}>${notificationEventOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Channel</span><select id="newTemplateChannel" ${canManage ? "" : "disabled"}>${notificationChannelOptions().map((item) => `<option value="${escapeHtml(item)}">${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="newTemplateStatus" ${canManage ? "" : "disabled"}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label><span>Title</span><input id="newTemplateTitle" required placeholder="Message title" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message body</span><textarea id="newTemplateBody" required placeholder="Use clear plain language for SMS, email or in-app messages" ${canManage ? "" : "disabled"}></textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create template</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function notificationTemplateDetailPanel(rows) {
  const template = rows.find((item) => item.id === state.selectedTemplateId);
  if (!template) return "";
  const canManage = hasPermission("notifications:manage");
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Notification template editor</h2>
          <p>${escapeHtml(template.eventType)} - ${escapeHtml(template.channel)} - ${escapeHtml(template.tenantName || "")}</p>
        </div>
        <button class="button ghost" type="button" data-action="close-template-detail">Close</button>
      </div>
      ${state.selectedTemplateMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedTemplateMessage)}</strong></div>` : ""}
      ${state.selectedTemplateError ? `<div class="notice warning"><strong>Template update failed.</strong><span>${escapeHtml(state.selectedTemplateError)}</span></div>` : ""}
      <form id="notificationTemplateEditForm" class="form-grid">
        <input type="hidden" id="selectedTemplateId" value="${escapeHtml(template.id)}">
        <label><span>Event type</span><select id="selectedTemplateEventType" ${canManage ? "" : "disabled"}>${notificationEventOptions(template.eventType).map((item) => `<option value="${escapeHtml(item)}" ${item === template.eventType ? "selected" : ""}>${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Channel</span><select id="selectedTemplateChannel" ${canManage ? "" : "disabled"}>${notificationChannelOptions().map((item) => `<option value="${escapeHtml(item)}" ${item === template.channel ? "selected" : ""}>${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="selectedTemplateStatus" ${canManage ? "" : "disabled"}><option value="active" ${template.status === "active" ? "selected" : ""}>Active</option><option value="inactive" ${template.status === "inactive" ? "selected" : ""}>Inactive</option></select></label>
        <label><span>Title</span><input id="selectedTemplateTitle" value="${escapeHtml(template.title || "")}" ${canManage ? "" : "disabled"}></label>
        <label class="wide"><span>Message body</span><textarea id="selectedTemplateBody" ${canManage ? "" : "disabled"}>${escapeHtml(template.body || "")}</textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Save template</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function notificationEventOptions(extra = "") {
  return Array.from(new Set(["payment_posted", "loan_application_submitted", "complaint_synced", "subscription_due", "sacco_approved", extra].filter(Boolean)));
}

function notificationChannelOptions() {
  return ["in_app", "sms", "email"];
}

function userRoleOptions(platformOnly) {
  const tenantId = platformOnly ? "tenant_platform" : state.user?.tenantId;
  const roles = dataRows("roles").filter((role) => role.tenantId === tenantId);
  const preferred = platformOnly ? [
    "Platform Super Admin",
    "Platform Operations Officer",
    "Platform Billing Officer",
    "Platform Compliance Officer",
    "Platform Support Officer"
  ] : [];
  const filtered = preferred.length ? roles.filter((role) => preferred.includes(role.name)) : roles;
  return filtered.length ? filtered : [{ id: platformOnly ? "role_platform_support_officer" : "", name: platformOnly ? "Platform Support Officer" : "Default staff role" }];
}

function rolePreviewText(roleId, platformOnly) {
  const role = userRoleOptions(platformOnly).find((item) => item.id === roleId) || {};
  const roleName = role.name || "Staff";
  return `${rolePurpose(roleName, platformOnly)} - ${roleModuleScope(roleName, platformOnly)}`;
}

function roleSummaryText(roleIds, platformOnly) {
  const roles = userRoleOptions(platformOnly).filter((role) => (roleIds || []).includes(role.id));
  if (!roles.length) return "Select at least one role.";
  return roles
    .map((role) => `${role.name}: ${rolePurpose(role.name, platformOnly)} / ${roleModuleScope(role.name, platformOnly)}`)
    .join(" | ");
}

function checkedRoleIds(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function generatedSaccoCode(name) {
  const words = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["SACCO", "COOPERATIVE", "COOP", "LIMITED", "LTD", "THE", "AND", "OF"].includes(word));
  const base = (words.length > 1 ? words.map((word) => word[0]).join("") : (words[0] || "SACCO").slice(0, 5))
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "SACCO";
  const existingCodes = new Set(tenantRows().map((tenant) => normal(tenant.saccoCode || tenant.abbreviation || tenant.code)));
  let code = base.length >= 3 ? base : `${base}S`.slice(0, 3);
  let suffix = 2;
  while (existingCodes.has(normal(code))) {
    const suffixText = String(suffix);
    code = `${base.slice(0, Math.max(1, 8 - suffixText.length))}${suffixText}`;
    suffix += 1;
  }
  return code.slice(0, 12);
}

function updateGeneratedSaccoCode() {
  const input = document.getElementById("newTenantCode");
  const name = value("newTenantName");
  if (input) input.value = generatedSaccoCode(name);
}

function saccoLocationAddress(district, parish, village, memberRange = "") {
  return [
    district ? `District: ${district}` : "",
    parish ? `Parish: ${parish}` : "",
    village ? `Village: ${village}` : "",
    memberRange ? `Member range: ${memberRange}` : ""
  ].filter(Boolean).join("; ");
}

function profileLocationPart(profile, label) {
  const match = String(profile?.address || "").match(new RegExp(`${label}:\\\\s*([^;]+)`, "i"));
  return match ? match[1].trim() : "";
}

function memberRangeOptions() {
  return [
    ["100-250", "100 to 250 members"],
    ["251-500", "251 to 500 members"],
    ["501-2500", "501 to 2,500 members"],
    ["2501-10000", "2,501 to 10,000 members"],
    ["10000+", "Above 10,000 members"]
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function countryRegionOptions(selectedCountry = "uganda") {
  return Object.entries(COUNTRY_REGIONS)
    .map(([country, region]) => {
      const label = country.replace(/\b\w/g, (letter) => letter.toUpperCase());
      return `<option value="${escapeHtml(country)}" data-country-label="${escapeHtml(label)}" data-locale="${escapeHtml(region.locale)}" data-currency="${escapeHtml(region.currency)}" data-digits="${region.currencyDigits}" ${country === selectedCountry ? "selected" : ""}>${escapeHtml(label)} - ${escapeHtml(region.currency)}</option>`;
    })
    .join("");
}

function packageCards() {
  const packages = dataRows("subscriptionPackages");
  const rows = packages.length ? packages : fallbackPackages();
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Package Setup</h2>
          <p>Active subscription packages, member ranges and annual billing rules used when SACCOs register or renew.</p>
        </div>
        <span class="status active">${rows.length} active package(s)</span>
      </div>
      <div class="package-grid">
        ${rows.map((pkg) => {
          const packageId = pkg.id || pkg.packageId || pkg.name;
          const amount = pkg.price || pkg.amount || 0;
          const memberLimit = pkg.memberRange || pkg.members || (pkg.maxMembers ? `Up to ${pkg.maxMembers}` : "Configured range");
          const branchLimit = pkg.maxBranches || pkg.branches || "Configured";
          const status = normal(pkg.status || "active");
          return `
            <article>
              <div class="card-title-row">
                <h3>${escapeHtml(pkg.name || pkg.packageName || "Subscription package")}</h3>
                <span class="status ${status === "active" ? "active" : "pending"}">${escapeHtml(labelize(status || "active"))}</span>
              </div>
              <strong>${money.format(amount)}</strong>
              <p>${escapeHtml(memberLimit)} members / ${escapeHtml(branchLimit)} branch${String(branchLimit) === "1" ? "" : "es"}</p>
              <span>${escapeHtml(pkg.modules || pkg.description || "Included modules, SMS, storage and support level")}</span>
              <button class="button secondary" type="button" data-package-manage="${escapeHtml(packageId)}">Manage package</button>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function packageSetupPanel() {
  const packages = dataRows("subscriptionPackages").length ? dataRows("subscriptionPackages") : fallbackPackages();
  const pkg = packages.find((item) => String(item.id || item.packageId || item.name) === String(state.selectedPackageId));
  if (!pkg) return "";
  const canManage = isPlatform() && (roleKind() === "super" || roleKind() === "billing" || hasPermission("subscriptions:manage"));
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Package Setup</h2>
          <p>Update the subscription package used for SACCO billing and registration pricing.</p>
        </div>
        <button class="button ghost" type="button" data-action="close-package-setup">Close</button>
      </div>
      ${state.selectedPackageMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedPackageMessage)}</strong></div>` : ""}
      ${state.selectedPackageError ? `<div class="notice warning"><strong>Package update failed.</strong><span>${escapeHtml(state.selectedPackageError)}</span></div>` : ""}
      <form id="packageSetupForm" class="form-grid">
        <input type="hidden" id="selectedPackageId" value="${escapeHtml(pkg.id || pkg.packageId || pkg.name)}">
        <label><span>Package name</span><input id="packageSetupName" value="${escapeHtml(pkg.name || pkg.packageName || "")}" ${canManage ? "" : "disabled"}></label>
        <label><span>Member range</span><input id="packageSetupTierLabel" value="${escapeHtml(pkg.tierLabel || pkg.memberRange || pkg.name || "")}" ${canManage ? "" : "disabled"}></label>
        <label><span>Annual amount</span><input id="packageSetupPrice" type="number" min="0" step="1000" value="${Number(pkg.price || pkg.amount || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Minimum members</span><input id="packageSetupMinMembers" type="number" min="0" step="1" value="${Number(pkg.minMembers || 100)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Maximum members</span><input id="packageSetupMembers" type="number" min="0" step="1" value="${Number(pkg.members || pkg.maxMembers || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Branches</span><input id="packageSetupBranches" type="number" min="0" step="1" value="${Number(pkg.branches || pkg.maxBranches || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>User accounts</span><input id="packageSetupUsers" type="number" min="0" step="1" value="${Number(pkg.users || 0)}" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="packageSetupStatus" ${canManage ? "" : "disabled"}><option value="active" ${normal(pkg.status || "active") === "active" ? "selected" : ""}>Active</option><option value="inactive" ${normal(pkg.status) === "inactive" ? "selected" : ""}>Inactive</option></select></label>
        <label class="wide"><span>Included modules</span><textarea id="packageSetupModules" ${canManage ? "" : "disabled"}>${escapeHtml(pkg.modules || pkg.description || "")}</textarea></label>
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Save package</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function permissionMatrix() {
  const modules = isPlatform() ? platformModules : saccoModules;
  return `<section class="panel"><h2>Permission matrix</h2><div class="permission-grid">${modules.slice(0, 10).map((item) => `<div><strong>${item[1]}</strong>${["View", "Create", "Edit", "Approve", "Export", "Manage"].map((action) => `<span>${action}</span>`).join("")}</div>`).join("")}</div></section>`;
}

function emptyState(title, detail) {
  return `<div class="empty-state"><strong>${title}</strong><p>${detail}</p></div>`;
}

function renderLoading(message) {
  setHtml(`<main class="loading-screen"><div class="loader"></div><h1>${message}</h1><p>Please wait while Tereka Online prepares your workspace.</p></main>`);
}

async function login(code, username, password) {
  state.loading = true;
  try {
    state.lastError = "";
    const staff = await tryStaffLogin(code, username, password);
    if (staff) {
      if (staff.mfaRequired) {
        state.mfaChallengeId = staff.challengeId || "";
        state.mfaDeliveryChannel = staff.deliveryChannel || "";
        state.mfaDemoCode = staff.demoCode || "";
        state.mfaExpiresAt = staff.expiresAt || "";
        state.mfaMessage = "Enter the verification code to complete staff login.";
        state.mfaError = "";
        renderLogin();
        return;
      }
      applyStaffSession(staff);
      localStorage.setItem(STAFF_TOKEN_KEY, staff.token);
      localStorage.removeItem(MEMBER_TOKEN_KEY);
      await refreshAll();
      return;
    }
    const member = await api("/member-auth/login", {
      method: "POST",
      body: JSON.stringify({ saccoCode: code, identifier: username, password })
    }, "");
    state.auth = "member";
    state.token = member.token;
    state.member = member.member;
    state.tenant = member.tenant;
    state.memberData.balances = member.balances;
    state.memberData.sessionExpiresAt = member.expiresAt || "";
    state.sessionExpiresAt = member.expiresAt || "";
    state.memberData.drafts = loadMemberDrafts(member.member);
    localStorage.setItem(MEMBER_TOKEN_KEY, member.token);
    localStorage.removeItem(STAFF_TOKEN_KEY);
    state.currentView = "home";
    await refreshMember();
  } finally {
    state.loading = false;
  }
}

async function verifyMfaFromForm(event) {
  event.preventDefault();
  state.mfaMessage = "";
  state.mfaError = "";
  const button = document.getElementById("mfaVerifyButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Verifying...";
  }
  try {
    const session = await api("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({
        challengeId: state.mfaChallengeId,
        code: value("mfaCode")
      })
    }, "");
    clearMfaState();
    applyStaffSession(session);
    localStorage.setItem(STAFF_TOKEN_KEY, session.token);
    localStorage.removeItem(MEMBER_TOKEN_KEY);
    await refreshAll();
  } catch (error) {
    state.mfaError = error.message;
    renderLogin();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Verify and continue";
    }
  }
}

function clearMfaState() {
  state.mfaChallengeId = "";
  state.mfaDeliveryChannel = "";
  state.mfaDemoCode = "";
  state.mfaExpiresAt = "";
  state.mfaMessage = "";
  state.mfaError = "";
}

async function tryStaffLogin(code, username, password) {
  try {
    return await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ code, saccoCode: code, username, password })
    }, "");
  } catch (error) {
    if (error.code === "PASSWORD_RESET_REQUIRED" || error.status === 423) {
      state.authTab = "forgot";
      state.passwordResetMessage = "Password reset is required before this account can login. Request or enter the reset token to continue.";
      state.passwordResetError = "";
      state.passwordResetConfirmError = "";
      state.passwordResetConfirmMessage = "";
      renderLogin();
      throw error;
    }
    state.lastError = error.message;
    return null;
  }
}

async function requestPasswordResetFromForm(event) {
  event.preventDefault();
  state.passwordResetMessage = "";
  state.passwordResetError = "";
  state.passwordResetToken = "";
  state.passwordResetExpiresAt = "";
  state.passwordResetConfirmMessage = "";
  state.passwordResetConfirmError = "";
  try {
    const response = await api("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: value("passwordResetEmail") })
    }, "");
    state.passwordResetMessage = "If the staff email is active, a password reset request has been recorded.";
    state.passwordResetToken = response.resetToken || "";
    state.passwordResetExpiresAt = response.expiresAt || "";
    renderLogin();
  } catch (error) {
    state.passwordResetError = error.message;
    renderLogin();
  }
}

async function confirmPasswordResetFromForm(event) {
  event.preventDefault();
  state.passwordResetConfirmMessage = "";
  state.passwordResetConfirmError = "";
  try {
    await api("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({
        token: value("passwordResetToken"),
        newPassword: value("passwordResetNewPassword")
      })
    }, "");
    state.passwordResetConfirmMessage = "Password reset complete. You can login with the new password.";
    state.passwordResetToken = "";
    state.passwordResetExpiresAt = "";
    renderLogin();
  } catch (error) {
    state.passwordResetConfirmError = error.message;
    renderLogin();
  }
}

function clearPasswordResetState() {
  state.passwordResetMessage = "";
  state.passwordResetError = "";
  state.passwordResetToken = "";
  state.passwordResetExpiresAt = "";
  state.passwordResetConfirmMessage = "";
  state.passwordResetConfirmError = "";
}

function applyStaffSession(session) {
  state.auth = "staff";
  state.token = session.token || state.token;
  state.user = session.user;
  state.roleNames = session.roleNames || [];
  state.permissionIds = session.permissionIds || [];
  state.tenant = session.tenant || null;
  state.sessionExpiresAt = session.expiresAt || "";
  state.currentView = visibleModules()[0]?.[0] || "dashboard";
}

async function refreshAll() {
  if (!state.networkOnline) {
    state.lastError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  state.loading = true;
  state.lastError = "";
  renderShell();
  const endpoints = [
    ["tenants", "/tenants"],
    ["subscriptions", "/subscriptions"],
    ["subscriptionPackages", "/subscription-packages"],
    ["members", "/members"],
    ["transactions", "/financial-transactions"],
    ["loans", "/loans"],
    ["operations", "/operations/status"],
    ["notifications", "/notifications/deliveries"],
    ["complaints", "/complaints"],
    ["users", "/users"],
    ["branches", "/branches"],
    ["financialProducts", "/financial-products"],
    ["financialAccounts", "/financial-accounts"],
    ["welfareClaims", "/welfare-claims"],
    ["accountingPeriods", "/accounting-periods"],
    ["chartOfAccounts", "/chart-of-accounts"],
    ["journalEntries", "/journal-entries"],
    ["suppliers", "/suppliers"],
    ["expenses", "/expenses"],
    ["assets", "/assets"],
    ["governanceMeetings", "/governance-meetings"],
    ["statementLines", "/statement-lines"],
    ["reconciliation", "/reconciliation"],
    ["mobileMoneyCallbacks", "/integrations/mobile-money/callbacks"],
    ["mobileMoneyPaymentRequests", "/integrations/mobile-money/payment-requests"],
    ["notificationTemplates", "/notification-templates"],
    ["roles", "/roles"],
    ["permissions", "/permissions"],
    ["auditEvents", "/audit-events"],
    ["regulatoryReport", "/regulatory-report"],
    ["securitySummary", "/auth/security-summary"]
  ];
  if (isPlatform()) endpoints.push(["platformSecurityPolicy", "/platform-security-policy"]);
  if (isPlatform() && hasPermission("roles:create")) endpoints.push(["notificationIntegrationConfig", "/platform-integrations/notification-config"]);
  if (canAccessView("notifications")) endpoints.push(["notificationProviderStatus", "/notifications/provider-status"]);
  const objectKeys = new Set(["operations", "regulatoryReport", "reconciliation", "securitySummary", "platformSecurityPolicy", "notificationIntegrationConfig"]);
  const results = await Promise.all(endpoints.map(async ([key, path]) => [key, await optionalApi(path, objectKeys.has(key) ? null : [])]));
  results.forEach(([key, value]) => {
    if (key === "notificationProviderStatus") {
      state.notificationProviderStatus = Array.isArray(value) ? value : [];
      state.notificationProviderStatusCheckedAt = new Date().toISOString();
    } else {
      state.data[key] = value;
    }
  });
  state.lastSync = new Date().toISOString();
  state.loading = false;
  renderShell();
}

async function refreshMember() {
  if (!state.networkOnline) {
    state.lastError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  state.loading = true;
  state.lastError = "";
  renderShell();
  const dashboard = await optionalApi("/member-auth/mobile-dashboard", null);
  const paymentRequests = await optionalApi("/integrations/mobile-money/payment-requests", []);
  state.memberData.dashboard = dashboard || {};
  state.memberData.balances = dashboard?.balances || state.memberData.balances;
  state.memberData.loans = dashboard?.loans || [];
  state.memberData.notifications = dashboard?.notifications || [];
  state.memberData.pendingGuarantors = dashboard?.pendingGuarantorRequests || dashboard?.pendingGuarantors || [];
  state.memberData.paymentRequests = paymentRequests;
  state.memberData.complaints = await optionalApi("/member-auth/complaints", []);
  state.memberData.drafts = loadMemberDrafts();
  state.lastSync = new Date().toISOString();
  state.loading = false;
  renderShell();
}

function blockOfflineMemberAction(errorKey) {
  if (state.networkOnline) return false;
  state[errorKey] = t("offlineActionBlocked");
  renderShell();
  return true;
}

async function createUserFromForm(event) {
  event.preventDefault();
  const platformOnly = isPlatform();
  state.userFormMessage = "";
  state.userFormError = "";
  const submit = event.currentTarget.querySelector("button[type='submit']");
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Creating...";
  }
  try {
    const roleIds = checkedRoleIds("newUserRoleIds");
    if (!roleIds.length) throw new Error("Select at least one role for this user.");
    const created = await api("/users", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newUserTenantId"),
        fullName: value("newUserFullName"),
        email: value("newUserEmail"),
        phone: value("newUserPhone"),
        password: value("newUserPassword")
      })
    });
    if (roleIds.length) {
      try {
        await api(`/users/${encodeURIComponent(created.id)}/roles`, {
          method: "PUT",
          body: JSON.stringify({ roleIds })
        });
      } catch (roleError) {
        state.userFormError = `User was created, but role assignment needs review: ${friendlyUserError(roleError, platformOnly)}`;
      }
    }
    state.userFormMessage = state.userFormError ? `Created ${created.fullName || created.email}.` : `Created ${created.fullName || created.email} and assigned role.`;
    state.userAdminTab = "list";
    state.search = "";
    state.tableState = {};
    await refreshAll();
  } catch (error) {
    state.userFormError = friendlyUserError(error, platformOnly);
    renderShell();
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Create user";
    }
  }
}

async function openUserDetail(userId) {
  state.selectedUserId = userId;
  state.selectedUserRoles = [];
  state.selectedUserSessions = [];
  state.selectedUserPasswordResets = [];
  state.selectedUserResetToken = "";
  state.selectedUserResetExpiresAt = "";
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  state.selectedUserLoading = true;
  state.userAdminTab = "detail";
  renderShell();
  try {
    const [assignment, sessions, resets] = await Promise.all([
      api(`/users/${encodeURIComponent(userId)}/roles`),
      optionalApi(`/users/${encodeURIComponent(userId)}/sessions`, []),
      optionalApi(`/users/${encodeURIComponent(userId)}/password-resets`, [])
    ]);
    state.selectedUserRoles = assignment.roleIds || [];
    state.selectedUserSessions = sessions || [];
    state.selectedUserPasswordResets = resets || [];
  } catch (error) {
    state.selectedUserError = error.message;
  } finally {
    state.selectedUserLoading = false;
    renderShell();
  }
}

async function saveSelectedUserRole(event) {
  event.preventDefault();
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  const userId = value("selectedUserId");
  const roleIds = checkedRoleIds("selectedUserRoleIds");
  if (!roleIds.length) {
    state.selectedUserError = "Assign at least one role to the user.";
    renderShell();
    return;
  }
  try {
    const assignment = await api(`/users/${encodeURIComponent(userId)}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roleIds })
    });
    state.selectedUserRoles = assignment.roleIds || roleIds;
    state.selectedUserMessage = "Role assignments saved.";
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserRoles = assignment.roleIds || roleIds;
    state.selectedUserMessage = "Role assignments saved.";
    renderShell();
  } catch (error) {
    state.selectedUserError = error.message;
    renderShell();
  }
}

async function saveSelectedUserProfile(event) {
  event.preventDefault();
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  const userId = value("profileUserId");
  try {
    const updated = await api(`/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify({
        fullName: value("profileUserFullName"),
        email: value("profileUserEmail"),
        phone: value("profileUserPhone")
      })
    });
    state.selectedUserMessage = `Saved ${updated.fullName || updated.email}.`;
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserMessage = `Saved ${updated.fullName || updated.email}.`;
    renderShell();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function updateSelectedUserStatus(userId, status) {
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  try {
    const updated = await api(`/users/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.selectedUserMessage = `${updated.fullName || updated.email} is now ${updated.status}.`;
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserMessage = `${updated.fullName || updated.email} is now ${updated.status}.`;
    renderShell();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function updateSelectedUserMfa(userId, enabled) {
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  try {
    const updated = await api(`/users/${encodeURIComponent(userId)}/mfa`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    });
    const label = updated.fullName || updated.email || "User";
    const message = `${enabled ? "Enabled" : "Disabled"} MFA for ${label}.`;
    state.selectedUserMessage = message;
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserMessage = message;
    renderShell();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function deleteSelectedUser(userId) {
  const selected = dataRows("users").find((user) => user.id === userId);
  const label = selected?.fullName || selected?.email || "this user";
  if (!window.confirm(`Delete ${label}? This disables the login and removes it from active administrator lists.`)) return;
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  try {
    await api(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
    state.selectedUserId = "";
    state.selectedUserRoles = [];
    state.userAdminTab = "list";
    state.search = "";
    await refreshAll();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function revokeSelectedUserSessions(userId) {
  const selected = dataRows("users").find((user) => user.id === userId);
  const label = selected?.fullName || selected?.email || "this user";
  if (!window.confirm(`Force logout ${label} from all active sessions? They will need to login again.`)) return;
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  try {
    const result = await api(`/users/${encodeURIComponent(userId)}/sessions/revoke`, { method: "POST" });
    const count = Number(result.revokedSessions || 0);
    const message = count
      ? `Revoked ${count} active session${count === 1 ? "" : "s"} for ${label}.`
      : `${label} has no active sessions to revoke.`;
    state.selectedUserMessage = message;
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserMessage = message;
    renderShell();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function requestSelectedUserPasswordReset(userId) {
  const selected = dataRows("users").find((user) => user.id === userId);
  const label = selected?.fullName || selected?.email || "this user";
  if (!window.confirm(`Request password reset for ${label}?`)) return;
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  state.selectedUserResetToken = "";
  state.selectedUserResetExpiresAt = "";
  try {
    const response = await api(`/users/${encodeURIComponent(userId)}/password-reset`, { method: "POST" });
    state.selectedUserResetToken = response.resetToken || "";
    state.selectedUserResetExpiresAt = response.expiresAt || "";
    state.selectedUserPasswordResets = await optionalApi(`/users/${encodeURIComponent(userId)}/password-resets`, []);
    const successMessage = response.resetToken
      ? `Password reset token generated for ${label}.`
      : `Password reset request recorded for ${label}.`;
    state.selectedUserMessage = successMessage;
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserMessage = successMessage;
    renderShell();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function revokeSelectedUserSession(actionId) {
  const [userId, sessionId] = String(actionId || "").split("|");
  if (!userId || !sessionId) return;
  const selected = dataRows("users").find((user) => user.id === userId);
  const label = selected?.fullName || selected?.email || "this user";
  if (!window.confirm(`Revoke this active session for ${label}?`)) return;
  state.selectedUserMessage = "";
  state.selectedUserError = "";
  try {
    await api(`/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}/revoke`, { method: "POST" });
    state.selectedUserMessage = `Revoked one active session for ${label}.`;
    state.selectedUserSessions = await optionalApi(`/users/${encodeURIComponent(userId)}/sessions`, []);
    await refreshAll();
    state.selectedUserId = userId;
    state.selectedUserMessage = `Revoked one active session for ${label}.`;
    renderShell();
  } catch (error) {
    state.selectedUserError = friendlyUserError(error, isPlatform());
    renderShell();
  }
}

async function openTenantDetail(tenantId) {
  state.selectedTenantId = tenantId;
  state.selectedTenant = null;
  state.selectedTenantProfile = null;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  renderShell();
  try {
    const [tenant, profile] = await Promise.all([
      api(`/tenants/${encodeURIComponent(tenantId)}`),
      optionalApi(`/tenants/${encodeURIComponent(tenantId)}/profile`, null)
    ]);
    state.selectedTenant = tenant;
    state.selectedTenantProfile = profile || {};
  } catch (error) {
    state.selectedTenantError = error.message;
  }
  renderShell();
}

async function createPlatformSacco(event) {
  event.preventDefault();
  state.tenantFormMessage = "";
  state.tenantFormError = "";
  try {
    const district = value("newTenantDistrict");
    const parish = value("newTenantParish");
    const village = value("newTenantVillage");
    const contactNumber = value("newTenantContactNumber");
    const memberRange = value("newTenantMemberRange");
    const paymentStatus = value("newTenantPaymentStatus");
    const region = selectedCountryRegion("newTenantCountry");
    const saccoCode = generatedSaccoCode(value("newTenantName"));
    const codeInput = document.getElementById("newTenantCode");
    if (codeInput) codeInput.value = saccoCode;
    let tenant = await api("/tenants", {
      method: "POST",
      body: JSON.stringify({
        name: value("newTenantName"),
        abbreviation: saccoCode,
        registrationNo: value("newTenantRegistrationNo"),
        district,
        country: region.country,
        localeCode: region.locale,
        currencyCode: region.currency,
        currencyDigits: region.currencyDigits,
        licenseExpiry: value("newTenantLicenseExpiry"),
        packageId: value("newTenantPackageId"),
        paymentStatus,
        parish,
        village,
        contactNumber,
        memberRange
      })
    });
    if (paymentStatus === "paid") {
      tenant = await api(`/tenants/${encodeURIComponent(tenant.id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" })
      });
    }
    await api(`/tenants/${encodeURIComponent(tenant.id)}/profile`, {
      method: "PATCH",
      body: JSON.stringify({
        legalName: tenant.name,
        cooperativeRegistrationNo: tenant.registrationNo,
        address: saccoLocationAddress(district, parish, village, memberRange),
        phone: contactNumber
      })
    });
    state.tenantFormMessage = paymentStatus === "paid"
      ? `${tenant.name} registered and activated.`
      : `${tenant.name} registered pending payment confirmation.`;
    state.search = "";
    state.tableState = {};
    state.saccoRegistrationTab = "applications";
    await refreshAll();
    state.tenantFormMessage = paymentStatus === "paid"
      ? `${tenant.name} registered and activated.`
      : `${tenant.name} registered pending payment confirmation.`;
    renderShell();
  } catch (error) {
    state.tenantFormError = friendlyUserError(error, true);
    renderShell();
  }
}

async function submitPublicSaccoRegistration(event) {
  event.preventDefault();
  state.publicRegistrationMessage = "";
  state.publicRegistrationError = "";
  try {
    const saccoCode = generatedSaccoCode(value("publicTenantName"));
    const codeInput = document.getElementById("publicTenantCode");
    if (codeInput) codeInput.value = saccoCode;
    const region = selectedCountryRegion("publicTenantCountry");
    const result = await api("/public/sacco-registrations", {
      method: "POST",
      body: JSON.stringify({
        name: value("publicTenantName"),
        saccoCode,
        registrationNo: value("publicTenantRegistrationNo"),
        district: value("publicTenantDistrict"),
        parish: value("publicTenantParish"),
        village: value("publicTenantVillage"),
        country: region.country,
        localeCode: region.locale,
        currencyCode: region.currency,
        currencyDigits: region.currencyDigits,
        contactNumber: value("publicTenantContactNumber"),
        memberRange: value("publicTenantMemberRange"),
        paymentPhone: value("publicTenantPaymentPhone")
      })
    }, "");
    const tenant = result.tenant || {};
    const paymentAmount = result.paymentAmount ? `${result.currencyCode || region.currency} ${Number(result.paymentAmount).toLocaleString()}` : "";
    state.publicRegistrationMessage = `Registration received for ${tenant.name || value("publicTenantName")}. SACCO code ${tenant.abbreviation || saccoCode} created. Mobile-money payment prompt initiated to ${result.paymentPhone || value("publicTenantPaymentPhone") || value("publicTenantContactNumber")} with reference ${result.paymentReference}${paymentAmount ? ` for ${paymentAmount}` : ""}. Platform approval follows payment confirmation.`;
    renderLogin();
  } catch (error) {
    state.publicRegistrationError = friendlyUserError(error, false);
    renderLogin();
  }
}

function selectedCountryRegion(selectId) {
  const select = document.getElementById(selectId);
  const country = select?.value || "uganda";
  const option = select?.selectedOptions?.[0];
  const region = COUNTRY_REGIONS[country] || DEFAULT_REGION;
  return {
    country: option?.dataset.countryLabel || country,
    locale: option?.dataset.locale || region.locale,
    currency: option?.dataset.currency || region.currency,
    currencyDigits: Number(option?.dataset.digits ?? region.currencyDigits ?? DEFAULT_REGION.currencyDigits)
  };
}

function syncCountryCurrency(selectId, currencyInputId) {
  const region = selectedCountryRegion(selectId);
  const currencyInput = document.getElementById(currencyInputId);
  if (currencyInput) currencyInput.value = region.currency;
}

async function saveTenantStatus(status) {
  const tenantId = value("selectedTenantId") || state.selectedTenantId;
  if (!tenantId || !status) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const tenant = await api(`/tenants/${encodeURIComponent(tenantId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.selectedTenant = tenant;
    state.selectedTenantId = tenant.id;
    state.selectedTenantMessage = `SACCO status updated to ${tenantStatusLabel(tenant.status)}.`;
    await refreshAll();
    state.selectedTenant = tenant;
    state.selectedTenantId = tenant.id;
    state.selectedTenantMessage = `SACCO status updated to ${tenantStatusLabel(tenant.status)}.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = error.message;
    renderShell();
  }
}

function openSubscriptionDetail(subscriptionId) {
  state.selectedSubscriptionId = subscriptionId;
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  renderShell();
}

function openPackageSetup(packageId) {
  state.selectedPackageId = packageId;
  state.selectedPackageMessage = "";
  state.selectedPackageError = "";
  renderShell();
}

function savePackageSetup(event) {
  event.preventDefault();
  const packageId = value("selectedPackageId") || state.selectedPackageId;
  const currentRows = dataRows("subscriptionPackages").length ? dataRows("subscriptionPackages") : fallbackPackages();
  const packageIndex = currentRows.findIndex((pkg) => String(pkg.id || pkg.packageId || pkg.name) === String(packageId));
  if (packageIndex < 0) {
    state.selectedPackageError = "Package could not be found.";
    renderShell();
    return;
  }
  const current = currentRows[packageIndex];
  const updated = {
    ...current,
    id: current.id || current.packageId || packageId,
    name: value("packageSetupName"),
    tierLabel: value("packageSetupTierLabel"),
    price: Number(value("packageSetupPrice") || 0),
    amount: Number(value("packageSetupPrice") || 0),
    minMembers: Number(value("packageSetupMinMembers") || 0),
    members: Number(value("packageSetupMembers") || 0),
    maxMembers: Number(value("packageSetupMembers") || 0),
    branches: Number(value("packageSetupBranches") || 0),
    maxBranches: Number(value("packageSetupBranches") || 0),
    users: Number(value("packageSetupUsers") || 0),
    status: value("packageSetupStatus") || "active",
    modules: value("packageSetupModules")
  };
  state.data.subscriptionPackages = currentRows.map((pkg, index) => index === packageIndex ? updated : pkg);
  state.selectedPackageId = updated.id;
  state.selectedPackageError = "";
  state.selectedPackageMessage = `${updated.name || "Package"} updated in this session.`;
  renderShell();
}

async function savePlatformSecurityPolicy(event) {
  event.preventDefault();
  state.platformPolicyMessage = "";
  state.platformPolicyError = "";
  try {
    const policy = await api("/platform-security-policy", {
      method: "PUT",
      body: JSON.stringify({
        minimumPasswordLength: Number(value("policyMinimumPasswordLength") || 10),
        requireUppercase: Boolean(document.getElementById("policyRequireUppercase")?.checked),
        requireLowercase: Boolean(document.getElementById("policyRequireLowercase")?.checked),
        requireNumber: Boolean(document.getElementById("policyRequireNumber")?.checked),
        requireSymbol: Boolean(document.getElementById("policyRequireSymbol")?.checked),
        passwordExpiryDays: Number(value("policyPasswordExpiryDays") || 0),
        lockoutFailedAttempts: Number(value("policyLockoutFailedAttempts") || 5),
        lockoutMinutes: Number(value("policyLockoutMinutes") || 15)
      })
    });
    state.data.platformSecurityPolicy = policy;
    state.platformPolicyMessage = "Security policy saved.";
    await refreshAll();
    state.platformPolicyMessage = "Security policy saved.";
    renderShell();
  } catch (error) {
    state.platformPolicyError = error.message;
    renderShell();
  }
}

async function recordSubscriptionPayment(amountOverride = null) {
  const subscriptionId = value("selectedSubscriptionId") || state.selectedSubscriptionId;
  const subscription = dataRows("subscriptions").find((item) => item.id === subscriptionId);
  if (!subscription) return;
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  const amount = amountOverride ?? Number(value("subscriptionPaymentAmount") || due || subscription.amount || 0);
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  try {
    const result = await api(`/subscriptions/${encodeURIComponent(subscriptionId)}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        channel: value("subscriptionPaymentChannel") || "manual",
        externalReference: value("subscriptionPaymentReference") || `PAY-${Date.now()}`
      })
    });
    state.selectedSubscriptionMessage = `${result.idempotent ? "Existing payment found" : "Payment recorded"}: ${money.format(result.payment?.amount || amount)}.`;
    await refreshAll();
    state.selectedSubscriptionId = result.subscription?.id || subscriptionId;
    state.selectedSubscriptionMessage = `${result.idempotent ? "Existing payment found" : "Payment recorded"}: ${money.format(result.payment?.amount || amount)}.`;
    renderShell();
  } catch (error) {
    state.selectedSubscriptionError = error.message;
    renderShell();
  }
}

async function runSubscriptionAction(action) {
  const subscriptionId = state.selectedSubscriptionId;
  const subscription = dataRows("subscriptions").find((item) => item.id === subscriptionId);
  if (!subscription) return;
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  if (action === "renew") {
    await recordSubscriptionPayment(due || Number(subscription.amount || 0));
    return;
  }
  const tenantStatus = action === "suspend-tenant" ? "suspended" : "active";
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  try {
    await api(`/tenants/${encodeURIComponent(subscription.tenantId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: tenantStatus })
    });
    state.selectedSubscriptionMessage = tenantStatus === "active" ? "SACCO operating access activated." : "SACCO operating access suspended.";
    await refreshAll();
    state.selectedSubscriptionId = subscriptionId;
    state.selectedSubscriptionMessage = tenantStatus === "active" ? "SACCO operating access activated." : "SACCO operating access suspended.";
    renderShell();
  } catch (error) {
    state.selectedSubscriptionError = error.message;
    renderShell();
  }
}

async function createMemberFromForm(event) {
  event.preventDefault();
  state.memberFormMessage = "";
  state.memberFormError = "";
  try {
    const created = await api("/members", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMemberTenantId"),
        branchId: value("newMemberBranchId"),
        membershipNo: value("newMemberNo"),
        fullName: value("newMemberFullName"),
        memberType: value("newMemberType"),
        phone: value("newMemberPhone"),
        email: value("newMemberEmail"),
        nationalId: value("newMemberNationalId"),
        password: value("newMemberPassword") || "Member@12345",
        kycStatus: value("newMemberKycStatus"),
        joiningDate: value("newMemberJoiningDate")
      })
    });
    state.memberFormMessage = `Created member ${created.membershipNo} - ${created.fullName}.`;
    await refreshAll();
  } catch (error) {
    state.memberFormError = error.message;
    renderShell();
  }
}

async function openMemberDetail(memberId, targetTab = "kyc") {
  state.selectedMemberId = memberId;
  state.memberTab = targetTab;
  state.selectedMember = null;
  state.selectedMemberStatement = null;
  state.selectedMemberNextOfKin = [];
  state.selectedMemberBeneficiaries = [];
  state.selectedMemberDocuments = [];
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  renderShell();
  try {
    const [member, statement, nextOfKin, beneficiaries, documents] = await Promise.all([
      api(`/members/${encodeURIComponent(memberId)}`),
      optionalApi(`/members/${encodeURIComponent(memberId)}/statement`, null),
      optionalApi(`/members/${encodeURIComponent(memberId)}/next-of-kin`, []),
      optionalApi(`/members/${encodeURIComponent(memberId)}/beneficiaries`, []),
      optionalApi(`/members/${encodeURIComponent(memberId)}/documents`, [])
    ]);
    state.selectedMember = member;
    state.selectedMemberStatement = statement;
    state.selectedMemberNextOfKin = nextOfKin || [];
    state.selectedMemberBeneficiaries = beneficiaries || [];
    state.selectedMemberDocuments = documents || [];
  } catch (error) {
    state.selectedMemberError = error.message;
  }
  renderShell();
}

async function exportStaffMemberStatementCsv(memberId) {
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  try {
    const member = state.selectedMember || dataRows("members").find((item) => item.id === memberId) || {};
    const membershipNo = member.membershipNo || memberId || "member";
    await downloadApiFile(
      `/members/${encodeURIComponent(memberId)}/statement/export.csv`,
      `member-statement-${membershipNo}.csv`
    );
    state.selectedMemberMessage = "Statement CSV download started.";
  } catch (error) {
    state.selectedMemberError = error.message;
  }
  renderShell();
}

async function saveMemberDecision(memberId, memberStatus, kycStatus) {
  state.selectedMemberMessage = "";
  state.selectedMemberError = "";
  try {
    let member = await api(`/members/${encodeURIComponent(memberId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: memberStatus })
    });
    if (kycStatus) {
      await api("/members/metadata-import", {
        method: "POST",
        body: JSON.stringify({
          tenantId: member.tenantId,
          dryRun: false,
          rows: [{ recordType: "kyc_status", membershipNo: member.membershipNo, kycStatus }]
        })
      });
      member = await api(`/members/${encodeURIComponent(memberId)}`);
    }
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Member updated: ${member.status}, KYC ${member.kycStatus}.`;
    await refreshAll();
    state.selectedMember = member;
    state.selectedMemberId = member.id;
    state.selectedMemberMessage = `Member updated: ${member.status}, KYC ${member.kycStatus}.`;
    renderShell();
  } catch (error) {
    state.selectedMemberError = error.message;
    renderShell();
  }
}

function runMemberDecision(action) {
  const memberId = value("selectedMemberId") || state.selectedMemberId;
  if (!memberId) return;
  if (action === "approve") {
    saveMemberDecision(memberId, "active", "verified");
    return;
  }
  if (action === "changes") {
    saveMemberDecision(memberId, "pending_approval", "pending_verification");
    return;
  }
  if (action === "suspend") {
    saveMemberDecision(memberId, "suspended", state.selectedMember?.kycStatus || value("selectedMemberKycStatus"));
    return;
  }
  saveMemberDecision(memberId, value("selectedMemberStatus"), value("selectedMemberKycStatus"));
}

async function createTransactionFromForm(event) {
  event.preventDefault();
  state.transactionFormMessage = "";
  state.transactionFormError = "";
  try {
    const transaction = await api("/financial-transactions", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newTransactionTenantId"),
        branchId: value("newTransactionBranchId"),
        memberId: value("newTransactionMemberId"),
        type: value("newTransactionType"),
        channel: value("newTransactionChannel"),
        amount: Number(value("newTransactionAmount")),
        narration: value("newTransactionNarration")
      })
    });
    state.transactionFormMessage = `Submitted transaction ${transaction.reference} for approval.`;
    await refreshAll();
  } catch (error) {
    state.transactionFormError = error.message;
    renderShell();
  }
}

function openTransactionDetail(transactionId) {
  state.selectedTransactionId = transactionId;
  state.moduleTabs.transactions = "detail";
  state.selectedTransactionReceipt = null;
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  renderShell();
}

async function runTransactionAction(action) {
  const transactionId = value("selectedTransactionId") || state.selectedTransactionId;
  if (!transactionId) return;
  state.selectedTransactionMessage = "";
  state.selectedTransactionError = "";
  state.selectedTransactionReceipt = action === "receipt" ? state.selectedTransactionReceipt : null;
  try {
    if (action === "receipt") {
      state.selectedTransactionReceipt = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/receipt`);
      state.selectedTransactionMessage = "Receipt loaded.";
    } else if (action === "reverse") {
      const reversal = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/reversal`, {
        method: "POST",
        body: JSON.stringify({ reason: value("transactionDecisionReason") || "Reversal requested from Tereka Online" })
      });
      state.selectedTransactionId = reversal.id;
      state.selectedTransactionMessage = `Reversal created: ${reversal.reference}.`;
      await refreshAll();
    } else {
      const status = action === "post" ? "posted" : "rejected";
      const transaction = await api(`/financial-transactions/${encodeURIComponent(transactionId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("transactionDecisionReason") || "Reviewed in Tereka Online" })
      });
      state.selectedTransactionId = transaction.id;
      state.selectedTransactionMessage = `Transaction ${transaction.reference} ${status}.`;
      await refreshAll();
    }
    renderShell();
  } catch (error) {
    state.selectedTransactionError = error.message;
    renderShell();
  }
}

async function createLoanFromForm(event) {
  event.preventDefault();
  state.loanFormMessage = "";
  state.loanFormError = "";
  try {
    const loan = await api("/loans", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newLoanTenantId"),
        memberId: value("newLoanMemberId"),
        product: value("newLoanProduct"),
        amount: Number(value("newLoanAmount")),
        repaymentMonths: Number(value("newLoanRepaymentMonths")),
        purpose: value("newLoanPurpose")
      })
    });
    state.loanFormMessage = `Submitted loan ${loan.applicationNo || loan.id} for review.`;
    state.selectedLoanId = loan.id;
    await refreshAll();
    state.selectedLoanId = loan.id;
    state.loanFormMessage = `Submitted loan ${loan.applicationNo || loan.id} for review.`;
    await openLoanDetail(loan.id, false);
  } catch (error) {
    state.loanFormError = error.message;
    renderShell();
  }
}

async function openLoanDetail(loanId, shouldRender = true) {
  state.selectedLoanId = loanId;
  state.moduleTabs.loans = "detail";
  state.selectedLoanGuarantors = [];
  state.selectedLoanRepayments = [];
  state.selectedLoanSchedule = [];
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  if (shouldRender) renderShell();
  try {
    const [guarantors, repayments, schedule] = await Promise.all([
      optionalApi(`/loans/${encodeURIComponent(loanId)}/guarantors`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/repayments`, []),
      optionalApi(`/loans/${encodeURIComponent(loanId)}/schedule`, [])
    ]);
    state.selectedLoanGuarantors = guarantors || [];
    state.selectedLoanRepayments = repayments || [];
    state.selectedLoanSchedule = schedule || [];
  } catch (error) {
    state.selectedLoanError = error.message;
  }
  renderShell();
}

async function addLoanGuarantor(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/guarantors`, {
      method: "POST",
      body: JSON.stringify({
        memberId: value("newGuarantorMemberId"),
        guaranteedAmount: Number(value("newGuarantorAmount"))
      })
    });
    state.selectedLoanMessage = "Guarantor request added.";
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = "Guarantor request added.";
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function runLoanAction(action) {
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    if (action === "disburse") {
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/disburse`, { method: "POST" });
      state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} disbursed.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      const loan = await api(`/loans/${encodeURIComponent(loanId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("loanDecisionReason") || "Reviewed in Tereka Online" })
      });
      state.selectedLoanMessage = `Loan ${loan.applicationNo || loan.id} ${status}.`;
    }
    const message = state.selectedLoanMessage;
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function recordLoanRepayment(event) {
  event.preventDefault();
  const loanId = value("selectedLoanId") || state.selectedLoanId;
  if (!loanId) return;
  state.selectedLoanMessage = "";
  state.selectedLoanError = "";
  try {
    await api(`/loans/${encodeURIComponent(loanId)}/repayments`, {
      method: "POST",
      body: JSON.stringify({
        amount: Number(value("loanRepaymentAmount")),
        channel: value("loanRepaymentChannel"),
        reference: value("loanRepaymentReference") || `LR-${Date.now()}`,
        narration: value("loanRepaymentNarration") || "Loan repayment"
      })
    });
    state.selectedLoanMessage = "Loan repayment recorded.";
    const message = state.selectedLoanMessage;
    await refreshAll();
    state.selectedLoanId = loanId;
    await openLoanDetail(loanId, false);
    state.selectedLoanMessage = message;
    renderShell();
  } catch (error) {
    state.selectedLoanError = error.message;
    renderShell();
  }
}

async function createComplaintFromForm(event) {
  event.preventDefault();
  state.complaintFormMessage = "";
  state.complaintFormError = "";
  try {
    const complaint = await api("/complaints", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newComplaintTenantId") || state.user?.tenantId,
        memberId: value("newComplaintMemberId"),
        category: value("newComplaintCategory"),
        subject: value("newComplaintSubject"),
        description: value("newComplaintDescription"),
        channel: value("newComplaintChannel"),
        priority: value("newComplaintPriority")
      })
    });
    state.complaintFormMessage = `Created support ticket ${complaint.id}.`;
    state.selectedComplaintId = complaint.id;
    await refreshAll();
    state.selectedComplaintId = complaint.id;
    state.complaintFormMessage = `Created support ticket ${complaint.id}.`;
    renderShell();
  } catch (error) {
    state.complaintFormError = error.message;
    renderShell();
  }
}

async function createFinancialProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.productFormMessage = "";
  state.productFormError = "";
  try {
    const product = await api("/financial-products", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "product", "tenantId"),
        productType: scopedValue(form, "product", "productType"),
        code: scopedValue(form, "product", "code"),
        name: scopedValue(form, "product", "name"),
        contributionAmount: Number(scopedValue(form, "product", "contributionAmount")),
        minimumBalance: Number(scopedValue(form, "product", "minimumBalance")),
        interestRate: Number(scopedValue(form, "product", "interestRate"))
      })
    });
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    await refreshAll();
    state.productFormMessage = `Created ${labelize(product.productType)} product ${product.code}.`;
    renderShell();
  } catch (error) {
    state.productFormError = error.message;
    renderShell();
  }
}

async function createBranchFromForm(event) {
  event.preventDefault();
  state.branchFormMessage = "";
  state.branchFormError = "";
  try {
    const branch = await api("/branches", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newBranchTenantId"),
        code: value("newBranchCode"),
        name: value("newBranchName"),
        address: value("newBranchAddress"),
        status: value("newBranchStatus")
      })
    });
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    await refreshAll();
    state.branchFormMessage = `Created branch ${branch.code} - ${branch.name}.`;
    renderShell();
  } catch (error) {
    state.branchFormError = error.message;
    renderShell();
  }
}

async function openFinancialAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.accountFormMessage = "";
  state.accountFormError = "";
  try {
    const account = await api("/financial-accounts", {
      method: "POST",
      body: JSON.stringify({
        tenantId: scopedValue(form, "account", "tenantId"),
        memberId: scopedValue(form, "account", "memberId"),
        productId: scopedValue(form, "account", "productId"),
        accountType: scopedValue(form, "account", "accountType"),
        accountNo: scopedValue(form, "account", "accountNo")
      })
    });
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    await refreshAll();
    state.accountFormMessage = `Opened account ${account.accountNo}.`;
    renderShell();
  } catch (error) {
    state.accountFormError = error.message;
    renderShell();
  }
}

async function submitMemberLoan(event) {
  event.preventDefault();
  state.memberLoanMessage = "";
  state.memberLoanError = "";
  if (blockOfflineMemberAction("memberLoanError")) return;
  try {
    const loan = await api("/member-auth/mobile-loans", {
      method: "POST",
      body: JSON.stringify({
        product: value("memberLoanProduct"),
        amount: Number(value("memberLoanAmount")),
        repaymentMonths: Number(value("memberLoanMonths")),
        purpose: value("memberLoanPurpose")
      })
    });
    state.memberLoanMessage = `Submitted loan application ${loan.applicationNo || loan.id}.`;
    await refreshMember();
    state.memberLoanMessage = `Submitted loan application ${loan.applicationNo || loan.id}.`;
    renderShell();
  } catch (error) {
    state.memberLoanError = error.message;
    renderShell();
  }
}

async function postMemberPayment(event) {
  event.preventDefault();
  state.memberPaymentMessage = "";
  state.memberPaymentError = "";
  if (value("memberPaymentRoute") === "treasurer_cash") {
    state.memberPaymentMessage = "Treasurer cash route selected. Please take the cash to the SACCO Treasurer; staff will receipt it under Transactions or Loan servicing.";
    renderShell();
    return;
  }
  if (blockOfflineMemberAction("memberPaymentError")) return;
  try {
    const request = await submitMemberPaymentPayload(memberPaymentPayload());
    state.memberData.paymentRequests = [request, ...(state.memberData.paymentRequests || []).filter((row) => row.id !== request.id)];
    state.memberPaymentMessage = `Payment request sent: ${request.externalReference || request.providerReference || request.id}. ${request.checkoutPrompt || ""}`.trim();
    await refreshMember();
    state.memberPaymentMessage = `Payment request sent: ${request.externalReference || request.providerReference || request.id}. ${request.checkoutPrompt || ""}`.trim();
    renderShell();
  } catch (error) {
    state.memberPaymentError = error.message;
    renderShell();
  }
}

async function submitMemberComplaint(event) {
  event.preventDefault();
  state.memberComplaintMessage = "";
  state.memberComplaintError = "";
  if (blockOfflineMemberAction("memberComplaintError")) return;
  try {
    const complaint = await submitMemberComplaintPayload(memberComplaintPayload());
    state.memberComplaintMessage = `Submitted complaint ${complaint.id}.`;
    await refreshMember();
    state.memberComplaintMessage = `Submitted complaint ${complaint.id}.`;
    renderShell();
  } catch (error) {
    state.memberComplaintError = error.message;
    renderShell();
  }
}

function memberPaymentPayload() {
  const purpose = value("memberPaymentPurpose");
  const route = value("memberPaymentRoute") || "mobile_money";
  return {
    tenantId: state.member?.tenantId,
    memberId: state.member?.id,
    memberIdentifier: state.member?.membershipNo,
    loanId: purpose === "loan_repayment" ? value("memberPaymentLoanId") : "",
    purpose,
    amount: Number(value("memberPaymentAmount")),
    payerPhone: value("memberPaymentPhone"),
    externalReference: value("memberPaymentReference"),
    provider: value("memberPaymentProvider"),
    providerPayload: {
      source: "member_portal",
      route,
      member: state.member?.membershipNo
    }
  };
}

function memberComplaintPayload() {
  return {
    category: value("memberComplaintCategory"),
    subject: value("memberComplaintSubject"),
    description: value("memberComplaintDescription"),
    priority: value("memberComplaintPriority")
  };
}

async function submitMemberPaymentPayload(payload) {
  return api("/integrations/mobile-money/payment-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updatePaymentRequestStatus(status) {
  const requestId = state.selectedPaymentRequestId || dataRows("mobileMoneyPaymentRequests")[0]?.id;
  if (!requestId) return;
  state.paymentRequestStatusMessage = "";
  state.paymentRequestStatusError = "";
  if (!state.networkOnline) {
    state.paymentRequestStatusError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  try {
    const request = await api(`/integrations/mobile-money/payment-requests/${encodeURIComponent(requestId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reason: state.paymentRequestStatusReason
      })
    });
    state.selectedPaymentRequestId = request.id;
    state.paymentRequestStatusReason = "";
    state.paymentRequestStatusMessage = `Payment request ${request.externalReference || request.id} marked ${labelize(request.status)}.`;
    await refreshAll();
    state.paymentRequestStatusMessage = `Payment request ${request.externalReference || request.id} marked ${labelize(request.status)}.`;
    renderShell();
  } catch (error) {
    state.paymentRequestStatusError = error.message;
    renderShell();
  }
}

async function refreshPaymentRequestProviderStatus(requestId) {
  if (!requestId) return;
  state.paymentRequestStatusMessage = "";
  state.paymentRequestStatusError = "";
  if (!state.networkOnline) {
    state.paymentRequestStatusError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  try {
    const request = await api(`/integrations/mobile-money/payment-requests/${encodeURIComponent(requestId)}/provider-status`);
    const message = `Payment request ${request.externalReference || request.id} is ${labelize(request.status)}.`;
    state.paymentRequestStatusMessage = message;
    if (state.auth === "member") {
      await refreshMember();
    } else {
      await refreshAll();
    }
    state.paymentRequestStatusMessage = message;
    renderShell();
  } catch (error) {
    state.paymentRequestStatusError = error.message;
    renderShell();
  }
}

async function submitMemberComplaintPayload(payload) {
  return api("/member-auth/mobile-complaints", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function saveMemberDraftFromForm(type) {
  const payload = type === "payment" ? memberPaymentPayload() : memberComplaintPayload();
  const timestamp = formatDateTime(new Date().toISOString());
  const draft = {
    id: `draft-${Date.now()}`,
    type,
    title: type === "payment" ? `${labelize(payload.purpose)} ${money.format(payload.amount || 0)}` : payload.subject || "Complaint draft",
    payload,
    status: "Draft",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state.memberData.drafts = [draft, ...loadMemberDrafts()];
  persistMemberDrafts();
  if (type === "payment") state.memberPaymentMessage = "Payment draft saved on this device.";
  if (type === "complaint") state.memberComplaintMessage = "Complaint draft saved on this device.";
  renderShell();
}

async function syncMemberDraft(draftId) {
  const draft = state.memberData.drafts.find((item) => item.id === draftId);
  if (!draft) return;
  if (blockOfflineMemberAction(draft.type === "payment" ? "memberPaymentError" : "memberComplaintError")) return;
  updateMemberDraft(draftId, { status: "Syncing", updatedAt: formatDateTime(new Date().toISOString()) });
  renderShell();
  try {
    const result = draft.type === "payment"
      ? await submitMemberPaymentPayload(draft.payload)
      : await submitMemberComplaintPayload(draft.payload);
    updateMemberDraft(draftId, {
      status: "Synced",
      serverReference: result.externalReference || result.id || "Synced",
      updatedAt: formatDateTime(new Date().toISOString())
    });
    if (draft.type === "payment") state.memberPaymentMessage = `Draft synced: ${result.externalReference || result.id}.`;
    if (draft.type === "complaint") state.memberComplaintMessage = `Draft synced: ${result.id}.`;
    await refreshMember();
    renderShell();
  } catch (error) {
    updateMemberDraft(draftId, { status: "Failed", error: error.message, updatedAt: formatDateTime(new Date().toISOString()) });
    if (draft.type === "payment") state.memberPaymentError = error.message;
    if (draft.type === "complaint") state.memberComplaintError = error.message;
    renderShell();
  }
}

function discardMemberDraft(draftId) {
  state.memberData.drafts = state.memberData.drafts.filter((draft) => draft.id !== draftId);
  persistMemberDrafts();
  renderShell();
}

async function decideMemberGuarantor(guarantorId, status) {
  state.memberGuarantorMessage = "";
  state.memberGuarantorError = "";
  if (blockOfflineMemberAction("memberGuarantorError")) return;
  try {
    const request = await api(`/member-auth/guarantor-requests/${encodeURIComponent(guarantorId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.memberGuarantorMessage = `Guarantor request ${request.status}.`;
    await refreshMember();
    state.memberGuarantorMessage = `Guarantor request ${request.status}.`;
    renderShell();
  } catch (error) {
    state.memberGuarantorError = error.message;
    renderShell();
  }
}

async function submitWelfareClaim(event) {
  event.preventDefault();
  state.welfareClaimMessage = "";
  state.welfareClaimError = "";
  try {
    const claim = await api("/welfare-claims", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newWelfareTenantId"),
        memberId: value("newWelfareMemberId"),
        claimType: value("newWelfareClaimType"),
        amount: Number(value("newWelfareAmount")),
        reference: value("newWelfareReference"),
        description: value("newWelfareDescription")
      })
    });
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    state.selectedWelfareClaimId = claim.id;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.welfareClaimMessage = `Submitted welfare claim ${claim.reference}.`;
    renderShell();
  } catch (error) {
    state.welfareClaimError = error.message;
    renderShell();
  }
}

function openWelfareClaimDetail(claimId) {
  state.selectedWelfareClaimId = claimId;
  state.moduleTabs.welfare = "detail";
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  renderShell();
}

async function runWelfareClaimAction(action) {
  const claimId = value("selectedWelfareClaimId") || state.selectedWelfareClaimId;
  if (!claimId) return;
  state.selectedWelfareClaimMessage = "";
  state.selectedWelfareClaimError = "";
  try {
    let claim;
    if (action === "pay") {
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/payment`, {
        method: "POST",
        body: JSON.stringify({ channel: value("welfarePaymentChannel") || "cash" })
      });
      state.selectedWelfareClaimMessage = `Paid welfare claim ${claim.reference}.`;
    } else {
      const status = action === "approve" ? "approved" : "rejected";
      claim = await api(`/welfare-claims/${encodeURIComponent(claimId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: value("welfareClaimReason") || "Reviewed in Tereka Online" })
      });
      state.selectedWelfareClaimMessage = `Welfare claim ${claim.reference} ${status}.`;
    }
    const message = state.selectedWelfareClaimMessage;
    await refreshAll();
    state.selectedWelfareClaimId = claim.id;
    state.selectedWelfareClaimMessage = message;
    renderShell();
  } catch (error) {
    state.selectedWelfareClaimError = error.message;
    renderShell();
  }
}

function scopedValue(form, group, field) {
  return form.querySelector(`[data-${group}-field='${field}']`)?.value || "";
}

async function postExpense(event) {
  event.preventDefault();
  state.expenseFormMessage = "";
  state.expenseFormError = "";
  try {
    const expense = await api("/expenses", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newExpenseTenantId"),
        accountCode: value("newExpenseAccountCode"),
        amount: Number(value("newExpenseAmount")),
        channel: value("newExpenseChannel"),
        reference: value("newExpenseReference"),
        description: value("newExpenseDescription"),
        expenseDate: value("newExpenseDate")
      })
    });
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    await refreshAll();
    state.expenseFormMessage = `Posted expense ${expense.reference}.`;
    renderShell();
  } catch (error) {
    state.expenseFormError = error.message;
    renderShell();
  }
}

async function registerAsset(event) {
  event.preventDefault();
  state.assetFormMessage = "";
  state.assetFormError = "";
  try {
    const asset = await api("/assets", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newAssetTenantId"),
        name: value("newAssetName"),
        category: value("newAssetCategory"),
        assetAccountCode: value("newAssetAccountCode"),
        cost: Number(value("newAssetCost")),
        salvageValue: Number(value("newAssetSalvageValue")),
        usefulLifeMonths: Number(value("newAssetLifeMonths")),
        purchaseDate: value("newAssetPurchaseDate"),
        depreciationStartDate: value("newAssetPurchaseDate"),
        channel: value("newAssetChannel"),
        reference: value("newAssetReference"),
        location: value("newAssetLocation")
      })
    });
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    await refreshAll();
    state.assetFormMessage = `Registered asset ${asset.reference}.`;
    renderShell();
  } catch (error) {
    state.assetFormError = error.message;
    renderShell();
  }
}

async function createGovernanceMeeting(event) {
  event.preventDefault();
  state.governanceMeetingMessage = "";
  state.governanceMeetingError = "";
  try {
    const meeting = await api("/governance-meetings", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newMeetingTenantId"),
        title: value("newMeetingTitle"),
        meetingType: value("newMeetingType"),
        scheduledAt: new Date(value("newMeetingScheduledAt")).toISOString(),
        chairUserId: value("newMeetingChairUserId"),
        status: value("newMeetingStatus"),
        minutes: value("newMeetingMinutes")
      })
    });
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    state.selectedMeetingId = meeting.id;
    await refreshAll();
    state.selectedMeetingId = meeting.id;
    state.governanceMeetingMessage = `Created governance meeting ${meeting.title}.`;
    renderShell();
  } catch (error) {
    state.governanceMeetingError = error.message;
    renderShell();
  }
}

function openGovernanceMeetingDetail(meetingId) {
  state.selectedMeetingId = meetingId;
  state.moduleTabs.governance = "detail";
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  renderShell();
}

async function createGovernanceResolution(event) {
  event.preventDefault();
  const meetingId = value("selectedMeetingId") || state.selectedMeetingId;
  if (!meetingId) return;
  state.selectedMeetingMessage = "";
  state.selectedMeetingError = "";
  try {
    const resolution = await api(`/governance-meetings/${encodeURIComponent(meetingId)}/resolutions`, {
      method: "POST",
      body: JSON.stringify({
        title: value("newResolutionTitle"),
        decision: value("newResolutionDecision"),
        ownerUserId: value("newResolutionOwnerUserId"),
        dueDate: value("newResolutionDueDate") || null,
        status: value("newResolutionStatus")
      })
    });
    state.selectedMeetingMessage = `Recorded resolution ${resolution.title}.`;
    const message = state.selectedMeetingMessage;
    await refreshAll();
    state.selectedMeetingId = meetingId;
    state.selectedMeetingMessage = message;
    renderShell();
  } catch (error) {
    state.selectedMeetingError = error.message;
    renderShell();
  }
}

function openComplaintDetail(complaintId) {
  state.selectedComplaintId = complaintId;
  state.moduleTabs.complaints = "detail";
  state.selectedComplaintMessage = "";
  state.selectedComplaintError = "";
  renderShell();
}

async function saveComplaintStatus(status = null) {
  const complaintId = value("selectedComplaintId") || state.selectedComplaintId;
  if (!complaintId) return;
  const nextStatus = status || value("selectedComplaintStatus");
  state.selectedComplaintMessage = "";
  state.selectedComplaintError = "";
  try {
    const complaint = await api(`/complaints/${encodeURIComponent(complaintId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status: nextStatus,
        resolutionNotes: value("selectedComplaintNotes") || "Updated in Tereka Online"
      })
    });
    state.selectedComplaintMessage = `Complaint ${complaint.id} updated to ${labelize(complaint.status)}.`;
    const message = state.selectedComplaintMessage;
    await refreshAll();
    state.selectedComplaintId = complaint.id;
    state.selectedComplaintMessage = message;
    renderShell();
  } catch (error) {
    state.selectedComplaintError = error.message;
    renderShell();
  }
}

async function createNotificationTemplate(event) {
  event.preventDefault();
  state.notificationTemplateMessage = "";
  state.notificationTemplateError = "";
  try {
    const template = await api("/notification-templates", {
      method: "POST",
      body: JSON.stringify({
        tenantId: value("newTemplateTenantId") || null,
        eventType: value("newTemplateEventType"),
        channel: value("newTemplateChannel"),
        title: value("newTemplateTitle"),
        body: value("newTemplateBody"),
        status: value("newTemplateStatus")
      })
    });
    state.notificationTemplateMessage = `Created template ${template.eventType} for ${labelize(template.channel)}.`;
    state.selectedTemplateId = template.id;
    await refreshAll();
    state.selectedTemplateId = template.id;
    state.notificationTemplateMessage = `Created template ${template.eventType} for ${labelize(template.channel)}.`;
    renderShell();
  } catch (error) {
    state.notificationTemplateError = error.message;
    renderShell();
  }
}

function openTemplateDetail(templateId) {
  state.selectedTemplateId = templateId;
  state.selectedTemplateMessage = "";
  state.selectedTemplateError = "";
  renderShell();
}

async function saveNotificationTemplate(event) {
  event.preventDefault();
  const templateId = value("selectedTemplateId") || state.selectedTemplateId;
  if (!templateId) return;
  state.selectedTemplateMessage = "";
  state.selectedTemplateError = "";
  try {
    const template = await api(`/notification-templates/${encodeURIComponent(templateId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        eventType: value("selectedTemplateEventType"),
        channel: value("selectedTemplateChannel"),
        title: value("selectedTemplateTitle"),
        body: value("selectedTemplateBody"),
        status: value("selectedTemplateStatus")
      })
    });
    state.selectedTemplateMessage = `Template ${template.eventType} saved.`;
    const message = state.selectedTemplateMessage;
    await refreshAll();
    state.selectedTemplateId = template.id;
    state.selectedTemplateMessage = message;
    renderShell();
  } catch (error) {
    state.selectedTemplateError = error.message;
    renderShell();
  }
}

async function acknowledgeNotification(notificationId) {
  if (!notificationId) return;
  state.notificationMessage = "";
  state.notificationError = "";
  try {
    await api(`/notifications/${encodeURIComponent(notificationId)}/acknowledge`, { method: "PATCH" });
    state.notificationMessage = "Notification acknowledged.";
    await refreshAll();
    state.currentView = "notifications";
    state.notificationMessage = "Notification acknowledged.";
    renderShell();
  } catch (error) {
    state.notificationError = error.message;
    renderShell();
  }
}

async function retryNotificationDelivery(deliveryId) {
  if (!deliveryId) return;
  state.notificationMessage = "";
  state.notificationError = "";
  try {
    const retry = await api(`/notifications/deliveries/${encodeURIComponent(deliveryId)}/retry`, { method: "PATCH" });
    const message = `Retry created with status ${labelize(retry.status || "pending")}.`;
    state.notificationMessage = message;
    await refreshAll();
    state.currentView = "notifications";
    state.moduleTabs.notifications = "failed";
    state.notificationMessage = message;
    renderShell();
  } catch (error) {
    state.notificationError = error.message;
    renderShell();
  }
}

async function checkNotificationProviderStatus() {
  state.notificationMessage = "";
  state.notificationError = "";
  try {
    const rows = await api("/notifications/provider-status");
    state.notificationProviderStatus = Array.isArray(rows) ? rows : [];
    state.notificationProviderStatusCheckedAt = new Date().toISOString();
    state.notificationMessage = "Notification provider status checked.";
    renderShell();
  } catch (error) {
    state.notificationError = error.message;
    renderShell();
  }
}

async function acknowledgeVisibleNotifications(notificationIdsText) {
  const notificationIds = String(notificationIdsText || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!notificationIds.length) return;
  if (!window.confirm(`Acknowledge ${notificationIds.length} visible alert(s)?`)) return;
  state.notificationMessage = "";
  state.notificationError = "";
  try {
    const result = await api("/notifications/acknowledge", {
      method: "PATCH",
      body: JSON.stringify({ notificationIds })
    });
    state.notificationMessage = `${result.acknowledged || notificationIds.length} notification(s) acknowledged.`;
    await refreshAll();
    state.currentView = "notifications";
    state.notificationMessage = `${result.acknowledged || notificationIds.length} notification(s) acknowledged.`;
    renderShell();
  } catch (error) {
    state.notificationError = error.message;
    renderShell();
  }
}

function updateNotificationFilter(event) {
  const key = event.target.dataset.notificationFilter;
  if (!key) return;
  state.notificationFilters = {
    ...(state.notificationFilters || {}),
    [key]: event.target.value
  };
  state.tableState = {};
  renderShell();
}

async function acknowledgeMemberNotification(notificationId) {
  if (!notificationId) return;
  state.memberNotificationMessage = "";
  state.memberNotificationError = "";
  if (blockOfflineMemberAction("memberNotificationError")) return;
  try {
    await api(`/member-auth/notifications/${encodeURIComponent(notificationId)}/acknowledge`, { method: "PATCH" });
    state.memberNotificationMessage = "Notification acknowledged.";
    await refreshMember();
    state.currentView = "notifications";
    state.memberNotificationMessage = "Notification acknowledged.";
    renderShell();
  } catch (error) {
    state.memberNotificationError = error.message;
    renderShell();
  }
}

async function openQuickSearchResult(resultId) {
  const result = quickSearchResults().find((item) => item.id === resultId);
  if (!result) return;
  state.currentView = result.view;
  if (result.saccoRegistrationTab) state.saccoRegistrationTab = result.saccoRegistrationTab;
  if (result.memberTab) state.memberTab = result.memberTab;
  if (result.userAdminTab) state.userAdminTab = result.userAdminTab;
  if (result.moduleTabView && result.moduleTab) state.moduleTabs[result.moduleTabView] = result.moduleTab;

  if (result.selectedTenantId) {
    state.search = "";
    await openTenantDetail(result.selectedTenantId);
    return;
  }
  if (result.selectedMemberId) {
    state.search = "";
    await openMemberDetail(result.selectedMemberId);
    return;
  }
  if (result.selectedLoanId) {
    state.search = "";
    await openLoanDetail(result.selectedLoanId);
    return;
  }
  if (result.selectedUserId) {
    state.search = "";
    await openUserDetail(result.selectedUserId);
    return;
  }
  if (result.selectedSubscriptionId) {
    state.selectedSubscriptionId = result.selectedSubscriptionId;
    state.search = "";
    renderShell();
    return;
  }
  if (result.selectedComplaintId) {
    state.selectedComplaintId = result.selectedComplaintId;
    state.search = "";
    renderShell();
    return;
  }
  state.search = result.title;
  renderShell();
}

function moveQuickSearchSelection(direction) {
  const results = quickSearchResults();
  if (!results.length) return;
  const currentIndex = results.findIndex((result) => result.id === state.quickSearchActiveId);
  const nextIndex = currentIndex === -1
    ? (direction > 0 ? 0 : results.length - 1)
    : (currentIndex + direction + results.length) % results.length;
  state.quickSearchActiveId = results[nextIndex].id;
  renderShell();
}

async function activateQuickSearchSelection() {
  const results = quickSearchResults();
  if (!results.length) return;
  const resultId = state.quickSearchActiveId || results[0].id;
  await openQuickSearchResult(resultId);
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
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
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

function bindEvents() {
  document.querySelector("#loginLocale")?.addEventListener("change", (event) => {
    state.locale = supportedLocales.some((locale) => locale.code === event.target.value) ? event.target.value : DEFAULT_REGION.locale;
    localStorage.setItem(LOCALE_KEY, state.locale);
    renderLogin();
  });
  document.querySelector("#shellLocale")?.addEventListener("change", (event) => {
    state.locale = supportedLocales.some((locale) => locale.code === event.target.value) ? event.target.value : DEFAULT_REGION.locale;
    localStorage.setItem(LOCALE_KEY, state.locale);
    applyRegionalDocumentSettings();
    renderShell();
  });
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authTab = button.dataset.authTab;
      if (state.authTab !== "forgot") clearPasswordResetState();
      clearMfaState();
      renderLogin();
    });
  });
  document.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("loginButton");
    const error = document.getElementById("loginError");
    if (!value("code") || !value("username") || !value("password")) {
      error.textContent = t("loginRequired");
      error.hidden = false;
      return;
    }
    button.disabled = true;
    button.textContent = t("verifyingAccess");
    error.hidden = true;
    try {
      await login(value("code"), value("username"), value("password"));
    } catch (loginError) {
      error.textContent = state.lastError || loginError.message || t("invalidLogin");
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = t("loginSecurely");
    }
  });
  document.querySelectorAll("[data-demo]").forEach((button) => {
    button.addEventListener("click", () => {
      const account = demoAccounts[Number(button.dataset.demo)];
      document.getElementById("code").value = account.code;
      document.getElementById("username").value = account.username;
      document.getElementById("password").value = account.password;
    });
  });
  document.querySelector("[data-action='fill-demo']")?.addEventListener("click", () => {
    const account = demoAccounts[Number(document.getElementById("demoAccountSelect")?.value || 0)];
    if (!account) return;
    document.getElementById("code").value = account.code;
    document.getElementById("username").value = account.username;
    document.getElementById("password").value = account.password;
  });
  document.querySelector("[data-action='toggle-password']")?.addEventListener("click", (event) => {
    const password = document.getElementById("password");
    if (!password) return;
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    event.currentTarget.textContent = showing ? "Show" : "Hide";
  });
  document.querySelector("[data-action='open-notifications']")?.addEventListener("click", () => {
    state.currentView = "notifications";
    renderShell();
  });
  document.querySelector("#passwordResetRequestForm")?.addEventListener("submit", requestPasswordResetFromForm);
  document.querySelector("#passwordResetConfirmForm")?.addEventListener("submit", confirmPasswordResetFromForm);
  document.querySelector("#mfaVerifyForm")?.addEventListener("submit", verifyMfaFromForm);
  document.querySelector("[data-action='cancel-mfa']")?.addEventListener("click", () => {
    clearMfaState();
    state.authTab = "login";
    renderLogin();
  });
  document.querySelector(".nav-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (button) {
      state.currentView = button.dataset.view;
      renderShell();
    }
  });
  document.querySelectorAll("[data-summary-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.summaryView;
      renderShell();
    });
  });
  document.querySelectorAll("[data-member-shortcut-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.memberShortcutView;
      const tab = button.dataset.memberShortcutTab;
      if (tab) state.moduleTabs[view] = tab;
      state.currentView = view;
      renderShell();
    });
  });
  document.querySelectorAll("[data-user-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.userAdminTab = button.dataset.userTab;
      renderShell();
    });
  });
  document.querySelectorAll("[data-sacco-registration-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.saccoRegistrationTab = button.dataset.saccoRegistrationTab;
      renderShell();
    });
  });
  document.querySelectorAll("[data-sacco-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.saccoSettingsTab = button.dataset.saccoSettingsTab;
      renderShell();
    });
  });
  document.querySelectorAll("[data-member-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.memberTab = button.dataset.memberTab;
      renderShell();
    });
  });
  document.querySelectorAll("[data-module-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.moduleTabs[button.dataset.moduleTabView] = button.dataset.moduleTab;
      renderShell();
    });
  });
  document.querySelector("#paymentRequestSelect")?.addEventListener("change", (event) => {
    state.selectedPaymentRequestId = event.target.value;
    state.paymentRequestStatusMessage = "";
    state.paymentRequestStatusError = "";
    renderShell();
  });
  document.querySelector("#paymentRequestReason")?.addEventListener("input", (event) => {
    state.paymentRequestStatusReason = event.target.value;
  });
  document.querySelectorAll("[data-payment-request-status]").forEach((button) => {
    button.addEventListener("click", () => updatePaymentRequestStatus(button.dataset.paymentRequestStatus));
  });
  document.querySelectorAll("[data-row-action='user-detail']").forEach((button) => {
    button.addEventListener("click", () => openUserDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='user-session-revoke']").forEach((button) => {
    button.addEventListener("click", () => revokeSelectedUserSession(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='tenant-detail']").forEach((button) => {
    button.addEventListener("click", () => openTenantDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='subscription-detail']").forEach((button) => {
    button.addEventListener("click", () => openSubscriptionDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-package-manage]").forEach((button) => {
    button.addEventListener("click", () => openPackageSetup(button.dataset.packageManage));
  });
  document.querySelectorAll("[data-row-action='member-detail']").forEach((button) => {
    button.addEventListener("click", () => openMemberDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='monthly-performance-detail']").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMonthlyPerformanceId = button.dataset.rowId;
      renderShell();
    });
  });
  document.querySelectorAll("[data-action='open-monthly-performance-member']").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = "members";
      openMemberDetail(button.dataset.memberId, "statement");
    });
  });
  document.querySelectorAll("[data-staff-statement-export='csv']").forEach((button) => {
    button.addEventListener("click", () => exportStaffMemberStatementCsv(button.dataset.memberId));
  });
  document.querySelectorAll("[data-staff-statement-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });
  document.querySelectorAll("[data-row-action='transaction-detail']").forEach((button) => {
    button.addEventListener("click", () => openTransactionDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='loan-detail']").forEach((button) => {
    button.addEventListener("click", () => openLoanDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='complaint-detail']").forEach((button) => {
    button.addEventListener("click", () => openComplaintDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='template-detail']").forEach((button) => {
    button.addEventListener("click", () => openTemplateDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='notification-acknowledge']").forEach((button) => {
    button.addEventListener("click", () => acknowledgeNotification(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='notification-retry']").forEach((button) => {
    button.addEventListener("click", () => retryNotificationDelivery(button.dataset.rowId));
  });
  document.querySelectorAll("[data-notification-bulk-ack]").forEach((button) => {
    button.addEventListener("click", () => acknowledgeVisibleNotifications(button.dataset.notificationBulkAck));
  });
  document.querySelectorAll("[data-row-action='welfare-claim-detail']").forEach((button) => {
    button.addEventListener("click", () => openWelfareClaimDetail(button.dataset.rowId));
  });
  document.querySelectorAll("[data-row-action='governance-meeting-detail']").forEach((button) => {
    button.addEventListener("click", () => openGovernanceMeetingDetail(button.dataset.rowId));
  });
  document.querySelector("[data-action='close-user-detail']")?.addEventListener("click", () => {
    state.selectedUserId = "";
    state.selectedUserRoles = [];
    state.selectedUserSessions = [];
    state.selectedUserPasswordResets = [];
    state.selectedUserResetToken = "";
    state.selectedUserResetExpiresAt = "";
    state.selectedUserMessage = "";
    state.selectedUserError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-tenant-detail']")?.addEventListener("click", () => {
    state.selectedTenantId = "";
    state.selectedTenant = null;
    state.selectedTenantProfile = null;
    state.selectedTenantMessage = "";
    state.selectedTenantError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-subscription-detail']")?.addEventListener("click", () => {
    state.selectedSubscriptionId = "";
    state.selectedSubscriptionMessage = "";
    state.selectedSubscriptionError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-package-setup']")?.addEventListener("click", () => {
    state.selectedPackageId = "";
    state.selectedPackageMessage = "";
    state.selectedPackageError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-member-detail']")?.addEventListener("click", () => {
    state.selectedMemberId = "";
    state.selectedMember = null;
    state.selectedMemberStatement = null;
    state.selectedMemberNextOfKin = [];
    state.selectedMemberBeneficiaries = [];
    state.selectedMemberDocuments = [];
    state.selectedMemberMessage = "";
    state.selectedMemberError = "";
    state.memberTab = "list";
    renderShell();
  });
  document.querySelector("[data-action='close-monthly-performance-detail']")?.addEventListener("click", () => {
    state.selectedMonthlyPerformanceId = "";
    renderShell();
  });
  document.querySelector("[data-action='close-transaction-detail']")?.addEventListener("click", () => {
    state.selectedTransactionId = "";
    state.selectedTransactionReceipt = null;
    state.selectedTransactionMessage = "";
    state.selectedTransactionError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-loan-detail']")?.addEventListener("click", () => {
    state.selectedLoanId = "";
    state.selectedLoanGuarantors = [];
    state.selectedLoanRepayments = [];
    state.selectedLoanSchedule = [];
    state.selectedLoanMessage = "";
    state.selectedLoanError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-complaint-detail']")?.addEventListener("click", () => {
    state.selectedComplaintId = "";
    state.selectedComplaintMessage = "";
    state.selectedComplaintError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-template-detail']")?.addEventListener("click", () => {
    state.selectedTemplateId = "";
    state.selectedTemplateMessage = "";
    state.selectedTemplateError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-welfare-claim-detail']")?.addEventListener("click", () => {
    state.selectedWelfareClaimId = "";
    state.selectedWelfareClaimMessage = "";
    state.selectedWelfareClaimError = "";
    renderShell();
  });
  document.querySelector("[data-action='close-governance-meeting-detail']")?.addEventListener("click", () => {
    state.selectedMeetingId = "";
    state.selectedMeetingMessage = "";
    state.selectedMeetingError = "";
    renderShell();
  });
  document.querySelector("#addUserForm")?.addEventListener("submit", createUserFromForm);
  document.querySelector("#userProfileForm")?.addEventListener("submit", saveSelectedUserProfile);
  document.querySelector("#userRoleForm")?.addEventListener("submit", saveSelectedUserRole);
  document.querySelectorAll("[data-user-status]").forEach((button) => {
    button.addEventListener("click", () => updateSelectedUserStatus(button.dataset.rowId, button.dataset.userStatus));
  });
  document.querySelectorAll("[data-user-mfa]").forEach((button) => {
    button.addEventListener("click", () => updateSelectedUserMfa(button.dataset.rowId, button.dataset.userMfa === "true"));
  });
  document.querySelectorAll("[data-user-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteSelectedUser(button.dataset.userDelete));
  });
  document.querySelectorAll("[data-user-revoke-sessions]").forEach((button) => {
    button.addEventListener("click", () => revokeSelectedUserSessions(button.dataset.userRevokeSessions));
  });
  document.querySelectorAll("[data-user-password-reset]").forEach((button) => {
    button.addEventListener("click", () => requestSelectedUserPasswordReset(button.dataset.userPasswordReset));
  });
  document.querySelectorAll("[data-role-checkbox]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = dataRows("users").find((user) => user.id === state.selectedUserId);
      const platformOnly = input.dataset.roleCheckbox === "selected" ? selected?.tenantId === "tenant_platform" : isPlatform();
      const name = input.dataset.roleCheckbox === "selected" ? "selectedUserRoleIds" : "newUserRoleIds";
      const preview = document.getElementById(input.dataset.roleCheckbox === "selected" ? "selectedUserRolePreview" : "newUserRolePreview");
      if (preview) preview.textContent = roleSummaryText(checkedRoleIds(name), platformOnly);
    });
  });
  document.querySelector("#memberRegistrationForm")?.addEventListener("submit", createMemberFromForm);
  document.querySelector("#platformSaccoForm")?.addEventListener("submit", createPlatformSacco);
  document.querySelector("#newTenantName")?.addEventListener("input", updateGeneratedSaccoCode);
  document.querySelector("#newTenantCountry")?.addEventListener("change", () => syncCountryCurrency("newTenantCountry", "newTenantCurrencyCode"));
  syncCountryCurrency("newTenantCountry", "newTenantCurrencyCode");
  updateGeneratedSaccoCode();
  document.querySelector("#publicSaccoRegistrationForm")?.addEventListener("submit", submitPublicSaccoRegistration);
  document.querySelector("#publicTenantName")?.addEventListener("input", () => {
    const input = document.getElementById("publicTenantCode");
    if (input) input.value = generatedSaccoCode(value("publicTenantName"));
  });
  document.querySelector("#publicTenantCountry")?.addEventListener("change", () => syncCountryCurrency("publicTenantCountry", "publicTenantCurrencyCode"));
  syncCountryCurrency("publicTenantCountry", "publicTenantCurrencyCode");
  document.querySelector("#transactionForm")?.addEventListener("submit", createTransactionFromForm);
  document.querySelector("#loanApplicationForm")?.addEventListener("submit", createLoanFromForm);
  document.querySelector("#loanGuarantorForm")?.addEventListener("submit", addLoanGuarantor);
  document.querySelector("#loanRepaymentForm")?.addEventListener("submit", recordLoanRepayment);
  document.querySelector("#complaintForm")?.addEventListener("submit", createComplaintFromForm);
  document.querySelector("#complaintStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveComplaintStatus();
  });
  document.querySelector("#notificationTemplateForm")?.addEventListener("submit", createNotificationTemplate);
  document.querySelector("#notificationTemplateEditForm")?.addEventListener("submit", saveNotificationTemplate);
  document.querySelector("#platformSecurityPolicyForm")?.addEventListener("submit", savePlatformSecurityPolicy);
  document.querySelector("#branchSetupForm")?.addEventListener("submit", createBranchFromForm);
  document.querySelectorAll("[data-product-form]").forEach((form) => form.addEventListener("submit", createFinancialProduct));
  document.querySelectorAll("[data-account-form]").forEach((form) => form.addEventListener("submit", openFinancialAccount));
  document.querySelector("#memberLoanForm")?.addEventListener("submit", submitMemberLoan);
  document.querySelector("#memberPaymentForm")?.addEventListener("submit", postMemberPayment);
  document.querySelector("#memberComplaintForm")?.addEventListener("submit", submitMemberComplaint);
  document.querySelector("#welfareClaimForm")?.addEventListener("submit", submitWelfareClaim);
  document.querySelector("#expenseForm")?.addEventListener("submit", postExpense);
  document.querySelector("#assetForm")?.addEventListener("submit", registerAsset);
  document.querySelector("#governanceMeetingForm")?.addEventListener("submit", createGovernanceMeeting);
  document.querySelector("#governanceResolutionForm")?.addEventListener("submit", createGovernanceResolution);
  document.querySelector("#memberStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    runMemberDecision("custom");
  });
  document.querySelector("#tenantStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveTenantStatus(value("selectedTenantStatus"));
  });
  document.querySelector("#subscriptionPaymentForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    recordSubscriptionPayment();
  });
  document.querySelector("#packageSetupForm")?.addEventListener("submit", savePackageSetup);
  document.querySelectorAll("[data-tenant-status]").forEach((button) => {
    button.addEventListener("click", () => saveTenantStatus(button.dataset.tenantStatus));
  });
  document.querySelectorAll("[data-subscription-action]").forEach((button) => {
    button.addEventListener("click", () => runSubscriptionAction(button.dataset.subscriptionAction));
  });
  document.querySelectorAll("[data-member-decision]").forEach((button) => {
    button.addEventListener("click", () => runMemberDecision(button.dataset.memberDecision));
  });
  document.querySelectorAll("[data-transaction-action]").forEach((button) => {
    button.addEventListener("click", () => runTransactionAction(button.dataset.transactionAction));
  });
  document.querySelectorAll("[data-loan-action]").forEach((button) => {
    button.addEventListener("click", () => runLoanAction(button.dataset.loanAction));
  });
  document.querySelectorAll("[data-complaint-status]").forEach((button) => {
    button.addEventListener("click", () => saveComplaintStatus(button.dataset.complaintStatus));
  });
  document.querySelectorAll("[data-welfare-claim-action]").forEach((button) => {
    button.addEventListener("click", () => runWelfareClaimAction(button.dataset.welfareClaimAction));
  });
  document.querySelectorAll("[data-member-guarantor-action]").forEach((button) => {
    button.addEventListener("click", () => decideMemberGuarantor(button.dataset.rowId, button.dataset.memberGuarantorAction));
  });
  document.querySelectorAll("[data-member-notification-acknowledge]").forEach((button) => {
    button.addEventListener("click", () => acknowledgeMemberNotification(button.dataset.memberNotificationAcknowledge));
  });
  document.querySelectorAll("[data-member-draft-save]").forEach((button) => {
    button.addEventListener("click", () => saveMemberDraftFromForm(button.dataset.memberDraftSave));
  });
  document.querySelectorAll("[data-member-draft-sync]").forEach((button) => {
    button.addEventListener("click", () => syncMemberDraft(button.dataset.memberDraftSync));
  });
  document.querySelectorAll("[data-member-draft-discard]").forEach((button) => {
    button.addEventListener("click", () => discardMemberDraft(button.dataset.memberDraftDiscard));
  });
  document.querySelectorAll("[data-payment-provider-status]").forEach((button) => {
    button.addEventListener("click", () => refreshPaymentRequestProviderStatus(button.dataset.paymentProviderStatus));
  });
  document.querySelectorAll("[data-action='refresh']").forEach((button) => button.addEventListener("click", refreshAll));
  document.querySelectorAll("[data-action='refresh-member']").forEach((button) => button.addEventListener("click", refreshMember));
  document.querySelectorAll("[data-action='toggle-session-menu']").forEach((button) => button.addEventListener("click", () => {
    state.sessionMenuOpen = !state.sessionMenuOpen;
    state.helpMenuOpen = false;
    state.accountMenuOpen = false;
    state.quickSearchActiveId = "";
    renderShell();
  }));
  document.querySelectorAll("[data-action='toggle-help-menu']").forEach((button) => button.addEventListener("click", () => {
    state.helpMenuOpen = !state.helpMenuOpen;
    state.sessionMenuOpen = false;
    state.accountMenuOpen = false;
    state.quickSearchActiveId = "";
    renderShell();
  }));
  document.querySelectorAll("[data-action='toggle-account-menu']").forEach((button) => button.addEventListener("click", () => {
    state.accountMenuOpen = !state.accountMenuOpen;
    state.sessionMenuOpen = false;
    state.helpMenuOpen = false;
    state.quickSearchActiveId = "";
    renderShell();
  }));
  document.querySelectorAll("[data-action='open-security-settings']").forEach((button) => button.addEventListener("click", openSecuritySettings));
  document.querySelectorAll("[data-action='open-member-security']").forEach((button) => button.addEventListener("click", openMemberSecurity));
  document.querySelectorAll("[data-action='open-account-profile']").forEach((button) => button.addEventListener("click", openAccountProfile));
  document.querySelectorAll("[data-action='open-help-complaints']").forEach((button) => button.addEventListener("click", openHelpComplaints));
  document.querySelectorAll("[data-action='open-help-notifications']").forEach((button) => button.addEventListener("click", openHelpNotifications));
  document.querySelectorAll("[data-action='open-help-security']").forEach((button) => button.addEventListener("click", openHelpSecurity));
  document.querySelectorAll("[data-action='extend-session']").forEach((button) => button.addEventListener("click", extendSession));
  document.querySelectorAll("[data-action='toggle-current-mfa']").forEach((button) => button.addEventListener("click", () => updateCurrentUserMfa(button.dataset.mfaEnabled === "true")));
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", logout));
  document.querySelectorAll("[data-action='clear-search']").forEach((button) => button.addEventListener("click", () => {
    state.search = "";
    state.tableState = {};
    renderShell();
  }));
  document.querySelectorAll("[data-action='clear-notification-filters']").forEach((button) => button.addEventListener("click", () => {
    state.notificationFilters = { status: "all", channel: "all", provider: "all", tenantId: "all", date: "" };
    state.tableState = {};
    renderShell();
  }));
  document.querySelectorAll("[data-action='check-notification-provider-status']").forEach((button) => {
    button.addEventListener("click", checkNotificationProviderStatus);
  });
  document.querySelectorAll("[data-notification-filter]").forEach((input) => input.addEventListener("input", updateNotificationFilter));
  document.querySelectorAll("select[data-notification-filter]").forEach((select) => select.addEventListener("change", updateNotificationFilter));
  document.querySelectorAll("[data-table-search]").forEach((input) => input.addEventListener("input", (event) => {
    const tableKey = event.target.dataset.tableSearch;
    state.tableState[tableKey] = { ...(state.tableState[tableKey] || {}), search: event.target.value, page: 1, pageSize: state.tableState[tableKey]?.pageSize || 10 };
    renderShell();
  }));
  document.querySelectorAll("[data-table-page-size]").forEach((select) => select.addEventListener("change", (event) => {
    const tableKey = event.target.dataset.tablePageSize;
    state.tableState[tableKey] = { ...(state.tableState[tableKey] || {}), pageSize: Number(event.target.value || 10), page: 1 };
    renderShell();
  }));
  document.querySelectorAll("[data-table-page]").forEach((button) => button.addEventListener("click", () => {
    const tableKey = button.dataset.tablePage;
    state.tableState[tableKey] = { ...(state.tableState[tableKey] || {}), page: Number(button.dataset.page || 1), pageSize: state.tableState[tableKey]?.pageSize || 10 };
    renderShell();
  }));
  document.querySelectorAll("[data-action='toggle-sidebar']").forEach((button) => button.addEventListener("click", () => document.querySelector(".app-shell")?.classList.toggle("sidebar-open")));
  document.querySelector("#globalSearch")?.addEventListener("input", (event) => {
    state.search = event.target.value;
    state.quickSearchActiveId = "";
    renderShell();
  });
  document.querySelectorAll("[data-search-input]").forEach((input) => input.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderShell();
  }));
  document.querySelector("#globalSearch")?.addEventListener("keydown", async (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveQuickSearchSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveQuickSearchSelection(-1);
      return;
    }
    if (event.key === "Enter" && state.search.trim()) {
      event.preventDefault();
      await activateQuickSearchSelection();
      return;
    }
    if (event.key === "Escape" && state.search) {
      event.preventDefault();
      closeTopbarMenus({ clearSearch: true });
      renderShell();
    }
  });
  document.querySelectorAll("[data-quick-result]").forEach((button) => {
    button.addEventListener("click", () => openQuickSearchResult(button.dataset.quickResult));
  });
  document.removeEventListener("keydown", handleGlobalDismissKey);
  document.removeEventListener("click", handleGlobalDismissClick);
  document.addEventListener("keydown", handleGlobalDismissKey);
  document.addEventListener("click", handleGlobalDismissClick);
}

function hasOpenTopbarMenu() {
  return state.sessionMenuOpen || state.helpMenuOpen || state.accountMenuOpen || Boolean(state.search.trim());
}

function handleGlobalDismissKey(event) {
  if (event.key !== "Escape" || !hasOpenTopbarMenu()) return;
  event.preventDefault();
  closeTopbarMenus({ clearSearch: Boolean(state.search.trim()) });
  renderShell();
}

function handleGlobalDismissClick(event) {
  if (!hasOpenTopbarMenu()) return;
  if (event.target.closest(".topbar-actions")) return;
  closeTopbarMenus({ clearSearch: Boolean(state.search.trim()) });
  renderShell();
}

async function logout() {
  const staff = state.auth === "staff";
  try {
    if (state.token) await api(staff ? "/auth/logout" : "/member-auth/logout");
  } catch {}
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(MEMBER_TOKEN_KEY);
  Object.assign(state, {
    auth: "none",
    authTab: "login",
    token: "",
    user: null,
    member: null,
    tenant: null,
    roleNames: [],
    permissionIds: [],
    currentView: "dashboard",
    sessionMenuOpen: false,
    helpMenuOpen: false,
    accountMenuOpen: false,
    moduleTabs: {},
    sessionExpiresAt: "",
    passwordResetMessage: "",
    passwordResetError: "",
    passwordResetToken: "",
    passwordResetExpiresAt: "",
    passwordResetConfirmMessage: "",
    passwordResetConfirmError: "",
    mfaChallengeId: "",
    mfaDeliveryChannel: "",
    mfaDemoCode: "",
    mfaExpiresAt: "",
    mfaMessage: "",
    mfaError: "",
    userFormMessage: "",
    userFormError: "",
    selectedUserId: "",
    selectedUserRoles: [],
    selectedUserSessions: [],
    selectedUserPasswordResets: [],
    selectedUserResetToken: "",
    selectedUserResetExpiresAt: "",
    selectedUserMessage: "",
    selectedUserError: "",
    userAdminTab: "add",
    selectedTenantId: "",
    selectedTenant: null,
    selectedTenantProfile: null,
    selectedTenantMessage: "",
    selectedTenantError: "",
    tenantFormMessage: "",
    tenantFormError: "",
    saccoRegistrationTab: "platform",
    publicRegistrationMessage: "",
    publicRegistrationError: "",
    selectedSubscriptionId: "",
    selectedSubscriptionMessage: "",
    selectedSubscriptionError: "",
    selectedPackageId: "",
    selectedPackageMessage: "",
    selectedPackageError: "",
    platformPolicyMessage: "",
    platformPolicyError: "",
    memberFormMessage: "",
    memberFormError: "",
    memberTab: "overview",
    selectedMemberId: "",
    selectedMember: null,
    selectedMemberStatement: null,
    selectedMemberNextOfKin: [],
    selectedMemberBeneficiaries: [],
    selectedMemberDocuments: [],
    selectedMemberMessage: "",
    selectedMemberError: "",
    transactionFormMessage: "",
    transactionFormError: "",
    selectedTransactionId: "",
    selectedTransactionReceipt: null,
    selectedTransactionMessage: "",
    selectedTransactionError: "",
    loanFormMessage: "",
    loanFormError: "",
  selectedLoanId: "",
  selectedLoanGuarantors: [],
  selectedLoanRepayments: [],
  selectedLoanSchedule: [],
  selectedLoanMessage: "",
    selectedLoanError: "",
    complaintFormMessage: "",
    complaintFormError: "",
    selectedComplaintId: "",
    selectedComplaintMessage: "",
    selectedComplaintError: "",
    notificationTemplateMessage: "",
    notificationTemplateError: "",
    notificationMessage: "",
    notificationError: "",
    selectedTemplateId: "",
    selectedTemplateMessage: "",
    selectedTemplateError: "",
    branchFormMessage: "",
    branchFormError: "",
    productFormMessage: "",
    productFormError: "",
    saccoSettingsTab: "overview",
    accountFormMessage: "",
    accountFormError: "",
    memberLoanMessage: "",
    memberLoanError: "",
    memberPaymentMessage: "",
    memberPaymentError: "",
    memberComplaintMessage: "",
    memberComplaintError: "",
    memberNotificationMessage: "",
    memberNotificationError: "",
    memberGuarantorMessage: "",
    memberGuarantorError: "",
    welfareClaimMessage: "",
    welfareClaimError: "",
    selectedWelfareClaimId: "",
    selectedWelfareClaimMessage: "",
    selectedWelfareClaimError: "",
    expenseFormMessage: "",
    expenseFormError: "",
    assetFormMessage: "",
    assetFormError: "",
    governanceMeetingMessage: "",
    governanceMeetingError: "",
    selectedMeetingId: "",
    selectedMeetingMessage: "",
    selectedMeetingError: "",
    data: emptyData(),
    memberData: emptyMemberData()
  });
  renderLogin();
}

async function extendSession() {
  if (state.auth === "none") return;
  state.loading = true;
  state.lastError = "";
  state.sessionMenuOpen = false;
  renderShell();
  try {
    const response = await api(state.auth === "member" ? "/member-auth/extend-session" : "/auth/extend-session", { method: "POST" });
    state.sessionExpiresAt = response.expiresAt || "";
    if (state.auth === "member") state.memberData.sessionExpiresAt = response.expiresAt || "";
    await (state.auth === "member" ? refreshMember() : refreshAll());
  } catch (error) {
    state.lastError = error.message || "Could not extend the current session.";
  } finally {
    state.loading = false;
    renderShell();
  }
}

async function updateCurrentUserMfa(enabled) {
  if (state.auth !== "staff") return;
  state.loading = true;
  state.lastError = "";
  renderShell();
  try {
    await api(enabled ? "/auth/mfa/enable" : "/auth/mfa/disable", { method: "POST" });
    if (state.user) state.user.mfaEnabled = enabled;
    await refreshAll();
  } catch (error) {
    state.lastError = error.message || "Could not update MFA status.";
  } finally {
    state.loading = false;
    renderShell();
  }
}

function openSecuritySettings() {
  state.sessionMenuOpen = false;
  state.currentView = "settings";
  state.moduleTabs.settings = "security";
  renderShell();
}

function openMemberSecurity() {
  state.sessionMenuOpen = false;
  state.currentView = "security";
  renderShell();
}

function openHelpComplaints() {
  state.helpMenuOpen = false;
  state.currentView = "complaints";
  renderShell();
}

function openHelpNotifications() {
  state.helpMenuOpen = false;
  state.currentView = canAccessView("notifications") ? "notifications" : "dashboard";
  renderShell();
}

function openHelpSecurity() {
  state.helpMenuOpen = false;
  state.currentView = state.auth === "member" ? "security" : "settings";
  if (state.auth === "staff") state.moduleTabs.settings = "security";
  renderShell();
}

async function openAccountProfile() {
  state.accountMenuOpen = false;
  if (state.auth === "member") {
    state.currentView = "profile";
    renderShell();
    return;
  }
  if (canAccessView("users") && state.user?.id) {
    state.currentView = "users";
    await openUserDetail(state.user.id);
    return;
  }
  state.currentView = "settings";
  state.moduleTabs.settings = "security";
  renderShell();
}

function runtimeNotice() {
  if (state.loading) return `<section class="notice compact"><strong>Loading latest records...</strong><span>Please wait while Tereka Online refreshes this view.</span></section>`;
  if (state.auth !== "none" && !state.networkOnline) {
    return `<section class="notice warning"><strong>${t("offlineNoticeTitle")}</strong><span>${t("offlineNoticeCopy")}</span></section>`;
  }
  const sessionMinutes = sessionMinutesRemaining();
  if (state.auth !== "none" && sessionMinutes !== null && sessionMinutes <= 0) {
    return `<section class="notice danger"><strong>Session expired.</strong><span>Please login again to continue working.</span><button class="button secondary" type="button" data-action="logout">Return to login</button></section>`;
  }
  if (state.auth !== "none" && sessionMinutes !== null && sessionMinutes <= 15) {
    return `<section class="notice warning"><strong>Session expires soon.</strong><span>${escapeHtml(sessionTimeLabel())}. Save your work or extend the session before continuing sensitive actions.</span><button class="button secondary" type="button" data-action="extend-session">Extend session</button></section>`;
  }
  if (state.lastError) return `<section class="notice warning"><strong>Some records could not be loaded.</strong><span>${escapeHtml(state.lastError)}</span><button class="button secondary" type="button" data-action="${state.auth === "member" ? "refresh-member" : "refresh"}">Retry</button></section>`;
  return "";
}

function expireLocalSession(message) {
  localStorage.removeItem(STAFF_TOKEN_KEY);
  localStorage.removeItem(MEMBER_TOKEN_KEY);
  Object.assign(state, {
    auth: "none",
    authTab: "login",
    token: "",
    user: null,
    member: null,
    tenant: null,
    roleNames: [],
    permissionIds: [],
    currentView: "dashboard",
    sessionExpiresAt: "",
    data: emptyData(),
    memberData: emptyMemberData(),
    lastError: message || "Your session has expired. Please login again."
  });
  renderLogin();
}

function sessionExpiryValue() {
  if (state.auth === "member") {
    return state.sessionExpiresAt || state.memberData.sessionExpiresAt || state.memberData.dashboard?.sessionExpiresAt || "";
  }
  return state.sessionExpiresAt || "";
}

function sessionMinutesRemaining() {
  const expiresAt = sessionExpiryValue();
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / 60000);
}

function sessionTimeLabel() {
  if (state.auth === "none") return "";
  const minutes = sessionMinutesRemaining();
  if (minutes === null) return "Session active";
  if (minutes <= 0) return "Session expired";
  if (minutes < 60) return `Session ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `Session ${hours}h ${remaining}m` : `Session ${hours}h`;
}

function sessionStatusClass() {
  const minutes = sessionMinutesRemaining();
  if (minutes === null) return "active";
  if (minutes <= 0) return "danger";
  if (minutes <= 15) return "pending";
  return "active";
}

function dataRows(key) {
  const value = state.data[key];
  return Array.isArray(value) ? value : [];
}

function tenantRows() {
  return dataRows("tenants")
    .filter((tenant) => tenant.id !== "tenant_platform")
    .map((tenant) => ({ ...tenant, saccoCode: tenant.abbreviation || tenant.code || tenant.id }));
}

function pendingTenants() {
  return tenantRows().filter((tenant) => normal(tenant.status).includes("pending") || normal(tenant.status).includes("review"));
}

function subscriptionForTenant(tenantId) {
  return dataRows("subscriptions").find((subscription) => subscription.tenantId === tenantId);
}

function tenantAccountHealth(tenant, subscription) {
  const status = normal(tenant.status);
  const subscriptionStatus = normal(subscription?.status);
  if (status.includes("suspended") || status.includes("terminated")) return "Access blocked";
  if (!subscription) return "Billing setup needed";
  if (subscriptionStatus.includes("expired") || subscriptionStatus.includes("pending")) return "Billing risk";
  if (status === "active" && subscriptionStatus === "active") return "Operational";
  if (status.includes("pending") || status.includes("approved")) return "Activation pending";
  return "Review";
}

function platformUsers() {
  return dataRows("users").filter((user) => user.tenantId === "tenant_platform");
}

function openComplaints() {
  return dataRows("complaints").filter((complaint) => !["closed", "resolved", "cancelled"].includes(normal(complaint.status)));
}

function saccoSupportTickets() {
  return dataRows("complaints").filter((complaint) => !complaint.memberId && complaint.tenantId && complaint.tenantId !== "tenant_platform");
}

function openSaccoSupportTickets() {
  return saccoSupportTickets().filter((complaint) => !["closed", "resolved", "cancelled"].includes(normal(complaint.status)));
}

function pendingTransactions() {
  return dataRows("transactions").filter((transaction) => normal(transaction.status).includes("pending") || normal(transaction.stage).includes("approval"));
}

function memberName(memberId) {
  const member = dataRows("members").find((item) => item.id === memberId);
  return member ? `${member.membershipNo} - ${member.fullName}` : memberId;
}

function tenantName(tenantId) {
  const tenant = dataRows("tenants").find((item) => item.id === tenantId);
  return tenant ? tenant.name || tenant.legalName || tenant.abbreviation || tenant.id : tenantId;
}

function userName(userId) {
  const user = dataRows("users").find((item) => item.id === userId);
  return user ? user.fullName || user.email || user.username || user.id : userId || "Unassigned";
}

function auditRiskLevel(event) {
  const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["failed", "blocked", "too many", "invalid sacco"].some((word) => text.includes(word)) && text.includes("login")) return "High";
  if (["password", "role", "permission", "session", "reversal", "disbursed", "suspended", "terminated"].some((word) => text.includes(word))) return "High";
  if (["approved", "rejected", "status", "payment", "template", "complaint", "loan"].some((word) => text.includes(word))) return "Review";
  return "Normal";
}

function auditCategory(event) {
  const text = normal(`${event.action || ""} ${event.resourceType || ""} ${event.module || ""}`);
  if (["role", "permission", "password", "session", "login", "logout", "user"].some((word) => text.includes(word))) return "Access control";
  if (["reversal", "reverse", "corrected"].some((word) => text.includes(word))) return "Reversals";
  if (["approved", "rejected", "approval", "status", "decision", "submitted"].some((word) => text.includes(word))) return "Approvals";
  if (["transaction", "payment", "loan", "repayment", "expense", "asset", "product", "account", "branch"].some((word) => text.includes(word))) return "Financial activity";
  if (["complaint", "template", "notification"].some((word) => text.includes(word))) return "Operations";
  return "General";
}

function productsByType(type) {
  const wanted = normal(type);
  return dataRows("financialProducts").filter((product) => normal(product.productType).includes(wanted) || normal(product.name).includes(wanted));
}

function accountsByType(type) {
  const wanted = normal(type);
  return dataRows("financialAccounts").filter((account) => normal(account.accountType).includes(wanted) || normal(account.productName).includes(wanted) || normal(account.productCode).includes(wanted));
}

function uniqueCount(rows, key) {
  return new Set((rows || []).map((row) => row[key]).filter(Boolean)).size;
}

function filterRows(rows) {
  return filterRowsByQuery(rows, state.search);
}

function filterRowsByQuery(rows, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows || [];
  return (rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(q));
}

function tableStateKey(title) {
  return String(title || "table").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table";
}

function operationAlerts() {
  const operations = state.data.operations || {};
  const alerts = operations.alerts || operations.integrationStatuses || [];
  const baseAlerts = Array.isArray(alerts) && alerts.length ? alerts : [
    { title: "Database", provider: "PostgreSQL", severity: "Healthy", status: "Healthy", checkedAt: state.lastSync },
    { title: "Application service", provider: "Backend service", severity: "Healthy", status: "Healthy", checkedAt: state.lastSync },
    { title: "Mobile money callbacks", provider: "Provider gateway", severity: "Warning", status: "Pending", checkedAt: state.lastSync }
  ];
  return [...notificationProviderRiskRows(), ...baseAlerts];
}

function fallbackPackages() {
  return [
    { name: "100-250 members", price: 500000, maxMembers: 250, maxBranches: 1, modules: `${money.format(5000)} per member annually, minimum 100 members` },
    { name: "251-500 members", price: 1200000, maxMembers: 500, maxBranches: 2, modules: "Starter fixed billing" },
    { name: "501-2,500 members", price: 3600000, maxMembers: 2500, maxBranches: 5, modules: "Growth SACCO operations" },
    { name: "2,501-10,000 members", price: 9000000, maxMembers: 10000, maxBranches: 25, modules: "Enterprise support" }
  ];
}

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function memberDraftScope(member = state.member) {
  return member?.id || member?.membershipNo || "anonymous";
}

function loadMemberDrafts(member = state.member) {
  try {
    const allDrafts = JSON.parse(localStorage.getItem(MEMBER_DRAFTS_KEY) || "{}");
    return Array.isArray(allDrafts[memberDraftScope(member)]) ? allDrafts[memberDraftScope(member)] : [];
  } catch {
    return [];
  }
}

function persistMemberDrafts() {
  let allDrafts = {};
  try {
    allDrafts = JSON.parse(localStorage.getItem(MEMBER_DRAFTS_KEY) || "{}");
  } catch {
    allDrafts = {};
  }
  allDrafts[memberDraftScope()] = state.memberData.drafts || [];
  localStorage.setItem(MEMBER_DRAFTS_KEY, JSON.stringify(allDrafts));
}

function updateMemberDraft(draftId, patch) {
  state.memberData.drafts = state.memberData.drafts.map((draft) => draft.id === draftId ? { ...draft, ...patch } : draft);
  persistMemberDrafts();
}

function field(label, id, type, placeholder, hint) {
  return `<label><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder || ""}" autocomplete="${type === "password" ? "current-password" : "on"}">${hint ? `<small>${hint}</small>` : ""}</label>`;
}

function logo(size = "") {
  return `<div class="logo ${size}" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M7 9h34v8H28v22h-8V17H7z"></path><path d="M31 22h10v17H31z"></path></svg></div>`;
}

function displayName() {
  return state.member?.fullName || state.user?.fullName || "User";
}

function roleLabel() {
  if (state.auth === "member") return "Member";
  return state.roleNames.map((role) => role === "SACCO Administrator" ? "SACCO Admin" : role).join(", ") || "Staff";
}

function contextName() {
  return state.tenant?.name || (isPlatform() ? "Platform Administration" : state.user?.tenantName) || "Tereka Online";
}

function contextCode() {
  return state.tenant?.abbreviation || state.tenant?.registrationNo || state.tenant?.code || "GVS";
}

function memberStatementLines(dash) {
  const source = dash.statementLines || dash.recentTransactions || [];
  return source.map((line) => ({
    ...line,
    reference: line.reference || line.transactionReference || line.id,
    description: line.description || line.narration || line.type || "Member transaction",
    debit: line.debit ?? (Number(line.amount || 0) < 0 ? Math.abs(Number(line.amount || 0)) : 0),
    credit: line.credit ?? (Number(line.amount || 0) > 0 ? Number(line.amount || 0) : 0),
    runningBalance: line.runningBalance ?? Number(line.savingsBalance || 0) + Number(line.sharesBalance || 0) + Number(line.welfareBalance || 0),
    postedAt: line.postedAt || line.createdAt || line.date || ""
  }));
}

function paymentRoutePanel() {
  return rolePriorityPanel("Member payment routes", [
    ["Treasurer cash deposit", "Members can deposit savings, shares, welfare contributions or loan repayments at the SACCO office. Treasurer/Admin records the cash and issues a receipt after posting.", "Staff receipting"],
    ["Mobile money self payment", "Members can pay from the member portal. The payment posts through the mobile-money callback and appears in statements after successful posting.", "Self-service"],
    ["Monthly performance", "Admin and Treasurer can review member monthly deposits, cash collections, mobile-money collections and loan repayments.", "Visible"]
  ]);
}

function memberPaymentRoutePanel() {
  return rolePriorityPanel("How members can pay", [
    ["Treasurer cash deposit", "Take cash to the SACCO Treasurer for savings deposits or loan repayments. The Treasurer records and receipts it in the SACCO portal.", "Office route"],
    ["Mobile money", "Use the member portal payment form for savings, shares, welfare or active loan repayments through mobile money.", "Self-service"],
    ["Monthly tracking", "Your monthly deposits and repayments appear below from posted statement activity.", "Statement view"]
  ]);
}

function memberPaymentControlPanel(payableLoanCount, draftCount) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Payment posting rules</h2>
          <p>Production controls for member deposits, Treasurer cash handoff and loan repayment tracking.</p>
        </div>
        <span class="status active">Controlled</span>
      </div>
      <div class="source-grid">
        ${mini("Mobile money result", "Posts after provider callback")}
        ${mini("Treasurer cash result", "Receipt after staff posting")}
        ${mini("Loan repayment gate", `${payableLoanCount} active loan(s)`)}
        ${mini("Offline drafts", `${draftCount} saved`)}
      </div>
      <ul class="activity-list">
        <li><strong>Mobile money deposit</strong><span>Member submits the payment, provider callback posts the transaction, then the receipt appears in member statements.</span><em>Self-service</em></li>
        <li><strong>Treasurer cash deposit</strong><span>Member takes cash to the Treasurer; SACCO staff records the savings deposit or loan repayment and issues a receipt.</span><em>Office receipt</em></li>
        <li><strong>Monthly performance</strong><span>Posted deposits and repayments feed both the member monthly view and SACCO Admin/Treasurer performance tables.</span><em>Shared view</em></li>
      </ul>
    </section>
  `;
}

function saccoMonthlyPerformancePanel(rows) {
  const membersReported = new Set(rows.map((row) => row.memberName).filter(Boolean)).size;
  const latestMonth = rows[0]?.month || "No posted month";
  const selected = rows.find((row) => row.performanceId === state.selectedMonthlyPerformanceId);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>SACCO monthly performance control</h2>
          <p>Compare member deposits by savings, shares, welfare, loan repayments, Treasurer cash and mobile money.</p>
        </div>
        ${selected ? `<button class="button ghost" type="button" data-action="close-monthly-performance-detail">Close detail</button>` : `<span class="status active">Staff reporting</span>`}
      </div>
      <div class="source-grid">
        ${mini("Latest month", latestMonth)}
        ${mini("Members reported", membersReported)}
        ${mini("Treasurer cash collections", money.format(sum(rows, "treasurerCash")))}
        ${mini("Mobile money collections", money.format(sum(rows, "mobileMoney")))}
        ${mini("Loan repayments", money.format(sum(rows, "loanRepayments")))}
        ${mini("Total deposits", money.format(sum(rows, "totalDeposits")))}
      </div>
      ${selected ? `
        <div class="divider"></div>
        <div class="panel-heading">
          <div>
            <h3>Selected member performance</h3>
            <p>${escapeHtml(selected.memberName)} for ${escapeHtml(selected.month)}.</p>
          </div>
          ${selected.memberId ? `<button class="button secondary" type="button" data-action="open-monthly-performance-member" data-member-id="${escapeHtml(selected.memberId)}">Open member statement</button>` : `<span class="status active">Reviewing</span>`}
        </div>
        <div class="source-grid">
          ${mini("Savings deposits", money.format(selected.savingsDeposits))}
          ${mini("Share deposits", money.format(selected.shareDeposits))}
          ${mini("Welfare deposits", money.format(selected.welfareDeposits))}
          ${mini("Loan repayments", money.format(selected.loanRepayments))}
          ${mini("Treasurer cash", money.format(selected.treasurerCash))}
          ${mini("Mobile money", money.format(selected.mobileMoney))}
          ${mini("Total deposits", money.format(selected.totalDeposits))}
          ${mini("Collection split", `${selected.mobileMoney ? "Mobile money used" : "Office cash only"}`)}
        </div>
      ` : `<p class="muted-note">Use Review on a monthly performance row to inspect one member and month.</p>`}
    </section>
  `;
}

function saccoMonthlyPerformanceRows() {
  const rows = new Map();
  const ensure = (month, memberId, memberLabel) => {
    const key = `${month}:${memberId || memberLabel || "unknown"}`;
    if (!rows.has(key)) {
      rows.set(key, {
        month,
        memberId,
        memberName: memberLabel || memberName(memberId),
        savingsDeposits: 0,
        shareDeposits: 0,
        welfareDeposits: 0,
        loanRepayments: 0,
        treasurerCash: 0,
        mobileMoney: 0,
        totalDeposits: 0
      });
    }
    return rows.get(key);
  };

  transactionRows()
    .filter((row) => normal(row.status) === "posted")
    .forEach((transaction) => {
      const month = monthLabel(transaction.postedAt || transaction.createdAt);
      const target = ensure(month, transaction.memberId, transaction.memberName);
      const amount = Number(transaction.amount || transaction.credit || 0);
      addPerformanceAmount(target, transaction.type, amount);
      if (isMobileMoneyLine(transaction)) target.mobileMoney += amount;
      else target.treasurerCash += amount;
    });

  dataRows("mobileMoneyCallbacks")
    .filter((callback) => normal(callback.status) === "posted")
    .forEach((callback) => {
      const month = monthLabel(callback.receivedAt || callback.createdAt);
      const target = ensure(month, callback.memberId, memberName(callback.memberId));
      const amount = Number(callback.amount || 0);
      addPerformanceAmount(target, callback.purpose, amount);
      target.mobileMoney += amount;
    });

  return [...rows.values()]
    .map((row) => ({
      ...row,
      performanceId: monthlyPerformanceId(row),
      action: "monthly-performance-detail",
      actionLabel: "Review",
      actionId: monthlyPerformanceId(row),
      totalDeposits: row.savingsDeposits + row.shareDeposits + row.welfareDeposits + row.loanRepayments
    }))
    .sort((a, b) => b.month.localeCompare(a.month) || a.memberName.localeCompare(b.memberName));
}

function monthlyPerformanceId(row) {
  return `${row.month || ""}::${row.memberName || ""}`;
}

function memberMonthlyPerformanceRows(dash) {
  const rows = new Map();
  memberStatementLines(dash).forEach((line) => {
    const month = monthLabel(line.postedAt || line.createdAt);
    if (!rows.has(month)) {
      rows.set(month, {
        month,
        date: monthEndDateLabel(month),
        savingsDeposits: 0,
        shareDeposits: 0,
        welfareDeposits: 0,
        loanRepayments: 0,
        treasurerCash: 0,
        mobileMoney: 0,
        totalDeposits: 0,
        closingBalance: 0
      });
    }
    const target = rows.get(month);
    const amount = Number(line.credit || 0);
    addPerformanceAmount(target, `${line.description || ""} ${line.type || ""}`, amount);
    if (amount) {
      if (isMobileMoneyLine(line)) target.mobileMoney += amount;
      else target.treasurerCash += amount;
    }
    target.totalDeposits = target.savingsDeposits + target.shareDeposits + target.welfareDeposits + target.loanRepayments;
    target.closingBalance = Number(line.runningBalance || target.closingBalance || 0);
  });
  return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
}

function addPerformanceAmount(target, purpose, amount) {
  const text = normal(purpose);
  if (!amount) return;
  if (text.includes("loan") || text.includes("repayment")) target.loanRepayments += amount;
  else if (text.includes("share")) target.shareDeposits += amount;
  else if (text.includes("welfare")) target.welfareDeposits += amount;
  else target.savingsDeposits += amount;
}

function monthLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "Unknown month";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthEndDateLabel(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  if (!year || !monthNumber) return month || "";
  return new Date(year, monthNumber, 0).toISOString();
}

function initials(name) {
  return String(name || "TO").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function labelize(value) {
  const displayLabels = {
    tenantId: "SACCO ID",
    tenantName: "SACCO",
    tenant: "SACCO",
    tenants: "SACCOs"
  };
  if (displayLabels[value]) return displayLabels[value];
  return String(value).replace(/[_-]+/g, " ").replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").trim().replace(/^./, (char) => char.toUpperCase());
}

function normal(value) {
  return String(value || "").toLowerCase();
}

function sum(rows, ...keys) {
  return rows.reduce((total, row) => total + Number(keys.map((key) => row[key]).find((item) => item !== undefined) || 0), 0);
}

function formatValue(row, column) {
  const value = row[column] ?? row[snake(column)] ?? row[camelFallback(column)] ?? "";
  if (column.toLowerCase().includes("amount") || column.toLowerCase().includes("balance") || ["debit", "credit", "savings", "shares", "welfare", "savingsDeposits", "shareDeposits", "welfareDeposits", "loanRepayments", "treasurerCash", "mobileMoney", "totalDeposits", "loanPortfolio", "loansAtRisk", "expenseTotal", "assetCost", "assetNetBookValue", "monthlyInstallment", "principalDue", "interestDue", "totalDue", "paidAmount", "balanceDue"].includes(column)) return money.format(Number(value || 0));
  if (column.toLowerCase().includes("status") || column.toLowerCase().includes("severity")) return `<span class="status ${statusClass(value)}">${escapeHtml(String(value || "Pending"))}</span>`;
  if (isDateColumn(column)) return escapeHtml(formatTableDate(value, column));
  return escapeHtml(String(value || "-"));
}

function isDateColumn(column) {
  const text = column.toLowerCase();
  return text === "date" || text.endsWith("date") || text.endsWith("at") || ["createdat", "updatedat", "postedat", "sentat", "readat", "expiresat", "usedat"].includes(text);
}

function formatTableDate(value, column) {
  if (!value) return "-";
  const text = String(value);
  const isDateOnly = column.toLowerCase() === "date" || column.toLowerCase().endsWith("date") || /^\d{4}-\d{2}-\d{2}$/.test(text);
  return isDateOnly ? formatDate(value) : formatDateTime(value);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(currentRegion().locale, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(currentRegion().locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function currentRegion() {
  const tenant = state.tenant || tenantRows().find((item) => item.id === state.user?.tenantId) || {};
  const country = normal(tenant.country || tenant.operatingCountry || tenant.countryName || "");
  const region = COUNTRY_REGIONS[country] || {};
  const locale = state.locale || tenant.locale || tenant.defaultLocale || region.locale || DEFAULT_REGION.locale;
  const currency = tenant.currency || tenant.currencyCode || region.currency || DEFAULT_REGION.currency;
  return {
    locale,
    currency,
    currencyDigits: Number.isInteger(tenant.currencyDigits) ? tenant.currencyDigits : region.currencyDigits ?? DEFAULT_REGION.currencyDigits,
    direction: tenant.direction || tenant.textDirection || region.direction || DEFAULT_REGION.direction
  };
}

function applyRegionalDocumentSettings() {
  const region = currentRegion();
  document.documentElement.lang = region.locale;
  document.documentElement.dir = region.direction;
}

function t(key) {
  return messages[state.locale]?.[key] || messages[DEFAULT_REGION.locale]?.[key] || key;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // The app remains fully usable when a browser or local environment blocks service workers.
    });
  });
}

function snake(column) {
  return column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function camelFallback(column) {
  const aliases = {
    tenantName: "tenant",
    packageName: "package",
    expiryDate: "expiry",
    postedAt: "date",
    applicationNo: "id",
    requestedAmount: "amount",
    fullName: "name",
    membershipNo: "no",
    kycStatus: "kyc",
    savingsBalance: "savings",
    sharesBalance: "shares",
    welfareBalance: "welfare"
  };
  return aliases[column] || column;
}

function statusClass(value) {
  const text = normal(value);
  if (["active", "approved", "paid", "healthy", "resolved", "completed", "posted"].some((item) => text.includes(item))) return "active";
  if (["failed", "rejected", "suspended", "expired", "overdue", "arrears"].some((item) => text.includes(item))) return "danger";
  return "pending";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

registerServiceWorker();
init();
