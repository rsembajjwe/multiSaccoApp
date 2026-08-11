function buildChatThreadRows(input) {
  return (input.threads || []).map((thread) => ({
    ...thread,
    id: String(thread.id || ""),
    type: thread.type,
    subject: thread.subject,
    status: thread.status,
    tenantId: thread.tenantId,
    tenantName: thread.tenantName || input.tenantName(thread.tenantId),
    memberId: thread.memberId,
    memberName: thread.memberName || (thread.memberId ? input.memberName(thread.memberId) : ""),
    createdAt: thread.createdAt,
    updatedAt: thread.lastMessageAt || thread.updatedAt,
    lastMessagePreview: thread.lastMessagePreview || "",
    lastMessageSenderType: thread.lastMessageSenderType || "",
    unreadCount: Number(thread.unreadCount || 0)
  }));
}

function buildComplaintSummary(rows) {
  const openRows = complaintOpenRows(rows);
  return {
    inProgress: rows.filter((row) => normalizeComplaintModelText(row.status) === "in_progress").length,
    memberLinked: rows.filter((row) => row.memberId).length,
    memberSupport: rows.filter((row) => row.type === "MEMBER_SUPPORT").length,
    open: openRows.length,
    platformSupport: rows.filter((row) => row.type === "PLATFORM_SUPPORT").length,
    resolved: rows.filter((row) => ["resolved", "closed"].includes(normalizeComplaintModelText(row.status))).length,
    total: rows.length,
    unassignedOpen: openRows.filter((row) => !row.assignedUserId && !row.assignedTo).length,
    urgent: complaintUrgentRows(rows).length
  };
}

function complaintOpenRows(rows) {
  return rows.filter((row) => !["closed", "resolved"].includes(normalizeComplaintModelText(row.status)));
}

function complaintUrgentRows(rows) {
  return rows.filter((row) => Number(row.unreadCount || 0) > 0);
}

function filterChatThreadRows(rows, query) {
  const filter = normalizeComplaintModelText(query);
  if (!filter) return rows;
  return rows.filter((row) => normalizeComplaintModelText(`${row.tenantName || ""} ${row.memberName || ""} ${row.subject || ""} ${row.description || ""} ${row.resolutionNotes || ""} ${row.status || ""}`).includes(filter));
}

function chatParticipantLabel(input) {
  if (input.mode === "platform-super") return input.row.tenantName || input.tenantName(input.row.tenantId) || "SACCO admin";
  if (input.mode === "sacco-platform") return "Platform Super Admin";
  if (input.mode === "member-support") return input.row.tenantName || input.contextName() || "SACCO admin";
  return input.row.memberName || input.memberName(input.row.memberId) || "SACCO member";
}

function chatInitialsFor(text) {
  return String(text || "TO")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "TO";
}

function complaintCategoryOptions() {
  return [
    { value: "statement", label: "Statement" },
    { value: "loan", label: "Loan" },
    { value: "savings", label: "Savings" },
    { value: "shares", label: "Shares" },
    { value: "service", label: "Service" },
    { value: "other", label: "Other" }
  ];
}

function complaintStatusOptions() {
  return [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" }
  ];
}

function normalizeComplaintModelText(value) {
  return String(value || "").toLowerCase();
}
