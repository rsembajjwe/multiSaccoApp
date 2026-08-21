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
  state.selectedTenantMessage = "";
  state.selectedTenantError = "";
  renderShell();
  try {
    const [tenant, profile, paymentAccounts] = await Promise.all([
      api(`/tenants/${encodeURIComponent(tenantId)}`),
      optionalApi(`/tenants/${encodeURIComponent(tenantId)}/profile`, null),
      optionalApi(`/sacco-payment-accounts?tenantId=${encodeURIComponent(tenantId)}`, [])
    ]);
    state.selectedTenant = tenant;
    state.selectedTenantProfile = profile || {};
    state.selectedTenantPaymentAccounts = Array.isArray(paymentAccounts) ? paymentAccounts : [];
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

