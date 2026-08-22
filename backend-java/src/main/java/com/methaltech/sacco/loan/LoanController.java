package com.methaltech.sacco.loan;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.tenant.CollectionMode;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import com.methaltech.sacco.accounting.AccountingPeriodService;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.notification.NotificationService;
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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
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

    /** Loans up to this amount need a single approval. */
    @Value("${sacco.loans.approval.single-max:2000000}")
    private BigDecimal approvalSingleMax;

    /** Loans above single-max and up to this amount need two distinct approvers. Above it, a committee resolution reference is required. */
    @Value("${sacco.loans.approval.dual-max:10000000}")
    private BigDecimal approvalDualMax;
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
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanAppraisalRepository appraisalRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final AccountingPeriodService periodService;
    private final TenantService tenantService;
    private final NotificationService notificationService;

    LoanController(
            LoanRepository loanRepository,
            LoanGuarantorRepository guarantorRepository,
            LoanRepaymentRepository repaymentRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanAppraisalRepository appraisalRepository,
            MemberRepository memberRepository,
            BranchRepository branchRepository,
            AuthService authService,
            AuditService auditService,
            AccountingPeriodService periodService,
            TenantService tenantService,
            NotificationService notificationService) {
        this.loanRepository = loanRepository;
        this.guarantorRepository = guarantorRepository;
        this.repaymentRepository = repaymentRepository;
        this.scheduleRepository = scheduleRepository;
        this.appraisalRepository = appraisalRepository;
        this.memberRepository = memberRepository;
        this.branchRepository = branchRepository;
        this.authService = authService;
        this.auditService = auditService;
        this.periodService = periodService;
        this.tenantService = tenantService;
        this.notificationService = notificationService;
    }

    @GetMapping
    ResponseEntity<?> listLoans(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "sort", required = false) String sortBy,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        boolean platformAll = authService.isPlatform(currentSession.user()) && requestedTenantId == null;
        String searchTerm = searchTerm(search);
        List<String> branchScope = branchScope(currentSession, tenantId);

        if (PageParams.requested(page, size)) {
            Sort sort = sortBy(platformAll, sortBy, direction, Map.of(
                    "product", "product",
                    "amount", "amount",
                    "balance", "balance",
                    "monthlyInstallment", "monthlyInstallment",
                    "status", "status",
                    "stage", "stage",
                    "createdAt", "createdAt",
                    "disbursedAt", "disbursedAt",
                    "memberId", "memberId",
                    "tenantId", "tenantId"), "createdAt", Sort.Direction.DESC);
            Pageable pageable = PageParams.toPageable(page, size, sort);
            Page<Loan> result = platformAll
                    ? (searchTerm == null ? loanRepository.findAll(pageable) : loanRepository.searchAll(searchTerm, pageable))
                    : (!branchScope.isEmpty()
                            ? (searchTerm == null
                                    ? loanRepository.findByTenantIdAndMemberBranchIds(tenantId, branchScope, pageable)
                                    : loanRepository.searchByTenantIdAndMemberBranchIds(tenantId, branchScope, searchTerm, pageable))
                            : (searchTerm == null
                                    ? loanRepository.findByTenantId(tenantId, pageable)
                                    : loanRepository.searchByTenantId(tenantId, searchTerm, pageable)));
            return ResponseEntity.ok(PagedResponse.of(
                    result.getContent().stream().map(this::loanResponse).toList(),
                    result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
        }

        List<Loan> loans = platformAll
                ? loanRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : (!branchScope.isEmpty()
                        ? loanRepository.findByTenantIdAndMemberBranchIds(tenantId, branchScope)
                        : loanRepository.findByTenantIdOrderByCreatedAtDesc(tenantId));
        if (searchTerm != null) {
            String needle = searchTerm.toLowerCase(Locale.ROOT);
            loans = loans.stream()
                    .filter(loan -> searchable(loan.getProduct(), loan.getStatus(), loan.getStage(), loan.getPurpose(), loan.getChannel(), loan.getMemberId()).contains(needle))
                    .toList();
        }

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
        if (!canAccessMemberBranch(currentSession, tenantId, member)) {
            return branchAccessDenied();
        }
        if (!ALLOWED_PRODUCTS.contains(body.product())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_PRODUCT", "Unsupported loan product."));
        }
        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
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
                amount,
                dsr(amount, member.getSavingsBalance()),
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
        List<String> branchScope = branchScope(currentSession, tenantId);
        if (!branchScope.isEmpty()) {
            for (int i = 0; i < rows.size(); i++) {
                Member member = rows.get(i).membershipNo() == null ? null
                        : memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, rows.get(i).membershipNo().trim()).orElse(null);
                if (member != null && !branchScope.contains(member.getBranchId())) {
                    errors.add(new LoanImportError(i + 1, "membershipNo", "BRANCH_ACCESS_DENIED", "Member is outside the user's assigned branch scope."));
                }
            }
        }
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
        List<String> branchScope = branchScope(currentSession, tenantId);
        if (!branchScope.isEmpty()) {
            for (int i = 0; i < rows.size(); i++) {
                Member member = rows.get(i).membershipNo() == null ? null
                        : memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCase(tenantId, rows.get(i).membershipNo().trim()).orElse(null);
                if (member != null && !branchScope.contains(member.getBranchId())) {
                    errors.add(new RepaymentImportError(i + 1, "membershipNo", "BRANCH_ACCESS_DENIED", "Member is outside the user's assigned branch scope."));
                }
            }
        }
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
    @Transactional
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
                .<ResponseEntity<?>>map(loan -> decideLoan(loan, status, body.reason(), body.resolutionReference(), currentSession, request))
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
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    return ResponseEntity.ok(ApiResponse.of(guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loanId)
                            .stream()
                            .map(LoanGuarantorResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @GetMapping("/guarantor-requests")
    ResponseEntity<?> listTenantGuarantorRequests(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }
        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<LoanGuarantor> requests = guarantorRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<String> branchScope = branchScope(currentSession, tenantId);
        if (!branchScope.isEmpty()) {
            java.util.Set<String> scopedLoanIds = new java.util.HashSet<>(
                    loanRepository.findByTenantIdAndMemberBranchIds(tenantId, branchScope).stream().map(Loan::getId).toList());
            requests = requests.stream().filter(item -> scopedLoanIds.contains(item.getLoanId())).toList();
        }

        List<LoanGuarantorResponse> data = requests.stream().map(request -> {
            Loan loan = loanRepository.findById(request.getLoanId()).orElse(null);
            Member member = memberRepository.findById(request.getMemberId()).orElse(null);
            BigDecimal capacity = member == null ? BigDecimal.ZERO : guaranteeCapacity(member, request.getId());
            BigDecimal ceiling = member == null ? BigDecimal.ZERO : guaranteeCeiling(member);
            BigDecimal committed = member == null ? BigDecimal.ZERO : committedGuarantees(member, request.getId());
            return LoanGuarantorResponse.from(request, loan, capacity, ceiling, committed);
        }).toList();
        return ResponseEntity.ok(ApiResponse.of(data));
    }

    @PostMapping("/{loanId}/guarantors")
    @Transactional
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
    @Transactional
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
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    if (!"approved".equals(loan.getStatus())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "LOAN_NOT_APPROVED", "A loan must be approved before disbursement."));
                    }
                    if (isSelfDecision(currentSession, loan.getMemberId())) return conflictOfInterest("disburse");
                    String actorId = currentSession.user().getId();

                    // Maker: first officer initiates the payout; the money does not move yet.
                    if (loan.getDisbursementInitiatedByUserId() == null) {
                        loan.initiateDisbursement(actorId);
                        Loan initiated = loanRepository.save(loan);
                        auditService.record(
                                initiated.getTenantId(),
                                currentSession.user(),
                                "Initiated loan disbursement (awaiting second officer)",
                                "loan",
                                initiated.getId(),
                                request.getRemoteAddr());
                        return ResponseEntity.ok(ApiResponse.of(loanResponse(initiated)));
                    }
                    // Checker must be a different officer.
                    if (loan.getDisbursementInitiatedByUserId().equals(actorId)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "DISBURSEMENT_CHECKER_REQUIRED",
                                        "Disbursement was initiated by you; a second, different officer must confirm it."));
                    }

                    Instant postingDate = Instant.now();
                    if (periodService.isClosed(loan.getTenantId(), postingDate)) {
                        return accountingPeriodClosed(postingDate);
                    }
                    loan.disburse(actorId);
                    // Savings-secured loans (approved without a guarantor) place a collateral hold on the
                    // borrower's savings equal to the outstanding balance; it releases as they repay.
                    if (loan.getGuarantors() < 1) {
                        memberRepository.findById(loan.getMemberId()).ifPresent(borrower -> {
                            BigDecimal hold = loan.getBalance();
                            borrower.placeSavingsHold(hold);
                            loan.setSecuredHoldAmount(hold);
                            memberRepository.save(borrower);
                        });
                    }
                    Loan saved = loanRepository.save(loan);
                    createRepaymentSchedule(saved);
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

    @GetMapping("/{loanId}/schedule")
    ResponseEntity<?> loanSchedule(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    return ResponseEntity.ok(ApiResponse.of(scheduleResponse(loan)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @GetMapping("/{loanId}/cover")
    ResponseEntity<?> loanCover(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }

        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    return ResponseEntity.ok(ApiResponse.of(buildLoanCover(loan)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    /**
     * Releases the savings collateral hold on a savings-secured loan as it is repaid: by the repayment
     * amount normally, or the full residual once the loan is fully settled.
     */
    private void releaseSecuredHoldForRepayment(Loan loan, BigDecimal repaymentAmount) {
        if (loan.getSecuredHoldAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal toRelease = "closed".equals(loan.getStatus()) ? loan.getSecuredHoldAmount() : repaymentAmount;
        BigDecimal released = loan.reduceSecuredHold(toRelease);
        if (released.compareTo(BigDecimal.ZERO) > 0) {
            memberRepository.findById(loan.getMemberId()).ifPresent(borrower -> {
                borrower.releaseSavingsHold(released);
                memberRepository.save(borrower);
            });
        }
    }

    private LoanCoverResponse buildLoanCover(Loan loan) {
        Member applicant = memberRepository.findById(loan.getMemberId()).orElse(null);
        BigDecimal selfCover = applicant == null ? BigDecimal.ZERO : applicant.getSavingsBalance();
        LoanCoverResponse.ApplicantCover applicantCover = new LoanCoverResponse.ApplicantCover(
                loan.getMemberId(),
                applicant == null ? "-" : applicant.getMembershipNo(),
                applicant == null ? "-" : applicant.getFullName(),
                selfCover);

        List<LoanGuarantor> guarantors = guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loan.getId());
        List<LoanCoverResponse.GuarantorCover> guarantorCovers = guarantors.stream()
                .map(item -> {
                    Member member = memberRepository.findById(item.getMemberId()).orElse(null);
                    return new LoanCoverResponse.GuarantorCover(
                            item.getId(),
                            item.getMemberId(),
                            member == null ? "-" : member.getMembershipNo(),
                            member == null ? "-" : member.getFullName(),
                            member == null ? BigDecimal.ZERO : member.getSavingsBalance(),
                            member == null ? BigDecimal.ZERO : guaranteeCapacity(member, item.getId()),
                            item.getGuaranteedAmount(),
                            item.getStatus());
                })
                .toList();

        BigDecimal acceptedPledges = guarantors.stream()
                .filter(item -> "accepted".equals(item.getStatus()))
                .map(LoanGuarantor::getGuaranteedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCover = selfCover.add(acceptedPledges);
        BigDecimal coverRatio = loan.getAmount().signum() == 0
                ? BigDecimal.ZERO
                : totalCover.divide(loan.getAmount(), 2, RoundingMode.HALF_UP);
        boolean covered = totalCover.compareTo(loan.getAmount()) >= 0;
        BigDecimal shortfall = covered ? BigDecimal.ZERO : loan.getAmount().subtract(totalCover);

        return new LoanCoverResponse(
                loan.getId(),
                loan.getAmount(),
                applicantCover,
                guarantorCovers,
                acceptedPledges,
                totalCover,
                coverRatio,
                covered,
                shortfall);
    }

    @GetMapping("/{loanId}/appraisals")
    ResponseEntity<?> listAppraisals(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:view")) {
            return authService.permissionRequired("loans:view");
        }
        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    return ResponseEntity.ok(ApiResponse.of(appraisalRepository.findByLoanIdOrderByCreatedAtDesc(loanId)
                            .stream()
                            .map(LoanAppraisalResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @PostMapping("/{loanId}/appraisals")
    ResponseEntity<?> createAppraisal(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @Valid @RequestBody AppraisalRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "loans:approve")) {
            return authService.permissionRequired("loans:approve");
        }
        String recommendation = body.recommendation() == null ? "" : body.recommendation().trim().toLowerCase();
        if (!Set.of("recommended", "declined").contains(recommendation)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_APPRAISAL", "Recommendation must be 'recommended' or 'declined'."));
        }
        return loanRepository.findById(loanId)
                .<ResponseEntity<?>>map(loan -> {
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    if (!Set.of("submitted", "under_review").contains(loan.getStatus())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiErrorResponse.of(409, "LOAN_NOT_APPRAISABLE", "Only submitted or under-review loans can be appraised."));
                    }
                    LoanAppraisal appraisal = appraisalRepository.save(LoanAppraisal.record(
                            "appraisal_" + UUID.randomUUID(),
                            loan.getTenantId(),
                            loan.getId(),
                            currentSession.user().getId(),
                            recommendation,
                            body.recommendedAmount() == null ? null : Money.normalize(body.recommendedAmount()),
                            body.recommendedTermMonths(),
                            body.notes() == null ? "" : body.notes().trim()));
                    auditService.record(
                            loan.getTenantId(),
                            currentSession.user(),
                            "Recorded loan appraisal (" + recommendation + ")",
                            "loan_appraisal",
                            appraisal.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(LoanAppraisalResponse.from(appraisal)));
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
                    if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
                    return ResponseEntity.ok(ApiResponse.of(repaymentRepository.findByLoanIdOrderByReceivedAtDesc(loanId)
                            .stream()
                            .map(LoanRepaymentResponse::from)
                            .toList()));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found.")));
    }

    @PostMapping("/{loanId}/repayments")
    @Transactional
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

    @GetMapping("/repayments/pending")
    ResponseEntity<?> listPendingRepayments(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:approve")) {
            return authService.permissionRequired("transactions:approve");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<LoanRepayment> pending = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? repaymentRepository.findByStatusOrderByReceivedAtDesc(LoanRepayment.STATUS_PENDING_APPROVAL)
                : repaymentRepository.findByTenantIdAndStatusOrderByReceivedAtDesc(tenantId, LoanRepayment.STATUS_PENDING_APPROVAL);
        List<String> branchScope = branchScope(currentSession, tenantId);
        if (!branchScope.isEmpty()) {
            List<String> scopedLoanIds = loanRepository.findByTenantIdAndMemberBranchIds(tenantId, branchScope).stream()
                    .map(Loan::getId)
                    .toList();
            pending = scopedLoanIds.isEmpty()
                    ? List.of()
                    : repaymentRepository.findByLoanIdInAndStatusOrderByReceivedAtDesc(scopedLoanIds, LoanRepayment.STATUS_PENDING_APPROVAL);
        }

        return ResponseEntity.ok(ApiResponse.of(pending.stream().map(LoanRepaymentResponse::from).toList()));
    }

    @PostMapping("/{loanId}/repayments/{repaymentId}/decision")
    @Transactional
    ResponseEntity<?> decideRepayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @PathVariable String repaymentId,
            @RequestBody RepaymentDecisionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "transactions:approve")) {
            return authService.permissionRequired("transactions:approve");
        }

        String decision = body == null || body.status() == null ? "" : body.status().trim().toLowerCase();
        if (!LoanRepayment.STATUS_POSTED.equals(decision) && !LoanRepayment.STATUS_REJECTED.equals(decision)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_DECISION", "Repayment decision must be 'posted' or 'rejected'."));
        }

        LoanRepayment repayment = repaymentRepository.findById(repaymentId).orElse(null);
        if (repayment == null || !repayment.getLoanId().equals(loanId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "REPAYMENT_NOT_FOUND", "Loan repayment not found."));
        }
        Loan repaymentLoan = loanRepository.findById(loanId).orElse(null);
        if (repaymentLoan == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found."));
        }
        if (!canAccessLoan(currentSession, repaymentLoan)) return loanAccessDenied(currentSession, repaymentLoan);
        if (!repayment.isPendingApproval()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REPAYMENT_ALREADY_DECIDED", "Only pending loan repayments can be decided."));
        }
        if (repayment.getReceivedByUserId().equals(currentSession.user().getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MAKER_CHECKER_REQUIRED", "The maker cannot approve or reject their own loan repayment."));
        }
        if (isSelfDecision(currentSession, repaymentLoan.getMemberId())) return conflictOfInterest("decide the repayment on");

        if (LoanRepayment.STATUS_POSTED.equals(decision)) {
            ResponseEntity<?> channelCheck = ensureCollectionChannelAllowed(repayment.getTenantId(), repayment.getChannel());
            if (channelCheck != null) return channelCheck;
            Loan loan = repaymentLoan;
            if (!"active".equals(loan.getStatus())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "LOAN_NOT_ACTIVE", "Only active loans can receive repayments."));
            }
            Instant postingDate = Instant.now();
            if (periodService.isClosed(loan.getTenantId(), postingDate)) {
                return accountingPeriodClosed(postingDate);
            }
            if (repayment.getAmount().compareTo(loan.getBalance()) > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment amount cannot exceed the outstanding loan balance."));
            }
            loan.recordRepayment(repayment.getAmount());
            releaseSecuredHoldForRepayment(loan, repayment.getAmount());
            loanRepository.save(loan);
            repayment.approve(currentSession.user().getId());
            memberRepository.findById(loan.getMemberId())
                    .ifPresent(member -> notificationService.notifyPaymentPosted(
                            member,
                            "loan_repayment",
                            repayment.getAmount(),
                            "loan_repayment",
                            repayment.getId()));
        } else {
            repayment.reject(currentSession.user().getId());
        }

        LoanRepayment saved = repaymentRepository.save(repayment);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                (LoanRepayment.STATUS_POSTED.equals(decision) ? "Approved" : "Rejected") + " loan repayment " + saved.getReference(),
                "loan_repayment",
                saved.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(LoanRepaymentResponse.from(saved)));
    }

    /**
     * A treasurer may only confirm a repayment on a channel the platform allows for the SACCO. Cash
     * and payroll are always allowed; online channels (mobile money, bank) require the allowed mode.
     */
    private ResponseEntity<?> ensureCollectionChannelAllowed(String tenantId, String channel) {
        if (!"mobile_money".equals(channel) && !"bank".equals(channel)) {
            return null;
        }
        TenantResponse tenant = tenantService.findById(tenantId).orElse(null);
        CollectionMode allowed = tenant == null ? CollectionMode.NONE : CollectionMode.fromStored(tenant.allowedCollectionMode());
        boolean ok = "mobile_money".equals(channel) ? allowed.allowsMobileMoney() : allowed.allowsBank();
        if (ok) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "COLLECTION_CHANNEL_NOT_ALLOWED",
                        "This SACCO is not allowed to collect via " + channel.replace('_', ' ') + ". Ask the platform to enable it."));
    }

    private int dsr(BigDecimal amount, BigDecimal savingsBalance) {
        BigDecimal savingsCapacity = savingsBalance.multiply(BigDecimal.valueOf(3));
        if (savingsCapacity.compareTo(BigDecimal.ZERO) <= 0) return 65;
        BigDecimal ratio = amount
                .divide(savingsCapacity, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(35));
        return Math.min(65, ratio.setScale(0, RoundingMode.HALF_UP).intValue());
    }

    private void createRepaymentSchedule(Loan loan) {
        if (scheduleRepository.existsByLoanId(loan.getId())) return;
        int months = Math.max(1, loan.getRepaymentMonths());
        LocalDate firstDueDate = (loan.getDisbursedAt() == null ? Instant.now() : loan.getDisbursedAt())
                .atZone(ZoneOffset.UTC)
                .toLocalDate()
                .plusMonths(1);
        BigDecimal principalBase = loan.getAmount().divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        BigDecimal interestBase = loan.getInterestAmount().divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        BigDecimal principalAllocated = BigDecimal.ZERO;
        BigDecimal interestAllocated = BigDecimal.ZERO;
        List<LoanRepaymentSchedule> schedules = new ArrayList<>();
        for (int installment = 1; installment <= months; installment++) {
            BigDecimal principalDue = installment == months ? loan.getAmount().subtract(principalAllocated) : principalBase;
            BigDecimal interestDue = installment == months ? loan.getInterestAmount().subtract(interestAllocated) : interestBase;
            principalAllocated = principalAllocated.add(principalDue);
            interestAllocated = interestAllocated.add(interestDue);
            schedules.add(new LoanRepaymentSchedule(
                    "schedule_" + UUID.randomUUID(),
                    loan.getTenantId(),
                    loan.getId(),
                    installment,
                    firstDueDate.plusMonths(installment - 1L),
                    Money.normalize(principalDue),
                    Money.normalize(interestDue),
                    Money.normalize(principalDue.add(interestDue))));
        }
        scheduleRepository.saveAll(schedules);
    }

    private List<LoanRepaymentScheduleResponse> scheduleResponse(Loan loan) {
        List<LoanRepaymentSchedule> schedules = scheduleRepository.findByLoanIdOrderByInstallmentNoAsc(loan.getId());
        BigDecimal remainingPaid = repaymentRepository.totalAmountByLoanId(loan.getId());
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<LoanRepaymentScheduleResponse> responses = new ArrayList<>();
        for (LoanRepaymentSchedule schedule : schedules) {
            BigDecimal paidForInstallment = remainingPaid.min(schedule.getTotalDue());
            if (paidForInstallment.compareTo(BigDecimal.ZERO) < 0) paidForInstallment = BigDecimal.ZERO;
            remainingPaid = remainingPaid.subtract(paidForInstallment);
            String status = scheduleStatus(schedule, paidForInstallment, today);
            BigDecimal balanceDue = schedule.getTotalDue().subtract(paidForInstallment).max(BigDecimal.ZERO);
            int daysPastDue = daysPastDue(schedule.getDueDate(), today, balanceDue);
            responses.add(LoanRepaymentScheduleResponse.from(
                    schedule,
                    Money.normalize(paidForInstallment),
                    daysPastDue,
                    agingBucket(daysPastDue, schedule.getDueDate(), today, balanceDue),
                    status));
        }
        return responses;
    }

    private ScheduleSummary scheduleSummary(Loan loan, BigDecimal repaymentTotal) {
        List<LoanRepaymentSchedule> schedules = scheduleRepository.findByLoanIdOrderByInstallmentNoAsc(loan.getId());
        if (schedules.isEmpty()) {
            String status = "active".equals(loan.getStatus()) ? "not_generated" : "waiting";
            return new ScheduleSummary(
                    0,
                    0,
                    0,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    0,
                    null,
                    status);
        }
        BigDecimal remainingPaid = repaymentTotal == null ? BigDecimal.ZERO : repaymentTotal;
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int paidInstallments = 0;
        int arrearsInstallments = 0;
        BigDecimal arrearsAmount = BigDecimal.ZERO;
        BigDecimal currentDueAmount = BigDecimal.ZERO;
        BigDecimal arrears1To30Amount = BigDecimal.ZERO;
        BigDecimal arrears31To60Amount = BigDecimal.ZERO;
        BigDecimal arrears61To90Amount = BigDecimal.ZERO;
        BigDecimal arrearsOver90Amount = BigDecimal.ZERO;
        int oldestArrearsDays = 0;
        LocalDate nextDueDate = null;
        for (LoanRepaymentSchedule schedule : schedules) {
            BigDecimal paidForInstallment = remainingPaid.min(schedule.getTotalDue());
            if (paidForInstallment.compareTo(BigDecimal.ZERO) < 0) paidForInstallment = BigDecimal.ZERO;
            remainingPaid = remainingPaid.subtract(paidForInstallment);
            BigDecimal balanceDue = schedule.getTotalDue().subtract(paidForInstallment).max(BigDecimal.ZERO);
            if (balanceDue.compareTo(BigDecimal.ZERO) == 0) {
                paidInstallments += 1;
                continue;
            }
            if (nextDueDate == null) nextDueDate = schedule.getDueDate();
            if (schedule.getDueDate().isBefore(today)) {
                arrearsInstallments += 1;
                arrearsAmount = arrearsAmount.add(balanceDue);
                int daysPastDue = daysPastDue(schedule.getDueDate(), today, balanceDue);
                oldestArrearsDays = Math.max(oldestArrearsDays, daysPastDue);
                if (daysPastDue <= 30) {
                    arrears1To30Amount = arrears1To30Amount.add(balanceDue);
                } else if (daysPastDue <= 60) {
                    arrears31To60Amount = arrears31To60Amount.add(balanceDue);
                } else if (daysPastDue <= 90) {
                    arrears61To90Amount = arrears61To90Amount.add(balanceDue);
                } else {
                    arrearsOver90Amount = arrearsOver90Amount.add(balanceDue);
                }
            } else if (schedule.getDueDate().getYear() == today.getYear() && schedule.getDueDate().getMonth() == today.getMonth()) {
                currentDueAmount = currentDueAmount.add(balanceDue);
            }
        }
        String status = arrearsInstallments > 0
                ? "arrears"
                : paidInstallments == schedules.size() ? "settled" : "on_track";
        return new ScheduleSummary(
                schedules.size(),
                paidInstallments,
                arrearsInstallments,
                Money.normalize(arrearsAmount),
                Money.normalize(currentDueAmount),
                Money.normalize(arrears1To30Amount),
                Money.normalize(arrears31To60Amount),
                Money.normalize(arrears61To90Amount),
                Money.normalize(arrearsOver90Amount),
                oldestArrearsDays,
                nextDueDate,
                status);
    }

    private String scheduleStatus(LoanRepaymentSchedule schedule, BigDecimal paidForInstallment, LocalDate today) {
        if (paidForInstallment.compareTo(schedule.getTotalDue()) >= 0) return "paid";
        if (paidForInstallment.compareTo(BigDecimal.ZERO) > 0) return "partial";
        if (schedule.getDueDate().isBefore(today)) return "arrears";
        if (schedule.getDueDate().getYear() == today.getYear() && schedule.getDueDate().getMonth() == today.getMonth()) return "due";
        return "upcoming";
    }

    private int daysPastDue(LocalDate dueDate, LocalDate today, BigDecimal balanceDue) {
        if (balanceDue == null || balanceDue.compareTo(BigDecimal.ZERO) <= 0 || dueDate == null || !dueDate.isBefore(today)) return 0;
        return Math.toIntExact(ChronoUnit.DAYS.between(dueDate, today));
    }

    private String agingBucket(int daysPastDue, LocalDate dueDate, LocalDate today, BigDecimal balanceDue) {
        if (balanceDue == null || balanceDue.compareTo(BigDecimal.ZERO) <= 0) return "paid";
        // An overdue installment is bucketed by how late it is, even if it fell due earlier this month.
        // Only installments that are not yet past due are labelled current (this month) or not due (later).
        if (daysPastDue <= 0) {
            return (dueDate != null && dueDate.getYear() == today.getYear() && dueDate.getMonth() == today.getMonth())
                    ? "current"
                    : "not_due";
        }
        if (daysPastDue <= 30) return "1_30";
        if (daysPastDue <= 60) return "31_60";
        if (daysPastDue <= 90) return "61_90";
        return "over_90";
    }

    private ResponseEntity<?> decideLoan(
            Loan loan,
            String status,
            String reason,
            String resolutionReference,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
        if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
        if (!Set.of("submitted", "under_review").contains(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_ALREADY_DECIDED", "Only submitted or under-review loans can be decided."));
        }
        if (isSelfDecision(currentSession, loan.getMemberId())) return conflictOfInterest("decide");

        if ("rejected".equals(status)) {
            return finaliseLoanDecision(loan, "rejected", reason, currentSession, request);
        }

        // Approval path.
        BigDecimal selfCover = memberRepository.findById(loan.getMemberId())
                .map(Member::getAvailableSavings)
                .orElse(BigDecimal.ZERO);
        BigDecimal totalPayable = loan.getTotalPayable() == null ? loan.getAmount() : loan.getTotalPayable();
        boolean selfSecured = selfCover.compareTo(totalPayable) >= 0;
        if (!selfSecured) {
            // Guarantors and the cover gate are only required when the loan is not fully secured by savings.
            if (loan.getGuarantors() < 1) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "GUARANTOR_REQUIRED", "At least one accepted guarantor is required before loan approval."));
            }
            BigDecimal acceptedPledges = guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loan.getId())
                    .stream()
                    .filter(item -> "accepted".equals(item.getStatus()))
                    .map(LoanGuarantor::getGuaranteedAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (selfCover.add(acceptedPledges).compareTo(loan.getAmount()) < 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "LOAN_NOT_COVERED",
                                "Applicant savings plus accepted guarantor pledges must at least equal the loan amount before approval."));
            }
        }

        BigDecimal amount = loan.getAmount();
        String actorId = currentSession.user().getId();

        // High-value tier: a recorded committee resolution reference is required.
        if (amount.compareTo(approvalDualMax) > 0) {
            String reference = resolutionReference == null ? "" : resolutionReference.trim();
            if (reference.isBlank()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "LOAN_RESOLUTION_REQUIRED",
                                "Loans above " + approvalDualMax + " require a loan committee/board resolution reference to approve."));
            }
            loan.applyResolutionReference(reference);
            return finaliseLoanDecision(loan, "approved", reason, currentSession, request);
        }

        // Mid-value tier: two distinct approvers (maker != checker).
        if (amount.compareTo(approvalSingleMax) > 0) {
            if (loan.getFirstApprovedByUserId() == null) {
                loan.recordFirstApproval(actorId);
                Loan saved = loanRepository.save(loan);
                auditService.record(
                        saved.getTenantId(),
                        currentSession.user(),
                        "Recorded first approval on loan application (awaiting second approver)",
                        "loan",
                        saved.getId(),
                        request.getRemoteAddr());
                return ResponseEntity.ok(ApiResponse.of(loanResponse(saved)));
            }
            if (loan.getFirstApprovedByUserId().equals(actorId)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "SECOND_APPROVER_REQUIRED",
                                "This loan needs a second, different approver to complete approval."));
            }
            return finaliseLoanDecision(loan, "approved", reason, currentSession, request);
        }

        // Low-value tier: single approval.
        return finaliseLoanDecision(loan, "approved", reason, currentSession, request);
    }

    private ResponseEntity<?> finaliseLoanDecision(
            Loan loan,
            String status,
            String reason,
            AuthService.CurrentSession currentSession,
            HttpServletRequest request) {
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
        if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);

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
        if (!canAccessMemberBranch(currentSession, loan.getTenantId(), guarantor)) {
            return branchAccessDenied();
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
        if (!canAccessLoan(currentSession, loan)) return loanAccessDenied(currentSession, loan);
        if (!"active".equals(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_NOT_ACTIVE", "Only active loans can receive repayments."));
        }
        Instant postingDate = Instant.now();
        if (periodService.isClosed(loan.getTenantId(), postingDate)) {
            return accountingPeriodClosed(postingDate);
        }
        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_AMOUNT", "Repayment amount must be greater than zero."));
        }
        if (amount.compareTo(loan.getBalance()) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "REPAYMENT_EXCEEDS_BALANCE", "Repayment amount cannot exceed the outstanding loan balance."));
        }

        String channel = body.channel() == null ? "cash" : body.channel().trim();
        if (!REPAYMENT_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_CHANNEL", "Unsupported repayment channel."));
        }
        String reference = body.reference() == null || body.reference().isBlank()
                ? repaymentReferenceForTenant(loan.getTenantId())
                : body.reference().trim();
        if (repaymentRepository.existsByTenantIdAndReferenceIgnoreCase(loan.getTenantId(), reference)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "DUPLICATE_REPAYMENT_REFERENCE", "Repayment reference already exists for this SACCO."));
        }

        LoanRepayment repayment = repaymentRepository.save(new LoanRepayment(
                "repayment_" + UUID.randomUUID(),
                loan.getTenantId(),
                loan.getId(),
                loan.getMemberId(),
                amount,
                channel,
                reference,
                body.narration() == null ? "" : body.narration().trim(),
                currentSession.user().getId()));
        loan.recordRepayment(repayment.getAmount());
        releaseSecuredHoldForRepayment(loan, repayment.getAmount());
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
        return Money.parse(value);
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

    /** True when the acting staff user is linked to (i.e. is) the member who owns this record. */
    private boolean isSelfDecision(AuthService.CurrentSession session, String memberId) {
        return memberRepository.findFirstByLinkedUserId(session.user().getId())
                .map(linked -> linked.getId().equals(memberId))
                .orElse(false);
    }

    private ResponseEntity<?> conflictOfInterest(String action) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "CONFLICT_OF_INTEREST",
                        "Your staff account is linked to this member, so you cannot " + action + " your own loan. Another officer must handle it."));
    }

    /** The most a member may pledge in total to guarantee others' loans: three times their savings. */
    private BigDecimal guaranteeCeiling(Member member) {
        return member.getSavingsBalance().multiply(BigDecimal.valueOf(3));
    }

    /** Pledges already tied up in the member's pending/accepted guarantees (optionally excluding one). */
    private BigDecimal committedGuarantees(Member member, String excludedGuarantorId) {
        return guarantorRepository
                .findByMemberIdAndStatusIn(member.getId(), List.of("pending", "accepted"))
                .stream()
                .filter(request -> excludedGuarantorId == null || !request.getId().equals(excludedGuarantorId))
                .map(LoanGuarantor::getGuaranteedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    BigDecimal guaranteeCapacity(Member member, String excludedGuarantorId) {
        return guaranteeCeiling(member).subtract(committedGuarantees(member, excludedGuarantorId)).max(BigDecimal.ZERO);
    }

    private String repaymentReferenceForTenant(String tenantId) {
        String abbreviation = tenantService.findById(tenantId)
                .map(TenantResponse::abbreviation)
                .filter(value -> value != null && !value.isBlank())
                .orElse("SACCO");
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
        return abbreviation + "-LR-" + suffix;
    }

    private LoanResponse loanResponse(Loan loan) {
        BigDecimal repaymentTotal = repaymentRepository.totalAmountByLoanId(loan.getId());
        ScheduleSummary summary = scheduleSummary(loan, repaymentTotal);
        return LoanResponse.from(
                loan,
                repaymentRepository.countByLoanId(loan.getId()),
                repaymentTotal,
                summary.scheduledInstallments(),
                summary.paidInstallments(),
                summary.arrearsInstallments(),
                summary.arrearsAmount(),
                summary.currentDueAmount(),
                summary.arrears1To30Amount(),
                summary.arrears31To60Amount(),
                summary.arrears61To90Amount(),
                summary.arrearsOver90Amount(),
                summary.oldestArrearsDays(),
                summary.nextDueDate(),
                summary.status());
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

    private List<String> branchScope(AuthService.CurrentSession currentSession, String tenantId) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return List.of();
        }
        return branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(tenantId, currentSession.user().getId()).stream()
                .map(Branch::getId)
                .toList();
    }

    private boolean canAccessLoan(AuthService.CurrentSession currentSession, Loan loan) {
        if (!canAccess(currentSession, loan.getTenantId())) return false;
        Member member = memberRepository.findById(loan.getMemberId()).orElse(null);
        return member != null && canAccessMemberBranch(currentSession, loan.getTenantId(), member);
    }

    private boolean canAccessMemberBranch(AuthService.CurrentSession currentSession, String tenantId, Member member) {
        List<String> scopedBranchIds = branchScope(currentSession, tenantId);
        return scopedBranchIds.isEmpty() || scopedBranchIds.contains(member.getBranchId());
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access loans for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> loanAccessDenied(AuthService.CurrentSession currentSession, Loan loan) {
        return canAccess(currentSession, loan.getTenantId()) ? branchAccessDenied() : tenantAccessDenied();
    }

    private ResponseEntity<ApiErrorResponse> branchAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access loans outside assigned branch scope."));
    }

    private String searchTerm(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private String searchable(String... values) {
        return String.join(" ", java.util.Arrays.stream(values)
                .map(value -> value == null ? "" : value)
                .toList()).toLowerCase(Locale.ROOT);
    }

    private Sort sortBy(boolean platformAll, String requestedSort, String requestedDirection, Map<String, String> allowed, String fallback, Sort.Direction fallbackDirection) {
        String property = allowed.getOrDefault(requestedSort == null ? "" : requestedSort.trim(), fallback);
        Sort.Direction resolvedDirection = requestedDirection == null || requestedDirection.isBlank()
                ? fallbackDirection
                : ("desc".equalsIgnoreCase(requestedDirection) ? Sort.Direction.DESC : Sort.Direction.ASC);
        Sort sort = Sort.by(resolvedDirection, property);
        return platformAll && !"tenantId".equals(property) ? Sort.by(Sort.Direction.ASC, "tenantId").and(sort) : sort;
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

    record AppraisalRequest(
            @NotBlank String recommendation,
            BigDecimal recommendedAmount,
            Integer recommendedTermMonths,
            String notes) {
    }

    record UpdateLoanStatusRequest(@NotBlank String status, String reason, String resolutionReference) {
    }

    record CreateGuarantorRequest(@NotBlank String memberId, BigDecimal guaranteedAmount) {
    }

    record CreateRepaymentRequest(
            @NotNull BigDecimal amount,
            String channel,
            String reference,
            String narration) {
    }

    record RepaymentDecisionRequest(
            String status,
            String reason) {
    }

    private record ScheduleSummary(
            int scheduledInstallments,
            int paidInstallments,
            int arrearsInstallments,
            BigDecimal arrearsAmount,
            BigDecimal currentDueAmount,
            BigDecimal arrears1To30Amount,
            BigDecimal arrears31To60Amount,
            BigDecimal arrears61To90Amount,
            BigDecimal arrearsOver90Amount,
            int oldestArrearsDays,
            LocalDate nextDueDate,
            String status) {
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
