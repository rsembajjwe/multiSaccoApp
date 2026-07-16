package com.methaltech.sacco.loan;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/loans")
class LoanController {

    private static final Set<String> ALLOWED_PRODUCTS = Set.of(
            "Development Loan",
            "Emergency Loan",
            "Agriculture Loan",
            "School Fees Loan");

    private final LoanRepository loanRepository;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;

    LoanController(
            LoanRepository loanRepository,
            MemberRepository memberRepository,
            AuthService authService,
            AuditService auditService) {
        this.loanRepository = loanRepository;
        this.memberRepository = memberRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listLoans(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<Loan> loans = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? loanRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(loans.stream().map(LoanResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createLoan(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateLoanRequest body,
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
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "MEMBER_NOT_ACTIVE", "Only active members can apply for loans."));
        }
        if (!ALLOWED_PRODUCTS.contains(body.product())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_PRODUCT", "Unsupported loan product."));
        }
        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_AMOUNT", "Loan amount must be greater than zero."));
        }
        if (body.repaymentMonths() == null || body.repaymentMonths() < 1 || body.repaymentMonths() > 60) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_PERIOD", "Repayment period must be between 1 and 60 months."));
        }

        Loan loan = loanRepository.save(new Loan(
                "loan_" + UUID.randomUUID(),
                tenantId,
                member.getId(),
                body.product(),
                body.amount(),
                dsr(body.amount(), member.getSavingsBalance()),
                body.repaymentMonths(),
                body.purpose() == null ? "" : body.purpose().trim(),
                "staff",
                null));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Submitted loan application for " + member.getMembershipNo(),
                "loan",
                loan.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(LoanResponse.from(loan)));
    }

    private int dsr(BigDecimal amount, BigDecimal savingsBalance) {
        BigDecimal savingsCapacity = savingsBalance.multiply(BigDecimal.valueOf(3));
        if (savingsCapacity.compareTo(BigDecimal.ZERO) <= 0) return 65;
        BigDecimal ratio = amount
                .divide(savingsCapacity, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(35));
        return Math.min(65, ratio.setScale(0, RoundingMode.HALF_UP).intValue());
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
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access loans for another tenant."));
    }

    record CreateLoanRequest(
            String tenantId,
            @NotBlank String memberId,
            @NotBlank String product,
            @NotNull BigDecimal amount,
            Integer repaymentMonths,
            String purpose) {
    }
}
