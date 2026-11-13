package com.methaltech.sacco.tenant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

class FleetBulkJobControllerTest {

    private final FleetBulkJobRepository jobRepository = mock(FleetBulkJobRepository.class);
    private final FleetBulkJobResultRepository resultRepository = mock(FleetBulkJobResultRepository.class);
    private final FleetBulkJobDispatcher dispatcher = mock(FleetBulkJobDispatcher.class);
    private final FleetBulkJobMetrics metrics = mock(FleetBulkJobMetrics.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final FleetApprovalNotificationService notifications = mock(FleetApprovalNotificationService.class);
    private final FleetApprovalDeadlineService deadlines = mock(FleetApprovalDeadlineService.class);
    private final FleetApprovalBusinessCalendar calendar = mock(FleetApprovalBusinessCalendar.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User operator = user("operator", "Operator");
    private final User approver = user("approver", "Approver");
    private final FleetBulkJobController controller = new FleetBulkJobController(jobRepository, resultRepository,
            dispatcher, metrics, authService, auditService, notifications, deadlines, calendar);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(authService.isPlatform(operator)).thenReturn(true);
        when(authService.isPlatform(approver)).thenReturn(true);
        when(jobRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(jobRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(calendar.slaHours()).thenReturn(8);
        when(calendar.warningRemainingHours()).thenReturn(4);
        when(calendar.zoneId()).thenReturn("Africa/Kampala");
        when(calendar.businessHours()).thenReturn("08:00-17:00");
    }

    @Test
    void listAndResultsEnforcePlatformAccessAndNotFoundHandling() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, controller.list(null).getStatusCode());

        when(authService.currentSession("Bearer denied")).thenReturn(session(operator));
        assertEquals(HttpStatus.FORBIDDEN, controller.list("Bearer denied").getStatusCode());

        allow("Bearer view", operator, "tenants:view");
        FleetBulkJob job = job("job_one", operator);
        when(jobRepository.findTop20ByOrderByCreatedAtDesc()).thenReturn(List.of(job));
        assertEquals(List.of(job), ((ApiResponse<?>) controller.list("Bearer view").getBody()).data());

        assertError(controller.results("Bearer view", "missing"), HttpStatus.NOT_FOUND, "FLEET_JOB_NOT_FOUND");
        FleetBulkJobResult result = new FleetBulkJobResult("result_one", "job_one", "tenant_one");
        when(jobRepository.findById("job_one")).thenReturn(Optional.of(job));
        when(resultRepository.findByJobIdOrderByTenantIdAsc("job_one")).thenReturn(List.of(result));
        assertEquals(List.of(result), ((ApiResponse<?>) controller.results("Bearer view", "job_one").getBody()).data());
    }

    @Test
    void approvalQueueAndSummaryExposeDecisionAwareCounts() {
        allow("Bearer view", operator, "tenants:view");
        FleetBulkJob queued = job("job_one", operator);
        when(jobRepository.findByStatus(eq("pending_approval"), any()))
                .thenReturn(new PageImpl<>(List.of(queued)));
        ResponseEntity<?> queue = controller.approvalQueue("Bearer view", -1, 500);
        assertEquals(HttpStatus.OK, queue.getStatusCode());
        assertEquals(1, ((PagedResponse<?>) queue.getBody()).data().size());

        when(authService.hasPermission(operator, "tenants:manage")).thenReturn(true);
        when(jobRepository.countByStatus("pending_approval")).thenReturn(7L);
        when(jobRepository.countByStatusAndRequestedBy("pending_approval", "operator")).thenReturn(2L);
        when(jobRepository.countByStatusAndApprovalDueAtLessThanEqual(eq("pending_approval"), any())).thenReturn(1L);
        when(jobRepository.countByStatusAndApprovalDueSoonAtLessThanEqualAndApprovalDueAtAfter(
                eq("pending_approval"), any(), any())).thenReturn(3L);
        FleetBulkJobController.FleetApprovalSummary summary = (FleetBulkJobController.FleetApprovalSummary)
                ((ApiResponse<?>) controller.approvalSummary("Bearer view").getBody()).data();
        assertEquals(7, summary.pending());
        assertEquals(5, summary.readyForMyDecision());
        assertEquals(2, summary.submittedByMe());
        assertTrue(summary.canDecide());
    }

    @Test
    void submitValidatesScopeStatusAndRequiredAction() {
        allow("Bearer manage", operator, "tenants:manage");
        assertError(submit(List.of(), null, null, null), HttpStatus.BAD_REQUEST, "INVALID_BULK_SCOPE");
        assertError(submit(java.util.stream.IntStream.range(0, 101).mapToObj(String::valueOf).toList(),
                null, "manager", null), HttpStatus.BAD_REQUEST, "INVALID_BULK_SCOPE");
        assertError(submit(List.of("tenant_one"), "active", null, null),
                HttpStatus.BAD_REQUEST, "INVALID_BULK_STATUS");
        assertError(submit(List.of("tenant_one"), null, null, null),
                HttpStatus.BAD_REQUEST, "BULK_ACTION_REQUIRED");
    }

    @Test
    void submitPersistsDistinctTargetsAuditsAndNotifies() {
        allow("Bearer manage", operator, "tenants:manage");
        ResponseEntity<?> response = submit(List.of("tenant_one", "tenant_one", "tenant_two"),
                "suspended", null, null);
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        FleetBulkJob saved = (FleetBulkJob) ((ApiResponse<?>) response.getBody()).data();
        assertEquals(2, saved.getRequestedCount());
        assertEquals("suspended", saved.getTargetStatus());
        verify(deadlines).assign(saved);
        verify(resultRepository).saveAll(any());
        verify(metrics).submitted(2);
        verify(notifications).notifySubmitted(saved);
        verify(auditService).record(eq("tenant_platform"), eq(operator), any(),
                eq("fleet_bulk_job"), eq(saved.getId()), eq("127.0.0.1"));
    }

    @Test
    void decisionsRejectInvalidMissingAndConflictingJobs() {
        allow("Bearer approve", approver, "tenants:manage");
        FleetBulkJobController.FleetJobDecisionRequest invalid =
                new FleetBulkJobController.FleetJobDecisionRequest("hold", "Review");
        assertError(controller.decide("Bearer approve", "missing", invalid, request),
                HttpStatus.NOT_FOUND, "FLEET_JOB_NOT_FOUND");

        FleetBulkJob job = job("job_one", operator);
        when(jobRepository.findById("job_one")).thenReturn(Optional.of(job));
        assertError(controller.decide("Bearer approve", "job_one", invalid, request),
                HttpStatus.BAD_REQUEST, "INVALID_FLEET_JOB_DECISION");

        when(jobRepository.saveAndFlush(job)).thenThrow(new ObjectOptimisticLockingFailureException("job", "job_one"));
        assertError(controller.decide("Bearer approve", "job_one",
                new FleetBulkJobController.FleetJobDecisionRequest("approve", "Approved"), request),
                HttpStatus.CONFLICT, "FLEET_JOB_DECISION_CONFLICT");
    }

    @Test
    void decisionsApproveAndRejectWithAuditNotificationAndDispatch() {
        allow("Bearer approve", approver, "tenants:manage");
        FleetBulkJob approved = job("job_approved", operator);
        FleetBulkJobResult result = new FleetBulkJobResult("result_one", approved.getId(), "tenant_one");
        when(jobRepository.findById(approved.getId())).thenReturn(Optional.of(approved));
        when(resultRepository.findByJobIdOrderByTenantIdAsc(approved.getId())).thenReturn(List.of(result));

        ResponseEntity<?> approval = controller.decide("Bearer approve", approved.getId(),
                new FleetBulkJobController.FleetJobDecisionRequest("approve", "  Valid request  "), request);
        assertEquals(HttpStatus.ACCEPTED, approval.getStatusCode());
        assertEquals("queued", approved.getStatus());
        verify(dispatcher).dispatch(approved.getId(), List.of("tenant_one"), "127.0.0.1");
        verify(notifications).notifyDecision(approved, "approve");

        FleetBulkJob rejected = job("job_rejected", operator);
        when(jobRepository.findById(rejected.getId())).thenReturn(Optional.of(rejected));
        ResponseEntity<?> rejection = controller.decide("Bearer approve", rejected.getId(),
                new FleetBulkJobController.FleetJobDecisionRequest("reject", "  Risk too high  "), request);
        assertEquals(HttpStatus.OK, rejection.getStatusCode());
        assertEquals("rejected", rejected.getStatus());
        verify(notifications).notifyDecision(rejected, "reject");
    }

    private ResponseEntity<?> submit(List<String> tenantIds, String status,
            String managerUserId, String managerName) {
        return controller.submit("Bearer manage", new FleetBulkJobController.SubmitFleetJobRequest(
                tenantIds, status, managerUserId, managerName, "  Portfolio review  "), request);
    }

    private FleetBulkJob job(String id, User requester) {
        return new FleetBulkJob(id, requester.getId(), requester.getFullName(), 1,
                "suspended", null, null, "Review");
    }

    private void allow(String token, User user, String permission) {
        when(authService.currentSession(token)).thenReturn(session(user));
        when(authService.hasPermission(user, permission)).thenReturn(true);
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

    private User user(String id, String name) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getTenantId()).thenReturn("tenant_platform");
        when(user.getFullName()).thenReturn(name);
        return user;
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
