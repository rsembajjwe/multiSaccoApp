package com.methaltech.sacco.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface ExpenseRepository extends JpaRepository<Expense, String> {
    List<Expense> findAllByOrderByTenantIdAscExpenseDateDescCreatedAtDesc();
    List<Expense> findByTenantIdOrderByExpenseDateDescCreatedAtDesc(String tenantId);
    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);
    long countByTenantId(String tenantId);
}
