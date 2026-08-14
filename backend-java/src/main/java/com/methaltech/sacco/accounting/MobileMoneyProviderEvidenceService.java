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

        int pendingRequests = countPaymentRequestsByStatus(paymentRequests, "pending_provider_callback", "accepted", "pending");
        int failedRequests = countPaymentRequestsByStatus(paymentRequests, "failed", "expired", "cancelled");
        int postedRequests = countPaymentRequestsByStatus(paymentRequests, "posted");
        int pendingCallbacks = countCallbacksByStatus(callbacks, "pending_approval");
        int postedCallbacks = countCallbacksByStatus(callbacks, "posted");
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

    private static int countPaymentRequestsByStatus(List<MobileMoneyPaymentRequestEntity> rows, String... statuses) {
        List<String> allowed = java.util.Arrays.stream(statuses)
                .map(String::toLowerCase)
                .toList();
        return (int) rows.stream()
                .map(MobileMoneyPaymentRequestEntity::getStatus)
                .filter(status -> status != null && allowed.contains(status.toLowerCase()))
                .count();
    }

    private static int countCallbacksByStatus(List<MobileMoneyCallback> rows, String... statuses) {
        List<String> allowed = java.util.Arrays.stream(statuses)
                .map(String::toLowerCase)
                .toList();
        return (int) rows.stream()
                .map(MobileMoneyCallback::getStatus)
                .filter(status -> status != null && allowed.contains(status.toLowerCase()))
                .count();
    }
}
