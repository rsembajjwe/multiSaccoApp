function buildGovernanceMeetingRows(input) {
  return (input.meetings || []).map((meeting) => {
    const id = String(meeting.id || "");
    const chairMemberId = String(meeting.chairMemberId || "");
    const chairUserId = String(meeting.chairUserId || "");
    const memberChairName = input.memberName?.(chairMemberId);
    const chairName = memberChairName && memberChairName !== chairMemberId
      ? memberChairName
      : input.userName(chairUserId);
    return {
      ...meeting,
      id,
      chairName,
      action: "governance-meeting-detail",
      actionLabel: "Open",
      actionId: id
    };
  });
}

function buildGovernanceResolutionRows(meetings, input = {}) {
  return meetings.flatMap((meeting) => (meeting.resolutions || []).map((resolution) => ({
    ...resolution,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    ownerName: resolution.ownerName || input.memberName?.(String(resolution.ownerMemberId || "")) || input.userName?.(String(resolution.ownerUserId || "")) || "Unassigned",
    ownerTitle: resolution.ownerTitle || input.memberTitle?.(String(resolution.ownerMemberId || "")) || "Responsible person"
  })));
}

function buildMeetingResolutionRows(meeting, input = {}) {
  return (meeting?.resolutions || []).map((resolution) => ({
    ...resolution,
    ownerName: resolution.ownerName || input.memberName?.(String(resolution.ownerMemberId || "")) || input.userName?.(String(resolution.ownerUserId || "")) || "Unassigned",
    ownerTitle: resolution.ownerTitle || input.memberTitle?.(String(resolution.ownerMemberId || "")) || "Responsible person"
  }));
}

function governanceUserOptions(users, tenantId) {
  return users
    .filter((user) => !tenantId || user.tenantId === tenantId)
    .map((user) => ({
      ...user,
      id: user.id,
      label: String(user.fullName || user.email || user.username || user.id || "Staff user")
    }));
}

function meetingTypeOptions() {
  return ["board", "agm", "credit_committee", "audit_committee", "management"];
}

function governanceScheduledMeetings(meetings) {
  return meetings.filter((row) => normalizeGovernanceModelText(row.status) === "scheduled");
}

function governanceCompletedMeetings(meetings) {
  return meetings.filter((row) => normalizeGovernanceModelText(row.status) === "completed");
}

function governanceOpenResolutions(resolutions) {
  return resolutions.filter((row) => normalizeGovernanceModelText(row.status) !== "closed");
}

function buildGovernanceSummary(meetings, resolutions, now = new Date()) {
  const openResolutions = governanceOpenResolutions(resolutions);
  return {
    completed: governanceCompletedMeetings(meetings).length,
    openResolutions: openResolutions.length,
    overdueResolutions: openResolutions.filter((resolution) => isGovernanceResolutionOverdue(resolution, now)).length,
    scheduled: governanceScheduledMeetings(meetings).length,
    totalMeetings: meetings.length,
    withMinutes: meetings.filter((meeting) => meeting.minutes).length
  };
}

function governanceCyclePeriod(period) {
  const value = normalizeGovernanceModelText(period);
  if (value === "once") return "once";
  if (value === "monthly") return "monthly";
  return "annual";
}

function governanceCycleContext(profile = {}, input = {}, now = new Date()) {
  const safeProfile = profile || {};
  const period = governanceCyclePeriod(safeProfile.membershipDuesPeriod || "annual");
  const selectedYear = governanceCycleSelectedYear(input.year, now);
  const selectedMonth = governanceCycleSelectedMonth(input.month, now);
  if (period === "once") {
    return {
      period,
      year: selectedYear,
      month: selectedMonth,
      label: "Lifetime",
      start: null,
      end: null
    };
  }
  const startMonth = period === "monthly" ? selectedMonth - 1 : 0;
  const start = new Date(selectedYear, startMonth, 1);
  const end = period === "monthly"
    ? new Date(selectedYear, startMonth + 1, 1)
    : new Date(selectedYear + 1, 0, 1);
  return {
    period,
    year: selectedYear,
    month: selectedMonth,
    label: period === "monthly"
      ? new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString(currentRegion().locale, { month: "long", year: "numeric" })
      : String(selectedYear),
    start,
    end
  };
}

function currentSaccoCycleContext(input = {}, now = new Date()) {
  return governanceCycleContext(state.data.saccoProfile, {
    year: input.year ?? state.saccoCycleYear,
    month: input.month ?? state.saccoCycleMonth
  }, now);
}

function setSaccoCycleSelection(year, month) {
  if (year !== undefined && year !== null && year !== "") {
    state.saccoCycleYear = Number(year);
    state.reportCycleYear = Number(year);
    state.governanceCycleYear = Number(year);
    state.memberSubscriptionYear = Number(year);
  }
  if (month !== undefined && month !== null && month !== "") {
    state.saccoCycleMonth = Number(month);
    state.reportCycleMonth = Number(month);
    state.governanceCycleMonth = Number(month);
    state.memberSubscriptionMonth = Number(month);
  }
}

function saccoCyclePanel(cycle, options = {}) {
  if (!cycle || isPlatform()) return "";
  const periodLabel = typeof membershipPeriodLabel === "function"
    ? membershipPeriodLabel(cycle.period)
    : labelize(cycle.period);
  const selectedYear = Number(cycle.year);
  const selectedMonth = Number(cycle.month);
  const title = options.title || "SACCO working cycle";
  return `
    <section class="filter-toolbar compact-toolbar sacco-cycle-toolbar">
      <label><span>${escapeHtml(title)}</span><input value="${escapeHtml(periodLabel)}" readonly></label>
      ${cycle.period !== "once" ? `<label><span>Year</span><select data-sacco-cycle-year>${governanceCycleYearOptions().map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}</select></label>` : ""}
      ${cycle.period === "monthly" ? `<label><span>Month</span><select data-sacco-cycle-month>${governanceCycleMonthOptions(currentRegion().locale).map(([value, label]) => `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>` : ""}
      <label><span>Period in view</span><input value="${escapeHtml(cycle.label)}" readonly></label>
    </section>
  `;
}

function rowsInSaccoCycle(rows, cycle, dateKeys) {
  if (!cycle || cycle.period === "once") return rows || [];
  return (rows || []).filter((row) => {
    const values = dateKeys.map((key) => row[key]).filter(Boolean);
    if (!values.length) return true;
    return values.some((value) => governanceDateFallsInCycle(value, cycle));
  });
}

function filterMembersBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["joiningDate", "createdAt", "registeredAt"]);
}

function filterTransactionsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["postedAt", "transactionDate", "createdAt"]);
}

function filterLoansBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["disbursedAt", "approvedAt", "submittedAt", "createdAt"]);
}

function filterExpensesBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["expenseDate", "createdAt"]);
}

function filterAssetsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["acquiredAt", "purchaseDate", "createdAt"]);
}

function filterJournalsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["postedAt", "createdAt"]);
}

function filterCallbacksBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["receivedAt", "createdAt"]);
}

function filterFundingSourcesBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["dateReceived", "createdAt", "updatedAt"]);
}

function filterFinancialAccountsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["openedAt", "createdAt"]);
}

function filterWelfareClaimsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["submittedAt", "approvedAt", "paidAt", "createdAt"]);
}

function filterComplaintsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["updatedAt", "createdAt"]);
}

function filterApprovalsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["submittedAt", "requestedAt", "postedAt", "createdAt", "receivedAt"]);
}

function filterPaymentRequestsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["requestedAt", "completedAt", "createdAt"]);
}

function filterNotificationsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["sentAt", "createdAt", "updatedAt"]);
}

function filterAuditEventsBySaccoCycle(rows, cycle) {
  return rowsInSaccoCycle(rows, cycle, ["createdAt"]);
}

function governanceCycleSelectedYear(value, now = new Date()) {
  const currentYear = now.getFullYear();
  const year = Number(value || currentYear);
  return Number.isFinite(year) && year > 2000 ? year : currentYear;
}

function governanceCycleSelectedMonth(value, now = new Date()) {
  const currentMonth = now.getMonth() + 1;
  const month = Number(value || currentMonth);
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : currentMonth;
}

function governanceCycleYearOptions(now = new Date()) {
  const currentYear = now.getFullYear();
  return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
}

function governanceCycleMonthOptions(locale = currentRegion().locale) {
  return Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;
    const label = new Date(governanceCycleSelectedYear(), index, 1).toLocaleDateString(locale, { month: "long" });
    return [value, label];
  });
}

function filterGovernanceMeetingsByCycle(meetings, cycle) {
  if (!cycle || cycle.period === "once") return meetings;
  return meetings.filter((meeting) => {
    const date = meeting.rawScheduledAt || meeting.scheduledAt || meeting.createdAt;
    return date ? governanceDateFallsInCycle(date, cycle) : true;
  });
}

function governanceDateFallsInCycle(value, cycle) {
  if (!cycle || cycle.period === "once") return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= cycle.start && date < cycle.end;
}

function isGovernanceResolutionOverdue(resolution, now = new Date()) {
  return Boolean(resolution.dueDate && new Date(resolution.dueDate) < now);
}

function normalizeGovernanceModelText(value) {
  return String(value || "").toLowerCase();
}
