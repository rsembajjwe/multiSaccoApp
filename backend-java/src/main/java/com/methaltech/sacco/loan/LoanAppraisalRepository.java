package com.methaltech.sacco.loan;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface LoanAppraisalRepository extends JpaRepository<LoanAppraisal, String> {
    List<LoanAppraisal> findByLoanIdOrderByCreatedAtDesc(String loanId);

    Optional<LoanAppraisal> findFirstByLoanIdOrderByCreatedAtDesc(String loanId);
}
