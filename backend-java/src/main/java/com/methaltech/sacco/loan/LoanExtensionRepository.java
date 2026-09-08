package com.methaltech.sacco.loan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanExtensionRepository extends JpaRepository<LoanExtension, String> {
    List<LoanExtension> findByLoanIdOrderByCreatedAtDesc(String loanId);
}
