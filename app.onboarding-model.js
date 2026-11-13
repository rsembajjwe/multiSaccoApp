function buildSaccoApplicationRows(input) {
  return input.tenants.map((tenant) => {
    const subscription = input.subscriptions.find((item) => item.tenantId === tenant.id);
    const paymentStage = saccoPaymentStageFor(tenant, subscription);
    const approvalStage = saccoApprovalStageFor(tenant, subscription);
    const operatingAccess = subscriptionAccessLabelFor(subscription || {}, tenant);
    const registeredOn = saccoApplicationRegisteredOn(tenant, subscription);
    return {
      ...tenant,
      registeredOn,
      paymentStage,
      approvalStage,
      operatingAccess,
      searchText: saccoApplicationSearchText(tenant, {
        registeredOn,
        paymentStage,
        approvalStage,
        operatingAccess
      }),
      action: "tenant-detail",
      actionLabel: "Review",
      actionId: tenant.id
    };
  });
}

function saccoApplicationSearchText(tenant, stages) {
  return [
    tenant.id,
    tenant.name,
    tenant.abbreviation,
    tenant.saccoCode,
    tenant.code,
    tenant.country,
    tenant.currencyCode,
    tenant.district,
    tenant.registrationNo,
    stages.registeredOn,
    tenant.status,
    stages.paymentStage,
    stages.approvalStage,
    stages.operatingAccess,
    labelizeOnboardingModelText(stages.paymentStage),
    labelizeOnboardingModelText(stages.approvalStage),
    labelizeOnboardingModelText(stages.operatingAccess)
  ].filter(Boolean).join(" ");
}

function saccoApplicationRegisteredOn(tenant, subscription) {
  return tenant.registeredAt
    || tenant.createdAt
    || tenant.submittedAt
    || tenant.updatedAt
    || subscription?.subscribedAt
    || subscription?.activatedAt
    || subscription?.startDate
    || subscription?.createdAt
    || subscription?.paidAt
    || subscription?.updatedAt
    || saccoApplicationYearFromRegistrationNo(tenant.registrationNo);
}

function saccoApplicationYearFromRegistrationNo(registrationNo) {
  const match = String(registrationNo || "").match(/\b(20\d{2}|19\d{2})\b/);
  return match ? `${match[1]}-01-01` : "";
}

function buildSaccoRegistrationSummary(applications) {
  return {
    active: applications.filter((row) => normalizeOnboardingModelText(row.operatingAccess) === "active").length,
    callbackReceived: applications.filter((row) => normalizeOnboardingModelText(row.paymentStage).includes("callback")).length,
    paymentInitiated: applications.filter((row) => normalizeOnboardingModelText(row.paymentStage).includes("initiated")).length,
    readyForApproval: applications.filter((row) => normalizeOnboardingModelText(row.approvalStage).includes("ready")).length,
    totalApplications: applications.length
  };
}

function buildSubscriptionRows(input) {
  return input.subscriptions.map((subscription) => {
    const tenant = input.tenants.find((item) => item.id === subscription.tenantId) || {};
    return {
      ...subscription,
      saccoCode: textOnboardingModelValue(tenant.abbreviation || tenant.code || subscription.tenantCode || subscription.tenantId),
      tenantName: textOnboardingModelValue(tenant.name || subscription.tenantName || subscription.saccoName || subscription.tenantId),
      packageName: textOnboardingModelValue(subscription.tierLabel || subscription.packageName || subscription.packageId),
      paymentStatus: subscriptionPaymentLabelFor(subscription),
      paymentStage: saccoPaymentStageFor(tenant, subscription),
      operatingAccess: subscriptionAccessLabelFor(subscription, tenant),
      approvalStage: saccoApprovalStageFor(tenant, subscription),
      billableMembers: displayOnboardingModelValue(subscription.billableMembers || subscription.memberCount || tenant.memberCount || 0),
      paidMemberCapacity: displayOnboardingModelValue(subscription.paidMemberCapacity || 0),
      inactiveMemberOverflow: displayOnboardingModelValue(subscription.inactiveMemberOverflow || 0),
      balanceDue: balanceDueFor(subscription),
      action: "subscription-detail",
      actionLabel: "Manage",
      actionId: subscription.id
    };
  });
}

function buildSubscriptionSummary(rows, tableRows) {
  return {
    activeSubscriptions: rows.filter((row) => ["active", "expiring", "grace"].includes(subscriptionLifecycleStateFor(row))).length,
    callbackReceived: tableRows.filter((row) => normalizeOnboardingModelText(row.paymentStage).includes("callback")).length,
    expiredOrSuspended: tableRows.filter((row) => normalizeOnboardingModelText(row.operatingAccess).includes("expired") || normalizeOnboardingModelText(row.operatingAccess).includes("suspended")).length,
    outstandingInvoices: rows.reduce((total, row) => total + balanceDueFor(row), 0),
    paidAndActive: tableRows.filter((row) => normalizeOnboardingModelText(row.paymentStatus) === "paid" && normalizeOnboardingModelText(row.operatingAccess) === "active").length,
    paymentInitiated: tableRows.filter((row) => normalizeOnboardingModelText(row.paymentStage).includes("initiated")).length,
    pendingPayments: rows.filter((row) => normalizeOnboardingModelText(row.paymentStatus || row.status).includes("pending")).length,
    revenueThisMonth: sumOnboardingModelValues(rows, "amount"),
    suspendedAccess: tableRows.filter((row) => normalizeOnboardingModelText(row.operatingAccess).includes("suspended")).length
  };
}

function subscriptionLifecycleStateFor(subscription, now = new Date()) {
  const rawState = normalizeOnboardingModelText(subscription.lifecycleState || subscription.status || "unknown");
  if (rawState.includes("pending")) return "pending_payment";
  if (rawState.includes("expired")) return "expired";

  const expiry = new Date(String(subscription.expiry || subscription.expiryDate || subscription.expiresAt || ""));
  if (!Number.isFinite(expiry.getTime())) return rawState;
  const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
  if (daysToExpiry < 0) return "expired";
  if (daysToExpiry <= 90 && rawState === "active") return "expiring";
  return rawState;
}

function buildPackageCardRows(packages) {
  return packages.map((pkg) => {
    const status = normalizeOnboardingModelText(pkg.status || "active");
    return {
      ...pkg,
      packageId: String(pkg.id || pkg.packageId || pkg.name || ""),
      amount: displayOnboardingModelValue(pkg.price || pkg.amount || 0),
      memberLimit: displayOnboardingModelValue(pkg.memberRange || pkg.members || (pkg.maxMembers ? `Up to ${pkg.maxMembers}` : "Configured range")),
      branchLimit: displayOnboardingModelValue(pkg.maxBranches || pkg.branches || "Configured"),
      statusLabel: labelizeOnboardingModelText(status || "active"),
      statusTone: status === "active" ? "active" : "pending"
    };
  });
}

function generateSaccoCode(name, existingTenants) {
  const words = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["SACCO", "COOPERATIVE", "COOP", "LIMITED", "LTD", "THE", "AND", "OF"].includes(word));
  const letterSource = words.join("") || "SACCO";
  const base = `${letterSource.replace(/[^A-Z]/g, "")}SACO`.slice(0, 4);
  const existingCodes = new Set(existingTenants.map((tenant) => normalizeOnboardingModelText(tenant.saccoCode || tenant.abbreviation || tenant.code)));
  if (!existingCodes.has(normalizeOnboardingModelText(base))) return base;
  for (let index = 0; index < 26 * 26; index += 1) {
    const suffix = String.fromCharCode(65 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
    const code = `${base.slice(0, 2)}${suffix}`;
    if (!existingCodes.has(normalizeOnboardingModelText(code))) return code;
  }
  for (let index = 0; index < 26 * 26 * 26 * 26; index += 1) {
    let cursor = index;
    const code = [0, 0, 0, 0].map(() => {
      const letter = String.fromCharCode(65 + (cursor % 26));
      cursor = Math.floor(cursor / 26);
      return letter;
    }).reverse().join("");
    if (!existingCodes.has(normalizeOnboardingModelText(code))) return code;
  }
  return base;
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
  const match = String(profile?.address || "").match(new RegExp(`${label}:\\s*([^;]+)`, "i"));
  return match ? match[1].trim() : "";
}

function tenantStatusOptions() {
  return [
    { value: "pending_review", label: "Pending review / request changes" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active / operating" },
    { value: "inactive", label: "Inactive / deactivated" },
    { value: "suspended", label: "Suspended" },
    { value: "terminated", label: "Rejected / terminated" }
  ];
}

function tenantStatusLabel(status) {
  return tenantStatusOptions().find((option) => option.value === status)?.label || String(status || "Pending");
}

function memberRangeOptions() {
  return [
    { value: "20-250", label: "20 to 250 members" },
    { value: "251-500", label: "251 to 500 members" },
    { value: "501-1000", label: "501 to 1,000 members" },
    { value: "1001-2500", label: "1,001 to 2,500 members" },
    { value: "2501-5000", label: "2,501 to 5,000 members" },
    { value: "5001-10000", label: "5,001 to 10,000 members" },
    { value: "10000+", label: "Above 10,000 members" }
  ];
}

function countryRegionOptions(countryRegions, selectedCountry = "uganda") {
  return Object.entries(countryRegions).map(([country, region]) => ({
    currency: region.currency,
    currencyDigits: region.currencyDigits,
    label: `${labelizeOnboardingModelText(country)} - ${region.currency}`,
    locale: region.locale,
    selected: country === selectedCountry,
    value: country
  }));
}

function buildSaccoCollectionAccountReviewRows(accounts, labelize) {
  return accounts.map((account) => ({
    channel: labelize(account.channel || ""),
    provider: account.channel === "bank" ? String(account.bankName || "") : String(account.network || "").toUpperCase(),
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    branch: String(account.branch || ""),
    status: account.active ? "active" : "inactive"
  }));
}

function subscriptionAccessLabelFor(subscription, tenant = {}) {
  if (normalizeOnboardingModelText(tenant.status).includes("suspended")) return "Read-only until paid";
  if (normalizeOnboardingModelText(subscription.status) === "active" && normalizeOnboardingModelText(tenant.status) === "active") return "Active";
  if (normalizeOnboardingModelText(subscription.status) === "trial" && normalizeOnboardingModelText(tenant.status) === "active") return "Setup trial";
  if (normalizeOnboardingModelText(subscription.status).includes("pending")) return "Payment pending";
  if (normalizeOnboardingModelText(subscription.status).includes("expired")) return "Expired";
  return String(subscription.status || tenant.status || "Pending");
}

function saccoPaymentStageFor(tenant, subscription) {
  if (!subscription) return "No subscription";
  const paid = Number(subscription.paid || subscription.amountPaid || 0);
  const amount = Number(subscription.amount || 0);
  const status = normalizeOnboardingModelText(subscription.status);
  if (amount > 0 && paid >= amount) return "Callback received";
  if (paid > 0) return "Part payment received";
  if (status === "trial") return "Setup trial";
  if (normalizeOnboardingModelText(tenant.status).includes("pending_self_registration") || status.includes("pending")) return "Payment initiated";
  if (status === "active") return "Callback received";
  if (status.includes("expired")) return "Expired";
  return "Payment pending";
}

function saccoApprovalStageFor(tenant, subscription) {
  const tenantStatus = normalizeOnboardingModelText(tenant.status);
  const paymentStage = normalizeOnboardingModelText(saccoPaymentStageFor(tenant, subscription));
  if (tenantStatus === "active" && paymentStage.includes("callback")) return "Active";
  if (tenantStatus === "pending_review" && paymentStage.includes("callback")) return "Ready for approval";
  if (tenantStatus === "pending_self_registration") return "Awaiting payment";
  if (tenantStatus === "approved" && paymentStage.includes("callback")) return "Ready for activation";
  if (tenantStatus.includes("pending")) return "Application review";
  if (tenantStatus.includes("suspended")) return "Suspended";
  if (tenantStatus.includes("terminated")) return "Rejected";
  return tenantStatus ? tenantStatus.replaceAll("_", " ") : "Pending";
}

function subscriptionPaymentLabelFor(subscription) {
  const amount = Number(subscription.amount || 0);
  const paid = Number(subscription.paid || subscription.amountPaid || 0);
  const status = normalizeOnboardingModelText(subscription.paymentStatus || subscription.status);
  if (amount > 0 && paid >= amount) return "Paid";
  if (status.includes("paid") || status === "active") return paid > 0 ? "Part paid" : "Payment confirmed";
  if (status === "trial") return "Trial not paid";
  if (paid > 0) return "Part paid";
  if (status.includes("expired")) return "Expired";
  return "Pending payment";
}

function balanceDueFor(subscription) {
  return Math.max(0, Number(subscription.amount || 0) - Number(subscription.paid || subscription.amountPaid || 0));
}

function sumOnboardingModelValues(rows, ...keys) {
  return rows.reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + Number(row[key] || 0), 0), 0);
}

function normalizeOnboardingModelText(value) {
  return String(value || "").toLowerCase();
}

function labelizeOnboardingModelText(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayOnboardingModelValue(value) {
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value || "");
}

function textOnboardingModelValue(value) {
  return String(value || "");
}
