package com.methaltech.sacco.tenant;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tenants/fleet/jobs")
class FleetBulkJobController {
    private static final Set<String> ALLOWED_STATUSES = Set.of("pending_review", "inactive", "suspended");
    private final FleetBulkJobRepository jobRepository;
    private final FleetBulkJobResultRepository resultRepository;
    private final FleetBulkJobDispatcher dispatcher;
    private final FleetBulkJobMetrics metrics;
    private final AuthService authService;
    private final AuditService auditService;
    private final FleetApprovalNotificationService approvalNotificationService;
    private final FleetApprovalDeadlineService approvalDeadlineService;
    private final FleetApprovalBusinessCalendar approvalCalendar;

    FleetBulkJobController(FleetBulkJobRepository jobRepository, FleetBulkJobResultRepository resultRepository,
            FleetBulkJobDispatcher dispatcher, FleetBulkJobMetrics metrics, AuthService authService,
            AuditService auditService, FleetApprovalNotificationService approvalNotificationService,
            FleetApprovalDeadlineService approvalDeadlineService, FleetApprovalBusinessCalendar approvalCalendar) {
        this.jobRepository = jobRepository;
        this.resultRepository = resultRepository;
        this.dispatcher = dispatcher;
        this.metrics = metrics;
        this.authService = authService;
        this.auditService = auditService;
        this.approvalNotificationService = approvalNotificationService;
        this.approvalDeadlineService = approvalDeadlineService;
        this.approvalCalendar = approvalCalendar;
    }

    @GetMapping
    ResponseEntity<?> list(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:view")) return authService.permissionRequired("tenants:view");
        return ResponseEntity.ok(ApiResponse.of(jobRepository.findTop20ByOrderByCreatedAtDesc()));
    }

    @GetMapping("/approval-queue")
    ResponseEntity<?> approvalQueue(@RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:view")) return authService.permissionRequired("tenants:view");
        Pageable pageable = PageParams.toPageable(page, size, Sort.by("createdAt").ascending());
        Page<FleetBulkJob> jobs = jobRepository.findByStatus("pending_approval", pageable);
        return ResponseEntity.ok(PagedResponse.of(jobs.getContent(), jobs.getNumber(), jobs.getSize(),
                jobs.getTotalElements(), jobs.getTotalPages()));
    }

    @GetMapping("/approval-summary")
    ResponseEntity<?> approvalSummary(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:view")) return authService.permissionRequired("tenants:view");
        Instant now = Instant.now();
        long pending = jobRepository.countByStatus("pending_approval");
        long submittedByMe = jobRepository.countByStatusAndRequestedBy("pending_approval", session.user().getId());
        boolean canDecide = allowed(session, "tenants:manage");
        return ResponseEntity.ok(ApiResponse.of(new FleetApprovalSummary(
                pending,
                canDecide ? Math.max(0, pending - submittedByMe) : 0,
                submittedByMe,
                jobRepository.countByStatusAndApprovalDueAtLessThanEqual("pending_approval", now),
                jobRepository.countByStatusAndApprovalDueSoonAtLessThanEqualAndApprovalDueAtAfter(
                        "pending_approval", now, now),
                approvalCalendar.slaHours(),
                approvalCalendar.warningRemainingHours(),
                approvalCalendar.zoneId(),
                approvalCalendar.businessHours(),
                canDecide)));
    }

    @GetMapping("/{jobId}/results")
    ResponseEntity<?> results(@RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String jobId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:view")) return authService.permissionRequired("tenants:view");
        return jobRepository.findById(jobId)
                .<ResponseEntity<?>>map(job -> ResponseEntity.ok(ApiResponse.of(resultRepository.findByJobIdOrderByTenantIdAsc(jobId))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of(404, "FLEET_JOB_NOT_FOUND", "Fleet job not found.")));
    }

    @PostMapping
    ResponseEntity<?> submit(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody SubmitFleetJobRequest body, HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:manage")) return authService.permissionRequired("tenants:manage");
        List<String> tenantIds = body.tenantIds() == null ? List.of() : body.tenantIds().stream().distinct().toList();
        if (tenantIds.isEmpty() || tenantIds.size() > 100) return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_BULK_SCOPE", "Select between 1 and 100 SACCOs."));
        if (body.status() != null && !body.status().isBlank() && !ALLOWED_STATUSES.contains(body.status())) return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_BULK_STATUS", "This lifecycle status cannot be applied in bulk."));
        boolean ownerProvided = body.accountManagerUserId() != null || body.accountManagerName() != null;
        if (!ownerProvided && (body.status() == null || body.status().isBlank())) return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "BULK_ACTION_REQUIRED", "Choose a lifecycle or portfolio assignment action."));
        String jobId = "fleet_job_" + UUID.randomUUID();
        FleetBulkJob job = new FleetBulkJob(jobId, session.user().getId(), session.user().getFullName(),
                tenantIds.size(), body.status(), body.accountManagerUserId(), body.accountManagerName(), body.reason());
        approvalDeadlineService.assign(job);
        job = jobRepository.save(job);
        resultRepository.saveAll(tenantIds.stream().map(tenantId -> new FleetBulkJobResult(
                "fleet_result_" + UUID.randomUUID(), jobId, tenantId)).toList());
        metrics.submitted(tenantIds.size());
        auditService.record("tenant_platform", session.user(),
                "Requested fleet bulk update for " + tenantIds.size() + " organizations: " + body.reason().trim(),
                "fleet_bulk_job", jobId, request.getRemoteAddr());
        approvalNotificationService.notifySubmitted(job);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.of(job));
    }

    @PostMapping("/{jobId}/decision")
    ResponseEntity<?> decide(@RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String jobId, @Valid @RequestBody FleetJobDecisionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!allowed(session, "tenants:manage")) return authService.permissionRequired("tenants:manage");
        FleetBulkJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "FLEET_JOB_NOT_FOUND", "Fleet job not found."));
        try {
            if ("approve".equals(body.decision())) {
                job.approve(session.user().getId(), session.user().getFullName(), body.reason());
                jobRepository.saveAndFlush(job);
                List<String> tenantIds = resultRepository.findByJobIdOrderByTenantIdAsc(jobId).stream()
                        .map(FleetBulkJobResult::getTenantId).toList();
                auditDecision(session, job, "Approved", body.reason(), request);
                approvalNotificationService.notifyDecision(job, "approve");
                dispatcher.dispatch(jobId, tenantIds, request.getRemoteAddr());
                return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.of(job));
            }
            if ("reject".equals(body.decision())) {
                job.reject(session.user().getId(), session.user().getFullName(), body.reason());
                jobRepository.saveAndFlush(job);
                auditDecision(session, job, "Rejected", body.reason(), request);
                approvalNotificationService.notifyDecision(job, "reject");
                return ResponseEntity.ok(ApiResponse.of(job));
            }
            return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "INVALID_FLEET_JOB_DECISION", "Decision must be approve or reject."));
        } catch (IllegalStateException | ObjectOptimisticLockingFailureException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "FLEET_JOB_DECISION_CONFLICT", exception.getMessage()));
        }
    }

    private void auditDecision(AuthService.CurrentSession session, FleetBulkJob job, String decision,
            String reason, HttpServletRequest request) {
        auditService.record("tenant_platform", session.user(),
                decision + " fleet bulk update requested by " + job.getRequestedByName() + ": " + reason.trim(),
                "fleet_bulk_job", job.getId(), request.getRemoteAddr());
    }

    private boolean allowed(AuthService.CurrentSession session, String permission) {
        return authService.isPlatform(session.user()) && authService.hasPermission(session.user(), permission);
    }

    record SubmitFleetJobRequest(List<String> tenantIds, String status, String accountManagerUserId,
            String accountManagerName, @NotBlank @Size(max = 500) String reason) {}
    record FleetJobDecisionRequest(@NotBlank String decision, @NotBlank @Size(max = 500) String reason) {}
    record FleetApprovalSummary(long pending, long readyForMyDecision, long submittedByMe,
            long overdue, long dueSoon, int slaHours, int warningRemainingHours,
            String businessTimeZone, String businessHours, boolean canDecide) {}
}
