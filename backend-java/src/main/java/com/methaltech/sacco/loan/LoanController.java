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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private static final Set<String> DECISION_STATUSES = Set.of("approved", "rejected");

    private final LoanRepository loanRepository;
    private final LoanGuarantorRepository guarantorRepository;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;

    LoanController(
            LoanRepository loanRepository,
            LoanGuarantorRepository guarantorRepository,
            MemberRepository memberRepository,
            AuthService authService,
            AuditService auditService) {
        this.loanRepository = loanRepository;
        this.guarantorRepository = guarantorRepository;
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

    @PatchMapping("/{loanId}/status")
    ResponseEntity<?> updateLoanStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @Valid @RequestBody UpdateLoanStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String status = body.status().trim();
        if (!DECISION_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_STATUS", "Loans can only be approved or rejected from this endpoint."));
        }

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> decideLoan(loan, status, body.reason(), currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @GetMapping("/{loanId}/guarantors")
    ResponseEntity<?> listGuarantors(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loanId)
                            .stream()
                            .map(LoanGuarantorResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @PostMapping("/{loanId}/guarantors")
    ResponseEntity<?> createGuarantor(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @Valid @RequestBody CreateGuarantorRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> createGuarantor(loan, body, currentSession, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @PostMapping("/{loanId}/disburse")
    ResponseEntity<?> disburseLoan(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();
                    if (!"approved".equals(loan.getStatus())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "LOAN_NOT_APPROVED", "A loan must be approved before disbursement."));
                    }
                    loan.disburse(currentSession.user().getId());
                    Loan saved = loanRepository.save(loan);
                    auditService.record(
                            saved.getTenantId(),
                            currentSession.user(),
                            "Disbursed loan",
                            "loan",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(LoanResponse.from(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    private int dsr(BigDecimal amount, BigDecimal savingsBalance) {
        BigDecimal savingsCapacity = savingsBalance.multiply(BigDecimal.valueOf(3));
        if (savingsCapacity.compareTo(BigDecimal.ZERO) <= 0) return 65;
        BigDecimal ratio = amount
                .divide(savingsCapacity, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(35));
        return Math.min(65, ratio.setScale(0, RoundingMode.HALF_UP).intValue());
    }

    private ResponseEntity<?> decideLoan(
            Loan loan,
            String status,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();
        if (!Set.of("submitted", "under_review").contains(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_ALREADY_DECIDED", "Only submitted or under-review loans can be decided."));
        }
        if ("approved".equals(status) && loan.getGuarantors() < 1) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTOR_REQUIRED", "At least one accepted guarantor is required before loan approval."));
        }

        loan.decide(status, currentSession.user().getId(), reason == null ? "" : reason.trim());
        Loan saved = loanRepository.save(loan);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                ("approved".equals(status) ? "Approved" : "Rejected") + " loan application",
                "loan",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(LoanResponse.from(saved)));
    }

    private ResponseEntity<?> createGuarantor(
            Loan loan,
            CreateGuarantorRequest body,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();

        Member guarantor = memberRepository.findById(body.memberId().trim())
                .filter(candidate -> candidate.getTenantId().equals(loan.getTenantId()))
                .orElse(null);
        if (guarantor == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR", "Guarantor member does not exist for this tenant."));
        }
        if (!"active".equals(guarantor.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "GUARANTOR_NOT_ACTIVE", "Only active members can guarantee a loan."));
        }
        if (guarantor.getId().equals(loan.getMemberId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "BORROWER_CANNOT_GUARANTEE", "A borrower cannot guarantee their own loan."));
        }
        if (guarantorRepository.existsByLoanIdAndMemberIdAndStatusNot(loan.getId(), guarantor.getId(), "rejected")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTOR_ALREADY_REQUESTED", "This guarantor already has an active request for the loan."));
        }

        BigDecimal amount = body.guaranteedAmount() == null
                ? loan.getAmount().divide(BigDecimal.valueOf(2), 0, RoundingMode.CEILING)
                : body.guaranteedAmount();
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTEE_AMOUNT", "Guarantee amount must be greater than zero."));
        }
        BigDecimal capacity = guaranteeCapacity(guarantor, null);
        if (amount.compareTo(capacity) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTEE_CAPACITY_EXCEEDED", "Requested guarantee exceeds the member's available guarantee capacity."));
        }

        LoanGuarantor requestRecord = guarantorRepository.save(new LoanGuarantor(
                "guarantor_" + UUID.randomUUID(),
                loan.getTenantId(),
                loan.getId(),
                guarantor.getId(),
                amount,
                currentSession.user().getId()));
        loan.refreshGuarantors((int) guarantorRepository.countByLoanIdAndStatus(loan.getId(), "accepted"));
        loanRepository.save(loan);

        auditService.record(
                loan.getTenantId(),
                currentSession.user(),
                "Requested loan guarantor " + guarantor.getMembershipNo(),
                "loan_guarantor",
                requestRecord.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(LoanGuarantorResponse.from(requestRecord)));
    }

    BigDecimal guaranteeCapacity(Member member, String excludedGuarantorId) {
        BigDecimal committed = guarantorRepository
                .findByMemberIdAndStatusIn(member.getId(), List.of("pending", "accepted"))
                .stream()
                .filter(request -> excludedGuarantorId == null || !request.getId().equals(excludedGuarantorId))
                .map(LoanGuarantor::getGuaranteedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal capacity = member.getSavingsBalance().multiply(BigDecimal.valueOf(3)).subtract(committed);
        return capacity.max(BigDecimal.ZERO);
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

    record UpdateLoanStatusRequest(@NotBlank String status, String reason) {
    }

    record CreateGuarantorRequest(@NotBlank String memberId, BigDecimal guaranteedAmount) {
    }
}
