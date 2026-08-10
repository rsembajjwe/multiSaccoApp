// Complaint, notification, quick-search, table paging and event-binding handlers for Tereka Online.
// Loaded after feature/action modules and before app.js bootstraps the application.

async function createComplaintFromForm(event) {
  event.preventDefault();
  state.complaintFormMessage = "";
  state.complaintFormError = "";
  const threadType = event.currentTarget.dataset.threadType || "MEMBER_SUPPORT";
  const subject = value("newComplaintSubject").trim();
  const message = value("newComplaintDescription").trim();
  const memberId = value("newComplaintMemberId");
  if (!subject || !message) {
    state.complaintFormError = "Enter a subject and a message to start a chat.";
    renderShell();
    return;
  }
  if (threadType === "MEMBER_SUPPORT" && !memberId) {
    state.complaintFormError = "Select a member to start a member chat.";
    renderShell();
    return;
  }
  try {
    const payload = {
      type: threadType,
      subject,
      message,
      tenantId: value("newComplaintTenantId") || state.user?.tenantId
    };
    if (threadType === "MEMBER_SUPPORT") payload.memberId = memberId;
    const thread = await api("/chat/threads", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.selectedComplaintId = thread.id;
    state.chatMessages[thread.id] = undefined;
    await refreshAll();
    state.selectedComplaintId = thread.id;
    state.complaintFormMessage = `Started chat: ${thread.subject || thread.id}.`;
    renderShell();
  } catch (error) {
    state.complaintFormError = error.message;
    renderShell();
  }
}

function openComplaintDetail(complaintId) {
  state.selectedComplaintId = complaintId;
  const complaint = dataRows("complaints").find((row) => row.id === complaintId);
  state.moduleTabs.complaints = isPlatform()
    ? "chat"
    : complaint && !complaint.memberId
      ? "platform-chat"
      : "member-chat";
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
        resolutionNotes: value("selectedComplaintNotes") || "Updated in Tereka Online",
        resolution: value("selectedComplaintNotes") || "Updated in Tereka Online"
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
    const [rows, evidence] = await Promise.all([
      api("/notifications/provider-status"),
      api("/notifications/provider-evidence")
    ]);
    state.notificationProviderStatus = Array.isArray(rows) ? rows : [];
    state.providerOperationalEvidence = evidence || null;
    state.notificationProviderStatusCheckedAt = new Date().toISOString();
    state.notificationMessage = "Notification provider status checked.";
    renderShell();
  } catch (error) {
    state.notificationError = error.message;
    renderShell();
  }
}

async function runMobileMoneyReconciliation() {
  state.notificationMessage = "";
  state.notificationError = "";
  try {
    const summary = await api("/notifications/provider-job-runs/mobile-money-reconciliation", { method: "POST" });
    const message = `Reconciliation checked ${summary.scanned || 0} payment request(s), updated ${summary.updated || 0}, failed ${summary.failed || 0}.`;
    state.notificationMessage = message;
    await refreshAll();
    state.currentView = "notifications";
    state.moduleTabs.notifications = "job-history";
    state.notificationMessage = message;
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

async function loadServerTablePage(tableKey, pageNumber) {
  const config = highVolumeTableConfig(tableKey);
  if (!config || !state.networkOnline) {
    if (!state.networkOnline) state.lastError = t("offlineActionBlocked");
    renderShell();
    return;
  }
  const tableState = state.tableState[tableKey] || {};
  const page = Math.max(0, Number(pageNumber || 0));
  state.loading = true;
  state.lastError = "";
  renderShell();
  try {
    const value = await api(serverTablePagePath(config, page, tableState.search, tableState.sort, tableState.direction));
    state.data[config.key] = value;
    state.pageMeta[config.key] = pageEnvelope(value);
    state.tableState[tableKey] = { ...tableState, page: 1 };
    state.lastSync = new Date().toISOString();
  } catch (error) {
    state.lastError = error.message;
  } finally {
    state.loading = false;
    renderShell();
  }
}

function scheduleServerTableSearch(tableKey) {
  window.clearTimeout(serverTableSearchTimers[tableKey]);
  serverTableSearchTimers[tableKey] = window.setTimeout(() => loadServerTablePage(tableKey, 0), 350);
}

function bindEvents() {
  document.querySelector("#loginLocale")?.addEventListener("change", (event) => {
    state.locale = supportedLocales.some((locale) => locale.code === event.target.value) ? event.target.value : DEFAULT_REGION.locale;
    localStorage.setItem(LOCALE_KEY, state.locale);
    applyRegionalDocumentSettings();
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
  document.querySelectorAll("[data-chat-complaint-id]").forEach((button) => {
    button.addEventListener("click", () => selectChatThread(button.dataset.chatComplaintId));
  });
  document.querySelectorAll("[data-chat-search]").forEach((input) => {
    input.addEventListener("input", () => {
      state.chatFilters[input.dataset.chatSearch] = input.value;
      renderShell();
    });
  });
  document.querySelector("#chatComposerForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendChatMessage(event.currentTarget.dataset.threadId);
  });
  document.querySelector("#memberNewChatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    startMemberChatThread();
  });
  maybeAutoLoadChatMessages();
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
  document.querySelectorAll("[data-save-collection-mode]").forEach((button) => {
    button.addEventListener("click", () => saveCollectionMode(button.dataset.saveCollectionMode));
  });
  document.querySelectorAll("[data-save-collection-settings]").forEach((button) => {
    button.addEventListener("click", () => saveCollectionSettings(button.dataset.saveCollectionSettings));
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
  document.querySelector("#memberPrivacyConsentForm")?.addEventListener("submit", saveMemberPrivacyConsents);
  document.querySelector("#memberPrivacyRequestForm")?.addEventListener("submit", submitMemberPrivacyRequest);
  document.querySelector("#welfareClaimForm")?.addEventListener("submit", submitWelfareClaim);
  document.querySelector("#expenseForm")?.addEventListener("submit", postExpense);
  document.querySelector("#assetForm")?.addEventListener("submit", registerAsset);
  document.querySelector("#governanceMeetingForm")?.addEventListener("submit", createGovernanceMeeting);
  document.querySelector("#governanceResolutionForm")?.addEventListener("submit", createGovernanceResolution);
  document.querySelector("#memberStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    runMemberDecision("custom");
  });
  document.querySelector("#memberProfileForm")?.addEventListener("submit", saveMemberProfile);
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
  document.querySelectorAll("[data-approve-transaction]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalTransaction(button.dataset.approveTransaction, "approve"));
  });
  document.querySelectorAll("[data-reject-transaction]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalTransaction(button.dataset.rejectTransaction, "reject"));
  });
  document.querySelectorAll("[data-approve-repayment]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalRepayment(button.dataset.approveRepayment, button.dataset.repaymentLoan, "approve"));
  });
  document.querySelectorAll("[data-reject-repayment]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalRepayment(button.dataset.rejectRepayment, button.dataset.repaymentLoan, "reject"));
  });
  document.querySelectorAll("[data-approve-loan]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalLoan(button.dataset.approveLoan, "approve"));
  });
  document.querySelectorAll("[data-reject-loan]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalLoan(button.dataset.rejectLoan, "reject"));
  });
  document.querySelectorAll("[data-approve-member]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalMember(button.dataset.approveMember, "approve"));
  });
  document.querySelectorAll("[data-reject-member]").forEach((button) => {
    button.addEventListener("click", () => decideApprovalMember(button.dataset.rejectMember, "reject"));
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
  document.querySelectorAll("[data-document-retention-action]").forEach((button) => {
    button.addEventListener("click", () => updateMemberDocumentRetention(button.dataset.rowId, button.dataset.documentRetentionAction));
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
  document.querySelectorAll("[data-action='run-mobile-money-reconciliation']").forEach((button) => {
    button.addEventListener("click", runMobileMoneyReconciliation);
  });
  document.querySelectorAll("[data-notification-filter]").forEach((input) => input.addEventListener("input", updateNotificationFilter));
  document.querySelectorAll("select[data-notification-filter]").forEach((select) => select.addEventListener("change", updateNotificationFilter));
  document.querySelectorAll("[data-table-search]").forEach((input) => input.addEventListener("input", (event) => {
    const tableKey = event.target.dataset.tableSearch;
    state.tableState[tableKey] = { ...(state.tableState[tableKey] || {}), search: event.target.value, page: 1, pageSize: state.tableState[tableKey]?.pageSize || 10 };
    if (highVolumeTableConfig(tableKey)) {
      scheduleServerTableSearch(tableKey);
      return;
    }
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
  document.querySelectorAll("[data-server-table-page]").forEach((button) => button.addEventListener("click", () => {
    loadServerTablePage(button.dataset.serverTablePage, button.dataset.page);
  }));
  document.querySelectorAll("[data-server-table-sort]").forEach((button) => button.addEventListener("click", () => {
    const tableKey = button.dataset.serverTableSort;
    state.tableState[tableKey] = {
      ...(state.tableState[tableKey] || {}),
      sort: button.dataset.sort,
      direction: button.dataset.direction,
      page: 1
    };
    loadServerTablePage(tableKey, 0);
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

