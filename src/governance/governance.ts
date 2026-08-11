import type { TerekaGovernanceMeeting, TerekaRecord } from "../types/domain";

export interface TerekaGovernanceResolutionRow extends TerekaRecord {
  id?: string;
  meetingId?: string;
  meetingTitle?: string;
  title?: string;
  ownerUserId?: string;
  ownerName?: string;
  dueDate?: string;
  status?: string;
  createdAt?: string;
}

export interface TerekaGovernanceMeetingRow extends TerekaGovernanceMeeting, TerekaRecord {
  id: string;
  action: string;
  actionId: string;
  actionLabel: string;
  chairName: string;
  openResolutions?: number;
  resolutions?: TerekaGovernanceResolutionRow[];
}

export interface TerekaGovernanceSummary {
  completed: number;
  openResolutions: number;
  overdueResolutions: number;
  scheduled: number;
  totalMeetings: number;
  withMinutes: number;
}

export interface TerekaGovernanceRowsInput {
  meetings: Array<TerekaGovernanceMeeting & TerekaRecord> | null | undefined;
  userName: (userId?: string) => string;
}

export function buildGovernanceMeetingRows(input: TerekaGovernanceRowsInput): TerekaGovernanceMeetingRow[] {
  return (input.meetings || []).map((meeting) => {
    const id = String(meeting.id || "");
    return {
      ...meeting,
      id,
      chairName: input.userName(String(meeting.chairUserId || "")),
      action: "governance-meeting-detail",
      actionLabel: "Open",
      actionId: id,
    };
  });
}

export function buildGovernanceResolutionRows(meetings: TerekaGovernanceMeetingRow[], userName: (userId?: string) => string): TerekaGovernanceResolutionRow[] {
  return meetings.flatMap((meeting) => (meeting.resolutions || []).map((resolution) => ({
    ...resolution,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    ownerName: userName(String(resolution.ownerUserId || "")),
  })));
}

export function governanceScheduledMeetings(meetings: TerekaGovernanceMeetingRow[]): TerekaGovernanceMeetingRow[] {
  return meetings.filter((row) => normalizeGovernanceText(row.status) === "scheduled");
}

export function governanceCompletedMeetings(meetings: TerekaGovernanceMeetingRow[]): TerekaGovernanceMeetingRow[] {
  return meetings.filter((row) => normalizeGovernanceText(row.status) === "completed");
}

export function governanceOpenResolutions(resolutions: TerekaGovernanceResolutionRow[]): TerekaGovernanceResolutionRow[] {
  return resolutions.filter((row) => normalizeGovernanceText(row.status) !== "closed");
}

export function buildGovernanceSummary(meetings: TerekaGovernanceMeetingRow[], resolutions: TerekaGovernanceResolutionRow[], now: Date = new Date()): TerekaGovernanceSummary {
  const openResolutions = governanceOpenResolutions(resolutions);
  return {
    completed: governanceCompletedMeetings(meetings).length,
    openResolutions: openResolutions.length,
    overdueResolutions: openResolutions.filter((resolution) => isGovernanceResolutionOverdue(resolution, now)).length,
    scheduled: governanceScheduledMeetings(meetings).length,
    totalMeetings: meetings.length,
    withMinutes: meetings.filter((meeting) => meeting.minutes).length,
  };
}

export function isGovernanceResolutionOverdue(resolution: TerekaGovernanceResolutionRow, now: Date = new Date()): boolean {
  return Boolean(resolution.dueDate && new Date(resolution.dueDate) < now);
}

function normalizeGovernanceText(value: unknown): string {
  return String(value || "").toLowerCase();
}
