package com.methaltech.sacco.loan;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface LoanRecoveryCaseRepository extends JpaRepository<LoanRecoveryCase, String> {
    List<LoanRecoveryCase> findByLoanIdOrderByCreatedAtDesc(String loanId);
    boolean existsByLoanIdAndStatusIn(String loanId, Collection<String> statuses);
}
