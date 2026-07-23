package com.methaltech.sacco.loan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanRepaymentScheduleRepository extends JpaRepository<LoanRepaymentSchedule, String> {
    List<LoanRepaymentSchedule> findByLoanIdOrderByInstallmentNoAsc(String loanId);
    boolean existsByLoanId(String loanId);
}
