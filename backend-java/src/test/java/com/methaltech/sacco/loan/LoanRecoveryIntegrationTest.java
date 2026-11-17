package com.methaltech.sacco.loan;

import com.methaltech.sacco.PostgresIntegrationTest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberFundBalanceService;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.notification.NotificationRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class LoanRecoveryIntegrationTest extends PostgresIntegrationTest {

    @Autowired private LoanRecoveryService recoveryService;
    @Autowired private LoanRepository loanRepository;
    @Autowired private LoanRecoveryCaseRepository recoveryRepository;
    @Autowired private LoanGuarantorRepository guarantorRepository;
    @Autowired private LoanRepaymentScheduleRepository scheduleRepository;
    @Autowired private MemberRepository memberRepository;
    @Autowired private MemberFundBalanceService fundBalanceService;
    @Autowired private LoanRepaymentRepository repaymentRepository;
    @Autowired private FinancialTransactionRepository transactionRepository;
    @Autowired private NotificationRepository notificationRepository;

    @Test
    void authorizedOfficerImmediatelyPostsBorrowerThenGuarantorRecoveryAtomically() {
        Loan loan = loanRepository.findById("loan_green_0003").orElseThrow();
        Member borrower = memberRepository.findById(loan.getMemberId()).orElseThrow();
        BigDecimal openingLoanBalance = loan.getBalance();
        BigDecimal openingBorrowerSavings = borrower.getSavingsBalance();
        int openingRepayments = repaymentRepository.countByLoanId(loan.getId());
        long openingTransactions = transactionRepository.countByTenantId(loan.getTenantId());
        scheduleRepository.save(new LoanRepaymentSchedule(
                "schedule_recovery_integration",
                loan.getTenantId(),
                loan.getId(),
                99,
                LocalDate.now().minusDays(1),
                openingLoanBalance,
                BigDecimal.ZERO,
                openingLoanBalance));
        guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loan.getId()).forEach(guarantor -> {
            guarantor.markSigned("SIGN-INTEGRATION-" + guarantor.getId(), "user_green_admin");
            guarantorRepository.save(guarantor);
        });

        LoanRecoveryResponse proposal = recoveryService.open(
                loan,
                "Installments remain unpaid after formal demand",
                LoanRecoveryCase.GUARANTOR_SHORTFALL,
                "NOTICE-INTEGRATION-001",
                LocalDate.now(),
                true,
                "user_green_admin");

        assertEquals(LoanRecoveryCase.POSTED, proposal.status());
        assertEquals(0, proposal.borrowerSavingsProposed().compareTo(openingBorrowerSavings));
        assertTrue(proposal.guarantorSavingsProposed().signum() > 0);
        assertEquals(0, proposal.totalProposed().compareTo(openingLoanBalance));
        assertBorrowerNotice(proposal);
        Map<String, BigDecimal> openingSavingsByMember = proposal.allocations().stream()
                .collect(Collectors.toMap(
                        LoanRecoveryResponse.AllocationResponse::sourceMemberId,
                        allocation -> memberRepository.findById(allocation.sourceMemberId())
                                .orElseThrow()
                                .getSavingsBalance().add(allocation.amount())));
        Map<String, BigDecimal> openingSavingsFundByMember = proposal.allocations().stream()
                .collect(Collectors.toMap(
                        LoanRecoveryResponse.AllocationResponse::sourceMemberId,
                        allocation -> savingsFundBalance(allocation.sourceMemberId()).add(allocation.amount())));

        assertEquals(0, loanRepository.findById(loan.getId()).orElseThrow().getBalance().compareTo(BigDecimal.ZERO));
        assertEquals(
                openingRepayments + proposal.allocations().size(),
                repaymentRepository.countByLoanId(loan.getId()));
        assertEquals(
                openingTransactions + proposal.allocations().size(),
                transactionRepository.countByTenantId(loan.getTenantId()));
        assertTrue(proposal.allocations().stream().allMatch(item -> "posted".equals(item.status())));
        assertMemberBalancesReducedByAllocations(
                proposal, openingSavingsByMember, openingSavingsFundByMember);
        assertRecoveryNotificationForEverySource(proposal, "loan_recovery_posted");
    }

    @Test
    void borrowerSavingsRecoverySkipsGraceAndNeverAllocatesGuarantors() {
        Loan loan = loanRepository.findById("loan_green_0003").orElseThrow();
        Member borrower = memberRepository.findById(loan.getMemberId()).orElseThrow();
        BigDecimal openingLoanBalance = loan.getBalance();
        BigDecimal openingSavings = borrower.getSavingsBalance();
        scheduleRepository.save(new LoanRepaymentSchedule(
                "schedule_borrower_recovery_integration",
                loan.getTenantId(),
                loan.getId(),
                98,
                LocalDate.now().minusDays(1),
                openingLoanBalance,
                BigDecimal.ZERO,
                openingLoanBalance));

        LoanRecoveryResponse proposal = recoveryService.open(
                loan,
                "Apply overdue amount from borrower savings",
                LoanRecoveryCase.BORROWER_SAVINGS,
                null,
                null,
                false,
                "user_green_admin");

        assertEquals(LoanRecoveryCase.PARTIALLY_RECOVERED, proposal.status());
        assertEquals(LoanRecoveryCase.BORROWER_SAVINGS, proposal.recoveryMethod());
        assertEquals(null, proposal.noticeReference());
        assertEquals(null, proposal.graceEndsAt());
        assertTrue(proposal.allocations().stream()
                .allMatch(item -> LoanRecoveryAllocation.BORROWER.equals(item.sourceType())));
        assertEquals(0, proposal.guarantorSavingsProposed().compareTo(BigDecimal.ZERO));
        assertEquals(0, notificationRepository.findByMemberIdOrderByCreatedAtDesc(borrower.getId()).stream()
                .filter(notification -> "loan_recovery_notice".equals(notification.getEventType()))
                .filter(notification -> proposal.reference().equals(notification.getResourceId()))
                .count());

        BigDecimal recovered = proposal.totalProposed();
        assertEquals(0, memberRepository.findById(borrower.getId()).orElseThrow().getSavingsBalance()
                .compareTo(openingSavings.subtract(recovered)));
        assertEquals(0, loanRepository.findById(loan.getId()).orElseThrow().getBalance()
                .compareTo(openingLoanBalance.subtract(recovered)));
        assertRecoveryNotificationForEverySource(proposal, "loan_recovery_posted");
    }

    private void assertMemberBalancesReducedByAllocations(
            LoanRecoveryResponse recovery,
            Map<String, BigDecimal> openingSavingsByMember,
            Map<String, BigDecimal> openingSavingsFundByMember) {
        recovery.allocations().forEach(allocation -> {
            String memberId = allocation.sourceMemberId();
            BigDecimal expectedSavings = openingSavingsByMember.get(memberId).subtract(allocation.amount());
            BigDecimal expectedFundBalance = openingSavingsFundByMember.get(memberId).subtract(allocation.amount());

            assertEquals(
                    0,
                    memberRepository.findById(memberId).orElseThrow().getSavingsBalance().compareTo(expectedSavings),
                    "Savings balance must reflect recovery allocation for " + memberId);
            assertEquals(
                    0,
                    savingsFundBalance(memberId).compareTo(expectedFundBalance),
                    "Savings fund ledger must reflect recovery allocation for " + memberId);
        });
    }

    private BigDecimal savingsFundBalance(String memberId) {
        return fundBalanceService.balancesFor(memberId).stream()
                .filter(balance -> "savings".equals(balance.getFundCode()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Savings fund balance missing for " + memberId))
                .getBalance();
    }

    private void assertRecoveryNotificationForEverySource(LoanRecoveryResponse recovery, String eventType) {
        recovery.allocations().forEach(allocation -> {
            long matching = notificationRepository.findByMemberIdOrderByCreatedAtDesc(allocation.sourceMemberId())
                    .stream()
                    .filter(notification -> eventType.equals(notification.getEventType()))
                    .filter(notification -> recovery.reference().equals(notification.getResourceId()))
                    .count();
            assertEquals(1, matching,
                    eventType + " must be created for " + allocation.sourceMemberId());
        });
    }

    private void assertBorrowerNotice(LoanRecoveryResponse recovery) {
        long matching = notificationRepository.findByMemberIdOrderByCreatedAtDesc(recovery.borrowerMemberId()).stream()
                .filter(notification -> "loan_recovery_notice".equals(notification.getEventType()))
                .filter(notification -> recovery.reference().equals(notification.getResourceId()))
                .count();
        assertEquals(1, matching, "An optional recovery notice must be sent to the borrower.");
    }
}
