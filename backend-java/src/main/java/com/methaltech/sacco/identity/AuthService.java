package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.security.TokenGenerator;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final TokenGenerator tokenGenerator;

    AuthService(UserRepository userRepository, AuthSessionRepository authSessionRepository, TokenGenerator tokenGenerator) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
        this.tokenGenerator = tokenGenerator;
    }

    public CurrentSession currentSession(String authorization) {
        String token = bearerToken(authorization);
        if (token == null) return null;
        return authSessionRepository
                .findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(tokenGenerator.hashToken(token), Instant.now())
                .flatMap(session -> userRepository.findById(session.getUserId())
                        .filter(user -> "active".equals(user.getStatus()))
                        .map(user -> new CurrentSession(session, user)))
                .orElse(null);
    }

    public ResponseEntity<ApiErrorResponse> authRequired() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "A valid bearer token is required."));
    }

    public boolean isPlatform(User user) {
        return "tenant_platform".equals(user.getTenantId());
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.toLowerCase().startsWith("bearer ")) return null;
        String token = authorization.substring(7).trim();
        return token.isBlank() ? null : token;
    }

    public record CurrentSession(AuthSession session, User user) {
    }
}
