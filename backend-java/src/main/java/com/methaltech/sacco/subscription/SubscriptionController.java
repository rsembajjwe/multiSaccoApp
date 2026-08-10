package com.methaltech.sacco.subscription;

import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.config.IdempotencyGuard;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.tenant.SaccoContact;
import com.methaltech.sacco.tenant.SaccoContactLookup;
import com.methaltech.sacco.tenant.Tenant;
import com.methaltech.sacco.tenant.TenantRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
class SubscriptionController {

    private static final Set<String> PAYMENT_CHANNELS = Set.of("manual", "cash", "bank", "mobile_money");
    private static final String SYSTEM_USER_ID = "user_platform_admin";

    private final SubscriptionPackageRepository packageRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final SubscriptionService subscriptionService;
    private final AccountingPeriodService periodService;
    private final AuthService authService;
    private final AuditService auditService;
    private final TenantRepository tenantRepository;
    private final SaccoContactLookup saccoContactLookup;
    private final NotificationService notificationService;
    private final IdempotencyGuard idempotencyGuard;

    @GetMapping("/api/v1/subscription-packages")
    ResponseEntity<?> listPackages(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return ResponseEntity.ok(ApiResponse.of(packageRepository.findByStatusOrderByMemberLimitAsc("active")
                .stream()
                .map(SubscriptionPackageResponse::from)
                .toList()));
    }

    @GetMapping("/api/v1/subscriptions")
    ResponseEntity<?> listSubscriptions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<Subscription> subscriptions = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? subscriptionRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : subscriptionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        return ResponseEntity.ok(ApiResponse.of(subscriptions.stream()
                .map(subscriptionService::refreshBilling)
                .map(subscriptionRepository::save)
                .map(SubscriptionResponse::from)
                .toList()));
    }

    @PostMapping("/api/v1/subscriptions/{subscriptionId}/payments")
    ResponseEntity<?> recordPayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String subscriptionId,
            @Valid @RequestBody RecordSubscriptionPaymentRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_ADMIN_REQUIRED", "Only platform administrators can record subscription payments."));
        }

        return subscriptionRepository.findById(subscriptionId)
                .<ResponseEntity<?>>map(subscription -> createPayment(subscription, body, currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.")));
    }

    @PostMapping("/api/v1/integrations/mobile-money/subscription-callback")
    ResponseEntity<?> receiveSubscriptionCallback(
            @Valid @RequestBody SubscriptionPaymentCallbackRequest body,
            HttpServletRequest request) {
        String tenantId = body.tenantId().trim();
        String externalReference = body.externalReference().trim();
        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "SACCO was not found for this subscription payment callback."));
        }

        Subscription subscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId).orElse(null);
        if (subscription == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "SUBSCRIPTION_NOT_FOUND", "No subscription exists for this SACCO."));
        }
        SubscriptionPayment existing = paymentRepository.findByExternalReferenceIgnoreCase(externalReference).orElse(null);
        if (existing != null) {
            return ResponseEntity.ok(ApiResponse.of(new SubscriptionPaymentResult(
                    SubscriptionResponse.from(subscription),
                    SubscriptionPaymentResponse.from(existing),
                    true)));
        }

        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_AMOUNT", "Subscription callback amount must be greater than zero."));
        }
        Instant receivedAt = body.receivedAt() == null ? Instant.now() : body.receivedAt();
        if (periodService.isClosed(tenantId, receivedAt)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Cannot post subscription payment callback into a closed accounting period."));
        }
        ResponseEntity<?> idempotencyConflict = reserveSubscriptionReference(subscription, externalReference);
        if (idempotencyConflict != null) return idempotencyConflict;

        SubscriptionPayment payment = paymentRepository.save(new SubscriptionPayment(
                "subscription_payment_" + UUID.randomUUID(),
                subscription.getId(),
                tenantId,
                amount,
                body.provider() == null || body.provider().isBlank() ? "mobile_money" : "mobile_money:" + body.provider().trim(),
                externalReference,
                receivedAt,
                SYSTEM_USER_ID));
        subscription.recordPayment(amount, LocalDate.now().plusYears(1));
        Subscription savedSubscription = subscriptionRepository.save(subscription);
        if ("active".equals(savedSubscription.getStatus()) && "pending_self_registration".equals(tenant.getStatus())) {
            tenant.updateStatus("pending_review");
            tenantRepository.save(tenant);
        }
        notifySubscriptionPayment(savedSubscription, payment);
        auditService.record(
                tenantId,
                null,
                "Posted mobile-money subscription callback " + externalReference,
                "subscription",
                savedSubscription.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new SubscriptionPaymentResult(
                SubscriptionResponse.from(savedSubscription),
                SubscriptionPaymentResponse.from(payment),
                false)));
    }

    private ResponseEntity<?> createPayment(
            Subscription subscription,
            RecordSubscriptionPaymentRequest body,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        subscriptionService.refreshBilling(subscription);
        BigDecimal due = Money.normalize(subscription.getAmount().subtract(subscription.getPaid()).max(BigDecimal.ZERO));
        BigDecimal amount = body.amount() == null ? due : Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero."));
        }

        Instant receivedAt = body.receivedAt() == null ? Instant.now() : body.receivedAt();
        if (periodService.isClosed(subscription.getTenantId(), receivedAt)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Cannot record subscription payments in a closed accounting period."));
        }

        String channel = body.channel() == null || body.channel().isBlank() ? "manual" : body.channel().trim();
        if (!PAYMENT_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_CHANNEL", "Unsupported subscription payment channel."));
        }

        String externalReference = body.externalReference() == null || body.externalReference().isBlank()
                ? "SUB-" + UUID.randomUUID()
                : body.externalReference().trim();
        SubscriptionPayment existing = paymentRepository.findByExternalReferenceIgnoreCase(externalReference).orElse(null);
        if (existing != null) {
            return ResponseEntity.ok(ApiResponse.of(new SubscriptionPaymentResult(
                    SubscriptionResponse.from(subscription),
                    SubscriptionPaymentResponse.from(existing),
                    true)));
        }
        ResponseEntity<?> idempotencyConflict = reserveSubscriptionReference(subscription, externalReference);
        if (idempotencyConflict != null) return idempotencyConflict;

        SubscriptionPayment payment = paymentRepository.save(new SubscriptionPayment(
                "subscription_payment_" + UUID.randomUUID(),
                subscription.getId(),
                subscription.getTenantId(),
                amount,
                channel,
                externalReference,
                receivedAt,
                currentSession.user().getId()));
        subscription.recordPayment(amount, LocalDate.now().plusYears(1));
        Subscription savedSubscription = subscriptionRepository.save(subscription);
        notifySubscriptionPayment(savedSubscription, payment);
        auditService.record(
                savedSubscription.getTenantId(),
                currentSession.user(),
                "Recorded subscription payment " + payment.getExternalReference(),
                "subscription",
                savedSubscription.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new SubscriptionPaymentResult(
                SubscriptionResponse.from(savedSubscription),
                SubscriptionPaymentResponse.from(payment),
                false)));
    }

    private ResponseEntity<?> reserveSubscriptionReference(Subscription subscription, String externalReference) {
        boolean reserved = idempotencyGuard.reserve("subscription-payment", externalReference);
        if (reserved) {
            return null;
        }
        SubscriptionPayment existing = paymentRepository.findByExternalReferenceIgnoreCase(externalReference).orElse(null);
        if (existing != null) {
            return ResponseEntity.ok(ApiResponse.of(new SubscriptionPaymentResult(
                    SubscriptionResponse.from(subscription),
                    SubscriptionPaymentResponse.from(existing),
                    true)));
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "PAYMENT_ALREADY_PROCESSING",
                        "A subscription payment with that reference is already being processed."));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            return null;
        }
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) return null;
        return tenantId;
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access subscriptions for another tenant."));
    }

    private void notifySubscriptionPayment(Subscription subscription, SubscriptionPayment payment) {
        SaccoContact contact = saccoContactLookup.findByTenantId(subscription.getTenantId()).orElse(null);
        if (contact == null) return;
        String saccoName = contact.legalName();
        notificationService.notifySaccoContact(
                subscription.getTenantId(),
                "subscription_payment_confirmed",
                "Subscription payment confirmed",
                "Tereka Online received subscription payment " + payment.getExternalReference()
                        + " for " + saccoName + ". Access is " + subscription.getStatus().replace('_', ' ') + ".",
                "subscription",
                subscription.getId(),
                contact.phone(),
                contact.email());
    }

    record RecordSubscriptionPaymentRequest(
            BigDecimal amount,
            String channel,
            String externalReference,
            Instant receivedAt) {
    }

    record SubscriptionPaymentCallbackRequest(
            @NotBlank String tenantId,
            @NotNull BigDecimal amount,
            @NotBlank String externalReference,
            String provider,
            Instant receivedAt) {
    }
}
