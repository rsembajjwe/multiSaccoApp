function buildGovernanceMeetingRows(input) {
  return (input.meetings || []).map((meeting) => {
    const id = String(meeting.id || "");
    return {
      ...meeting,
      id,
      chairName: input.userName(String(meeting.chairUserId || "")),
      action: "governance-meeting-detail",
      actionLabel: "Open",
      actionId: id
    };
  });
}

function buildGovernanceResolutionRows(meetings, userName) {
  return meetings.flatMap((meeting) => (meeting.resolutions || []).map((resolution) => ({
    ...resolution,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    ownerName: userName(String(resolution.ownerUserId || ""))
  })));
}

function buildMeetingResolutionRows(meeting, userName) {
  return (meeting?.resolutions || []).map((resolution) => ({
    ...resolution,
    ownerName: userName(String(resolution.ownerUserId || ""))
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

function isGovernanceResolutionOverdue(resolution, now = new Date()) {
  return Boolean(resolution.dueDate && new Date(resolution.dueDate) < now);
}

function normalizeGovernanceModelText(value) {
  return String(value || "").toLowerCase();
}
