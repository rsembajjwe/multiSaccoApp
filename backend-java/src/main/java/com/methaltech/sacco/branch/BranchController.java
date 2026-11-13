package com.methaltech.sacco.branch;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/branches")
class BranchController {

    private static final Set<String> ALLOWED_STATUSES = Set.of("active", "inactive");

    private final BranchRepository branchRepository;
    private final AuthService authService;
    private final AuditService auditService;

    BranchController(BranchRepository branchRepository, AuthService authService, AuditService auditService) {
        this.branchRepository = branchRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listBranches(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        if (!(authService.isPlatform(currentSession.user())
                || authService.hasPermission(currentSession.user(), "branches:view")
                || authService.hasPermission(currentSession.user(), "members:view")
                || authService.hasPermission(currentSession.user(), "sacco-profile:manage")
                || authService.hasPermission(currentSession.user(), "transactions:view")
                || authService.hasPermission(currentSession.user(), "loans:view"))) {
            return authService.permissionRequired("members:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<Branch> branches = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? branchRepository.findAllByOrderByTenantIdAscCodeAsc()
                : branchRepository.findByTenantIdOrderByCodeAsc(tenantId);

        return ResponseEntity.ok(ApiResponse.of(branches.stream().map(BranchResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createBranch(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateBranchRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        if (!(authService.isPlatform(currentSession.user())
                || authService.hasPermission(currentSession.user(), "sacco-profile:manage"))) {
            return authService.permissionRequired("sacco-profile:manage");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String code = body.code().trim().toUpperCase();
        if (branchRepository.existsByTenantIdAndCodeIgnoreCase(tenantId, code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "BRANCH_EXISTS", "A branch with that code already exists in this tenant."));
        }

        String status = body.status() == null || !ALLOWED_STATUSES.contains(body.status()) ? "active" : body.status();
        Branch branch = branchRepository.save(new Branch(
                "branch_" + UUID.randomUUID(),
                tenantId,
                code,
                body.name().trim(),
                blankToDefault(body.address()),
                blankToNull(body.managerUserId()),
                status));

        auditService.record(
                tenantId,
                currentSession.user(),
                "Created branch " + branch.getCode(),
                "branch",
                branch.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(BranchResponse.from(branch)));
    }

    @PatchMapping("/{branchId}")
    ResponseEntity<?> updateBranch(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String branchId,
            @Valid @RequestBody UpdateBranchRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!(authService.isPlatform(currentSession.user())
                || authService.hasPermission(currentSession.user(), "sacco-profile:manage"))) {
            return authService.permissionRequired("sacco-profile:manage");
        }

        Branch branch = branchRepository.findById(branchId).orElse(null);
        if (branch == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "BRANCH_NOT_FOUND", "Branch not found."));
        }
        if (!authService.isPlatform(currentSession.user())
                && !branch.getTenantId().equals(currentSession.user().getTenantId())) {
            return tenantAccessDenied();
        }

        String code = body.code().trim().toUpperCase();
        if (branchRepository.existsByTenantIdAndCodeIgnoreCaseAndIdNot(branch.getTenantId(), code, branch.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "BRANCH_EXISTS", "A branch with that code already exists in this tenant."));
        }
        String status = body.status() == null ? branch.getStatus() : body.status().trim().toLowerCase();
        if (!ALLOWED_STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_BRANCH_STATUS", "Branch status must be active or inactive."));
        }

        branch.update(
                code,
                body.name().trim(),
                blankToDefault(body.address()),
                blankToNull(body.managerUserId()),
                status);
        branchRepository.save(branch);
        auditService.record(
                branch.getTenantId(),
                currentSession.user(),
                "Updated branch " + branch.getCode(),
                "branch",
                branch.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(BranchResponse.from(branch)));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) {
            return null;
        }
        return tenantId;
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access branches for another tenant."));
    }

    private String blankToDefault(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    record CreateBranchRequest(
            String tenantId,
            @NotBlank String code,
            @NotBlank String name,
            String address,
            String managerUserId,
            String status) {
    }

    record UpdateBranchRequest(
            @NotBlank String code,
            @NotBlank String name,
            String address,
            String managerUserId,
            String status) {
    }
}
