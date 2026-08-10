package com.methaltech.sacco.identity;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface AuditEventRepository extends JpaRepository<AuditEvent, String> {
    List<AuditEvent> findAllByOrderByCreatedAtDesc();
    List<AuditEvent> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<AuditEvent> findByTenantIdAndActorUserIdOrderByCreatedAtDesc(String tenantId, String actorUserId);
    Page<AuditEvent> findByTenantId(String tenantId, Pageable pageable);
    Page<AuditEvent> findByTenantIdAndActorUserId(String tenantId, String actorUserId, Pageable pageable);
    @Query("""
            SELECT e FROM AuditEvent e
            WHERE LOWER(CONCAT(COALESCE(e.actorName, ''), ' ', COALESCE(e.action, ''), ' ', COALESCE(e.resourceType, ''), ' ', COALESCE(e.resourceId, ''), ' ', COALESCE(e.ipAddress, ''), ' ', COALESCE(e.tenantId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<AuditEvent> searchAll(@Param("search") String search, Pageable pageable);
    @Query("""
            SELECT e FROM AuditEvent e
            WHERE e.tenantId = :tenantId
              AND LOWER(CONCAT(COALESCE(e.actorName, ''), ' ', COALESCE(e.action, ''), ' ', COALESCE(e.resourceType, ''), ' ', COALESCE(e.resourceId, ''), ' ', COALESCE(e.ipAddress, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<AuditEvent> searchByTenantId(@Param("tenantId") String tenantId, @Param("search") String search, Pageable pageable);
    @Query("""
            SELECT e FROM AuditEvent e
            WHERE e.tenantId = :tenantId
              AND e.actorUserId = :actorUserId
              AND LOWER(CONCAT(COALESCE(e.actorName, ''), ' ', COALESCE(e.action, ''), ' ', COALESCE(e.resourceType, ''), ' ', COALESCE(e.resourceId, ''), ' ', COALESCE(e.ipAddress, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<AuditEvent> searchByTenantIdAndActorUserId(@Param("tenantId") String tenantId, @Param("actorUserId") String actorUserId, @Param("search") String search, Pageable pageable);
}
