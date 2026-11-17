package com.methaltech.sacco.loan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class LoanCoverageTest {

    @Test
    void includesInterestAndChargesWhenCalculatingGuarantorShortfall() {
        BigDecimal totalPayable = new BigDecimal("135000");
        BigDecimal savings = new BigDecimal("100000");

        assertFalse(LoanCoverage.covered(totalPayable, savings, BigDecimal.ZERO));
        assertEquals(0, LoanCoverage.shortfall(totalPayable, savings, BigDecimal.ZERO)
                .compareTo(new BigDecimal("35000")));
        assertTrue(LoanCoverage.covered(totalPayable, savings, new BigDecimal("35000")));
    }

    @Test
    void allocatesOnlyTheRequiredShortfallAcrossGuarantors() {
        LoanCoverage.Allocation allocation = LoanCoverage.allocate(
                new BigDecimal("35000"),
                List.of(new BigDecimal("20000"), new BigDecimal("50000")));

        assertEquals(0, allocation.amounts().get(0).compareTo(new BigDecimal("20000")));
        assertEquals(0, allocation.amounts().get(1).compareTo(new BigDecimal("15000")));
        assertEquals(0, allocation.remainingShortfall().compareTo(BigDecimal.ZERO));
    }
}
