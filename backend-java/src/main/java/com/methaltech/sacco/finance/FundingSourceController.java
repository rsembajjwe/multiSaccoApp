package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.money.Money;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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

/**
 * SACCO sources-of-funds register. The Chairperson (and SACCO admin/treasurer) review the register
 * ({@code finance-source:view}) and add/edit entries ({@code finance-source:manage}). Entries are
 * strictly tenant-scoped and every change is written to the audit trail.
 */
@RestController
@RequestMapping("/api/v1/funding-sources")
class FundingSourceController {

    private final FundingSourceRepository fundingSourceRepository;
    private final AuthService authService;
    private final AuditService auditService;

    FundingSourceController(
            FundingSourceRepository fundingSourceRepository,
            AuthService authService,
            AuditService auditService) {
        this.fundingSourceRepository = fundingSourceRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listFundingSources(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "finance-source:view")) {
            return authService.permissionRequired("finance-source:view");
        }

        List<FundingSource> sources;
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            sources = fundingSourceRepository.findAllByOrderByTenantIdAscDateReceivedDescCreatedAtDesc();
        } else {
            String tenantId = tenantScope(currentSession, requestedTenantId);
            if (tenantId == null) return tenantAccessDenied();
            sources = fundingSourceRepository.findByTenantIdOrderByDateReceivedDescCreatedAtDesc(tenantId);
        }
        return ResponseEntity.ok(ApiResponse.of(sources.stream().map(FundingSourceResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createFundingSource(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody FundingSourceRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "finance-source:manage")) {
            return authService.permissionRequired("finance-source:manage");
        }
        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        ResponseEntity<?> validation = validate(body);
        if (validation != null) return validation;

        FundingSource source = fundingSourceRepository.save(new FundingSource(
                "fundingsource_" + UUID.randomUUID(),
                tenantId,
                body.sourceType().trim(),
                trimOrNull(body.provider()),
                Money.normalize(body.amount()),
                currencyOrDefault(body.currencyCode()),
                trimOrNull(body.reference()),
                body.dateReceived(),
                statusOrDefault(body.status()),
                trimOrNull(body.notes()),
                currentSession.user().getId()));
        auditService.record(tenantId, currentSession.user(),
                "Added funding source " + source.getSourceType() + " " + Money.normalize(source.getAmount()),
                "funding_source", source.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(FundingSourceResponse.from(source)));
    }

    @PatchMapping("/{sourceId}")
    ResponseEntity<?> updateFundingSource(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String sourceId,
            @Valid @RequestBody FundingSourceRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "finance-source:manage")) {
            return authService.permissionRequired("finance-source:manage");
        }
        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        FundingSource source = fundingSourceRepository.findByIdAndTenantId(sourceId, tenantId).orElse(null);
        if (source == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "FUNDING_SOURCE_NOT_FOUND", "Funding source not found for this SACCO."));
        }
        ResponseEntity<?> validation = validate(body);
        if (validation != null) return validation;

        source.update(
                body.sourceType().trim(),
                trimOrNull(body.provider()),
                Money.normalize(body.amount()),
                currencyOrDefault(body.currencyCode()),
                trimOrNull(body.reference()),
                body.dateReceived(),
                statusOrDefault(body.status()),
                trimOrNull(body.notes()));
        FundingSource saved = fundingSourceRepository.save(source);
        auditService.record(tenantId, currentSession.user(),
                "Updated funding source " + saved.getSourceType() + " " + Money.normalize(saved.getAmount()),
                "funding_source", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(FundingSourceResponse.from(saved)));
    }

    private ResponseEntity<?> validate(FundingSourceRequest body) {
        String sourceType = body.sourceType() == null ? "" : body.sourceType().trim();
        if (!FundingSource.SOURCE_TYPES.contains(sourceType)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FUNDING_SOURCE_TYPE", "Unsupported funding source type."));
        }
        if (body.amount() == null || body.amount().signum() <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FUNDING_SOURCE_AMOUNT", "Funding source amount must be greater than zero."));
        }
        String status = body.status() == null || body.status().isBlank() ? FundingSource.STATUS_ACTIVE : body.status().trim();
        if (!FundingSource.STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_FUNDING_SOURCE_STATUS", "Funding source status must be active or closed."));
        }
        return null;
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private static String statusOrDefault(String status) {
        return status == null || status.isBlank() ? FundingSource.STATUS_ACTIVE : status.trim();
    }

    private static String currencyOrDefault(String currencyCode) {
        return currencyCode == null || currencyCode.isBlank() ? "UGX" : currencyCode.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private static String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access funding sources for another tenant."));
    }

    record FundingSourceRequest(
            String tenantId,
            @NotNull String sourceType,
            String provider,
            @NotNull BigDecimal amount,
            String currencyCode,
            String reference,
            LocalDate dateReceived,
            String status,
            String notes) {
    }
}
