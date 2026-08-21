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
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    AuthService(
            UserRepository userRepository,
            AuthSessionRepository authSessionRepository,
            TokenGenerator tokenGenerator,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
        this.tokenGenerator = tokenGenerator;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
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

    /** Looks up a staff user by id, e.g. to validate a member↔staff link. */
    public java.util.Optional<User> findUser(String userId) {
        if (userId == null || userId.isBlank()) return java.util.Optional.empty();
        return userRepository.findById(userId);
    }

    /** Staff users for a tenant, e.g. to populate a member↔staff link picker. */
    public java.util.List<User> tenantStaff(String tenantId) {
        return userRepository.findByTenantIdOrderByFullNameAsc(tenantId);
    }

    public boolean hasPermission(User user, String permissionId) {
        if (user == null || permissionId == null || permissionId.isBlank()) return false;
        var roleIds = userRoleRepository.findByIdUserIdAndTenantId(user.getId(), user.getTenantId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .toList();
        if (roleIds.isEmpty()) return false;
        return rolePermissionRepository.findByIdRoleIdIn(roleIds).stream()
                .anyMatch(rolePermission -> permissionId.equals(rolePermission.getId().getPermissionId()));
    }

    public ResponseEntity<ApiErrorResponse> permissionRequired(String permissionId) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(
                        403,
                        "PERMISSION_REQUIRED",
                        "The authenticated user needs permission " + permissionId + "."));
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.toLowerCase().startsWith("bearer ")) return null;
        String token = authorization.substring(7).trim();
        return token.isBlank() ? null : token;
    }

    public record CurrentSession(AuthSession session, User user) {
    }
}
