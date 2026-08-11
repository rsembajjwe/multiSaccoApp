function buildSaccoApplicationRows(input) {
  return input.tenants.map((tenant) => {
    const subscription = input.subscriptions.find((item) => item.tenantId === tenant.id);
    return {
      ...tenant,
      paymentStage: saccoPaymentStageFor(tenant, subscription),
      approvalStage: saccoApprovalStageFor(tenant, subscription),
      operatingAccess: subscriptionAccessLabelFor(subscription || {}, tenant),
      action: "tenant-detail",
      actionLabel: "Review",
      actionId: tenant.id
    };
  });
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
      packageName: textOnboardingModelValue(subscription.tierLabel || subscription.packageName || subscription.packageId),
      paymentStatus: subscriptionPaymentLabelFor(subscription),
      paymentStage: saccoPaymentStageFor(tenant, subscription),
      operatingAccess: subscriptionAccessLabelFor(subscription, tenant),
      approvalStage: saccoApprovalStageFor(tenant, subscription),
      billableMembers: displayOnboardingModelValue(subscription.billableMembers || subscription.memberCount || tenant.memberCount || 0),
      balanceDue: balanceDueFor(subscription),
      action: "subscription-detail",
      actionLabel: "Manage",
      actionId: subscription.id
    };
  });
}

function buildSubscriptionSummary(rows, tableRows) {
  return {
    activeSubscriptions: rows.filter((row) => normalizeOnboardingModelText(row.status) === "active").length,
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

function subscriptionAccessLabelFor(subscription, tenant = {}) {
  if (normalizeOnboardingModelText(tenant.status).includes("suspended")) return "Suspended";
  if (normalizeOnboardingModelText(subscription.status) === "active" && normalizeOnboardingModelText(tenant.status) === "active") return "Active";
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
