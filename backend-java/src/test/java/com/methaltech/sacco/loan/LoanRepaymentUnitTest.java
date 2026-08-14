package com.methaltech.sacco.loan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * Pure unit tests for the loan-repayment approval lifecycle and loan balance math. Member
 * mobile-money repayments are RECEIVED as pending and must not reduce the loan balance until a
 * checker (e.g. Treasurer) approves them; staff-captured and imported repayments stay posted.
 */
class LoanRepaymentUnitTest {

    private static final String TENANT = "tenant_green";
    private static final String LOAN = "loan_green_0001";
    private static final String MEMBER = "member_green_amina";
    private static final String SYSTEM = "user_platform_admin";

    @Test
    void staffCapturedRepaymentIsPostedImmediately() {
        LoanRepayment repayment = new LoanRepayment(
                "repayment_1", TENANT, LOAN, MEMBER, new BigDecimal("60000"),
                "cash", "LR-1", "Counter repayment", "user_green_teller");

        assertEquals(LoanRepayment.STATUS_POSTED, repayment.getStatus());
        assertFalse(repayment.isPendingApproval());
    }

    @Test
    void importedRepaymentIsPosted() {
        LoanRepayment repayment = LoanRepayment.imported(
                "repayment_2", TENANT, LOAN, MEMBER, new BigDecimal("850000"),
                "cash", "LR-2", "Opening history", "user_green_admin", Instant.now());

        assertEquals(LoanRepayment.STATUS_POSTED, repayment.getStatus());
    }

    @Test
    void mobileMoneyRepaymentIsPendingUntilApproved() {
        LoanRepayment repayment = LoanRepayment.pendingMobileMoney(
                "repayment_3", TENANT, LOAN, MEMBER, new BigDecimal("60000"),
                "MM-LR-3", "Mobile-money loan repayment", SYSTEM);

        assertEquals(LoanRepayment.STATUS_PENDING_APPROVAL, repayment.getStatus());
        assertTrue(repayment.isPendingApproval());
        assertEquals("mobile_money", repayment.getChannel());
        assertEquals(SYSTEM, repayment.getReceivedByUserId());
        assertNull(repayment.getApprovedByUserId());
        assertNull(repayment.getApprovedAt());
    }

    @Test
    void approvingRepaymentMarksItPostedWithChecker() {
        LoanRepayment repayment = LoanRepayment.pendingMobileMoney(
                "repayment_4", TENANT, LOAN, MEMBER, new BigDecimal("60000"),
                "MM-LR-4", "Mobile-money loan repayment", SYSTEM);

        repayment.approve("user_green_treasurer");

        assertEquals(LoanRepayment.STATUS_POSTED, repayment.getStatus());
        assertEquals("user_green_treasurer", repayment.getApprovedByUserId());
        assertNotNull(repayment.getApprovedAt());
        assertFalse(repayment.isPendingApproval());
    }

    @Test
    void rejectingRepaymentMarksItRejected() {
        LoanRepayment repayment = LoanRepayment.pendingMobileMoney(
                "repayment_5", TENANT, LOAN, MEMBER, new BigDecimal("60000"),
                "MM-LR-5", "Mobile-money loan repayment", SYSTEM);

        repayment.reject("user_green_treasurer");

        assertEquals(LoanRepayment.STATUS_REJECTED, repayment.getStatus());
        assertEquals("user_green_treasurer", repayment.getApprovedByUserId());
        assertFalse(repayment.isPendingApproval());
    }

    @Test
    void recordRepaymentReducesBalanceAndKeepsLoanActive() {
        Loan loan = LoanFixtures.activeLoanWithBalance(new BigDecimal("100000"));

        loan.recordRepayment(new BigDecimal("60000"));

        assertEquals(0, loan.getBalance().compareTo(new BigDecimal("40000")));
        assertEquals("active", loan.getStatus());
    }

    @Test
    void recordRepaymentClosesLoanWhenBalanceReachesZero() {
        Loan loan = LoanFixtures.activeLoanWithBalance(new BigDecimal("100000"));

        loan.recordRepayment(new BigDecimal("100000"));

        assertEquals(0, loan.getBalance().compareTo(BigDecimal.ZERO));
        assertEquals("closed", loan.getStatus());
    }

    @Test
    void recordRepaymentClampsOverpaymentAtZero() {
        Loan loan = LoanFixtures.activeLoanWithBalance(new BigDecimal("100000"));

        loan.recordRepayment(new BigDecimal("120000"));

        assertEquals(0, loan.getBalance().compareTo(BigDecimal.ZERO));
        assertEquals("closed", loan.getStatus());
        assertEquals("Closed", loan.getStage());
    }

    @Test
    void submittedLoanAppliesProductInterestAndInstallmentTerms() {
        Loan loan = Loan.submitted(
                "loan_6", TENANT, MEMBER, "Emergency Loan", new BigDecimal("1000000"),
                30, 4, "Medical expense", "member_portal", MEMBER);

        assertEquals(0, loan.getInterestRate().compareTo(new BigDecimal("2.0")));
        assertEquals(0, loan.getInterestAmount().compareTo(new BigDecimal("80000.00")));
        assertEquals(0, loan.getTotalPayable().compareTo(new BigDecimal("1080000.00")));
        assertEquals(0, loan.getMonthlyInstallment().compareTo(new BigDecimal("270000.00")));
        assertEquals("submitted", loan.getStatus());
        assertEquals("Credit Appraisal", loan.getStage());
        assertEquals(MEMBER, loan.getSubmittedByMemberId());
    }

    @Test
    void disbursedLoanBalanceUsesTotalPayableIncludingInterest() {
        Loan loan = Loan.submitted(
                "loan_7", TENANT, MEMBER, "School Fees Loan", new BigDecimal("600000"),
                35, 6, "Fees", "staff", null);
        loan.decide("approved", "user_green_chairperson", "");

        loan.disburse("user_green_treasurer");

        assertEquals("active", loan.getStatus());
        assertEquals("Disbursed", loan.getStage());
        assertEquals("user_green_treasurer", loan.getDisbursedByUserId());
        assertNotNull(loan.getDisbursedAt());
        assertEquals(0, loan.getBalance().compareTo(loan.getTotalPayable()));
        assertEquals(0, loan.getBalance().compareTo(new BigDecimal("636000.00")));
    }

    @Test
    void guarantorAcceptanceMovesSubmittedLoanToCommitteeStage() {
        Loan loan = Loan.submitted(
                "loan_8", TENANT, MEMBER, "Agriculture Loan", new BigDecimal("800000"),
                25, 8, "Inputs", "staff", null);

        loan.refreshGuarantors(2);

        assertEquals(2, loan.getGuarantors());
        assertEquals("Loan Committee", loan.getStage());
    }

    /** Small fixture helper kept package-private so tests build active loans without disbursing. */
    static final class LoanFixtures {
        private LoanFixtures() {
        }

        static Loan activeLoanWithBalance(BigDecimal balance) {
            return Loan.importedBookLoan(
                    "loan_fixture", TENANT, MEMBER, "Emergency Loan", balance, balance,
                    30, 4, "Working capital", "user_green_admin", Instant.now());
        }
    }
}
