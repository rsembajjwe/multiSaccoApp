package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, String> {
    List<LoanRepayment> findByLoanIdOrderByReceivedAtDesc(String loanId);

    List<LoanRepayment> findByTenantIdAndStatusOrderByReceivedAtDesc(String tenantId, String status);

    List<LoanRepayment> findByStatusOrderByReceivedAtDesc(String status);

    List<LoanRepayment> findByLoanIdInAndStatusOrderByReceivedAtDesc(List<String> loanIds, String status);

    List<LoanRepayment> findByLoanIdIn(List<String> loanIds);

    List<LoanRepayment> findByTenantIdAndReferenceStartingWithIgnoreCaseOrderByReceivedAtAsc(String tenantId, String referencePrefix);

    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);

    int countByLoanId(String loanId);

    // Only posted (approved) repayments count towards a loan's paid-to-date total. Pending
    // mobile-money repayments awaiting checker approval must not reduce reported balances.
    @Query("select coalesce(sum(r.amount), 0) from LoanRepayment r where r.loanId = ?1 and r.status = 'posted'")
    BigDecimal totalAmountByLoanId(String loanId);
}
