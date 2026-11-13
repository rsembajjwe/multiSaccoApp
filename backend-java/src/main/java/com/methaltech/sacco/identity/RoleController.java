package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
class RoleController {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final UserRoleRepository userRoleRepository;

    @GetMapping("/permissions")
    ResponseEntity<?> listPermissions(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "roles:view")) {
            return authService.permissionRequired("roles:view");
        }

        Set<String> assignablePermissionIds = authService.permissionIds(currentSession.user());
        return ResponseEntity.ok(ApiResponse.of(permissionRepository.findAllByOrderByModuleAscActionAsc().stream()
                .filter(permission -> authService.isPlatform(currentSession.user())
                        || assignablePermissionIds.contains(permission.getId()))
                .map(PermissionResponse::from)
                .toList()));
    }

    @GetMapping("/roles")
    ResponseEntity<?> listRoles(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "roles:view")) {
            return authService.permissionRequired("roles:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<Role> roles = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? roleRepository.findAllByOrderByTenantIdAscNameAsc()
                : roleRepository.findByTenantIdOrderByNameAsc(tenantId);
        return ResponseEntity.ok(ApiResponse.of(roleResponses(roles)));
    }

    @PostMapping("/roles")
    ResponseEntity<?> createRole(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateRoleRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "roles:create")) {
            return authService.permissionRequired("roles:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForRoleManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String name = body.name().trim();
        if (roleRepository.existsByTenantIdAndNameIgnoreCase(tenantId, name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ROLE_EXISTS", "A role with that name already exists in this tenant."));
        }

        List<String> permissionIds = sanitizedPermissionIds(body.permissionIds());
        if (!permissionIds.isEmpty()) {
            Set<String> knownPermissionIds = permissionRepository.findAllById(permissionIds).stream()
                    .map(Permission::getId)
                    .collect(Collectors.toSet());
            List<String> unknownPermissionIds = permissionIds.stream()
                    .filter(permissionId -> !knownPermissionIds.contains(permissionId))
                    .toList();
            if (!unknownPermissionIds.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "UNKNOWN_PERMISSION", "One or more permissions are unknown."));
            }
        }
        if (!authService.isPlatform(currentSession.user())) {
            Set<String> assignablePermissionIds = authService.permissionIds(currentSession.user());
            List<String> elevatedPermissionIds = permissionIds.stream()
                    .filter(permissionId -> !assignablePermissionIds.contains(permissionId))
                    .toList();
            if (!elevatedPermissionIds.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiErrorResponse.of(403, "ROLE_PRIVILEGE_ESCALATION",
                                "A SACCO administrator cannot assign permissions they do not hold."));
            }
        }

        Role role = roleRepository.save(new Role(
                "role_" + UUID.randomUUID(),
                tenantId,
                name,
                false,
                currentSession.user().getId()));
        if (!permissionIds.isEmpty()) {
            rolePermissionRepository.saveAll(permissionIds.stream()
                    .map(permissionId -> new RolePermission(role.getId(), permissionId))
                    .toList());
        }
        auditService.record(
                tenantId,
                currentSession.user(),
                "Created role " + role.getName(),
                "role",
                role.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(RoleResponse.from(role, permissionIds)));
    }

    @PatchMapping("/roles/{roleId}")
    @Transactional
    ResponseEntity<?> updateRole(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String roleId,
            @Valid @RequestBody UpdateRoleRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "roles:create")) {
            return authService.permissionRequired("roles:create");
        }
        ResponseEntity<ApiErrorResponse> saccoAdminRequired = requireSaccoAdministratorForRoleManagement(currentSession);
        if (saccoAdminRequired != null) return saccoAdminRequired;

        Role role = roleRepository.findById(roleId).orElse(null);
        if (role == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "ROLE_NOT_FOUND", "Role not found."));
        }
        if (!authService.isPlatform(currentSession.user())
                && !role.getTenantId().equals(currentSession.user().getTenantId())) {
            return tenantAccessDenied();
        }
        if (role.isProtectedRole()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PROTECTED_ROLE", "Protected roles cannot be edited."));
        }

        String name = body.name().trim();
        Role duplicate = roleRepository.findByTenantIdAndNameIgnoreCase(role.getTenantId(), name).orElse(null);
        if (duplicate != null && !duplicate.getId().equals(role.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "ROLE_EXISTS", "A role with that name already exists in this tenant."));
        }

        List<String> permissionIds = sanitizedPermissionIds(body.permissionIds());
        ResponseEntity<ApiErrorResponse> permissionError = validateAssignablePermissions(currentSession, permissionIds);
        if (permissionError != null) return permissionError;

        role.rename(name);
        roleRepository.save(role);
        rolePermissionRepository.deleteAll(rolePermissionRepository.findByIdRoleId(role.getId()));
        if (!permissionIds.isEmpty()) {
            rolePermissionRepository.saveAll(permissionIds.stream()
                    .map(permissionId -> new RolePermission(role.getId(), permissionId))
                    .toList());
        }
        auditService.record(
                role.getTenantId(),
                currentSession.user(),
                "Updated role " + role.getName(),
                "role",
                role.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(RoleResponse.from(role, permissionIds)));
    }

    private ResponseEntity<ApiErrorResponse> validateAssignablePermissions(
            AuthService.CurrentSession currentSession, List<String> permissionIds) {
        if (!authService.isPlatform(currentSession.user())) {
            Set<String> assignablePermissionIds = authService.permissionIds(currentSession.user());
            if (permissionIds.stream().anyMatch(permissionId -> !assignablePermissionIds.contains(permissionId))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiErrorResponse.of(403, "ROLE_PRIVILEGE_ESCALATION",
                                "A SACCO administrator cannot assign permissions they do not hold."));
            }
        }
        Set<String> knownPermissionIds = permissionRepository.findAllById(permissionIds).stream()
                .map(Permission::getId)
                .collect(Collectors.toSet());
        if (permissionIds.stream().anyMatch(permissionId -> !knownPermissionIds.contains(permissionId))) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "UNKNOWN_PERMISSION", "One or more permissions are unknown."));
        }
        return null;
    }

    private List<RoleResponse> roleResponses(List<Role> roles) {
        List<String> roleIds = roles.stream().map(Role::getId).toList();
        Map<String, List<String>> permissionIdsByRole = rolePermissionRepository.findByIdRoleIdIn(roleIds).stream()
                .collect(Collectors.groupingBy(
                        rolePermission -> rolePermission.getId().getRoleId(),
                        Collectors.mapping(rolePermission -> rolePermission.getId().getPermissionId(), Collectors.toList())));
        return roles.stream()
                .map(role -> RoleResponse.from(role, permissionIdsByRole.getOrDefault(role.getId(), List.of())))
                .toList();
    }

    private List<String> sanitizedPermissionIds(List<String> permissionIds) {
        if (permissionIds == null) return List.of();
        List<String> sanitized = new ArrayList<>();
        for (String permissionId : permissionIds) {
            if (permissionId != null && !permissionId.isBlank()) {
                String value = permissionId.trim();
                if (!sanitized.contains(value)) sanitized.add(value);
            }
        }
        return sanitized;
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            return null;
        }
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) return null;
        return tenantId;
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access roles for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> requireSaccoAdministratorForRoleManagement(AuthService.CurrentSession currentSession) {
        // The Chairperson is the SACCO administrator, so the Chairperson role (and the merged
        // "SACCO Administrator / Chairperson" name) can manage roles alongside a legacy SACCO Administrator.
        if (authService.isPlatform(currentSession.user())
                || hasRole(currentSession.user(), "SACCO Administrator")
                || hasRole(currentSession.user(), "Chairperson")
                || hasRole(currentSession.user(), "SACCO Administrator / Chairperson")) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "SACCO_ADMIN_REQUIRED", "Only the SACCO Administrator (Chairperson) can manage SACCO roles."));
    }

    private boolean hasRole(User user, String roleName) {
        List<String> roleIds = userRoleRepository.findByIdUserId(user.getId()).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .toList();
        if (roleIds.isEmpty()) return false;
        return roleRepository.findAllById(roleIds).stream()
                .anyMatch(role -> role.getName().equalsIgnoreCase(roleName));
    }

    record CreateRoleRequest(String tenantId, @NotBlank String name, List<String> permissionIds) {
    }

    record UpdateRoleRequest(@NotBlank String name, List<String> permissionIds) {
    }
}
