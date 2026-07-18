package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants")
class TenantController {

    private static final Set<String> ALLOWED_STATUSES = Set.of("pending_review", "approved", "active", "suspended", "terminated");

    private final TenantRepository tenantRepository;
    private final SaccoProfileRepository saccoProfileRepository;
    private final AuthService authService;
    private final AuditService auditService;

    TenantController(
            TenantRepository tenantRepository,
            SaccoProfileRepository saccoProfileRepository,
            AuthService authService,
            AuditService auditService) {
        this.tenantRepository = tenantRepository;
        this.saccoProfileRepository = saccoProfileRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listTenants(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }

        List<Tenant> tenants = authService.isPlatform(currentSession.user())
                ? tenantRepository.findAllByOrderByNameAsc()
                : tenantRepository.findById(currentSession.user().getTenantId()).stream().toList();

        return ResponseEntity.ok(ApiResponse.of(tenants.stream()
                .map(TenantResponse::from)
                .toList()));
    }

    @GetMapping("/{tenantId}")
    ResponseEntity<?> getTenant(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot view another tenant.");

        return tenantRepository.findById(tenantId)
                .<ResponseEntity<?>>map(tenant -> ResponseEntity.ok(ApiResponse.of(TenantResponse.from(tenant))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found.")));
    }

    @PostMapping
    ResponseEntity<?> createTenant(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateTenantRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!authService.isPlatform(currentSession.user())) return platformRequired("Only platform administrators can create tenants here.");

        Tenant tenant = tenantRepository.save(new Tenant(
                "tenant_" + UUID.randomUUID(),
                body.name().trim(),
                body.abbreviation().trim().toUpperCase(),
                blankToDefault(body.registrationNo()),
                blankToDefault(body.district()),
                body.licenseExpiry(),
                blankToDefault(body.packageId())));
        saccoProfileRepository.save(new SaccoProfile(
                "profile_" + UUID.randomUUID(),
                tenant.getId(),
                tenant.getName(),
                "",
                "",
                tenant.getRegistrationNo(),
                "",
                "",
                "",
                ""));

        auditService.record(
                tenant.getId(),
                currentSession.user(),
                "Created tenant " + tenant.getName(),
                "tenant",
                tenant.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(TenantResponse.from(tenant)));
    }

    @PatchMapping("/{tenantId}/status")
    ResponseEntity<?> updateTenantStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateTenantStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!authService.isPlatform(currentSession.user())) return platformRequired("Only platform administrators can update tenant status.");
        if (!ALLOWED_STATUSES.contains(body.status())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiErrorResponse.of(400, "INVALID_TENANT_STATUS", "Unsupported tenant status."));
        }

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        tenant.updateStatus(body.status());
        Tenant savedTenant = tenantRepository.save(tenant);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Updated tenant status to " + body.status(),
                "tenant",
                tenantId,
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(TenantResponse.from(savedTenant)));
    }

    @GetMapping("/{tenantId}/profile")
    ResponseEntity<?> getSaccoProfile(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:view")) {
            return authService.permissionRequired("tenants:view");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot view another tenant profile.");
        if (!tenantRepository.existsById(tenantId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        return saccoProfileRepository.findByTenantId(tenantId)
                .<ResponseEntity<?>>map(profile -> ResponseEntity.ok(ApiResponse.of(SaccoProfileResponse.from(profile))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "SACCO_PROFILE_NOT_FOUND", "SACCO profile not found.")));
    }

    @PatchMapping("/{tenantId}/profile")
    ResponseEntity<?> updateSaccoProfile(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String tenantId,
            @Valid @RequestBody UpdateSaccoProfileRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return authService.permissionRequired("tenants:manage");
        }
        if (!canAccessTenant(currentSession, tenantId)) return tenantAccessDenied("Cannot update another tenant profile.");

        Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
        if (tenant == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TENANT_NOT_FOUND", "Tenant not found."));
        }

        SaccoProfile profile = saccoProfileRepository.findByTenantId(tenantId)
                .orElseGet(() -> new SaccoProfile(
                        "profile_" + UUID.randomUUID(),
                        tenantId,
                        tenant.getName(),
                        "",
                        "",
                        tenant.getRegistrationNo(),
                        "",
                        "",
                        "",
                        ""));
        profile.update(
                firstNonBlank(body.legalName(), profile.getLegalName()),
                updateOptional(body.tin(), profile.getTin()),
                updateOptional(body.umraLicenseNo(), profile.getUmraLicenseNo()),
                firstNonBlank(body.cooperativeRegistrationNo(), profile.getCooperativeRegistrationNo()),
                updateOptional(body.address(), profile.getAddress()),
                updateOptional(body.email(), profile.getEmail()),
                updateOptional(body.phone(), profile.getPhone()),
                updateOptional(body.website(), profile.getWebsite()));
        SaccoProfile savedProfile = saccoProfileRepository.save(profile);
        auditService.record(
                tenantId,
                currentSession.user(),
                "Updated SACCO profile " + savedProfile.getLegalName(),
                "sacco_profile",
                savedProfile.getId(),
                request.getRemoteAddr());

        return ResponseEntity.ok(ApiResponse.of(SaccoProfileResponse.from(savedProfile)));
    }

    private boolean canAccessTenant(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private ResponseEntity<ApiErrorResponse> platformRequired(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PLATFORM_ADMIN_REQUIRED", message));
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", message));
    }

    private String blankToDefault(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private String firstNonBlank(String requestedValue, String currentValue) {
        return requestedValue == null || requestedValue.isBlank() ? currentValue : requestedValue.trim();
    }

    private String updateOptional(String requestedValue, String currentValue) {
        return requestedValue == null ? currentValue : requestedValue.trim();
    }

    record CreateTenantRequest(
            @NotBlank String name,
            @NotBlank String abbreviation,
            String registrationNo,
            String district,
            @NotNull LocalDate licenseExpiry,
            String packageId) {
    }

    record UpdateTenantStatusRequest(@NotBlank String status) {
    }

    record UpdateSaccoProfileRequest(
            String legalName,
            String tin,
            String umraLicenseNo,
            String cooperativeRegistrationNo,
            String address,
            @Email String email,
            String phone,
            String website) {
    }
}
