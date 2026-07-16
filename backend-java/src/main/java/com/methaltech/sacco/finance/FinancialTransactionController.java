package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/financial-transactions")
class FinancialTransactionController {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "savings_deposit",
            "share_purchase",
            "welfare_contribution",
            "withdrawal");
    private static final Set<String> ALLOWED_CHANNELS = Set.of(
            "mobile_money",
            "cash",
            "bank",
            "payroll_deduction");
    private static final Set<String> DECISION_STATUSES = Set.of("posted", "rejected");

    private final FinancialTransactionRepository transactionRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final TenantService tenantService;
    private final AuthService authService;
    private final AuditService auditService;
    private final AccountingPeriodService periodService;

    FinancialTransactionController(
            FinancialTransactionRepository transactionRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            TenantService tenantService,
            AuthService authService,
            AuditService auditService,
            AccountingPeriodService periodService) {
        this.transactionRepository = transactionRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.tenantService = tenantService;
        this.authService = authService;
        this.auditService = auditService;
        this.periodService = periodService;
    }

    @GetMapping
    ResponseEntity<?> listTransactions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<FinancialTransaction> transactions = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? transactionRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : transactionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(transactions.stream().map(FinancialTransactionResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createTransaction(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateTransactionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        Member member = memberRepository.findById(body.memberId().trim())
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElse(null);
        if (member == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
        }

        String branchId = body.branchId() == null || body.branchId().isBlank() ? member.getBranchId() : body.branchId().trim();
        if (branchRepository.findById(branchId)
                .filter(branch -> branch.getTenantId().equals(tenantId))
                .isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BRANCH", "Branch does not exist for this tenant."));
        }

        String type = body.type().trim();
        if (!ALLOWED_TYPES.contains(type)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_TRANSACTION_TYPE", "Unsupported transaction type."));
        }

        String channel = body.channel().trim();
        if (!ALLOWED_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PAYMENT_CHANNEL", "Unsupported payment channel."));
        }

        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_TRANSACTION_AMOUNT", "Amount must be greater than zero."));
        }

        String reference = referenceForTenant(tenantId);
        FinancialTransaction transaction = transactionRepository.save(new FinancialTransaction(
                "txn_" + UUID.randomUUID(),
                tenantId,
                branchId,
                member.getId(),
                type,
                channel,
                body.amount(),
                reference,
                body.narration() == null ? "" : body.narration().trim(),
                currentSession.user().getId()));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Submitted financial transaction " + reference,
                "financial_transaction",
                transaction.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FinancialTransactionResponse.from(transaction)));
    }

    @PatchMapping("/{transactionId}/status")
    ResponseEntity<?> updateTransactionStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String transactionId,
            @Valid @RequestBody UpdateTransactionStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String status = body.status().trim();
        if (!DECISION_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(
                            400,
                            "INVALID_TRANSACTION_STATUS",
                            "Financial transactions can only be posted or rejected from the approval queue."));
        }

        return transactionRepository.findById(transactionId)
                .<ResponseEntity<?>>map(transaction -> decideTransaction(transaction, status, body.reason(), currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "TRANSACTION_NOT_FOUND", "Financial transaction not found.")));
    }

    private ResponseEntity<?> decideTransaction(
            FinancialTransaction transaction,
            String status,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, transaction.getTenantId())) return tenantAccessDenied();
        if (!"pending_approval".equals(transaction.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(
                            409,
                            "TRANSACTION_ALREADY_DECIDED",
                            "Only pending financial transactions can be decided."));
        }
        if (transaction.getMakerUserId().equals(currentSession.user().getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(
                            409,
                            "MAKER_CHECKER_REQUIRED",
                            "The maker cannot approve or reject their own financial transaction."));
        }

        if ("posted".equals(status)) {
            Instant postingDate = Instant.now();
            if (periodService.isClosed(transaction.getTenantId(), postingDate)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(
                                409,
                                "ACCOUNTING_PERIOD_CLOSED",
                                "Accounting period " + periodService.periodKey(postingDate) + " is closed."));
            }
            Member member = memberRepository.findById(transaction.getMemberId()).orElse(null);
            if (member == null) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_MEMBER", "Member does not exist for this tenant."));
            }
            if ("withdrawal".equals(transaction.getType()) && !member.hasEnoughSavings(transaction.getAmount())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "INSUFFICIENT_SAVINGS", "Savings balance is too low for this withdrawal."));
            }
            member.applyPostedTransaction(transaction.getType(), transaction.getAmount());
            memberRepository.save(member);
            transaction.post(currentSession.user().getId());
        } else {
            transaction.reject(currentSession.user().getId(), reason == null ? "" : reason.trim());
        }

        FinancialTransaction saved = transactionRepository.save(transaction);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                ("posted".equals(status) ? "Posted" : "Rejected") + " financial transaction " + saved.getReference(),
                "financial_transaction",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(FinancialTransactionResponse.from(saved)));
    }

    private String referenceForTenant(String tenantId) {
        String abbreviation = tenantService.findById(tenantId)
                .map(tenant -> tenant.abbreviation())
                .orElse("SACCO");
        long next = transactionRepository.countByTenantId(tenantId) + 1;
        return abbreviation + "-TX-" + String.format("%04d", next);
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!canAccess(currentSession, tenantId)) return null;
        return tenantId;
    }

    private boolean canAccess(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access financial transactions for another tenant."));
    }

    record CreateTransactionRequest(
            String tenantId,
            String branchId,
            @NotBlank String memberId,
            @NotBlank String type,
            @NotBlank String channel,
            @NotNull BigDecimal amount,
            String narration) {
    }

    record UpdateTransactionStatusRequest(@NotBlank String status, String reason) {
    }
}
