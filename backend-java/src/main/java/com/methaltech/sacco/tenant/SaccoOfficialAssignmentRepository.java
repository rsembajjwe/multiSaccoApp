package com.methaltech.sacco.tenant;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SaccoOfficialAssignmentRepository extends JpaRepository<SaccoOfficialAssignment, String> {

    List<SaccoOfficialAssignment> findByTenantIdOrderByOfficeAsc(String tenantId);

    Optional<SaccoOfficialAssignment> findByTenantIdAndOffice(String tenantId, String office);

    Optional<SaccoOfficialAssignment> findByTenantIdAndMemberId(String tenantId, String memberId);
}