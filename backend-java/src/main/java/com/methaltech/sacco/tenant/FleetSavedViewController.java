package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/fleet/views")
class FleetSavedViewController {
    private static final long MAX_VIEWS_PER_USER = 20;
    private final FleetSavedViewRepository repository;
    private final AuthService authService;
    private final AuditService auditService;

    FleetSavedViewController(FleetSavedViewRepository repository, AuthService authService, AuditService auditService) {
        this.repository = repository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> list(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session)) return authService.permissionRequired("tenants:view");
        return ResponseEntity.ok(ApiResponse.of(repository.findByUserIdOrderByNameAsc(session.user().getId())));
    }

    @PostMapping
    ResponseEntity<?> create(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SaveFleetViewRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session)) return authService.permissionRequired("tenants:view");
        String name = body.name().trim();
        if (repository.countByUserId(session.user().getId()) >= MAX_VIEWS_PER_USER) {
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "SAVED_VIEW_LIMIT", "You can save up to 20 fleet views."));
        }
        if (repository.existsByUserIdAndNameIgnoreCase(session.user().getId(), name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "SAVED_VIEW_EXISTS", "A fleet view with this name already exists."));
        }
        FleetSavedView saved = repository.save(new FleetSavedView(
                "fleet_view_" + UUID.randomUUID(), session.user().getId(), name, body.search(), body.health(),
                body.status(), body.district(), body.accountManager()));
        auditService.record("tenant_platform", session.user(), "Saved fleet view: " + name,
                "fleet_saved_view", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(saved));
    }

    @DeleteMapping("/{viewId}")
    ResponseEntity<?> delete(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String viewId,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session)) return authService.permissionRequired("tenants:view");
        return repository.findByIdAndUserId(viewId, session.user().getId())
                .<ResponseEntity<?>>map(view -> {
                    repository.delete(view);
                    auditService.record("tenant_platform", session.user(), "Deleted fleet view: " + view.getName(),
                            "fleet_saved_view", view.getId(), request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(java.util.Map.of("deleted", true, "id", view.getId())));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "SAVED_VIEW_NOT_FOUND", "Fleet view not found.")));
    }

    private boolean allowed(AuthService.CurrentSession session) {
        return authService.isPlatform(session.user()) && authService.hasPermission(session.user(), "tenants:view");
    }

    record SaveFleetViewRequest(
            @NotBlank @Size(max = 80) String name,
            @Size(max = 160) String search,
            @Size(max = 32) String health,
            @Size(max = 40) String status,
            @Size(max = 120) String district,
            @Size(max = 80) String accountManager) {
    }
}
