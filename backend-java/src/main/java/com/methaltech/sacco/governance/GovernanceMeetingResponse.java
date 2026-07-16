package com.methaltech.sacco.governance;

import java.time.Instant;
import java.util.List;

record GovernanceMeetingResponse(
        String id,
        String tenantId,
        String title,
        String meetingType,
        Instant scheduledAt,
        String chairUserId,
        String status,
        String minutes,
        String createdByUserId,
        Instant createdAt,
        Instant updatedAt,
        List<GovernanceResolutionResponse> resolutions,
        int openResolutions) {

    static GovernanceMeetingResponse from(GovernanceMeeting meeting, List<GovernanceResolution> resolutions) {
        List<GovernanceResolutionResponse> responseResolutions = resolutions.stream()
                .map(GovernanceResolutionResponse::from)
                .toList();
        return new GovernanceMeetingResponse(
                meeting.getId(),
                meeting.getTenantId(),
                meeting.getTitle(),
                meeting.getMeetingType(),
                meeting.getScheduledAt(),
                meeting.getChairUserId(),
                meeting.getStatus(),
                meeting.getMinutes(),
                meeting.getCreatedByUserId(),
                meeting.getCreatedAt(),
                meeting.getUpdatedAt(),
                responseResolutions,
                (int) resolutions.stream().filter(resolution -> !"closed".equals(resolution.getStatus())).count());
    }
}
