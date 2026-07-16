package com.methaltech.sacco.approval;

import java.time.Instant;

record ApprovalWorkflowResponse(
        String id,
        String tenantId,
        String name,
        String module,
        boolean active,
        String createdByUserId,
        Instant createdAt,
        Instant updatedAt) {

    static ApprovalWorkflowResponse from(ApprovalWorkflow workflow) {
        return new ApprovalWorkflowResponse(
                workflow.getId(),
                workflow.getTenantId(),
                workflow.getName(),
                workflow.getModule(),
                workflow.isActive(),
                workflow.getCreatedByUserId(),
                workflow.getCreatedAt(),
                workflow.getUpdatedAt());
    }
}
