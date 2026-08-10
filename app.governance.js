// Governance meeting and resolution rendering extracted from app.js.

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
  const tabs = [["setup", t("governanceMeetingSetup")], ["register", t("governanceMeetingRegister")], ["resolutions", t("resolutionActionList")], ["detail", t("governanceMeetingDetail")]];
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

