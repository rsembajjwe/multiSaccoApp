package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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

    @GetMapping("/permissions")
    ResponseEntity<?> listPermissions(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "roles:view")) {
            return authService.permissionRequired("roles:view");
        }

        return ResponseEntity.ok(ApiResponse.of(permissionRepository.findAllByOrderByModuleAscActionAsc().stream()
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

    record CreateRoleRequest(String tenantId, @NotBlank String name, List<String> permissionIds) {
    }
}
