package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
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
@RequestMapping("/api/v1/tenants/fleet/forecast-scenarios")
class FleetForecastScenarioController {
    private static final long MAX_SCENARIOS = 20;
    private final FleetForecastScenarioRepository repository;
    private final AuthService authService;
    private final AuditService auditService;

    FleetForecastScenarioController(FleetForecastScenarioRepository repository, AuthService authService,
            AuditService auditService) {
        this.repository = repository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> list(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session)) return authService.permissionRequired("subscriptions:view");
        return ResponseEntity.ok(ApiResponse.of(repository.findByUserIdOrderByNameAsc(session.user().getId())));
    }

    @PostMapping
    ResponseEntity<?> create(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SaveScenarioRequest body, HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session)) return authService.permissionRequired("subscriptions:view");
        String name = body.name().trim();
        if (repository.countByUserId(session.user().getId()) >= MAX_SCENARIOS) return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(400, "FORECAST_SCENARIO_LIMIT", "You can save up to 20 renewal scenarios."));
        if (repository.existsByUserIdAndNameIgnoreCase(session.user().getId(), name)) return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "FORECAST_SCENARIO_EXISTS", "A renewal scenario with this name already exists."));
        FleetForecastScenario saved = repository.save(new FleetForecastScenario("forecast_scenario_" + UUID.randomUUID(),
                session.user().getId(), name, body.renewalRate(), body.priceAdjustment()));
        auditService.record("tenant_platform", session.user(), "Saved renewal forecast scenario: " + name,
                "fleet_forecast_scenario", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(saved));
    }

    @DeleteMapping("/{scenarioId}")
    ResponseEntity<?> delete(@RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String scenarioId, HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session)) return authService.permissionRequired("subscriptions:view");
        return repository.findByIdAndUserId(scenarioId, session.user().getId()).<ResponseEntity<?>>map(scenario -> {
            repository.delete(scenario);
            auditService.record("tenant_platform", session.user(), "Deleted renewal forecast scenario: " + scenario.getName(),
                    "fleet_forecast_scenario", scenario.getId(), request.getRemoteAddr());
            return ResponseEntity.ok(ApiResponse.of(Map.of("deleted", true, "id", scenario.getId())));
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "FORECAST_SCENARIO_NOT_FOUND", "Renewal scenario not found.")));
    }

    private boolean allowed(AuthService.CurrentSession session) {
        return authService.isPlatform(session.user()) && authService.hasPermission(session.user(), "subscriptions:view");
    }

    record SaveScenarioRequest(@NotBlank @Size(max = 80) String name,
            @Min(0) @Max(100) int renewalRate, @Min(-30) @Max(30) int priceAdjustment) {}
}
