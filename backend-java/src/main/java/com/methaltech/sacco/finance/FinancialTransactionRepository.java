package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, String> {
    List<FinancialTransaction> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<FinancialTransaction> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    long countByTenantId(String tenantId);
}
