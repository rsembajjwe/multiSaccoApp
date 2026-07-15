package com.methaltech.sacco.identity;

import java.time.Instant;

record AuditEventResponse(
        String id,
        String tenantId,
        String actorUserId,
        String actorName,
        String action,
        String resourceType,
        String resourceId,
        String ipAddress,
        Instant createdAt) {

    static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(
                event.getId(),
                event.getTenantId(),
                event.getActorUserId(),
                event.getActorName(),
                event.getAction(),
                event.getResourceType(),
                event.getResourceId(),
                event.getIpAddress(),
                event.getCreatedAt());
    }
}
