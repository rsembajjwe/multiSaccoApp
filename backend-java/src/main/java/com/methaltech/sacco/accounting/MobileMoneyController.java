package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.config.IdempotencyGuard;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepayment;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberAuthService;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.member.MemberPasswordResetRequest;
import com.methaltech.sacco.member.MemberPasswordResetRequestRepository;
import com.methaltech.sacco.member.MemberSubscription;
import com.methaltech.sacco.member.MemberSubscriptionRepository;
import com.methaltech.sacco.member.MemberSubscriptionService;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/integrations/mobile-money")
@RequiredArgsConstructor
class MobileMoneyController {

    private static final String SYSTEM_USER_ID = "user_platform_admin";

    private final MobileMoneyCallbackRepository callbackRepository;
    private final MemberRepository memberRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final StatementLineRepository statementLineRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final AuthService authService;
    private final MemberAuthService memberAuthService;
    private final TenantService tenantService;
    private final MobileMoneyPaymentRequestRepository paymentRequestRepository;
    private final ObjectMapper objectMapper;
    private final MobileMoneyProviderRouter mobileMoneyRouter;
    private final IdempotencyGuard idempotencyGuard;
    private final com.methaltech.sacco.tenant.SaccoPaymentAccountRepository paymentAccountRepository;
    private final MemberSubscriptionRepository memberSubscriptionRepository;
    private final MemberSubscriptionService memberSubscriptionService;
    private final MemberPasswordResetRequestRepository passwordResetRepository;

    @PostMapping("/payment-requests")
    ResponseEntity<?> requestPayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody MemberPaymentRequest body) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_NOT_ACTIVE", "Only active members can initiate mobile-money payments."));
        }
        String purpose = body.purpose().trim();
        if (!MobileMoneyPaymentRules.contributionPurpose(purpose)
                && !"loan_repayment".equals(purpose)
                && !"membership_dues".equals(purpose)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_PURPOSE", "Unsupported mobile-money payment purpose."));
        }
        if ("membership_dues".equals(purpose)
                && memberSubscriptionRepository.findFirstByMemberIdOrderByCreatedAtDesc(member.getId()).isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "NO_MEMBERSHIP", "You do not have a member subscription to pay. Contact your SACCO office."));
        }
        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero."));
        }
        String phone = body.payerPhone() == null || body.payerPhone().isBlank() ? member.getPhone() : body.payerPhone().trim();
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "PAYER_PHONE_REQUIRED", "A mobile-money phone number is required."));
        }
        if ("loan_repayment".equals(purpose)) {
            ResponseEntity<?> loanValidation = validateLoanRepaymentRequest(body.loanId(), member, amount);
            if (loanValidation != null) return loanValidation;
        }
        TenantResponse tenant = tenantService.findById(member.getTenantId()).orElse(null);
        if (tenant == null || !tenant.mobileMoneyCollectionAvailable()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "COLLECTION_METHOD_NOT_ALLOWED",
                            "Online payment collection is not yet enabled for this SACCO. Please contact your SACCO office."));
        }
        String currencyCode = tenant.currencyCode() == null || tenant.currencyCode().isBlank()
                ? "UGX"
                : tenant.currencyCode();
        String externalReference = body.externalReference() == null || body.externalReference().isBlank()
                ? "MM-" + UUID.randomUUID()
                : body.externalReference().trim();
        if (paymentRequestRepository.existsByTenantIdAndExternalReferenceIgnoreCase(member.getTenantId(), externalReference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "PAYMENT_REFERENCE_EXISTS", "A mobile-money payment request with that reference already exists."));
        }

        MobileMoneyPaymentResult result;
        try {
            result = mobileMoneyRouter.resolve(body.provider()).requestPayment(new MobileMoneyPaymentRequest(
                    member.getTenantId(),
                    member.getId(),
                    member.getMembershipNo(),
                    body.loanId(),
                    purpose,
                    amount,
                    currencyCode,
                    phone,
                    externalReference,
                    body.provider(),
                    body.providerPayload()));
        } catch (MobileMoneyProviderException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiErrorResponse.of(502, "PAYMENT_PROVIDER_UNAVAILABLE", exception.getMessage()));
        }
        MobileMoneyPaymentRequestEntity saved = paymentRequestRepository.save(MobileMoneyPaymentRequestEntity.from(
                result,
                body.loanId(),
                phone,
                payload(body.providerPayload())));
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.of(MobileMoneyPaymentRequestResponse.from(saved)));
    }

    @PostMapping("/payment-requests/staff")
    ResponseEntity<?> requestStaffMemberPayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody StaffMemberPaymentRequest body,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "members:create")) {
            return authService.permissionRequired("members:create");
        }
        String purpose = body.purpose().trim();
        if (!"membership_dues".equals(purpose)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_PURPOSE", "Staff-initiated member prompts are currently for member subscriptions only."));
        }
        Member member = memberRepository.findById(body.memberId().trim()).orElse(null);
        if (member == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member was not found."));
        }
        String tenantId = tenantScope(currentSession, member.getTenantId());
        if (tenantId == null || !tenantId.equals(member.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot initiate payment for another SACCO's member."));
        }
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_NOT_ACTIVE", "Only active members can receive mobile-money payment prompts."));
        }
        MemberSubscription subscription = body.subscriptionId() == null || body.subscriptionId().isBlank()
                ? memberSubscriptionService.ensureMandatorySubscription(member)
                : memberSubscriptionRepository.findById(body.subscriptionId().trim()).orElse(null);
        if (subscription == null || !subscription.getTenantId().equals(member.getTenantId()) || !subscription.getMemberId().equals(member.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "NO_MEMBERSHIP", "This member has no matching subscription record."));
        }
        BigDecimal balanceDue = subscription.getAmount().subtract(subscription.getPaid() == null ? BigDecimal.ZERO : subscription.getPaid());
        if (!"expired".equals(subscription.getStatus()) && balanceDue.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBERSHIP_ALREADY_PAID", "This member's subscription is already fully paid for the current cycle."));
        }
        BigDecimal amount = Money.normalize(balanceDue.compareTo(BigDecimal.ZERO) > 0 ? balanceDue : subscription.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_AMOUNT", "Payment amount must be greater than zero."));
        }
        String phone = body.payerPhone() == null || body.payerPhone().isBlank() ? member.getPhone() : body.payerPhone().trim();
        if (phone == null || phone.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "PAYER_PHONE_REQUIRED", "A mobile-money phone number is required."));
        }
        TenantResponse tenant = tenantService.findById(member.getTenantId()).orElse(null);
        if (tenant == null || !tenant.mobileMoneyCollectionAvailable()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "COLLECTION_METHOD_NOT_ALLOWED",
                            "Online payment collection is not enabled for this SACCO."));
        }
        String currencyCode = tenant.currencyCode() == null || tenant.currencyCode().isBlank() ? "UGX" : tenant.currencyCode();
        String externalReference = body.externalReference() == null || body.externalReference().isBlank()
                ? "DUES-" + member.getMembershipNo() + "-" + UUID.randomUUID()
                : body.externalReference().trim();
        if (paymentRequestRepository.existsByTenantIdAndExternalReferenceIgnoreCase(member.getTenantId(), externalReference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "PAYMENT_REFERENCE_EXISTS", "A mobile-money payment request with that reference already exists."));
        }

        MobileMoneyPaymentResult result;
        try {
            result = mobileMoneyRouter.resolve(body.provider()).requestPayment(new MobileMoneyPaymentRequest(
                    member.getTenantId(),
                    member.getId(),
                    member.getMembershipNo(),
                    "",
                    purpose,
                    amount,
                    currencyCode,
                    phone,
                    externalReference,
                    body.provider(),
                    body.providerPayload()));
        } catch (MobileMoneyProviderException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiErrorResponse.of(502, "PAYMENT_PROVIDER_UNAVAILABLE", exception.getMessage()));
        }
        MobileMoneyPaymentRequestEntity saved = paymentRequestRepository.save(MobileMoneyPaymentRequestEntity.from(
                result,
                "",
                phone,
                payload(body.providerPayload())));
        auditService.record(
                member.getTenantId(),
                currentSession.user(),
                "Initiated member subscription mobile-money prompt " + saved.getExternalReference() + " for " + member.getMembershipNo(),
                "mobile_money_payment_request",
                saved.getId(),
                servletRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.of(MobileMoneyPaymentRequestResponse.from(saved)));
    }

    @PostMapping("/callback")
    @Transactional
    ResponseEntity<?> receiveCallback(@Valid @RequestBody MobileMoneyCallbackRequest body) {
        String tenantId = body.tenantId().trim();
        String externalReference = body.externalReference().trim();
        MobileMoneyCallback duplicate = callbackRepository.findByTenantIdAndExternalReferenceIgnoreCase(tenantId, externalReference)
                .orElse(null);
        if (duplicate != null) {
            return ResponseEntity.ok(ApiResponse.of(MobileMoneyCallbackResponse.from(duplicate, true)));
        }

        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_CALLBACK_AMOUNT", "Mobile-money amount must be greater than zero."));
        }

        Member member = resolveMember(tenantId, body);
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_CALLBACK_MEMBER", "Callback member could not be matched for this tenant."));
        }
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_NOT_ACTIVE", "Only active members can receive mobile-money postings."));
        }

        String purpose = body.purpose().trim();
        String provider = mobileMoneyRouter.resolve(body.provider()).normalizeProvider(body.provider());
        if (MobileMoneyPaymentRules.contributionPurpose(purpose)) {
            return postContribution(body, tenantId, externalReference, provider, member, amount);
        }
        if ("loan_repayment".equals(purpose)) {
            return postLoanRepayment(body, tenantId, externalReference, provider, member, amount);
        }
        if ("membership_dues".equals(purpose)) {
            return postMembershipDues(body, tenantId, externalReference, provider, member, amount);
        }
        if ("password_reset_sms".equals(purpose)) {
            return activatePasswordResetSms(body, tenantId, externalReference, provider, member, amount);
        }
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(400, "INVALID_CALLBACK_PURPOSE", "Unsupported mobile-money payment purpose."));
    }

    @GetMapping("/callbacks")
    ResponseEntity<?> listCallbacks(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access mobile-money callbacks for another tenant."));
        }

        var callbacks = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? callbackRepository.findAllByOrderByTenantIdAscReceivedAtDesc()
                : callbackRepository.findByTenantIdOrderByReceivedAtDesc(tenantId);

        java.util.Map<String, java.util.List<com.methaltech.sacco.tenant.SaccoPaymentAccount>> accountsByTenant =
                new java.util.HashMap<>();
        return ResponseEntity.ok(ApiResponse.of(callbacks.stream()
                .map(callback -> {
                    java.util.List<com.methaltech.sacco.tenant.SaccoPaymentAccount> tenantAccounts =
                            accountsByTenant.computeIfAbsent(
                                    callback.getTenantId(),
                                    paymentAccountRepository::findByTenantIdOrderByChannelAscCreatedAtAsc);
                    return MobileMoneyCallbackResponse.from(
                            callback,
                            false,
                            suggestCollectionAccount(callback, tenantAccounts),
                            confirmedCollectionAccount(callback, tenantAccounts));
                })
                .toList()));
    }

    /**
     * Best-effort attribution of a mobile-money callback to the SACCO-owned collection account whose
     * network matches the callback provider (e.g. an {@code mtn_momo} callback → the SACCO's MTN account),
     * so callbacks can be reconciled against the right destination account. Returns null when the SACCO has
     * no active mobile-money account for that network.
     */
    private com.methaltech.sacco.tenant.SaccoPaymentAccount suggestCollectionAccount(
            MobileMoneyCallback callback,
            java.util.List<com.methaltech.sacco.tenant.SaccoPaymentAccount> tenantAccounts) {
        String network = providerNetwork(callback.getProvider());
        if (network == null) return null;
        return tenantAccounts.stream()
                .filter(com.methaltech.sacco.tenant.SaccoPaymentAccount::isActive)
                .filter(com.methaltech.sacco.tenant.SaccoPaymentAccount::isMobileMoney)
                .filter(account -> network.equals(providerNetwork(account.getNetwork())))
                .findFirst()
                .orElse(null);
    }

    /** The account a staff member persisted on the callback (may be deactivated), or null. */
    private com.methaltech.sacco.tenant.SaccoPaymentAccount confirmedCollectionAccount(
            MobileMoneyCallback callback,
            java.util.List<com.methaltech.sacco.tenant.SaccoPaymentAccount> tenantAccounts) {
        if (callback.getCollectionAccountId() == null) return null;
        return tenantAccounts.stream()
                .filter(account -> callback.getCollectionAccountId().equals(account.getId()))
                .findFirst()
                .orElse(null);
    }

    /** Normalises provider ids and account networks (mtn_momo, airtel_money, mpesa_daraja, mtn, airtel...) to a common network key. */
    private static String providerNetwork(String value) {
        if (value == null) return null;
        String lower = value.toLowerCase(java.util.Locale.ROOT);
        if (lower.contains("mtn")) return "mtn";
        if (lower.contains("airtel")) return "airtel";
        if (lower.contains("mpesa") || lower.contains("m-pesa")) return "mpesa";
        return null;
    }

    @GetMapping("/payment-requests")
    ResponseEntity<?> listPaymentRequests(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession != null) {
            if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
                return authService.permissionRequired("accounting:view");
            }
            String tenantId = tenantScope(currentSession, requestedTenantId);
            if (tenantId == null && !authService.isPlatform(currentSession.user())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access mobile-money payment requests for another SACCO."));
            }
            var requests = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                    ? paymentRequestRepository.findAllByOrderByTenantIdAscRequestedAtDesc()
                    : paymentRequestRepository.findByTenantIdOrderByRequestedAtDesc(tenantId);
            return ResponseEntity.ok(ApiResponse.of(requests.stream().map(MobileMoneyPaymentRequestResponse::from).toList()));
        }

        MemberAuthService.CurrentMemberSession memberSession = memberAuthService.currentSession(authorization);
        if (memberSession == null) return authService.authRequired();
        var requests = paymentRequestRepository.findByMemberIdOrderByRequestedAtDesc(memberSession.member().getId());
        return ResponseEntity.ok(ApiResponse.of(requests.stream().map(MobileMoneyPaymentRequestResponse::from).toList()));
    }

    @GetMapping("/payment-requests/{requestId}/provider-status")
    ResponseEntity<?> refreshProviderStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String requestId,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        MobileMoneyPaymentRequestEntity request = paymentRequestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "PAYMENT_REQUEST_NOT_FOUND", "Mobile-money payment request was not found."));
        }

        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession != null) {
            if (!authService.hasPermission(currentSession.user(), "accounting:view")) {
                return authService.permissionRequired("accounting:view");
            }
            String tenantId = tenantScope(currentSession, requestedTenantId);
            if (tenantId == null) tenantId = request.getTenantId();
            if (!request.getTenantId().equals(tenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot refresh another SACCO's mobile-money payment request."));
            }
            return refreshAndSaveProviderStatus(request);
        }

        MemberAuthService.CurrentMemberSession memberSession = memberAuthService.currentSession(authorization);
        if (memberSession == null) return authService.authRequired();
        if (!request.getMemberId().equals(memberSession.member().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "MEMBER_ACCESS_DENIED", "Cannot refresh another member's mobile-money payment request."));
        }
        return refreshAndSaveProviderStatus(request);
    }

    @PatchMapping("/payment-requests/{requestId}/status")
    ResponseEntity<?> updatePaymentRequestStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String requestId,
            @Valid @RequestBody UpdatePaymentRequestStatusRequest body,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }
        String status = body.status().trim();
        if (!MobileMoneyPaymentRules.staffClosureStatus(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_REQUEST_STATUS", "Payment requests can only be marked failed, expired or cancelled by staff."));
        }
        MobileMoneyPaymentRequestEntity request = paymentRequestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "PAYMENT_REQUEST_NOT_FOUND", "Mobile-money payment request was not found."));
        }
        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot update another SACCO's mobile-money payment request."));
        }
        if (tenantId == null) tenantId = request.getTenantId();
        if (!authService.isPlatform(currentSession.user()) && !request.getTenantId().equals(tenantId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot update another SACCO's mobile-money payment request."));
        }
        if (authService.isPlatform(currentSession.user()) && requestedTenantId != null && !requestedTenantId.isBlank() && !request.getTenantId().equals(requestedTenantId.trim())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Requested SACCO scope does not match this mobile-money payment request."));
        }
        if ("posted".equals(request.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "PAYMENT_REQUEST_ALREADY_POSTED", "Posted payment requests cannot be changed manually."));
        }
        request.updateStatus(status, body.reason());
        MobileMoneyPaymentRequestEntity saved = paymentRequestRepository.save(request);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                "Marked mobile-money payment request " + saved.getExternalReference() + " " + status,
                "mobile_money_payment_request",
                saved.getId(),
                servletRequest.getRemoteAddr());
        notificationService.notifyPaymentRequestManuallyClosed(
                saved.getTenantId(),
                saved.getExternalReference(),
                status,
                saved.getAmount(),
                saved.getCurrencyCode(),
                body.reason(),
                saved.getId());
        return ResponseEntity.ok(ApiResponse.of(MobileMoneyPaymentRequestResponse.from(saved)));
    }

    @PatchMapping("/callbacks/{callbackId}/collection-account")
    ResponseEntity<?> assignCallbackCollectionAccount(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String callbackId,
            @Valid @RequestBody AssignCallbackCollectionAccountRequest body,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            jakarta.servlet.http.HttpServletRequest servletRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }
        MobileMoneyCallback callback = callbackRepository.findById(callbackId).orElse(null);
        if (callback == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "CALLBACK_NOT_FOUND", "Mobile-money callback was not found."));
        }
        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot update another SACCO's mobile-money callback."));
        }
        if (!authService.isPlatform(currentSession.user()) && !callback.getTenantId().equals(tenantId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot update another SACCO's mobile-money callback."));
        }

        String requestedAccountId = body.collectionAccountId() == null || body.collectionAccountId().isBlank()
                ? null
                : body.collectionAccountId().trim();
        com.methaltech.sacco.tenant.SaccoPaymentAccount account = null;
        if (requestedAccountId != null) {
            account = paymentAccountRepository.findByIdAndTenantId(requestedAccountId, callback.getTenantId()).orElse(null);
            if (account == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "PAYMENT_ACCOUNT_NOT_FOUND", "Collection account not found for this SACCO."));
            }
            if (!account.isActive()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "PAYMENT_ACCOUNT_INACTIVE", "Cannot attribute reconciliation to a deactivated collection account."));
            }
        }

        callback.assignCollectionAccount(requestedAccountId);
        MobileMoneyCallback saved = callbackRepository.save(callback);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                requestedAccountId == null
                        ? "Cleared collection account for mobile-money callback " + saved.getExternalReference()
                        : "Attributed mobile-money callback " + saved.getExternalReference() + " to collection account " + account.getAccountNumber(),
                "mobile_money_callback",
                saved.getId(),
                servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(MobileMoneyCallbackResponse.from(saved, false, null, account)));
    }

    /** Confirm/override the SACCO collection account for a callback; null/blank clears the attribution. */
    record AssignCallbackCollectionAccountRequest(String collectionAccountId) {
    }

    private ResponseEntity<?> refreshAndSaveProviderStatus(MobileMoneyPaymentRequestEntity request) {
        if ("posted".equals(request.getStatus())) {
            return ResponseEntity.ok(ApiResponse.of(MobileMoneyPaymentRequestResponse.from(request)));
        }
        try {
            MobileMoneyProviderStatusResult result = mobileMoneyRouter.resolve(request.getProvider()).queryPaymentStatus(request);
            request.syncProviderStatus(result);
            MobileMoneyPaymentRequestEntity saved = paymentRequestRepository.save(request);
            return ResponseEntity.ok(ApiResponse.of(MobileMoneyPaymentRequestResponse.from(saved)));
        } catch (MobileMoneyProviderException exception) {
            request.recordProviderStatusCheckFailure("Provider status check failed: " + exception.getMessage());
            MobileMoneyPaymentRequestEntity saved = paymentRequestRepository.save(request);
            return ResponseEntity.ok(ApiResponse.of(MobileMoneyPaymentRequestResponse.from(saved)));
        }
    }

    private ResponseEntity<?> postContribution(
            MobileMoneyCallbackRequest body,
            String tenantId,
            String externalReference,
            String provider,
            Member member,
            BigDecimal amount) {
        if (transactionRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, externalReference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "FINANCIAL_REFERENCE_EXISTS", "A financial transaction with that reference already exists."));
        }
        ResponseEntity<?> idempotencyConflict = reserveCallbackReference(tenantId, externalReference);
        if (idempotencyConflict != null) return idempotencyConflict;

        // Member mobile-money contributions are RECEIVED but not auto-posted: they enter the
        // maker-checker approval queue (maker = system) so a treasurer/authorised checker confirms
        // them before the member balance is credited. The credit happens on approval in
        // FinancialTransactionController#decideTransaction.
        FinancialTransaction transaction = transactionRepository.save(FinancialTransaction.pendingProviderTransaction(
                "txn_" + UUID.randomUUID(),
                tenantId,
                member.getBranchId(),
                member.getId(),
                body.purpose().trim(),
                "mobile_money",
                amount,
                externalReference,
                "Mobile-money " + body.purpose().trim().replace('_', ' '),
                SYSTEM_USER_ID));
        createStatementLine(tenantId, amount, externalReference, "Mobile-money collection " + body.purpose().trim());
        notificationService.notifyPaymentPendingApproval(member, body.purpose().trim(), amount, "financial_transaction", transaction.getId());

        MobileMoneyCallback callback = callbackRepository.save(new MobileMoneyCallback(
                "callback_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                body.purpose().trim(),
                amount,
                externalReference,
                provider,
                payload(body.providerPayload()),
                "pending_approval",
                "financial_transaction",
                transaction.getId()));
        markMatchingPaymentRequestPosted(tenantId, externalReference, "financial_transaction", transaction.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MobileMoneyCallbackResponse.from(callback)));
    }

    /**
     * Applies a confirmed mobile-money dues payment to the member's membership. Unlike member-fund
     * contributions (which enter maker-checker before crediting a member balance), dues are the member's
     * own obligation paid into the SACCO's collection account, so they are applied directly: a full
     * payment activates and renews the membership. A callback record and statement line are written for
     * reconciliation.
     */
    private ResponseEntity<?> postMembershipDues(
            MobileMoneyCallbackRequest body,
            String tenantId,
            String externalReference,
            String provider,
            Member member,
            BigDecimal amount) {
        ResponseEntity<?> idempotencyConflict = reserveCallbackReference(tenantId, externalReference);
        if (idempotencyConflict != null) return idempotencyConflict;

        MemberSubscription membership = memberSubscriptionRepository.findFirstByMemberIdOrderByCreatedAtDesc(member.getId()).orElse(null);
        if (membership == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "NO_MEMBERSHIP", "This member has no subscription to apply payment to."));
        }
        MemberSubscription updated = memberSubscriptionService.recordPayment(membership, amount);
        createStatementLine(tenantId, amount, externalReference, "Mobile-money member subscription");
        notificationService.notifyPaymentPosted(member, "membership_dues", amount, "member_subscription", updated.getId());

        MobileMoneyCallback callback = callbackRepository.save(new MobileMoneyCallback(
                "callback_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                body.purpose().trim(),
                amount,
                externalReference,
                provider,
                payload(body.providerPayload()),
                "posted",
                "member_subscription",
                updated.getId()));
        markMatchingPaymentRequestPosted(tenantId, externalReference, "member_subscription", updated.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MobileMoneyCallbackResponse.from(callback)));
    }

    /**
     * Confirms the UGX 500 SMS password-reset fee. The reset request was created in {@code pending_payment}
     * state; once the mobile-money payment is confirmed here, it is activated and the reset code is sent by
     * SMS. A callback record and statement line are written for reconciliation of the fee.
     */
    private ResponseEntity<?> activatePasswordResetSms(
            MobileMoneyCallbackRequest body,
            String tenantId,
            String externalReference,
            String provider,
            Member member,
            BigDecimal amount) {
        MemberPasswordResetRequest reset = passwordResetRepository
                .findFirstByTenantIdAndExternalReferenceAndStatus(tenantId, externalReference, "pending_payment")
                .orElse(null);
        if (reset == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "RESET_REQUEST_NOT_FOUND", "No pending SMS password-reset request matches this payment."));
        }
        if (!reset.getMemberId().equals(member.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "RESET_MEMBER_MISMATCH", "Payment member does not match the reset request."));
        }
        if (amount.compareTo(reset.getAmount()) < 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "RESET_FEE_UNDERPAID", "The SMS reset fee was underpaid."));
        }
        ResponseEntity<?> idempotencyConflict = reserveCallbackReference(tenantId, externalReference);
        if (idempotencyConflict != null) return idempotencyConflict;

        reset.activate();
        passwordResetRepository.save(reset);
        notificationService.sendPasswordResetCode(member, reset.getToken(), "sms");
        createStatementLine(tenantId, amount, externalReference, "Mobile-money SMS password-reset fee");

        MobileMoneyCallback callback = callbackRepository.save(new MobileMoneyCallback(
                "callback_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                body.purpose().trim(),
                amount,
                externalReference,
                provider,
                payload(body.providerPayload()),
                "posted",
                "member_password_reset",
                reset.getId()));
        markMatchingPaymentRequestPosted(tenantId, externalReference, "member_password_reset", reset.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MobileMoneyCallbackResponse.from(callback)));
    }

    private ResponseEntity<?> postLoanRepayment(
            MobileMoneyCallbackRequest body,
            String tenantId,
            String externalReference,
            String provider,
            Member member,
            BigDecimal amount) {
        if (body.loanId() == null || body.loanId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "LOAN_REQUIRED", "Loan id is required for mobile-money loan repayments."));
        }
        Loan loan = loanRepository.findById(body.loanId().trim())
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .filter(candidate -> candidate.getMemberId().equals(member.getId()))
                .orElse(null);
        if (loan == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_CALLBACK_LOAN", "Loan does not exist for this member and tenant."));
        }
        if (!"active".equals(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_NOT_ACTIVE", "Only active loans can receive repayments."));
        }
        if (amount.compareTo(loan.getBalance()) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment amount cannot exceed the outstanding loan balance."));
        }
        if (repaymentRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, externalReference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "DUPLICATE_REPAYMENT_REFERENCE", "Repayment reference already exists for this SACCO."));
        }
        ResponseEntity<?> idempotencyConflict = reserveCallbackReference(tenantId, externalReference);
        if (idempotencyConflict != null) return idempotencyConflict;

        // Member mobile-money loan repayments are RECEIVED but not auto-posted: they enter the
        // approval queue (maker = system) so a treasurer/authorised checker confirms them before the
        // loan balance is reduced. The reduction happens on approval in
        // LoanController#decideRepayment.
        LoanRepayment repayment = repaymentRepository.save(LoanRepayment.pendingMobileMoney(
                "repayment_" + UUID.randomUUID(),
                tenantId,
                loan.getId(),
                member.getId(),
                amount,
                externalReference,
                "Mobile-money loan repayment",
                SYSTEM_USER_ID));
        createStatementLine(tenantId, amount, externalReference, "Mobile-money loan repayment");
        notificationService.notifyPaymentPendingApproval(member, "loan_repayment", amount, "loan_repayment", repayment.getId());

        MobileMoneyCallback callback = callbackRepository.save(new MobileMoneyCallback(
                "callback_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                body.purpose().trim(),
                amount,
                externalReference,
                provider,
                payload(body.providerPayload()),
                "pending_approval",
                "loan_repayment",
                repayment.getId()));
        markMatchingPaymentRequestPosted(tenantId, externalReference, "loan_repayment", repayment.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MobileMoneyCallbackResponse.from(callback)));
    }

    private ResponseEntity<?> reserveCallbackReference(String tenantId, String externalReference) {
        boolean reserved = idempotencyGuard.reserve("mobile-money-callback:" + tenantId, externalReference);
        if (reserved) {
            return null;
        }
        MobileMoneyCallback duplicate = callbackRepository.findByTenantIdAndExternalReferenceIgnoreCase(tenantId, externalReference)
                .orElse(null);
        if (duplicate != null) {
            return ResponseEntity.ok(ApiResponse.of(MobileMoneyCallbackResponse.from(duplicate, true)));
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "CALLBACK_ALREADY_PROCESSING",
                        "A callback with that reference is already being processed for this SACCO."));
    }

    private void markMatchingPaymentRequestPosted(String tenantId, String externalReference, String resourceType, String resourceId) {
        paymentRequestRepository.findByTenantIdAndExternalReferenceIgnoreCase(tenantId, externalReference)
                .ifPresent(request -> {
                    request.markPosted(resourceType, resourceId);
                    paymentRequestRepository.save(request);
                });
    }

    private ResponseEntity<?> validateLoanRepaymentRequest(String loanId, Member member, BigDecimal amount) {
        if (loanId == null || loanId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "LOAN_REQUIRED", "Loan id is required for mobile-money loan repayments."));
        }
        Loan loan = loanRepository.findById(loanId.trim())
                .filter(candidate -> candidate.getTenantId().equals(member.getTenantId()))
                .filter(candidate -> candidate.getMemberId().equals(member.getId()))
                .orElse(null);
        if (loan == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_LOAN", "Loan does not exist for this member and SACCO."));
        }
        if (!"active".equals(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_NOT_ACTIVE", "Only active loans can receive repayments."));
        }
        if (amount.compareTo(loan.getBalance()) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment amount cannot exceed the outstanding loan balance."));
        }
        return null;
    }

    private Member resolveMember(String tenantId, MobileMoneyCallbackRequest body) {
        if (body.memberId() != null && !body.memberId().isBlank()) {
            return memberRepository.findById(body.memberId().trim())
                    .filter(member -> member.getTenantId().equals(tenantId))
                    .orElse(null);
        }
        if (body.memberIdentifier() == null || body.memberIdentifier().isBlank()) return null;
        String identifier = body.memberIdentifier().trim();
        return memberRepository.findFirstByMembershipNoIgnoreCaseOrPhoneIgnoreCaseOrEmailIgnoreCase(identifier, identifier, identifier)
                .filter(member -> member.getTenantId().equals(tenantId))
                .orElse(null);
    }

    private void createStatementLine(String tenantId, BigDecimal amount, String externalReference, String description) {
        if (statementLineRepository.existsByTenantIdAndExternalReferenceIgnoreCase(tenantId, externalReference)) return;
        statementLineRepository.save(new StatementLine(
                "statement_" + UUID.randomUUID(),
                tenantId,
                "1020",
                "mobile_money",
                amount,
                externalReference,
                description,
                java.time.LocalDate.now(),
                SYSTEM_USER_ID));
    }

    private String payload(Object providerPayload) {
        if (providerPayload == null) return "{}";
        try {
            return objectMapper.writeValueAsString(providerPayload);
        } catch (Exception ignored) {
            return String.valueOf(providerPayload);
        }
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

    record MobileMoneyCallbackRequest(
            @NotBlank String tenantId,
            String memberId,
            String memberIdentifier,
            String loanId,
            @NotBlank String purpose,
            @NotNull BigDecimal amount,
            @NotBlank String externalReference,
            String provider,
            Map<String, Object> providerPayload) {
    }

    record MemberPaymentRequest(
            String loanId,
            @NotBlank String purpose,
            @NotNull BigDecimal amount,
            String payerPhone,
            String externalReference,
            String provider,
            Map<String, Object> providerPayload) {
    }

    record StaffMemberPaymentRequest(
            @NotBlank String memberId,
            String subscriptionId,
            @NotBlank String purpose,
            @NotNull BigDecimal amount,
            String payerPhone,
            String externalReference,
            String provider,
            Map<String, Object> providerPayload) {
    }

    record UpdatePaymentRequestStatusRequest(@NotBlank String status, String reason) {
    }
}
