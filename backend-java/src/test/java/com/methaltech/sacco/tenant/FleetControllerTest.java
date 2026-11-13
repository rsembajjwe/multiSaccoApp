package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class FleetControllerTest {

    private final FleetSavedViewRepository viewRepository = mock(FleetSavedViewRepository.class);
    private final FleetForecastScenarioRepository scenarioRepository = mock(FleetForecastScenarioRepository.class);
    private final FleetIncidentStateRepository incidentRepository = mock(FleetIncidentStateRepository.class);
    private final TenantRepository tenantRepository = mock(TenantRepository.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User platformUser = user("platform_user", "tenant_platform", "Platform Admin", "active");
    private final User assignee = user("incident_owner", "tenant_platform", "Incident Owner", "active");
    private final FleetSavedViewController viewController =
            new FleetSavedViewController(viewRepository, authService, auditService);
    private final FleetForecastScenarioController scenarioController =
            new FleetForecastScenarioController(scenarioRepository, authService, auditService);
    private final FleetIncidentController incidentController =
            new FleetIncidentController(incidentRepository, tenantRepository, authService, auditService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(authService.isPlatform(platformUser)).thenReturn(true);
        when(viewRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(scenarioRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(incidentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void savedViewsRequirePlatformAccessAndListOnlyCurrentUsersViews() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, viewController.list(null).getStatusCode());

        when(authService.currentSession("Bearer denied")).thenReturn(session(platformUser));
        assertEquals(HttpStatus.FORBIDDEN, viewController.list("Bearer denied").getStatusCode());

        allow("Bearer views", "tenants:view");
        FleetSavedView view = new FleetSavedView("view_one", platformUser.getId(), "At risk", null,
                "critical", null, null, null);
        when(viewRepository.findByUserIdOrderByNameAsc(platformUser.getId())).thenReturn(List.of(view));

        ResponseEntity<?> response = viewController.list("Bearer views");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(view), ((ApiResponse<?>) response.getBody()).data());
    }

    @Test
    void savedViewsValidateLimitsDuplicatesAndPersistCleanValues() {
        allow("Bearer views", "tenants:view");
        FleetSavedViewController.SaveFleetViewRequest body = new FleetSavedViewController.SaveFleetViewRequest(
                "  Northern risk  ", " search ", " critical ", " active ", " Kampala ", " Alice ");

        when(viewRepository.countByUserId(platformUser.getId())).thenReturn(20L);
        assertError(viewController.create("Bearer views", body, request), HttpStatus.BAD_REQUEST, "SAVED_VIEW_LIMIT");

        when(viewRepository.countByUserId(platformUser.getId())).thenReturn(2L);
        when(viewRepository.existsByUserIdAndNameIgnoreCase(platformUser.getId(), "Northern risk")).thenReturn(true);
        assertError(viewController.create("Bearer views", body, request), HttpStatus.CONFLICT, "SAVED_VIEW_EXISTS");

        when(viewRepository.existsByUserIdAndNameIgnoreCase(platformUser.getId(), "Northern risk")).thenReturn(false);
        ResponseEntity<?> response = viewController.create("Bearer views", body, request);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        FleetSavedView saved = (FleetSavedView) ((ApiResponse<?>) response.getBody()).data();
        assertEquals("Northern risk", saved.getName());
        assertEquals("search", saved.getSearch());
        assertEquals("critical", saved.getHealth());
        verify(auditService).record(eq("tenant_platform"), eq(platformUser),
                eq("Saved fleet view: Northern risk"), eq("fleet_saved_view"), eq(saved.getId()), eq("127.0.0.1"));
    }

    @Test
    void savedViewsDeleteOnlyOwnedRecords() {
        allow("Bearer views", "tenants:view");
        FleetSavedView view = new FleetSavedView("view_one", platformUser.getId(), "Portfolio", null,
                null, null, null, null);
        when(viewRepository.findByIdAndUserId("view_one", platformUser.getId())).thenReturn(Optional.of(view));

        assertEquals(HttpStatus.OK, viewController.delete("Bearer views", "view_one", request).getStatusCode());
        verify(viewRepository).delete(view);
        assertEquals(HttpStatus.NOT_FOUND,
                viewController.delete("Bearer views", "missing", request).getStatusCode());
    }

    @Test
    void forecastScenariosCoverAccessValidationLifecycleAndCleanup() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, scenarioController.list(null).getStatusCode());
        allow("Bearer forecast", "subscriptions:view");

        FleetForecastScenario scenario = new FleetForecastScenario(
                "scenario_one", platformUser.getId(), "Conservative", 70, -5);
        when(scenarioRepository.findByUserIdOrderByNameAsc(platformUser.getId())).thenReturn(List.of(scenario));
        assertEquals(List.of(scenario), ((ApiResponse<?>) scenarioController.list("Bearer forecast").getBody()).data());

        FleetForecastScenarioController.SaveScenarioRequest body =
                new FleetForecastScenarioController.SaveScenarioRequest("  Growth  ", 90, 4);
        when(scenarioRepository.countByUserId(platformUser.getId())).thenReturn(20L);
        assertError(scenarioController.create("Bearer forecast", body, request),
                HttpStatus.BAD_REQUEST, "FORECAST_SCENARIO_LIMIT");

        when(scenarioRepository.countByUserId(platformUser.getId())).thenReturn(1L);
        when(scenarioRepository.existsByUserIdAndNameIgnoreCase(platformUser.getId(), "Growth")).thenReturn(true);
        assertError(scenarioController.create("Bearer forecast", body, request),
                HttpStatus.CONFLICT, "FORECAST_SCENARIO_EXISTS");

        when(scenarioRepository.existsByUserIdAndNameIgnoreCase(platformUser.getId(), "Growth")).thenReturn(false);
        ResponseEntity<?> created = scenarioController.create("Bearer forecast", body, request);
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        FleetForecastScenario saved = (FleetForecastScenario) ((ApiResponse<?>) created.getBody()).data();
        assertEquals("Growth", saved.getName());
        assertEquals(90, saved.getRenewalRate());

        when(scenarioRepository.findByIdAndUserId("scenario_one", platformUser.getId()))
                .thenReturn(Optional.of(scenario));
        assertEquals(HttpStatus.OK,
                scenarioController.delete("Bearer forecast", "scenario_one", request).getStatusCode());
        verify(scenarioRepository).delete(scenario);
        assertEquals(HttpStatus.NOT_FOUND,
                scenarioController.delete("Bearer forecast", "missing", request).getStatusCode());
    }

    @Test
    void incidentsRequirePlatformPermissionsAndValidateRequests() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, incidentController.list(null).getStatusCode());

        allow("Bearer incident-view", "tenants:view");
        FleetIncidentState state = new FleetIncidentState("tenant_one:arrears", "tenant_one", "arrears");
        when(incidentRepository.findAllByOrderByUpdatedAtDesc()).thenReturn(List.of(state));
        assertEquals(List.of(state), ((ApiResponse<?>) incidentController.list("Bearer incident-view").getBody()).data());

        allow("Bearer incident", "tenants:manage");
        assertError(update("tenant_one:arrears", "unknown", null, null),
                HttpStatus.BAD_REQUEST, "INVALID_INCIDENT_STATUS");
        assertError(update("invalid", "open", null, null), HttpStatus.NOT_FOUND, "INCIDENT_NOT_FOUND");

        when(tenantRepository.existsById("tenant_one")).thenReturn(true);
        assertError(update("tenant_one:arrears", "resolved", null, " "),
                HttpStatus.BAD_REQUEST, "RESOLUTION_NOTE_REQUIRED");
        when(authService.findUser("missing")).thenReturn(Optional.empty());
        assertError(update("tenant_one:arrears", "acknowledged", "missing", null),
                HttpStatus.BAD_REQUEST, "INVALID_INCIDENT_ASSIGNEE");
    }

    @Test
    void incidentsSupportAcknowledgementEscalationResolutionAndReopening() {
        allow("Bearer incident", "tenants:manage");
        when(tenantRepository.existsById("tenant_one")).thenReturn(true);

        ResponseEntity<?> acknowledged = update("tenant_one:arrears", "acknowledged", "", null);
        FleetIncidentState state = (FleetIncidentState) ((ApiResponse<?>) acknowledged.getBody()).data();
        assertEquals("acknowledged", state.getWorkflowStatus());
        assertEquals(platformUser.getId(), state.getAssigneeUserId());

        when(incidentRepository.findById("tenant_one:arrears")).thenReturn(Optional.of(state));
        when(authService.findUser(assignee.getId())).thenReturn(Optional.of(assignee));
        update("tenant_one:arrears", "escalated", assignee.getId(), null);
        assertEquals("escalated", state.getWorkflowStatus());
        assertEquals(assignee.getId(), state.getAssigneeUserId());

        update("tenant_one:arrears", "resolved", null, "  Restored service  ");
        assertEquals("resolved", state.getWorkflowStatus());
        assertEquals("Restored service", state.getResolutionNote());

        update("tenant_one:arrears", "open", null, null);
        assertEquals("open", state.getWorkflowStatus());
        assertNull(state.getResolutionNote());
        verify(auditService, org.mockito.Mockito.times(4)).record(eq("tenant_one"), eq(platformUser),
                any(), eq("fleet_incident"), eq("tenant_one:arrears"), eq("127.0.0.1"));
    }

    private ResponseEntity<?> update(String key, String status, String assigneeUserId, String note) {
        return incidentController.update("Bearer incident", key,
                new FleetIncidentController.UpdateIncidentRequest(status, assigneeUserId, note), request);
    }

    private void allow(String token, String permission) {
        when(authService.currentSession(token)).thenReturn(session(platformUser));
        when(authService.hasPermission(platformUser, permission)).thenReturn(true);
    }

    private void stubAuthErrors() {
        when(authService.authRequired()).thenReturn(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "Authentication required.")));
        when(authService.permissionRequired(any())).thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Permission required.")));
    }

    private AuthService.CurrentSession session(User user) {
        return new AuthService.CurrentSession(null, user);
    }

    private User user(String id, String tenantId, String name, String status) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getTenantId()).thenReturn(tenantId);
        when(user.getFullName()).thenReturn(name);
        when(user.getStatus()).thenReturn(status);
        return user;
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertEquals(code, body.error().code());
        assertTrue(body.error().status() >= 400);
    }
}
