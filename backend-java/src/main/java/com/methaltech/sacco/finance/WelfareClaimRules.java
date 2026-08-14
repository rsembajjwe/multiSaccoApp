package com.methaltech.sacco.finance;

import java.util.Set;

final class WelfareClaimRules {

    private static final Set<String> DECISION_STATUSES = Set.of("approved", "rejected");
    private static final Set<String> PAYMENT_CHANNELS = Set.of("mobile_money", "cash", "bank");

    private WelfareClaimRules() {
    }

    static boolean isDecisionStatus(String status) {
        return status != null && DECISION_STATUSES.contains(status);
    }

    static boolean requiresRejectionReason(String status) {
        return "rejected".equals(status);
    }

    static boolean isPayableStatus(String status) {
        return "approved".equals(status);
    }

    static boolean isPaymentChannel(String channel) {
        return channel != null && PAYMENT_CHANNELS.contains(channel);
    }
}
