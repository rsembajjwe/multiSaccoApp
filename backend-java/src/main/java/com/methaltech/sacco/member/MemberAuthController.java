package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.accounting.MobileMoneyProviderRouter;
import com.methaltech.sacco.complaint.Complaint;
import com.methaltech.sacco.complaint.ComplaintRepository;
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
import com.methaltech.sacco.loan.LoanRepaymentSchedule;
import com.methaltech.sacco.loan.LoanRepaymentScheduleRepository;
import com.methaltech.sacco.loan.LoanRepository;
import com.methaltech.sacco.loan.LoanResponse;
import com.methaltech.sacco.finance.FinancialTransaction;
import com.methaltech.sacco.finance.FinancialTransactionRepository;
import com.methaltech.sacco.money.Money;
import com.methaltech.sacco.notification.Notification;
import com.methaltech.sacco.notification.NotificationChannelPreferenceService;
import com.methaltech.sacco.notification.NotificationRepository;
import com.methaltech.sacco.notification.NotificationResponse;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.tenant.Tenant;
import com.methaltech.sacco.tenant.TenantRepository;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import com.methaltech.sacco.finance.LoanProductCatalog;
import com.methaltech.sacco.tenant.SaccoPaymentAccountRepository;
import com.methaltech.sacco.tenant.SaccoPaymentAccountResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final LoanRepaymentScheduleRepository scheduleRepository;
    private final LoanGuarantorRepository guarantorRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintService complaintService;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final MemberAuthService memberAuthService;
    private final BranchLookup branchLookup;
    private final TenantRepository tenantRepository;
    private final TenantService tenantService;
    private final AuditService auditService;
    private final MemberPrivacyRequestRepository privacyRequestRepository;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;
    private final LoginAttemptService loginAttemptService;
    private final DemoCredentialPolicy demoCredentialPolicy;
    private final MobileMoneyProviderRouter mobileMoneyProviderRouter;
    private final SaccoPaymentAccountRepository paymentAccountRepository;
    private final MemberFundBalanceService memberFundBalanceService;
    private final NotificationChannelPreferenceService channelPreferenceService;
    private final MemberSubscriptionRepository memberSubscriptionRepository;
    private final MemberPasswordResetRequestRepository passwordResetRepository;
    private final LoanProductCatalog loanProductCatalog;

    MemberAuthController(
            MemberRepository memberRepository,
            MemberSessionRepository memberSessionRepository,
            LoanRepository loanRepository,
            LoanRepaymentRepository repaymentRepository,
            LoanRepaymentScheduleRepository scheduleRepository,
            LoanGuarantorRepository guarantorRepository,
            FinancialTransactionRepository transactionRepository,
            ComplaintRepository complaintRepository,
            ComplaintService complaintService,
            NotificationRepository notificationRepository,
            NotificationService notificationService,
            MemberAuthService memberAuthService,
            BranchLookup branchLookup,
            TenantRepository tenantRepository,
            TenantService tenantService,
            AuditService auditService,
            MemberPrivacyRequestRepository privacyRequestRepository,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator,
            LoginAttemptService loginAttemptService,
            DemoCredentialPolicy demoCredentialPolicy,
            MobileMoneyProviderRouter mobileMoneyProviderRouter,
            SaccoPaymentAccountRepository paymentAccountRepository,
            MemberFundBalanceService memberFundBalanceService,
            NotificationChannelPreferenceService channelPreferenceService,
            MemberSubscriptionRepository memberSubscriptionRepository,
            MemberPasswordResetRequestRepository passwordResetRepository,
            LoanProductCatalog loanProductCatalog) {
        this.memberRepository = memberRepository;
        this.memberSessionRepository = memberSessionRepository;
        this.loanRepository = loanRepository;
        this.repaymentRepository = repaymentRepository;
        this.scheduleRepository = scheduleRepository;
        this.guarantorRepository = guarantorRepository;
        this.transactionRepository = transactionRepository;
        this.complaintRepository = complaintRepository;
        this.complaintService = complaintService;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.memberAuthService = memberAuthService;
        this.branchLookup = branchLookup;
        this.tenantRepository = tenantRepository;
        this.tenantService = tenantService;
        this.auditService = auditService;
        this.privacyRequestRepository = privacyRequestRepository;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
        this.loginAttemptService = loginAttemptService;
        this.demoCredentialPolicy = demoCredentialPolicy;
        this.mobileMoneyProviderRouter = mobileMoneyProviderRouter;
        this.paymentAccountRepository = paymentAccountRepository;
        this.memberFundBalanceService = memberFundBalanceService;
        this.channelPreferenceService = channelPreferenceService;
        this.memberSubscriptionRepository = memberSubscriptionRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.loanProductCatalog = loanProductCatalog;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String identifier = request.identifier().trim();
        Tenant requestedTenant = resolveTenant(request.saccoCode());
        if (request.saccoCode() != null && !request.saccoCode().isBlank() && requestedTenant == null) {
            recordLoginAudit("tenant_platform", "Blocked member login with invalid SACCO code " + request.saccoCode().trim(), identifier, servletRequest);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "INVALID_MEMBER_CREDENTIALS", "Invalid SACCO code, username, or password."));
        }

        String rateLimitKey = "member:" + servletRequest.getRemoteAddr() + ":" + (requestedTenant == null ? "legacy" : requestedTenant.getId());
        if (loginAttemptService.isLimited(rateLimitKey)) {
            recordLoginAudit(auditTenantId(requestedTenant), "Blocked member login after too many failed attempts", identifier, servletRequest);
            return rateLimited(rateLimitKey);
        }
        if (!demoCredentialPolicy.memberLoginAllowed(identifier)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "DEMO_LOGIN_DISABLED", "Seeded demo member accounts are disabled outside the development/demo profile."));
        }

        Member member = findLoginMember(requestedTenant, identifier)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);

        if (member == null) {
            loginAttemptService.recordFailure(rateLimitKey);
            recordLoginAudit(auditTenantId(requestedTenant), "Failed member login credentials", identifier, servletRequest);
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

    private Tenant resolveTenant(String saccoCode) {
        if (saccoCode == null || saccoCode.isBlank()) return null;
        String code = saccoCode.trim();
        if ("platform".equalsIgnoreCase(code)) return tenantRepository.findById("tenant_platform").orElse(null);
        return tenantRepository.findByAbbreviationIgnoreCase(code)
                .or(() -> tenantRepository.findByRegistrationNoIgnoreCase(code))
                .orElse(null);
    }

    private java.util.Optional<Member> findLoginMember(Tenant tenant, String identifier) {
        if (tenant == null) {
            return memberRepository.findFirstByMembershipNoIgnoreCaseOrPhoneIgnoreCaseOrEmailIgnoreCase(identifier, identifier, identifier);
        }
        return memberRepository.findFirstByTenantIdAndMembershipNoIgnoreCaseOrTenantIdAndPhoneIgnoreCaseOrTenantIdAndEmailIgnoreCase(
                tenant.getId(),
                identifier,
                tenant.getId(),
                identifier,
                tenant.getId(),
                identifier);
    }

    private ResponseEntity<ApiErrorResponse> rateLimited(String key) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(loginAttemptService.retryAfterSeconds(key)))
                .body(ApiErrorResponse.of(429, "LOGIN_RATE_LIMITED", "Too many failed login attempts. Try again later."));
    }

    private String auditTenantId(Tenant tenant) {
        return tenant == null ? "tenant_platform" : tenant.getId();
    }

    private void recordLoginAudit(String tenantId, String action, String identifier, HttpServletRequest request) {
        auditService.record(
                tenantId,
                null,
                "Login Gateway",
                action,
                "member_login",
                truncate(identifier, 120),
                request.getRemoteAddr());
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) return "";
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private String normalizedPrivacyType(String value) {
        return value == null ? "" : value.trim().toLowerCase().replace("-", "_");
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
                Balances.from(member),
                currentSession.session().getExpiresAt())));
    }

    @PostMapping("/logout")
    ResponseEntity<?> logout(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        currentSession.session().revoke();
        memberSessionRepository.save(currentSession.session());
        auditService.record(
                currentSession.member().getTenantId(),
                (String) null,
                currentSession.member().getFullName(),
                "Logged out member session",
                "member_session",
                currentSession.member().getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new LogoutResponse(true)));
    }

    @PatchMapping("/privacy-consents")
    ResponseEntity<?> updatePrivacyConsents(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody UpdatePrivacyConsentsRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        member.updateConsents(
                body.privacyNoticeAccepted(),
                body.smsConsent(),
                body.emailConsent(),
                body.mobileMoneyConsent(),
                body.providerDataSharingConsent());
        Member saved = memberRepository.save(member);
        auditService.record(
                saved.getTenantId(),
                (String) null,
                saved.getFullName(),
                "Updated member privacy consents",
                "member_privacy_consent",
                saved.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(MemberResponse.from(saved)));
    }

    @GetMapping("/privacy-requests")
    ResponseEntity<?> listPrivacyRequests(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        return ResponseEntity.ok(ApiResponse.of(privacyRequestRepository
                .findByTenantIdAndMemberIdOrderByCreatedAtDesc(member.getTenantId(), member.getId())
                .stream()
                .map(MemberPrivacyRequestResponse::from)
                .toList()));
    }

    @PostMapping("/privacy-requests")
    ResponseEntity<?> createPrivacyRequest(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreatePrivacyRequestRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        String requestType = normalizedPrivacyType(body.requestType());
        if (!MemberPrivacyRequest.ALLOWED_TYPES.contains(requestType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_PRIVACY_REQUEST_TYPE", "Unsupported privacy request type."));
        }

        Member member = currentSession.member();
        MemberPrivacyRequest privacyRequest = privacyRequestRepository.save(new MemberPrivacyRequest(
                "member_privacy_request_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                requestType,
                truncate(body.reason(), 500),
                member.getId(),
                null));
        auditService.record(
                member.getTenantId(),
                (String) null,
                member.getFullName(),
                "Submitted member privacy request " + requestType,
                "member_privacy_request",
                privacyRequest.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberPrivacyRequestResponse.from(privacyRequest)));
    }

    @PostMapping("/extend-session")
    ResponseEntity<?> extendSession(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Instant expiresAt = Instant.now().plus(Duration.ofHours(8));
        currentSession.session().extendTo(expiresAt);
        memberSessionRepository.save(currentSession.session());
        auditService.record(
                currentSession.member().getTenantId(),
                (String) null,
                currentSession.member().getFullName(),
                "Extended member session",
                "member_session",
                currentSession.member().getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new SessionExtensionResponse(expiresAt)));
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
                        guaranteeCapacity(member, request.getId()),
                        guaranteeCeiling(member),
                        committedGuarantees(member, request.getId())))
                .toList();
        List<MobileStatementLineResponse> statementLines = recentStatementLines(member);
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
                statementLines,
                mobileMoneyProviderRouter.availablePaymentOptions(),
                lastUpdatedAt,
                true)));
    }

    @GetMapping("/collection-accounts")
    ResponseEntity<?> listCollectionAccounts(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();
        Tenant tenant = tenantRepository.findById(currentSession.member().getTenantId()).orElse(null);
        if (tenant == null) return ResponseEntity.ok(ApiResponse.of(List.of()));

        return ResponseEntity.ok(ApiResponse.of(paymentAccountRepository
                .findByTenantIdAndActiveTrueOrderByChannelAscCreatedAtAsc(currentSession.member().getTenantId())
                .stream()
                .filter(account -> (account.isMobileMoney() && tenant.mobileMoneyCollectionAvailable())
                        || (account.isBank() && tenant.bankCollectionAvailable()))
                .map(SaccoPaymentAccountResponse::from)
                .toList()));
    }

    @GetMapping("/fund-balances")
    ResponseEntity<?> listFundBalances(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        return ResponseEntity.ok(ApiResponse.of(memberFundBalanceService.balancesFor(currentSession.member().getId())
                .stream()
                .map(balance -> new FundBalanceResponse(balance.getFundCode(), balance.getBalance(), balance.getUpdatedAt()))
                .toList()));
    }

    @GetMapping("/loan-products")
    ResponseEntity<?> listLoanProducts(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        return ResponseEntity.ok(ApiResponse.of(
                loanProductCatalog.activeLoanProducts(currentSession.member().getTenantId())));
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

    @PostMapping("/password-reset/request")
    ResponseEntity<?> requestPasswordReset(@RequestBody MemberPasswordResetRequestBody body, HttpServletRequest request) {
        String channel = normalizeResetChannel(body == null ? null : body.channel());
        boolean sms = "sms".equals(channel);
        Tenant tenant = resolveTenant(body == null ? null : body.saccoCode());
        Member member = body == null || body.identifier() == null || body.identifier().isBlank()
                ? null
                : findLoginMember(tenant, body.identifier().trim()).filter(candidate -> "active".equals(candidate.getStatus())).orElse(null);
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(30));
        String demoToken = null;
        String externalReference = null;
        if (member != null) {
            String token = tokenGenerator.createToken();
            externalReference = sms ? "PWDRESET-" + UUID.randomUUID() : null;
            MemberPasswordResetRequest reset = passwordResetRepository.save(new MemberPasswordResetRequest(
                    "mprr_" + UUID.randomUUID(),
                    member.getTenantId(),
                    member.getId(),
                    token,
                    channel,
                    sms ? "pending_payment" : "pending",
                    sms ? new BigDecimal("500") : BigDecimal.ZERO,
                    externalReference,
                    expiresAt));
            if (!sms) {
                notificationService.sendPasswordResetCode(member, token, channel);
            }
            auditService.record(member.getTenantId(), member.getId(), member.getFullName(),
                    "Requested password reset via " + channel, "member_password_reset", reset.getId(), request.getRemoteAddr());
            demoToken = demoCredentialPolicy.demoLoginsEnabled() ? token : null;
        }
        // Generic response either way (do not confirm whether the identifier exists).
        return ResponseEntity.ok(ApiResponse.of(new MemberPasswordResetResponse(
                true, sms, sms ? 500 : 0, externalReference, demoToken, member == null ? null : expiresAt)));
    }

    @PostMapping("/password-reset/confirm")
    ResponseEntity<?> confirmPasswordReset(@Valid @RequestBody MemberPasswordResetConfirmRequest body, HttpServletRequest request) {
        String newPassword = body.newPassword();
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "WEAK_PASSWORD", "Password must be at least 8 characters."));
        }
        MemberPasswordResetRequest reset = passwordResetRepository
                .findFirstByTokenAndStatusAndExpiresAtAfter(body.token().trim(), "pending", Instant.now())
                .orElse(null);
        if (reset == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "INVALID_RESET_TOKEN", "Reset code is invalid, unpaid, used or expired."));
        }
        Member member = memberRepository.findById(reset.getMemberId()).filter(candidate -> "active".equals(candidate.getStatus())).orElse(null);
        if (member == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "INVALID_RESET_TOKEN", "Reset code is invalid or expired."));
        }
        PasswordHasher.PasswordHash hash = passwordHasher.hash(newPassword);
        member.changePassword(hash.hash(), hash.salt());
        memberRepository.save(member);
        reset.markUsed();
        passwordResetRepository.save(reset);
        auditService.record(member.getTenantId(), member.getId(), member.getFullName(),
                "Completed password reset", "member_password_reset", reset.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new MemberPasswordResetConfirmResponse(true)));
    }

    private String normalizeResetChannel(String channel) {
        String value = channel == null ? "" : channel.trim().toLowerCase();
        return ("whatsapp".equals(value) || "sms".equals(value)) ? value : "email";
    }

    @GetMapping("/membership")
    ResponseEntity<?> membership(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();
        return ResponseEntity.ok(ApiResponse.of(memberSubscriptionRepository
                .findFirstByMemberIdOrderByCreatedAtDesc(currentSession.member().getId())
                .map(MemberSubscriptionResponse::from)
                .orElse(null)));
    }

    @GetMapping("/notification-preferences")
    ResponseEntity<?> listNotificationPreferences(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();
        Member member = currentSession.member();
        return ResponseEntity.ok(ApiResponse.of(channelPreferenceService.memberChannels(member.getTenantId(), member.getId())));
    }

    @PutMapping("/notification-preferences")
    ResponseEntity<?> updateNotificationPreference(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody ChannelPreferenceRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();
        Member member = currentSession.member();
        String channel = body == null || body.channel() == null ? "" : body.channel().trim();
        if (!NotificationChannelPreferenceService.GATEABLE_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "UNKNOWN_CHANNEL", "Channel must be one of: " + NotificationChannelPreferenceService.GATEABLE_CHANNELS));
        }
        boolean enabled = body.enabled();
        channelPreferenceService.setMemberChannel(member.getTenantId(), member.getId(), channel, enabled);
        auditService.record(
                member.getTenantId(),
                member.getId(),
                member.getFullName(),
                (enabled ? "Enabled" : "Disabled") + " " + channel + " notifications",
                "notification_channel_preference",
                channel,
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(channelPreferenceService.memberChannels(member.getTenantId(), member.getId())));
    }

    @PatchMapping("/notifications/{notificationId}/acknowledge")
    ResponseEntity<?> acknowledgeNotification(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String notificationId,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "NOTIFICATION_NOT_FOUND", "Notification was not found."));
        }
        if (!member.getId().equals(notification.getMemberId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "MEMBER_ACCESS_DENIED", "Cannot acknowledge another member's notification."));
        }

        notification.markRead();
        Notification saved = notificationRepository.save(notification);
        auditService.record(
                member.getTenantId(),
                member.getId(),
                member.getFullName(),
                "Member acknowledged notification " + saved.getTitle(),
                "member_notification",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(NotificationResponse.from(saved)));
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
        BigDecimal amount = Money.normalize(body.amount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_LOAN_AMOUNT", "Loan amount must be greater than zero."));
        }
        int repaymentMonths = body.repaymentMonths() == null ? 12 : body.repaymentMonths();
        if (repaymentMonths < 1 || repaymentMonths > 60) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_REPAYMENT_PERIOD", "Repayment period must be between 1 and 60 months."));
        }

        List<GuarantorSelection> selections = body.guarantors() == null ? List.of() : body.guarantors();
        // A loan fully secured by the member's own savings (covering principal + interest/charges)
        // does not require guarantors.
        BigDecimal totalPayable = Loan.totalPayableFor(product, amount, repaymentMonths);
        boolean selfSecured = member.getAvailableSavings().compareTo(totalPayable) >= 0;
        if (selections.size() > 3) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR_COUNT", "Select at most 3 guarantors."));
        }
        if (selections.isEmpty() && !selfSecured) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "GUARANTOR_OR_SELF_COVER_REQUIRED",
                            "Select 1 to 3 guarantors, or your savings must cover the loan and its interest to borrow without a guarantor."));
        }
        List<ResolvedGuarantor> resolvedGuarantors = new ArrayList<>();
        Set<String> seenGuarantorIds = new HashSet<>();
        for (GuarantorSelection selection : selections) {
            String membershipNo = selection.membershipNo() == null ? "" : selection.membershipNo().trim();
            if (membershipNo.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR", "Each guarantor requires a membership number."));
            }
            Member guarantor = memberRepository
                    .findFirstByTenantIdAndMembershipNoIgnoreCase(member.getTenantId(), membershipNo)
                    .orElse(null);
            if (guarantor == null) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR", "Guarantor " + membershipNo + " is not a member of your SACCO."));
            }
            if (guarantor.getId().equals(member.getId())) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "BORROWER_CANNOT_GUARANTEE", "You cannot guarantee your own loan."));
            }
            if (!"active".equals(guarantor.getStatus())) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "GUARANTOR_NOT_ACTIVE", "Guarantor " + membershipNo + " is not an active member."));
            }
            if (!seenGuarantorIds.add(guarantor.getId())) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "DUPLICATE_GUARANTOR", "Guarantor " + membershipNo + " was selected more than once."));
            }
            BigDecimal pledge = Money.normalize(selection.pledgeAmount() == null ? BigDecimal.ZERO : selection.pledgeAmount());
            if (pledge.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_GUARANTEE_AMOUNT", "Pledge for " + membershipNo + " must be greater than zero."));
            }
            BigDecimal capacity = guaranteeCapacity(guarantor, null);
            if (pledge.compareTo(capacity) > 0) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "GUARANTEE_CAPACITY_EXCEEDED", "Guarantor " + membershipNo + " can only guarantee up to " + capacity + "."));
            }
            resolvedGuarantors.add(new ResolvedGuarantor(guarantor, pledge));
        }

        Loan loan = loanRepository.save(Loan.submitted(
                "loan_" + UUID.randomUUID(),
                member.getTenantId(),
                member.getId(),
                product,
                amount,
                dsr(amount, member.getSavingsBalance()),
                repaymentMonths,
                body.purpose() == null ? "" : body.purpose().trim(),
                "mobile",
                member.getId()));
        for (ResolvedGuarantor resolved : resolvedGuarantors) {
            guarantorRepository.save(LoanGuarantor.request(
                    "guarantor_" + UUID.randomUUID(),
                    member.getTenantId(),
                    loan.getId(),
                    resolved.guarantor().getId(),
                    resolved.pledge(),
                    null));
            notificationService.notifyGuarantorRequested(resolved.guarantor(), member, resolved.pledge(), loan.getId());
        }
        notificationService.notifyLoanApplicationSubmitted(member, product, amount, loan.getId());
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

    @GetMapping("/members/search")
    ResponseEntity<?> searchGuarantorCandidates(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "q", required = false) String query) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.length() < 2) {
            return ResponseEntity.ok(ApiResponse.of(List.of()));
        }
        // Identity fields only (name + member number) — never balances or guarantee capacity.
        List<GuarantorCandidateResponse> candidates = memberRepository
                .searchGuarantorCandidates(member.getTenantId(), trimmed, PageRequest.of(0, 10))
                .stream()
                .filter(candidate -> !candidate.getId().equals(member.getId()))
                .map(candidate -> new GuarantorCandidateResponse(candidate.getMembershipNo(), candidate.getFullName()))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(candidates));
    }

    @GetMapping("/guarantor-listing")
    ResponseEntity<?> getGuarantorListing(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();
        return ResponseEntity.ok(ApiResponse.of(new GuarantorListingResponse(currentSession.member().isGuarantorListingOptOut())));
    }

    @PatchMapping("/guarantor-listing")
    ResponseEntity<?> updateGuarantorListing(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody UpdateGuarantorListingRequest body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();
        Member member = currentSession.member();
        member.setGuarantorListingOptOut(body != null && body.optOut());
        memberRepository.save(member);
        auditService.record(
                member.getTenantId(),
                (String) null,
                member.getFullName(),
                member.isGuarantorListingOptOut() ? "Opted out of guarantor listing" : "Opted in to guarantor listing",
                "member",
                member.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new GuarantorListingResponse(member.isGuarantorListingOptOut())));
    }

    @PostMapping("/loans/{loanId}/guarantors")
    ResponseEntity<?> addLoanGuarantor(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId,
            @RequestBody GuarantorSelection body,
            HttpServletRequest request) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        Loan loan = loanRepository.findById(loanId)
                .filter(item -> item.getMemberId().equals(member.getId()))
                .orElse(null);
        if (loan == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found."));
        }
        if (!java.util.Set.of("submitted", "under_review").contains(loan.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "LOAN_NOT_EDITABLE", "Guarantors can only be changed while the loan is under review."));
        }
        long activeGuarantors = guarantorRepository.findByLoanIdOrderByCreatedAtDesc(loanId).stream()
                .filter(item -> !"rejected".equals(item.getStatus()))
                .count();
        if (activeGuarantors >= 3) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTOR_LIMIT", "A loan can have at most 3 active guarantors."));
        }

        String membershipNo = body == null || body.membershipNo() == null ? "" : body.membershipNo().trim();
        if (membershipNo.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR", "A guarantor membership number is required."));
        }
        Member guarantor = memberRepository
                .findFirstByTenantIdAndMembershipNoIgnoreCase(member.getTenantId(), membershipNo)
                .orElse(null);
        if (guarantor == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTOR", "Guarantor " + membershipNo + " is not a member of your SACCO."));
        }
        if (guarantor.getId().equals(member.getId())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "BORROWER_CANNOT_GUARANTEE", "You cannot guarantee your own loan."));
        }
        if (!"active".equals(guarantor.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "GUARANTOR_NOT_ACTIVE", "Guarantor " + membershipNo + " is not an active member."));
        }
        if (guarantorRepository.existsByLoanIdAndMemberIdAndStatusNot(loanId, guarantor.getId(), "rejected")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTOR_ALREADY_REQUESTED", "Guarantor " + membershipNo + " already has an active request on this loan."));
        }
        BigDecimal pledge = Money.normalize(body.pledgeAmount() == null ? BigDecimal.ZERO : body.pledgeAmount());
        if (pledge.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_GUARANTEE_AMOUNT", "Pledge for " + membershipNo + " must be greater than zero."));
        }
        BigDecimal capacity = guaranteeCapacity(guarantor, null);
        if (pledge.compareTo(capacity) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "GUARANTEE_CAPACITY_EXCEEDED", "Guarantor " + membershipNo + " can only guarantee up to " + capacity + "."));
        }

        LoanGuarantor saved = guarantorRepository.save(LoanGuarantor.request(
                "guarantor_" + UUID.randomUUID(),
                member.getTenantId(),
                loanId,
                guarantor.getId(),
                pledge,
                null));
        notificationService.notifyGuarantorRequested(guarantor, member, pledge, loanId);
        auditService.record(
                member.getTenantId(),
                (String) null,
                member.getFullName(),
                "Added replacement guarantor " + guarantor.getMembershipNo() + " to loan",
                "loan_guarantor",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(LoanGuarantorResponse.from(saved, loan, guaranteeCapacity(guarantor, saved.getId()),
                        guaranteeCeiling(guarantor), committedGuarantees(guarantor, saved.getId()))));
    }

    @GetMapping("/loans/{loanId}/repayments")
    ResponseEntity<?> memberLoanRepayments(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String loanId) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        Member member = currentSession.member();
        Loan loan = loanRepository.findById(loanId)
                .filter(item -> item.getMemberId().equals(member.getId()))
                .orElse(null);
        if (loan == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "LOAN_NOT_FOUND", "Loan not found."));
        }
        List<MemberLoanRepaymentResponse> rows = repaymentRepository.findByLoanIdOrderByReceivedAtDesc(loanId).stream()
                .filter(item -> "posted".equalsIgnoreCase(item.getStatus()))
                .map(item -> new MemberLoanRepaymentResponse(
                        item.getId(),
                        item.getReference(),
                        item.getAmount(),
                        item.getChannel(),
                        item.getNarration(),
                        item.getReceivedAt()))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(rows));
    }

    record MemberLoanRepaymentResponse(
            String id,
            String reference,
            BigDecimal amount,
            String channel,
            String narration,
            java.time.Instant paidAt) {
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
        notificationService.notifyComplaintSynced(member, complaint.getId());
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

    @GetMapping("/complaints")
    ResponseEntity<?> listMemberComplaints(@RequestHeader(name = "Authorization", required = false) String authorization) {
        MemberAuthService.CurrentMemberSession currentSession = memberAuthService.currentSession(authorization);
        if (currentSession == null) return memberAuthService.authRequired();

        return ResponseEntity.ok(ApiResponse.of(complaintRepository.findByMemberIdOrderByCreatedAtDesc(currentSession.member().getId())
                .stream()
                .map(ComplaintResponse::from)
                .toList()));
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
                        guaranteeCapacity(member, request.getId()),
                        guaranteeCeiling(member),
                        committedGuarantees(member, request.getId())))
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
            memberRepository.findById(loan.getMemberId())
                    .ifPresent(applicant -> notificationService.notifyGuarantorDecision(applicant, member, status, loan.getId()));
        }
        auditService.record(
                saved.getTenantId(),
                (String) null,
                member.getFullName(),
                ("accepted".equals(status) ? "Accepted" : "Rejected") + " loan guarantee request",
                "loan_guarantor",
                saved.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(LoanGuarantorResponse.from(saved, loan, guaranteeCapacity(member, saved.getId()),
                guaranteeCeiling(member), committedGuarantees(member, saved.getId()))));
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
                .filter(item -> excludedGuarantorId == null || !item.getId().equals(excludedGuarantorId))
                .map(LoanGuarantor::getGuaranteedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal guaranteeCapacity(Member member, String excludedGuarantorId) {
        return guaranteeCeiling(member).subtract(committedGuarantees(member, excludedGuarantorId)).max(BigDecimal.ZERO);
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
                summary.nextDueDate(),
                summary.status());
    }

    private ScheduleSummary scheduleSummary(Loan loan, BigDecimal repaymentTotal) {
        List<LoanRepaymentSchedule> schedules = scheduleRepository.findByLoanIdOrderByInstallmentNoAsc(loan.getId());
        if (schedules.isEmpty()) {
            String status = "active".equals(loan.getStatus()) ? "not_generated" : "waiting";
            return new ScheduleSummary(0, 0, 0, BigDecimal.ZERO, null, status);
        }
        BigDecimal remainingPaid = repaymentTotal == null ? BigDecimal.ZERO : repaymentTotal;
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        int paidInstallments = 0;
        int arrearsInstallments = 0;
        BigDecimal arrearsAmount = BigDecimal.ZERO;
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
            }
        }
        String status = arrearsInstallments > 0
                ? "arrears"
                : paidInstallments == schedules.size() ? "settled" : "on_track";
        return new ScheduleSummary(schedules.size(), paidInstallments, arrearsInstallments, Money.normalize(arrearsAmount), nextDueDate, status);
    }

    private List<MobileStatementLineResponse> recentStatementLines(Member member) {
        BigDecimal runningBalance = BigDecimal.ZERO;
        List<MobileStatementLineResponse> lines = new java.util.ArrayList<>();
        for (FinancialTransaction transaction : transactionRepository.findByMemberIdAndStatusOrderByPostedAtAscCreatedAtAsc(member.getId(), "posted")) {
            BigDecimal signedAmount = "withdrawal".equals(transaction.getType())
                    ? transaction.getAmount().negate()
                    : transaction.getAmount();
            runningBalance = runningBalance.add(signedAmount);
            lines.add(new MobileStatementLineResponse(
                    transaction.getId(),
                    transaction.getReference(),
                    transaction.getType(),
                    transaction.getChannel(),
                    transaction.getAmount(),
                    signedAmount.compareTo(BigDecimal.ZERO) < 0 ? signedAmount.abs() : BigDecimal.ZERO,
                    signedAmount.compareTo(BigDecimal.ZERO) > 0 ? signedAmount : BigDecimal.ZERO,
                    runningBalance,
                    transaction.getNarration(),
                    transaction.getPostedAt() == null ? transaction.getCreatedAt() : transaction.getPostedAt()));
        }
        int from = Math.max(lines.size() - 20, 0);
        return lines.subList(from, lines.size());
    }

    record LoginRequest(String saccoCode, @NotBlank String identifier, @NotBlank String password) {
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
            Balances balances,
            Instant expiresAt) {
    }

    record SessionExtensionResponse(Instant expiresAt) {
    }

    record UpdatePrivacyConsentsRequest(
            boolean privacyNoticeAccepted,
            boolean smsConsent,
            boolean emailConsent,
            boolean mobileMoneyConsent,
            boolean providerDataSharingConsent) {
    }

    record CreatePrivacyRequestRequest(@NotBlank String requestType, String reason) {
    }

    record MobileDashboardResponse(
            MemberResponse member,
            TenantResponse tenant,
            BranchLookup.BranchSummary branch,
            Balances balances,
            List<LoanResponse> loans,
            List<NotificationResponse> notifications,
            List<LoanGuarantorResponse> pendingGuarantorRequests,
            List<MobileStatementLineResponse> statementLines,
            List<MobileMoneyProviderRouter.PaymentProviderOption> paymentProviders,
            Instant lastUpdatedAt,
            boolean serverConfirmed) {
    }

    record MobileStatementLineResponse(
            String transactionId,
            String reference,
            String type,
            String channel,
            BigDecimal amount,
            BigDecimal debit,
            BigDecimal credit,
            BigDecimal runningBalance,
            String description,
            Instant postedAt) {
    }

    record Balances(
            BigDecimal savings,
            BigDecimal shares,
            BigDecimal welfare,
            BigDecimal savingsHold,
            BigDecimal availableSavings) {
        static Balances from(Member member) {
            return new Balances(
                    member.getSavingsBalance(),
                    member.getSharesBalance(),
                    member.getWelfareBalance(),
                    member.getSavingsHold(),
                    member.getAvailableSavings());
        }
    }

    record ChannelPreferenceRequest(String channel, boolean enabled) {
    }

    record MemberPasswordResetRequestBody(String saccoCode, String identifier, String channel) {
    }

    record MemberPasswordResetResponse(boolean accepted, boolean paymentRequired, int amount, String externalReference, String resetToken, Instant expiresAt) {
    }

    record MemberPasswordResetConfirmRequest(@NotBlank String token, @NotBlank String newPassword) {
    }

    record MemberPasswordResetConfirmResponse(boolean reset) {
    }

    record FundBalanceResponse(String fundCode, BigDecimal balance, Instant updatedAt) {
    }

    record LogoutResponse(boolean loggedOut) {
    }

    record UpdateGuarantorStatusRequest(@NotBlank String status) {
    }

    private record ScheduleSummary(
            int scheduledInstallments,
            int paidInstallments,
            int arrearsInstallments,
            BigDecimal arrearsAmount,
            LocalDate nextDueDate,
            String status) {
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
            String purpose,
            List<GuarantorSelection> guarantors) {
    }

    record GuarantorSelection(String membershipNo, BigDecimal pledgeAmount) {
    }

    private record ResolvedGuarantor(Member guarantor, BigDecimal pledge) {
    }

    record GuarantorCandidateResponse(String membershipNo, String fullName) {
    }

    record GuarantorListingResponse(boolean optOut) {
    }

    record UpdateGuarantorListingRequest(boolean optOut) {
    }
}
