package com.methaltech.sacco.approval;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ApprovalDecisionRepository extends JpaRepository<ApprovalDecision, String> {
    List<ApprovalDecision> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<ApprovalDecision> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<ApprovalDecision> findByTenantIdAndDecisionOrderByCreatedAtDesc(String tenantId, String decision);
    List<ApprovalDecision> findByDecisionOrderByTenantIdAscCreatedAtDesc(String decision);
}
