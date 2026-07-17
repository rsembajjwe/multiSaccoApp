package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.complaint.Complaint;
import com.methaltech.sacco.complaint.ComplaintResponse;
import com.methaltech.sacco.complaint.ComplaintService;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.DemoCredentialPolicy;
import com.methaltech.sacco.identity.LoginAttemptService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanGuarantor;
import com.methaltech.sacco.loan.LoanGuarantorRepository;
import com.methaltech.sacco.loan.LoanGuarantorResponse;
import com.methaltech.sacco.loan.LoanRepaymentRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.loan.LoanResponse;
import com.methaltech.sacco.notification.Notification;
import com.methaltech.sacco.notification.NotificationRepository;
import com.methaltech.sacco.notification.NotificationResponse;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/member-auth")
class MemberAuthController {

    private static final Set<String> ALLOWED_LOAN_PRODUCTS = Set.of(
            "Development Loan",
            "Emergency Loan",
            "Agriculture Loan",
            "School Fees Loan");
    private static final Set<String> GUARANTOR_DECISIONS = Set.of("accepted", "rejected");

    private final MemberRepository memberRepository;
    private final MemberSessionRepository memberSessionRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository repaymentRepository;
    private final LoanGuarantorRepository guarantorRepository;
    private final ComplaintService complaintService;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final MemberAuthService memberAuthService;
    private final BranchLookup branchLookup;
    private final TenantService tenantService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;
    private final LoginAttemptService loginAttemptService;
    private final DemoCredentialPolicy demoCredentialPolicy;

    MemberAuthController(
            MemberRepository memberRepository,
            MemberSessionRepository memberSessionRepository,
            LoanRepository loanRepository,
            LoanRepaymentRepository repaymentRepository,
            LoanGuarantorRepository guarantorRepository,
            ComplaintService complaintService,
            NotificationRepository notificationRepository,
            NotificationService notificationService,
            MemberAuthService memberAuthService,
            BranchLookup branchLookup,
            TenantService tenantService,
            AuditService auditService,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator,
            LoginAttemptService loginAttemptService,
            DemoCredentialPolicy demoCredentialPolicy) {
        this.memberRepository = memberRepository;
        this.memberSessionRepository = memberSessionRepository;
        this.loanRepository = loanRepository;
        this.repaymentRepository = repaymentRepository;
        this.guarantorRepository = guarantorRepository;
        this.complaintService = complaintService;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.memberAuthService = memberAuthService;
        this.branchLookup = branchLookup;
        this.tenantService = tenantService;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
        this.loginAttemptService = loginAttemptService;
        this.demoCredentialPolicy = demoCredentialPolicy;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String identifier = request.identifier().trim();
        String rateLimitKey = "member:" + servletRequest.getRemoteAddr();
        if (loginAttemptService.isLimited(rateLimitKey)) return rateLimited(rateLimitKey);
        if (!demoCredentialPolicy.memberLoginAllowed(identifier)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "DEMO_LOGIN_DISABLED", "Seeded demo member accounts are disabled outside the development/demo profile."));
        }

        Member member = memberRepository
                .findFirstByMembershipNoIgnoreCaseOrPhoneIgnoreCaseOrEmailIgnoreCase(identifier, identifier, identifier)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);

        if (member == null) {
            loginAttemptService.recordFailure(rateLimitKey);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(
                            401,
                            "INVALID_MEMBER_CREDENTIALS",
                            "Invalid member credentials or inactive member account."));
        }

        loginAttemptService.clear(rateLimitKey);
        String token = tokenGenerator.createToken();
        MemberSession session = memberSessionRepository.save(new MemberSession(
                "member_session_" + UUID.randomUUID(),
                member.getId(),
                member.getTenantId(),
                tokenGenerator.hashToken(token),
                Instant.now().plus(Duration.ofHours(8))));

        auditService.record(
                member.getTenantId(),
                (String) null,
                member.getFullName(),
                "Member logged in",
                "member_session",
                session.getId(),
                servletRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(new LoginResponse(
                token,
                MemberResponse.from(member),
                tenantService.findById(member.getTenantId()).orElse(null),
                branchLookup.findSummary(member.getBranchId()).orElse(null),
                Balances.from(member),
                session.getExpiresAt())));
    }

    private ResponseEntity<ApiErrorResponse> rateLimited(String key) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(loginAttemptService.retryAfterSeconds(key)))
                .body(ApiErrorResponse.of(429, "LOGIN_RATE_LIMITED", "Too many failed login attempts. Try again later."));
    }

    @GetMapping("/me")
    ResponseEntity<?> me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        return ResponseEntity.ok(ApiResponse.of(new CurrentMemberResponse(
                MemberResponse.from(member),
                tenantService.findById(member.getTenantId()).orElse(null),
                branchLookup.findSummary(member.getBranchId()).orElse(null),
                Balances.from(member))));
    }

    @PostMapping("/logout")
    ResponseEntity<?> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        currentSession.session().revoke();
        memberSessionRepository.save(currentSession.session());
        return ResponseEntity.ok(ApiResponse.of(new LogoutResponse(true)));
    }

    @GetMapping("/mobile-dashboard")
    ResponseEntity<?> mobileDashboard(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        List<LoanResponse> loans = loanRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(this::loanResponse)
                .toList();
        List<NotificationResponse> notifications = notificationRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .limit(5)
                .map(NotificationResponse::from)
                .toList();
        List<LoanGuarantorResponse> pendingGuarantors = guarantorRepository.findByMemberIdAndStatusIn(member.getId(), List.of("pending"))
                .stream()
                .map(request -> LoanGuarantorResponse.from(
                        request,
                        loanRepository.findById(request.getLoanId()).orElse(null),
                        guaranteeCapacity(member, request.getId())))
                .toList();
        Instant lastUpdatedAt = java.util.stream.Stream.concat(
                        loans.stream().map(LoanResponse::updatedAt),
                        notificationRepository.findByMemberIdOrderByCreatedAtDesc(member.getId()).stream().map(Notification::getCreatedAt))
                .filter(value -> value != null)
                .max(Comparator.naturalOrder())
                .orElse(Instant.now());

        return ResponseEntity.ok(ApiResponse.of(new MobileDashboardResponse(
                MemberResponse.from(member),
                tenantService.findById(member.getTenantId()).orElse(null),
                branchLookup.findSummary(member.getBranchId()).orElse(null),
                Balances.from(member),
                loans,
                notifications,
                pendingGuarantors,
                lastUpdatedAt,
                true)));
    }

    @GetMapping("/notifications")
    ResponseEntity<?> listNotifications(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        return ResponseEntity.ok(ApiResponse.of(notificationRepository.findByMemberIdOrderByCreatedAtDesc(currentSession.member().getId())
                .stream()
                .map(NotificationResponse::from)
                .toList()));
    }

    @PostMapping("/mobile-loans")
    ResponseEntity<?> createMobileLoan(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody MobileLoanRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        if (!"active".equals(member.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "MEMBER_NOT_ACTIVE", "Only active members can apply for loans."));
        }
        String product = body.product().trim();
        if (!ALLOWED_LOAN_PRODUCTS.contains(product)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_PRODUCT", "Unsupported loan product."));
        }
        if (body.amount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_AMOUNT", "Loan amount must be greater than zero."));
        }
        int repaymentMonths = body.repaymentMonths() == null ? 12 : body.repaymentMonths();
        if (repaymentMonths < 1 || repaymentMonths > 60) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_PERIOD", "Repayment period must be between 1 and 60 months."));
        }

        Loan loan = loanRepository.save(Loan.submitted(
                "loan_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                product,
                body.amount(),
                dsr(body.amount(), member.getSavingsBalance()),
                repaymentMonths,
                body.purpose() == null ? "" : body.purpose().trim(),
                "mobile",
                member.getId()));
        notificationService.notifyLoanApplicationSubmitted(member, product, body.amount(), loan.getId());
        auditService.record(
                member.getTenantId(),
                (String) null,
                member.getFullName(),
                "Submitted mobile loan application for " + member.getMembershipNo(),
                "loan",
                loan.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(loanResponse(loan)));
    }

    @PostMapping("/mobile-complaints")
    ResponseEntity<?> syncMobileComplaint(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody MobileComplaintRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        String category = body.category().trim();
        if (!ComplaintService.CATEGORIES.contains(category)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_CATEGORY", "Unsupported complaint category."));
        }
        String priority = body.priority() == null || body.priority().isBlank() ? "medium" : body.priority().trim();
        if (!ComplaintService.PRIORITIES.contains(priority)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_PRIORITY", "Unsupported complaint priority."));
        }

        Member member = currentSession.member();
        Complaint complaint = complaintService.createMemberComplaint(
                member,
                category,
                body.subject().trim(),
                body.description() == null ? "" : body.description().trim(),
                priority);
        auditService.record(
                member.getTenantId(),
                (String) null,
                member.getFullName(),
                "Synced mobile complaint " + complaint.getSubject(),
                "complaint",
                complaint.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(ComplaintResponse.from(complaint)));
    }

    @GetMapping("/guarantor-requests")
    ResponseEntity<?> listGuarantorRequests(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        return ResponseEntity.ok(ApiResponse.of(guarantorRepository.findByMemberIdOrderByCreatedAtDesc(member.getId())
                .stream()
                .map(request -> LoanGuarantorResponse.from(
                        request,
                        loanRepository.findById(request.getLoanId()).orElse(null),
                        guaranteeCapacity(member, request.getId())))
                .toList()));
    }

    @PatchMapping("/guarantor-requests/{guarantorId}/status")
    ResponseEntity<?> updateGuarantorRequest(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String guarantorId,
            @Valid @RequestBody UpdateGuarantorStatusRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        String status = body.status().trim();
        if (!GUARANTOR_DECISIONS.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR_STATUS", "Guarantor requests can only be accepted or rejected."));
        }

        Member member = currentSession.member();
        return guarantorRepository.findById(guarantorId)
                .<ResponseEntity<?>>map(guarantor -> decideGuarantor(guarantor, member, status, request))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "GUARANTOR_REQUEST_NOT_FOUND", "Guarantor request not found.")));
    }

    private ResponseEntity<?> decideGuarantor(
            LoanGuarantor guarantor,
            Member member,
            String status,
            HttpServletRequest request) {
        if (!guarantor.getMemberId().equals(member.getId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "GUARANTOR_REQUEST_NOT_FOUND", "Guarantor request not found."));
        }
        if (!"pending".equals(guarantor.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTOR_ALREADY_DECIDED", "Only pending guarantor requests can be decided."));
        }
        if ("accepted".equals(status) && guarantor.getGuaranteedAmount().compareTo(guaranteeCapacity(member, guarantor.getId())) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTEE_CAPACITY_EXCEEDED", "Guarantee exceeds your available guarantee capacity."));
        }

        guarantor.decide(status);
        LoanGuarantor saved = guarantorRepository.save(guarantor);
        Loan loan = loanRepository.findById(saved.getLoanId()).orElse(null);
        if (loan != null) {
            loan.refreshGuarantors((int) guarantorRepository.countByLoanIdAndStatus(loan.getId(), "accepted"));
            loanRepository.save(loan);
        }
        auditService.record(
                saved.getTenantId(),
                (String) null,
                member.getFullName(),
                ("accepted".equals(status) ? "Accepted" : "Rejected") + " loan guarantee request",
                "loan_guarantor",
                saved.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(LoanGuarantorResponse.from(saved, loan, guaranteeCapacity(member, saved.getId()))));
    }

    private BigDecimal guaranteeCapacity(Member member, String excludedGuarantorId) {
        BigDecimal committed = guarantorRepository
                .findByMemberIdAndStatusIn(member.getId(), List.of("pending", "accepted"))
                .stream()
                .filter(item -> excludedGuarantorId == null || !item.getId().equals(excludedGuarantorId))
                .map(LoanGuarantor::getGuaranteedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return member.getSavingsBalance().multiply(BigDecimal.valueOf(3)).subtract(committed).max(BigDecimal.ZERO);
    }

    private int dsr(BigDecimal amount, BigDecimal savingsBalance) {
        BigDecimal savingsCapacity = savingsBalance.multiply(BigDecimal.valueOf(3));
        if (savingsCapacity.compareTo(BigDecimal.ZERO) <= 0) return 65;
        BigDecimal ratio = amount
                .divide(savingsCapacity, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(35));
        return Math.min(65, ratio.setScale(0, RoundingMode.HALF_UP).intValue());
    }

    private LoanResponse loanResponse(Loan loan) {
        return LoanResponse.from(
                loan,
                repaymentRepository.countByLoanId(loan.getId()),
                repaymentRepository.totalAmountByLoanId(loan.getId()));
    }

    record LoginRequest(@NotBlank String identifier, @NotBlank String password) {
    }

    record LoginResponse(
            String token,
            MemberResponse member,
            TenantResponse tenant,
            BranchLookup.BranchSummary branch,
            Balances balances,
            Instant expiresAt) {
    }

    record CurrentMemberResponse(
            MemberResponse member,
            TenantResponse tenant,
            BranchLookup.BranchSummary branch,
            Balances balances) {
    }

    record MobileDashboardResponse(
            MemberResponse member,
            TenantResponse tenant,
            BranchLookup.BranchSummary branch,
            Balances balances,
            List<LoanResponse> loans,
            List<NotificationResponse> notifications,
            List<LoanGuarantorResponse> pendingGuarantorRequests,
            Instant lastUpdatedAt,
            boolean serverConfirmed) {
    }

    record Balances(BigDecimal savings, BigDecimal shares, BigDecimal welfare) {
        static Balances from(Member member) {
            return new Balances(member.getSavingsBalance(), member.getSharesBalance(), member.getWelfareBalance());
        }
    }

    record LogoutResponse(boolean loggedOut) {
    }

    record UpdateGuarantorStatusRequest(@NotBlank String status) {
    }

    record MobileComplaintRequest(
            @NotBlank String category,
            @NotBlank String subject,
            String description,
            String priority) {
    }

    record MobileLoanRequest(
            @NotBlank String product,
            @NotNull BigDecimal amount,
            Integer repaymentMonths,
            String purpose) {
    }
}
