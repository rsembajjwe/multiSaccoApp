package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.security.PasswordHasher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
class UserController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final PasswordHasher passwordHasher;
    private final AuditService auditService;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    UserController(
            UserRepository userRepository,
            AuthService authService,
            PasswordHasher passwordHasher,
            AuditService auditService,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.passwordHasher = passwordHasher;
        this.auditService = auditService;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    @GetMapping
    ResponseEntity<?> listUsers(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:view")) {
            return authService.permissionRequired("users:view");
        }

        List<User> users = authService.isPlatform(currentSession.user())
                ? userRepository.findAllByOrderByFullNameAsc()
                : userRepository.findByTenantIdOrderByFullNameAsc(currentSession.user().getTenantId());

        return ResponseEntity.ok(ApiResponse.of(users.stream().map(UserResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createUser(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }

        String tenantId = request.tenantId() == null || request.tenantId().isBlank()
                ? currentSession.user().getTenantId()
                : request.tenantId().trim();

        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot create a user in another tenant."));
        }
        if (tenantId.equals("tenant_platform") && !hasRole(currentSession.user(), "Platform Super Admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_SUPER_ADMIN_REQUIRED", "Only the Platform Super Admin can create platform users."));
        }

        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByTenantIdAndEmailIgnoreCase(tenantId, email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "USER_EXISTS", "A user with that email already exists in this tenant."));
        }

        PasswordHasher.PasswordHash password = passwordHasher.hash(request.password());
        User user = new User(
                "user_" + UUID.randomUUID(),
                tenantId,
                request.fullName().trim(),
                email,
                request.phone() == null ? "" : request.phone().trim(),
                password.hash(),
                password.salt(),
                "active");

        User savedUser = userRepository.save(user);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Created user " + savedUser.getEmail(),
                "user",
                savedUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(UserResponse.from(savedUser)));
    }

    @GetMapping("/{userId}/roles")
    ResponseEntity<?> listUserRoles(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:view")) {
            return authService.permissionRequired("users:view");
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "USER_NOT_FOUND", "User was not found."));
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();
        if (targetUser.getTenantId().equals("tenant_platform") && !hasRole(currentSession.user(), "Platform Super Admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_SUPER_ADMIN_REQUIRED", "Only the Platform Super Admin can update platform user roles."));
        }

        return ResponseEntity.ok(ApiResponse.of(assignmentResponse(targetUser)));
    }

    @PutMapping("/{userId}/roles")
    @Transactional
    ResponseEntity<?> replaceUserRoles(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String userId,
            @Valid @RequestBody ReplaceUserRolesRequest request,
            HttpServletRequest httpRequest) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "users:create")) {
            return authService.permissionRequired("users:create");
        }

        User targetUser = userRepository.findById(userId).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "USER_NOT_FOUND", "User was not found."));
        }
        if (!canAccessUser(currentSession, targetUser)) return tenantAccessDenied();

        List<String> roleIds = sanitizedRoleIds(request.roleIds());
        if (roleIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "ROLE_REQUIRED", "Assign at least one role to the user."));
        }

        List<Role> roles = roleRepository.findAllById(roleIds);
        Set<String> knownRoleIds = roles.stream().map(Role::getId).collect(Collectors.toSet());
        List<String> unknownRoleIds = roleIds.stream()
                .filter(roleId -> !knownRoleIds.contains(roleId))
                .toList();
        if (!unknownRoleIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "UNKNOWN_ROLE", "One or more roles are unknown."));
        }
        boolean hasCrossTenantRole = roles.stream().anyMatch(role -> !role.getTenantId().equals(targetUser.getTenantId()));
        if (hasCrossTenantRole) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "ROLE_TENANT_MISMATCH", "Roles must belong to the same tenant as the user."));
        }

        userRoleRepository.deleteByIdUserId(targetUser.getId());
        userRoleRepository.saveAll(roleIds.stream()
                .map(roleId -> new UserRole(targetUser.getId(), roleId, targetUser.getTenantId()))
                .toList());
        auditService.record(
                targetUser.getTenantId(),
                currentSession.user(),
                "Updated roles for user " + targetUser.getEmail(),
                "user",
                targetUser.getId(),
                httpRequest.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(new UserRoleAssignmentResponse(targetUser.getId(), targetUser.getTenantId(), roleIds)));
    }

    private UserRoleAssignmentResponse assignmentResponse(User user) {
        List<String> roleIds = userRoleRepository.findByIdUserId(user.getId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .sorted()
                .toList();
        return new UserRoleAssignmentResponse(user.getId(), user.getTenantId(), roleIds);
    }

    private List<String> sanitizedRoleIds(List<String> roleIds) {
        if (roleIds == null) return List.of();
        List<String> sanitized = new ArrayList<>();
        for (String roleId : roleIds) {
            if (roleId != null && !roleId.isBlank()) {
                String value = roleId.trim();
                if (!sanitized.contains(value)) sanitized.add(value);
            }
        }
        return sanitized;
    }

    private boolean canAccessUser(AuthService.CurrentSession currentSession, User targetUser) {
        return authService.isPlatform(currentSession.user()) || targetUser.getTenantId().equals(currentSession.user().getTenantId());
    }

    private boolean hasRole(User user, String roleName) {
        List<String> roleIds = userRoleRepository.findByIdUserId(user.getId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .toList();
        if (roleIds.isEmpty()) return false;
        return roleRepository.findAllById(roleIds).stream()
                .anyMatch(role -> role.getName().equalsIgnoreCase(roleName));
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access users for another tenant."));
    }

    record CreateUserRequest(
            String tenantId,
            @NotBlank String fullName,
            @Email @NotBlank String email,
            String phone,
            @NotBlank String password) {
    }

    record ReplaceUserRolesRequest(List<String> roleIds) {
    }

    record UserRoleAssignmentResponse(String userId, String tenantId, List<String> roleIds) {
    }
}
