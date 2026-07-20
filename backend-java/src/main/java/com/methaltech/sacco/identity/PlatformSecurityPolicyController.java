package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/platform-security-policy")
class PlatformSecurityPolicyController {

    private final PlatformSecurityPolicyRepository repository;
    private final PlatformSecurityPolicyService policyService;
    private final AuthService authService;
    private final AuditService auditService;

    PlatformSecurityPolicyController(
            PlatformSecurityPolicyRepository repository,
            PlatformSecurityPolicyService policyService,
            AuthService authService,
            AuditService auditService) {
        this.repository = repository;
        this.policyService = policyService;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> current(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())) {
            return platformOnly();
        }
        if (!authService.hasPermission(currentSession.user(), "roles:view")) {
            return authService.permissionRequired("roles:view");
        }
        return ResponseEntity.ok(ApiResponse.of(PlatformSecurityPolicyResponse.from(policyService.currentPolicy())));
    }

    @PutMapping
    ResponseEntity<?> update(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody UpdatePlatformSecurityPolicyRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.isPlatform(currentSession.user())) {
            return platformOnly();
        }
        if (!authService.hasPermission(currentSession.user(), "roles:create")) {
            return authService.permissionRequired("roles:create");
        }

        PlatformSecurityPolicy policy = policyService.currentPolicy();
        policy.update(
                body.minimumPasswordLength(),
                body.requireUppercase(),
                body.requireLowercase(),
                body.requireNumber(),
                body.requireSymbol(),
                body.passwordExpiryDays(),
                body.lockoutFailedAttempts(),
                body.lockoutMinutes());
        PlatformSecurityPolicy saved = repository.save(policy);
        auditService.record(
                currentSession.user().getTenantId(),
                currentSession.user(),
                "Updated platform security policy",
                "platform_security_policy",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(PlatformSecurityPolicyResponse.from(saved)));
    }

    private ResponseEntity<ApiErrorResponse> platformOnly() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PLATFORM_ONLY", "Only platform administrators can access platform security policy."));
    }

    record UpdatePlatformSecurityPolicyRequest(
            @Min(8) @Max(64) int minimumPasswordLength,
            boolean requireUppercase,
            boolean requireLowercase,
            boolean requireNumber,
            boolean requireSymbol,
            @Min(0) @Max(365) int passwordExpiryDays,
            @Min(3) @Max(20) int lockoutFailedAttempts,
            @Min(1) @Max(1440) int lockoutMinutes) {
    }
}
