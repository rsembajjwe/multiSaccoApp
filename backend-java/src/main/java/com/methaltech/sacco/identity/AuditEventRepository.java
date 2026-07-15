package com.methaltech.sacco.identity;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface AuditEventRepository extends JpaRepository<AuditEvent, String> {
    List<AuditEvent> findAllByOrderByCreatedAtDesc();
    List<AuditEvent> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}
