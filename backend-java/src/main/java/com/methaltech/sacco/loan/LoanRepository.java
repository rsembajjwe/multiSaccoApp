package com.methaltech.sacco.loan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanRepository extends JpaRepository<Loan, String> {
    List<Loan> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<Loan> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}
