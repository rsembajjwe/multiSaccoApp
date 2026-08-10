package com.methaltech.sacco.accounting;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MobileMoneyReconciliationJob {

    static final String JOB_NAME = "mobile_money_reconciliation";

    private static final Set<String> RECONCILABLE_STATUSES = Set.of(
            "pending_provider_callback",
            "pending_demo_callback",
            "accepted",
            "pending",
            "paid_pending_callback");

    private final MobileMoneyPaymentRequestRepository paymentRequestRepository;
    private final MobileMoneyProviderRouter mobileMoneyRouter;
    private final IntegrationJobRunRepository jobRunRepository;
    private final AtomicReference<MobileMoneyReconciliationSummary> lastSummary =
            new AtomicReference<>(MobileMoneyReconciliationSummary.empty());

    @Value("${sacco.integrations.mobile-money.reconciliation.batch-size:50}")
    private int batchSize;

    @Value("${sacco.integrations.mobile-money.reconciliation.enabled:true}")
    private boolean enabled;

    @Scheduled(
            fixedDelayString = "${sacco.integrations.mobile-money.reconciliation.fixed-delay:PT5M}",
            initialDelayString = "${sacco.integrations.mobile-money.reconciliation.initial-delay:PT1M}")
    public void runScheduled() {
        if (!enabled) return;
        reconcilePendingRequests();
    }

    public MobileMoneyReconciliationSummary reconcilePendingRequests() {
        Instant startedAt = Instant.now();
        List<MobileMoneyPaymentRequestEntity> requests = paymentRequestRepository
                .findByStatusInOrderByRequestedAtAsc(RECONCILABLE_STATUSES, PageRequest.of(0, Math.max(1, batchSize)));
        int updated = 0;
        int failed = 0;
        for (MobileMoneyPaymentRequestEntity request : requests) {
            try {
                MobileMoneyProviderStatusResult result = mobileMoneyRouter.resolve(request.getProvider()).queryPaymentStatus(request);
                request.syncProviderStatus(result);
                paymentRequestRepository.save(request);
                updated++;
            } catch (MobileMoneyProviderException exception) {
                request.recordProviderStatusCheckFailure("Provider status check failed: " + exception.getMessage());
                paymentRequestRepository.save(request);
                failed++;
            }
        }
        String status = failed == 0 ? "completed" : (updated > 0 ? "completed_with_errors" : "failed");
        String message = requests.isEmpty()
                ? "No pending mobile-money payment requests required provider status polling."
                : "Checked " + requests.size() + " pending mobile-money payment request(s).";
        Instant finishedAt = Instant.now();
        IntegrationJobRun run = jobRunRepository.save(new IntegrationJobRun(
                "job_run_" + UUID.randomUUID(),
                JOB_NAME,
                status,
                requests.size(),
                updated,
                failed,
                message,
                startedAt,
                finishedAt));
        MobileMoneyReconciliationSummary summary = new MobileMoneyReconciliationSummary(
                requests.size(),
                updated,
                failed,
                run.getStatus(),
                run.getMessage(),
                run.getFinishedAt());
        lastSummary.set(summary);
        return summary;
    }

    public MobileMoneyReconciliationSummary lastSummary() {
        return jobRunRepository.findFirstByJobNameOrderByFinishedAtDesc(JOB_NAME)
                .map(MobileMoneyReconciliationSummary::from)
                .orElseGet(lastSummary::get);
    }
}
