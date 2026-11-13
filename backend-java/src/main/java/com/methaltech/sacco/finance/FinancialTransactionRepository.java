package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.Instant;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<FinancialTransaction> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<FinancialTransaction> findByTenantIdAndBranchIdInOrderByCreatedAtDesc(String tenantId, List<String> branchIds);
    Page<FinancialTransaction> findByTenantId(String tenantId, Pageable pageable);
    Page<FinancialTransaction> findByTenantIdAndBranchIdIn(String tenantId, List<String> branchIds, Pageable pageable);
    @Query("""
            SELECT t FROM FinancialTransaction t
            WHERE LOWER(CONCAT(COALESCE(t.reference, ''), ' ', COALESCE(t.type, ''), ' ', COALESCE(t.channel, ''), ' ', COALESCE(t.status, ''), ' ', COALESCE(t.narration, ''), ' ', COALESCE(t.memberId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<FinancialTransaction> searchAll(@Param("search") String search, Pageable pageable);
    @Query("""
            SELECT t FROM FinancialTransaction t
            WHERE t.tenantId = :tenantId
              AND LOWER(CONCAT(COALESCE(t.reference, ''), ' ', COALESCE(t.type, ''), ' ', COALESCE(t.channel, ''), ' ', COALESCE(t.status, ''), ' ', COALESCE(t.narration, ''), ' ', COALESCE(t.memberId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<FinancialTransaction> searchByTenantId(@Param("tenantId") String tenantId, @Param("search") String search, Pageable pageable);
    @Query("""
            SELECT t FROM FinancialTransaction t
            WHERE t.tenantId = :tenantId
              AND t.branchId IN :branchIds
              AND LOWER(CONCAT(COALESCE(t.reference, ''), ' ', COALESCE(t.type, ''), ' ', COALESCE(t.channel, ''), ' ', COALESCE(t.status, ''), ' ', COALESCE(t.narration, ''), ' ', COALESCE(t.memberId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<FinancialTransaction> searchByTenantIdAndBranchIds(
            @Param("tenantId") String tenantId,
            @Param("branchIds") List<String> branchIds,
            @Param("search") String search,
            Pageable pageable);
    List<FinancialTransaction> findByMemberIdAndStatusOrderByPostedAtAscCreatedAtAsc(String memberId, String status);
    long countByTenantId(String tenantId);
    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);
    boolean existsByOriginalTransactionId(String originalTransactionId);

    @Query("""
            SELECT t FROM FinancialTransaction t
            WHERE t.status = 'pending_approval'
              AND (:tenantId IS NULL OR t.tenantId = :tenantId)
              AND (:channel IS NULL OR t.channel = :channel)
              AND (:search = '' OR
                   LOWER(CONCAT(COALESCE(t.reference, ''), ' ', COALESCE(t.type, ''), ' ', COALESCE(t.channel, ''), ' ', COALESCE(t.narration, ''), ' ', COALESCE(t.memberId, ''), ' ', COALESCE(t.tenantId, '')))
                       LIKE LOWER(CONCAT('%', :search, '%')) OR
                   EXISTS (SELECT m.id FROM Member m WHERE m.id = t.memberId AND LOWER(CONCAT(COALESCE(m.fullName, ''), ' ', COALESCE(m.membershipNo, ''))) LIKE LOWER(CONCAT('%', :search, '%'))) OR
                   EXISTS (SELECT tenant.id FROM Tenant tenant WHERE tenant.id = t.tenantId AND LOWER(CONCAT(COALESCE(tenant.name, ''), ' ', COALESCE(tenant.abbreviation, ''))) LIKE LOWER(CONCAT('%', :search, '%'))))
            """)
    Page<FinancialTransaction> findPlatformApprovalQueue(
            @Param("tenantId") String tenantId,
            @Param("channel") String channel,
            @Param("search") String search,
            Pageable pageable);

    long countByStatus(String status);
    long countByStatusAndChannel(String status, String channel);
    long countByStatusAndMakerUserIdNot(String status, String makerUserId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM FinancialTransaction t WHERE t.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") String status);

    @Query("SELECT MIN(t.createdAt) FROM FinancialTransaction t WHERE t.status = :status")
    Instant oldestCreatedAtByStatus(@Param("status") String status);
}
