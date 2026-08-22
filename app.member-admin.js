// Member administration, KYC and statement rendering extracted from app.js.

function memberDuesView() {
  const subs = dataRows("memberSubscriptions");
  const currentPeriod = memberSubscriptionSelectedPeriod();
  const members = currentPeriod === "once"
    ? dataRows("members").filter((member) => String(member.status || "").toLowerCase() === "active")
    : dataRows("members");
  const latestByMember = latestMemberDuesByMember(subs, currentPeriod);
  const cycleClosed = memberSubscriptionCycleClosed(currentPeriod);
  const rows = members
    .map((member) => memberDuesRegisterRow(member, latestByMember.get(member.id)))
    .filter((row) => currentPeriod === "once" || !cycleClosed || row.paymentStatus === "Paid");
  const filteredRows = rows.filter((row) => memberDuesFilterMatch(row, state.memberDuesFilter || "all"));
  return `
    ${saccoCyclePanel(currentSaccoCycleContext(), { title: "Subscription cycle" })}
    ${memberDuesFilterToolbar(rows)}
    ${state.memberDuesMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberDuesMessage)}</strong></div>` : ""}
    ${state.memberDuesError ? `<div class="notice warning"><strong>Subscription action failed.</strong><span>${escapeHtml(state.memberDuesError)}</span></div>` : ""}
    ${recordTable(`Member subscriptions - ${currentMembershipCycleLabel(currentPeriod)}`, filteredRows, ["membershipNo", "memberName", "phone", "planName", "amount", "paid", "balanceDue", "paymentStatus", "cycle", "expiry", "daysToExpiry", "paymentReadiness"])}
    ${memberDuesPaymentDetailsDialog()}
    ${memberDuesCashDialog()}
    ${subscriptionPaymentDialog()}
  `;
}

function latestMemberDuesByMember(subs, period = normalizeMembershipPeriod(state.data.saccoProfile?.membershipDuesPeriod || "annual")) {
  return subs.reduce((index, sub) => {
    if (normalizeMembershipPeriod(sub.billingPeriod || "") !== period) return index;
    if (typeof subscriptionMatchesSelectedCycle === "function" && !subscriptionMatchesSelectedCycle(sub, period)) return index;
    const current = index.get(sub.memberId);
    if (!current || String(sub.createdAt || "") > String(current.createdAt || "")) {
      index.set(sub.memberId, sub);
    }
    return index;
  }, new Map());
}

function memberDuesRegisterRow(member, sub) {
  const period = memberSubscriptionSelectedPeriod();
  const cycleLabel = typeof currentMembershipCycleLabel === "function" ? currentMembershipCycleLabel(period) : membershipPeriodLabel(period);
  const hasSubscription = !!sub;
  const cycleClosed = memberSubscriptionCycleClosed(period);
  const lifecycle = String(sub?.lifecycleState || sub?.status || "").toLowerCase();
  const paid = hasSubscription && Number(sub.balanceDue || 0) <= 0 && !["expired", "grace"].includes(lifecycle);
  const participation = memberDuesParticipationStatus(member, sub, paid, cycleClosed);
  const paymentStatus = memberDuesParticipationLabel(participation);
  const actionTarget = sub?.id || `member:${member.id}`;
  return {
    id: member.id,
    memberId: member.id,
    subscriptionId: sub?.id || "",
    membershipNo: member.membershipNo || "",
    memberName: member.fullName || member.membershipNo || member.id,
    phone: member.phone || "",
    planName: sub?.planName || "Member subscription",
    amount: hasSubscription ? money.format(sub.amount || 0) : "-",
    amountValue: Number(sub?.amount || 0),
    paid: hasSubscription ? money.format(sub.paid || 0) : "-",
    balanceDue: hasSubscription ? money.format(sub.balanceDue || 0) : "-",
    balanceDueValue: Number(sub?.balanceDue || 0),
    paymentStatus,
    cycle: `${membershipPeriodLabel(period)} - ${cycleLabel}`,
    cycleKey: period,
    expiry: hasSubscription && sub.expiry ? formatDate(sub.expiry) : (hasSubscription ? "No expiry" : "-"),
    daysToExpiry: hasSubscription ? memberDuesDaysLabel(sub) : "-",
    paymentReadiness: memberDuesParticipationReadiness(participation, sub, cycleClosed),
    statusKey: participation,
    action: "member-dues-cycle",
    actionLabel: "Manage",
    actionId: actionTarget,
    canViewDetails: hasSubscription,
    canReceivePayment: !cycleClosed && ["unpaid", "pending_payment"].includes(participation),
    canRequestExemption: !cycleClosed && ["unpaid", "pending_payment"].includes(participation),
    canMarkNotRenewing: !cycleClosed && ["unpaid", "pending_payment"].includes(participation),
    canReactivate: !cycleClosed && ["not_renewing", "exemption_requested"].includes(participation)
  };
}

function memberDuesParticipationStatus(member, sub, paid, cycleClosed) {
  const override = memberDuesParticipationOverride(member.id);
  if (override) return override;
  const memberStatus = String(member.status || "").toLowerCase();
  if (["inactive", "suspended", "exited"].includes(memberStatus)) return "inactive";
  const lifecycle = String(sub?.lifecycleState || sub?.status || "").toLowerCase();
  if (lifecycle.includes("exempt")) return "exempted";
  if (paid) return "paid";
  if (lifecycle.includes("pending") || lifecycle.includes("initiated") || lifecycle.includes("processing")) return "pending_payment";
  return cycleClosed ? "historical_unpaid" : "unpaid";
}

function memberDuesParticipationOverride(memberId) {
  const key = memberDuesCycleParticipationKey(memberId);
  return state.memberCycleParticipation?.[key] || "";
}

function memberDuesCycleParticipationKey(memberId, period = memberSubscriptionSelectedPeriod()) {
  const year = memberSubscriptionSelectedYear();
  const month = memberSubscriptionSelectedMonth();
  const cycle = period === "once" ? "lifetime" : period === "monthly" ? `${year}-${String(month).padStart(2, "0")}` : String(year);
  return `${state.user?.tenantId || state.tenant?.id || "sacco"}:${memberId}:${period}:${cycle}`;
}

function memberDuesParticipationLabel(status) {
  const labels = {
    paid: "Paid",
    unpaid: "Unpaid",
    pending_payment: "Pending payment",
    exemption_requested: "Exemption requested",
    exempted: "Exempted",
    not_renewing: "Not renewing",
    inactive: "Inactive",
    historical_unpaid: "Unpaid"
  };
  return labels[status] || "Expected";
}

function memberDuesParticipationReadiness(status, sub, cycleClosed) {
  if (cycleClosed) return status === "paid" ? "Paid in historical cycle" : "Historical cycle";
  if (status === "paid") return "Paid for this cycle";
  if (status === "pending_payment") return "Awaiting payment confirmation";
  if (status === "exemption_requested") return "Awaiting exemption approval";
  if (status === "exempted") return "Exemption recorded";
  if (status === "not_renewing") return "Member will not continue this cycle";
  if (status === "inactive") return "Inactive member";
  return sub ? memberDuesReadiness(sub) : "Payment required to continue";
}

function subscriptionPaymentDialog() {
  if (!state.subscriptionPaymentDialogId) return "";
  const context = subscriptionPaymentContext(state.subscriptionPaymentDialogId);
  const { subscription, member } = context;
  if (!member) return "";
  const providers = subscriptionPaymentProviderOptions();
  const amount = Number(subscription?.balanceDue || subscription?.amount || state.data.saccoProfile?.membershipSubscriptionAmount || 5000);
  const cycle = subscription?.billingPeriod || state.data.saccoProfile?.membershipDuesPeriod || "annual";
  return `
    <div class="dialog-backdrop" role="presentation">
      <section class="dialog-panel subscription-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="subscriptionPaymentTitle">
        <div class="panel-heading">
          <div>
            <h2 id="subscriptionPaymentTitle">Initiate subscription payment</h2>
            <p>Send a mobile-money prompt to the member. The member enters their mobile-money PIN/password on their phone to complete payment.</p>
          </div>
          <button class="button ghost" type="button" data-action="close-subscription-payment-dialog">Close</button>
        </div>
        ${state.subscriptionPaymentDialogError ? `<div class="notice warning"><strong>Payment prompt failed.</strong><span>${escapeHtml(state.subscriptionPaymentDialogError)}</span></div>` : ""}
        <div class="source-grid">
          ${mini("Member", memberName(member.id))}
          ${mini("Subscription", subscription?.planName || "Member subscription")}
          ${mini("Balance due", money.format(amount))}
          ${mini("Cycle", labelize(cycle))}
        </div>
        <form id="subscriptionPaymentForm" class="form-grid">
          <input type="hidden" id="subscriptionPaymentId" value="${escapeHtml(subscription?.id || "")}">
          <input type="hidden" id="subscriptionPaymentMemberId" value="${escapeHtml(member.id)}">
          <label><span>ISP / mobile-money provider</span><select id="subscriptionPaymentProvider">${providers.map((provider) => `<option value="${escapeHtml(provider.value)}">${escapeHtml(provider.label)}</option>`).join("")}</select></label>
          <label><span>Mobile number</span><input id="subscriptionPaymentPhone" required placeholder="+256..." value="${escapeHtml(member.phone || "")}"></label>
          <label><span>Amount</span><input id="subscriptionPaymentAmount" type="number" min="1" step="0.01" value="${escapeHtml(String(Math.max(1, Math.round(amount || 0))))}" readonly></label>
          <div class="form-actions inline">
            <button class="button primary" type="submit">Initiate payment</button>
            <button class="button secondary" type="button" data-action="close-subscription-payment-dialog">Cancel</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function memberDuesCashDialog() {
  if (!state.memberDuesCashDialogId) return "";
  const context = subscriptionPaymentContext(state.memberDuesCashDialogId);
  const { subscription, member } = context;
  if (!member) return "";
  const amount = Number(subscription?.balanceDue || subscription?.amount || state.data.saccoProfile?.membershipSubscriptionAmount || 5000);
  const cycle = subscription?.billingPeriod || state.data.saccoProfile?.membershipDuesPeriod || "annual";
  return `
    <div class="dialog-backdrop" role="presentation">
      <section class="dialog-panel subscription-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="memberDuesCashTitle">
        <div class="panel-heading">
          <div>
            <h2 id="memberDuesCashTitle">Record cash subscription payment</h2>
            <p>Use this when the member pays the subscription at the SACCO office through the treasurer or secretary.</p>
          </div>
          <button class="button ghost" type="button" data-action="close-member-dues-cash-dialog">Close</button>
        </div>
        <div class="source-grid">
          ${mini("Member", memberName(member.id))}
          ${mini("Subscription", subscription?.planName || "Member subscription")}
          ${mini("Amount", money.format(amount))}
          ${mini("Cycle", labelize(cycle))}
        </div>
        <form id="memberDuesCashForm" class="form-grid">
          <input type="hidden" id="memberDuesCashId" value="${escapeHtml(subscription?.id || "")}">
          <input type="hidden" id="memberDuesCashMemberId" value="${escapeHtml(member.id)}">
          <label><span>Amount</span><input id="memberDuesCashAmount" type="number" min="1" step="0.01" value="${escapeHtml(String(Math.max(1, Math.round(amount || 0))))}" readonly></label>
          <label><span>Payment method</span><select id="memberDuesCashMethod"><option value="cash">Treasurer cash</option><option value="office">Office receipt</option><option value="bank">Bank deposit</option></select></label>
          <label><span>Receipt / reference</span><input id="memberDuesCashReference" placeholder="Receipt number, voucher or teller initials"></label>
          <div class="form-actions inline">
            <button class="button primary" type="submit">Record cash payment</button>
            <button class="button secondary" type="button" data-action="close-member-dues-cash-dialog">Cancel</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function memberDuesPaymentDetailsDialog() {
  if (!state.memberDuesDetailsId) return "";
  const subscription = dataRows("memberSubscriptions").find((item) => item.id === state.memberDuesDetailsId);
  if (!subscription) return "";
  const member = dataRows("members").find((item) => item.id === subscription.memberId) || {};
  const period = memberSubscriptionSelectedPeriod();
  const cycleLabel = typeof currentMembershipCycleLabel === "function" ? currentMembershipCycleLabel(period) : membershipPeriodLabel(period);
  return `
    <div class="dialog-backdrop" role="presentation">
      <section class="dialog-panel subscription-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="memberDuesDetailsTitle">
        <div class="panel-heading">
          <div>
            <h2 id="memberDuesDetailsTitle">Subscription payment details</h2>
            <p>Read-only payment status for this member's current SACCO subscription cycle.</p>
          </div>
          <button class="button ghost" type="button" data-action="close-member-dues-details-dialog">Close</button>
        </div>
        <div class="source-grid">
          ${mini("Member", member.fullName || member.membershipNo || subscription.memberId)}
          ${mini("Membership number", member.membershipNo || "-")}
          ${mini("Phone", member.phone || "-")}
          ${mini("Plan", subscription.planName || "Member subscription")}
          ${mini("Cycle", `${membershipPeriodLabel(period)} - ${cycleLabel}`)}
          ${mini("Amount", money.format(subscription.amount || 0))}
          ${mini("Paid", money.format(subscription.paid || 0))}
          ${mini("Balance", money.format(subscription.balanceDue || 0))}
          ${mini("Payment status", labelize(subscription.status || "active"))}
          ${mini("Start date", subscription.startDate ? formatDate(subscription.startDate) : "-")}
          ${mini("Expiry", subscription.expiry ? formatDate(subscription.expiry) : "No expiry")}
          ${mini("Last updated", subscription.updatedAt ? formatDateTime(subscription.updatedAt) : "-")}
        </div>
        <div class="form-actions inline">
          <button class="button secondary" type="button" data-action="close-member-dues-details-dialog">Close</button>
        </div>
      </section>
    </div>
  `;
}

function subscriptionPaymentProviderOptions() {
  const configured = state.data.mobileMoneyIntegrationConfig?.providers || [];
  const active = configured
    .filter((provider) => provider.active !== false)
    .map((provider) => provider.provider || provider.activeProvider || provider.channel)
    .filter(Boolean);
  const base = active.length ? active : ["mtn", "airtel"];
  return base.map((provider) => ({
    value: String(provider).toLowerCase(),
    label: mobileMoneyProviderLabel(provider)
  }));
}

function subscriptionPaymentContext(id) {
  if (String(id || "").startsWith("member:")) {
    const memberId = String(id).slice("member:".length);
    return {
      member: dataRows("members").find((item) => item.id === memberId),
      subscription: null
    };
  }
  const subscription = dataRows("memberSubscriptions").find((item) => item.id === id);
  return {
    subscription,
    member: subscription ? dataRows("members").find((item) => item.id === subscription.memberId) : null
  };
}

function mobileMoneyProviderLabel(provider) {
  const text = String(provider || "default").toLowerCase();
  if (text.includes("mtn")) return "MTN MoMo";
  if (text.includes("airtel")) return "Airtel Money";
  if (text.includes("mpesa") || text.includes("m-pesa")) return "M-Pesa";
  return labelize(provider || "Default provider");
}

function memberDuesFilterToolbar(rows) {
  const selected = state.memberDuesFilter || "all";
  const period = memberSubscriptionSelectedPeriod();
  const selectedYear = memberSubscriptionSelectedYear();
  const selectedMonth = memberSubscriptionSelectedMonth();
  const yearOptions = memberSubscriptionYearOptions();
  const cycleClosed = memberSubscriptionCycleClosed(period);
  const count = (filter) => rows.filter((row) => memberDuesFilterMatch(row, filter)).length;
  const options = [
    ["all", `All members (${rows.length})`],
    ["paid", `Paid (${count("paid")})`],
    ["unpaid", `Unpaid (${count("unpaid")})`],
    ["pending", `Pending payment (${count("pending")})`],
    ["exemption", `Exemption requested (${count("exemption")})`],
    ["not_renewing", `Not renewing (${count("not_renewing")})`]
  ];
  return `
    <section class="filter-toolbar compact-toolbar">
      <label><span>Cycle type</span><input value="${escapeHtml(membershipPeriodLabel(period))}" readonly></label>
      <label><span>Cycle status</span><input value="${escapeHtml(period === "once" ? "Lifetime active members" : cycleClosed ? "Closed - payment disabled" : "Open for payment")}" readonly></label>
      <label><span>Subscription status / cycle</span><select data-member-dues-filter>${options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>
    </section>
  `;
}

function memberDuesFilterMatch(row, filter) {
  if (filter === "paid") return row.statusKey === "paid";
  if (filter === "unpaid") return ["unpaid", "historical_unpaid"].includes(row.statusKey);
  if (filter === "pending") return row.statusKey === "pending_payment";
  if (filter === "exemption") return row.statusKey === "exemption_requested";
  if (filter === "not_renewing") return row.statusKey === "not_renewing";
  return true;
}

function memberSubscriptionSelectedPeriod() {
  return normalizeMembershipPeriod(state.data.saccoProfile?.membershipDuesPeriod || "annual");
}

function memberSubscriptionSelectedYear() {
  const currentYear = new Date().getFullYear();
  const value = Number(state.saccoCycleYear || state.memberSubscriptionYear || currentYear);
  return Number.isFinite(value) && value > 2000 ? value : currentYear;
}

function memberSubscriptionSelectedMonth() {
  const currentMonth = new Date().getMonth() + 1;
  const value = Number(state.saccoCycleMonth || state.memberSubscriptionMonth || currentMonth);
  return Number.isFinite(value) && value >= 1 && value <= 12 ? value : currentMonth;
}

function memberSubscriptionCycleClosed(period = memberSubscriptionSelectedPeriod()) {
  if (period === "once") return false;
  const now = new Date();
  const year = memberSubscriptionSelectedYear();
  if (period === "annual") return year < now.getFullYear();
  if (period === "monthly") {
    return year < now.getFullYear() || (year === now.getFullYear() && memberSubscriptionSelectedMonth() < now.getMonth() + 1);
  }
  return false;
}

function memberSubscriptionYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
}

function memberSubscriptionMonthOptions() {
  return Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    const label = new Date(memberSubscriptionSelectedYear(), index, 1).toLocaleDateString(currentRegion().locale, { month: "long" });
    return [value, label];
  });
}

function memberDuesPaymentPanel(subscriptions, selectedSub) {
  const suggestedAmount = selectedSub ? Number(selectedSub.balanceDue || selectedSub.amount || 0) : 0;
  const disabled = subscriptions.length ? "" : "disabled";
  return `<section class="panel">
    <div class="panel-heading">
      <div><h2>Collect subscription payment</h2><p>Record cash, bank, mobile-money or office payment against the selected member subscription.</p></div>
      <span class="status ${subscriptions.length ? "pending" : "active"}">${subscriptions.length ? "Collection queue" : "Paid up"}</span>
    </div>
    <form id="memberDuesPayForm" class="form-grid">
      <label><span>Subscription</span><select id="memberDuesPayId" data-member-dues-select ${disabled}>${subscriptions.length ? subscriptions.map((sub) => `<option value="${escapeHtml(sub.id)}" ${selectedSub?.id === sub.id ? "selected" : ""}>${escapeHtml(memberName(sub.memberId))} - ${escapeHtml(sub.planName)} (${escapeHtml(money.format(sub.balanceDue || 0))} due)</option>`).join("") : `<option>No payment due</option>`}</select></label>
      <label><span>Amount</span><input id="memberDuesPayAmount" type="number" min="1" step="0.01" value="${escapeHtml(String(suggestedAmount || ""))}" readonly ${disabled}></label>
      <label><span>Payment method</span><select id="memberDuesPayMethod" ${disabled}><option value="cash">Treasurer cash</option><option value="mobile_money">Mobile money</option><option value="bank">Bank deposit</option><option value="office">Office receipt</option></select></label>
      <label><span>Reference</span><input id="memberDuesPayReference" placeholder="Receipt, transaction ID or bank slip" ${disabled}></label>
      <div class="source-grid">
        ${mini("Selected member", selectedSub ? memberName(selectedSub.memberId) : "None")}
        ${mini("Balance due", selectedSub ? money.format(selectedSub.balanceDue || 0) : "None")}
        ${mini("Expiry", selectedSub?.expiry ? formatDate(selectedSub.expiry) : "Not set")}
        ${mini("Lifecycle", selectedSub ? labelize(selectedSub.lifecycleState || selectedSub.status || "") : "None")}
      </div>
      <div class="form-actions inline"><button class="button primary" type="button" data-pay-member-dues="1" ${disabled}>Record payment</button></div>
    </form>
    ${subscriptions.length ? "" : emptyState("No payment due", "There are no payable or renewing member subscriptions right now.")}
  </section>`;
}

function memberDuesReadOnlyPanel(title, copy) {
  return `<section class="panel"><div class="panel-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div><span class="status pending">View only</span></div></section>`;
}

function selectedMemberDuesSubscription(subscriptions) {
  if (!subscriptions.length) return null;
  return subscriptions.find((sub) => sub.id === state.selectedMemberDuesId) || subscriptions[0];
}

function memberDuesSummary(subs) {
  return {
    total: subs.length,
    paidUp: subs.filter((sub) => Number(sub.balanceDue || 0) <= 0 && !["expired", "grace"].includes(sub.lifecycleState || "")).length,
    outstanding: subs.reduce((total, sub) => total + Number(sub.balanceDue || 0), 0),
    expired: subs.filter((sub) => ["expired", "grace"].includes(sub.lifecycleState || "") || sub.status === "expired").length
  };
}

function memberDuesDaysLabel(sub) {
  if ((sub.billingPeriod || "").toLowerCase() === "once") return "One-time";
  const days = sub.daysToExpiry;
  if (days === null || days === undefined || days === "") return "No expiry";
  const numeric = Number(days);
  if (Number.isNaN(numeric)) return "No expiry";
  if (numeric < 0) return `${Math.abs(numeric)} day(s) overdue`;
  if (numeric === 0) return "Expires today";
  return `${numeric} day(s) left`;
}

function memberDuesReadiness(sub) {
  const balance = Number(sub.balanceDue || 0);
  const lifecycle = sub.lifecycleState || sub.status || "";
  if (balance > 0) return "Payment due";
  if (["expiring", "grace", "expired"].includes(lifecycle)) return "Renewal follow-up";
  return "Current";
}

function memberNeedsApproval(memberId) {
  const member = dataRows("members").find((item) => item.id === memberId);
  return member && !["active", "suspended", "exited"].includes(String(member.status || "").toLowerCase());
}

function memberDuesQueueRow(sub) {
  return {
    memberName: memberName(sub.memberId),
    planName: sub.planName,
    balanceDue: money.format(sub.balanceDue || 0),
    lifecycle: labelize(sub.lifecycleState || sub.status || ""),
    daysToExpiry: memberDuesDaysLabel(sub),
    paymentReadiness: memberDuesReadiness(sub),
    action: "member-dues-pay",
    actionLabel: Number(sub.balanceDue || 0) > 0 ? "Collect" : "Review",
    actionId: sub.id
  };
}

function memberDuesApprovalRow(sub) {
  return {
    memberName: memberName(sub.memberId),
    planName: sub.planName,
    paid: money.format(sub.paid || 0),
    status: "Paid - approve member",
    paymentReadiness: "Ready for approval",
    action: "member-detail",
    actionLabel: "Approve",
    actionId: sub.memberId
  };
}

function memberRegistrationPanel() {
  const branches = dataRows("branches");
  const defaultBranch = branches[0]?.id || "";
  return `
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Member registration</h2>
          <p>Create a member profile and login credential. Members entered by SACCO staff are active on registration.</p>
        </div>
      </div>
      ${state.memberFormMessage ? `<div class="notice compact"><strong>${escapeHtml(state.memberFormMessage)}</strong></div>` : ""}
      ${state.memberFormError ? `<div class="notice warning"><strong>Member registration failed.</strong><span>${escapeHtml(state.memberFormError)}</span></div>` : ""}
      <form id="memberRegistrationForm" class="form-grid">
        <input type="hidden" id="newMemberTenantId" value="${escapeHtml(state.user?.tenantId || "")}">
        <label><span>Membership number</span><input id="newMemberNo" placeholder="Auto if blank"></label>
        <label><span>Branch</span><select id="newMemberBranchId">${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === defaultBranch ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
        <label><span>Full name</span><input id="newMemberFullName" required placeholder="Member full name"></label>
        <label><span>Member type</span><select id="newMemberType">${memberTypeOptions().map((type) => `<option value="${escapeHtml(type.value)}">${escapeHtml(type.label)}</option>`).join("")}</select></label>
        <label><span>Phone</span><input id="newMemberPhone" required placeholder="+256..."></label>
        <label><span>Email</span><input id="newMemberEmail" type="email" placeholder="member@example.com"></label>
        <label><span>National ID</span><input id="newMemberNationalId" placeholder="CM..."></label>
        <label><span>Temporary password</span><input id="newMemberPassword" type="password" value="Member@12345"></label>
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
      mode === "statement" ? "No member selected for statement" : mode === "contacts" ? "No member selected for contacts" : "No member selected",
      "Open a member from the Member List tab to review this section."
    );
  }
  const canManage = hasPermission("members:approve") || roleKind() === "admin" || roleKind() === "secretary";
  const canEditProfile = canManage || hasPermission("members:create");
  const branches = dataRows("branches");
  const statementLines = state.selectedMemberStatement?.lines || [];
  const statementSummary = buildMemberStatementSummary(member, statementLines);
  const title = mode === "contacts" ? "Member contacts and documents" : mode === "statement" ? "Member balance statement" : "Member detail";
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
      ${memberDetailIdentityHeader(member, mode, statementSummary)}
      ${mode === "kyc" ? `
        <div class="member-detail-layout">
          <section class="member-detail-card">
            <div class="member-section-heading"><h3>Profile information</h3><span>${canEditProfile ? "Editable" : "Read only"}</span></div>
            <form id="memberProfileForm" class="form-grid member-compact-form">
              <input type="hidden" id="selectedMemberProfileId" value="${escapeHtml(member.id)}">
              <label><span>Membership number</span><input value="${escapeHtml(member.membershipNo || "")}" readonly></label>
              <label><span>Branch</span><select id="selectedMemberBranchId" ${canEditProfile ? "" : "disabled"}>${branches.map((branch) => `<option value="${escapeHtml(branch.id)}" ${branch.id === member.branchId ? "selected" : ""}>${escapeHtml(branch.name || branch.code)}</option>`).join("")}</select></label>
              <label><span>Full name</span><input id="selectedMemberFullName" required value="${escapeHtml(member.fullName || "")}" ${canEditProfile ? "" : "readonly"}></label>
              <label><span>Member type</span><select id="selectedMemberType" ${canEditProfile ? "" : "disabled"}>${memberTypeOptions().map((type) => `<option value="${type.value}" ${type.value === member.memberType ? "selected" : ""}>${type.label}</option>`).join("")}</select></label>
              <label><span>Phone</span><input id="selectedMemberPhone" required value="${escapeHtml(member.phone || "")}" ${canEditProfile ? "" : "readonly"}></label>
              <label><span>Email</span><input id="selectedMemberEmail" type="email" value="${escapeHtml(member.email || "")}" ${canEditProfile ? "" : "readonly"}></label>
              <label><span>National ID</span><input id="selectedMemberNationalId" value="${escapeHtml(member.nationalId || "")}" ${canEditProfile ? "" : "readonly"}></label>
              <label><span>Joining date</span><input id="selectedMemberJoiningDate" type="date" value="${escapeHtml(String(member.joiningDate || "").slice(0, 10))}" ${canEditProfile ? "" : "readonly"}></label>
              <div class="form-actions inline">
                ${canEditProfile ? `<button class="button primary" type="submit">Save member profile</button>` : `<span class="status pending">Profile view only</span>`}
              </div>
            </form>
          </section>
          <section class="member-detail-card compact">
            <div class="member-section-heading"><h3>Membership status</h3><span>${labelize(member.status || "review")}</span></div>
            <form id="memberStatusForm" class="form-grid single">
              <input type="hidden" id="selectedMemberId" value="${escapeHtml(member.id)}">
              <label><span>Status</span><select id="selectedMemberStatus" ${canManage ? "" : "disabled"}>${memberStatusOptions().map((status) => `<option value="${status.value}" ${status.value === member.status ? "selected" : ""}>${status.label}</option>`).join("")}</select></label>
              <div class="form-actions">
                ${canManage ? `
                  <button class="button primary" type="submit">Save member status</button>
                  <button class="button secondary" type="button" data-member-decision="approve">Approve member</button>
                  <button class="button secondary" type="button" data-member-decision="changes">Request changes</button>
                  <button class="button ghost" type="button" data-member-decision="suspend">Suspend member</button>
                ` : `<span class="status pending">View only</span>`}
              </div>
            </form>
          </section>
          ${selectedMemberRegistrationFormExportPanel(member)}
        </div>
        ${memberStaffLinkPanel(member, canManage)}
      ` : ""}
      ${mode === "contacts" ? `
        <div class="member-detail-layout">
          ${memberDocumentUploadPanel(member)}
          ${memberDocumentRetentionPanel(member)}
          <section class="member-detail-card">
            <div class="member-section-heading"><h3>Documents</h3><span>${state.selectedMemberDocuments.length} file(s)</span></div>
            ${recordTable("Member documents", buildMemberDocumentRows(state.selectedMemberDocuments || [], labelize, formatDateTime), ["documentType", "verificationStatus", "retentionStatus"])}
          </section>
          <section class="member-detail-card">
            <div class="member-section-heading"><h3>Next of kin</h3><span>${state.selectedMemberNextOfKin.length} contact(s)</span></div>
            ${recordTable("Member contacts and next of kin", state.selectedMemberNextOfKin, ["fullName", "relationship", "phone", "primaryContact"])}
          </section>
          <section class="member-detail-card">
            <div class="member-section-heading"><h3>Beneficiaries</h3><span>${state.selectedMemberBeneficiaries.length} record(s)</span></div>
            ${recordTable("Member beneficiaries", state.selectedMemberBeneficiaries, ["fullName", "relationship", "phone", "allocationPercent"])}
          </section>
        </div>
      ` : ""}
      ${mode === "statement" ? `
        ${memberStatementControlPanel(member, statementLines, statementSummary)}
        ${memberStatementReceiptPanel(statementLines)}
        ${staffStatementExportPanel(member, statementLines)}
        ${filterToolbar("Search statement by reference, channel, type, amount or date", "Download CSV", "Print statement")}
        ${recordTable("Member balance statement", statementLines, ["reference", "type", "channel", "amount", "savingsBalance", "sharesBalance", "welfareBalance", "postedAt"])}
      ` : ""}
    </section>
  `;
}

function memberDocumentUploadPanel(member) {
  const canManage = hasPermission("members:create") || hasPermission("members:approve") || roleKind() === "secretary" || roleKind() === "admin";
  const typeOptions = [
    ["national_id", "National ID"],
    ["photo", "Photo"],
    ["signature", "Signature"],
    ["signed_registration_form", "Signed registration form"],
    ["bylaws", "Bylaws"],
    ["registration_certificate", "Registration certificate"],
    ["other", "Other"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Attach member document</h2>
          <p>Upload passport photos, National ID copies, signatures and other KYC soft copies.</p>
        </div>
        <span class="status ${canManage ? "active" : "pending"}">${canManage ? "Can attach" : "View only"}</span>
      </div>
      <form id="memberDocumentForm" class="form-grid">
        <input type="hidden" id="memberDocumentMemberId" value="${escapeHtml(member.id)}">
        <label><span>Document type</span><select id="memberDocumentType" ${canManage ? "" : "disabled"}>${typeOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
        <label><span>Soft copy file</span><input id="memberDocumentFile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" ${canManage ? "" : "disabled"}></label>
        <label><span>Secure URL / reference</span><input id="memberDocumentStorageKey" ${canManage ? "" : "readonly"} placeholder="Optional legacy document URL or storage reference"></label>
        <label><span>Verification</span><select id="memberDocumentVerificationStatus" ${canManage ? "" : "disabled"}>${kycStatusOptions().map((status) => `<option value="${status.value}">${status.label}</option>`).join("")}</select></label>
        <div class="form-actions inline">
          ${canManage ? `<button class="button primary" type="submit">Upload soft copy</button>` : `<span class="status pending">Document view only</span>`}
        </div>
      </form>
      <p class="hint">Maximum file size is 1 MB. Accepted files: JPG, PNG, WEBP and PDF. Use Photo for passport photos so the registration form can include the image.</p>
    </section>
  `;
}

function selectedMemberRegistrationFormExportPanel(member) {
  const photo = (state.selectedMemberDocuments || []).find((document) => normal(document.documentType) === "photo" && normal(document.retentionStatus || "active") !== "disposed");
  const signedForm = (state.selectedMemberDocuments || []).find((document) => normal(document.documentType) === "signed_registration_form" && normal(document.retentionStatus || "active") !== "disposed");
  return `
    <section class="member-detail-card compact">
      <div class="member-section-heading"><h3>Registration form</h3><span>${signedForm ? "Signed copy on file" : "Ready to print"}</span></div>
      <p class="hint">Export this member's registration page, print it, let the member sign, then upload the signed copy under Contacts & Documents.</p>
      <div class="source-grid compact">
        ${mini("Passport photo", photo ? "On file" : "Not uploaded")}
        ${mini("Signed form", signedForm ? "Uploaded" : "Pending")}
      </div>
      <div class="form-actions inline">
        <button class="button primary" type="button" data-action="export-member-registration-form-pdf" data-member-id="${escapeHtml(member.id)}">Export registration form PDF</button>
        <button class="button secondary" type="button" data-action="open-selected-member-documents" data-member-id="${escapeHtml(member.id)}">Upload signed copy</button>
      </div>
    </section>
  `;
}

function memberDetailIdentityHeader(member, mode, statementSummary) {
  const branch = dataRows("branches").find((item) => item.id === member.branchId);
  const facts = mode === "statement"
    ? [
      ["Savings", money.format(member.savingsBalance || 0)],
      ["Shares", money.format(member.sharesBalance || 0)],
      ["Welfare", money.format(member.welfareBalance || 0)],
      ["Last activity", statementSummary.lastMovement]
    ]
    : [
      ["Status", labelize(member.status || "review")],
      ["Member type", labelize(member.memberType || "member")],
      ["Phone", member.phone || "-"],
      ["National ID", member.nationalId || "-"]
    ];
  return `
    <section class="member-identity-strip">
      <div>
        <span>${escapeHtml(member.membershipNo || "Membership number pending")}</span>
        <strong>${escapeHtml(member.fullName || "Unnamed member")}</strong>
        <small>${escapeHtml(branch?.name || branch?.code || "Branch not set")}${member.email ? ` / ${escapeHtml(member.email)}` : ""}</small>
      </div>
      <div class="member-identity-facts">
        ${facts.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value || "-"))}</strong></div>`).join("")}
      </div>
    </section>
  `;
}

function memberDocumentRetentionPanel(member) {
  const documents = state.selectedMemberDocuments || [];
  const retention = buildMemberDocumentRetentionSummary(documents);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Document retention</h2>
          <p>Control expired member documents without deleting audit history for ${escapeHtml(member.membershipNo || "member")}.</p>
        </div>
        <span class="status ${retention.reviewDue || retention.disposalPending ? "pending" : "active"}">${retention.reviewDue || retention.disposalPending ? "Review needed" : "Current"}</span>
      </div>
      <div class="source-grid">
        ${mini("Documents", retention.documents)}
        ${mini("Review due", retention.reviewDue)}
        ${mini("Disposal pending", retention.disposalPending)}
        ${mini("Disposed markers", retention.disposed)}
      </div>
      <p>Use Dispose only after the external file has been removed or legally placed beyond access in the document store.</p>
    </section>
  `;
}

function memberStatementControlPanel(member, lines, statementSummary) {
  return `
    <section class="member-detail-card">
      <div class="panel-heading">
        <div>
          <h2>Statement control summary</h2>
          <p>Selected member balances and posted activity.</p>
        </div>
        <span class="status active">${lines.length} line(s)</span>
      </div>
      <div class="member-statement-totals">
        ${mini("Savings balance", money.format(member.savingsBalance || 0))}
        ${mini("Shares balance", money.format(member.sharesBalance || 0))}
        ${mini("Welfare balance", money.format(member.welfareBalance || 0))}
        ${mini("Posted credits", money.format(statementSummary.creditTotal))}
        ${mini("Posted debits", money.format(statementSummary.debitTotal))}
      </div>
    </section>
  `;
}

function memberStatementReceiptPanel(lines) {
  const receiptSummary = buildMemberReceiptEvidenceSummary(lines);
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Receipt evidence summary</h2>
          <p>Receipt readiness by posted statement line, mobile-money evidence and Treasurer office posting.</p>
        </div>
        <span class="status ${receiptSummary.receiptRows ? "active" : "pending"}">${receiptSummary.receiptRows ? "Receipts ready" : "Awaiting receipts"}</span>
      </div>
      <div class="source-grid">
        ${mini("Receipt-ready lines", receiptSummary.receiptRows)}
        ${mini("Mobile-money evidence", receiptSummary.mobileRows)}
        ${mini("Treasurer receipt evidence", receiptSummary.treasurerRows)}
        ${mini("Last receipt reference", receiptSummary.lastReceipt)}
      </div>
    </section>
  `;
}

function staffStatementExportPanel(member, lines) {
  return `
    <section class="member-detail-card compact">
      <div class="panel-heading">
        <div>
          <h2>Staff statement export controls</h2>
          <p>Download this selected member's statement.</p>
        </div>
        <span class="status ${lines.length ? "active" : "pending"}">${lines.length ? "Ready" : "No activity"}</span>
      </div>
      <div class="form-actions inline">
        <button class="button primary" type="button" data-staff-statement-export="csv" data-member-id="${escapeHtml(member.id)}">Download CSV</button>
        <button class="button secondary" type="button" data-staff-statement-export="excel" data-member-id="${escapeHtml(member.id)}">Download Excel</button>
        <button class="button ghost" type="button" data-staff-statement-export="pdf" data-member-id="${escapeHtml(member.id)}">Download PDF</button>
        <button class="button secondary" type="button" data-staff-statement-print="statement">Print statement</button>
      </div>
    </section>
  `;
}

function memberStaffLinkPanel(member, canManage) {
  const staffSource = dataRows("users").length ? dataRows("users") : dataRows("staffDirectory");
  const tenantUsers = staffSource.filter((user) => user.tenantId === member.tenantId);
  const linked = member.linkedUserId || "";
  const linkedUser = tenantUsers.find((user) => user.id === linked);
  const picker = tenantUsers.length
    ? `<select id="memberStaffLinkUserId" ${canManage ? "" : "disabled"}>
        <option value="">Not linked</option>
        ${tenantUsers.map((user) => `<option value="${escapeHtml(user.id)}" ${user.id === linked ? "selected" : ""}>${escapeHtml(user.fullName || user.email || user.id)}${user.email ? ` (${escapeHtml(user.email)})` : ""}</option>`).join("")}
      </select>`
    : `<input id="memberStaffLinkUserId" placeholder="Staff user ID (leave blank to unlink)" value="${escapeHtml(linked)}" ${canManage ? "" : "readonly"}>`;
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>Staff account link</h2>
          <p>Link this member to their staff login if they are also SACCO staff. A linked staff member cannot approve, disburse or decide their own loans or transactions.</p>
        </div>
        ${linked ? `<span class="status active">Linked</span>` : `<span class="status pending">Not linked</span>`}
      </div>
      ${state.memberStaffLinkError ? `<div class="notice warning"><span>${escapeHtml(state.memberStaffLinkError)}</span></div>` : ""}
      ${state.memberStaffLinkMessage ? `<div class="notice compact"><span>${escapeHtml(state.memberStaffLinkMessage)}</span></div>` : ""}
      <form id="memberStaffLinkForm" class="form-grid single">
        <input type="hidden" id="memberStaffLinkMemberId" value="${escapeHtml(member.id)}">
        <label><span>Staff user</span>${picker}</label>
        <div class="form-actions inline">
          ${canManage ? `<button class="button primary" type="submit">Save staff link</button>` : `<span class="status pending">View only</span>`}
        </div>
      </form>
      ${linked ? `<p class="hint">Currently linked to ${escapeHtml(linkedUser ? (linkedUser.fullName || linkedUser.email || linked) : linked)}.</p>` : ""}
    </section>
  `;
}
