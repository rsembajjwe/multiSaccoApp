package com.methaltech.sacco.approval;

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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
class ApprovalController {

    private static final Set<String> MODULES = Set.of(
            "members", "transactions", "loans", "expenses", "assets", "subscriptions", "governance");
    private static final Set<String> DECISIONS = Set.of("pending", "approved", "rejected", "corrections_requested");
    private static final Set<String> DECISIONS_REQUIRING_REASON = Set.of("rejected", "corrections_requested");

    private final ApprovalWorkflowRepository workflowRepository;
    private final ApprovalDecisionRepository decisionRepository;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping("/approval-workflows")
    ResponseEntity<?> listWorkflows(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<ApprovalWorkflow> workflows = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? workflowRepository.findAllByOrderByTenantIdAscModuleAscNameAsc()
                : workflowRepository.findByTenantIdOrderByModuleAscNameAsc(tenantId);
        return ResponseEntity.ok(ApiResponse.of(workflows.stream().map(ApprovalWorkflowResponse::from).toList()));
    }

    @PostMapping("/approval-workflows")
    ResponseEntity<?> createWorkflow(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateApprovalWorkflowRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String module = body.module().trim();
        if (!MODULES.contains(module)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_APPROVAL_MODULE", "Unsupported approval module."));
        }
        String name = body.name().trim();
        if (workflowRepository.existsByTenantIdAndModuleAndNameIgnoreCase(tenantId, module, name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "APPROVAL_WORKFLOW_EXISTS", "Approval workflow already exists."));
        }

        ApprovalWorkflow workflow = workflowRepository.save(new ApprovalWorkflow(
                "workflow_" + UUID.randomUUID(),
                tenantId,
                name,
                module,
                body.active() == null || body.active(),
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Created approval workflow " + workflow.getName(),
                "approval_workflow",
                workflow.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(ApprovalWorkflowResponse.from(workflow)));
    }

    @GetMapping("/approval-decisions")
    ResponseEntity<?> listDecisions(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "decision", required = false) String requestedDecision) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String decision = normalizeDecision(requestedDecision);
        if (requestedDecision != null && decision == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_APPROVAL_DECISION", "Unsupported approval decision."));
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<ApprovalDecision> decisions;
        if (authService.isPlatform(currentSession.user()) && requestedTenantId == null) {
            decisions = decision == null
                    ? decisionRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                    : decisionRepository.findByDecisionOrderByTenantIdAscCreatedAtDesc(decision);
        } else {
            decisions = decision == null
                    ? decisionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                    : decisionRepository.findByTenantIdAndDecisionOrderByCreatedAtDesc(tenantId, decision);
        }
        return ResponseEntity.ok(ApiResponse.of(decisions.stream().map(ApprovalDecisionResponse::from).toList()));
    }

    @PostMapping("/approval-decisions")
    ResponseEntity<?> createDecision(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateApprovalDecisionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String decisionValue = normalizeDecision(body.decision());
        if (decisionValue == null) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_APPROVAL_DECISION", "Unsupported approval decision."));
        }
        if (DECISIONS_REQUIRING_REASON.contains(decisionValue)
                && (body.reason() == null || body.reason().isBlank())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "APPROVAL_REASON_REQUIRED", "A reason is required for this approval decision."));
        }

        return workflowRepository.findById(body.workflowId().trim())
                .<ResponseEntity<?>>map(workflow -> {
                    if (!canAccess(currentSession, workflow.getTenantId())) return tenantAccessDenied();
                    if (body.tenantId() != null && !body.tenantId().isBlank()
                            && !workflow.getTenantId().equals(body.tenantId().trim())) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "WORKFLOW_TENANT_MISMATCH", "Decision tenant must match workflow tenant."));
                    }
                    ApprovalDecision decision = decisionRepository.save(new ApprovalDecision(
                            "approval_decision_" + UUID.randomUUID(),
                            workflow.getTenantId(),
                            workflow.getId(),
                            body.resourceType().trim(),
                            body.resourceId().trim(),
                            decisionValue,
                            currentSession.user().getId(),
                            body.reason() == null ? null : body.reason().trim()));
                    auditService.record(
                            workflow.getTenantId(),
                            currentSession.user(),
                            "Recorded approval decision " + decision.getDecision() + " for " + decision.getResourceType(),
                            "approval_decision",
                            decision.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(ApprovalDecisionResponse.from(decision)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "APPROVAL_WORKFLOW_NOT_FOUND", "Approval workflow not found.")));
    }

    private String normalizeDecision(String requestedDecision) {
        if (requestedDecision == null || requestedDecision.isBlank()) return null;
        String decision = requestedDecision.trim();
        return DECISIONS.contains(decision) ? decision : null;
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            return null;
        }
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) return null;
        return tenantId;
    }

    private boolean canAccess(AuthService.CurrentSession currentSession, String tenantId) {
        return authService.isPlatform(currentSession.user()) || tenantId.equals(currentSession.user().getTenantId());
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access approval records for another tenant."));
    }

    record CreateApprovalWorkflowRequest(String tenantId, @NotBlank String name, @NotBlank String module, Boolean active) {
    }

    record CreateApprovalDecisionRequest(
            String tenantId,
            @NotBlank String workflowId,
            @NotBlank String resourceType,
            @NotBlank String resourceId,
            @NotBlank String decision,
            String reason) {
    }
}
