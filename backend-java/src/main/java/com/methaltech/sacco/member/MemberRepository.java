package com.methaltech.sacco.member;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemberRepository extends JpaRepository<Member, String> {
    List<Member> findAllByOrderByTenantIdAscMembershipNoAsc();
    List<Member> findByTenantIdOrderByMembershipNoAsc(String tenantId);
    long countByTenantId(String tenantId);
    boolean existsByTenantIdAndMembershipNoIgnoreCase(String tenantId, String membershipNo);
}
