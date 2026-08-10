package com.methaltech.sacco.member;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface MemberDocumentRepository extends JpaRepository<MemberDocument, String> {
    List<MemberDocument> findByMemberIdOrderByCreatedAtDesc(String memberId);
    List<MemberDocument> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    java.util.Optional<MemberDocument> findByIdAndTenantIdAndMemberId(String id, String tenantId, String memberId);
}
