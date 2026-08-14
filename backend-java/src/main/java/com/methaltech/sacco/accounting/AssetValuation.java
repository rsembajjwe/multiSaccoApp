package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;

final class AssetValuation {

    private AssetValuation() {
    }

    static BigDecimal netBookValue(Asset asset) {
        return asset.getCost().subtract(accumulatedDepreciation(asset)).max(asset.getSalvageValue());
    }

    static BigDecimal accumulatedDepreciation(Asset asset) {
        if (!"active".equals(asset.getStatus()) || asset.getDepreciationStartDate() == null) return BigDecimal.ZERO;
        LocalDate today = LocalDate.now();
        LocalDate start = asset.getDepreciationStartDate().withDayOfMonth(1);
        if (start.isAfter(today)) return BigDecimal.ZERO;
        LocalDate currentMonth = today.withDayOfMonth(1);
        int elapsedMonths = (int) Period.between(start, currentMonth).toTotalMonths() + 1;
        int depreciatedMonths = Math.min(elapsedMonths, asset.getUsefulLifeMonths());
        BigDecimal depreciableAmount = asset.getCost().subtract(asset.getSalvageValue());
        return depreciableAmount
                .multiply(BigDecimal.valueOf(depreciatedMonths))
                .divide(BigDecimal.valueOf(asset.getUsefulLifeMonths()), 2, RoundingMode.HALF_UP);
    }
}
