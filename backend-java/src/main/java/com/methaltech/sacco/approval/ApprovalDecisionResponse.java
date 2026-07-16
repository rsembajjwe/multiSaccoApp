package com.methaltech.sacco.approval;

import java.time.Instant;

record ApprovalDecisionResponse(
        String id,
        String tenantId,
        String workflowId,
        String resourceType,
        String resourceId,
        String decision,
        String decidedByUserId,
        String reason,
        Instant createdAt) {

    static ApprovalDecisionResponse from(ApprovalDecision decision) {
        return new ApprovalDecisionResponse(
                decision.getId(),
                decision.getTenantId(),
                decision.getWorkflowId(),
                decision.getResourceType(),
                decision.getResourceId(),
                decision.getDecision(),
                decision.getDecidedByUserId(),
                decision.getReason(),
                decision.getCreatedAt());
    }
}
