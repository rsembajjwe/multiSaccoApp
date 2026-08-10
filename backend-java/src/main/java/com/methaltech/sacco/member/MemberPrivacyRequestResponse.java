package com.methaltech.sacco.member;

import java.time.Instant;

record MemberPrivacyRequestResponse(
        String id,
        String tenantId,
        String memberId,
        String requestType,
        String status,
        String reason,
        String resolutionNote,
        String requestedByMemberId,
        String requestedByUserId,
        String handledByUserId,
        Instant createdAt,
        Instant handledAt,
        Instant completedAt) {

    static MemberPrivacyRequestResponse from(MemberPrivacyRequest request) {
        return new MemberPrivacyRequestResponse(
                request.getId(),
                request.getTenantId(),
                request.getMemberId(),
                request.getRequestType(),
                request.getStatus(),
                request.getReason(),
                request.getResolutionNote(),
                request.getRequestedByMemberId(),
                request.getRequestedByUserId(),
                request.getHandledByUserId(),
                request.getCreatedAt(),
                request.getHandledAt(),
                request.getCompletedAt());
    }
}
