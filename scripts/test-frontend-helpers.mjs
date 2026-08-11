import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const sandbox = {
  console,
  Intl,
  Date,
  URLSearchParams,
  window: { location: { search: "" } },
  document: {
    documentElement: { dir: "ltr", lang: "en-UG" },
    getElementById: () => null
  },
  localStorage: {
    store: {},
    getItem(key) {
      return this.store[key] ?? null;
    },
    setItem(key, value) {
      this.store[key] = String(value);
    },
    removeItem(key) {
      delete this.store[key];
    }
  },
  state: {
    search: "",
    lastSync: "2026-08-08T10:00:00.000Z",
    tableState: {},
    pageMeta: {},
    data: {},
    user: { tenantId: "tenant_green" },
    tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX" },
    roleNames: ["SACCO Administrator"],
    permissionIds: [],
    member: { id: "member_green_amina", fullName: "Amina Naki", phone: "+256700000001", status: "active" },
    memberData: { dashboard: {}, loans: [], notifications: [], drafts: [] },
    memberPaymentMessage: "",
    memberPaymentError: "",
    moduleTabs: {},
    userAdminTab: "list",
    selectedUserId: "",
    selectedUserRoles: [],
    selectedUserSessions: [],
    selectedUserPasswordResets: [],
    memberTab: "overview",
    selectedMemberId: "",
    selectedMember: null,
    selectedMemberStatement: null,
    selectedMemberNextOfKin: [],
    selectedMemberBeneficiaries: [],
    selectedMemberDocuments: [],
    selectedMemberMessage: "",
    selectedMemberError: "",
    selectedTransactionId: "",
    selectedTransactionReceipt: null,
    selectedPaymentRequestId: "",
    paymentRequestStatusMessage: "",
    paymentRequestStatusError: "",
    paymentRequestStatusReason: "",
    selectedLoanId: "",
    selectedLoanGuarantors: [],
    selectedLoanRepayments: [],
    selectedLoanSchedule: [],
    selectedLoanMessage: "",
    selectedLoanError: "",
    loanFormMessage: "",
    loanFormError: "",
    chatFilters: {},
    chatMessages: {},
    selectedComplaintId: "",
    chatError: "",
    chatSending: false,
    selectedComplaintMessage: "",
    notificationFilters: {},
    selectedTemplateId: "",
    notificationMessage: "",
    notificationError: "",
    notificationTemplateMessage: "",
    notificationTemplateError: "",
    selectedTemplateMessage: "",
    selectedTemplateError: "",
    governanceMeetingMessage: "",
    governanceMeetingError: "",
    selectedMeetingId: "",
    selectedMeetingMessage: "",
    selectedMeetingError: "",
    selectedWelfareClaimId: "",
    selectedWelfareClaimMessage: "",
    selectedWelfareClaimError: "",
    welfareClaimMessage: "",
    welfareClaimError: "",
    productFormMessage: "",
    productFormError: "",
    accountFormMessage: "",
    accountFormError: "",
    expenseFormMessage: "",
    expenseFormError: "",
    assetFormMessage: "",
    assetFormError: "",
    saccoSettingsTab: "overview",
    branchFormMessage: "",
    branchFormError: "",
    collectionSettingsMessage: "",
    collectionSettingsError: ""
  }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
for (const file of [
  "app.i18n.js",
  "app.formatters.js",
  "app.member-performance.js",
  "app.member-admin-model.js",
  "app.transactions-model.js",
  "app.loans-model.js",
  "app.accounting-model.js",
  "app.sacco-finance-model.js",
  "app.notifications-model.js",
  "app.complaints-model.js",
  "app.governance-model.js",
  "app.reports-model.js",
  "app.audit-model.js",
  "app.onboarding-model.js",
  "app.access-model.js",
  "app.settings-model.js",
  "app.core.js",
  "app.api.js",
  "app.ui.js",
  "app.table-model.js",
  "app.tables.js",
  "app.auth.js",
  "app.member-admin.js",
  "app.member.js",
  "app.shell.js",
  "app.navigation.js",
  "app.registration.js",
  "app.transactions.js",
  "app.loans.js",
  "app.sacco-finance.js",
  "app.accounting.js",
  "app.complaints.js",
  "app.governance.js",
  "app.operations.js",
  "app.reporting.js",
  "app.settings.js",
  "app.session.js",
  "app.users.js",
  "app.notifications.js"
]) {
  vm.runInContext(await readFile(file, "utf8"), sandbox, { filename: file });
}

const rows = [
  { id: "row_1", fullName: "Amina Naki", membershipNo: "GVS-0001", savings: 10000, action: "member-detail", actionLabel: "Open", actionId: "row_1" },
  { id: "row_2", fullName: "Brian Kato", membershipNo: "GVS-0002", savings: 20000 },
  { id: "row_3", fullName: "Charles & Sons", membershipNo: "GVS-0003", savings: 30000 }
];

assert.equal(sandbox.tableStateKey("Member Directory / Active"), "member-directory-active");
assert.equal(sandbox.filterRowsByQuery(rows, "kato").length, 1);
assert.equal(sandbox.filterRowsByQuery(rows, "GVS-000").length, 3);
assert.equal(sandbox.escapeHtml("<b>Amina & Brian</b>"), "&lt;b&gt;Amina &amp; Brian&lt;/b&gt;");

sandbox.state.tableState["member-directory"] = { search: "GVS-000", page: 1, pageSize: 2 };
const tableHtml = sandbox.recordTable("Member directory", rows, ["membershipNo", "fullName", "savings"]);
assert.match(tableHtml, /Search member directory/);
assert.match(tableHtml, /2 of 3/);
assert.match(tableHtml, /Page 1 of 2/);
assert.match(tableHtml, /data-table-search="member-directory"/);
assert.doesNotMatch(tableHtml, /Charles &amp; Sons/);
assert.match(tableHtml, /data-row-action="member-detail"/);

sandbox.state.tableState["member-directory"] = { search: "GVS-000", page: 2, pageSize: 2 };
const secondPageHtml = sandbox.recordTable("Member directory", rows, ["membershipNo", "fullName", "savings"]);
assert.match(secondPageHtml, /Page 2 of 2/);
assert.match(secondPageHtml, /Charles &amp; Sons/);

sandbox.state.tableState["member-directory"] = { search: "missing", page: 9, pageSize: 10 };
const emptyHtml = sandbox.recordTable("Member directory", rows, ["membershipNo", "fullName"]);
assert.match(emptyHtml, /No records found/);
assert.equal(sandbox.state.tableState["member-directory"].page, 1);

const loginHtml = sandbox.loginPanel();
assert.match(loginHtml, /id="code"/);
assert.match(loginHtml, /id="username"/);
assert.match(loginHtml, /Username, email, phone or membership number/);
assert.match(loginHtml, /PLATFORM/);

let renderLoginCount = 0;
let refreshAllCount = 0;
let refreshMemberCount = 0;
sandbox.renderLogin = () => {
  renderLoginCount += 1;
};
sandbox.renderShell = () => {};
sandbox.refreshAll = async () => {
  refreshAllCount += 1;
};
sandbox.refreshMember = async () => {
  refreshMemberCount += 1;
};
const response = (ok, status, payload) => ({
  ok,
  status,
  json: async () => payload
});

sandbox.fetch = async (url) => {
  if (url.endsWith("/auth/login")) {
    return response(true, 202, {
      data: {
        mfaRequired: true,
        challengeId: "mfa_001",
        deliveryChannel: "email",
        demoCode: "123456",
        expiresAt: "2026-08-08T11:00:00.000Z"
      }
    });
  }
  throw new Error(`Unexpected URL ${url}`);
};
await sandbox.login("PLATFORM", "admin@platform.local", "Admin@12345");
assert.equal(sandbox.state.mfaChallengeId, "mfa_001");
assert.equal(sandbox.state.mfaDeliveryChannel, "email");
assert.equal(sandbox.state.mfaDemoCode, "123456");
assert.equal(sandbox.localStorage.getItem("tereka-staff-token"), null);
assert.equal(sandbox.localStorage.getItem("tereka-member-token"), null);
assert.equal(renderLoginCount, 1);

sandbox.clearMfaState();
sandbox.state.auth = "none";
sandbox.fetch = async (url) => {
  if (url.endsWith("/auth/login")) {
    return response(false, 423, {
      error: {
        code: "PASSWORD_RESET_REQUIRED",
        message: "Password reset required."
      }
    });
  }
  throw new Error(`Unexpected URL ${url}`);
};
await assert.rejects(
  () => sandbox.login("PLATFORM", "admin@platform.local", "OldPassword@12345"),
  /Password reset required/
);
assert.equal(sandbox.state.authTab, "forgot");
assert.match(sandbox.state.passwordResetMessage, /Password reset is required/);

sandbox.state.authTab = "login";
sandbox.state.lastError = "";
sandbox.clearPasswordResetState();
sandbox.localStorage.setItem("tereka-staff-token", "old-staff-token");
sandbox.fetch = async (url) => {
  if (url.endsWith("/auth/login")) {
    return response(false, 401, {
      error: {
        code: "AUTH_INVALID",
        message: "Invalid code, username, or password."
      }
    });
  }
  if (url.endsWith("/member-auth/login")) {
    return response(true, 200, {
      data: {
        token: "member-token-001",
        member: { id: "member_green_amina", fullName: "Amina Naki", membershipNo: "GVS-0001" },
        tenant: { id: "tenant_green", name: "Green Valley SACCO" },
        balances: { savings: 100000 },
        expiresAt: "2026-08-08T12:00:00.000Z"
      }
    });
  }
  throw new Error(`Unexpected URL ${url}`);
};
await sandbox.login("GVS", "GVS-0001", "Member@12345");
assert.equal(sandbox.state.auth, "member");
assert.equal(sandbox.state.token, "member-token-001");
assert.equal(sandbox.state.member.membershipNo, "GVS-0001");
assert.equal(sandbox.localStorage.getItem("tereka-member-token"), "member-token-001");
assert.equal(sandbox.localStorage.getItem("tereka-staff-token"), null);
assert.equal(refreshMemberCount, 1);

sandbox.state.auth = "staff";
sandbox.state.token = "staff-token-cleanup";
sandbox.state.user = { id: "user_platform_super", tenantId: "tenant_platform" };
sandbox.state.member = { id: "member_should_clear" };
sandbox.state.tenant = { id: "tenant_platform" };
sandbox.state.roleNames = ["Platform Super Admin"];
sandbox.state.permissionIds = ["users:create"];
sandbox.state.sessionExpiresAt = "2026-08-08T12:00:00.000Z";
sandbox.state.data.users = [{ id: "user_platform_super" }];
sandbox.localStorage.setItem("tereka-staff-token", "staff-token-cleanup");
sandbox.localStorage.setItem("tereka-member-token", "stale-member-token");
sandbox.api = async () => ({});
await sandbox.logout();
assert.equal(sandbox.state.auth, "none");
assert.equal(sandbox.state.token, "");
assert.equal(sandbox.state.user, null);
assert.equal(sandbox.state.member, null);
assert.equal(sandbox.state.roleNames.length, 0);
assert.equal(sandbox.state.permissionIds.length, 0);
assert.equal(sandbox.state.sessionExpiresAt, "");
assert.equal(sandbox.state.data.users.length, 0);
assert.equal(sandbox.localStorage.getItem("tereka-staff-token"), null);
assert.equal(sandbox.localStorage.getItem("tereka-member-token"), null);

sandbox.applyStaffSession({
  token: "staff-super-token",
  user: { id: "user_platform_super", tenantId: "tenant_platform", email: "admin@platform.local" },
  tenant: { id: "tenant_platform", name: "Platform Administration" },
  roleNames: ["Platform Super Admin"],
  permissionIds: [],
  expiresAt: new Date(Date.now() + 90 * 60 * 1000).toISOString()
});
const superAdminModules = sandbox.visibleModules().map(([id]) => id);
assert.equal(sandbox.isPlatform(), true);
assert.equal(sandbox.roleKind(), "super");
assert.ok(superAdminModules.includes("users"));
assert.ok(superAdminModules.includes("settings"));
assert.ok(superAdminModules.includes("subscriptions"));
assert.ok(!superAdminModules.includes("members"));
assert.ok(!superAdminModules.includes("loans"));
assert.equal(sandbox.sessionTimeLabel(), "Session 1h 30m");

sandbox.applyStaffSession({
  token: "staff-billing-token",
  user: { id: "user_platform_billing", tenantId: "tenant_platform", email: "billing@platform.local" },
  tenant: { id: "tenant_platform", name: "Platform Administration" },
  roleNames: ["Platform Billing Officer"],
  permissionIds: ["dashboard:view", "tenants:view", "subscriptions:view", "reports:view"],
  expiresAt: new Date(Date.now() - 60 * 1000).toISOString()
});
const billingModules = sandbox.visibleModules().map(([id]) => id);
assert.equal(sandbox.roleKind(), "billing");
assert.ok(billingModules.includes("subscriptions"));
assert.ok(!billingModules.includes("users"));
assert.ok(!billingModules.includes("settings"));
assert.equal(sandbox.sessionTimeLabel(), "Session expired");

sandbox.applyStaffSession({
  token: "staff-treasurer-token",
  user: { id: "user_green_treasurer", tenantId: "tenant_green", email: "treasurer@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO" },
  roleNames: ["Treasurer"],
  permissionIds: ["dashboard:view", "transactions:view", "approvals:view", "reports:view"],
  expiresAt: ""
});
const treasurerModules = sandbox.visibleModules().map(([id]) => id);
assert.equal(sandbox.isPlatform(), false);
assert.equal(sandbox.roleKind(), "treasurer");
assert.ok(treasurerModules.includes("transactions"));
assert.ok(treasurerModules.includes("reconciliation"));
assert.ok(!treasurerModules.includes("members"));
assert.ok(!treasurerModules.includes("users"));
assert.equal(sandbox.sessionTimeLabel(), "Session active");

sandbox.applyStaffSession({
  token: "staff-super-token",
  user: { id: "user_platform_super", tenantId: "tenant_platform", email: "admin@platform.local" },
  tenant: { id: "tenant_platform", name: "Platform Administration" },
  roleNames: ["Platform Super Admin"],
  permissionIds: [],
  expiresAt: ""
});
sandbox.state.data.roles = [
  { id: "role_platform_super", tenantId: "tenant_platform", name: "Platform Super Admin", status: "active" },
  { id: "role_platform_billing", tenantId: "tenant_platform", name: "Platform Billing Officer", status: "active" },
  { id: "role_sacco_treasurer", tenantId: "tenant_green", name: "SACCO Treasurer", status: "active" }
];
sandbox.state.data.users = [
  { id: "user_platform_super", tenantId: "tenant_platform", fullName: "Platform Super", email: "admin@platform.local", phone: "+256700000000", role: "Platform Super Admin", status: "active" },
  { id: "user_platform_billing", tenantId: "tenant_platform", fullName: "Platform Billing", email: "billing@platform.local", phone: "+256700000007", role: "Platform Billing Officer", status: "active" },
  { id: "user_green_treasurer", tenantId: "tenant_green", fullName: "Green Treasurer", email: "treasurer@greenvalley.local", phone: "+256700000003", role: "SACCO Treasurer", status: "active" }
];
sandbox.state.userAdminTab = "add";
const superAdminAddUserHtml = sandbox.usersView();
assert.match(superAdminAddUserHtml, /Add platform user/);
assert.match(superAdminAddUserHtml, /id="addUserForm"/);
assert.match(superAdminAddUserHtml, /Create user/);
assert.match(superAdminAddUserHtml, /Platform Super Admin/);

sandbox.state.userAdminTab = "list";
const superAdminUserListHtml = sandbox.usersView();
assert.match(superAdminUserListHtml, /Platform administrator list/);
assert.match(superAdminUserListHtml, /2 record\(s\)/);
assert.match(superAdminUserListHtml, /admin@platform.local/);
assert.match(superAdminUserListHtml, /billing@platform.local/);
assert.doesNotMatch(superAdminUserListHtml, /treasurer@greenvalley.local/);

sandbox.state.userAdminTab = "detail";
sandbox.state.selectedUserId = "user_platform_billing";
sandbox.state.selectedUserRoles = ["role_platform_billing"];
const superAdminUserDetailHtml = sandbox.usersView();
assert.match(superAdminUserDetailHtml, /User detail and role assignment/);
assert.match(superAdminUserDetailHtml, /Save user details/);
assert.match(superAdminUserDetailHtml, /Save role/);
assert.match(superAdminUserDetailHtml, /Suspend user/);
assert.match(superAdminUserDetailHtml, /Delete user/);

sandbox.applyStaffSession({
  token: "staff-billing-token",
  user: { id: "user_platform_billing", tenantId: "tenant_platform", email: "billing@platform.local" },
  tenant: { id: "tenant_platform", name: "Platform Administration" },
  roleNames: ["Platform Billing Officer"],
  permissionIds: ["dashboard:view", "tenants:view", "subscriptions:view", "reports:view"],
  expiresAt: ""
});
assert.equal(sandbox.canAccessView("users"), false);
const restrictedUserDetailHtml = sandbox.userDetailPanel(sandbox.state.data.users.filter((user) => user.tenantId === "tenant_platform"), false);
assert.match(restrictedUserDetailHtml, /Profile view only/);
assert.match(restrictedUserDetailHtml, /Restricted/);
assert.doesNotMatch(restrictedUserDetailHtml, /Save user details/);
assert.doesNotMatch(restrictedUserDetailHtml, /Delete user/);

sandbox.applyStaffSession({
  token: "staff-super-token",
  user: { id: "user_platform_super", tenantId: "tenant_platform", email: "admin@platform.local" },
  tenant: { id: "tenant_platform", name: "Platform Administration" },
  roleNames: ["Platform Super Admin"],
  permissionIds: [],
  expiresAt: ""
});
sandbox.state.data.tenants = [
  { id: "tenant_platform", name: "Platform Administration", abbreviation: "PLATFORM", status: "active" },
  { id: "tenant_green", name: "Green Valley SACCO", abbreviation: "GVS", country: "Uganda", currencyCode: "UGX", district: "Wakiso", registrationNo: "REG-001", status: "active" },
  { id: "tenant_market", name: "Market Women SACCO", abbreviation: "MWS", country: "Uganda", currencyCode: "UGX", district: "Kampala", registrationNo: "REG-002", status: "pending_self_registration" }
];
sandbox.state.data.subscriptions = [
  { id: "sub_green", tenantId: "tenant_green", packageId: "pkg_250", amount: 500000, paid: 500000, status: "active", expiry: "2027-08-08" },
  { id: "sub_market", tenantId: "tenant_market", packageId: "pkg_250", amount: 500000, paid: 0, status: "pending", expiry: "2027-08-08" }
];
sandbox.state.data.subscriptionPackages = [
  { id: "pkg_250", name: "Starter 100-250", memberRange: "100-250" },
  { id: "pkg_500", name: "Growth 251-500", memberRange: "251-500" }
];
sandbox.state.saccoRegistrationTab = "platform";
const platformRegistrationHtml = sandbox.saccoApplications();
assert.match(platformRegistrationHtml, /Register SACCO inside platform/);
assert.match(platformRegistrationHtml, /id="platformSaccoForm"/);
assert.match(platformRegistrationHtml, /id="newTenantCode" readonly/);
assert.match(platformRegistrationHtml, /id="newTenantDistrict"/);
assert.match(platformRegistrationHtml, /id="newTenantParish"/);
assert.match(platformRegistrationHtml, /id="newTenantVillage"/);
assert.match(platformRegistrationHtml, /id="newTenantContactNumber"/);
assert.match(platformRegistrationHtml, /id="newTenantMemberRange"/);
assert.match(platformRegistrationHtml, /100 to 250 members/);
assert.match(platformRegistrationHtml, /251 to 500 members/);
assert.match(platformRegistrationHtml, /id="newTenantPaymentStatus"/);
assert.match(platformRegistrationHtml, /Paid - activate SACCO/);
assert.match(platformRegistrationHtml, /Not paid - keep pending payment/);
assert.doesNotMatch(platformRegistrationHtml, /Creation mode/);
assert.equal(sandbox.generatedSaccoCode("Green Valley SACCO"), "GV2");
assert.equal(sandbox.generatedSaccoCode("Tereka Farmers SACCO Limited"), "TFS");
assert.equal(sandbox.saccoLocationAddress("Kampala", "Central", "Market Zone", "100-250"), "District: Kampala; Parish: Central; Village: Market Zone; Member range: 100-250");

sandbox.state.saccoRegistrationTab = "applications";
const applicationListHtml = sandbox.saccoApplications();
assert.match(applicationListHtml, /SACCO application list/);
assert.match(applicationListHtml, /Green Valley SACCO/);
assert.match(applicationListHtml, /Market Women SACCO/);
assert.match(applicationListHtml, /Callback received/);
assert.match(applicationListHtml, /Payment initiated/);
assert.match(applicationListHtml, /Active/);
assert.match(applicationListHtml, /Awaiting payment/);

sandbox.state.authTab = "register";
const publicRegistrationHtml = sandbox.publicSaccoRegistrationPanel();
assert.match(publicRegistrationHtml, /Complete SACCO details/);
assert.match(publicRegistrationHtml, /id="publicTenantCode" readonly/);
assert.match(publicRegistrationHtml, /id="publicTenantDistrict"/);
assert.match(publicRegistrationHtml, /id="publicTenantParish"/);
assert.match(publicRegistrationHtml, /id="publicTenantVillage"/);
assert.match(publicRegistrationHtml, /id="publicTenantContactNumber"/);
assert.match(publicRegistrationHtml, /id="publicTenantMemberRange"/);
assert.match(publicRegistrationHtml, /id="publicTenantPaymentPhone"/);
assert.match(publicRegistrationHtml, /Mobile-money payment is initiated/);

sandbox.applyStaffSession({
  token: "staff-admin-token",
  user: { id: "user_green_admin", tenantId: "tenant_green", email: "admin@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX" },
  roleNames: ["SACCO Administrator"],
  permissionIds: ["dashboard:view", "members:view", "members:create", "members:approve", "reports:view"],
  expiresAt: ""
});
sandbox.state.data.branches = [{ id: "branch_main", name: "Main Branch", code: "MAIN" }];
sandbox.state.data.members = [
  {
    id: "member_green_amina",
    tenantId: "tenant_green",
    branchId: "branch_main",
    membershipNo: "GVS-0001",
    fullName: "Amina Naki",
    memberType: "individual",
    phone: "+256700000001",
    email: "amina@example.com",
    nationalId: "CM123456",
    joiningDate: "2026-08-01",
    status: "active",
    kycStatus: "verified",
    savingsBalance: 150000,
    sharesBalance: 50000,
    welfareBalance: 10000
  }
];
sandbox.state.memberTab = "register";
const memberRegisterHtml = sandbox.membersView();
assert.match(memberRegisterHtml, /Member registration/);
assert.match(memberRegisterHtml, /id="memberRegistrationForm"/);
assert.match(memberRegisterHtml, /id="newMemberTenantId" value="tenant_green"/);
assert.match(memberRegisterHtml, /id="newMemberNo"/);
assert.match(memberRegisterHtml, /id="newMemberPhone"/);
assert.match(memberRegisterHtml, /id="newMemberNationalId"/);
assert.match(memberRegisterHtml, /Create member/);

sandbox.state.memberTab = "list";
const memberListHtml = sandbox.membersView();
assert.match(memberListHtml, /Member list/);
assert.match(memberListHtml, /GVS-0001/);
assert.match(memberListHtml, /Amina Naki/);
assert.match(memberListHtml, /Open profile/);
assert.doesNotMatch(memberListHtml, /Platform administrator list/);

sandbox.state.selectedMemberId = "member_green_amina";
sandbox.state.selectedMember = sandbox.state.data.members[0];
sandbox.state.selectedMemberStatement = {
  lines: [
    { reference: "RCPT-001", type: "savings_deposit", channel: "treasurer_cash", amount: 50000, savingsBalance: 150000, sharesBalance: 50000, welfareBalance: 10000, postedAt: "2026-08-08T09:00:00.000Z", status: "posted" },
    { reference: "MM-001", type: "loan_repayment", channel: "mobile_money", amount: 30000, savingsBalance: 150000, sharesBalance: 50000, welfareBalance: 10000, postedAt: "2026-08-07T09:00:00.000Z", status: "posted" }
  ]
};
sandbox.state.selectedMemberNextOfKin = [{ fullName: "John Naki", relationship: "Spouse", phone: "+256700000009", address: "Wakiso", primaryContact: true }];
sandbox.state.selectedMemberBeneficiaries = [{ fullName: "Mary Naki", relationship: "Daughter", phone: "+256700000010", allocationPercent: 100 }];
sandbox.state.selectedMemberDocuments = [{ id: "doc_1", documentType: "National ID", storageKey: "kyc/member_green_amina/id.pdf", verificationStatus: "verified", retentionStatus: "active" }];
const memberKycHtml = sandbox.memberDetailPanel("kyc");
assert.match(memberKycHtml, /Member detail and KYC approval/);
assert.match(memberKycHtml, /This is a SACCO member profile, not a staff login/);
assert.match(memberKycHtml, /id="memberProfileForm"/);
assert.match(memberKycHtml, /Save member profile/);
assert.match(memberKycHtml, /Save KYC decision/);
assert.match(memberKycHtml, /Approve member/);
assert.match(memberKycHtml, /Suspend member/);

const memberContactsHtml = sandbox.memberDetailPanel("contacts");
assert.match(memberContactsHtml, /Member contacts and documents/);
assert.match(memberContactsHtml, /KYC document retention/);
assert.match(memberContactsHtml, /Member KYC documents/);
assert.match(memberContactsHtml, /Member contacts and next of kin/);
assert.match(memberContactsHtml, /Member beneficiaries/);

const memberStatementHtml = sandbox.memberDetailPanel("statement");
assert.match(memberStatementHtml, /Member balance statement/);
assert.match(memberStatementHtml, /Statement control summary/);
assert.match(memberStatementHtml, /Receipt evidence summary/);
assert.match(memberStatementHtml, /Staff statement export controls/);
assert.match(memberStatementHtml, /Download CSV/);
assert.match(memberStatementHtml, /treasurer_cash/);
assert.match(memberStatementHtml, /mobile_money/);

sandbox.applyStaffSession({
  token: "staff-treasurer-token",
  user: { id: "user_green_treasurer", tenantId: "tenant_green", email: "treasurer@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO" },
  roleNames: ["Treasurer"],
  permissionIds: ["dashboard:view", "transactions:view", "reports:view"],
  expiresAt: ""
});
const treasurerMemberKycHtml = sandbox.memberDetailPanel("kyc");
assert.match(treasurerMemberKycHtml, /Profile view only/);
assert.match(treasurerMemberKycHtml, /View only/);
assert.doesNotMatch(treasurerMemberKycHtml, /Save member profile/);
assert.doesNotMatch(treasurerMemberKycHtml, /Approve member/);

sandbox.applyStaffSession({
  token: "staff-treasurer-token",
  user: { id: "user_green_treasurer", tenantId: "tenant_green", email: "treasurer@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX" },
  roleNames: ["Treasurer"],
  permissionIds: ["dashboard:view", "transactions:view", "transactions:create", "transactions:approve", "accounting:post", "reports:view"],
  expiresAt: ""
});
sandbox.state.data.transactions = [
  { id: "tx_cash_pending", tenantId: "tenant_green", memberId: "member_green_amina", reference: "CASH-001", type: "savings_deposit", channel: "cash", amount: 50000, status: "pending_approval", postedAt: "2026-08-08T08:00:00.000Z" },
  { id: "tx_mobile_posted", tenantId: "tenant_green", memberId: "member_green_amina", reference: "MM-001", type: "loan_repayment", channel: "mobile_money", amount: 30000, status: "posted", postedAt: "2026-08-08T09:00:00.000Z" },
  { id: "tx_bank_posted", tenantId: "tenant_green", memberId: "member_green_amina", reference: "BANK-001", type: "welfare_contribution", channel: "bank", amount: 20000, status: "posted", postedAt: "2026-08-08T10:00:00.000Z" }
];
sandbox.state.moduleTabs.transactions = "capture";
const transactionCaptureHtml = sandbox.transactionsView();
assert.match(transactionCaptureHtml, /Record a transaction/);
assert.match(transactionCaptureHtml, /id="transactionForm"/);
assert.match(transactionCaptureHtml, /Savings deposit/);
assert.match(transactionCaptureHtml, /Loan repayment/);
assert.match(transactionCaptureHtml, /Cash/);
assert.match(transactionCaptureHtml, /Mobile money/);
assert.match(transactionCaptureHtml, /Bank/);
assert.match(transactionCaptureHtml, /Use Loan repayment when the member pays a loan through Treasurer cash, bank or mobile money/);

sandbox.state.moduleTabs.transactions = "receipting";
const receiptingHtml = sandbox.transactionsView();
assert.match(receiptingHtml, /Receipting queue/);
assert.match(receiptingHtml, /Treasurer\/Admin queue for deposits, loan repayments, mobile-money callbacks and receipt follow-up/);
assert.match(receiptingHtml, /Treasurer cash/);
assert.match(receiptingHtml, /Mobile money/);
assert.match(receiptingHtml, /Approve\/post first/);
assert.match(receiptingHtml, /Load receipt/);

sandbox.state.moduleTabs.transactions = "receipts";
const receiptRegisterHtml = sandbox.transactionsView();
assert.match(receiptRegisterHtml, /Receipt register/);
assert.match(receiptRegisterHtml, /Receipts available/);
assert.match(receiptRegisterHtml, /RCT-MM-001/);
assert.match(receiptRegisterHtml, /RCT-BANK-001/);
assert.match(receiptRegisterHtml, /Loan repayments/);
assert.match(receiptRegisterHtml, /Savings deposits/);

sandbox.state.moduleTabs.transactions = "detail";
sandbox.state.selectedTransactionId = "tx_mobile_posted";
sandbox.state.selectedTransactionReceipt = {
  receiptNo: "RCT-MM-001",
  tenantName: "Green Valley SACCO",
  memberName: "Amina Naki",
  membershipNo: "GVS-0001",
  channel: "mobile_money",
  amount: 30000,
  issuedAt: "2026-08-08T09:05:00.000Z",
  printableText: "Receipt RCT-MM-001"
};
const transactionDetailHtml = sandbox.transactionsView();
assert.match(transactionDetailHtml, /Transaction detail and reversal/);
assert.match(transactionDetailHtml, /Load receipt/);
assert.match(transactionDetailHtml, /Reverse posted transaction/);
assert.match(transactionDetailHtml, /Receipt preview/);
assert.match(transactionDetailHtml, /Payment route/);

sandbox.state.moduleTabs.savings = "monthly";
const savingsMonthlyHtml = sandbox.savingsView();
assert.match(savingsMonthlyHtml, /Member monthly performance/);
assert.match(savingsMonthlyHtml, /Monthly performance/);
assert.match(savingsMonthlyHtml, /Compare member deposits by savings, shares, welfare, loan repayments, Treasurer cash and mobile money/);
assert.match(savingsMonthlyHtml, /Treasurer cash collections/);
assert.match(savingsMonthlyHtml, /Mobile money collections/);
assert.match(savingsMonthlyHtml, /Amina Naki/);
assert.match(savingsMonthlyHtml, /Treasurer Cash/);
assert.match(savingsMonthlyHtml, /Mobile Money/);

sandbox.state.data.mobileMoneyCallbacks = [
  { id: "cb_1", externalReference: "MM-001", provider: "mtn", purpose: "loan_repayment", amount: 30000, resourceType: "loan", status: "posted", receivedAt: "2026-08-08T09:00:00.000Z" },
  { id: "cb_2", externalReference: "MM-STALE", provider: "airtel", purpose: "savings_deposit", amount: 25000, resourceType: "payment_request", status: "failed", receivedAt: "2026-08-08T09:30:00.000Z" }
];
sandbox.state.data.mobileMoneyPaymentRequests = [
  { id: "request_open", externalReference: "REQ-001", provider: "mtn", purpose: "savings_deposit", amount: 25000, currencyCode: "UGX", payerPhone: "+256700000001", status: "pending", statusMessage: "Prompt sent", requestedAt: "2026-08-08T09:20:00.000Z" },
  { id: "request_failed", externalReference: "REQ-002", provider: "airtel", purpose: "loan_repayment", amount: 30000, currencyCode: "UGX", payerPhone: "+256700000002", status: "failed", statusMessage: "Provider timeout", requestedAt: "2026-08-08T09:10:00.000Z", completedAt: "2026-08-08T09:40:00.000Z" }
];
sandbox.state.data.reconciliation = {
  summary: { statementLines: 3, ledgerLines: 3, matched: 2, matchedAmount: 80000, unmatchedStatementLines: 1, unmatchedLedgerLines: 0, unmatchedStatementAmount: 25000, unmatchedLedgerAmount: 0 },
  matches: [{ statementLine: { externalReference: "MM-001", amount: 30000, accountCode: "1000", statementDate: "2026-08-08" }, ledgerLine: { reference: "MM-001", amount: 30000, accountCode: "1000", sourceType: "mobile_money", postedAt: "2026-08-08T09:00:00.000Z" } }],
  unmatchedStatementLines: [{ externalReference: "MM-STALE", accountCode: "1000", channel: "mobile_money", amount: 25000, description: "Unposted callback", statementDate: "2026-08-08" }],
  unmatchedLedgerLines: []
};
sandbox.state.moduleTabs.reconciliation = "requests";
sandbox.state.selectedPaymentRequestId = "request_open";
const reconciliationRequestsHtml = sandbox.reconciliationView();
assert.match(reconciliationRequestsHtml, /Payment request operations/);
assert.match(reconciliationRequestsHtml, /Track member-initiated mobile-money requests/);
assert.match(reconciliationRequestsHtml, /Check provider status/);
assert.match(reconciliationRequestsHtml, /Mark failed/);
assert.match(reconciliationRequestsHtml, /Mark expired/);
assert.match(reconciliationRequestsHtml, /Cancel request/);
assert.match(reconciliationRequestsHtml, /Mobile-money payment request review queue/);
assert.match(reconciliationRequestsHtml, /REQ-001/);
assert.match(reconciliationRequestsHtml, /REQ-002/);

sandbox.state.moduleTabs.reconciliation = "overview";
const reconciliationOverviewHtml = sandbox.reconciliationView();
assert.match(reconciliationOverviewHtml, /Reconciliation command center/);
assert.match(reconciliationOverviewHtml, /Mobile-money callback operations/);
assert.match(reconciliationOverviewHtml, /callback signing readiness/);
assert.match(reconciliationOverviewHtml, /Mobile-money callback action list/);

sandbox.applyStaffSession({
  token: "staff-admin-token",
  user: { id: "user_green_admin", tenantId: "tenant_green", email: "admin@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX" },
  roleNames: ["SACCO Administrator"],
  permissionIds: ["dashboard:view", "members:view", "loans:view", "loans:create", "loans:approve", "transactions:view", "transactions:create", "reports:view"],
  expiresAt: ""
});
sandbox.state.data.loans = [
  {
    id: "loan_pending",
    tenantId: "tenant_green",
    memberId: "member_green_amina",
    applicationNo: "LN-2026-001",
    product: "Development Loan",
    amount: 1200000,
    requestedAmount: 1200000,
    outstandingBalance: 1200000,
    monthlyInstallment: 115000,
    interestRate: 2,
    interestAmount: 180000,
    totalPayable: 1380000,
    repaymentMonths: 12,
    nextDueDate: "2026-09-08",
    arrearsAmount: 0,
    scheduleStatus: "waiting_disbursement",
    guarantors: 1,
    dsr: 35,
    stage: "guarantor_review",
    status: "pending_approval"
  },
  {
    id: "loan_active",
    tenantId: "tenant_green",
    memberId: "member_green_brian",
    applicationNo: "LN-2026-002",
    product: "Emergency Loan",
    amount: 600000,
    requestedAmount: 600000,
    outstandingBalance: 420000,
    monthlyInstallment: 70000,
    interestRate: 2,
    interestAmount: 60000,
    totalPayable: 660000,
    repaymentMonths: 10,
    nextDueDate: "2026-08-31",
    arrearsAmount: 70000,
    currentDueAmount: 20000,
    arrears1To30Amount: 30000,
    arrears31To60Amount: 25000,
    arrears61To90Amount: 10000,
    arrearsOver90Amount: 5000,
    oldestArrearsDays: 104,
    scheduleStatus: "arrears",
    guarantors: 1,
    repayments: 180000,
    dsr: 44,
    stage: "servicing_arrears",
    status: "active"
  }
];
sandbox.state.data.guarantorRequests = [
  { id: "gr_1", loanId: "loan_pending", memberId: "member_green_brian", product: "Development Loan", requestedAmount: 1200000, guaranteedAmount: 600000, capacity: "Sufficient", guarantorReadiness: "Accepted", status: "accepted", createdAt: "2026-08-08T08:00:00.000Z" },
  { id: "gr_2", loanId: "loan_active", memberId: "member_green_amina", product: "Emergency Loan", requestedAmount: 600000, guaranteedAmount: 300000, capacity: "Watch", guarantorReadiness: "Pending", status: "pending", createdAt: "2026-08-08T08:30:00.000Z" }
];
sandbox.state.selectedLoanId = "loan_active";
sandbox.state.selectedLoanGuarantors = [
  { id: "gr_loan_active", memberId: "member_green_amina", guaranteedAmount: 300000, capacity: "Sufficient", status: "accepted", createdAt: "2026-08-08T08:00:00.000Z" }
];
sandbox.state.selectedLoanRepayments = [
  { reference: "LR-CASH-001", amount: 80000, channel: "cash", narration: "Treasurer cash repayment", receivedAt: "2026-08-08T10:30:00.000Z" },
  { reference: "LR-MM-001", amount: 100000, channel: "mobile_money", narration: "MTN loan repayment", receivedAt: "2026-08-08T11:00:00.000Z" }
];
sandbox.state.selectedLoanSchedule = [
  { installmentNo: 1, dueDate: "2026-07-31", principalDue: 60000, interestDue: 10000, totalDue: 70000, paidAmount: 70000, balanceDue: 0, daysPastDue: 0, agingBucket: "paid", status: "paid" },
  { installmentNo: 2, dueDate: "2026-08-31", principalDue: 60000, interestDue: 10000, totalDue: 70000, paidAmount: 0, balanceDue: 70000, daysPastDue: 12, agingBucket: "1_30", status: "arrears" }
];
sandbox.state.moduleTabs.loans = "application";
const loanApplicationHtml = sandbox.loansView();
assert.match(loanApplicationHtml, /Loan application form/);
assert.match(loanApplicationHtml, /id="loanApplicationForm"/);
assert.match(loanApplicationHtml, /Create a SACCO loan application with member eligibility checks and approval routing/);
assert.match(loanApplicationHtml, /Development Loan/);
assert.match(loanApplicationHtml, /Emergency Loan/);
assert.match(loanApplicationHtml, /Submit loan application/);

sandbox.state.moduleTabs.loans = "list";
const loanListHtml = sandbox.loansView();
assert.match(loanListHtml, /Loan application list/);
assert.match(loanListHtml, /LN-2026-001/);
assert.match(loanListHtml, /Development Loan/);
assert.match(loanListHtml, /Awaiting approval/);
assert.match(loanListHtml, /Arrears/);
assert.match(loanListHtml, /Arrears aging/);
assert.match(loanListHtml, /90\+ days/);
assert.match(loanListHtml, /1-30 days/);
assert.match(loanListHtml, /Oldest arrears days/);
assert.match(loanListHtml, /Service/);

sandbox.state.moduleTabs.loans = "detail";
const loanDetailHtml = sandbox.loansView();
assert.match(loanDetailHtml, /Loan detail and guarantors/);
assert.match(loanDetailHtml, /Decision and servicing/);
assert.match(loanDetailHtml, /Guarantors/);
assert.match(loanDetailHtml, /Monthly installment/);
assert.match(loanDetailHtml, /Arrears/);
assert.match(loanDetailHtml, /Arrears amount/);
assert.match(loanDetailHtml, /Oldest arrears/);
assert.match(loanDetailHtml, /31-60 days/);
assert.match(loanDetailHtml, /Aging bucket/);
assert.match(loanDetailHtml, /Days past due/);
assert.match(loanDetailHtml, /Record loan repayment via Treasurer cash, bank or mobile money/);
assert.match(loanDetailHtml, /id="loanRepaymentChannel"/);
assert.match(loanDetailHtml, /Mobile money/);
assert.match(loanDetailHtml, /Bank/);
assert.match(loanDetailHtml, /Loan repayment history/);
assert.match(loanDetailHtml, /LR-MM-001/);
assert.match(loanDetailHtml, /Loan repayment schedule/);
assert.match(loanDetailHtml, /arrears/);
assert.match(loanDetailHtml, /Record repayment/);

const guarantorsHtml = sandbox.guarantorsView();
assert.match(guarantorsHtml, /Guarantor requests/);
assert.match(guarantorsHtml, /Pending decisions/);
assert.match(guarantorsHtml, /Accepted guarantees/);
assert.match(guarantorsHtml, /Member exposure/);
assert.match(guarantorsHtml, /Capacity/);
assert.match(guarantorsHtml, /Pending/);
assert.match(guarantorsHtml, /Development Loan/);

sandbox.applyStaffSession({
  token: "staff-chair-token",
  user: { id: "user_green_chair", tenantId: "tenant_green", email: "chair@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX" },
  roleNames: ["Chairperson"],
  permissionIds: ["dashboard:view", "governance:view", "governance:manage", "reports:view", "complaints:view", "complaints:manage", "notifications:view", "notifications:manage"],
  expiresAt: ""
});
sandbox.state.data.users = [
  { id: "user_green_chair", tenantId: "tenant_green", fullName: "Grace Chair", email: "chair@greenvalley.local" },
  { id: "user_green_secretary", tenantId: "tenant_green", fullName: "Sarah Secretary", email: "secretary@greenvalley.local" },
  { id: "user_platform_super", tenantId: "tenant_platform", fullName: "Platform Super Admin", email: "admin@platform.local" }
];
sandbox.state.data.governanceMeetings = [
  {
    id: "meeting_board_aug",
    title: "August board meeting",
    meetingType: "board",
    scheduledAt: "2026-08-30T09:00:00.000Z",
    chairUserId: "user_green_chair",
    status: "scheduled",
    minutes: "Agenda captured",
    openResolutions: 1,
    resolutions: [
      { id: "res_1", title: "Approve credit policy update", ownerUserId: "user_green_secretary", dueDate: "2026-08-20", status: "open", createdAt: "2026-08-08T08:00:00.000Z" }
    ]
  },
  {
    id: "meeting_agm",
    title: "Annual general meeting",
    meetingType: "agm",
    scheduledAt: "2026-07-30T09:00:00.000Z",
    chairUserId: "user_green_chair",
    status: "completed",
    minutes: "Members approved accounts.",
    openResolutions: 0,
    resolutions: [
      { id: "res_2", title: "Publish audited accounts", ownerUserId: "user_green_chair", dueDate: "2026-08-05", status: "closed", createdAt: "2026-07-30T12:00:00.000Z" }
    ]
  }
];
sandbox.state.moduleTabs.governance = "setup";
const governanceSetupHtml = sandbox.governanceView();
assert.match(governanceSetupHtml, /Governance meeting setup/);
assert.match(governanceSetupHtml, /id="governanceMeetingForm"/);
assert.match(governanceSetupHtml, /board/i);
assert.match(governanceSetupHtml, /Create governance meeting/);

sandbox.state.moduleTabs.governance = "register";
const governanceRegisterHtml = sandbox.governanceView();
assert.match(governanceRegisterHtml, /Governance meeting register/);
assert.match(governanceRegisterHtml, /August board meeting/);
assert.match(governanceRegisterHtml, /Annual general meeting/);
assert.match(governanceRegisterHtml, /Grace Chair/);

sandbox.state.moduleTabs.governance = "resolutions";
const governanceResolutionsHtml = sandbox.governanceView();
assert.match(governanceResolutionsHtml, /Resolution action list/);
assert.match(governanceResolutionsHtml, /Approve credit policy update/);
assert.match(governanceResolutionsHtml, /Sarah Secretary/);

sandbox.state.moduleTabs.governance = "detail";
sandbox.state.selectedMeetingId = "meeting_board_aug";
const governanceDetailHtml = sandbox.governanceView();
assert.match(governanceDetailHtml, /Governance meeting detail/);
assert.match(governanceDetailHtml, /id="governanceResolutionForm"/);
assert.match(governanceDetailHtml, /Record resolution/);
assert.match(governanceDetailHtml, /Meeting resolutions/);

sandbox.state.data.chatThreads = [
  { id: "thread_member_1", type: "MEMBER_SUPPORT", tenantId: "tenant_green", memberId: "member_green_amina", subject: "Savings balance query", status: "open", lastMessagePreview: "Please confirm my August savings.", lastMessageAt: "2026-08-08T10:00:00.000Z", unreadCount: 2 },
  { id: "thread_platform_1", type: "PLATFORM_SUPPORT", tenantId: "tenant_green", tenantName: "Green Valley SACCO", subject: "Mobile money callback delay", status: "in_progress", lastMessagePreview: "Airtel callback has not arrived.", lastMessageAt: "2026-08-08T11:00:00.000Z", unreadCount: 1 }
];
sandbox.state.chatMessages = {
  thread_member_1: [
    { senderType: "MEMBER", senderName: "Amina Naki", body: "Please confirm my August savings.", createdAt: "2026-08-08T10:00:00.000Z" },
    { senderType: "STAFF", senderName: "Grace Chair", body: "We have posted your mobile money deposit.", createdAt: "2026-08-08T10:05:00.000Z" }
  ],
  thread_platform_1: [
    { senderType: "STAFF", senderName: "Green Valley Admin", body: "Airtel callback has not arrived.", createdAt: "2026-08-08T11:00:00.000Z" },
    { senderType: "PLATFORM", senderName: "Platform Super Admin", body: "We are checking provider reconciliation.", createdAt: "2026-08-08T11:15:00.000Z" }
  ]
};
sandbox.state.moduleTabs.complaints = "member-chat";
sandbox.state.selectedComplaintId = "thread_member_1";
const saccoMemberChatHtml = sandbox.complaintsView();
assert.match(saccoMemberChatHtml, /SACCO admin - member chat/);
assert.match(saccoMemberChatHtml, /WhatsApp-style member support threads/);
assert.match(saccoMemberChatHtml, /Savings balance query/);
assert.match(saccoMemberChatHtml, /Please confirm my August savings/);
assert.match(saccoMemberChatHtml, /id="chatComposerForm"/);
assert.match(saccoMemberChatHtml, /Send message/);

sandbox.state.moduleTabs.complaints = "platform-chat";
sandbox.state.selectedComplaintId = "thread_platform_1";
const saccoPlatformChatHtml = sandbox.complaintsView();
assert.match(saccoPlatformChatHtml, /SACCO admin - Platform Super Admin chat/);
assert.match(saccoPlatformChatHtml, /Escalate platform, billing or system support messages/);
assert.match(saccoPlatformChatHtml, /Mobile money callback delay/);
assert.match(saccoPlatformChatHtml, /Platform Super Admin/);

sandbox.applyStaffSession({
  token: "staff-platform-super-token",
  user: { id: "user_platform_super", tenantId: "tenant_platform", email: "admin@platform.local" },
  tenant: { id: "tenant_platform", name: "Platform Administration" },
  roleNames: ["Platform Super Admin"],
  permissionIds: ["complaints:view", "complaints:manage", "notifications:view", "notifications:manage", "reports:view"],
  expiresAt: ""
});
sandbox.state.moduleTabs.complaints = "chat";
sandbox.state.selectedComplaintId = "thread_platform_1";
const platformComplaintChatHtml = sandbox.complaintsView();
assert.match(platformComplaintChatHtml, /SACCO admin - Platform Super Admin chat/);
assert.match(platformComplaintChatHtml, /WhatsApp-style support threads from SACCO administrators/);
assert.match(platformComplaintChatHtml, /Green Valley SACCO/);
assert.match(platformComplaintChatHtml, /We are checking provider reconciliation/);

sandbox.state.moduleTabs.complaints = "list";
const platformComplaintListHtml = sandbox.complaintsView();
assert.match(platformComplaintListHtml, /Complaints from SACCO admins/);
assert.match(platformComplaintListHtml, /Mobile money callback delay/);
assert.doesNotMatch(platformComplaintListHtml, /Savings balance query/);

sandbox.applyStaffSession({
  token: "staff-chair-token",
  user: { id: "user_green_chair", tenantId: "tenant_green", email: "chair@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX" },
  roleNames: ["Chairperson"],
  permissionIds: ["dashboard:view", "governance:view", "governance:manage", "reports:view", "complaints:view", "complaints:manage", "notifications:view", "notifications:manage"],
  expiresAt: ""
});
sandbox.state.data.notificationTemplates = [
  { id: "tpl_1", tenantId: "tenant_green", eventType: "loan_application_submitted", channel: "sms", title: "Loan received", body: "Your loan application has been received.", status: "active", updatedAt: "2026-08-08T09:00:00.000Z" },
  { id: "tpl_2", tenantId: "", eventType: "payment_request_closed", channel: "email", title: "Payment exception", body: "A payment request needs review.", status: "active", updatedAt: "2026-08-08T09:30:00.000Z" }
];
sandbox.state.selectedTemplateId = "tpl_1";
sandbox.state.moduleTabs.notifications = "templates";
const notificationTemplatesHtml = sandbox.notificationsView();
assert.match(notificationTemplatesHtml, /Notification template setup/);
assert.match(notificationTemplatesHtml, /id="notificationTemplateForm"/);
assert.match(notificationTemplatesHtml, /Notification template editor/);
assert.match(notificationTemplatesHtml, /Save template/);
assert.match(notificationTemplatesHtml, /loan_application_submitted/);
assert.match(notificationTemplatesHtml, /payment_request_closed/);

sandbox.state.data.auditEvents = [
  { id: "audit_1", tenantId: "tenant_green", actorUserId: "user_green_chair", actor: "Grace Chair", action: "loan approved", module: "loans", resourceType: "loan", resourceId: "loan_active", ipAddress: "127.0.0.1", result: "Recorded", createdAt: "2026-08-08T12:00:00.000Z" },
  { id: "audit_2", tenantId: "tenant_green", actorUserId: "user_green_admin", actor: "Grace Admin", action: "financial reversal created", module: "transactions", resourceType: "reversal", resourceId: "rev_1", ipAddress: "127.0.0.1", result: "Recorded", createdAt: "2026-08-08T12:30:00.000Z" },
  { id: "audit_3", tenantId: "tenant_green", actorUserId: "user_green_secretary", actor: "Sarah Secretary", action: "role permission updated", module: "users", resourceType: "permission", resourceId: "role_1", ipAddress: "127.0.0.1", result: "Recorded", createdAt: "2026-08-08T13:00:00.000Z" }
];
sandbox.state.moduleTabs.audit = "evidence";
const auditEvidenceHtml = sandbox.auditView();
assert.match(auditEvidenceHtml, /SACCO audit evidence/);
assert.match(auditEvidenceHtml, /Read-only evidence for SACCO approvals, finance actions, reversals, role changes and session activity/);
assert.match(auditEvidenceHtml, /Approvals/);
assert.match(auditEvidenceHtml, /Reversals/);
assert.match(auditEvidenceHtml, /Access control/);
assert.match(auditEvidenceHtml, /Financial activity/);

sandbox.state.moduleTabs.audit = "sensitive";
const auditSensitiveHtml = sandbox.auditView();
assert.match(auditSensitiveHtml, /Sensitive audit queue/);
assert.match(auditSensitiveHtml, /financial reversal created/);
assert.match(auditSensitiveHtml, /role permission updated/);

sandbox.applyStaffSession({
  token: "staff-admin-token",
  user: { id: "user_green_admin", tenantId: "tenant_green", email: "admin@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO", currencyCode: "UGX", allowedCollectionMode: "BOTH", mobileMoneyCollectionActive: true, bankCollectionActive: true },
  roleNames: ["SACCO Administrator"],
  permissionIds: ["dashboard:view", "members:view", "transactions:view", "transactions:create", "transactions:approve", "accounting:post", "roles:create", "settings:view", "reports:view"],
  expiresAt: ""
});
sandbox.state.data.tenants = [
  { id: "tenant_green", name: "Green Valley SACCO", abbreviation: "GVS", allowedCollectionMode: "BOTH", mobileMoneyCollectionActive: true, bankCollectionActive: true }
];
sandbox.state.data.financialProducts = [
  { id: "prod_sav", tenantId: "tenant_green", productType: "savings", code: "SAV-MONTHLY", name: "Monthly Savings", contributionAmount: 10000, minimumBalance: 0, interestRate: 0, status: "active" },
  { id: "prod_share", tenantId: "tenant_green", productType: "shares", code: "SHARE-STD", name: "Standard Shares", contributionAmount: 5000, minimumBalance: 0, interestRate: 0, status: "active" },
  { id: "prod_welfare", tenantId: "tenant_green", productType: "welfare", code: "WEL-MED", name: "Medical Welfare", contributionAmount: 3000, minimumBalance: 0, interestRate: 0, status: "active" }
];
sandbox.state.data.financialAccounts = [
  { id: "acct_sav_1", tenantId: "tenant_green", memberId: "member_green_amina", membershipNo: "GVS-0001", memberName: "Amina Naki", productId: "prod_sav", productName: "Monthly Savings", accountType: "savings", accountNo: "SAV-0001", status: "active", openedAt: "2026-08-01T09:00:00.000Z" },
  { id: "acct_share_1", tenantId: "tenant_green", memberId: "member_green_amina", membershipNo: "GVS-0001", memberName: "Amina Naki", productId: "prod_share", productName: "Standard Shares", accountType: "share", accountNo: "SHR-0001", status: "active", openedAt: "2026-08-01T09:05:00.000Z" },
  { id: "acct_welfare_1", tenantId: "tenant_green", memberId: "member_green_amina", membershipNo: "GVS-0001", memberName: "Amina Naki", productId: "prod_welfare", productName: "Medical Welfare", accountType: "welfare", accountNo: "WEL-0001", status: "active", openedAt: "2026-08-01T09:10:00.000Z" }
];
sandbox.state.data.welfareClaims = [
  { id: "claim_1", tenantId: "tenant_green", memberId: "member_green_amina", membershipNo: "GVS-0001", memberName: "Amina Naki", claimType: "medical", amount: 50000, channel: "mobile_money", reference: "WEL-001", status: "submitted", submittedAt: "2026-08-08T09:00:00.000Z" },
  { id: "claim_2", tenantId: "tenant_green", memberId: "member_green_brian", membershipNo: "GVS-0002", memberName: "Brian Kato", claimType: "funeral", amount: 75000, channel: "bank", reference: "WEL-002", status: "approved", submittedAt: "2026-08-08T10:00:00.000Z" }
];
sandbox.state.data.chartOfAccounts = [
  { code: "1000", name: "Cash at bank", type: "asset", normalBalance: "debit" },
  { code: "1200", name: "Office equipment", type: "asset", normalBalance: "debit" },
  { code: "5000", name: "Office expenses", type: "expense", normalBalance: "debit" }
];
sandbox.state.data.accountingPeriods = [
  { id: "period_2026", name: "FY 2026", startDate: "2026-01-01", endDate: "2026-12-31", status: "open" }
];
sandbox.state.data.journalEntries = [
  { id: "journal_1", reference: "JNL-001", description: "Mobile money loan repayment", amount: 30000, debitTotal: 30000, creditTotal: 30000, isBalanced: true, status: "posted", postedAt: "2026-08-08T09:00:00.000Z" }
];
sandbox.state.data.expenses = [
  { id: "expense_1", supplierId: "supplier_1", accountCode: "5000", amount: 25000, channel: "cash", reference: "EXP-001", status: "posted" }
];
sandbox.state.data.assets = [
  { id: "asset_1", name: "Office laptop", category: "technology", cost: 1500000, netBookValue: 1400000, location: "Main branch", status: "active" }
];

sandbox.state.moduleTabs.shares = "products";
const sharesProductHtml = sandbox.sharesView();
assert.match(sharesProductHtml, /Shares product setup/);
assert.match(sharesProductHtml, /data-product-form="shares"/);
assert.match(sharesProductHtml, /Create Shares product/);

sandbox.state.moduleTabs.shares = "accounts";
const sharesAccountHtml = sandbox.sharesView();
assert.match(sharesAccountHtml, /Open Shares account/);
assert.match(sharesAccountHtml, /Duplicate member-product accounts are rejected by the backend/);
assert.match(sharesAccountHtml, /SHARE-STD - Standard Shares/);

sandbox.state.moduleTabs.shares = "register";
const sharesRegisterHtml = sandbox.sharesView();
assert.match(sharesRegisterHtml, /Share register/);
assert.match(sharesRegisterHtml, /Standard Shares/);
assert.match(sharesRegisterHtml, /SHR-0001/);

sandbox.state.moduleTabs.welfare = "claims";
const welfareClaimsHtml = sandbox.welfareView();
assert.match(welfareClaimsHtml, /Welfare claim submission/);
assert.match(welfareClaimsHtml, /id="welfareClaimForm"/);
assert.match(welfareClaimsHtml, /Submit welfare claim/);
assert.match(welfareClaimsHtml, /Welfare claims/);
assert.match(welfareClaimsHtml, /WEL-001/);

sandbox.state.moduleTabs.welfare = "detail";
sandbox.state.selectedWelfareClaimId = "claim_2";
const welfareDetailHtml = sandbox.welfareView();
assert.match(welfareDetailHtml, /Welfare claim decision/);
assert.match(welfareDetailHtml, /Member welfare balance/);
assert.match(welfareDetailHtml, /Ready to pay/);
assert.match(welfareDetailHtml, /id="welfareClaimDecisionForm"/);
assert.match(welfareDetailHtml, /Pay claim/);
assert.match(welfareDetailHtml, /mobile_money/);
assert.match(welfareDetailHtml, /Bank/);

sandbox.state.moduleTabs.accounting = "capture";
const accountingCaptureHtml = sandbox.accountingView();
assert.match(accountingCaptureHtml, /Expense capture/);
assert.match(accountingCaptureHtml, /id="expenseForm"/);
assert.match(accountingCaptureHtml, /Post expense/);
assert.match(accountingCaptureHtml, /Fixed asset register/);
assert.match(accountingCaptureHtml, /id="assetForm"/);
assert.match(accountingCaptureHtml, /Register asset/);
assert.match(accountingCaptureHtml, /Office expenses/);
assert.match(accountingCaptureHtml, /Office equipment/);

sandbox.state.moduleTabs.accounting = "journals";
const accountingJournalsHtml = sandbox.accountingView();
assert.match(accountingJournalsHtml, /Recent journal entries/);
assert.match(accountingJournalsHtml, /JNL-001/);
assert.match(accountingJournalsHtml, /Mobile money loan repayment/);

sandbox.state.moduleTabs.accounting = "registers";
const accountingRegistersHtml = sandbox.accountingView();
assert.match(accountingRegistersHtml, /Expenses/);
assert.match(accountingRegistersHtml, /EXP-001/);
assert.match(accountingRegistersHtml, /Assets/);
assert.match(accountingRegistersHtml, /Office laptop/);

sandbox.state.moduleTabs.accounting = "setup";
const accountingSetupHtml = sandbox.accountingView();
assert.match(accountingSetupHtml, /Chart of accounts/);
assert.match(accountingSetupHtml, /Accounting periods/);
assert.match(accountingSetupHtml, /FY 2026/);

sandbox.state.data.branches = [
  { id: "branch_hq", tenantId: "tenant_green", code: "HQ", name: "Main branch", managerUserId: "user_green_admin", address: "Kampala", status: "active", createdAt: "2026-08-01T09:00:00.000Z" }
];
sandbox.state.saccoSettingsTab = "overview";
const settingsOverviewHtml = sandbox.settingsView();
assert.match(settingsOverviewHtml, /SACCO operating settings/);
assert.match(settingsOverviewHtml, /Allowed by platform/);
assert.match(settingsOverviewHtml, /Save collection settings/);
assert.match(settingsOverviewHtml, /Product coverage/);
assert.match(settingsOverviewHtml, /Core contribution types ready/);
assert.match(settingsOverviewHtml, /Ready/);

sandbox.state.saccoSettingsTab = "branches";
const branchSettingsHtml = sandbox.settingsView();
assert.match(branchSettingsHtml, /Branch setup/);
assert.match(branchSettingsHtml, /id="branchSetupForm"/);
assert.match(branchSettingsHtml, /Create branch/);

sandbox.state.saccoSettingsTab = "products";
const productSettingsHtml = sandbox.settingsView();
assert.match(productSettingsHtml, /Contribution product setup/);
assert.match(productSettingsHtml, /Savings/);
assert.match(productSettingsHtml, /Shares/);
assert.match(productSettingsHtml, /Welfare/);
assert.match(productSettingsHtml, /Create product/);

sandbox.state.saccoSettingsTab = "records";
const settingsRecordsHtml = sandbox.settingsView();
assert.match(settingsRecordsHtml, /Branch setup/);
assert.match(settingsRecordsHtml, /Main branch/);
assert.match(settingsRecordsHtml, /Financial product setup/);
assert.match(settingsRecordsHtml, /SAV-MONTHLY/);

sandbox.applyStaffSession({
  token: "staff-secretary-token",
  user: { id: "user_green_secretary", tenantId: "tenant_green", email: "secretary@greenvalley.local" },
  tenant: { id: "tenant_green", name: "Green Valley SACCO" },
  roleNames: ["Secretary"],
  permissionIds: ["dashboard:view", "members:view", "reports:view"],
  expiresAt: ""
});
const readonlyTransactionFormHtml = sandbox.transactionFormPanel();
assert.match(readonlyTransactionFormHtml, /View only/);
assert.match(readonlyTransactionFormHtml, /id="newTransactionType" disabled/);
const readonlyPaymentRequestsHtml = sandbox.paymentRequestOperationsPanel(sandbox.state.data.mobileMoneyPaymentRequests);
assert.match(readonlyPaymentRequestsHtml, /Only users with posting rights can change payment request status/);
assert.match(readonlyPaymentRequestsHtml, /data-payment-request-status="failed" disabled/);
const readonlyLoanApplicationHtml = sandbox.loanApplicationPanel();
assert.match(readonlyLoanApplicationHtml, /View only/);
assert.match(readonlyLoanApplicationHtml, /id="newLoanMemberId" disabled/);
const readonlyLoanDetailHtml = sandbox.loanDetailPanel(sandbox.loanRows());
assert.match(readonlyLoanDetailHtml, /View only/);
assert.match(readonlyLoanDetailHtml, /id="loanRepaymentAmount"[^>]*disabled/);
assert.doesNotMatch(readonlyLoanDetailHtml, /Approve loan<\/button>/);

sandbox.state.auth = "member";
sandbox.state.user = null;
sandbox.state.roleNames = [];
sandbox.state.permissionIds = [];
const memberModules = sandbox.visibleModules().map(([id]) => id);
assert.equal(JSON.stringify(memberModules), JSON.stringify(["home", "money", "loans", "payments", "complaints", "profile"]));
assert.equal(sandbox.canAccessView("users"), false);

sandbox.state.memberData.dashboard = { tenant: { mobileMoneyCollectionAvailable: false, bankCollectionAvailable: false } };
const noPaymentHtml = sandbox.memberPaymentFormPanel([]);
assert.match(noPaymentHtml, /Payments not available/);
assert.doesNotMatch(noPaymentHtml, /id="memberPaymentForm"/);

sandbox.state.memberData.dashboard = { tenant: { mobileMoneyCollectionAvailable: false, bankCollectionAvailable: true } };
const bankOnlyHtml = sandbox.memberPaymentFormPanel([{ id: "loan_1", product: "Development Loan", outstandingBalance: 120000 }]);
assert.match(bankOnlyHtml, /Bank collection/);
assert.match(bankOnlyHtml, /value="bank_collection"/);
assert.match(bankOnlyHtml, /Development Loan/);
assert.doesNotMatch(bankOnlyHtml, /network-picker/);

sandbox.state.memberData.dashboard = {
  tenant: { mobileMoneyCollectionAvailable: true, bankCollectionAvailable: true },
  paymentProviders: [
    { network: "mtn", label: "MTN MoMo", providerId: "mtn", available: true },
    { network: "airtel", label: "Airtel Money", providerId: "airtel", available: true },
    { network: "mpesa", label: "M-PESA", providerId: "mpesa", available: true },
    { network: "offline", label: "Offline", providerId: "offline", available: false }
  ]
};
const mobileMoneyHtml = sandbox.memberPaymentFormPanel([]);
assert.match(mobileMoneyHtml, /Pay by mobile money/);
assert.match(mobileMoneyHtml, /Bank collection also enabled/);
assert.match(mobileMoneyHtml, /MTN/);
assert.match(mobileMoneyHtml, /Airtel/);
assert.doesNotMatch(mobileMoneyHtml, /M-PESA/);
assert.doesNotMatch(mobileMoneyHtml, /Offline/);

sandbox.state.auth = "staff";
sandbox.state.user = { id: "user_platform_super", tenantId: "tenant_platform", email: "admin@platform.local" };
sandbox.state.roleNames = ["Platform Super Admin"];
sandbox.state.permissionIds = ["notifications:view", "notifications:manage"];
sandbox.state.moduleTabs.notifications = "payment-exceptions";
sandbox.state.data.tenants = [{ id: "tenant_green", name: "Green Valley SACCO", abbreviation: "GVS" }];
sandbox.state.data.users = [{ id: "user_green_admin", fullName: "Grace Admin", email: "admin@greenvalley.local" }];
sandbox.state.data.members = [{ id: "member_green_amina", membershipNo: "GVS-0001", fullName: "Amina Naki" }];
sandbox.state.data.notifications = [
  {
    id: "delivery_1",
    notificationId: "notification_1",
    tenantId: "tenant_green",
    userId: "user_green_admin",
    eventType: "payment_request_closed",
    channel: "in_app",
    provider: "Tereka",
    recipient: "admin@greenvalley.local",
    status: "sent",
    notificationStatus: "unread",
    message: "Provider prompt expired before member approval.",
    resourceType: "payment_request",
    resourceId: "MMREQ-001",
    createdAt: "2026-08-08T08:30:00.000Z"
  },
  {
    id: "delivery_2",
    notificationId: "notification_2",
    tenantId: "tenant_green",
    memberId: "member_green_amina",
    eventType: "payment_posted",
    channel: "sms",
    provider: "AfroSMS",
    recipient: "+256700000001",
    status: "sent",
    notificationStatus: "read",
    readAt: "2026-08-08T09:00:00.000Z",
    message: "Deposit posted.",
    createdAt: "2026-08-08T09:00:00.000Z"
  }
];
sandbox.state.providerOperationalEvidence = {
  evidenceStatus: "ready",
  notificationProvidersReady: 2,
  notificationProvidersUnavailable: 0,
  mobileMoney: { paymentRequests: 1, pendingPaymentRequests: 0, failedPaymentRequests: 1, callbacksReceived: 1 }
};
const notificationHtml = sandbox.notificationsView();
assert.match(notificationHtml, /Payment exceptions/);
assert.match(notificationHtml, /Payment exception alerts/);
assert.match(notificationHtml, /1 unread/);
assert.match(notificationHtml, /Provider prompt expired before member approval/);
assert.match(notificationHtml, /Payment request MMREQ-001/);
assert.doesNotMatch(notificationHtml, /Deposit posted/);
assert.ok(sandbox.notificationEventOptions().includes("payment_request_closed"));

console.log("Frontend helper tests passed (tables, login fields, role routing, session labels, platform user management, SACCO registration, SACCO member management, SACCO finance/payment workflows, SACCO loan workflows, shares, welfare, accounting, settings, governance, chat, notifications, audit evidence, member payment routes, payment exception alerts).");
