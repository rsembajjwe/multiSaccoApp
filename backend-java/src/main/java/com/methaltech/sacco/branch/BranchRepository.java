package com.methaltech.sacco.branch;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface BranchRepository extends JpaRepository<Branch, String> {
    List<Branch> findAllByOrderByTenantIdAscCodeAsc();
    List<Branch> findByTenantIdOrderByCodeAsc(String tenantId);
    boolean existsByTenantIdAndCodeIgnoreCase(String tenantId, String code);
}
