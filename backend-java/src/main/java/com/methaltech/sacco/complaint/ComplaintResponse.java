package com.methaltech.sacco.complaint;

import java.time.Instant;

public record ComplaintResponse(
        String id,
        String tenantId,
        String memberId,
        String category,
        String subject,
        String description,
        String channel,
        String priority,
        String status,
        String resolutionNotes,
        String assignedUserId,
        String resolvedByUserId,
        Instant resolvedAt,
        String createdByUserId,
        String createdByMemberId,
        Instant createdAt,
        Instant updatedAt) {

    public static ComplaintResponse from(Complaint complaint) {
        return new ComplaintResponse(
                complaint.getId(),
                complaint.getTenantId(),
                complaint.getMemberId(),
                complaint.getCategory(),
                complaint.getSubject(),
                complaint.getDescription(),
                complaint.getChannel(),
                complaint.getPriority(),
                complaint.getStatus(),
                complaint.getResolutionNotes(),
                complaint.getAssignedUserId(),
                complaint.getResolvedByUserId(),
                complaint.getResolvedAt(),
                complaint.getCreatedByUserId(),
                complaint.getCreatedByMemberId(),
                complaint.getCreatedAt(),
                complaint.getUpdatedAt());
    }
}
