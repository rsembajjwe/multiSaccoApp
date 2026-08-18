package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
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

/**
 * SACCO-configurable fund sources. The SACCO Administrator adds/edits contribution funds
 * ({@code fund-types:manage}); finance/governance roles review them ({@code fund-types:view}). Savings,
 * Shares and Welfare are system funds and cannot be deleted or have their code/basis changed.
 */
@RestController
@RequestMapping("/api/v1/fund-types")
class FundTypeController {

    private static final Pattern CODE_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{1,39}$");

    private final FundTypeRepository fundTypeRepository;
    private final AuthService authService;
    private final AuditService auditService;

    FundTypeController(
            FundTypeRepository fundTypeRepository,
            AuthService authService,
            AuditService auditService) {
        this.fundTypeRepository = fundTypeRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listFundTypes(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "fund-types:view")) {
            return authService.permissionRequired("fund-types:view");
        }
        List<FundType> fundTypes;
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            fundTypes = fundTypeRepository.findAllByOrderByTenantIdAscDisplayOrderAscNameAsc();
        } else {
            String tenantId = tenantScope(currentSession, requestedTenantId);
            if (tenantId == null) return tenantAccessDenied();
            fundTypes = fundTypeRepository.findByTenantIdOrderByDisplayOrderAscNameAsc(tenantId);
        }
        return ResponseEntity.ok(ApiResponse.of(fundTypes.stream().map(FundTypeResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createFundType(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody FundTypeRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "fund-types:manage")) {
            return authService.permissionRequired("fund-types:manage");
        }
        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String code = body.code() == null ? "" : body.code().trim().toLowerCase();
        if (!CODE_PATTERN.matcher(code).matches()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FUND_CODE", "Fund code must be lowercase letters, digits or underscores, starting with a letter."));
        }
        String basis = body.basis() == null ? "" : body.basis().trim().toLowerCase();
        if (!FundType.BASES.contains(basis)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FUND_BASIS", "Fund basis must be savings, shares or welfare."));
        }
        if (fundTypeRepository.existsByTenantIdAndCodeIgnoreCase(tenantId, code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "FUND_TYPE_EXISTS", "A fund with that code already exists for this SACCO."));
        }

        FundType fundType = fundTypeRepository.save(new FundType(
                "fundtype_" + UUID.randomUUID(),
                tenantId,
                code,
                body.name().trim(),
                basis,
                trimOrNull(body.description()),
                false,
                body.active() == null || body.active(),
                body.displayOrder() == null ? 100 : body.displayOrder(),
                currentSession.user().getId()));
        auditService.record(tenantId, currentSession.user(),
                "Added fund type " + fundType.getName() + " (" + fundType.getCode() + ")",
                "fund_type", fundType.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FundTypeResponse.from(fundType)));
    }

    @PatchMapping("/{fundTypeId}")
    ResponseEntity<?> updateFundType(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String fundTypeId,
            @Valid @RequestBody FundTypeRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "fund-types:manage")) {
            return authService.permissionRequired("fund-types:manage");
        }
        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        FundType fundType = fundTypeRepository.findByIdAndTenantId(fundTypeId, tenantId).orElse(null);
        if (fundType == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "FUND_TYPE_NOT_FOUND", "Fund type not found for this SACCO."));
        }
        // System funds may not be deactivated (they underpin core Savings/Shares/Welfare behaviour).
        boolean active = body.active() == null || body.active();
        if (fundType.isSystem() && !active) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "SYSTEM_FUND_TYPE_LOCKED", "Built-in Savings, Shares and Welfare funds cannot be deactivated."));
        }
        String basis = fundType.isSystem()
                ? fundType.getBasis()
                : (body.basis() == null ? fundType.getBasis() : body.basis().trim().toLowerCase());
        if (!FundType.BASES.contains(basis)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FUND_BASIS", "Fund basis must be savings, shares or welfare."));
        }

        fundType.update(
                body.name().trim(),
                basis,
                trimOrNull(body.description()),
                active,
                body.displayOrder() == null ? fundType.getDisplayOrder() : body.displayOrder());
        FundType saved = fundTypeRepository.save(fundType);
        auditService.record(tenantId, currentSession.user(),
                "Updated fund type " + saved.getName() + " (" + saved.getCode() + ")",
                "fund_type", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(FundTypeResponse.from(saved)));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private static String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access fund types for another tenant."));
    }

    record FundTypeRequest(
            String tenantId,
            String code,
            @NotBlank String name,
            String basis,
            String description,
            Boolean active,
            Integer displayOrder) {
    }
}
