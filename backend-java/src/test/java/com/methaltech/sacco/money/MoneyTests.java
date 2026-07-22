package com.methaltech.sacco.money;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class MoneyTests {

    @Test
    void normalizesMoneyToTwoDecimals() {
        assertEquals(new BigDecimal("125000.13"), Money.normalize(new BigDecimal("125000.126")));
        assertEquals(new BigDecimal("125000.12"), Money.normalize(new BigDecimal("125000.124")));
        assertEquals(new BigDecimal("1000.00"), Money.parse("1,000"));
    }
}
