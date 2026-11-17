package com.methaltech.sacco.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.member.Member;
import org.junit.jupiter.api.Test;

class FinancialTransactionControllerTest {

    @Test
    void normalizesBlankApprovalSearchToTypedEmptyString() {
        assertEquals("", FinancialTransactionController.approvalSearchTerm(null));
        assertEquals("", FinancialTransactionController.approvalSearchTerm("  "));
        assertEquals("member one", FinancialTransactionController.approvalSearchTerm(" member one "));
    }

    @Test
    void onlyActiveMembersCanReceiveFinancialPostings() {
        Member member = mock(Member.class);
        when(member.getStatus()).thenReturn("active", "suspended", "inactive", "exited");

        assertTrue(FinancialTransactionController.isActiveForPosting(member));
        assertFalse(FinancialTransactionController.isActiveForPosting(member));
        assertFalse(FinancialTransactionController.isActiveForPosting(member));
        assertFalse(FinancialTransactionController.isActiveForPosting(member));
        assertFalse(FinancialTransactionController.isActiveForPosting(null));
    }
}
