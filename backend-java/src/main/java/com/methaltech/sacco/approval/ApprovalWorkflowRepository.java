package com.methaltech.sacco.approval;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ApprovalWorkflowRepository extends JpaRepository<ApprovalWorkflow, String> {
    List<ApprovalWorkflow> findAllByOrderByTenantIdAscModuleAscNameAsc();
    List<ApprovalWorkflow> findByTenantIdOrderByModuleAscNameAsc(String tenantId);
    boolean existsByTenantIdAndModuleAndNameIgnoreCase(String tenantId, String module, String name);
}
