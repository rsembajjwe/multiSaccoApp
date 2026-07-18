package com.methaltech.sacco.member;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, String> {
    List<Member> findAllByOrderByTenantIdAscMembershipNoAsc();
    List<Member> findByTenantIdOrderByMembershipNoAsc(String tenantId);
    long countByTenantId(String tenantId);
    boolean existsByTenantIdAndMembershipNoIgnoreCase(String tenantId, String membershipNo);
    Optional<Member> findFirstByTenantIdAndMembershipNoIgnoreCase(String tenantId, String membershipNo);
    Optional<Member> findFirstByMembershipNoIgnoreCaseOrPhoneIgnoreCaseOrEmailIgnoreCase(
            String membershipNo,
            String phone,
            String email);
}
