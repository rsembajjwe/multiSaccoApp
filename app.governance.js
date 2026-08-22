// Governance meeting and resolution rendering extracted from app.js.

function governanceView() {
  const meetings = buildGovernanceMeetingRows({ meetings: dataRows("governanceMeetings"), memberName, userName });
  const cycle = currentSaccoCycleContext();
  const cycleMeetings = filterGovernanceMeetingsByCycle(meetings, cycle);
  const resolutions = buildGovernanceResolutionRows(cycleMeetings, { memberName, memberTitle: governanceMemberTitle, userName });
  const scheduled = governanceScheduledMeetings(cycleMeetings);
  const openResolutions = governanceOpenResolutions(resolutions);
  const governanceSummary = buildGovernanceSummary(cycleMeetings, resolutions);
  const tabs = [["overview", "Overview"], ["setup", t("governanceMeetingSetup")], ["register", t("governanceMeetingRegister")], ["resolutions", t("resolutionActionList")], ["detail", t("governanceMeetingDetail")]];
  const tab = activeModuleTab("governance", tabs);
  return `
    ${saccoCyclePanel(cycle, { title: "Governance cycle" })}
    <div class="dashboard-grid">
      ${summary(t("meetings"), governanceSummary.totalMeetings, "Board, AGM and committee records", t("open"))}
      ${summary(t("scheduledMeetings"), governanceSummary.scheduled, "Upcoming governance events", "Prepare")}
      ${summary(t("openResolutions"), governanceSummary.openResolutions, "Action items needing follow-up", "Track")}
      ${summary(t("completedMeetings"), governanceSummary.completed, "Minutes and decisions", t("review"))}
    </div>
    ${moduleTabs("governance", tabs, tab)}
    ${tab === "overview" ? governanceActionControlPanel(governanceSummary) : ""}
    ${tab === "setup" ? governanceMeetingPanel() : ""}
    ${tab === "detail" ? (governanceMeetingDetailPanel(cycleMeetings) || emptyState("Governance meeting detail", "Select a meeting from the current SACCO cycle to record resolutions and decisions.")) : ""}
    ${tab === "register" ? recordTable(`Governance meeting register - ${cycle.label}`, cycleMeetings, ["title", "meetingType", "scheduledAt", "chairName", "status", "openResolutions"]) : ""}
    ${tab === "resolutions" ? recordTable("Resolution action list", resolutions, ["meetingTitle", "title", "ownerName", "ownerTitle", "dueDate", "status", "createdAt"]) : ""}
  `;
}

function governanceCyclePanel(cycle) {
  const periodLabel = typeof membershipPeriodLabel === "function"
    ? membershipPeriodLabel(cycle.period)
    : labelize(cycle.period);
  const selectedYear = Number(cycle.year);
  const selectedMonth = Number(cycle.month);
  return `
    <section class="filter-toolbar compact-toolbar">
      <label><span>SACCO cycle</span><input value="${escapeHtml(periodLabel)}" readonly></label>
      ${cycle.period !== "once" ? `<label><span>Year</span><select data-governance-cycle-year>${governanceCycleYearOptions().map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}</select></label>` : ""}
      ${cycle.period === "monthly" ? `<label><span>Month</span><select data-governance-cycle-month>${governanceCycleMonthOptions(currentRegion().locale).map(([value, label]) => `<option value="${value}" ${value === selectedMonth ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>` : ""}
      <label><span>Report period</span><input value="${escapeHtml(cycle.label)}" readonly></label>
    </section>
  `;
}

function governanceActionControlPanel(governanceSummary) {
  const rows = [
    ["Meeting preparedness", `${governanceSummary.scheduled} scheduled meeting(s) need agenda, chairperson and attendance readiness.`, governanceSummary.scheduled ? "Prepare" : "Clear"],
    ["Resolution follow-up", `${governanceSummary.openResolutions} open resolution(s), including ${governanceSummary.overdueResolutions} overdue action(s).`, governanceSummary.overdueResolutions ? "Escalate" : governanceSummary.openResolutions ? "Track" : "Clear"],
    ["Minutes evidence", `${governanceSummary.withMinutes}/${governanceSummary.totalMeetings || 0} meeting(s) have captured minutes for audit and member trust.`, governanceSummary.withMinutes === governanceSummary.totalMeetings && governanceSummary.totalMeetings ? "Complete" : "Capture"]
  ];
  return `
    <section class="panel compact-panel">
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(t("governanceActionControl"))}</h2>
          <p>Track meetings, resolutions, minutes and board action follow-up.</p>
        </div>
        <span class="status ${governanceSummary.overdueResolutions || governanceSummary.openResolutions ? "pending" : "active"}">${governanceSummary.overdueResolutions ? "Escalate" : governanceSummary.openResolutions ? "Track" : "Clear"}</span>
      </div>
      <div class="mini-grid">
        ${rows.map(([label, detail, status]) => mini(label, `${detail}${status ? ` (${status})` : ""}`)).join("")}
      </div>
    </section>
  `;
}

function governanceMeetingPanel() {
  const canManage = hasPermission("governance:manage");
  const chairOptions = governanceChairpersonMemberOptions(dataRows("members"));
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
        ${governanceChairpersonPicker(chairOptions, canManage)}
        <label><span>Status</span><select id="newMeetingStatus" ${canManage ? "" : "disabled"}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        ${governanceRichTextEditor("newMeetingMinutes", "Minutes / agenda", "Agenda, attendance notes, or minutes summary", canManage)}
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Create governance meeting</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
    </section>
  `;
}

function governanceChairpersonPicker(members, canManage, options = {}) {
  const disabled = canManage ? "" : "disabled";
  const inputId = options.inputId || "newMeetingChairSearch";
  const hiddenId = options.hiddenId || "newMeetingChairUserId";
  const listId = options.listId || "governanceChairpersonMembers";
  const selectedId = String(options.selectedId || "");
  const selectedMember = members.find((member) => member.id === selectedId);
  return `
    <label class="wide searchable-picker">
      <span>Chairperson</span>
      <input id="${escapeHtml(inputId)}" list="${escapeHtml(listId)}" value="${escapeHtml(selectedMember?.label || "")}" placeholder="Search member by name, membership number or phone" autocomplete="off" data-governance-chair-search data-governance-chair-hidden="${escapeHtml(hiddenId)}" ${disabled}>
      <input type="hidden" id="${escapeHtml(hiddenId)}" value="${escapeHtml(selectedId)}">
      <datalist id="${escapeHtml(listId)}">
        ${members.map((member) => `<option value="${escapeHtml(member.label)}"></option>`).join("")}
      </datalist>
      <small>Select from active SACCO members. The selected member will chair this meeting.</small>
    </label>
  `;
}

function governanceChairpersonMemberOptions(members) {
  return (members || [])
    .filter((member) => !["rejected", "inactive", "suspended"].includes(normal(member.status)))
    .map((member) => {
      const membershipNo = member.membershipNo || member.id;
      const label = `${member.fullName || "Member"} / ${membershipNo}${member.phone ? " / " + member.phone : ""}`;
      return {
        ...member,
        id: String(member.id || ""),
        label,
        searchText: `${label} ${member.email || ""}`.toLowerCase()
      };
    })
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
}

function governanceMeetingDetailPanel(meetings) {
  const meeting = meetings.find((item) => item.id === state.selectedMeetingId);
  if (!meeting) return "";
  const canManage = hasPermission("governance:manage");
  const chairOptions = governanceChairpersonMemberOptions(dataRows("members"));
  return `
    <section class="panel detail-panel">
      <div class="panel-heading">
        <div>
          <h2>Governance meeting detail</h2>
          <p>${escapeHtml(meeting.title)} - ${escapeHtml(labelize(meeting.meetingType || ""))}</p>
        </div>
        <div class="form-actions inline">
          <button class="button secondary" type="button" data-action="export-governance-meeting-pdf">Export meeting PDF</button>
          <button class="button ghost" type="button" data-action="close-governance-meeting-detail">Close</button>
        </div>
      </div>
      ${state.selectedMeetingMessage ? `<div class="notice compact"><strong>${escapeHtml(state.selectedMeetingMessage)}</strong></div>` : ""}
      ${state.selectedMeetingError ? `<div class="notice warning"><strong>Governance update failed.</strong><span>${escapeHtml(state.selectedMeetingError)}</span></div>` : ""}
      <div class="source-grid">
        ${mini("Chairperson", meeting.chairName)}
        ${mini("Status", meeting.status)}
        ${mini("Scheduled", meeting.scheduledAt)}
        ${mini("Open resolutions", meeting.openResolutions || 0)}
        ${mini("Minutes", meeting.minutes ? "Captured" : "Pending")}
      </div>
      <form id="governanceMeetingUpdateForm" class="form-grid">
        <input type="hidden" id="selectedMeetingUpdateId" value="${escapeHtml(meeting.id)}">
        <label><span>Title</span><input id="selectedMeetingTitle" required value="${escapeHtml(meeting.title || "")}" ${canManage ? "" : "disabled"}></label>
        <label><span>Meeting type</span><select id="selectedMeetingType" ${canManage ? "" : "disabled"}>${meetingTypeOptions().map((item) => `<option value="${escapeHtml(item)}" ${item === meeting.meetingType ? "selected" : ""}>${labelize(item)}</option>`).join("")}</select></label>
        <label><span>Scheduled time</span><input id="selectedMeetingScheduledAt" type="datetime-local" value="${localDateTimeInputValue(meeting.rawScheduledAt || meeting.scheduledAt)}" ${canManage ? "" : "disabled"}></label>
        ${governanceChairpersonPicker(chairOptions, canManage, {
          inputId: "selectedMeetingChairSearch",
          hiddenId: "selectedMeetingChairMemberId",
          listId: "selectedGovernanceChairpersonMembers",
          selectedId: meeting.chairMemberId
        })}
        <label><span>Status</span><select id="selectedMeetingStatus" ${canManage ? "" : "disabled"}>
          <option value="scheduled" ${meeting.status === "scheduled" ? "selected" : ""}>Scheduled</option>
          <option value="completed" ${meeting.status === "completed" ? "selected" : ""}>Completed</option>
          <option value="cancelled" ${meeting.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select></label>
        ${governanceRichTextEditor("selectedMeetingMinutes", "Minutes / agenda", "Agenda, attendance notes, or minutes summary", canManage, meeting.minutes || "")}
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Save meeting setup</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      <form id="governanceResolutionForm" class="form-grid">
        <input type="hidden" id="selectedMeetingId" value="${escapeHtml(meeting.id)}">
        <label><span>Resolution title</span><input id="newResolutionTitle" required placeholder="Resolution or action item" ${canManage ? "" : "disabled"}></label>
        <label><span>Responsible person</span><input id="newResolutionOwnerName" required placeholder="Name, office or committee responsible" ${canManage ? "" : "disabled"}></label>
        <label><span>Title / office</span><input id="newResolutionOwnerTitle" placeholder="Chairperson, Secretary, Treasurer, Committee, Manager" ${canManage ? "" : "disabled"}></label>
        <label><span>Due date</span><input id="newResolutionDueDate" type="date" ${canManage ? "" : "disabled"}></label>
        <label><span>Status</span><select id="newResolutionStatus" ${canManage ? "" : "disabled"}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
        ${governanceRichTextEditor("newResolutionDecision", "Decision", "Decision text, follow-up requirement, or governance action", canManage)}
        <div class="form-actions inline">${canManage ? `<button class="button primary" type="submit">Record resolution</button>` : `<span class="status pending">View only</span>`}</div>
      </form>
      ${recordTable("Meeting resolutions", buildMeetingResolutionRows(meeting, { memberName, memberTitle: governanceMemberTitle, userName }), ["title", "ownerName", "ownerTitle", "dueDate", "status", "createdAt"])}
    </section>
  `;
}

function governanceMemberTitle(memberId) {
  const member = dataRows("members").find((row) => String(row.id || "") === String(memberId || ""));
  const linkedUser = dataRows("users").find((user) => user.id && user.id === member?.linkedUserId);
  const roleText = String(
    linkedUser?.primaryRole
    || linkedUser?.role
    || linkedUser?.roleName
    || (Array.isArray(linkedUser?.roles) ? linkedUser.roles[0] : "")
    || ""
  );
  if (roleText) return labelize(roleText).replace(/^Sacco\s+/i, "");
  return "Member";
}

function governanceRichTextEditor(id, label, placeholder, canManage, initialValue = "", maxLength = 3000) {
  const disabled = canManage ? "" : "disabled";
  const editable = canManage ? "true" : "false";
  const initialTextLength = stripHtmlText(initialValue).length;
  const remaining = Math.max(0, maxLength - initialTextLength);
  return `
    <div class="wide rich-text-field">
      <div class="rich-text-label-row">
        <div class="rich-text-label">${escapeHtml(label)}</div>
        <div class="rich-text-counter" data-rich-editor-counter="${escapeHtml(id)}">${remaining.toLocaleString()} characters remaining</div>
      </div>
      <input type="hidden" id="${escapeHtml(id)}" value="${escapeHtml(initialValue)}">
      <div class="rich-text-toolbar" aria-label="${escapeHtml(label)} formatting tools">
        <label class="rich-text-control"><span>Style</span><select data-rich-editor-command="formatBlock" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>
          <option value="P">Paragraph</option>
          <option value="H2">Heading</option>
          <option value="H3">Subheading</option>
          <option value="BLOCKQUOTE">Quote</option>
        </select></label>
        <label class="rich-text-control"><span>Font</span><select data-rich-editor-command="fontName" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>
          <option value="Arial">Arial</option>
          <option value="Calibri">Calibri</option>
          <option value="Georgia">Georgia</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Times New Roman">Times New Roman</option>
        </select></label>
        <label class="rich-text-control"><span>Size</span><select data-rich-editor-command="fontSize" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>
          <option value="2">Small</option>
          <option value="3" selected>Normal</option>
          <option value="4">Large</option>
          <option value="5">Title</option>
        </select></label>
        <label class="rich-text-control color-control"><span>Text</span><input type="color" value="#17231f" data-rich-editor-command="foreColor" data-rich-editor-target="${escapeHtml(id)}" ${disabled}></label>
        <label class="rich-text-control color-control"><span>Highlight</span><input type="color" value="#fff4bf" data-rich-editor-command="hiliteColor" data-rich-editor-target="${escapeHtml(id)}" ${disabled}></label>
        <button class="button secondary icon-button" type="button" title="Bold" data-rich-editor-command="bold" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>B</button>
        <button class="button secondary icon-button" type="button" title="Italic" data-rich-editor-command="italic" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>I</button>
        <button class="button secondary icon-button" type="button" title="Underline" data-rich-editor-command="underline" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>U</button>
        <button class="button secondary" type="button" data-rich-editor-command="insertUnorderedList" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Bullets</button>
        <button class="button secondary" type="button" data-rich-editor-command="insertOrderedList" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Numbers</button>
        <button class="button secondary" type="button" data-rich-editor-command="outdent" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Outdent</button>
        <button class="button secondary" type="button" data-rich-editor-command="indent" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Indent</button>
        <button class="button secondary icon-button" type="button" title="Align left" data-rich-editor-command="justifyLeft" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>L</button>
        <button class="button secondary icon-button" type="button" title="Align center" data-rich-editor-command="justifyCenter" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>C</button>
        <button class="button secondary icon-button" type="button" title="Align right" data-rich-editor-command="justifyRight" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>R</button>
        <button class="button secondary" type="button" data-rich-editor-command="undo" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Undo</button>
        <button class="button secondary" type="button" data-rich-editor-command="removeFormat" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Remove format</button>
        <button class="button ghost" type="button" data-rich-editor-command="clear" data-rich-editor-target="${escapeHtml(id)}" ${disabled}>Clear</button>
      </div>
      <div class="rich-text-editor" role="textbox" aria-label="${escapeHtml(label)}" contenteditable="${editable}" data-rich-editor="${escapeHtml(id)}" data-rich-editor-maxlength="${maxLength}" data-placeholder="${escapeHtml(placeholder)}">${initialValue}</div>
      <small class="rich-text-limit-note">Maximum ${maxLength.toLocaleString()} characters. The counter updates as you type.</small>
    </div>
  `;
}

function stripHtmlText(html) {
  return String(html || "").replace(/<[^>]*>/g, "").trim();
}

function localDateTimeValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function localDateTimeInputValue(input) {
  const date = new Date(input || Date.now());
  if (Number.isNaN(date.getTime())) return localDateTimeValue();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
