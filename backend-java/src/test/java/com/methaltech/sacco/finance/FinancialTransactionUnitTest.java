package com.methaltech.sacco.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/**
 * Pure unit tests for the money-posting rules on {@link FinancialTransaction}. These cover the
 * maker-checker lifecycle that member mobile-money deposits now rely on: a provider transaction is
 * RECEIVED as pending (no checker, balance not yet credited) and only becomes posted when a checker
 * approves it.
 */
class FinancialTransactionUnitTest {

    private static final String TENANT = "tenant_green";
    private static final String BRANCH = "branch_main";
    private static final String MEMBER = "member_green_amina";
    private static final String SYSTEM = "user_platform_admin";

    @Test
    void pendingProviderTransactionAwaitsApprovalWithNoChecker() {
        FinancialTransaction txn = FinancialTransaction.pendingProviderTransaction(
                "txn_1", TENANT, BRANCH, MEMBER, "savings_deposit", "mobile_money",
                new BigDecimal("45000"), "MM-1", "Mobile-money savings deposit", SYSTEM);

        assertEquals("pending_approval", txn.getStatus());
        assertEquals(SYSTEM, txn.getMakerUserId());
        assertNull(txn.getCheckerUserId(), "a received-but-unapproved transaction must have no checker");
        assertNull(txn.getPostedAt(), "pending transactions are not posted yet");
        assertEquals("savings_deposit", txn.getType());
        assertEquals("mobile_money", txn.getChannel());
        assertEquals(0, txn.getAmount().compareTo(new BigDecimal("45000")));
    }

    @Test
    void postedProviderTransactionIsImmediatelyPosted() {
        FinancialTransaction txn = FinancialTransaction.postedProviderTransaction(
                "txn_2", TENANT, BRANCH, MEMBER, "share_purchase", "mobile_money",
                new BigDecimal("10000"), "MM-2", "Mobile-money share purchase", SYSTEM);

        assertEquals("posted", txn.getStatus());
        assertEquals(SYSTEM, txn.getCheckerUserId());
        assertNotNull(txn.getPostedAt());
    }

    @Test
    void approvingPendingTransactionPostsItWithCheckerAndTimestamp() {
        FinancialTransaction txn = FinancialTransaction.pendingProviderTransaction(
                "txn_3", TENANT, BRANCH, MEMBER, "savings_deposit", "mobile_money",
                new BigDecimal("45000"), "MM-3", "Mobile-money savings deposit", SYSTEM);

        txn.post("user_green_treasurer");

        assertEquals("posted", txn.getStatus());
        assertEquals("user_green_treasurer", txn.getCheckerUserId());
        assertNotNull(txn.getPostedAt());
    }

    @Test
    void rejectingPendingTransactionRecordsReasonAndNeverPosts() {
        FinancialTransaction txn = FinancialTransaction.pendingProviderTransaction(
                "txn_4", TENANT, BRANCH, MEMBER, "savings_deposit", "mobile_money",
                new BigDecimal("45000"), "MM-4", "Mobile-money savings deposit", SYSTEM);

        txn.reject("user_green_treasurer", "Unverified payer");

        assertEquals("rejected", txn.getStatus());
        assertEquals("user_green_treasurer", txn.getCheckerUserId());
        assertEquals("Unverified payer", txn.getRejectionReason());
        assertNull(txn.getPostedAt(), "a rejected transaction is never posted");
    }
}
