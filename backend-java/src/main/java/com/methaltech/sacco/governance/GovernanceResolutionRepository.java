package com.methaltech.sacco.governance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GovernanceResolutionRepository extends JpaRepository<GovernanceResolution, String> {
    List<GovernanceResolution> findByMeetingIdOrderByCreatedAtDesc(String meetingId);
    List<GovernanceResolution> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    long countByTenantIdAndStatusNot(String tenantId, String status);
}
