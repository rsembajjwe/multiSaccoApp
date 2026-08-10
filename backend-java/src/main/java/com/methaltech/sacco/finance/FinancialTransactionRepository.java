package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
