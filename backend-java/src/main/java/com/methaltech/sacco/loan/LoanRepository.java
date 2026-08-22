package com.methaltech.sacco.loan;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoanRepository extends JpaRepository<Loan, String> {
    List<Loan> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<Loan> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    Page<Loan> findByTenantId(String tenantId, Pageable pageable);
    @Query("""
            SELECT l FROM Loan l
            WHERE l.tenantId = :tenantId
              AND l.memberId IN (
                SELECT m.id FROM Member m
                WHERE m.tenantId = :tenantId
                  AND m.branchId IN :branchIds
              )
            ORDER BY l.createdAt DESC
            """)
    List<Loan> findByTenantIdAndMemberBranchIds(
            @Param("tenantId") String tenantId,
            @Param("branchIds") List<String> branchIds);
    @Query("""
            SELECT l FROM Loan l
            WHERE l.tenantId = :tenantId
              AND l.memberId IN (
                SELECT m.id FROM Member m
                WHERE m.tenantId = :tenantId
                  AND m.branchId IN :branchIds
              )
            """)
    Page<Loan> findByTenantIdAndMemberBranchIds(
            @Param("tenantId") String tenantId,
            @Param("branchIds") List<String> branchIds,
            Pageable pageable);
    @Query("""
            SELECT l FROM Loan l
            WHERE LOWER(CONCAT(COALESCE(l.product, ''), ' ', COALESCE(l.status, ''), ' ', COALESCE(l.stage, ''), ' ', COALESCE(l.purpose, ''), ' ', COALESCE(l.channel, ''), ' ', COALESCE(l.memberId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<Loan> searchAll(@Param("search") String search, Pageable pageable);
    @Query("""
            SELECT l FROM Loan l
            WHERE l.tenantId = :tenantId
              AND LOWER(CONCAT(COALESCE(l.product, ''), ' ', COALESCE(l.status, ''), ' ', COALESCE(l.stage, ''), ' ', COALESCE(l.purpose, ''), ' ', COALESCE(l.channel, ''), ' ', COALESCE(l.memberId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<Loan> searchByTenantId(@Param("tenantId") String tenantId, @Param("search") String search, Pageable pageable);
    @Query("""
            SELECT l FROM Loan l
            WHERE l.tenantId = :tenantId
              AND l.memberId IN (
                SELECT m.id FROM Member m
                WHERE m.tenantId = :tenantId
                  AND m.branchId IN :branchIds
              )
              AND LOWER(CONCAT(COALESCE(l.product, ''), ' ', COALESCE(l.status, ''), ' ', COALESCE(l.stage, ''), ' ', COALESCE(l.purpose, ''), ' ', COALESCE(l.channel, ''), ' ', COALESCE(l.memberId, '')))
                  LIKE LOWER(CONCAT('%', :search, '%'))
            """)
    Page<Loan> searchByTenantIdAndMemberBranchIds(
            @Param("tenantId") String tenantId,
            @Param("branchIds") List<String> branchIds,
            @Param("search") String search,
            Pageable pageable);
    List<Loan> findByMemberIdOrderByCreatedAtDesc(String memberId);
    List<Loan> findByTenantIdAndMemberIdOrderByCreatedAtAsc(String tenantId, String memberId);
    List<Loan> findByTenantIdAndMemberIdAndProductOrderByDisbursedAtDescCreatedAtDesc(String tenantId, String memberId, String product);
    boolean existsByTenantIdAndMemberIdAndProductAndAmountAndStatusIn(String tenantId, String memberId, String product, java.math.BigDecimal amount, List<String> statuses);
}
