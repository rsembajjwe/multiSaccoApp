package com.methaltech.sacco.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Money {
    private Money() {
    }

    public static BigDecimal normalize(BigDecimal value) {
        if (value == null) return null;
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal parse(String value) {
        if (value == null || value.isBlank()) return normalize(BigDecimal.ZERO);
        return normalize(new BigDecimal(value.trim().replace(",", "")));
    }
}
