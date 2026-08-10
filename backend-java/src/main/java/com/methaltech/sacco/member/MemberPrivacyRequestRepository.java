package com.methaltech.sacco.member;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemberPrivacyRequestRepository extends JpaRepository<MemberPrivacyRequest, String> {
    List<MemberPrivacyRequest> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<MemberPrivacyRequest> findByTenantIdAndMemberIdOrderByCreatedAtDesc(String tenantId, String memberId);
    Optional<MemberPrivacyRequest> findByIdAndTenantIdAndMemberId(String id, String tenantId, String memberId);
}
