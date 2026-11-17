package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.PhoneNumberNormalizer;
import com.methaltech.sacco.security.ContactMasker;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.notification.OnboardingNotificationService;
import com.methaltech.sacco.notification.SmsMessageSegments;
import com.methaltech.sacco.notification.SmsWalletService;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import com.methaltech.sacco.tenant.Tenant;
import com.methaltech.sacco.tenant.TenantRepository;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

        private static final int MFA_MAX_FAILED_ATTEMPTS = 5;

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final MfaChallengeRepository mfaChallengeRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;
    private final TenantRepository tenantRepository;
    private final TenantService tenantService;
    private final LoginAttemptService loginAttemptService;
    private final DemoCredentialPolicy demoCredentialPolicy;
    private final PlatformSecurityPolicyService platformSecurityPolicyService;
    private final SubscriptionRepository subscriptionRepository;
    private final OnboardingNotificationService onboardingNotificationService;
    private final SmsWalletService smsWalletService;
    private final SelfContactService selfContactService;

    AuthController(
            UserRepository userRepository,
            AuthSessionRepository authSessionRepository,
            PasswordResetRequestRepository passwordResetRequestRepository,
            MfaChallengeRepository mfaChallengeRepository,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository,
            RolePermissionRepository rolePermissionRepository,
            AuthService authService,
            AuditService auditService,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator,
            TenantRepository tenantRepository,
            TenantService tenantService,
            LoginAttemptService loginAttemptService,
            DemoCredentialPolicy demoCredentialPolicy,
            PlatformSecurityPolicyService platformSecurityPolicyService,
            SubscriptionRepository subscriptionRepository,
            OnboardingNotificationService onboardingNotificationService,
            SmsWalletService smsWalletService,
            SelfContactService selfContactService) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.mfaChallengeRepository = mfaChallengeRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.authService = authService;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
        this.tenantRepository = tenantRepository;
        this.tenantService = tenantService;
        this.loginAttemptService = loginAttemptService;
        this.demoCredentialPolicy = demoCredentialPolicy;
        this.platformSecurityPolicyService = platformSecurityPolicyService;
        this.subscriptionRepository = subscriptionRepository;
        this.onboardingNotificationService = onboardingNotificationService;
        this.smsWalletService = smsWalletService;
        this.selfContactService = selfContactService;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String identifier = loginIdentifier(request);
        if (request.saccoCode() == null || request.saccoCode().isBlank()
                || identifier.isBlank()
                || request.password() == null
                || request.password().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "LOGIN_REQUIRED", "SACCO code, username, and password are required."));
        }

        Tenant requestedTenant = resolveTenant(request.saccoCode());
        if (request.saccoCode() != null && !request.saccoCode().isBlank() && requestedTenant == null) {
            recordLoginAudit("tenant_platform", "Blocked staff login with invalid SACCO/platform code " + request.saccoCode().trim(), identifier, servletRequest);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "AUTH_INVALID", "Invalid SACCO code, username, or password."));
        }

        String rateLimitKey = "staff:" + servletRequest.getRemoteAddr() + ":" + (requestedTenant == null ? "legacy" : requestedTenant.getId());
        if (loginAttemptService.isLimited(rateLimitKey)) {
            recordLoginAudit(auditTenantId(requestedTenant), "Blocked staff login after too many failed attempts", identifier, servletRequest);
            return rateLimited(rateLimitKey);
        }
        if (!demoCredentialPolicy.staffLoginAllowed(identifier)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "DEMO_LOGIN_DISABLED", "Seeded demo staff accounts are disabled outside the development/demo profile."));
        }

        User user = findLoginUser(requestedTenant, identifier)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);

        if (user == null) {
            loginAttemptService.recordFailure(rateLimitKey);
            recordLoginAudit(auditTenantId(requestedTenant), "Failed staff login credentials", identifier, servletRequest);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "AUTH_INVALID", "Invalid email or password."));
        }
        if (!authService.isPlatform(user) && !saccoCanOperate(requestedTenant)) {
            recordLoginAudit(auditTenantId(requestedTenant), "Blocked staff login because SACCO access is not active, trial, or renewable", identifier, servletRequest);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "SACCO_ACCESS_INACTIVE", "This SACCO cannot operate until platform approval or trial access is active."));
        }

        loginAttemptService.clear(rateLimitKey);
        if (user.isPasswordResetRequired()) {
            return ResponseEntity.ok(ApiResponse.of(new FirstLoginRequiredResponse(
                    true,
                    user.getOnboardingChannel() == null ? "email" : user.getOnboardingChannel())));
        }

        if (user.isMfaEnabled()) {
            String code = mfaCode();
            MfaChallenge challenge = mfaChallengeRepository.save(new MfaChallenge(
                    "mfa_" + UUID.randomUUID(),
                    user.getTenantId(),
                    user.getId(),
                    tokenGenerator.hashToken(code),
                    Instant.now().plus(Duration.ofMinutes(5))));
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(ApiResponse.of(new MfaRequiredResponse(
                            true,
                            challenge.getId(),
                            "demo_app",
                            demoCredentialPolicy.demoLoginsEnabled() ? code : null,
                            challenge.getExpiresAt())));
        }

        return ResponseEntity.ok(ApiResponse.of(loginResponseFor(user, servletRequest)));
    }

    @PostMapping("/first-login-password")
    ResponseEntity<?> changeFirstLoginPassword(
            @Valid @RequestBody FirstLoginPasswordRequest body,
            HttpServletRequest request) {
        String identifier = PhoneNumberNormalizer.normalizeUgandan(body.username());
        Tenant tenant = resolveTenant(body.saccoCode());
        String rateLimitKey = "first-login:" + request.getRemoteAddr() + ":" + (tenant == null ? "invalid" : tenant.getId());
        if (tenant == null || loginAttemptService.isLimited(rateLimitKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "FIRST_LOGIN_INVALID", "Temporary credentials are invalid or expired."));
        }

        User user = findLoginUser(tenant, identifier)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(User::isPasswordResetRequired)
                .filter(candidate -> "sent".equals(candidate.getOnboardingDeliveryStatus()))
                .filter(candidate -> passwordHasher.matches(body.temporaryPassword(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);
        if (user == null) {
            loginAttemptService.recordFailure(rateLimitKey);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "FIRST_LOGIN_INVALID", "Temporary credentials are invalid or expired."));
        }
        List<String> violations = platformSecurityPolicyService.passwordViolations(body.newPassword());
        if (!violations.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "WEAK_PASSWORD", platformSecurityPolicyService.passwordPolicyMessage(violations)));
        }
        if (passwordHasher.matches(body.newPassword(), user.getPasswordSalt(), user.getPasswordHash())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "PASSWORD_REUSE", "Choose a password different from the temporary password."));
        }

        PasswordHasher.PasswordHash password = passwordHasher.hash(body.newPassword());
        user.verifyOnboardingContact();
        user.changePassword(password.hash(), password.salt());
        userRepository.save(user);
        loginAttemptService.clear(rateLimitKey);
        auditService.record(
                user.getTenantId(),
                user,
                "Completed first-login password change and verified " + user.getOnboardingChannel(),
                "staff_onboarding",
                user.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new PasswordResetConfirmResponse(true)));
    }

    @PostMapping("/mfa/enable")
    ResponseEntity<?> enableMfa(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        User user = currentSession.user();
        if (!isPrivileged(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PRIVILEGED_USER_REQUIRED", "MFA can be enabled here only for privileged staff users."));
        }
        user.enableMfa();
        userRepository.save(user);
        auditService.record(
                user.getTenantId(),
                user,
                "Enabled MFA",
                "mfa",
                user.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new MfaEnableResponse(true)));
    }

    @PostMapping("/mfa/disable")
    ResponseEntity<?> disableMfa(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        User user = currentSession.user();
        user.disableMfa();
        userRepository.save(user);
        auditService.record(
                user.getTenantId(),
                user,
                "Disabled MFA",
                "mfa",
                user.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new MfaEnableResponse(false)));
    }

    @PostMapping("/mfa/verify")
    ResponseEntity<?> verifyMfa(@Valid @RequestBody MfaVerifyRequest body, HttpServletRequest request) {
        MfaChallenge challenge = mfaChallengeRepository
                .findByIdAndStatusAndExpiresAtAfter(body.challengeId().trim(), "pending", Instant.now())
                .orElse(null);
        if (challenge == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "MFA_INVALID", "MFA challenge or code is invalid."));
        }
        if (!challenge.getCodeHash().equals(tokenGenerator.hashToken(body.code().trim()))) {
            boolean locked = challenge.recordFailure(MFA_MAX_FAILED_ATTEMPTS);
            mfaChallengeRepository.save(challenge);
            auditService.record(
                    challenge.getTenantId(),
                    challenge.getUserId(),
                    "MFA Gateway",
                    locked ? "Locked MFA challenge after too many failed attempts" : "Failed MFA challenge code",
                    "mfa_challenge",
                    challenge.getId(),
                    request.getRemoteAddr());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "MFA_INVALID", locked
                            ? "MFA challenge locked after too many failed attempts."
                            : "MFA challenge or code is invalid."));
        }
        User user = userRepository.findById(challenge.getUserId())
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "MFA_INVALID", "MFA challenge or code is invalid."));
        }

        challenge.verify();
        mfaChallengeRepository.save(challenge);
        auditService.record(
                user.getTenantId(),
                user,
                "Verified MFA login",
                "mfa",
                challenge.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(loginResponseFor(user, request)));
    }

    private LoginResponse loginResponseFor(User user, HttpServletRequest request) {
        String token = tokenGenerator.createToken();
        Instant expiresAt = Instant.now().plus(Duration.ofHours(8));
        authSessionRepository.save(new AuthSession(
                "session_" + UUID.randomUUID(),
                user.getId(),
                user.getTenantId(),
                tokenGenerator.hashToken(token),
                expiresAt,
                request.getRemoteAddr(),
                truncate(request.getHeader("User-Agent"), 500)));

        UserAccessResponse access = accessFor(user);
        return new LoginResponse(
                token,
                "Bearer",
                UserResponse.from(user),
                access.roleIds(),
                access.roleNames(),
                access.permissionIds(),
                expiresAt);
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) return "";
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    private boolean isPrivileged(User user) {
        if (authService.isPlatform(user)) return true;
        List<String> roleIds = userRoleRepository.findByIdUserIdAndTenantId(user.getId(), user.getTenantId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .toList();
        if (roleIds.isEmpty()) return false;
        return roleRepository.findAllById(roleIds).stream()
                .anyMatch(role -> role.isProtectedRole() && role.getName().toLowerCase().contains("administrator"));
    }

    private String mfaCode() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    private String loginIdentifier(LoginRequest request) {
        String username = request.username() == null ? "" : request.username().trim();
        if (!username.isBlank()) return PhoneNumberNormalizer.normalizeUgandan(username);
        return request.email() == null ? "" : PhoneNumberNormalizer.normalizeUgandan(request.email());
    }

    private Tenant resolveTenant(String saccoCode) {
        if (saccoCode == null || saccoCode.isBlank()) return null;
        String code = saccoCode.trim();
        if ("platform".equalsIgnoreCase(code)) {
            return tenantRepository.findById("tenant_platform").orElse(null);
        }
        return tenantRepository.findByAbbreviationIgnoreCase(code)
                .or(() -> tenantRepository.findByRegistrationNoIgnoreCase(code))
                .orElse(null);
    }

    private java.util.Optional<User> findLoginUser(Tenant tenant, String identifier) {
        if (tenant == null) return java.util.Optional.empty();
        if (identifier.contains("@")) {
            return userRepository.findByTenantIdAndEmailIgnoreCase(tenant.getId(), identifier);
        }
        for (String variant : PhoneNumberNormalizer.loginVariants(identifier)) {
            java.util.Optional<User> user = userRepository.findByTenantIdAndPhone(tenant.getId(), variant);
            if (user.isPresent()) return user;
        }
        return userRepository.findByTenantIdAndEmailIgnoreCase(tenant.getId(), identifier);
    }

    private boolean saccoCanOperate(Tenant tenant) {
        if (tenant == null || "terminated".equals(tenant.getStatus())) return false;
        String subscriptionStatus = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenant.getId())
                .map(subscription -> subscription.getStatus() == null ? "" : subscription.getStatus())
                .orElse("");
        if ("active".equals(tenant.getStatus())) {
            return "active".equals(subscriptionStatus) || "trial".equals(subscriptionStatus);
        }
        return "suspended".equals(tenant.getStatus()) && "expired".equals(subscriptionStatus);
    }

    private UserAccessResponse accessFor(User user) {
        List<String> roleIds = userRoleRepository.findByIdUserIdAndTenantId(user.getId(), user.getTenantId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .sorted()
                .toList();
        List<Role> roles = roleRepository.findAllById(roleIds);
        List<String> roleNames = roles.stream()
                .map(Role::getName)
                .sorted()
                .toList();
        List<String> permissionIds = rolePermissionRepository.findByIdRoleIdIn(roleIds).stream()
                .map(rolePermission -> rolePermission.getId().getPermissionId())
                .distinct()
                .sorted()
                .toList();
        return new UserAccessResponse(roleIds, roleNames, permissionIds);
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
                "auth_login",
                truncate(identifier, 120),
                request.getRemoteAddr());
    }

    @GetMapping("/me")
    ResponseEntity<?> me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        TenantResponse tenant = tenantService.findById(currentSession.user().getTenantId()).orElse(null);
        UserAccessResponse access = accessFor(currentSession.user());
        return ResponseEntity.ok(ApiResponse.of(new CurrentUserResponse(
                UserResponse.from(currentSession.user()),
                tenant,
                access.roleIds(),
                access.roleNames(),
                access.permissionIds(),
                currentSession.session().getExpiresAt())));
    }

    @PatchMapping("/me/contact")
    ResponseEntity<?> updateOwnContact(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody UpdateOwnContactRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        try {
            User saved = selfContactService.update(currentSession.user(), body.email(), body.phone());
            auditService.record(
                    saved.getTenantId(),
                    saved,
                    "Updated own email address and telephone number",
                    "user_contact",
                    saved.getId(),
                    request.getRemoteAddr());
            TenantResponse tenant = tenantService.findById(saved.getTenantId()).orElse(null);
            UserAccessResponse access = accessFor(saved);
            return ResponseEntity.ok(ApiResponse.of(new CurrentUserResponse(
                    UserResponse.from(saved),
                    tenant,
                    access.roleIds(),
                    access.roleNames(),
                    access.permissionIds(),
                    currentSession.session().getExpiresAt())));
        } catch (SelfContactService.ContactUpdateException exception) {
            HttpStatus status = exception.code().endsWith("_IN_USE") ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status)
                    .body(ApiErrorResponse.of(status.value(), exception.code(), exception.getMessage()));
        }
    }

    @GetMapping("/security-summary")
    ResponseEntity<?> securitySummary(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        Instant now = Instant.now();
        List<AuthSession> sessions = authSessionRepository.findByUserIdAndRevokedAtIsNull(currentSession.user().getId()).stream()
                .filter(session -> session.getExpiresAt().isAfter(now))
                .toList();
        List<PasswordResetRequest> resetRequests = passwordResetRequestRepository.findByUserIdOrderByCreatedAtDesc(currentSession.user().getId());
        return ResponseEntity.ok(ApiResponse.of(new SecuritySummaryResponse(
                currentSession.user().isMfaEnabled(),
                currentSession.session().getExpiresAt(),
                sessions.size(),
                sessions.stream().map(SessionSummaryResponse::from).toList(),
                resetRequests.size(),
                resetRequests.stream().limit(5).map(PasswordResetSummaryResponse::from).toList())));
    }

    @PostMapping("/logout")
    ResponseEntity<?> logout(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        currentSession.session().revoke();
        authSessionRepository.save(currentSession.session());
        auditService.record(
                currentSession.user().getTenantId(),
                currentSession.user(),
                "Logged out staff session",
                "auth_session",
                currentSession.user().getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new LogoutResponse(true)));
    }

    @PostMapping("/extend-session")
    ResponseEntity<?> extendSession(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        Instant expiresAt = Instant.now().plus(Duration.ofHours(8));
        currentSession.session().extendTo(expiresAt);
        authSessionRepository.save(currentSession.session());
        auditService.record(
                currentSession.user().getTenantId(),
                currentSession.user(),
                "Extended staff session",
                "auth_session",
                currentSession.user().getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new SessionExtensionResponse(expiresAt)));
    }

    @PostMapping("/password-reset/request")
    ResponseEntity<?> requestPasswordReset(@Valid @RequestBody PasswordResetRequestBody body, HttpServletRequest request) {
        String channel = "sms".equalsIgnoreCase(body.channel()) ? "sms" : "email";
        Tenant tenant = resolveTenant(body.saccoCode());
        String identifier = body.identifier() == null || body.identifier().isBlank() ? body.email() : body.identifier();
        String normalizedIdentifier = PhoneNumberNormalizer.normalizeUgandan(identifier == null ? "" : identifier);
        User user = findPasswordResetUser(tenant, normalizedIdentifier)
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .orElse(null);
        String resetToken = null;
        String destination = null;
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(30));

        if (user != null) {
            String recipient = "sms".equals(channel) ? user.getPhone() : user.getEmail();
            if (recipient == null || recipient.isBlank()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "RESET_CHANNEL_UNAVAILABLE",
                                "This account has no " + ("sms".equals(channel) ? "phone number" : "email address") + " configured."));
            }
            resetToken = tokenGenerator.createPasswordResetCode();
            destination = ContactMasker.mask(recipient);
            int requiredCredits = "sms".equals(channel) ? SmsMessageSegments.count(
                    "Your Tereka Online password reset code is " + resetToken + ". It expires in 30 minutes.") : 0;
            boolean useMainSmsAccount = "sms".equals(channel) && authService.isPlatform(user);
            OnboardingNotificationService.SmsAccountCapacity mainSmsCapacity = null;
            if (useMainSmsAccount) {
                try {
                    mainSmsCapacity = onboardingNotificationService.platformSmsCapacity(smsWalletService.smsRate());
                } catch (OnboardingNotificationService.OnboardingDeliveryException exception) {
                    return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                            .body(ApiErrorResponse.of(502, "SMS_BALANCE_UNAVAILABLE", exception.getMessage()));
                }
            }
            int balance = !"sms".equals(channel)
                    ? 0
                    : useMainSmsAccount
                            ? mainSmsCapacity.availableMessages()
                            : smsWalletService.balance(user.getTenantId());
            if (requiredCredits > balance) {
                String balanceMessage = useMainSmsAccount
                        ? "The main SMS account has UGX " + mainSmsCapacity.balance().stripTrailingZeros().toPlainString()
                                + ", which covers " + balance + " SMS message(s) at UGX "
                                + mainSmsCapacity.unitPrice().stripTrailingZeros().toPlainString() + " each."
                        : "The SACCO has " + balance + " SMS credit(s).";
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(ApiErrorResponse.of(409, "INSUFFICIENT_SMS_BALANCE",
                                balanceMessage + " " + requiredCredits
                                        + " SMS credit(s) are required. Choose email or add SMS funds."));
            }
            String smsReference = "PWD-RESET-" + UUID.randomUUID();
            if (requiredCredits > 0 && !useMainSmsAccount) {
                smsWalletService.debit(user.getTenantId(), requiredCredits, smsReference,
                        "SACCO staff password reset SMS");
            }
            try {
                String organizationName = tenantService.findById(user.getTenantId())
                        .map(TenantResponse::name).orElse("Your SACCO");
                onboardingNotificationService.sendPasswordResetCode(
                        channel, recipient, user.getFullName(), organizationName, resetToken);
            } catch (OnboardingNotificationService.OnboardingDeliveryException exception) {
                if (requiredCredits > 0 && !useMainSmsAccount) {
                    smsWalletService.refund(user.getTenantId(), requiredCredits, smsReference,
                            "Refund for failed password reset SMS");
                }
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(ApiErrorResponse.of(502, "RESET_DELIVERY_FAILED", exception.getMessage()));
            }
            PasswordResetRequest resetRequest = passwordResetRequestRepository.save(new PasswordResetRequest(
                    "reset_" + UUID.randomUUID(),
                    user.getTenantId(),
                    user.getId(),
                    tokenGenerator.hashToken(resetToken),
                    expiresAt));
            user.requirePasswordReset();
            userRepository.save(user);
            auditService.record(
                    user.getTenantId(),
                    user,
                    "Requested password reset",
                    "password_reset",
                    resetRequest.getId(),
                    request.getRemoteAddr());
        }

        String responseToken = demoCredentialPolicy.demoLoginsEnabled() ? resetToken : null;
        return ResponseEntity.ok(ApiResponse.of(new PasswordResetRequestResponse(
                true, responseToken, responseToken == null ? null : expiresAt, channel, destination)));
    }

    private java.util.Optional<User> findPasswordResetUser(Tenant tenant, String identifier) {
        if (tenant != null) return findLoginUser(tenant, identifier);
        if (identifier.contains("@")) return userRepository.findByEmailIgnoreCase(identifier);
        return java.util.Optional.empty();
    }

    @PostMapping("/password-reset/confirm")
    ResponseEntity<?> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest body, HttpServletRequest request) {
        List<String> violations = platformSecurityPolicyService.passwordViolations(body.newPassword());
        if (!violations.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "WEAK_PASSWORD", platformSecurityPolicyService.passwordPolicyMessage(violations)));
        }

        PasswordResetRequest resetRequest = passwordResetRequestRepository
                .findByTokenHashAndStatusAndExpiresAtAfter(
                        tokenGenerator.hashToken(tokenGenerator.normalizePasswordResetCode(body.token())),
                        "pending",
                        Instant.now())
                .orElse(null);
        if (resetRequest == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "INVALID_RESET_TOKEN", "Password reset token is invalid or expired."));
        }

        User user = userRepository.findById(resetRequest.getUserId()).orElse(null);
        if (user == null || !"active".equals(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "INVALID_RESET_TOKEN", "Password reset token is invalid or expired."));
        }

        PasswordHasher.PasswordHash passwordHash = passwordHasher.hash(body.newPassword());
        user.changePassword(passwordHash.hash(), passwordHash.salt());
        userRepository.save(user);
        resetRequest.markUsed();
        passwordResetRequestRepository.save(resetRequest);
        authSessionRepository.findByUserIdAndRevokedAtIsNull(user.getId()).forEach(session -> {
            session.revoke();
            authSessionRepository.save(session);
        });
        auditService.record(
                user.getTenantId(),
                user,
                "Confirmed password reset",
                "password_reset",
                resetRequest.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(new PasswordResetConfirmResponse(true)));
    }

    record LoginRequest(String saccoCode, String username, @Email String email, @NotBlank String password) {
    }

    record LoginResponse(String token, String tokenType, UserResponse user, List<String> roleIds, List<String> roleNames, List<String> permissionIds, Instant expiresAt) {
    }

    record FirstLoginRequiredResponse(boolean passwordChangeRequired, String verificationChannel) {
    }

    record FirstLoginPasswordRequest(
            @NotBlank String saccoCode,
            @NotBlank String username,
            @NotBlank String temporaryPassword,
            @NotBlank String newPassword) {
    }

    record MfaRequiredResponse(boolean mfaRequired, String challengeId, String deliveryChannel, String demoCode, Instant expiresAt) {
    }

    record MfaEnableResponse(boolean mfaEnabled) {
    }

    record MfaVerifyRequest(@NotBlank String challengeId, @NotBlank String code) {
    }

    record CurrentUserResponse(UserResponse user, TenantResponse tenant, List<String> roleIds, List<String> roleNames, List<String> permissionIds, Instant expiresAt) {
    }

    record UpdateOwnContactRequest(@NotBlank @Email String email, @NotBlank String phone) {
    }

    record UserAccessResponse(List<String> roleIds, List<String> roleNames, List<String> permissionIds) {
    }

    record SecuritySummaryResponse(
            boolean mfaEnabled,
            Instant currentSessionExpiresAt,
            long activeSessionCount,
            List<SessionSummaryResponse> activeSessions,
            int passwordResetRequestCount,
            List<PasswordResetSummaryResponse> recentPasswordResets) {
    }

    record SessionSummaryResponse(String id, Instant expiresAt, Instant createdAt) {
        static SessionSummaryResponse from(AuthSession session) {
            return new SessionSummaryResponse(session.getId(), session.getExpiresAt(), session.getCreatedAt());
        }
    }

    record PasswordResetSummaryResponse(String id, String status, Instant expiresAt, Instant usedAt, Instant createdAt) {
        static PasswordResetSummaryResponse from(PasswordResetRequest request) {
            return new PasswordResetSummaryResponse(
                    request.getId(),
                    request.getStatus(),
                    request.getExpiresAt(),
                    request.getUsedAt(),
                    request.getCreatedAt());
        }
    }

    record LogoutResponse(boolean loggedOut) {
    }

    record SessionExtensionResponse(Instant expiresAt) {
    }

    record PasswordResetRequestBody(String saccoCode, String identifier, @Email String email, String channel) {
    }

    record PasswordResetRequestResponse(
            boolean accepted,
            String resetToken,
            Instant expiresAt,
            String channel,
            String destination) {
    }

    record PasswordResetConfirmRequest(@NotBlank String token, @NotBlank String newPassword) {
    }

    record PasswordResetConfirmResponse(boolean reset) {
    }

}
