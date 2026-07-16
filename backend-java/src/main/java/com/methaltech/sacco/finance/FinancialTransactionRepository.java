package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<FinancialTransaction> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<FinancialTransaction> findByMemberIdAndStatusOrderByPostedAtAscCreatedAtAsc(String memberId, String status);
    long countByTenantId(String tenantId);
    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);
    boolean existsByOriginalTransactionId(String originalTransactionId);
}
