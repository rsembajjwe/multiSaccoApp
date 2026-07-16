package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
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
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/member-auth")
class MemberAuthController {

    private final MemberRepository memberRepository;
    private final MemberSessionRepository memberSessionRepository;
    private final MemberAuthService memberAuthService;
    private final BranchLookup branchLookup;
    private final TenantService tenantService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;

    MemberAuthController(
            MemberRepository memberRepository,
            MemberSessionRepository memberSessionRepository,
            MemberAuthService memberAuthService,
            BranchLookup branchLookup,
            TenantService tenantService,
            AuditService auditService,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator) {
        this.memberRepository = memberRepository;
        this.memberSessionRepository = memberSessionRepository;
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
}
