package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {

    private final SecureRandom secureRandom = new SecureRandom();
    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final MfaChallengeRepository mfaChallengeRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;
    private final TenantService tenantService;

    AuthController(
            UserRepository userRepository,
            AuthSessionRepository authSessionRepository,
            PasswordResetRequestRepository passwordResetRequestRepository,
            MfaChallengeRepository mfaChallengeRepository,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository,
            AuthService authService,
            AuditService auditService,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator,
            TenantService tenantService) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordResetRequestRepository = passwordResetRequestRepository;
        this.mfaChallengeRepository = mfaChallengeRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.authService = authService;
        this.auditService = auditService;
        this.passwordHasher = passwordHasher;
        this.tokenGenerator = tokenGenerator;
        this.tenantService = tenantService;
    }

    @PostMapping("/login")
    ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .filter(candidate -> passwordHasher.matches(request.password(), candidate.getPasswordSalt(), candidate.getPasswordHash()))
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "AUTH_INVALID", "Invalid email or password."));
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
                    .body(ApiResponse.of(new MfaRequiredResponse(true, challenge.getId(), "demo_app", code, challenge.getExpiresAt())));
        }

        return ResponseEntity.ok(ApiResponse.of(loginResponseFor(user)));
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

    @PostMapping("/mfa/verify")
    ResponseEntity<?> verifyMfa(@Valid @RequestBody MfaVerifyRequest body, HttpServletRequest request) {
        MfaChallenge challenge = mfaChallengeRepository
                .findByIdAndStatusAndExpiresAtAfter(body.challengeId().trim(), "pending", Instant.now())
                .orElse(null);
        if (challenge == null || !challenge.getCodeHash().equals(tokenGenerator.hashToken(body.code().trim()))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of(401, "MFA_INVALID", "MFA challenge or code is invalid."));
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
        return ResponseEntity.ok(ApiResponse.of(loginResponseFor(user)));
    }

    private LoginResponse loginResponseFor(User user) {
        String token = tokenGenerator.createToken();
        authSessionRepository.save(new AuthSession(
                "session_" + UUID.randomUUID(),
                user.getId(),
                user.getTenantId(),
                tokenGenerator.hashToken(token),
                Instant.now().plus(Duration.ofHours(8))));

        return new LoginResponse(
                token,
                "Bearer",
                UserResponse.from(user));
    }

    private boolean isPrivileged(User user) {
        if (authService.isPlatform(user)) return true;
        List<String> roleIds = userRoleRepository.findByIdUserId(user.getId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .toList();
        if (roleIds.isEmpty()) return false;
        return roleRepository.findAllById(roleIds).stream()
                .anyMatch(role -> role.isProtectedRole() && role.getName().toLowerCase().contains("administrator"));
    }

    private String mfaCode() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    @GetMapping("/me")
    ResponseEntity<?> me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        TenantResponse tenant = tenantService.findById(currentSession.user().getTenantId()).orElse(null);
        return ResponseEntity.ok(ApiResponse.of(new CurrentUserResponse(
                UserResponse.from(currentSession.user()),
                tenant)));
    }

    @PostMapping("/logout")
    ResponseEntity<?> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        currentSession.session().revoke();
        authSessionRepository.save(currentSession.session());
        return ResponseEntity.ok(ApiResponse.of(new LogoutResponse(true)));
    }

    @PostMapping("/password-reset/request")
    ResponseEntity<?> requestPasswordReset(@Valid @RequestBody PasswordResetRequestBody body, HttpServletRequest request) {
        User user = userRepository.findByEmailIgnoreCase(body.email().trim())
                .filter(candidate -> "active".equals(candidate.getStatus()))
                .orElse(null);
        String resetToken = null;
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(30));

        if (user != null) {
            resetToken = tokenGenerator.createToken();
            PasswordResetRequest resetRequest = passwordResetRequestRepository.save(new PasswordResetRequest(
                    "reset_" + UUID.randomUUID(),
                    user.getTenantId(),
                    user.getId(),
                    tokenGenerator.hashToken(resetToken),
                    expiresAt));
            auditService.record(
                    user.getTenantId(),
                    user,
                    "Requested password reset",
                    "password_reset",
                    resetRequest.getId(),
                    request.getRemoteAddr());
        }

        return ResponseEntity.ok(ApiResponse.of(new PasswordResetRequestResponse(true, resetToken, resetToken == null ? null : expiresAt)));
    }

    @PostMapping("/password-reset/confirm")
    ResponseEntity<?> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest body, HttpServletRequest request) {
        if (body.newPassword().length() < 10) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "WEAK_PASSWORD", "New password must be at least 10 characters."));
        }

        PasswordResetRequest resetRequest = passwordResetRequestRepository
                .findByTokenHashAndStatusAndExpiresAtAfter(tokenGenerator.hashToken(body.token().trim()), "pending", Instant.now())
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

    record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    record LoginResponse(String token, String tokenType, UserResponse user) {
    }

    record MfaRequiredResponse(boolean mfaRequired, String challengeId, String deliveryChannel, String demoCode, Instant expiresAt) {
    }

    record MfaEnableResponse(boolean mfaEnabled) {
    }

    record MfaVerifyRequest(@NotBlank String challengeId, @NotBlank String code) {
    }

    record CurrentUserResponse(UserResponse user, TenantResponse tenant) {
    }

    record LogoutResponse(boolean loggedOut) {
    }

    record PasswordResetRequestBody(@Email @NotBlank String email) {
    }

    record PasswordResetRequestResponse(boolean accepted, String resetToken, Instant expiresAt) {
    }

    record PasswordResetConfirmRequest(@NotBlank String token, @NotBlank String newPassword) {
    }

    record PasswordResetConfirmResponse(boolean reset) {
    }

}
