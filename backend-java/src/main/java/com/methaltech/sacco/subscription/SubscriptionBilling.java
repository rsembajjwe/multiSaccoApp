package com.methaltech.sacco.subscription;

import java.math.BigDecimal;

record SubscriptionBilling(
        int memberCount,
        int billableMembers,
        BigDecimal unitPrice,
        String tierId,
        String tierLabel,
        String billingDescription,
        BigDecimal amount) {
}
