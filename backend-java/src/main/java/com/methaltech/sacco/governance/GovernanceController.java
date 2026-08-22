package com.methaltech.sacco.governance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.branch.BranchRepository;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/api/v1/governance-meetings")
@RequiredArgsConstructor
class GovernanceController {

    private static final Set<String> MEETING_TYPES = Set.of("board", "agm", "credit_committee", "audit_committee", "management");
    private static final Set<String> MEETING_STATUSES = Set.of("scheduled", "completed", "cancelled");
    private static final Set<String> RESOLUTION_STATUSES = Set.of("open", "in_progress", "closed");

    private final GovernanceMeetingRepository meetingRepository;
    private final GovernanceResolutionRepository resolutionRepository;
    private final BranchRepository branchRepository;
    private final MemberRepository memberRepository;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping
    ResponseEntity<?> listMeetings(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "governance:view")) {
            return authService.permissionRequired("governance:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();
        if (tenantId != null && branchScoped(currentSession, tenantId)) return branchAccessDenied();

        List<GovernanceMeeting> meetings = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? meetingRepository.findAllByOrderByTenantIdAscScheduledAtDesc()
                : meetingRepository.findByTenantIdOrderByScheduledAtDesc(tenantId);
        return ResponseEntity.ok(ApiResponse.of(meetings.stream().map(this::meetingResponse).toList()));
    }

    @PostMapping
    ResponseEntity<?> createMeeting(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateGovernanceMeetingRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "governance:manage")) {
            return authService.permissionRequired("governance:manage");
        }

        String tenantId = tenantScope(currentSession, body.tenantId());
        if (tenantId == null) return tenantAccessDenied();
        if (branchScoped(currentSession, tenantId)) return branchAccessDenied();

        MeetingSetup setup = validateMeetingSetup(tenantId, body.meetingType(), body.status(), body.chairMemberId());
        if (setup.error() != null) return setup.error();

        GovernanceMeeting meeting = meetingRepository.save(new GovernanceMeeting(
                "meeting_" + UUID.randomUUID(),
                tenantId,
                body.title().trim(),
                setup.meetingType(),
                body.scheduledAt() == null ? Instant.now() : body.scheduledAt(),
                currentSession.user().getId(),
                setup.chairMemberId(),
                setup.status(),
                body.minutes() == null ? "" : body.minutes().trim(),
                currentSession.user().getId()));
        auditService.record(
                tenantId,
                currentSession.user(),
                "Created governance meeting " + meeting.getTitle(),
                "governance_meeting",
                meeting.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(meetingResponse(meeting)));
    }

    @PatchMapping("/{meetingId}")
    ResponseEntity<?> updateMeeting(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String meetingId,
            @Valid @RequestBody CreateGovernanceMeetingRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "governance:manage")) {
            return authService.permissionRequired("governance:manage");
        }

        return meetingRepository.findById(meetingId)
                .<ResponseEntity<?>>map(meeting -> {
                    if (!canAccess(currentSession, meeting.getTenantId())) return tenantAccessDenied();
                    if (branchScoped(currentSession, meeting.getTenantId())) return branchAccessDenied();
                    MeetingSetup setup = validateMeetingSetup(
                            meeting.getTenantId(),
                            body.meetingType(),
                            body.status(),
                            body.chairMemberId());
                    if (setup.error() != null) return setup.error();
                    meeting.update(
                            body.title().trim(),
                            setup.meetingType(),
                            body.scheduledAt() == null ? meeting.getScheduledAt() : body.scheduledAt(),
                            setup.chairMemberId(),
                            setup.status(),
                            body.minutes() == null ? "" : body.minutes().trim());
                    GovernanceMeeting saved = meetingRepository.save(meeting);
                    auditService.record(
                            meeting.getTenantId(),
                            currentSession.user(),
                            "Updated governance meeting " + saved.getTitle(),
                            "governance_meeting",
                            saved.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.ok(ApiResponse.of(meetingResponse(saved)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEETING_NOT_FOUND", "Governance meeting not found.")));
    }

    @PostMapping("/{meetingId}/resolutions")
    ResponseEntity<?> createResolution(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String meetingId,
            @Valid @RequestBody CreateGovernanceResolutionRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "governance:manage")) {
            return authService.permissionRequired("governance:manage");
        }

        return meetingRepository.findById(meetingId)
                .<ResponseEntity<?>>map(meeting -> {
                    if (!canAccess(currentSession, meeting.getTenantId())) return tenantAccessDenied();
                    if (branchScoped(currentSession, meeting.getTenantId())) return branchAccessDenied();
                    String status = body.status() == null || body.status().isBlank() ? "open" : body.status().trim();
                    if (!RESOLUTION_STATUSES.contains(status)) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "INVALID_RESOLUTION_STATUS", "Unsupported resolution status."));
                    }
                    String ownerName = body.ownerName() == null ? "" : body.ownerName().trim();
                    if (ownerName.isBlank()) {
                        return ResponseEntity.badRequest()
                                .body(ApiErrorResponse.of(400, "RESOLUTION_OWNER_REQUIRED", "Enter the responsible person for this resolution."));
                    }
                    String ownerTitle = body.ownerTitle() == null || body.ownerTitle().isBlank() ? "Responsible person" : body.ownerTitle().trim();
                    GovernanceResolution resolution = resolutionRepository.save(new GovernanceResolution(
                            "resolution_" + UUID.randomUUID(),
                            meeting.getTenantId(),
                            meeting.getId(),
                            body.title().trim(),
                            body.decision() == null ? "" : body.decision().trim(),
                            currentSession.user().getId(),
                            null,
                            ownerName,
                            ownerTitle,
                            body.dueDate(),
                            status,
                            currentSession.user().getId()));
                    meeting.touch();
                    meetingRepository.save(meeting);
                    auditService.record(
                            meeting.getTenantId(),
                            currentSession.user(),
                            "Recorded governance resolution " + resolution.getTitle(),
                            "governance_resolution",
                            resolution.getId(),
                            request.getRemoteAddr());
                    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(GovernanceResolutionResponse.from(resolution)));
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEETING_NOT_FOUND", "Governance meeting not found.")));
    }

    private GovernanceMeetingResponse meetingResponse(GovernanceMeeting meeting) {
        return GovernanceMeetingResponse.from(meeting, resolutionRepository.findByMeetingIdOrderByCreatedAtDesc(meeting.getId()));
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

    private boolean branchScoped(AuthService.CurrentSession currentSession, String tenantId) {
        if (authService.isPlatform(currentSession.user()) || authService.hasPermission(currentSession.user(), "tenants:manage")) {
            return false;
        }
        return !branchRepository.findByTenantIdAndManagerUserIdOrderByCodeAsc(tenantId, currentSession.user().getId()).isEmpty();
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access governance records for another tenant."));
    }

    private ResponseEntity<ApiErrorResponse> branchAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "BRANCH_ACCESS_DENIED", "Cannot access SACCO-wide governance records from a branch-scoped account."));
    }

    private MeetingSetup validateMeetingSetup(String tenantId, String requestedMeetingType, String requestedStatus, String requestedChairMemberId) {
        String meetingType = requestedMeetingType == null || requestedMeetingType.isBlank()
                ? "management"
                : requestedMeetingType.trim();
        if (!MEETING_TYPES.contains(meetingType)) {
            return MeetingSetup.error(ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_MEETING_TYPE", "Unsupported meeting type.")));
        }
        String status = requestedStatus == null || requestedStatus.isBlank() ? "scheduled" : requestedStatus.trim();
        if (!MEETING_STATUSES.contains(status)) status = "scheduled";
        String chairMemberId = requestedChairMemberId == null ? "" : requestedChairMemberId.trim();
        if (chairMemberId.isBlank()) {
            return MeetingSetup.error(ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "CHAIR_MEMBER_REQUIRED", "Select a SACCO member as meeting chairperson.")));
        }
        Member chairMember = memberRepository.findById(chairMemberId).orElse(null);
        if (chairMember == null || !tenantId.equals(chairMember.getTenantId())) {
            return MeetingSetup.error(ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "INVALID_CHAIR_MEMBER", "The selected chairperson must be a member of this SACCO.")));
        }
        return new MeetingSetup(meetingType, status, chairMemberId, null);
    }

    record CreateGovernanceMeetingRequest(
            String tenantId,
            @NotBlank String title,
            String meetingType,
            Instant scheduledAt,
            String chairUserId,
            String chairMemberId,
            String status,
            String minutes) {
    }

    record MeetingSetup(
            String meetingType,
            String status,
            String chairMemberId,
            ResponseEntity<ApiErrorResponse> error) {
        static MeetingSetup error(ResponseEntity<ApiErrorResponse> error) {
            return new MeetingSetup(null, null, null, error);
        }
    }

    record CreateGovernanceResolutionRequest(
            @NotBlank String title,
            String decision,
            String ownerUserId,
            String ownerMemberId,
            String ownerName,
            String ownerTitle,
            LocalDate dueDate,
            String status) {
    }
}
