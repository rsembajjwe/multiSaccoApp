// Platform administration action handlers for Tereka Online.
// Covers platform users, SACCO registration, package setup, subscriptions and platform policy actions.

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
        deliveryChannel: value("newUserDeliveryChannel")
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
    state.userFormMessage = state.userFormError ? `Created ${created.fullName || created.email}.` : `Created ${created.fullName || created.email}, sent the temporary password, and assigned the role.`;
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

async function openBillingBreakdown(tenantId) {
  state.selectedBillingTenantId = tenantId || "";
  state.billingSummary = null;
  state.billingItems = [];
  state.billingMessage = "";
  state.billingBreakdownError = "";
  if (!tenantId) { renderShell(); return; }
  state.billingBreakdownLoading = true;
  renderShell();
  try {
    state.billingSummary = await api(`/platform-billing/summary?tenantId=${encodeURIComponent(tenantId)}`);
    state.billingItems = await api(`/platform-billing/items?tenantId=${encodeURIComponent(tenantId)}`) || [];
  } catch (error) {
    state.billingBreakdownError = error.message;
  } finally {
    state.billingBreakdownLoading = false;
    renderShell();
  }
}

async function assignBillingItem() {
  const tenantId = state.selectedBillingTenantId;
  const catalogCode = document.getElementById("billingAddonSelect")?.value || "";
  const quantity = Math.max(1, Number(document.getElementById("billingAddonQty")?.value || 1));
  state.billingMessage = "";
  state.billingBreakdownError = "";
  if (!tenantId || !catalogCode) { renderShell(); return; }
  try {
    await api("/platform-billing/items", { method: "POST", body: JSON.stringify({ tenantId, catalogCode, quantity }) });
    await openBillingBreakdown(tenantId);
    state.billingMessage = "Add-on added.";
    renderShell();
  } catch (error) {
    state.billingBreakdownError = error.message;
    renderShell();
  }
}

async function cancelBillingItem(itemId) {
  const tenantId = state.selectedBillingTenantId;
  if (!tenantId || !itemId) return;
  state.billingMessage = "";
  state.billingBreakdownError = "";
  try {
    await api(`/platform-billing/items/${encodeURIComponent(itemId)}?tenantId=${encodeURIComponent(tenantId)}`, { method: "DELETE" });
    await openBillingBreakdown(tenantId);
    state.billingMessage = "Add-on removed.";
    renderShell();
  } catch (error) {
    state.billingBreakdownError = error.message;
    renderShell();
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
  state.selectedTenantPaymentAccounts = [];
  state.selectedTenantOfficials = [];
  state.selectedTenantMembers = [];
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  state.saccoDeleteMessage = "";
  state.saccoDeleteError = "";
  renderShell();
  try {
    const [tenant, profile, paymentAccounts, officials, members] = await Promise.all([
      api(`/tenants/${encodeURIComponent(tenantId)}`),
      optionalApi(`/tenants/${encodeURIComponent(tenantId)}/profile`, null),
      optionalApi(`/sacco-payment-accounts?tenantId=${encodeURIComponent(tenantId)}`, []),
      optionalApi(`/tenants/${encodeURIComponent(tenantId)}/officials`, []),
      optionalApi(`/members?tenantId=${encodeURIComponent(tenantId)}`, [])
    ]);
    state.selectedTenant = tenant;
    state.selectedTenantProfile = profile || {};
    state.selectedTenantPaymentAccounts = Array.isArray(paymentAccounts) ? paymentAccounts : [];
    state.selectedTenantOfficials = Array.isArray(officials) ? officials : [];
    state.selectedTenantMembers = Array.isArray(members) ? members : [];
  } catch (error) {
    state.selectedTenantError = error.message;
  }
  renderShell();
}

async function applyFleetBulkUpdate(event) {
  if (event) event.preventDefault();
  const tenantIds = [...(state.fleetSelectedIds || [])];
  const managerSelect = document.getElementById("fleetBulkManager");
  const managerValue = managerSelect?.value || "";
  const status = value("fleetBulkStatus");
  const reason = value("fleetBulkReason").trim();
  if (!tenantIds.length) return;
  if (!managerValue && !status) {
    state.fleetBulkError = "Choose a portfolio assignment or lifecycle action.";
    renderShell();
    return;
  }
  if (!reason) {
    state.fleetBulkError = "Enter a business justification for the approving operator.";
    renderShell();
    return;
  }
  const managerOption = managerSelect?.selectedOptions?.[0];
  const accountManagerUserId = managerValue === "__unassigned__" ? "" : managerValue;
  const accountManagerName = managerValue === "__unassigned__" ? "" : (managerOption?.dataset.managerName || "");
  const actionLabel = status ? labelize(status) : managerValue === "__unassigned__" ? "remove portfolio owner" : `assign ${accountManagerName}`;
  if (!window.confirm(`Request approval to ${actionLabel} for ${tenantIds.length} selected SACCO${tenantIds.length === 1 ? "" : "s"}? A different operator must approve it.`)) return;
  state.fleetBulkMessage = "";
  state.fleetBulkError = "";
  try {
    const payload = { tenantIds, reason };
    if (status) payload.status = status;
    if (managerValue) {
      payload.accountManagerUserId = accountManagerUserId;
      payload.accountManagerName = accountManagerName;
    }
    const job = await api("/tenants/fleet/jobs", { method: "POST", body: JSON.stringify(payload) });
    state.fleetSelectedIds = [];
    state.fleetBulkMessage = `Approval requested for ${tenantIds.length} SACCO${tenantIds.length === 1 ? "" : "s"}. Job ${job.id}.`;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    state.data.fleetBulkJobs = await optionalApi("/tenants/fleet/jobs", []);
    state.data.fleetSummary = await optionalApi("/tenants/fleet/summary", state.data.fleetSummary || {});
    await loadServerTablePage(tableStateKey("SACCO fleet directory"), Number(state.pageMeta.fleetTenants?.number ?? state.pageMeta.fleetTenants?.page ?? 0));
  } catch (error) {
    state.fleetBulkError = friendlyUserError(error, true);
    renderShell();
  }
}

async function decideFleetBulkJob(jobId, decision) {
  if (!jobId || !["approve", "reject", "correction"].includes(decision)) return;
  const apiDecision = decision === "correction" ? "reject" : decision;
  const verb = decision === "approve" ? "approval" : decision === "correction" ? "return for correction" : "rejection";
  const reason = window.prompt(`Enter the reason for this ${verb}. It will be retained in the audit record.`, "")?.trim() || "";
  if (!reason) return;
  state.fleetBulkMessage = "";
  state.fleetBulkError = "";
  try {
    await api(`/tenants/fleet/jobs/${encodeURIComponent(jobId)}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: apiDecision, reason: decision === "correction" ? `Returned for correction: ${reason}` : reason })
    });
    state.fleetBulkMessage = decision === "approve" ? "Bulk update approved and queued for processing." : decision === "correction" ? "Request returned for correction and the requester was notified." : "Bulk update rejected.";
    state.selectedFleetApprovalId = "";
    const [jobs, queue, summaryData] = await Promise.all([
      optionalApi("/tenants/fleet/jobs", []),
      optionalApi(`/tenants/fleet/jobs/approval-queue?page=${Number(state.fleetApprovalPage || 0)}&size=50`, []),
      optionalApi("/tenants/fleet/jobs/approval-summary", {})
    ]);
    state.data.fleetBulkJobs = jobs;
    state.data.fleetApprovalQueue = queue;
    state.pageMeta.fleetApprovalQueue = pageEnvelope(queue);
    state.data.fleetApprovalSummary = summaryData;
  } catch (error) {
    state.fleetBulkError = friendlyUserError(error, true);
  }
  renderShell();
}

async function loadFleetApprovalQueue(pageNumber = 0) {
  const page = Math.max(0, Number(pageNumber || 0));
  state.fleetApprovalPage = page;
  state.loading = true;
  state.fleetBulkError = "";
  renderShell();
  try {
    const [queue, summaryData] = await Promise.all([
      api(`/tenants/fleet/jobs/approval-queue?page=${page}&size=50`),
      api("/tenants/fleet/jobs/approval-summary")
    ]);
    state.data.fleetApprovalQueue = queue;
    state.pageMeta.fleetApprovalQueue = pageEnvelope(queue);
    state.data.fleetApprovalSummary = summaryData;
    state.lastSync = new Date().toISOString();
  } catch (error) {
    state.fleetBulkError = friendlyUserError(error, true);
  } finally {
    state.loading = false;
    renderShell();
  }
}

async function openFleetJobResults(jobId) {
  if (!jobId) return;
  state.selectedFleetJobId = jobId;
  state.selectedFleetJobResults = [];
  state.selectedFleetJobError = "";
  state.selectedFleetJobLoading = true;
  renderShell();
  try {
    state.selectedFleetJobResults = await api(`/tenants/fleet/jobs/${encodeURIComponent(jobId)}/results`);
  } catch (error) {
    state.selectedFleetJobError = friendlyUserError(error, true);
  } finally {
    state.selectedFleetJobLoading = false;
    renderShell();
    document.querySelector(".fleet-job-results")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function closeFleetJobResults() {
  state.selectedFleetJobId = "";
  state.selectedFleetJobResults = [];
  state.selectedFleetJobError = "";
  renderShell();
}

function exportFleetJobResults() {
  const results = Array.isArray(state.selectedFleetJobResults) ? state.selectedFleetJobResults : [];
  if (!results.length) return;
  const csvCell = (input) => {
    let value = String(input ?? "");
    if (/^[=+\-@]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  };
  const rows = [
    ["Organization", "Organization ID", "Outcome", "Message", "Processed at"],
    ...results.map((result) => [result.tenantName || "", result.tenantId || "", result.status || "", result.message || "", result.processedAt || ""])
  ];
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fleet-job-${String(state.selectedFleetJobId || "results").replace(/[^a-zA-Z0-9_-]/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function updateFleetIncident(incidentKey, status, assigneeUserId = null) {
  if (!incidentKey || !status) return;
  let resolutionNote = "";
  if (status === "resolved") {
    resolutionNote = window.prompt("Enter the resolution note. The underlying health signal remains visible until corrected.", "")?.trim() || "";
    if (!resolutionNote) return;
  }
  state.fleetIncidentMessage = "";
  state.fleetIncidentError = "";
  try {
    await api(`/tenants/fleet/incidents/${encodeURIComponent(incidentKey)}`, {
      method: "PATCH",
      body: JSON.stringify({ status, assigneeUserId, resolutionNote: resolutionNote || null })
    });
    state.data.fleetIncidentStates = await api("/tenants/fleet/incidents");
    state.fleetIncidentMessage = `Incident ${labelize(status)}.`;
  } catch (error) {
    state.fleetIncidentError = friendlyUserError(error, true);
  }
  renderShell();
}

async function assignFleetIncident(incidentKey) {
  const select = Array.from(document.querySelectorAll("[data-incident-assignee]")).find((item) => item.dataset.incidentAssignee === incidentKey);
  const assigneeUserId = select?.value || "";
  if (!assigneeUserId) {
    state.fleetIncidentError = "Choose an incident owner before assigning.";
    renderShell();
    return;
  }
  await updateFleetIncident(incidentKey, "acknowledged", assigneeUserId);
}

async function saveFleetRenewalScenario(event) {
  event?.preventDefault();
  const name = value("fleetScenarioName").trim();
  if (!name) return;
  state.fleetScenarioMessage = "";
  state.fleetScenarioError = "";
  try {
    const saved = await api("/tenants/fleet/forecast-scenarios", {
      method: "POST",
      body: JSON.stringify({
        name,
        renewalRate: Number(state.fleetRenewalRate || 0),
        priceAdjustment: Number(state.fleetRenewalPriceAdjustment || 0)
      })
    });
    state.data.fleetForecastScenarios = await api("/tenants/fleet/forecast-scenarios");
    state.fleetScenarioMessage = `Saved renewal scenario "${saved.name}".`;
  } catch (error) {
    state.fleetScenarioError = friendlyUserError(error, true);
  }
  renderShell();
}

function applyFleetRenewalScenario(scenarioId) {
  const scenario = dataRows("fleetForecastScenarios").find((item) => item.id === scenarioId);
  if (!scenario) return;
  state.fleetRenewalRate = Number(scenario.renewalRate || 0);
  state.fleetRenewalPriceAdjustment = Number(scenario.priceAdjustment || 0);
  state.fleetScenarioMessage = `Applied renewal scenario "${scenario.name}".`;
  state.fleetScenarioError = "";
  renderShell();
}

async function deleteFleetRenewalScenario(scenarioId) {
  const scenario = dataRows("fleetForecastScenarios").find((item) => item.id === scenarioId);
  if (!scenario || !window.confirm(`Delete renewal scenario "${scenario.name}"?`)) return;
  state.fleetScenarioMessage = "";
  state.fleetScenarioError = "";
  try {
    await api(`/tenants/fleet/forecast-scenarios/${encodeURIComponent(scenario.id)}`, { method: "DELETE" });
    state.data.fleetForecastScenarios = await api("/tenants/fleet/forecast-scenarios");
    state.fleetScenarioMessage = `Deleted renewal scenario "${scenario.name}".`;
  } catch (error) {
    state.fleetScenarioError = friendlyUserError(error, true);
  }
  renderShell();
}

async function saveFleetView(event) {
  event?.preventDefault();
  state.fleetViewMessage = "";
  state.fleetViewError = "";
  const name = value("fleetSavedViewName").trim();
  if (!name) return;
  const tableState = state.tableState[tableStateKey("SACCO fleet directory")] || {};
  try {
    const saved = await api("/tenants/fleet/views", {
      method: "POST",
      body: JSON.stringify({
        name,
        search: tableState.search || "",
        health: state.fleetHealthFilter || "",
        status: state.fleetStatusFilter || "",
        district: state.fleetDistrictFilter || "",
        accountManager: state.fleetManagerFilter || ""
      })
    });
    state.data.fleetSavedViews = await api("/tenants/fleet/views");
    state.fleetViewMessage = `Saved fleet view "${saved.name}".`;
  } catch (error) {
    state.fleetViewError = friendlyUserError(error, true);
  }
  renderShell();
}

async function applyFleetSavedView() {
  const viewId = value("fleetSavedViewSelect");
  const view = dataRows("fleetSavedViews").find((item) => item.id === viewId);
  if (!view) return;
  state.fleetHealthFilter = view.health || "";
  state.fleetStatusFilter = view.status || "";
  state.fleetDistrictFilter = view.district || "";
  state.fleetManagerFilter = view.accountManager || "";
  state.fleetSelectedIds = [];
  state.fleetViewError = "";
  state.fleetViewMessage = `Applied fleet view "${view.name}".`;
  const key = tableStateKey("SACCO fleet directory");
  state.tableState[key] = { ...(state.tableState[key] || {}), search: view.search || "", page: 1 };
  await loadServerTablePage(key, 0);
}

async function deleteFleetSavedView() {
  const viewId = value("fleetSavedViewSelect");
  const view = dataRows("fleetSavedViews").find((item) => item.id === viewId);
  if (!view || !window.confirm(`Delete saved view "${view.name}"?`)) return;
  state.fleetViewMessage = "";
  state.fleetViewError = "";
  try {
    await api(`/tenants/fleet/views/${encodeURIComponent(view.id)}`, { method: "DELETE" });
    state.data.fleetSavedViews = await api("/tenants/fleet/views");
    state.fleetViewMessage = `Deleted fleet view "${view.name}".`;
  } catch (error) {
    state.fleetViewError = friendlyUserError(error, true);
  }
  renderShell();
}

async function addTenantMember(event) {
  if (event) event.preventDefault();
  const tenantId = state.selectedTenantId;
  const fullName = value("newTenantMemberName");
  const phone = value("newTenantMemberPhone");
  const email = value("newTenantMemberEmail");
  const nationalId = value("newTenantMemberNationalId");
  if (!tenantId) return;
  if (!fullName || (!phone && !email)) {
    state.selectedTenantMessage = "";
    state.selectedTenantError = "Enter the member's full name and at least a phone number or email address.";
    renderShell();
    return;
  }
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const tenantBranches = await optionalApi(`/branches?tenantId=${encodeURIComponent(tenantId)}`, []);
    const branchList = Array.isArray(tenantBranches) ? tenantBranches : [];
    let branch = branchList.find((item) => /main/i.test(`${item.name || ""} ${item.code || ""}`)) || branchList[0];
    if (!branch) {
      // A newly created SACCO may not have a branch yet; provision a main branch so members can be registered.
      branch = await api("/branches", {
        method: "POST",
        body: JSON.stringify({ tenantId, code: "MAIN", name: "Main Branch" })
      });
    }
    if (!branch || !branch.id) {
      state.selectedTenantError = "Could not find or create a branch for this SACCO.";
      renderShell();
      return;
    }
    const member = await api("/members", {
      method: "POST",
      body: JSON.stringify({ tenantId, branchId: branch.id, fullName, phone: phone || undefined, email: email || undefined, nationalId: nationalId || undefined })
    });
    await refreshAll();
    state.selectedTenantId = tenantId;
    state.selectedTenant = dataRows("tenants").find((tenant) => tenant.id === tenantId) || state.selectedTenant;
    state.selectedTenantMembers = await optionalApi(`/members?tenantId=${encodeURIComponent(tenantId)}`, state.selectedTenantMembers);
    state.selectedTenantMessage = `Member added: ${member.membershipNo ? member.membershipNo + " - " : ""}${member.fullName || fullName}.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
    renderShell();
  }
}

async function changeTenantMemberStatus(memberId, status, verb) {
  const tenantId = state.selectedTenantId;
  if (!tenantId || !memberId || !status) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const member = await api(`/members/${encodeURIComponent(memberId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await refreshAll();
    state.selectedTenantId = tenantId;
    state.selectedTenant = dataRows("tenants").find((tenant) => tenant.id === tenantId) || state.selectedTenant;
    state.selectedTenantMembers = await optionalApi(`/members?tenantId=${encodeURIComponent(tenantId)}`, state.selectedTenantMembers);
    const who = `${member.membershipNo ? member.membershipNo + " - " : ""}${member.fullName || "member"}`;
    state.selectedTenantMessage = `Member ${verb}: ${who}.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
    renderShell();
  }
}

function approveTenantMember(memberId) {
  return changeTenantMemberStatus(memberId, "active", "approved");
}

function reactivateTenantMember(memberId) {
  return changeTenantMemberStatus(memberId, "active", "reactivated");
}

function rejectTenantMember(memberId) {
  return changeTenantMemberStatus(memberId, "exited", "rejected");
}

async function changeTenantMemberKyc(memberId, kycStatus, verb) {
  const tenantId = state.selectedTenantId;
  if (!tenantId || !memberId || !kycStatus) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const member = await api(`/members/${encodeURIComponent(memberId)}/kyc-status`, {
      method: "PATCH",
      body: JSON.stringify({ kycStatus })
    });
    await refreshAll();
    state.selectedTenantId = tenantId;
    state.selectedTenant = dataRows("tenants").find((tenant) => tenant.id === tenantId) || state.selectedTenant;
    state.selectedTenantMembers = await optionalApi(`/members?tenantId=${encodeURIComponent(tenantId)}`, state.selectedTenantMembers);
    const who = `${member.membershipNo ? member.membershipNo + " - " : ""}${member.fullName || "member"}`;
    state.selectedTenantMessage = `${verb}: ${who}.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
    renderShell();
  }
}

function verifyMemberKyc(memberId) {
  return changeTenantMemberKyc(memberId, "verified", "KYC verified");
}

function rejectMemberKyc(memberId) {
  return changeTenantMemberKyc(memberId, "rejected", "KYC rejected");
}

async function assignSaccoOfficial(office) {
  const tenantId = state.selectedTenantId;
  const memberId = value(`saccoOfficial-${office}`);
  if (!tenantId || !office) return;
  if (!memberId) {
    state.selectedTenantMessage = "";
    state.selectedTenantError = `Select a member for ${labelize(office)} before saving.`;
    renderShell();
    return;
  }
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const officials = await api(`/tenants/${encodeURIComponent(tenantId)}/officials/${encodeURIComponent(office)}`, {
      method: "PATCH",
      body: JSON.stringify({ memberId })
    });
    state.selectedTenantOfficials = Array.isArray(officials) ? officials : [];
    const saved = state.selectedTenantOfficials.find((item) => item.office === office) || {};
    const who = saved.fullName
      ? `${saved.membershipNo || ""} ${saved.fullName}`.trim()
      : (dataRows("members").find((member) => member.id === memberId)?.fullName || "member");
    const savedMessage = `${labelize(office)} saved: ${who}.`;
    state.selectedTenantMessage = savedMessage;
    await refreshAll();
    state.selectedTenantId = tenantId;
    state.selectedTenant = dataRows("tenants").find((tenant) => tenant.id === tenantId) || state.selectedTenant;
    state.selectedTenantOfficials = Array.isArray(officials) ? officials : [];
    state.selectedTenantMessage = savedMessage;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
    renderShell();
  }
}

async function grantOfficialStaffAccess(memberId, office) {
  if (!memberId || !office) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const result = await api("/users/official-staff-access", {
      method: "POST",
      body: JSON.stringify({ memberId, office })
    });
    await refreshAll();
    const tenantId = state.selectedTenantId;
    state.selectedTenant = dataRows("tenants").find((tenant) => tenant.id === tenantId) || state.selectedTenant;
    state.selectedTenantOfficials = await optionalApi(`/tenants/${encodeURIComponent(tenantId)}/officials`, state.selectedTenantOfficials);
    state.selectedTenantMessage = `${labelize(result.office || office)} staff access granted to ${result.email}. The member is linked to the staff account.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
    renderShell();
  }
}

async function createPlatformSacco(event) {
  event.preventDefault();
  state.tenantFormMessage = "";
  state.tenantFormError = "";
  let createdTenant = null;
  const submit = event.currentTarget.querySelector("button[type='submit']");
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Creating workspace...";
  }
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
    const tenant = await api("/tenants", {
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
        packageId: value("newTenantPackageId"),
        paymentStatus,
        parish,
        village,
        contactNumber,
        memberRange
      })
    });
    createdTenant = tenant;
    await api(`/tenants/${encodeURIComponent(tenant.id)}/profile`, {
      method: "PATCH",
      body: JSON.stringify({
        legalName: tenant.name,
        cooperativeRegistrationNo: tenant.registrationNo,
        address: saccoLocationAddress(district, parish, village, memberRange),
        phone: contactNumber
      })
    });
    const tenantRoles = await api(`/roles?tenantId=${encodeURIComponent(tenant.id)}`);
    const adminRole = (tenantRoles || []).find((role) => ["chairperson", "sacco administrator"].includes(normal(role.name)));
    if (!adminRole) throw new Error(`${tenant.name} was created, but its Chairperson administrator role was not provisioned.`);
    const staff = await api("/users", {
      method: "POST",
      body: JSON.stringify({
        tenantId: tenant.id,
        fullName: value("newTenantStaffFullName"),
        email: value("newTenantStaffEmail"),
        phone: value("newTenantStaffPhone"),
        password: value("newTenantStaffPassword")
      })
    });
    await api(`/users/${encodeURIComponent(staff.id)}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roleIds: [adminRole.id] })
    });
    state.tenantFormMessage = `${tenant.name} workspace created. ${staff.fullName || staff.email} is the primary SACCO Administrator. The 30-day test period is active.`;
    state.search = "";
    state.tableState = {};
    state.saccoRegistrationTab = "applications";
    await refreshAll();
    await openTenantDetail(tenant.id);
    state.tenantFormMessage = `${tenant.name} workspace created. ${staff.fullName || staff.email} is the primary SACCO Administrator. The 30-day test period is active.`;
    renderShell();
  } catch (error) {
    if (createdTenant) {
      state.tenantFormMessage = `${createdTenant.name} was created and its 30-day test period started.`;
      state.tenantFormError = `Primary staff setup did not complete: ${friendlyUserError(error, true)} Open the SACCO account to finish staff access; do not register it again.`;
      await refreshAll();
      await openTenantDetail(createdTenant.id);
    } else {
      state.tenantFormError = friendlyUserError(error, true);
    }
    renderShell();
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Create SACCO workspace";
    }
  }
}

async function extendSelectedTenantTrial(event) {
  event.preventDefault();
  const subscription = subscriptionForTenant(state.selectedTenantId);
  if (!subscription?.id) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const extended = await api(`/subscriptions/${encodeURIComponent(subscription.id)}/trial-extension`, {
      method: "POST",
      body: JSON.stringify({
        days: Number(value("trialExtensionDays") || 7),
        reason: value("trialExtensionReason")
      })
    });
    await refreshAll();
    state.selectedTenant = dataRows("tenants").find((tenant) => tenant.id === state.selectedTenantId) || state.selectedTenant;
    state.selectedTenantMessage = `Test period extended to ${formatDate(extended.expiry)}.`;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
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
        paymentPhone: value("publicTenantPaymentPhone") || value("publicTenantContactNumber")
      })
    }, "");
    const tenant = result.tenant || {};
    const paymentAmount = result.paymentAmount ? `${result.currencyCode || region.currency} ${Number(result.paymentAmount).toLocaleString()}` : "";
    state.publicRegistrationMessage = `Registration received for ${tenant.name || value("publicTenantName")}. SACCO code ${tenant.abbreviation || saccoCode} created. You have a 1-month free trial — start using the system now and pay the subscription${paymentAmount ? ` (${paymentAmount})` : ""} any time before the trial ends using reference ${result.paymentReference}.`;
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

async function deleteSelectedSacco(confirmCode) {
  const tenantId = state.selectedTenantId;
  if (!tenantId) return;
  const tenant = state.selectedTenant || {};
  const typed = String(confirmCode || "").trim();
  const expectedCode = String(tenant.abbreviation || "").trim();
  const displayName = String(tenant.name || tenant.abbreviation || "this SACCO").trim();
  if (!typed) {
    state.selectedTenantError = "Type the SACCO code to confirm deletion.";
    renderShell();
    return;
  }
  if (!expectedCode || typed.toLowerCase() !== expectedCode.toLowerCase()) {
    state.selectedTenantError = "The code you typed does not match this SACCO.";
    renderShell();
    return;
  }
  if (!window.confirm(`Permanently delete ${displayName} (${expectedCode})? This removes ALL of its members, loans, transactions, branches, subscriptions and complaints. This cannot be undone.`)) {
    return;
  }
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  state.saccoDeleteMessage = "";
  state.saccoDeleteError = "";
  try {
    const result = await api(`/tenants/${encodeURIComponent(tenantId)}`, {
      method: "DELETE",
      body: JSON.stringify({ confirmCode: typed })
    });
    state.selectedTenantId = null;
    state.selectedTenant = null;
    state.selectedTenantProfile = null;
    state.selectedTenantPaymentAccounts = [];
    state.selectedTenantOfficials = [];
    state.search = "";
    state.tableState = {};
    state.saccoRegistrationTab = "applications";
    await refreshAll();
    // Verify the server actually removed the tenant before claiming success.
    const stillPresent = dataRows("tenants").some((row) => row.id === tenantId);
    if (stillPresent) {
      state.saccoDeleteError = `${displayName} is still on the server after the delete request returned. Please retry; if it keeps failing, check the backend console for a "Tenant purge incomplete" warning.`;
    } else {
      const removed = result && typeof result.rowsRemoved === "number" ? ` (${result.rowsRemoved} records removed)` : "";
      state.saccoDeleteMessage = `${(result && result.name) || displayName} was permanently deleted${removed}.`;
    }
    renderShell();
  } catch (error) {
    // Delete failed outright (validation, permission, or a server error) - surface it where the button is.
    state.saccoDeleteError = friendlyUserError(error, true);
    state.selectedTenantError = friendlyUserError(error, true);
    renderShell();
  }
}

async function saveSelectedTenantDetails(event) {
  event.preventDefault();
  const tenantId = state.selectedTenantId;
  if (!tenantId) return;
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  try {
    const tenant = await api(`/tenants/${encodeURIComponent(tenantId)}/details`, {
      method: "PATCH",
      body: JSON.stringify({
        name: value("editTenantName"),
        registrationNo: value("editTenantRegistrationNo"),
        district: value("editTenantDistrict"),
        country: value("editTenantCountry")
      })
    });
    const profile = await api(`/tenants/${encodeURIComponent(tenantId)}/profile`, {
      method: "PATCH",
      body: JSON.stringify({
        legalName: value("editTenantName"),
        cooperativeRegistrationNo: value("editTenantRegistrationNo"),
        tin: value("editTenantTin"),
        umraLicenseNo: value("editTenantUmraLicenseNo"),
        phone: value("editTenantPhone"),
        email: value("editTenantEmail"),
        address: value("editTenantAddress"),
        website: value("editTenantWebsite")
      })
    });
    state.selectedTenant = tenant;
    state.selectedTenantProfile = profile;
    state.selectedTenantMessage = "SACCO details updated.";
    await refreshAll();
    state.selectedTenantId = tenantId;
    state.selectedTenant = tenant;
    state.selectedTenantProfile = profile;
    renderShell();
  } catch (error) {
    state.selectedTenantError = friendlyUserError(error, true);
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

async function savePlatformMobileMoneyConfig(event) {
  event.preventDefault();
  state.mobileMoneyConfigMessage = "";
  state.mobileMoneyConfigError = "";
  const submit = event.currentTarget.querySelector("button[type='submit']");
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Saving...";
  }
  try {
    const payload = {
      activeProvider: value("mobileMoneyActiveProvider"),
      requireSignedCallbacks: Boolean(document.getElementById("mobileMoneyRequireSignedCallbacks")?.checked),
      callbackSecret: value("mobileMoneyCallbackSecret").trim(),
      mtnSubscriptionKey: value("mtnMomoSubscriptionKey").trim(),
      mtnApiUserId: value("mtnMomoApiUserId").trim(),
      mtnApiKey: value("mtnMomoApiKey").trim(),
      mtnTargetEnvironment: value("mtnMomoTargetEnvironment").trim(),
      airtelClientId: value("airtelMoneyClientId").trim(),
      airtelClientSecret: value("airtelMoneyClientSecret").trim(),
      airtelCountryCode: value("airtelMoneyCountryCode").trim().toUpperCase()
    };
    if (!payload.activeProvider) throw new Error("Select the active platform provider.");
    if (payload.activeProvider === "mtn_momo" && (!payload.mtnApiUserId || !payload.mtnTargetEnvironment)) {
      throw new Error("MTN setup needs the API user ID and target environment.");
    }
    if (payload.activeProvider === "airtel_money" && (!payload.airtelClientId || !payload.airtelCountryCode)) {
      throw new Error("Airtel setup needs the client ID and country code.");
    }
    state.data.mobileMoneyIntegrationConfig = await api("/platform-integrations/mobile-money-config", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    state.mobileMoneyConfigMessage = "Platform mobile-money keys saved. Blank secret fields were left unchanged.";
    await refreshAll();
    state.mobileMoneyConfigMessage = "Platform mobile-money keys saved. Blank secret fields were left unchanged.";
    renderShell();
  } catch (error) {
    state.mobileMoneyConfigError = error.message || "Could not save platform mobile-money keys.";
    renderShell();
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Save platform mobile-money keys";
    }
  }
}

async function recordSubscriptionPayment(amountOverride = null) {
  const subscriptionId = value("selectedSubscriptionId") || state.selectedSubscriptionId;
  const subscription = dataRows("subscriptions").find((item) => item.id === subscriptionId);
  if (!subscription) return;
  const due = Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || 0));
  const amount = amountOverride ?? Number(value("subscriptionPaymentAmount") || due || subscription.amount || 0);
  const paymentMode = value("subscriptionPaymentMode") || "group";
  const memberSlots = Number(value("subscriptionPaymentMemberSlots") || 0);
  const channel = value("subscriptionPaymentChannel") || "manual";
  state.selectedSubscriptionMessage = "";
  state.selectedSubscriptionError = "";
  try {
    if (channel === "mobile_money") {
      const provider = value("subscriptionPaymentProvider") || "";
      const payerPhone = value("subscriptionPaymentPhone").trim();
      if (!provider) throw new Error("Choose MTN MoMo or Airtel Money.");
      if (!payerPhone) throw new Error("Enter the mobile number for the payment prompt.");
      const request = await api("/integrations/mobile-money/subscription-payment-requests/staff", {
        method: "POST",
        body: JSON.stringify({
          tenantId: subscription.tenantId,
          amount,
          payerPhone,
          externalReference: `SUB-${subscription.invoice || subscription.id}-${Date.now()}`,
          provider,
          providerPayload: {
            source: "platform_subscription_manage",
            provider,
            initiatedBy: state.user?.email || state.user?.id || "",
            subscriptionId
          }
        })
      });
      state.selectedSubscriptionMessage = `Payment prompt initialized for ${payerPhone}${request.externalReference ? `: ${request.externalReference}` : ""}.`;
      await refreshAll();
      state.selectedSubscriptionId = subscriptionId;
      renderShell();
      return;
    }
    const result = await api(`/subscriptions/${encodeURIComponent(subscriptionId)}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        channel,
        paymentMode,
        memberSlots: Number.isFinite(memberSlots) && memberSlots > 0 ? memberSlots : null
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

function syncSubscriptionPaymentChannel() {
  const isMobileMoney = value("subscriptionPaymentChannel") === "mobile_money";
  const providerWrap = document.getElementById("subscriptionPaymentProviderWrap");
  const phoneWrap = document.getElementById("subscriptionPaymentPhoneWrap");
  const provider = document.getElementById("subscriptionPaymentProvider");
  const phone = /** @type {HTMLInputElement | null} */ (document.getElementById("subscriptionPaymentPhone"));
  providerWrap?.classList.toggle("hidden", !isMobileMoney);
  phoneWrap?.classList.toggle("hidden", !isMobileMoney);
  if (provider) provider.disabled = !isMobileMoney;
  if (phone) {
    phone.disabled = !isMobileMoney;
    phone.required = isMobileMoney;
  }
}

function syncSubscriptionPaymentMode() {
  const mode = value("subscriptionPaymentMode") || "group";
  const modeSelect = document.getElementById("subscriptionPaymentMode");
  const slots = /** @type {HTMLInputElement | null} */ (document.getElementById("subscriptionPaymentMemberSlots"));
  const amount = /** @type {HTMLInputElement | null} */ (document.getElementById("subscriptionPaymentAmount"));
  if (!modeSelect || !slots || !amount || mode !== "per_member") return;
  const unitPrice = Number(modeSelect.dataset.unitPrice || 0);
  const slotCount = Math.max(1, Number(slots.value || 1));
  if (unitPrice > 0) amount.value = String(Math.round(unitPrice * slotCount));
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
