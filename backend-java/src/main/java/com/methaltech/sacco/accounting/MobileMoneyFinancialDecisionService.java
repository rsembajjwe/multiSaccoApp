package com.methaltech.sacco.accounting;

import org.springframework.stereotype.Service;

@Service
public class MobileMoneyFinancialDecisionService {

    private final MobileMoneyCallbackRepository callbackRepository;
    private final MobileMoneyPaymentRequestRepository paymentRequestRepository;

    MobileMoneyFinancialDecisionService(
            MobileMoneyCallbackRepository callbackRepository,
            MobileMoneyPaymentRequestRepository paymentRequestRepository) {
        this.callbackRepository = callbackRepository;
        this.paymentRequestRepository = paymentRequestRepository;
    }

    public void synchronize(String tenantId, String transactionId, String status, String reason) {
        MobileMoneyCallback callback = callbackRepository
                .findByTenantIdAndResourceTypeAndResourceId(tenantId, "financial_transaction", transactionId)
                .orElse(null);
        if (callback == null) return;

        callback.recordFinancialDecision(status);
        callbackRepository.save(callback);
        paymentRequestRepository
                .findByTenantIdAndExternalReferenceIgnoreCase(tenantId, callback.getExternalReference())
                .ifPresent(request -> {
                    if ("posted".equals(status)) {
                        request.markPosted("financial_transaction", transactionId);
                    } else {
                        String message = reason == null || reason.isBlank()
                                ? "Payment received but the linked financial transaction was rejected."
                                : "Payment received but rejected during financial review: " + reason.trim();
                        request.updateStatus("rejected", message);
                    }
                    paymentRequestRepository.save(request);
                });
    }
}
