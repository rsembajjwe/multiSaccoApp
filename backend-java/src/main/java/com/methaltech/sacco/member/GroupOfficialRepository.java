package com.methaltech.sacco.member;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface GroupOfficialRepository extends JpaRepository<GroupOfficial, String> {
    List<GroupOfficial> findByTenantIdAndMemberIdOrderByRoleAsc(String tenantId, String memberId);
}
