package com.methaltech.sacco.loan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.Member;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class LoanGuaranteeLiabilityServiceTest {

    private final LoanGuarantorRepository guarantorRepository = mock(LoanGuarantorRepository.class);
    private final LoanRepository loanRepository = mock(LoanRepository.class);
    private final LoanGuaranteeLiabilityService service =
            new LoanGuaranteeLiabilityService(guarantorRepository, loanRepository);

    @Test
    void withdrawalRetainsSavingsNeededForActiveGuarantees() {
        Member member = mock(Member.class);
        LoanGuarantor guarantee = mock(LoanGuarantor.class);
        Loan loan = mock(Loan.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getSavingsBalance()).thenReturn(BigDecimal.valueOf(100000));
        when(member.getAvailableSavings()).thenReturn(BigDecimal.valueOf(90000));
        when(guarantee.getLoanId()).thenReturn("loan_one");
        when(guarantee.getGuaranteedAmount()).thenReturn(BigDecimal.valueOf(180000));
        when(guarantorRepository.findByMemberIdAndStatusIn("member_one", List.of("pending", "accepted")))
                .thenReturn(List.of(guarantee));
        when(loanRepository.findById("loan_one")).thenReturn(Optional.of(loan));
        when(loan.getStatus()).thenReturn("active");
        when(loan.getBalance()).thenReturn(BigDecimal.valueOf(180000));

        assertEquals(new BigDecimal("60000.00"), service.minimumSavingsRequired(member));
        assertEquals(new BigDecimal("40000.00"), service.withdrawableSavings(member));
    }
}
