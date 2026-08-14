package com.methaltech.sacco.accounting;

import java.util.Set;

final class AccountingRules {

    private static final Set<String> STATEMENT_CHANNELS = Set.of("cash", "bank", "mobile_money", "payroll_deduction");

    private AccountingRules() {
    }

    static boolean statementChannel(String channel) {
        return channel != null && STATEMENT_CHANNELS.contains(channel.trim());
    }
}
