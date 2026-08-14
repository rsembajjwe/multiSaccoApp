package com.methaltech.sacco.approval;

import java.util.Set;

final class ApprovalRules {

    private static final Set<String> MODULES = Set.of(
            "members", "transactions", "loans", "expenses", "assets", "subscriptions", "governance");
    private static final Set<String> DECISIONS = Set.of("pending", "approved", "rejected", "corrections_requested");
    private static final Set<String> DECISIONS_REQUIRING_REASON = Set.of("rejected", "corrections_requested");

    private ApprovalRules() {
    }

    static boolean supportsModule(String module) {
        return module != null && MODULES.contains(module.trim());
    }

    static String normalizeDecision(String requestedDecision) {
        if (requestedDecision == null || requestedDecision.isBlank()) return null;
        String decision = requestedDecision.trim();
        return DECISIONS.contains(decision) ? decision : null;
    }

    static boolean requiresReason(String decision) {
        return decision != null && DECISIONS_REQUIRING_REASON.contains(decision);
    }
}
