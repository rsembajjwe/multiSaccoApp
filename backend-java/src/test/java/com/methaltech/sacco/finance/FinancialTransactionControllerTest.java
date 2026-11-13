package com.methaltech.sacco.finance;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class FinancialTransactionControllerTest {

    @Test
    void normalizesBlankApprovalSearchToTypedEmptyString() {
        assertEquals("", FinancialTransactionController.approvalSearchTerm(null));
        assertEquals("", FinancialTransactionController.approvalSearchTerm("  "));
        assertEquals("member one", FinancialTransactionController.approvalSearchTerm(" member one "));
    }
}
