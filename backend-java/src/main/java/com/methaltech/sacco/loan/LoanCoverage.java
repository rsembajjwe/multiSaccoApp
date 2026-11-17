package com.methaltech.sacco.loan;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

final class LoanCoverage {

    private LoanCoverage() {
    }

    static BigDecimal requiredAmount(Loan loan) {
        return loan.getTotalPayable() == null ? loan.getAmount() : loan.getTotalPayable();
    }

    static BigDecimal shortfall(BigDecimal requiredAmount, BigDecimal borrowerSavings, BigDecimal guarantorPledges) {
        BigDecimal required = value(requiredAmount);
        BigDecimal cover = value(borrowerSavings).add(value(guarantorPledges));
        return required.subtract(cover).max(BigDecimal.ZERO);
    }

    static boolean covered(BigDecimal requiredAmount, BigDecimal borrowerSavings, BigDecimal guarantorPledges) {
        return shortfall(requiredAmount, borrowerSavings, guarantorPledges).signum() == 0;
    }

    static Allocation allocate(BigDecimal requiredShortfall, List<BigDecimal> capacities) {
        BigDecimal remaining = value(requiredShortfall);
        List<BigDecimal> amounts = new ArrayList<>();
        for (BigDecimal capacity : capacities == null ? List.<BigDecimal>of() : capacities) {
            BigDecimal amount = value(capacity).min(remaining);
            amounts.add(amount);
            remaining = remaining.subtract(amount);
        }
        return new Allocation(List.copyOf(amounts), remaining);
    }

    private static BigDecimal value(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount.max(BigDecimal.ZERO);
    }

    record Allocation(List<BigDecimal> amounts, BigDecimal remainingShortfall) {
    }
}
