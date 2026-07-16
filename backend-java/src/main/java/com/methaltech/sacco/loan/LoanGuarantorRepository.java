package com.methaltech.sacco.loan;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanGuarantorRepository extends JpaRepository<LoanGuarantor, String> {
    List<LoanGuarantor> findByLoanIdOrderByCreatedAtDesc(String loanId);
    List<LoanGuarantor> findByMemberIdOrderByCreatedAtDesc(String memberId);
    List<LoanGuarantor> findByMemberIdAndStatusIn(String memberId, List<String> statuses);
    boolean existsByLoanIdAndMemberIdAndStatusNot(String loanId, String memberId, String status);
    long countByLoanIdAndStatus(String loanId, String status);
}
