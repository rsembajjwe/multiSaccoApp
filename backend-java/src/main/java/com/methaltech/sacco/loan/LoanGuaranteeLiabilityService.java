package com.methaltech.sacco.loan;

import com.methaltech.sacco.member.Member;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoanGuaranteeLiabilityService {

    private final LoanGuarantorRepository guarantorRepository;
    private final LoanRepository loanRepository;

    public BigDecimal committedGuarantees(Member member) {
        return guarantorRepository.findByMemberIdAndStatusIn(member.getId(), List.of("pending", "accepted"))
                .stream()
                .filter(guarantee -> loanRepository.findById(guarantee.getLoanId())
                        .filter(loan -> !"paid".equals(loan.getStatus()))
                        .filter(loan -> loan.getBalance().compareTo(BigDecimal.ZERO) > 0)
                        .isPresent())
                .map(LoanGuarantor::getGuaranteedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public BigDecimal minimumSavingsRequired(Member member) {
        return committedGuarantees(member).divide(BigDecimal.valueOf(3), 2, RoundingMode.CEILING);
    }

    public BigDecimal withdrawableSavings(Member member) {
        BigDecimal afterGuarantees = member.getSavingsBalance().subtract(minimumSavingsRequired(member));
        return member.getAvailableSavings().min(afterGuarantees).max(BigDecimal.ZERO);
    }
}
