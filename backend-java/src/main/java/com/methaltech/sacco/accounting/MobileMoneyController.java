package com.methaltech.sacco.accounting;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanRepayment;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberAuthService;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
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
    private static final Set<String> CONTRIBUTION_PURPOSES = Set.of("savings_deposit", "share_purchase", "welfare_contribution");

    private final MobileMoneyCallbackRepository callbackRepository;
    private final MemberRepository memberRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final StatementLineRepository statementLineRepository;
    private final NotificationService notificationService;
    private final AuthService authService;
    private final MemberAuthService memberAuthService;
    private final TenantService tenantService;
    private final MobileMoneyPaymentRequestRepository paymentRequestRepository;
    private final ObjectMapper objectMapper;
    private final MobileMoneyProvider mobileMoneyProvider;

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
        if (!CONTRIBUTION_PURPOSES.contains(purpose) && !"loan_repayment".equals(purpose)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_PURPOSE", "Unsupported mobile-money payment purpose."));
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
        String currencyCode = tenant == null || tenant.currencyCode() == null || tenant.currencyCode().isBlank()
                ? "UGX"
                : tenant.currencyCode();
        String externalReference = body.externalReference() == null || body.externalReference().isBlank()
                ? "MM-" + UUID.randomUUID()
                : body.externalReference().trim();
        if (paymentRequestRepository.existsByTenantIdAndExternalReferenceIgnoreCase(member.getTenantId(), externalReference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "PAYMENT_REFERENCE_EXISTS", "A mobile-money payment request with that reference already exists."));
        }

        MobileMoneyPaymentResult result = mobileMoneyProvider.requestPayment(new MobileMoneyPaymentRequest(
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
        MobileMoneyPaymentRequestEntity saved = paymentRequestRepository.save(MobileMoneyPaymentRequestEntity.from(
                result,
                body.loanId(),
                phone,
                payload(body.providerPayload())));
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
        String provider = mobileMoneyProvider.normalizeProvider(body.provider());
        if (CONTRIBUTION_PURPOSES.contains(purpose)) {
            return postContribution(body, tenantId, externalReference, provider, member, amount);
        }
        if ("loan_repayment".equals(purpose)) {
            return postLoanRepayment(body, tenantId, externalReference, provider, member, amount);
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

        return ResponseEntity.ok(ApiResponse.of(callbacks.stream().map(MobileMoneyCallbackResponse::from).toList()));
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

        member.applyPostedTransaction(body.purpose().trim(), amount);
        memberRepository.save(member);

        FinancialTransaction transaction = transactionRepository.save(FinancialTransaction.postedProviderTransaction(
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
        notificationService.notifyPaymentPosted(member, body.purpose().trim(), amount, "financial_transaction", transaction.getId());

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
                "financial_transaction",
                transaction.getId()));
        markMatchingPaymentRequestPosted(tenantId, externalReference, "financial_transaction", transaction.getId());
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

        LoanRepayment repayment = repaymentRepository.save(new LoanRepayment(
                "repayment_" + UUID.randomUUID(),
                tenantId,
                loan.getId(),
                member.getId(),
                amount,
                "mobile_money",
                externalReference,
                "Mobile-money loan repayment",
                SYSTEM_USER_ID));
        loan.recordRepayment(amount);
        loanRepository.save(loan);
        createStatementLine(tenantId, amount, externalReference, "Mobile-money loan repayment");
        notificationService.notifyPaymentPosted(member, "loan_repayment", amount, "loan_repayment", repayment.getId());

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
                "loan_repayment",
                repayment.getId()));
        markMatchingPaymentRequestPosted(tenantId, externalReference, "loan_repayment", repayment.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MobileMoneyCallbackResponse.from(callback)));
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
}
