package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, String> {
    List<LoanRepayment> findByLoanIdOrderByReceivedAtDesc(String loanId);

    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);

    int countByLoanId(String loanId);

    @Query("select coalesce(sum(r.amount), 0) from LoanRepayment r where r.loanId = ?1")
    BigDecimal totalAmountByLoanId(String loanId);
}
