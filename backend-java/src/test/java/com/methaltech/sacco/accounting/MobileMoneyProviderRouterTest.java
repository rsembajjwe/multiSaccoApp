package com.methaltech.sacco.accounting;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.config.ProviderCredentialService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class MobileMoneyProviderRouterTest {

    @Test
    void savedPlatformActiveProviderOverridesEnvironmentDefault() {
        MobileMoneyProviderRouter router = new MobileMoneyProviderRouter(
                List.of(
                        provider("mtn_momo", true),
                        provider("airtel_money", true),
                        provider("demo_mobile_money", true)),
                credentialService("airtel_money"),
                "mtn_momo");

        assertEquals("airtel_money", router.defaultProvider().providerId());
        assertEquals("airtel_money", router.resolve(null).providerId());
    }

    @Test
    void explicitNetworkStillRoutesToThatConfiguredProvider() {
        MobileMoneyProviderRouter router = new MobileMoneyProviderRouter(
                List.of(
                        provider("mtn_momo", true),
                        provider("airtel_money", true),
                        provider("demo_mobile_money", true)),
                credentialService("airtel_money"),
                "mtn_momo");

        assertEquals("mtn_momo", router.resolve("mtn").providerId());
    }

    private ProviderCredentialService credentialService(String activeProvider) {
        ProviderCredentialService service = mock(ProviderCredentialService.class);
        when(service.resolve(ProviderCredentialService.PLATFORM_SCOPE, "mobile_money", "active_provider"))
                .thenReturn(activeProvider);
        return service;
    }

    private MobileMoneyProvider provider(String providerId, boolean configured) {
        return new MobileMoneyProvider() {
            @Override
            public String providerId() {
                return providerId;
            }

            @Override
            public boolean isConfigured() {
                return configured;
            }

            @Override
            public MobileMoneyPaymentResult requestPayment(MobileMoneyPaymentRequest request) {
                return new MobileMoneyPaymentResult(
                        "payment_request_test",
                        request.tenantId(),
                        request.memberId(),
                        request.purpose(),
                        request.amount() == null ? BigDecimal.ZERO : request.amount(),
                        request.currencyCode(),
                        providerId,
                        request.externalReference(),
                        "provider-reference",
                        "pending_provider_callback",
                        "Accepted.",
                        "Approve prompt.",
                        true,
                        Instant.now());
            }

            @Override
            public MobileMoneyProviderStatusResult queryPaymentStatus(MobileMoneyPaymentRequestEntity request) {
                return new MobileMoneyProviderStatusResult(
                        request.getStatus(),
                        request.getStatusMessage(),
                        request.getProviderReference(),
                        "PENDING",
                        request.isCallbackPosting(),
                        Instant.now());
            }

            @Override
            public MobileMoneyBalanceResult queryBalance() {
                return MobileMoneyBalanceResult.unsupported(providerId, providerId);
            }
        };
    }
}
