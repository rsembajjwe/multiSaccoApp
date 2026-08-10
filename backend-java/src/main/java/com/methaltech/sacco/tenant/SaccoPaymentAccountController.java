package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;
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
 * SACCO-admin management of a SACCO's own collection accounts (its mobile-money numbers/merchant codes
 * and bank accounts). Members pay into these directly. A channel can only be configured if the
 * platform's allowed collection mode permits it.
 */
@RestController
@RequestMapping("/api/v1/sacco-payment-accounts")
class SaccoPaymentAccountController {

    private static final Set<String> CHANNELS = Set.of(
            SaccoPaymentAccount.CHANNEL_MOBILE_MONEY, SaccoPaymentAccount.CHANNEL_BANK);

    private final SaccoPaymentAccountRepository accountRepository;
    private final TenantRepository tenantRepository;
    private final AuthService authService;
    private final AuditService auditService;

    SaccoPaymentAccountController(
            SaccoPaymentAccountRepository accountRepository,
            TenantRepository tenantRepository,
            AuthService authService,
            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.tenantRepository = tenantRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }
        String tenantId = resolveTenant(currentSession, requestedTenantId);
        if (tenantId == null) return tenantRequired();

        return ResponseEntity.ok(ApiResponse.of(accountRepository.findByTenantIdOrderByChannelAscCreatedAtAsc(tenantId)
                .stream().map(SaccoPaymentAccountResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> create(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @Valid @RequestBody PaymentAccountRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (authService.isPlatform(currentSession.user())) {
            return saccoStaffRequired();
        }
        String tenantId = resolveTenant(currentSession, requestedTenantId);
        if (tenantId == null) return tenantRequired();

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) return notFound("TENANT_NOT_FOUND", "SACCO not found.");

        String channel = body.channel() == null ? "" : body.channel().trim();
        ResponseEntity<?> validation = validate(tenant, channel, body);
        if (validation != null) return validation;

        SaccoPaymentAccount account = accountRepository.save(new SaccoPaymentAccount(
                "paymentaccount_" + UUID.randomUUID(),
                tenantId,
                channel,
                normalize(body.network()),
                body.accountName().trim(),
                body.accountNumber().trim(),
                trimOrNull(body.bankName()),
                trimOrNull(body.branch()),
                trimOrNull(body.swiftCode()),
                trimOrNull(body.instructions())));
        auditService.record(tenantId, currentSession.user(),
                "Added " + channel.replace('_', ' ') + " collection account " + account.getAccountNumber(),
                "sacco_payment_account", account.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(SaccoPaymentAccountResponse.from(account)));
    }

    @PatchMapping("/{accountId}")
    ResponseEntity<?> update(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @PathVariable String accountId,
            @Valid @RequestBody PaymentAccountRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (authService.isPlatform(currentSession.user())) {
            return saccoStaffRequired();
        }
        String tenantId = resolveTenant(currentSession, requestedTenantId);
        if (tenantId == null) return tenantRequired();

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) return notFound("TENANT_NOT_FOUND", "SACCO not found.");
        SaccoPaymentAccount account = accountRepository.findByIdAndTenantId(accountId, tenantId).orElse(null);
        if (account == null) return notFound("PAYMENT_ACCOUNT_NOT_FOUND", "Collection account not found for this SACCO.");

        boolean active = body.active() == null || body.active();
        // Only re-validate the allowed-mode rule when the account is (or becomes) active.
        if (active) {
            ResponseEntity<?> validation = validate(tenant, account.getChannel(), body);
            if (validation != null) return validation;
        }
        account.update(
                normalize(body.network()),
                body.accountName().trim(),
                body.accountNumber().trim(),
                trimOrNull(body.bankName()),
                trimOrNull(body.branch()),
                trimOrNull(body.swiftCode()),
                trimOrNull(body.instructions()),
                active);
        SaccoPaymentAccount saved = accountRepository.save(account);
        auditService.record(tenantId, currentSession.user(),
                "Updated collection account " + saved.getAccountNumber() + " (active=" + active + ")",
                "sacco_payment_account", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(SaccoPaymentAccountResponse.from(saved)));
    }

    @DeleteMapping("/{accountId}")
    ResponseEntity<?> delete(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @PathVariable String accountId,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (authService.isPlatform(currentSession.user())) {
            return saccoStaffRequired();
        }
        String tenantId = resolveTenant(currentSession, requestedTenantId);
        if (tenantId == null) return tenantRequired();

        SaccoPaymentAccount account = accountRepository.findByIdAndTenantId(accountId, tenantId).orElse(null);
        if (account == null) return notFound("PAYMENT_ACCOUNT_NOT_FOUND", "Collection account not found for this SACCO.");
        accountRepository.delete(account);
        auditService.record(tenantId, currentSession.user(),
                "Removed collection account " + account.getAccountNumber(),
                "sacco_payment_account", account.getId(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> validate(Tenant tenant, String channel, PaymentAccountRequest body) {
        if (!CHANNELS.contains(channel)) {
            return badRequest("INVALID_COLLECTION_CHANNEL", "Channel must be 'mobile_money' or 'bank'.");
        }
        CollectionMode allowed = tenant.getAllowedCollectionMode();
        if (SaccoPaymentAccount.CHANNEL_MOBILE_MONEY.equals(channel) && !allowed.allowsMobileMoney()) {
            return conflict("COLLECTION_METHOD_NOT_ALLOWED", "Mobile money collection is not allowed for this SACCO by the platform.");
        }
        if (SaccoPaymentAccount.CHANNEL_BANK.equals(channel) && !allowed.allowsBank()) {
            return conflict("COLLECTION_METHOD_NOT_ALLOWED", "Bank collection is not allowed for this SACCO by the platform.");
        }
        if (body.accountName() == null || body.accountName().isBlank()
                || body.accountNumber() == null || body.accountNumber().isBlank()) {
            return badRequest("INVALID_COLLECTION_ACCOUNT", "Account name and account number are required.");
        }
        if (SaccoPaymentAccount.CHANNEL_BANK.equals(channel) && (body.bankName() == null || body.bankName().isBlank())) {
            return badRequest("INVALID_COLLECTION_ACCOUNT", "Bank name is required for a bank account.");
        }
        return null;
    }

    private String resolveTenant(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        return currentSession.user().getTenantId();
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private static String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResponseEntity<ApiErrorResponse> tenantRequired() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "A SACCO must be selected to manage its collection accounts."));
    }

    private ResponseEntity<ApiErrorResponse> saccoStaffRequired() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "SACCO_STAFF_REQUIRED", "Only SACCO staff can manage the SACCO's own collection accounts."));
    }

    private ResponseEntity<ApiErrorResponse> notFound(String code, String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of(404, code, message));
    }

    private ResponseEntity<ApiErrorResponse> badRequest(String code, String message) {
        return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, code, message));
    }

    private ResponseEntity<ApiErrorResponse> conflict(String code, String message) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiErrorResponse.of(409, code, message));
    }

    record PaymentAccountRequest(
            @NotBlank String channel,
            String network,
            String accountName,
            String accountNumber,
            String bankName,
            String branch,
            String swiftCode,
            String instructions,
            Boolean active) {
    }
}
