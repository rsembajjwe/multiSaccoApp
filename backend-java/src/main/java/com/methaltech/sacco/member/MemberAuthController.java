package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.loan.Loan;
import com.methaltech.sacco.loan.LoanGuarantor;
import com.methaltech.sacco.loan.LoanGuarantorRepository;
import com.methaltech.sacco.loan.LoanGuarantorResponse;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Duration;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/member-auth")
class MemberAuthController {

    private static final Set<String> GUARANTOR_DECISIONS = Set.of("accepted", "rejected");

    private final MemberRepository memberRepository;
    private final MemberSessionRepository memberSessionRepository;
    private final LoanRepository loanRepository;
    private final LoanGuarantorRepository guarantorRepository;
    private final MemberAuthService memberAuthService;
    private final BranchLookup branchLookup;
    private final TenantService tenantService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;

    MemberAuthController(
            MemberRepository memberRepository,
            MemberSessionRepository memberSessionRepository,
            LoanRepository loanRepository,
            LoanGuarantorRepository guarantorRepository,
            MemberAuthService memberAuthService,
            BranchLookup branchLookup,
            TenantService tenantService,
            AuditService auditService,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator) {
        this.memberRepository = memberRepository;
        this.memberSessionRepository = memberSessionRepository;
        this.loanRepository = loanRepository;
        this.guarantorRepository = guarantorRepository;
        this.memberAuthService = memberAuthService;
        this.branchLookup = branchLookup;
        this.tenantService = tenantService;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String identifier = request.identifier().trim();
        Member member = memberRepository
                .findFirstByMembershipNoIgnoreCaseOrPhoneIgnoreCaseOrEmailIgnoreCase(identifier, identifier, identifier)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);

        if (member == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(
                            401,
                            "INVALID_MEMBER_CREDENTIALS",
                            "Invalid member credentials or inactive member account."));
        }

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

    record Balances(BigDecimal savings, BigDecimal shares, BigDecimal welfare) {
        static Balances from(Member member) {
            return new Balances(member.getSavingsBalance(), member.getSharesBalance(), member.getWelfareBalance());
        }
    }

    record LogoutResponse(boolean loggedOut) {
    }

    record UpdateGuarantorStatusRequest(@NotBlank String status) {
    }
}
