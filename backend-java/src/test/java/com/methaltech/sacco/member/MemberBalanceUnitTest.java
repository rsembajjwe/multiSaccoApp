package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * Pure unit tests for member balance math. This is the credit that is applied when a checker
 * approves a mobile-money contribution, so it must be exact per transaction type and fully
 * reversible.
 */
class MemberBalanceUnitTest {

    private Member newMember() {
        return new Member(
                "member_1", "tenant_green", "branch_main", "GVS-0001", "Amina Nakato",
                "individual", "+256700000001", "amina@example.com", "CM123",
                "hash", "salt", "active", "verified", LocalDate.of(2026, 1, 1));
    }

    @Test
    void savingsDepositIncreasesSavings() {
        Member member = newMember();
        member.applyPostedTransaction("savings_deposit", new BigDecimal("45000"));
        assertEquals(0, member.getSavingsBalance().compareTo(new BigDecimal("45000")));
        assertEquals(0, member.getSharesBalance().compareTo(BigDecimal.ZERO));
        assertEquals(0, member.getWelfareBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    void sharePurchaseIncreasesSharesOnly() {
        Member member = newMember();
        member.applyPostedTransaction("share_purchase", new BigDecimal("10000"));
        assertEquals(0, member.getSharesBalance().compareTo(new BigDecimal("10000")));
        assertEquals(0, member.getSavingsBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    void welfareContributionIncreasesWelfareOnly() {
        Member member = newMember();
        member.applyPostedTransaction("welfare_contribution", new BigDecimal("5000"));
        assertEquals(0, member.getWelfareBalance().compareTo(new BigDecimal("5000")));
    }

    @Test
    void withdrawalReducesSavings() {
        Member member = newMember();
        member.applyPostedTransaction("savings_deposit", new BigDecimal("50000"));
        member.applyPostedTransaction("withdrawal", new BigDecimal("20000"));
        assertEquals(0, member.getSavingsBalance().compareTo(new BigDecimal("30000")));
    }

    @Test
    void reversalUndoesEachTransactionType() {
        Member member = newMember();
        member.applyPostedTransaction("savings_deposit", new BigDecimal("45000"));
        member.applyPostedTransaction("share_purchase", new BigDecimal("10000"));
        member.applyPostedTransaction("welfare_contribution", new BigDecimal("5000"));

        member.applyReversal("savings_deposit", new BigDecimal("45000"));
        member.applyReversal("share_purchase", new BigDecimal("10000"));
        member.applyReversal("welfare_contribution", new BigDecimal("5000"));

        assertEquals(0, member.getSavingsBalance().compareTo(BigDecimal.ZERO));
        assertEquals(0, member.getSharesBalance().compareTo(BigDecimal.ZERO));
        assertEquals(0, member.getWelfareBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    void hasEnoughSavingsRespectsBoundary() {
        Member member = newMember();
        member.applyPostedTransaction("savings_deposit", new BigDecimal("30000"));
        assertTrue(member.hasEnoughSavings(new BigDecimal("30000")), "exact balance is enough");
        assertFalse(member.hasEnoughSavings(new BigDecimal("30000.01")), "one cent over is not enough");
    }

    @Test
    void canReverseIsFalseWhenBalanceInsufficient() {
        Member member = newMember();
        member.applyPostedTransaction("share_purchase", new BigDecimal("10000"));
        assertTrue(member.canReverse("share_purchase", new BigDecimal("10000")));
        assertFalse(member.canReverse("share_purchase", new BigDecimal("10001")));
    }

    @Test
    void postedWithdrawalCannotOverdrawSavings() {
        Member member = newMember();
        member.applyPostedTransaction("savings_deposit", new BigDecimal("10000"));

        assertThrows(
                IllegalStateException.class,
                () -> member.applyPostedTransaction("withdrawal", new BigDecimal("10001")));
        assertEquals(0, member.getSavingsBalance().compareTo(new BigDecimal("10000")));
    }

    @Test
    void reversalCannotCreateNegativeBalances() {
        Member member = newMember();
        member.applyPostedTransaction("share_purchase", new BigDecimal("10000"));
        member.applyReversal("share_purchase", new BigDecimal("10000"));

        assertThrows(
                IllegalStateException.class,
                () -> member.applyReversal("share_purchase", new BigDecimal("1")));
        assertEquals(0, member.getSharesBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    void welfareClaimPaymentCannotOverdrawWelfareBalance() {
        Member member = newMember();
        member.applyPostedTransaction("welfare_contribution", new BigDecimal("5000"));

        assertThrows(
                IllegalStateException.class,
                () -> member.applyWelfareClaimPayment(new BigDecimal("5001")));
        assertEquals(0, member.getWelfareBalance().compareTo(new BigDecimal("5000")));
    }

    @Test
    void balanceOperationsRejectNonPositiveAmounts() {
        Member member = newMember();

        assertThrows(
                IllegalArgumentException.class,
                () -> member.applyPostedTransaction("savings_deposit", BigDecimal.ZERO));
        assertThrows(
                IllegalArgumentException.class,
                () -> member.applyReversal("savings_deposit", new BigDecimal("-1")));
        assertThrows(
                IllegalArgumentException.class,
                () -> member.applyWelfareClaimPayment(BigDecimal.ZERO));
        assertFalse(member.canReverse("savings_deposit", BigDecimal.ZERO));
    }
}
