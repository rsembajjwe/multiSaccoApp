package com.methaltech.sacco.complaint;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.branch.Branch;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
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

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final ComplaintService complaintService;
    private final ComplaintMessageRepository complaintMessageRepository;
    private final MemberRepository memberRepository;
    private final BranchRepository branchRepository;
    private final AuthService authService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    ResponseEntity<?> listComplaints(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "complaints:view")) {
            return authService.permissionRequired("complaints:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        List<Complaint> complaints = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? complaintRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : complaintRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        complaints = complaints.stream()
                .filter(complaint -> canAccessComplaint(currentSession, complaint))
                .toList();
        if (status != null && !status.isBlank()) {
            String wanted = status.trim();
            complaints = complaints.stream().filter(complaint -> wanted.equals(complaint.getStatus())).toList();
        }
        List<ComplaintResponse> responses = complaints.stream().map(this::staffComplaintResponse).toList();
        if (PageParams.requested(page, size)) {
            return ResponseEntity.ok(PageParams.paged(responses, page, size));
        }
        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    @PostMapping
    ResponseEntity<?> createComplaint(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateComplaintRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "complaints:manage")) {
            return authService.permissionRequired("complaints:manage");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();
        ResponseEntity<ApiErrorResponse> validationError = validateComplaintBody(body.category(), body.channel(), body.priority());
        if (validationError != null) return validationError;
        if (body.memberId() != null && !body.memberId().isBlank()) {
            Member member = memberRepository.findById(body.memberId().trim()).orElse(null);
            boolean memberAllowed = java.util.Optional.ofNullable(member)
                    .filter(foundMember -> foundMember.getTenantId().equals(tenantId))
                    .isPresent();
            if (!memberAllowed) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Complaint member not found for this SACCO."));
            }
            if (!canAccessMemberBranch(currentSession, tenantId, member)) {
                return branchAccessDenied();
            }
        }

        Complaint complaint = complaintService.createStaffComplaint(
                tenantId,
                body.memberId() == null || body.memberId().isBlank() ? null : body.memberId().trim(),
                body.category().trim(),
                body.subject().trim(),
                body.description() == null ? "" : body.description().trim(),
                body.channel() == null || body.channel().isBlank() ? "branch" : body.channel().trim(),
                body.priority() == null || body.priority().isBlank() ? "medium" : body.priority().trim(),
                body.assignedUserId() == null || body.assignedUserId().isBlank() ? currentSession.user().getId() : body.assignedUserId().trim(),
                currentSession.user().getId());
        auditService.record(
                tenantId,
                currentSession.user(),
                "Captured complaint " + complaint.getSubject(),
                "complaint",
                complaint.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(staffComplaintResponse(complaint)));
    }

    @PatchMapping("/{complaintId}/status")
    ResponseEntity<?> updateComplaintStatus(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String complaintId,
            @Valid @RequestBody UpdateComplaintStatusRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "complaints:manage")) {
            return authService.permissionRequired("complaints:manage");
        }

        String status = body.status().trim();
        if (!ComplaintService.STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_STATUS", "Unsupported complaint status."));
        }

        return complaintRepository.findById(complaintId)
                .<ResponseEntity<?>>map(complaint -> {
                    if (!canAccessComplaint(currentSession, complaint)) return complaintAccessDenied(currentSession, complaint);
                    String reply = body.resolutionNotes() == null ? "" : body.resolutionNotes().trim();
                    complaint.updateStatus(status, reply, currentSession.user().getId());
                    Complaint saved = complaintRepository.save(complaint);
                    if (saved.getMemberId() != null && !saved.getMemberId().isBlank() && !reply.isBlank()) {
                        complaintService.addStaffMessage(saved, currentSession.user().getId(), "status_update", "member_visible", reply);
                        memberRepository.findById(saved.getMemberId())
                                .ifPresent(member -> notificationService.notifyComplaintReply(member, saved.getId(), saved.getSubject(), reply));
                    }
                    auditService.record(
                            complaint.getTenantId(),
                            currentSession.user(),
                            "Updated complaint status to " + status,
                            "complaint",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(staffComplaintResponse(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "COMPLAINT_NOT_FOUND", "Complaint not found.")));
    }

    @PostMapping("/{complaintId}/workflow")
    ResponseEntity<?> workflowAction(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String complaintId,
            @Valid @RequestBody ComplaintWorkflowRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "complaints:manage")) {
            return authService.permissionRequired("complaints:manage");
        }
        String action = body.action().trim();
        if (!List.of("reply_member", "internal_note", "refer_treasurer", "escalate_chairman", "resolve", "close").contains(action)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_ACTION", "Unsupported complaint workflow action."));
        }
        return complaintRepository.findById(complaintId)
                .<ResponseEntity<?>>map(complaint -> {
                    if (!canAccessComplaint(currentSession, complaint)) return complaintAccessDenied(currentSession, complaint);
                    String message = body.message() == null ? "" : body.message().trim();
                    if (!"close".equals(action) && message.length() < 3) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "COMPLAINT_MESSAGE_REQUIRED", "Enter a response or note."));
                    }
                    ResponseEntity<ApiErrorResponse> routeError = routeComplaint(complaint, currentSession, action, message);
                    if (routeError != null) return routeError;
                    Complaint saved = complaintRepository.save(complaint);
                    String visibility = memberVisible(action) ? "member_visible" : "internal";
                    complaintService.addStaffMessage(saved, currentSession.user().getId(), action, visibility, message);
                    if (memberVisible(action) && saved.getMemberId() != null && !saved.getMemberId().isBlank() && !message.isBlank()) {
                        memberRepository.findById(saved.getMemberId())
                                .ifPresent(member -> notificationService.notifyComplaintReply(member, saved.getId(), saved.getSubject(), message));
                    }
                    auditService.record(
                            complaint.getTenantId(),
                            currentSession.user(),
                            "Complaint workflow action " + action,
                            "complaint",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(staffComplaintResponse(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "COMPLAINT_NOT_FOUND", "Complaint not found.")));
    }

    private ResponseEntity<ApiErrorResponse> routeComplaint(
            Complaint complaint,
            AuthService.CurrentSession currentSession,
            String action,
            String message) {
        String notes = appendComplaintNote(
                complaint.getResolutionNotes(),
                currentSession.user().getFullName(),
                labelForAction(action),
                message);
        switch (action) {
            case "reply_member", "internal_note" -> complaint.routeTo(complaint.getAssignedUserId(), "in_progress", notes);
            case "refer_treasurer" -> {
                String treasurerId = firstActiveRoleUser(complaint.getTenantId(), "Treasurer");
                if (treasurerId == null) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(ApiErrorResponse.of(409, "TREASURER_NOT_CONFIGURED", "No active treasurer is configured for this SACCO."));
                }
                complaint.routeTo(treasurerId, "referred_to_treasurer", notes);
            }
            case "escalate_chairman" -> {
                String chairmanId = firstActiveRoleUserLike(complaint.getTenantId(), "chairperson");
                if (chairmanId == null) {
                    chairmanId = firstActiveRoleUserLike(complaint.getTenantId(), "administrator");
                }
                if (chairmanId == null) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(ApiErrorResponse.of(409, "CHAIRMAN_NOT_CONFIGURED", "No active chairman or SACCO administrator is configured."));
                }
                complaint.routeTo(chairmanId, "escalated_to_chairman", notes);
            }
            case "resolve" -> complaint.updateStatus("resolved", notes, currentSession.user().getId());
            case "close" -> complaint.updateStatus("closed", notes, currentSession.user().getId());
            default -> {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_ACTION", "Unsupported complaint workflow action."));
            }
        }
        return null;
    }

    private String firstActiveRoleUser(String tenantId, String roleName) {
        List<String> users = jdbcTemplate.queryForList(
                """
                SELECT u.id
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
                JOIN roles r ON r.id = ur.role_id AND r.tenant_id = u.tenant_id
                WHERE u.tenant_id = ?
                  AND u.status = 'active'
                  AND LOWER(r.name) = LOWER(?)
                ORDER BY u.full_name ASC
                """,
                String.class,
                tenantId,
                roleName);
        return users.isEmpty() ? null : users.get(0);
    }

    private String firstActiveRoleUserLike(String tenantId, String roleNamePart) {
        List<String> users = jdbcTemplate.queryForList(
                """
                SELECT u.id
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id AND ur.tenant_id = u.tenant_id
                JOIN roles r ON r.id = ur.role_id AND r.tenant_id = u.tenant_id
                WHERE u.tenant_id = ?
                  AND u.status = 'active'
                  AND LOWER(r.name) LIKE ?
                ORDER BY u.full_name ASC
                """,
                String.class,
                tenantId,
                "%" + roleNamePart.toLowerCase(java.util.Locale.ROOT) + "%");
        return users.isEmpty() ? null : users.get(0);
    }

    private String appendComplaintNote(String existing, String actor, String actionLabel, String message) {
        String entry = java.time.Instant.now() + " - " + actor + " - " + actionLabel
                + (message == null || message.isBlank() ? "" : ": " + message.trim());
        return existing == null || existing.isBlank() ? entry : existing + "\n\n" + entry;
    }

    private String labelForAction(String action) {
        return switch (action) {
            case "reply_member" -> "Reply to member";
            case "internal_note" -> "Internal note";
            case "refer_treasurer" -> "Referred to treasurer";
            case "escalate_chairman" -> "Escalated to chairman";
            case "resolve" -> "Resolved";
            case "close" -> "Closed";
            default -> action;
        };
    }

    private boolean memberVisible(String action) {
        return List.of("reply_member", "resolve", "close").contains(action);
    }

    private ComplaintResponse staffComplaintResponse(Complaint complaint) {
        return ComplaintResponse.from(
                complaint,
                complaintMessageRepository.findByComplaintIdOrderByCreatedAtAsc(complaint.getId()));
    }

    private ResponseEntity<ApiErrorResponse> validateComplaintBody(String category, String channel, String priority) {
        if (category == null || !ComplaintService.CATEGORIES.contains(category.trim())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_CATEGORY", "Unsupported complaint category."));
        }
        if (channel != null && !channel.isBlank() && !ComplaintService.CHANNELS.contains(channel.trim())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_CHANNEL", "Unsupported complaint channel."));
        }
        if (priority != null && !priority.isBlank() && !ComplaintService.PRIORITIES.contains(priority.trim())) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_COMPLAINT_PRIORITY", "Unsupported complaint priority."));
        }
        return null;
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

    private boolean canAccessComplaint(AuthService.CurrentSession currentSession, Complaint complaint) {
        if (!canAccess(currentSession, complaint.getTenantId())) return false;
        if (complaint.getMemberId() == null || complaint.getMemberId().isBlank()) return true;
        Member member = memberRepository.findById(complaint.getMemberId()).orElse(null);
        return member != null && canAccessMemberBranch(currentSession, complaint.getTenantId(), member);
    }

    private boolean canAccessMemberBranch(AuthService.CurrentSession currentSession, String tenantId, Member member) {
        List<String> scopedBranchIds = branchScope(currentSession, tenantId);
        return scopedBranchIds.isEmpty() || scopedBranchIds.contains(member.getBranchId());
    }

    private List<String> branchScope(AuthService.CurrentSession currentSession, String tenantId) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return List.of();
        }
        return branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(tenantId, currentSession.user().getId()).stream()
                .map(Branch::getId)
                .toList();
    }

    private ResponseEntity<ApiErrorResponse> complaintAccessDenied(AuthService.CurrentSession currentSession, Complaint complaint) {
        return canAccess(currentSession, complaint.getTenantId()) ? branchAccessDenied() : tenantAccessDenied();
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access complaints for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> branchAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access member complaints outside assigned branch scope."));
    }

    record CreateComplaintRequest(
            String tenantId,
            String memberId,
            @NotBlank String category,
            @NotBlank String subject,
            String description,
            String channel,
            String priority,
            String assignedUserId) {
    }

    record UpdateComplaintStatusRequest(@NotBlank String status, String resolutionNotes) {
    }

    record ComplaintWorkflowRequest(@NotBlank String action, String message) {
    }
}
