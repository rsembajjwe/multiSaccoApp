package com.methaltech.sacco.subscription;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.notification.SmsWalletService;
import com.methaltech.sacco.subscription.BillingResponses.BillingCatalogResponse;
import com.methaltech.sacco.subscription.BillingResponses.TenantBillingItemResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Platform revenue management: maintain the billing rate catalog, assign add-ons/support/setup to SACCOs,
 * and view each SACCO's composed bill (base subscription + add-ons + overage + metered SMS). Platform-only.
 */
@RestController
@RequestMapping("/api/v1/platform-billing")
class PlatformBillingController {

    private final BillingCatalogRepository catalogRepository;
    private final TenantBillingItemRepository billingItemRepository;
    private final PlatformBillingService billingService;
    private final AuthService authService;
    private final AuditService auditService;
    private final SmsWalletService smsWalletService;

    PlatformBillingController(
            BillingCatalogRepository catalogRepository,
            TenantBillingItemRepository billingItemRepository,
            PlatformBillingService billingService,
            AuthService authService,
            AuditService auditService,
            SmsWalletService smsWalletService) {
        this.catalogRepository = catalogRepository;
        this.billingItemRepository = billingItemRepository;
        this.billingService = billingService;
        this.authService = authService;
        this.auditService = auditService;
        this.smsWalletService = smsWalletService;
    }

    @GetMapping("/catalog")
    ResponseEntity<?> listCatalog(@RequestHeader(name = "Authorization", required = false) String authorization) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:view");
        if (guard != null) return guard;
        return ResponseEntity.ok(ApiResponse.of(billingService.catalog().stream().map(BillingCatalogResponse::from).toList()));
    }

    @PatchMapping("/catalog/{code}")
    ResponseEntity<?> updateCatalog(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String code,
            @Valid @RequestBody CatalogRateRequest body,
            HttpServletRequest request) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:manage");
        if (guard != null) return guard;
        BillingCatalogItem item = catalogRepository.findById(code).orElse(null);
        if (item == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "BILLING_RATE_NOT_FOUND", "Billing rate not found."));
        }
        if (body.unitPrice() == null || body.unitPrice().signum() < 0
                || ("sms_rate".equals(code) && (body.active() == null || body.active()) && body.unitPrice().signum() <= 0)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BILLING_RATE", "Unit price must be zero or greater."));
        }
        item.update(body.unitPrice(), body.active() == null || body.active());
        BillingCatalogItem saved = catalogRepository.save(item);
        auditService.record("tenant_platform", currentUser(authorization),
                "Updated billing rate " + saved.getCode() + " to " + saved.getUnitPrice(),
                "billing_rate", saved.getCode(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(BillingCatalogResponse.from(saved)));
    }

    @PostMapping("/sms-wallets/{tenantId}/cash-payments")
    ResponseEntity<?> recordSmsCashPayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody SmsCashPaymentRequest body,
            HttpServletRequest request) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:manage");
        if (guard != null) return guard;
        int smsCount = body.smsCount() == null ? 0 : body.smsCount();
        if (smsCount <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "SMS_COUNT_REQUIRED", "Enter the number of SMS credits purchased."));
        }
        String reference = body.reference().trim();
        if (smsWalletService.referenceExists(tenantId, reference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "SMS_PAYMENT_REFERENCE_EXISTS", "That SMS cash-payment reference already exists."));
        }
        BigDecimal amount = smsWalletService.amountFor(smsCount);
        if (amount.signum() <= 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "SMS_RATE_NOT_CONFIGURED", "Set a positive SMS rate before recording purchases."));
        }
        int credited = smsWalletService.creditFromPayment(
                tenantId,
                amount,
                reference,
                "Cash SMS credit purchase");
        int balance = smsWalletService.balance(tenantId);
        auditService.record(
                tenantId,
                currentUser(authorization),
                "Recorded cash SMS purchase " + reference + " for " + credited + " credits",
                "sms_wallet",
                tenantId,
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(
                new SmsCashPaymentResponse(tenantId, credited, smsWalletService.smsRate(), amount, balance, reference)));
    }

    @GetMapping("/sms-sales")
    ResponseEntity<?> listSmsSales(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String tenantId,
            @RequestParam(name = "limit", required = false, defaultValue = "200") Integer limit) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:view");
        if (guard != null) return guard;
        return ResponseEntity.ok(ApiResponse.of(smsWalletService.sales(tenantId, limit == null ? 200 : limit)));
    }

    @GetMapping("/items")
    ResponseEntity<?> listItems(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId") String tenantId) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:view");
        if (guard != null) return guard;
        return ResponseEntity.ok(ApiResponse.of(billingItemRepository.findByTenantIdOrderByCreatedAtAsc(tenantId)
                .stream().map(this::toItemResponse).toList()));
    }

    @PostMapping("/items")
    ResponseEntity<?> addItem(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody AddBillingItemRequest body,
            HttpServletRequest request) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:manage");
        if (guard != null) return guard;
        BillingCatalogItem rate = catalogRepository.findById(body.catalogCode().trim()).orElse(null);
        if (rate == null || !rate.isActive()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BILLING_RATE", "Unknown or inactive billing rate."));
        }
        int quantity = body.quantity() == null ? 1 : Math.max(1, body.quantity());
        TenantBillingItem saved = billingItemRepository.save(
                new TenantBillingItem("billitem_" + UUID.randomUUID(), body.tenantId().trim(), rate.getCode(), quantity));
        auditService.record(body.tenantId().trim(), currentUser(authorization),
                "Added billing item " + rate.getName() + " to SACCO",
                "tenant_billing_item", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(toItemResponse(saved)));
    }

    @DeleteMapping("/items/{itemId}")
    ResponseEntity<?> cancelItem(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String itemId,
            @RequestParam(name = "tenantId") String tenantId,
            HttpServletRequest request) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:manage");
        if (guard != null) return guard;
        TenantBillingItem item = billingItemRepository.findByIdAndTenantId(itemId, tenantId).orElse(null);
        if (item == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "BILLING_ITEM_NOT_FOUND", "Billing item not found for this SACCO."));
        }
        item.cancel();
        billingItemRepository.save(item);
        auditService.record(tenantId, currentUser(authorization),
                "Cancelled billing item " + item.getCatalogCode(),
                "tenant_billing_item", item.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(toItemResponse(item)));
    }

    @GetMapping("/summary")
    ResponseEntity<?> summary(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId") String tenantId) {
        ResponseEntity<?> guard = requirePlatform(authorization, "subscriptions:view");
        if (guard != null) return guard;
        return ResponseEntity.ok(ApiResponse.of(billingService.summaryFor(tenantId)));
    }

    private TenantBillingItemResponse toItemResponse(TenantBillingItem item) {
        BillingCatalogItem rate = catalogRepository.findById(item.getCatalogCode()).orElse(null);
        BigDecimal unitPrice = rate == null ? BigDecimal.ZERO : rate.getUnitPrice();
        return new TenantBillingItemResponse(
                item.getId(),
                item.getTenantId(),
                item.getCatalogCode(),
                rate == null ? item.getCatalogCode() : rate.getName(),
                rate == null ? "unknown" : rate.getCategory(),
                item.getQuantity(),
                unitPrice,
                unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2, java.math.RoundingMode.HALF_UP),
                rate == null ? "annual" : rate.getBillingPeriod(),
                item.getStatus());
    }

    private ResponseEntity<?> requirePlatform(String authorization, String permission) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), permission)) {
            return authService.permissionRequired(permission);
        }
        if (!authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_ONLY", "Only platform administrators can manage billing."));
        }
        return null;
    }

    private com.methaltech.sacco.identity.User currentUser(String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        return currentSession == null ? null : currentSession.user();
    }

    record CatalogRateRequest(BigDecimal unitPrice, Boolean active) {
    }

    record SmsCashPaymentRequest(Integer smsCount, @NotBlank String reference) {
    }

    record SmsCashPaymentResponse(
            String tenantId,
            int smsCredits,
            BigDecimal unitPrice,
            BigDecimal amount,
            int smsBalance,
            String reference) {
    }

    record AddBillingItemRequest(@NotBlank String tenantId, @NotBlank String catalogCode, Integer quantity) {
    }
}
