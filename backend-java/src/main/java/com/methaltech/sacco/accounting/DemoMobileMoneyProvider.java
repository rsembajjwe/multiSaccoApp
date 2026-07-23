package com.methaltech.sacco.accounting;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class DemoMobileMoneyProvider implements MobileMoneyProvider {

    private final String providerId;

    DemoMobileMoneyProvider(@Value("${sacco.providers.mobile-money:demo_mobile_money}") String providerId) {
        this.providerId = providerId;
    }

    @Override
    public String providerId() {
        return providerId;
    }

    @Override
    public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
        String reference = request.externalReference() == null || request.externalReference().isBlank()
                ? "DEMO-MM-" + java.util.UUID.randomUUID()
                : request.externalReference().trim();
        return new MobileMoneyPaymentResult(
                "payment_request_" + java.util.UUID.randomUUID(),
                request.tenantId(),
                request.memberId(),
                request.purpose(),
                request.amount(),
                request.currencyCode(),
                providerId,
                reference,
                reference,
                "pending_demo_callback",
                "Demo mobile-money request created. Use the callback endpoint or browser demo action to post it.",
                "Demo mode does not contact a payment network.",
                true,
                java.time.Instant.now());
    }
}
