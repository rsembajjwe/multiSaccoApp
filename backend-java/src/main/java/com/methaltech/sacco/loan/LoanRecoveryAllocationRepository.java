package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface LoanRecoveryAllocationRepository extends JpaRepository<LoanRecoveryAllocation, String> {
    List<LoanRecoveryAllocation> findByRecoveryCaseIdOrderByCreatedAtAsc(String recoveryCaseId);
    void deleteByRecoveryCaseId(String recoveryCaseId);

    @Query("select coalesce(sum(a.amount), 0) from LoanRecoveryAllocation a where a.loanId = ?1 and a.guarantorId = ?2 and a.status = 'posted'")
    BigDecimal postedAmountForGuarantor(String loanId, String guarantorId);
}
