package com.methaltech.sacco.identity;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-events")
class AuditController {

    private final AuthService authService;
    private final AuditEventRepository auditEventRepository;
    private final AuditService auditService;

    AuditController(AuthService authService, AuditEventRepository auditEventRepository, AuditService auditService) {
        this.authService = authService;
        this.auditEventRepository = auditEventRepository;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listAuditEvents(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        List<AuditEvent> events = authService.isPlatform(currentSession.user())
                ? auditEventRepository.findAllByOrderByCreatedAtDesc()
                : auditEventRepository.findByTenantIdOrderByCreatedAtDesc(currentSession.user().getTenantId());

        return ResponseEntity.ok(ApiResponse.of(events.stream().map(AuditEventResponse::from).toList()));
    }

    @PostMapping
    ResponseEntity<?> createAuditEvent(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateAuditRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = body.tenantId() == null || body.tenantId().isBlank()
                ? currentSession.user().getTenantId()
                : body.tenantId().trim();

        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot write audit events for another tenant."));
        }

        AuditEvent event = auditService.record(
                tenantId,
                currentSession.user(),
                body.action().trim(),
                blankToNull(body.resourceType()),
                blankToNull(body.resourceId()),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(AuditEventResponse.from(event)));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    record CreateAuditRequest(
            String tenantId,
            @NotBlank String action,
            String resourceType,
            String resourceId) {
    }
}
