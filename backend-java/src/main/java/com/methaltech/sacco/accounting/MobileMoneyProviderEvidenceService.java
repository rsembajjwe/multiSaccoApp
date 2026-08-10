package com.methaltech.sacco.accounting;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileMoneyProviderEvidenceService {

    private final MobileMoneyPaymentRequestRepository paymentRequestRepository;
    private final MobileMoneyCallbackRepository callbackRepository;
    private final MobileMoneyProviderRouter mobileMoneyRouter;
    private final MobileMoneyReconciliationJob reconciliationJob;

    public MobileMoneyProviderEvidence build(String tenantId, boolean platformAll) {
        List<MobileMoneyPaymentRequestEntity> paymentRequests = platformAll
                ? paymentRequestRepository.findAllByOrderByTenantIdAscRequestedAtDesc()
                : paymentRequestRepository.findByTenantIdOrderByRequestedAtDesc(tenantId);
        List<MobileMoneyCallback> callbacks = platformAll
                ? callbackRepository.findAllByOrderByTenantIdAscReceivedAtDesc()
                : callbackRepository.findByTenantIdOrderByReceivedAtDesc(tenantId);

        int pendingRequests = countByStatus(paymentRequests, "pending_provider_callback", "accepted", "pending");
        int failedRequests = countByStatus(paymentRequests, "failed", "expired", "cancelled");
        int postedRequests = countByStatus(paymentRequests, "posted");
        int pendingCallbacks = countByStatus(callbacks, "pending_approval");
        int postedCallbacks = countByStatus(callbacks, "posted");
        String evidenceStatus = failedRequests == 0 && pendingRequests == 0 ? "ready" : "review";

        return new MobileMoneyProviderEvidence(
                paymentRequests.size(),
                pendingRequests,
                failedRequests,
                postedRequests,
                callbacks.size(),
                pendingCallbacks,
                postedCallbacks,
                mobileMoneyRouter.availablePaymentOptions(),
                reconciliationJob.lastSummary(),
                evidenceStatus);
    }

    private static int countByStatus(List<?> rows, String... statuses) {
        List<String> allowed = java.util.Arrays.stream(statuses)
                .map(String::toLowerCase)
                .toList();
        return (int) rows.stream()
                .filter(row -> {
                    String status = row instanceof MobileMoneyPaymentRequestEntity request
                            ? request.getStatus()
                            : ((MobileMoneyCallback) row).getStatus();
                    return status != null && allowed.contains(status.toLowerCase());
                })
                .count();
    }
}
