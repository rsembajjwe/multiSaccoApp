// Startup, login, session restore, refresh and security actions for Tereka Online.
// Loaded before app.js; functions intentionally remain global for classic script compatibility.

async function init() {
  applyRegionalDocumentSettings();
  bindNetworkStatusEvents();
  startChatPolling();
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
    ["pendingLoanRepayments", "/loans/repayments/pending"],
    ["operations", "/operations/status"],
    ["notifications", "/notifications/deliveries"],
    ["complaints", "/complaints"],
    ["chatThreads", "/chat/threads"],
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
  if (!isPlatform()) endpoints.push(["saccoPaymentAccounts", "/sacco-payment-accounts"]);
  if (isPlatform() && hasPermission("roles:create")) endpoints.push(["notificationIntegrationConfig", "/platform-integrations/notification-config"]);
  if (isPlatform() && hasPermission("roles:create")) endpoints.push(["mobileMoneyIntegrationConfig", "/platform-integrations/mobile-money-config"]);
  if (canAccessView("notifications")) endpoints.push(["notificationProviderStatus", "/notifications/provider-status"]);
  if (canAccessView("notifications")) endpoints.push(["providerOperationalEvidence", "/notifications/provider-evidence"]);
  if (canAccessView("notifications")) endpoints.push(["providerJobRuns", "/notifications/provider-job-runs"]);
  const objectKeys = new Set(["operations", "regulatoryReport", "reconciliation", "securitySummary", "platformSecurityPolicy", "notificationIntegrationConfig", "mobileMoneyIntegrationConfig", "providerOperationalEvidence"]);
  const results = await Promise.all(endpoints.map(async ([key, path]) => {
    const resolvedPath = pagedEndpointPath(key, path);
    return [key, await optionalApi(resolvedPath, objectKeys.has(key) ? null : [])];
  }));
  results.forEach(([key, value]) => {
    if (key === "notificationProviderStatus") {
      state.notificationProviderStatus = Array.isArray(value) ? value : [];
      state.notificationProviderStatusCheckedAt = new Date().toISOString();
    } else if (key === "providerOperationalEvidence") {
      state.providerOperationalEvidence = value || null;
    } else {
      state.pageMeta[key] = pageEnvelope(value);
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
  state.memberData.chatThreads = await optionalApi("/member-auth/chat/threads", []);
  state.memberData.privacyRequests = await optionalApi("/member-auth/privacy-requests", []);
  state.memberData.collectionAccounts = await optionalApi("/member-auth/collection-accounts", []);
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
    chatFilters: {},
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
    memberPrivacyMessage: "",
    memberPrivacyError: "",
    memberPrivacyRequestMessage: "",
    memberPrivacyRequestError: "",
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
    pageMeta: {},
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

