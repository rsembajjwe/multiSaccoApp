package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WelfareClaimRepository extends JpaRepository<WelfareClaim, String> {
    List<WelfareClaim> findAllByOrderByTenantIdAscSubmittedAtDesc();
    List<WelfareClaim> findByTenantIdOrderBySubmittedAtDesc(String tenantId);
    List<WelfareClaim> findByTenantIdAndMemberIdOrderBySubmittedAtDesc(String tenantId, String memberId);
    long countByTenantId(String tenantId);
    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);
}
