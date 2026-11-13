package com.methaltech.sacco.accounting;

import java.util.Set;

final class MobileMoneyPaymentRules {

    private static final Set<String> CONTRIBUTION_PURPOSES = Set.of("savings_deposit", "share_purchase", "welfare_contribution");
    private static final Set<String> STAFF_CLOSURE_STATUSES = Set.of("failed", "expired", "cancelled");
    private static final Set<String> TERMINAL_STATUSES = Set.of("failed", "expired", "cancelled", "posted", "rejected");

    private MobileMoneyPaymentRules() {
    }

    static boolean contributionPurpose(String purpose) {
        return purpose != null && CONTRIBUTION_PURPOSES.contains(purpose.trim());
    }

    static boolean staffClosureStatus(String status) {
        return status != null && STAFF_CLOSURE_STATUSES.contains(status.trim());
    }

    static boolean terminalStatus(String status) {
        return status != null && TERMINAL_STATUSES.contains(status.trim());
    }

    static boolean providerStatusRefreshable(String status) {
        return status != null
                && !"pending_approval".equals(status.trim())
                && !terminalStatus(status);
    }

    static boolean providerFundsReceived(String status) {
        return status != null && Set.of("pending_approval", "posted").contains(status.trim());
    }
}
