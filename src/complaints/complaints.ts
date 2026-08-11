import type { TerekaComplaintThread, TerekaRecord } from "../types/domain";

export type TerekaChatMode = "platform-super" | "sacco-platform" | "member-support" | "sacco-member" | string;

export interface TerekaChatThreadRow extends TerekaComplaintThread, TerekaRecord {
  id: string;
  lastMessagePreview: string;
  lastMessageSenderType: string;
  memberName: string;
  tenantName: string;
  unreadCount: number;
  updatedAt?: string;
}

export interface TerekaComplaintSummary {
  inProgress: number;
  memberLinked: number;
  memberSupport: number;
  open: number;
  platformSupport: number;
  resolved: number;
  total: number;
  unassignedOpen: number;
  urgent: number;
}

export interface TerekaComplaintOption {
  label: string;
  value: string;
}

export interface TerekaChatThreadRowsInput {
  memberName: (memberId?: string) => string;
  tenantName: (tenantId?: string) => string;
  threads: TerekaComplaintThread[] | null | undefined;
}

export interface TerekaChatParticipantInput {
  contextName: () => string;
  memberName: (memberId?: string) => string;
  mode: TerekaChatMode;
  row: TerekaChatThreadRow | TerekaComplaintThread;
  tenantName: (tenantId?: string) => string;
}

export function buildChatThreadRows(input: TerekaChatThreadRowsInput): TerekaChatThreadRow[] {
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
    unreadCount: Number(thread.unreadCount || 0),
  }));
}

export function buildComplaintSummary(rows: TerekaChatThreadRow[]): TerekaComplaintSummary {
  const openRows = complaintOpenRows(rows);
  return {
    inProgress: rows.filter((row) => normalizeComplaintText(row.status) === "in_progress").length,
    memberLinked: rows.filter((row) => row.memberId).length,
    memberSupport: rows.filter((row) => row.type === "MEMBER_SUPPORT").length,
    open: openRows.length,
    platformSupport: rows.filter((row) => row.type === "PLATFORM_SUPPORT").length,
    resolved: rows.filter((row) => ["resolved", "closed"].includes(normalizeComplaintText(row.status))).length,
    total: rows.length,
    unassignedOpen: openRows.filter((row) => !row.assignedUserId && !row.assignedTo).length,
    urgent: complaintUrgentRows(rows).length,
  };
}

export function complaintOpenRows(rows: TerekaChatThreadRow[]): TerekaChatThreadRow[] {
  return rows.filter((row) => !["closed", "resolved"].includes(normalizeComplaintText(row.status)));
}

export function complaintUrgentRows(rows: TerekaChatThreadRow[]): TerekaChatThreadRow[] {
  return rows.filter((row) => Number(row.unreadCount || 0) > 0);
}

export function filterChatThreadRows(rows: TerekaChatThreadRow[], query: unknown): TerekaChatThreadRow[] {
  const filter = normalizeComplaintText(query);
  if (!filter) return rows;
  return rows.filter((row) => normalizeComplaintText(`${row.tenantName || ""} ${row.memberName || ""} ${row.subject || ""} ${row.description || ""} ${row.resolutionNotes || ""} ${row.status || ""}`).includes(filter));
}

export function chatParticipantLabel(input: TerekaChatParticipantInput): string {
  if (input.mode === "platform-super") return input.row.tenantName || input.tenantName(input.row.tenantId) || "SACCO admin";
  if (input.mode === "sacco-platform") return "Platform Super Admin";
  if (input.mode === "member-support") return input.row.tenantName || input.contextName() || "SACCO admin";
  return input.row.memberName || input.memberName(input.row.memberId) || "SACCO member";
}

export function chatInitialsFor(text: unknown): string {
  return String(text || "TO")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "TO";
}

export function complaintCategoryOptions(): TerekaComplaintOption[] {
  return [
    { value: "statement", label: "Statement" },
    { value: "loan", label: "Loan" },
    { value: "savings", label: "Savings" },
    { value: "shares", label: "Shares" },
    { value: "service", label: "Service" },
    { value: "other", label: "Other" },
  ];
}

export function complaintStatusOptions(): TerekaComplaintOption[] {
  return [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];
}

function normalizeComplaintText(value: unknown): string {
  return String(value || "").toLowerCase();
}
