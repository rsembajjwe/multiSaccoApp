package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "audit_events")
class AuditEvent {

    @Id
    private String id;

    @Column(name = "tenant_id")
    private String tenantId;

    @Column(name = "actor_user_id")
    private String actorUserId;

    @Column(name = "actor_name")
    private String actorName;

    private String action;

    @Column(name = "resource_type")
    private String resourceType;

    @Column(name = "resource_id")
    private String resourceId;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "created_at")
    private Instant createdAt;

    protected AuditEvent() {
    }

    AuditEvent(
            String id,
            String tenantId,
            String actorUserId,
            String actorName,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress) {
        this.id = id;
        this.tenantId = tenantId;
        this.actorUserId = actorUserId;
        this.actorName = actorName;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.ipAddress = ipAddress;
        this.createdAt = Instant.now();
    }

    String getId() {
        return id;
    }

    String getTenantId() {
        return tenantId;
    }

    String getActorUserId() {
        return actorUserId;
    }

    String getActorName() {
        return actorName;
    }

    String getAction() {
        return action;
    }

    String getResourceType() {
        return resourceType;
    }

    String getResourceId() {
        return resourceId;
    }

    String getIpAddress() {
        return ipAddress;
    }

    Instant getCreatedAt() {
        return createdAt;
    }
}
