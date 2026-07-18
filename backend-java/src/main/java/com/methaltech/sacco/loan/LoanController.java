package com.methaltech.sacco.loan;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.accounting.AccountingPeriodService;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
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

@RestController
@RequestMapping("/api/v1/loans")
class LoanController {

    private static final Set<String> ALLOWED_PRODUCTS = Set.of(
            "Development Loan",
            "Emergency Loan",
            "Agriculture Loan",
            "School Fees Loan");
    private static final Set<String> DECISION_STATUSES = Set.of("approved", "rejected");
    private static final Set<String> REPAYMENT_CHANNELS = Set.of("cash", "bank", "mobile_money", "payroll");
    private static final Set<String> IMPORT_STATUSES = Set.of("active", "closed");
    private static final List<String> LOAN_IMPORT_HEADERS = List.of(
            "membershipNo",
            "product",
            "originalAmount",
            "outstandingBalance",
            "repaymentMonths",
            "remainingMonths",
            "monthlyInstallment",
            "disbursedDate",
            "status",
            "purpose");
    private static final List<String> REPAYMENT_IMPORT_HEADERS = List.of(
            "membershipNo",
            "product",
            "loanDisbursedDate",
            "amount",
            "channel",
            "reference",
            "receivedDate",
            "narration");

    private final LoanRepository loanRepository;
    private final LoanGuarantorRepository guarantorRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final AccountingPeriodService periodService;

    LoanController(
            LoanRepository loanRepository,
            LoanGuarantorRepository guarantorRepository,
            LoanRepaymentRepository repaymentRepository,
            MemberRepository memberRepository,
            AuthService authService,
            AuditService auditService,
            AccountingPeriodService periodService) {
        this.loanRepository = loanRepository;
        this.guarantorRepository = guarantorRepository;
        this.repaymentRepository = repaymentRepository;
        this.memberRepository = memberRepository;
        this.authService = authService;
        this.auditService = auditService;
        this.periodService = periodService;
    }

    @GetMapping
    ResponseEntity<?> listLoans(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<Loan> loans = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? loanRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(loans.stream().map(this::loanResponse).toList()));
    }

    @PostMapping
    ResponseEntity<?> createLoan(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateLoanRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:create")) {
            return authService.permissionRequired("loans:create");
        }

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

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(loanResponse(loan)));
    }

    @GetMapping("/import-template")
    ResponseEntity<?> loanImportTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:create")) {
            return authService.permissionRequired("loans:create");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        Member sampleMember = memberRepository.findByTenantIdOrderByMembershipNoAsc(tenantId).stream().findFirst().orElse(null);
        LoanImportRow sample = new LoanImportRow(
                sampleMember == null ? "" : sampleMember.getMembershipNo(),
                "Development Loan",
                "1000000",
                "750000",
                "12",
                "9",
                "83334",
                LocalDate.now().minusMonths(3).toString(),
                "active",
                "Migrated pilot loan book");
        List<LoanImportRow> sampleRows = List.of(sample);

        return ResponseEntity.ok(ApiResponse.of(new LoanImportTemplateResponse(
                tenantId,
                "loan-book-import-template-" + tenantId + ".csv",
                "text/csv",
                LOAN_IMPORT_HEADERS,
                sampleRows,
                loanImportCsvTemplate(sampleRows))));
    }

    @PostMapping("/import")
    @Transactional
    ResponseEntity<?> importLoans(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody LoanImportRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:approve")) {
            return authService.permissionRequired("loans:approve");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        List<LoanImportRow> rows = body.rows() == null ? List.of() : body.rows();
        boolean dryRun = body.dryRun() == null || body.dryRun();
        List<LoanImportError> errors = validateLoanImportRows(tenantId, rows);
        if (!errors.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.of(new LoanImportResult(
                    tenantId,
                    dryRun,
                    false,
                    rows.size(),
                    0,
                    rows.size(),
                    errors,
                    List.of())));
        }

        if (dryRun) {
            return ResponseEntity.ok(ApiResponse.of(new LoanImportResult(
                    tenantId,
                    true,
                    true,
                    rows.size(),
                    0,
                    0,
                    List.of(),
                    List.of())));
        }

        List<Loan> createdLoans = new ArrayList<>();
        for (LoanImportRow row : rows) {
            Member member = memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, row.membershipNo().trim())
                    .orElseThrow();
            BigDecimal originalAmount = amount(row.originalAmount());
            BigDecimal outstandingBalance = amount(row.outstandingBalance());
            Loan loan = loanRepository.save(Loan.importedBookLoan(
                    "loan_" + UUID.randomUUID(),
                    tenantId,
                    member.getId(),
                    row.product().trim(),
                    originalAmount,
                    outstandingBalance,
                    dsr(originalAmount, member.getSavingsBalance()),
                    integer(row.repaymentMonths()),
                    blankToDefault(row.purpose()),
                    currentSession.user().getId(),
                    loanDisbursedAt(row)));
            createdLoans.add(loan);
        }

        auditService.record(
                tenantId,
                currentSession.user(),
                "Imported " + createdLoans.size() + " loan book records",
                "loan_import",
                tenantId,
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new LoanImportResult(
                tenantId,
                false,
                true,
                rows.size(),
                createdLoans.size(),
                0,
                List.of(),
                createdLoans.stream().map(this::loanResponse).toList())));
    }

    @GetMapping("/repayments/import-template")
    ResponseEntity<?> repaymentImportTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:create")) {
            return authService.permissionRequired("loans:create");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        Loan sampleLoan = loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream().findFirst().orElse(null);
        String membershipNo = sampleLoan == null
                ? ""
                : memberRepository.findById(sampleLoan.getMemberId()).map(Member::getMembershipNo).orElse("");
        RepaymentImportRow sample = new RepaymentImportRow(
                membershipNo,
                sampleLoan == null ? "Development Loan" : sampleLoan.getProduct(),
                sampleLoan == null || sampleLoan.getDisbursedAt() == null
                        ? LocalDate.now().minusMonths(2).toString()
                        : sampleLoan.getDisbursedAt().atZone(ZoneOffset.UTC).toLocalDate().toString(),
                "100000",
                "bank",
                "LR-MIG-001",
                LocalDate.now().minusMonths(1).toString(),
                "Historical repayment from pilot loan book");
        List<RepaymentImportRow> sampleRows = List.of(sample);

        return ResponseEntity.ok(ApiResponse.of(new RepaymentImportTemplateResponse(
                tenantId,
                "loan-repayments-import-template-" + tenantId + ".csv",
                "text/csv",
                REPAYMENT_IMPORT_HEADERS,
                sampleRows,
                repaymentImportCsvTemplate(sampleRows))));
    }

    @PostMapping("/repayments/import")
    @Transactional
    ResponseEntity<?> importRepayments(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody RepaymentImportRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:approve")) {
            return authService.permissionRequired("loans:approve");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        List<RepaymentImportRow> rows = body.rows() == null ? List.of() : body.rows();
        boolean dryRun = body.dryRun() == null || body.dryRun();
        List<RepaymentImportError> errors = validateRepaymentImportRows(tenantId, rows);
        if (!errors.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.of(new RepaymentImportResult(
                    tenantId,
                    dryRun,
                    false,
                    rows.size(),
                    0,
                    rows.size(),
                    errors,
                    List.of())));
        }

        if (dryRun) {
            return ResponseEntity.ok(ApiResponse.of(new RepaymentImportResult(
                    tenantId,
                    true,
                    true,
                    rows.size(),
                    0,
                    0,
                    List.of(),
                    List.of())));
        }

        List<LoanRepayment> createdRepayments = new ArrayList<>();
        for (RepaymentImportRow row : rows) {
            Loan loan = loanForRepaymentImport(tenantId, row).loan();
            createdRepayments.add(repaymentRepository.save(LoanRepayment.imported(
                    "repayment_" + UUID.randomUUID(),
                    tenantId,
                    loan.getId(),
                    loan.getMemberId(),
                    amount(row.amount()),
                    normalizedOrDefault(row.channel(), "bank"),
                    row.reference().trim(),
                    blankToDefault(row.narration()),
                    currentSession.user().getId(),
                    repaymentReceivedAt(row))));
        }

        auditService.record(
                tenantId,
                currentSession.user(),
                "Imported " + createdRepayments.size() + " loan repayment history records",
                "loan_repayment_import",
                tenantId,
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(new RepaymentImportResult(
                tenantId,
                false,
                true,
                rows.size(),
                createdRepayments.size(),
                0,
                List.of(),
                createdRepayments.stream().map(LoanRepaymentResponse::from).toList())));
    }

    @PatchMapping("/{loanId}/status")
    ResponseEntity<?> updateLoanStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @Valid @RequestBody UpdateLoanStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:approve")) {
            return authService.permissionRequired("loans:approve");
        }

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
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }

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
        if (!authService.hasPermission(currentSession.user(), "loans:create")) {
            return authService.permissionRequired("loans:create");
        }

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
        if (!authService.hasPermission(currentSession.user(), "loans:approve")) {
            return authService.permissionRequired("loans:approve");
        }

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();
                    if (!"approved".equals(loan.getStatus())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "LOAN_NOT_APPROVED", "A loan must be approved before disbursement."));
                    }
                    Instant postingDate = Instant.now();
                    if (periodService.isClosed(loan.getTenantId(), postingDate)) {
                        return accountingPeriodClosed(postingDate);
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
                    return ResponseEntity.ok(ApiResponse.of(loanResponse(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @GetMapping("/{loanId}/repayments")
    ResponseEntity<?> listRepayments(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();
                    return ResponseEntity.ok(ApiResponse.of(repaymentRepository.findByLoanIdOrderByReceivedAtDesc(loanId)
                            .stream()
                            .map(LoanRepaymentResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @PostMapping("/{loanId}/repayments")
    ResponseEntity<?> createRepayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @Valid @RequestBody CreateRepaymentRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:approve")) {
            return authService.permissionRequired("loans:approve");
        }

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> createRepayment(loan, body, currentSession, request))
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
        return ResponseEntity.ok(ApiResponse.of(loanResponse(saved)));
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

    private ResponseEntity<?> createRepayment(
            Loan loan,
            CreateRepaymentRequest body,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccess(currentSession, loan.getTenantId())) return tenantAccessDenied();
        if (!"active".equals(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_NOT_ACTIVE", "Only active loans can receive repayments."));
        }
        Instant postingDate = Instant.now();
        if (periodService.isClosed(loan.getTenantId(), postingDate)) {
            return accountingPeriodClosed(postingDate);
        }
        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_AMOUNT", "Repayment amount must be greater than zero."));
        }
        if (body.amount().compareTo(loan.getBalance()) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment amount cannot exceed the outstanding loan balance."));
        }

        String channel = body.channel() == null ? "cash" : body.channel().trim();
        if (!REPAYMENT_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_CHANNEL", "Unsupported repayment channel."));
        }
        String reference = body.reference().trim();
        if (repaymentRepository.existsByTenantIdAndReferenceIgnoreCase(loan.getTenantId(), reference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "DUPLICATE_REPAYMENT_REFERENCE", "Repayment reference already exists for this SACCO."));
        }

        LoanRepayment repayment = repaymentRepository.save(new LoanRepayment(
                "repayment_" + UUID.randomUUID(),
                loan.getTenantId(),
                loan.getId(),
                loan.getMemberId(),
                body.amount(),
                channel,
                reference,
                body.narration() == null ? "" : body.narration().trim(),
                currentSession.user().getId()));
        loan.recordRepayment(repayment.getAmount());
        loanRepository.save(loan);

        auditService.record(
                loan.getTenantId(),
                currentSession.user(),
                "Recorded loan repayment",
                "loan_repayment",
                repayment.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(LoanRepaymentResponse.from(repayment)));
    }

    private List<LoanImportError> validateLoanImportRows(String tenantId, List<LoanImportRow> rows) {
        List<LoanImportError> errors = new ArrayList<>();
        if (rows.isEmpty()) {
            errors.add(new LoanImportError(0, "rows", "IMPORT_EMPTY", "At least one loan row is required."));
            return errors;
        }
        if (rows.size() > 500) {
            errors.add(new LoanImportError(0, "rows", "IMPORT_TOO_LARGE", "A single loan import cannot exceed 500 rows."));
            return errors;
        }

        Set<String> seenKeys = new HashSet<>();
        for (int index = 0; index < rows.size(); index++) {
            int rowNumber = index + 1;
            LoanImportRow row = rows.get(index);
            Member member = validateLoanImportMember(tenantId, rowNumber, row, errors);
            String product = row.product() == null ? "" : row.product().trim();
            if (!ALLOWED_PRODUCTS.contains(product)) {
                errors.add(new LoanImportError(rowNumber, "product", "INVALID_LOAN_PRODUCT", "Unsupported loan product."));
            }

            BigDecimal originalAmount = validatedAmount(rowNumber, "originalAmount", row.originalAmount(), errors);
            BigDecimal outstandingBalance = validatedAmount(rowNumber, "outstandingBalance", row.outstandingBalance(), errors);
            if (originalAmount.compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(new LoanImportError(rowNumber, "originalAmount", "INVALID_LOAN_AMOUNT", "Original loan amount must be greater than zero."));
            }
            if (outstandingBalance.compareTo(originalAmount) > 0) {
                errors.add(new LoanImportError(rowNumber, "outstandingBalance", "BALANCE_EXCEEDS_AMOUNT", "Outstanding balance cannot exceed original amount."));
            }

            int repaymentMonths = validatedInteger(rowNumber, "repaymentMonths", row.repaymentMonths(), errors);
            if (repaymentMonths < 1 || repaymentMonths > 60) {
                errors.add(new LoanImportError(rowNumber, "repaymentMonths", "INVALID_REPAYMENT_PERIOD", "Repayment period must be between 1 and 60 months."));
            }
            int remainingMonths = validatedInteger(rowNumber, "remainingMonths", row.remainingMonths(), errors);
            if (remainingMonths < 0 || remainingMonths > repaymentMonths) {
                errors.add(new LoanImportError(rowNumber, "remainingMonths", "INVALID_REMAINING_PERIOD", "Remaining months must be between 0 and repayment months."));
            }
            BigDecimal monthlyInstallment = validatedAmount(rowNumber, "monthlyInstallment", row.monthlyInstallment(), errors);
            if (remainingMonths > 0 && monthlyInstallment.compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(new LoanImportError(rowNumber, "monthlyInstallment", "INVALID_INSTALLMENT", "Monthly installment is required when remaining months are greater than zero."));
            }
            if (remainingMonths > 0 && monthlyInstallment.multiply(BigDecimal.valueOf(remainingMonths)).compareTo(outstandingBalance) < 0) {
                errors.add(new LoanImportError(rowNumber, "monthlyInstallment", "SCHEDULE_UNDERFUNDED", "Monthly installment times remaining months must cover outstanding balance."));
            }

            String status = normalizedOrDefault(row.status(), "active");
            if (!IMPORT_STATUSES.contains(status)) {
                errors.add(new LoanImportError(rowNumber, "status", "INVALID_LOAN_STATUS", "Imported loan status must be active or closed."));
            }
            if ("active".equals(status) && outstandingBalance.compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(new LoanImportError(rowNumber, "outstandingBalance", "ACTIVE_LOAN_NEEDS_BALANCE", "Active imported loans must have outstanding balance."));
            }
            if ("closed".equals(status) && outstandingBalance.compareTo(BigDecimal.ZERO) != 0) {
                errors.add(new LoanImportError(rowNumber, "outstandingBalance", "CLOSED_LOAN_HAS_BALANCE", "Closed imported loans must have zero outstanding balance."));
            }

            if (row.disbursedDate() != null && !row.disbursedDate().isBlank()) {
                try {
                    LocalDate.parse(row.disbursedDate().trim());
                } catch (DateTimeParseException error) {
                    errors.add(new LoanImportError(rowNumber, "disbursedDate", "INVALID_DATE", "Disbursed date must use YYYY-MM-DD format."));
                }
            }

            if (member != null && !product.isBlank() && originalAmount.compareTo(BigDecimal.ZERO) > 0) {
                String importKey = (member.getId() + "|" + product + "|" + originalAmount.stripTrailingZeros().toPlainString()).toUpperCase(Locale.ROOT);
                if (!seenKeys.add(importKey)) {
                    errors.add(new LoanImportError(rowNumber, "membershipNo", "DUPLICATE_IN_FILE", "Loan row duplicates a member/product/amount in this import."));
                }
                if (loanRepository.existsByTenantIdAndMemberIdAndProductAndAmountAndStatusIn(
                        tenantId,
                        member.getId(),
                        product,
                        originalAmount,
                        List.of("submitted", "under_review", "approved", "active"))) {
                    errors.add(new LoanImportError(rowNumber, "membershipNo", "LOAN_EXISTS", "An open loan with the same member, product, and amount already exists."));
                }
            }
        }
        return errors;
    }

    private List<RepaymentImportError> validateRepaymentImportRows(String tenantId, List<RepaymentImportRow> rows) {
        List<RepaymentImportError> errors = new ArrayList<>();
        if (rows.isEmpty()) {
            errors.add(new RepaymentImportError(0, "rows", "IMPORT_EMPTY", "At least one repayment row is required."));
            return errors;
        }
        if (rows.size() > 1000) {
            errors.add(new RepaymentImportError(0, "rows", "IMPORT_TOO_LARGE", "A single repayment import cannot exceed 1,000 rows."));
            return errors;
        }

        Set<String> seenReferences = new HashSet<>();
        java.util.Map<String, BigDecimal> totalsByLoan = new java.util.HashMap<>();
        for (int index = 0; index < rows.size(); index++) {
            int rowNumber = index + 1;
            RepaymentImportRow row = rows.get(index);
            LoanImportMatch match = loanForRepaymentImport(tenantId, row);
            if (match.error() != null) {
                errors.add(new RepaymentImportError(rowNumber, match.field(), match.code(), match.error()));
            }

            BigDecimal repaymentAmount = validatedRepaymentAmount(rowNumber, "amount", row.amount(), errors);
            if (repaymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
                errors.add(new RepaymentImportError(rowNumber, "amount", "INVALID_REPAYMENT_AMOUNT", "Repayment amount must be greater than zero."));
            }

            String channel = normalizedOrDefault(row.channel(), "bank");
            if (!REPAYMENT_CHANNELS.contains(channel)) {
                errors.add(new RepaymentImportError(rowNumber, "channel", "INVALID_REPAYMENT_CHANNEL", "Unsupported repayment channel."));
            }
            if (row.reference() == null || row.reference().isBlank()) {
                errors.add(new RepaymentImportError(rowNumber, "reference", "REQUIRED", "Repayment reference is required."));
            } else {
                String reference = row.reference().trim().toUpperCase(Locale.ROOT);
                if (!seenReferences.add(reference)) {
                    errors.add(new RepaymentImportError(rowNumber, "reference", "DUPLICATE_REFERENCE_IN_FILE", "Repayment reference is repeated in this import."));
                }
                if (repaymentRepository.existsByTenantIdAndReferenceIgnoreCase(tenantId, reference)) {
                    errors.add(new RepaymentImportError(rowNumber, "reference", "REFERENCE_EXISTS", "Repayment reference already exists."));
                }
            }
            if (row.receivedDate() != null && !row.receivedDate().isBlank()) {
                try {
                    LocalDate.parse(row.receivedDate().trim());
                } catch (DateTimeParseException error) {
                    errors.add(new RepaymentImportError(rowNumber, "receivedDate", "INVALID_DATE", "Received date must use YYYY-MM-DD format."));
                }
            }

            if (match.loan() != null) {
                totalsByLoan.merge(match.loan().getId(), repaymentAmount, BigDecimal::add);
                BigDecimal historicalCapacity = match.loan().getAmount()
                        .subtract(match.loan().getBalance())
                        .subtract(repaymentRepository.totalAmountByLoanId(match.loan().getId()));
                if (totalsByLoan.get(match.loan().getId()).compareTo(historicalCapacity) > 0) {
                    errors.add(new RepaymentImportError(rowNumber, "amount", "REPAYMENT_HISTORY_EXCEEDS_PAID_AMOUNT", "Imported repayment history exceeds the loan's paid-to-date amount."));
                }
            }
        }
        return errors;
    }

    private LoanImportMatch loanForRepaymentImport(String tenantId, RepaymentImportRow row) {
        if (row.membershipNo() == null || row.membershipNo().isBlank()) {
            return new LoanImportMatch(null, "membershipNo", "REQUIRED", "Membership number is required.");
        }
        if (row.product() == null || row.product().isBlank()) {
            return new LoanImportMatch(null, "product", "REQUIRED", "Loan product is required.");
        }
        Member member = memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, row.membershipNo().trim()).orElse(null);
        if (member == null) {
            return new LoanImportMatch(null, "membershipNo", "INVALID_MEMBER", "Member does not exist for this tenant.");
        }
        List<Loan> candidates = loanRepository.findByTenantIdAndMemberIdAndProductOrderByDisbursedAtDescCreatedAtDesc(
                tenantId,
                member.getId(),
                row.product().trim());
        if (row.loanDisbursedDate() != null && !row.loanDisbursedDate().isBlank()) {
            try {
                LocalDate disbursedDate = LocalDate.parse(row.loanDisbursedDate().trim());
                candidates = candidates.stream()
                        .filter(loan -> loan.getDisbursedAt() != null && loan.getDisbursedAt().atZone(ZoneOffset.UTC).toLocalDate().equals(disbursedDate))
                        .toList();
            } catch (DateTimeParseException error) {
                return new LoanImportMatch(null, "loanDisbursedDate", "INVALID_DATE", "Loan disbursed date must use YYYY-MM-DD format.");
            }
        }
        if (candidates.isEmpty()) {
            return new LoanImportMatch(null, "product", "LOAN_NOT_FOUND", "Matching loan was not found for this member/product/date.");
        }
        if (candidates.size() > 1) {
            return new LoanImportMatch(null, "loanDisbursedDate", "LOAN_MATCH_AMBIGUOUS", "Multiple matching loans found; include loanDisbursedDate.");
        }
        Loan loan = candidates.get(0);
        if (!Set.of("active", "closed").contains(loan.getStatus())) {
            return new LoanImportMatch(null, "status", "LOAN_NOT_MIGRATED", "Repayment history can only be imported for active or closed loans.");
        }
        return new LoanImportMatch(loan, null, null, null);
    }

    private Member validateLoanImportMember(String tenantId, int rowNumber, LoanImportRow row, List<LoanImportError> errors) {
        if (row.membershipNo() == null || row.membershipNo().isBlank()) {
            errors.add(new LoanImportError(rowNumber, "membershipNo", "REQUIRED", "Membership number is required."));
            return null;
        }
        Member member = memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, row.membershipNo().trim()).orElse(null);
        if (member == null) {
            errors.add(new LoanImportError(rowNumber, "membershipNo", "INVALID_MEMBER", "Member does not exist for this tenant."));
            return null;
        }
        if (!"active".equals(member.getStatus())) {
            errors.add(new LoanImportError(rowNumber, "membershipNo", "MEMBER_NOT_ACTIVE", "Imported loans require an active member."));
        }
        return member;
    }

    private BigDecimal validatedAmount(int rowNumber, String field, String value, List<LoanImportError> errors) {
        try {
            BigDecimal amount = amount(value);
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                errors.add(new LoanImportError(rowNumber, field, "NEGATIVE_AMOUNT", "Loan import amount cannot be negative."));
            }
            return amount;
        } catch (NumberFormatException error) {
            errors.add(new LoanImportError(rowNumber, field, "INVALID_AMOUNT", "Loan import amount must be numeric."));
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal validatedRepaymentAmount(int rowNumber, String field, String value, List<RepaymentImportError> errors) {
        try {
            BigDecimal amount = amount(value);
            if (amount.compareTo(BigDecimal.ZERO) < 0) {
                errors.add(new RepaymentImportError(rowNumber, field, "NEGATIVE_AMOUNT", "Repayment amount cannot be negative."));
            }
            return amount;
        } catch (NumberFormatException error) {
            errors.add(new RepaymentImportError(rowNumber, field, "INVALID_AMOUNT", "Repayment amount must be numeric."));
            return BigDecimal.ZERO;
        }
    }

    private int validatedInteger(int rowNumber, String field, String value, List<LoanImportError> errors) {
        try {
            return integer(value);
        } catch (NumberFormatException error) {
            errors.add(new LoanImportError(rowNumber, field, "INVALID_NUMBER", "Value must be a whole number."));
            return 0;
        }
    }

    private BigDecimal amount(String value) {
        return value == null || value.isBlank() ? BigDecimal.ZERO : new BigDecimal(value.trim());
    }

    private int integer(String value) {
        return value == null || value.isBlank() ? 0 : Integer.parseInt(value.trim());
    }

    private Instant loanDisbursedAt(LoanImportRow row) {
        LocalDate date = row.disbursedDate() == null || row.disbursedDate().isBlank()
                ? LocalDate.now()
                : LocalDate.parse(row.disbursedDate().trim());
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private Instant repaymentReceivedAt(RepaymentImportRow row) {
        LocalDate date = row.receivedDate() == null || row.receivedDate().isBlank()
                ? LocalDate.now()
                : LocalDate.parse(row.receivedDate().trim());
        return date.atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private String normalizedOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToDefault(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private String loanImportCsvTemplate(List<LoanImportRow> sampleRows) {
        String header = String.join(",", LOAN_IMPORT_HEADERS);
        List<String> rows = sampleRows.stream()
                .map(row -> String.join(",",
                        csv(row.membershipNo()),
                        csv(row.product()),
                        csv(row.originalAmount()),
                        csv(row.outstandingBalance()),
                        csv(row.repaymentMonths()),
                        csv(row.remainingMonths()),
                        csv(row.monthlyInstallment()),
                        csv(row.disbursedDate()),
                        csv(row.status()),
                        csv(row.purpose())))
                .toList();
        return header + "\n" + String.join("\n", rows) + "\n";
    }

    private String repaymentImportCsvTemplate(List<RepaymentImportRow> sampleRows) {
        String header = String.join(",", REPAYMENT_IMPORT_HEADERS);
        List<String> rows = sampleRows.stream()
                .map(row -> String.join(",",
                        csv(row.membershipNo()),
                        csv(row.product()),
                        csv(row.loanDisbursedDate()),
                        csv(row.amount()),
                        csv(row.channel()),
                        csv(row.reference()),
                        csv(row.receivedDate()),
                        csv(row.narration())))
                .toList();
        return header + "\n" + String.join("\n", rows) + "\n";
    }

    private String csv(String value) {
        if (value == null) return "";
        if (!value.contains(",") && !value.contains("\"") && !value.contains("\n")) return value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
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

    private LoanResponse loanResponse(Loan loan) {
        return LoanResponse.from(
                loan,
                repaymentRepository.countByLoanId(loan.getId()),
                repaymentRepository.totalAmountByLoanId(loan.getId()));
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

    private ResponseEntity<ApiErrorResponse> accountingPeriodClosed(Instant postingDate) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "ACCOUNTING_PERIOD_CLOSED", "Accounting period " + periodService.periodKey(postingDate) + " is closed."));
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

    record CreateRepaymentRequest(
            @NotNull BigDecimal amount,
            String channel,
            @NotBlank String reference,
            String narration) {
    }

    record LoanImportTemplateResponse(
            String tenantId,
            String filename,
            String contentType,
            List<String> headers,
            List<LoanImportRow> sampleRows,
            String csv) {
    }

    record LoanImportRequest(
            String tenantId,
            Boolean dryRun,
            List<LoanImportRow> rows) {
    }

    record LoanImportRow(
            String membershipNo,
            String product,
            String originalAmount,
            String outstandingBalance,
            String repaymentMonths,
            String remainingMonths,
            String monthlyInstallment,
            String disbursedDate,
            String status,
            String purpose) {
    }

    record LoanImportError(
            int row,
            String field,
            String code,
            String message) {
    }

    record LoanImportResult(
            String tenantId,
            boolean dryRun,
            boolean valid,
            int totalRows,
            int createdCount,
            int skippedCount,
            List<LoanImportError> errors,
            List<LoanResponse> createdLoans) {
    }

    record LoanImportMatch(
            Loan loan,
            String field,
            String code,
            String error) {
    }

    record RepaymentImportTemplateResponse(
            String tenantId,
            String filename,
            String contentType,
            List<String> headers,
            List<RepaymentImportRow> sampleRows,
            String csv) {
    }

    record RepaymentImportRequest(
            String tenantId,
            Boolean dryRun,
            List<RepaymentImportRow> rows) {
    }

    record RepaymentImportRow(
            String membershipNo,
            String product,
            String loanDisbursedDate,
            String amount,
            String channel,
            String reference,
            String receivedDate,
            String narration) {
    }

    record RepaymentImportError(
            int row,
            String field,
            String code,
            String message) {
    }

    record RepaymentImportResult(
            String tenantId,
            boolean dryRun,
            boolean valid,
            int totalRows,
            int createdCount,
            int skippedCount,
            List<RepaymentImportError> errors,
            List<LoanRepaymentResponse> createdRepayments) {
    }
}
