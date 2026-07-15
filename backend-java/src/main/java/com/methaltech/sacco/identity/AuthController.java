package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.security.PasswordHasher;
import com.methaltech.sacco.security.TokenGenerator;
import com.methaltech.sacco.tenant.TenantResponse;
import com.methaltech.sacco.tenant.TenantService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
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

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordHasher passwordHasher;
    private final TokenGenerator tokenGenerator;
    private final TenantService tenantService;

    AuthController(
            UserRepository userRepository,
            AuthSessionRepository authSessionRepository,
            PasswordHasher passwordHasher,
            TokenGenerator tokenGenerator,
            TenantService tenantService) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
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

        String token = tokenGenerator.createToken();
        authSessionRepository.save(new AuthSession(
                "session_" + UUID.randomUUID(),
                user.getId(),
                user.getTenantId(),
                tokenGenerator.hashToken(token),
                Instant.now().plus(Duration.ofHours(8))));

        return ResponseEntity.ok(ApiResponse.of(new LoginResponse(
                token,
                "Bearer",
                UserResponse.from(user))));
    }

    @GetMapping("/me")
    ResponseEntity<?> me(@RequestHeader(name = "Authorization", required = false) String authorization) {
        CurrentSession currentSession = currentSession(authorization);
        if (currentSession == null) return authRequired();

        TenantResponse tenant = tenantService.findById(currentSession.user().getTenantId()).orElse(null);
        return ResponseEntity.ok(ApiResponse.of(new CurrentUserResponse(
                UserResponse.from(currentSession.user()),
                tenant)));
    }

    @PostMapping("/logout")
    ResponseEntity<?> logout(@RequestHeader(name = "Authorization", required = false) String authorization) {
        CurrentSession currentSession = currentSession(authorization);
        if (currentSession == null) return authRequired();

        currentSession.session().revoke();
        authSessionRepository.save(currentSession.session());
        return ResponseEntity.ok(ApiResponse.of(new LogoutResponse(true)));
    }

    private CurrentSession currentSession(String authorization) {
        String token = bearerToken(authorization);
        if (token == null) return null;
        return authSessionRepository
                .findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(tokenGenerator.hashToken(token), Instant.now())
                .flatMap(session -> userRepository.findById(session.getUserId())
                        .filter(user -> "active".equals(user.getStatus()))
                        .map(user -> new CurrentSession(session, user)))
                .orElse(null);
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.toLowerCase().startsWith("bearer ")) return null;
        String token = authorization.substring(7).trim();
        return token.isBlank() ? null : token;
    }

    private ResponseEntity<ApiErrorResponse> authRequired() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "A valid bearer token is required."));
    }

    record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
    }

    record LoginResponse(String token, String tokenType, UserResponse user) {
    }

    record CurrentUserResponse(UserResponse user, TenantResponse tenant) {
    }

    record LogoutResponse(boolean loggedOut) {
    }

    record CurrentSession(AuthSession session, User user) {
    }
}
