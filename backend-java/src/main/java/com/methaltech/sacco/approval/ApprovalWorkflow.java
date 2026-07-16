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
@Table(name = "approval_workflows")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ApprovalWorkflow {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    private String name;
    private String module;
    private boolean active;

    @Column(name = "created_by_user_id")
    private String createdByUserId;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    ApprovalWorkflow(String id, String tenantId, String name, String module, boolean active, String createdByUserId) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.module = module;
        this.active = active;
        this.createdByUserId = createdByUserId;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }
}
