package com.methaltech.sacco.loan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

import com.methaltech.sacco.member.Member;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LoanRecoveryUnitTest {

    @Test
    void recoveryNeedsNoSystemGracePeriodBeforePosting() {
        LoanRecoveryCase recovery = recovery(LocalDate.now().plusDays(7));

        assertEquals(LoanRecoveryCase.PENDING_APPROVAL, recovery.getStatus());
        assertNotNull(recovery.getSubmittedAt());
    }

    @Test
    void recoveryTracksPartialAllocationWithoutAnApprovalDecision() {
        LoanRecoveryCase recovery = recovery(LocalDate.now());
        recovery.updateProposal(new BigDecimal("1000"), new BigDecimal("300"), new BigDecimal("500"));

        assertEquals(LoanRecoveryCase.PENDING_APPROVAL, recovery.getStatus());
        assertEquals(0, recovery.getTotalProposed().compareTo(new BigDecimal("800")));
        assertEquals(0, recovery.getRemainingAfterProposal().compareTo(new BigDecimal("200")));
    }

    @Test
    void borrowerSavingsRecoveryNeedsNoNoticeOrGracePeriod() {
        LoanRecoveryCase recovery = new LoanRecoveryCase(
                "recovery_1", "tenant_green", "loan_1", "borrower_1", "LRC-001",
                "Apply overdue balance from member savings", LoanRecoveryCase.BORROWER_SAVINGS,
                null, null, null, "maker");

        assertEquals(LoanRecoveryCase.PENDING_APPROVAL, recovery.getStatus());
        assertEquals(LoanRecoveryCase.BORROWER_SAVINGS, recovery.getRecoveryMethod());
        assertEquals(null, recovery.getNoticeReference());
        assertEquals(null, recovery.getGraceEndsAt());
        assertEquals(false, recovery.isIncludeGuarantors());
    }

    @Test
    void guarantorAllocationIsProRataAndNeverExceedsRequestedAmount() {
        LoanGuarantor first = LoanGuarantor.request(
                "guarantor_1", "tenant_green", "loan_1", "member_1", new BigDecimal("300"), "maker");
        LoanGuarantor second = LoanGuarantor.request(
                "guarantor_2", "tenant_green", "loan_1", "member_2", new BigDecimal("700"), "maker");
        List<LoanRecoveryService.GuarantorCapacity> capacities = List.of(
                new LoanRecoveryService.GuarantorCapacity(first, mock(Member.class), new BigDecimal("300"), new BigDecimal("300")),
                new LoanRecoveryService.GuarantorCapacity(second, mock(Member.class), new BigDecimal("700"), new BigDecimal("700")));

        Map<String, BigDecimal> result = LoanRecoveryService.apportion(new BigDecimal("500"), capacities);

        assertEquals(0, result.get("guarantor_1").compareTo(new BigDecimal("150.00")));
        assertEquals(0, result.get("guarantor_2").compareTo(new BigDecimal("350.00")));
        assertEquals(0, result.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add).compareTo(new BigDecimal("500.00")));
    }

    @Test
    void postedCaseRecordsWhetherRecoveryWasComplete() {
        LoanRecoveryCase partial = recovery(LocalDate.now());
        partial.markPosted("checker", false);
        assertEquals(LoanRecoveryCase.PARTIALLY_RECOVERED, partial.getStatus());

        LoanRecoveryCase complete = recovery(LocalDate.now());
        complete.markPosted("checker", true);
        assertEquals(LoanRecoveryCase.POSTED, complete.getStatus());
        assertEquals("checker", complete.getCheckerUserId());
        assertNotNull(complete.getPostedAt());
    }

    private LoanRecoveryCase recovery(LocalDate graceEndsAt) {
        return new LoanRecoveryCase(
                "recovery_1", "tenant_green", "loan_1", "borrower_1", "LRC-001",
                "Loan remains unpaid", LoanRecoveryCase.GUARANTOR_SHORTFALL,
                "NOTICE-001", LocalDate.now(), graceEndsAt, "maker");
    }
}
