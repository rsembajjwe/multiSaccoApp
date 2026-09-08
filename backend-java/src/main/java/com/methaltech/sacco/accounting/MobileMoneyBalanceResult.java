package com.methaltech.sacco.accounting;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A mobile-money provider's own float/account balance, fetched live from the provider. Used to show
 * SACCO leadership (treasurer, chairperson) how much is available on each configured network.
 */
record MobileMoneyBalanceResult(
        String providerId,
        String label,
        boolean supported,
        boolean available,
        BigDecimal balance,
        String currency,
        String message,
        Instant checkedAt) {

    static MobileMoneyBalanceResult unsupported(String providerId, String label) {
        return new MobileMoneyBalanceResult(providerId, label, false, false, null, null,
                "Balance lookup is not available for this provider.", Instant.now());
    }

    static MobileMoneyBalanceResult error(String providerId, String label, String message) {
        return new MobileMoneyBalanceResult(providerId, label, true, false, null, null, message, Instant.now());
    }

    static MobileMoneyBalanceResult ok(String providerId, String label, BigDecimal balance, String currency) {
        return new MobileMoneyBalanceResult(providerId, label, true, true, balance, currency,
                "Live balance from provider.", Instant.now());
    }
}
