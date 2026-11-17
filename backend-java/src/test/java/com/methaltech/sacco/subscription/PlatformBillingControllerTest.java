package com.methaltech.sacco.subscription;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.notification.SmsWalletService;
import com.methaltech.sacco.notification.SmsInventoryService;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class PlatformBillingControllerTest {

    private final BillingCatalogRepository catalogRepository = mock(BillingCatalogRepository.class);
    private final TenantBillingItemRepository billingItemRepository = mock(TenantBillingItemRepository.class);
    private final PlatformBillingService billingService = mock(PlatformBillingService.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final SmsWalletService smsWalletService = mock(SmsWalletService.class);
    private final SmsInventoryService smsInventoryService = mock(SmsInventoryService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User platformUser = mock(User.class);
    private final PlatformBillingController controller = new PlatformBillingController(
            catalogRepository, billingItemRepository, billingService, authService, auditService, smsWalletService,
            smsInventoryService);

    @BeforeEach
    void configurePlatformAccess() {
        when(authService.currentSession("Bearer platform"))
                .thenReturn(new AuthService.CurrentSession(null, platformUser));
        when(authService.hasPermission(eq(platformUser), anyString())).thenReturn(true);
        when(authService.isPlatform(platformUser)).thenReturn(true);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(catalogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(billingItemRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void catalogEndpointsEnforceAccessAndValidateRates() {
        when(authService.authRequired()).thenReturn(org.springframework.http.ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
        assertEquals(HttpStatus.UNAUTHORIZED, controller.listCatalog(null).getStatusCode());

        BillingCatalogItem rate = rate("sms_rate", true, "250");
        when(billingService.catalog()).thenReturn(List.of(rate));
        assertEquals(HttpStatus.OK, controller.listCatalog("Bearer platform").getStatusCode());

        when(catalogRepository.findById("missing")).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, controller.updateCatalog(
                "Bearer platform", "missing", new PlatformBillingController.CatalogRateRequest(BigDecimal.ONE, true), request)
                .getStatusCode());

        when(catalogRepository.findById("sms_rate")).thenReturn(Optional.of(rate));
        assertEquals(HttpStatus.BAD_REQUEST, controller.updateCatalog(
                "Bearer platform", "sms_rate", new PlatformBillingController.CatalogRateRequest(BigDecimal.ZERO, true), request)
                .getStatusCode());
        assertEquals(HttpStatus.OK, controller.updateCatalog(
                "Bearer platform", "sms_rate", new PlatformBillingController.CatalogRateRequest(BigDecimal.valueOf(300), true), request)
                .getStatusCode());
        verify(catalogRepository).save(rate);
    }

    @Test
    void smsCashPaymentsValidateAndCreditWallet() {
        assertEquals(HttpStatus.BAD_REQUEST, controller.recordSmsCashPayment(
                "Bearer platform", "tenant_green", new PlatformBillingController.SmsCashPaymentRequest(0, "REF-1"), request)
                .getStatusCode());

        when(smsWalletService.referenceExists("tenant_green", "REF-1")).thenReturn(true);
        assertEquals(HttpStatus.CONFLICT, controller.recordSmsCashPayment(
                "Bearer platform", "tenant_green", new PlatformBillingController.SmsCashPaymentRequest(10, "REF-1"), request)
                .getStatusCode());

        when(smsWalletService.referenceExists("tenant_green", "REF-2")).thenReturn(false);
        when(smsWalletService.amountFor(10)).thenReturn(BigDecimal.ZERO);
        assertEquals(HttpStatus.CONFLICT, controller.recordSmsCashPayment(
                "Bearer platform", "tenant_green", new PlatformBillingController.SmsCashPaymentRequest(10, "REF-2"), request)
                .getStatusCode());

        when(smsWalletService.amountFor(20)).thenReturn(BigDecimal.valueOf(5000));
        when(smsWalletService.creditFromPayment("tenant_green", BigDecimal.valueOf(5000), "REF-3", "Cash SMS credit purchase"))
                .thenReturn(20);
        when(smsWalletService.smsRate()).thenReturn(BigDecimal.valueOf(250));
        when(smsWalletService.balance("tenant_green")).thenReturn(120);
        assertEquals(HttpStatus.CREATED, controller.recordSmsCashPayment(
                "Bearer platform", "tenant_green", new PlatformBillingController.SmsCashPaymentRequest(20, "REF-3"), request)
                .getStatusCode());
        assertEquals(HttpStatus.OK, controller.listSmsSales("Bearer platform", "tenant_green", null).getStatusCode());
    }

    @Test
    void smsInventorySettingsValidateAndUpdate() {
        assertEquals(HttpStatus.OK, controller.smsInventory("Bearer platform").getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.updateSmsInventorySettings(
                "Bearer platform",
                new PlatformBillingController.SmsInventorySettingsRequest(BigDecimal.ZERO, BigDecimal.TEN, 10),
                request).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.updateSmsInventorySettings(
                "Bearer platform",
                new PlatformBillingController.SmsInventorySettingsRequest(BigDecimal.TEN, BigDecimal.TEN, -1),
                request).getStatusCode());
        assertEquals(HttpStatus.OK, controller.updateSmsInventorySettings(
                "Bearer platform",
                new PlatformBillingController.SmsInventorySettingsRequest(
                        BigDecimal.valueOf(35), BigDecimal.valueOf(45), 100),
                request).getStatusCode());
        verify(smsInventoryService).updateSettings(
                BigDecimal.valueOf(35), BigDecimal.valueOf(45), 100, null);
    }

    @Test
    void billingItemsCanBeListedAddedCancelledAndSummarized() {
        BillingCatalogItem rate = rate("addon_api_access", true, "900000");
        TenantBillingItem item = new TenantBillingItem("item-1", "tenant_green", "addon_api_access", 2);
        when(catalogRepository.findById("addon_api_access")).thenReturn(Optional.of(rate));
        when(billingItemRepository.findByTenantIdOrderByCreatedAtAsc("tenant_green")).thenReturn(List.of(item));

        assertEquals(HttpStatus.OK, controller.listItems("Bearer platform", "tenant_green").getStatusCode());
        assertEquals(HttpStatus.CREATED, controller.addItem(
                "Bearer platform",
                new PlatformBillingController.AddBillingItemRequest(" tenant_green ", " addon_api_access ", 0),
                request).getStatusCode());

        when(billingItemRepository.findByIdAndTenantId("missing", "tenant_green")).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, controller.cancelItem(
                "Bearer platform", "missing", "tenant_green", request).getStatusCode());

        when(billingItemRepository.findByIdAndTenantId("item-1", "tenant_green")).thenReturn(Optional.of(item));
        assertEquals(HttpStatus.OK, controller.cancelItem(
                "Bearer platform", "item-1", "tenant_green", request).getStatusCode());
        assertEquals("cancelled", item.getStatus());
        assertEquals(HttpStatus.OK, controller.summary("Bearer platform", "tenant_green").getStatusCode());
    }

    private BillingCatalogItem rate(String code, boolean active, String unitPrice) {
        BillingCatalogItem rate = mock(BillingCatalogItem.class);
        when(rate.getCode()).thenReturn(code);
        when(rate.getName()).thenReturn(code);
        when(rate.getCategory()).thenReturn("addon");
        when(rate.getBillingPeriod()).thenReturn("annual");
        when(rate.getUnitPrice()).thenReturn(new BigDecimal(unitPrice));
        when(rate.isActive()).thenReturn(active);
        return rate;
    }
}
