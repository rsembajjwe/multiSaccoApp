package com.methaltech.sacco.identity;

import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    public AuditEvent record(
            String tenantId,
            User actor,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress) {
        return record(
                tenantId,
                actor == null ? null : actor.getId(),
                actor == null ? "System" : actor.getFullName(),
                action,
                resourceType,
                resourceId,
                ipAddress);
    }

    public AuditEvent record(
            String tenantId,
            String actorUserId,
            String actorName,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress) {
        return auditEventRepository.save(new AuditEvent(
                "audit_" + UUID.randomUUID(),
                tenantId,
                actorUserId,
                actorName,
                action,
                resourceType,
                resourceId,
                ipAddress));
    }
}
