package com.methaltech.sacco.member;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, String> {
    List<Member> findAllByOrderByTenantIdAscMembershipNoAsc();
    List<Member> findByTenantIdOrderByMembershipNoAsc(String tenantId);
    List<Member> findByTenantIdAndBranchIdInOrderByMembershipNoAsc(String tenantId, List<String> branchIds);
    Page<Member> findByTenantId(String tenantId, Pageable pageable);
    Page<Member> findByTenantIdAndBranchIdIn(String tenantId, List<String> branchIds, Pageable pageable);

    @Query("""
            SELECT m FROM Member m
            WHERE m.tenantId = :tenantId
              AND m.status = 'active'
              AND m.guarantorListingOptOut = false
              AND (LOWER(m.fullName) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(m.membershipNo) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY m.membershipNo ASC
            """)
    List<Member> searchGuarantorCandidates(@Param("tenantId") String tenantId, @Param("query") String query, Pageable pageable);
    @Query("""
            SELECT m FROM Member m
            WHERE LOWER(CONCAT(COALESCE(m.membershipNo, ''), ' ', COALESCE(m.fullName, ''), ' ', COALESCE(m.phone, ''), ' ', COALESCE(m.email, ''), ' ', COALESCE(m.kycStatus, ''), ' ', COALESCE(m.status, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<Member> searchAll(@Param("search") String search, Pageable pageable);
    @Query("""
            SELECT m FROM Member m
            WHERE m.tenantId = :tenantId
              AND LOWER(CONCAT(COALESCE(m.membershipNo, ''), ' ', COALESCE(m.fullName, ''), ' ', COALESCE(m.phone, ''), ' ', COALESCE(m.email, ''), ' ', COALESCE(m.kycStatus, ''), ' ', COALESCE(m.status, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<Member> searchByTenantId(@Param("tenantId") String tenantId, @Param("search") String search, Pageable pageable);
    @Query("""
            SELECT m FROM Member m
            WHERE m.tenantId = :tenantId
              AND m.branchId IN :branchIds
              AND LOWER(CONCAT(COALESCE(m.membershipNo, ''), ' ', COALESCE(m.fullName, ''), ' ', COALESCE(m.phone, ''), ' ', COALESCE(m.email, ''), ' ', COALESCE(m.kycStatus, ''), ' ', COALESCE(m.status, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<Member> searchByTenantIdAndBranchIds(
            @Param("tenantId") String tenantId,
            @Param("branchIds") List<String> branchIds,
            @Param("search") String search,
            Pageable pageable);
    long countByTenantId(String tenantId);
    Optional<Member> findFirstByLinkedUserId(String linkedUserId);
    boolean existsByTenantIdAndMembershipNoIgnoreCase(String tenantId, String membershipNo);
    Optional<Member> findFirstByTenantIdAndMembershipNoIgnoreCase(String tenantId, String membershipNo);
    Optional<Member> findFirstByTenantIdAndMembershipNoIgnoreCaseOrTenantIdAndPhoneIgnoreCaseOrTenantIdAndEmailIgnoreCase(
            String membershipTenantId,
            String membershipNo,
            String phoneTenantId,
            String phone,
            String emailTenantId,
            String email);
    Optional<Member> findFirstByMembershipNoIgnoreCaseOrPhoneIgnoreCaseOrEmailIgnoreCase(
            String membershipNo,
            String phone,
            String email);
}
