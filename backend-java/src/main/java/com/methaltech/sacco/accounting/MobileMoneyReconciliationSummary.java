package com.methaltech.sacco.accounting;

import java.time.Instant;

public record MobileMoneyReconciliationSummary(
        int scanned,
        int updated,
        int failed,
        String status,
        String message,
        Instant ranAt) {

    static MobileMoneyReconciliationSummary empty() {
        return new MobileMoneyReconciliationSummary(0, 0, 0, "not_run", "No reconciliation run has been recorded yet.", null);
    }

    static MobileMoneyReconciliationSummary from(IntegrationJobRun run) {
        if (run == null) return empty();
        return new MobileMoneyReconciliationSummary(
                run.getScanned(),
                run.getUpdated(),
                run.getFailed(),
                run.getStatus(),
                run.getMessage(),
                run.getFinishedAt());
    }
}
