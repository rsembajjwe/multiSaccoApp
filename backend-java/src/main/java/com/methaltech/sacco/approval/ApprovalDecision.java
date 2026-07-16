package com.methaltech.sacco.approval;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "approval_decisions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ApprovalDecision {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "workflow_id")
    private String workflowId;

    @Column(name = "resource_type")
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    private String decision;

    @Column(name = "decided_by_user_id")
    private String decidedByUserId;

    private String reason;

    @Column(name = "created_at")
    private Instant createdAt;

    ApprovalDecision(
            String id,
            String tenantId,
            String workflowId,
            String resourceType,
            String resourceId,
            String decision,
            String decidedByUserId,
            String reason) {
        this.id = id;
        this.tenantId = tenantId;
        this.workflowId = workflowId;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.decision = decision;
        this.decidedByUserId = decidedByUserId;
        this.reason = reason;
        this.createdAt = Instant.now();
    }
}
