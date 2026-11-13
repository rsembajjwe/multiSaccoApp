package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/fleet/incidents")
class FleetIncidentController {
    private static final Set<String> STATUSES = Set.of("open", "acknowledged", "escalated", "resolved");
    private final FleetIncidentStateRepository repository;
    private final TenantRepository tenantRepository;
    private final AuthService authService;
    private final AuditService auditService;

    FleetIncidentController(FleetIncidentStateRepository repository, TenantRepository tenantRepository,
            AuthService authService, AuditService auditService) {
        this.repository = repository;
        this.tenantRepository = tenantRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> list(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:view")) return authService.permissionRequired("tenants:view");
        return ResponseEntity.ok(ApiResponse.of(repository.findAllByOrderByUpdatedAtDesc()));
    }

    @PatchMapping("/{incidentKey}")
    ResponseEntity<?> update(@RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String incidentKey, @Valid @RequestBody UpdateIncidentRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:manage")) return authService.permissionRequired("tenants:manage");
        if (!STATUSES.contains(body.status())) return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(400, "INVALID_INCIDENT_STATUS", "Incident status must be open, acknowledged, escalated, or resolved."));
        String[] keyParts = incidentKey.split(":", 2);
        if (keyParts.length != 2 || !tenantRepository.existsById(keyParts[0])) return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "INCIDENT_NOT_FOUND", "The fleet incident or organization was not found."));
        if ("resolved".equals(body.status()) && (body.resolutionNote() == null || body.resolutionNote().isBlank())) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "RESOLUTION_NOTE_REQUIRED", "Enter a resolution note before closing the incident."));
        }
        FleetIncidentState state = repository.findById(incidentKey)
                .orElseGet(() -> new FleetIncidentState(incidentKey, keyParts[0], keyParts[1]));
        User assignee = resolveAssignee(body.assigneeUserId(), session.user());
        if (body.assigneeUserId() != null && assignee == null) return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(400, "INVALID_INCIDENT_ASSIGNEE", "Choose an active platform user as incident owner."));
        if ("acknowledged".equals(body.status())) {
            state.acknowledge(session.user().getId(), session.user().getFullName());
            if (assignee != null) state.assign(assignee.getId(), assignee.getFullName());
        }
        else if ("escalated".equals(body.status())) {
            User target = assignee == null ? session.user() : assignee;
            state.escalate(session.user().getId(), session.user().getFullName(), target.getId(), target.getFullName());
        }
        else if ("resolved".equals(body.status())) state.resolve(session.user().getId(), session.user().getFullName(), body.resolutionNote());
        else state.reopen();
        FleetIncidentState saved = repository.save(state);
        auditService.record(saved.getTenantId(), session.user(), "Fleet incident " + body.status() + ": " + saved.getIssueType(),
                "fleet_incident", saved.getIncidentKey(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(saved));
    }

    private boolean allowed(AuthService.CurrentSession session, String permission) {
        return authService.isPlatform(session.user()) && authService.hasPermission(session.user(), permission);
    }

    private User resolveAssignee(String userId, User fallback) {
        if (userId == null) return null;
        if (userId.isBlank()) return fallback;
        return authService.findUser(userId)
                .filter(user -> "tenant_platform".equals(user.getTenantId()) && "active".equals(user.getStatus()))
                .orElse(null);
    }

    record UpdateIncidentRequest(@NotBlank String status, String assigneeUserId, @Size(max = 1000) String resolutionNote) {}
}
