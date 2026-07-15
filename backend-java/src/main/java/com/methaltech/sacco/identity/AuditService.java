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
        return auditEventRepository.save(new AuditEvent(
                "audit_" + UUID.randomUUID(),
                tenantId,
                actor.getId(),
                actor.getFullName(),
                action,
                resourceType,
                resourceId,
                ipAddress));
    }
}
