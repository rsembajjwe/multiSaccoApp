package com.methaltech.sacco.governance;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Read access to the governance meetings a member is allowed to see. Board and
 * committee meetings stay staff-only (governance:view); only general meetings —
 * the AGM and other general assemblies — are visible to members, together with
 * their minutes.
 */
@Service
public class MemberGovernanceService {

    /** Meeting types any member may view. Everything else is staff-only. */
    private static final Set<String> MEMBER_VISIBLE_TYPES = Set.of("general", "agm");

    private final GovernanceMeetingRepository meetingRepository;

    MemberGovernanceService(GovernanceMeetingRepository meetingRepository) {
        this.meetingRepository = meetingRepository;
    }

    public List<MemberMeeting> memberVisibleMeetings(String tenantId) {
        return meetingRepository.findByTenantIdOrderByScheduledAtDesc(tenantId).stream()
                .filter(meeting -> MEMBER_VISIBLE_TYPES.contains(meeting.getMeetingType()))
                .map(meeting -> new MemberMeeting(
                        meeting.getId(),
                        meeting.getTitle(),
                        meeting.getMeetingType(),
                        meeting.getScheduledAt(),
                        meeting.getStatus(),
                        meeting.getMinutes() == null ? "" : meeting.getMinutes()))
                .toList();
    }

    /** A general meeting as shown to members: no staff-only fields. */
    public record MemberMeeting(
            String id,
            String title,
            String meetingType,
            Instant scheduledAt,
            String status,
            String minutes) {
    }
}
