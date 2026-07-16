package com.methaltech.sacco.complaint;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository extends JpaRepository<Complaint, String> {
    List<Complaint> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<Complaint> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<Complaint> findByMemberIdOrderByCreatedAtDesc(String memberId);
    long countByTenantIdAndStatusNotIn(String tenantId, List<String> statuses);
}
