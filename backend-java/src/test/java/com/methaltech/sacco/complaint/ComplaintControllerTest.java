package com.methaltech.sacco.complaint;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import com.methaltech.sacco.notification.NotificationService;
import com.methaltech.sacco.branch.BranchRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

class ComplaintControllerTest {

    private final ComplaintRepository repository = mock(ComplaintRepository.class);
    private final ComplaintService service = mock(ComplaintService.class);
    private final ComplaintMessageRepository messageRepository = mock(ComplaintMessageRepository.class);
    private final ComplaintMessageEnricher enricher = mock(ComplaintMessageEnricher.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final BranchRepository branchRepository = mock(BranchRepository.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User user = user();
    private final ComplaintController controller = new ComplaintController(repository, service, messageRepository,
            enricher, memberRepository, branchRepository, authService, auditService, notificationService, jdbcTemplate);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(enricher.enrich(any())).thenReturn(List.of());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(authService.permissionRequired(any())).thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Required")));
        when(authService.hasPermission(user, "tenants:manage")).thenReturn(true);
        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(member));
    }

    @Test
    void listRequiresPermissionScopeAndFiltersStatus() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, controller.listComplaints(null, null, null, null, null).getStatusCode());
        allow("Bearer view", "complaints:view");
        assertError(controller.listComplaints("Bearer view", "tenant_two", null, null, null),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");
        Complaint open = complaint("open", "open");
        Complaint closed = complaint("closed", "closed");
        when(repository.findByTenantIdOrderByCreatedAtDesc("tenant_one")).thenReturn(List.of(open, closed));
        assertEquals(HttpStatus.OK, controller.listComplaints("Bearer view", null, "open", null, null).getStatusCode());
        assertEquals(HttpStatus.OK, controller.listComplaints("Bearer view", null, null, 0, 20).getStatusCode());
    }

    @Test
    void createValidatesEnumsMemberAndAuditsSuccess() {
        allow("Bearer manage", "complaints:manage");
        ComplaintController.CreateComplaintRequest invalid = new ComplaintController.CreateComplaintRequest(
                null, null, "invalid", "Subject", null, null, null, null);
        assertError(controller.createComplaint("Bearer manage", invalid, request),
                HttpStatus.BAD_REQUEST, "INVALID_COMPLAINT_CATEGORY");

        ComplaintController.CreateComplaintRequest memberBody = new ComplaintController.CreateComplaintRequest(
                null, "missing", "service", "Subject", "Description", "branch", "medium", null);
        when(memberRepository.findById("missing")).thenReturn(Optional.empty());
        assertError(controller.createComplaint("Bearer manage", memberBody, request),
                HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND");

        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(member));
        Complaint saved = complaint("complaint_one", "open");
        when(service.createStaffComplaint("tenant_one", "member_one", "service", "Subject", "Description",
                "branch", "medium", "user_one", "user_one")).thenReturn(saved);
        ComplaintController.CreateComplaintRequest valid = new ComplaintController.CreateComplaintRequest(
                null, "member_one", "service", "Subject", "Description", "branch", "medium", null);
        assertEquals(HttpStatus.CREATED, controller.createComplaint("Bearer manage", valid, request).getStatusCode());
        verify(auditService).record("tenant_one", user, "Captured complaint Subject", "complaint",
                "complaint_one", "127.0.0.1");
    }

    @Test
    void statusUpdatesValidateRoutePermissionAndNotifyMember() {
        allow("Bearer manage", "complaints:manage");
        assertError(controller.updateComplaintStatus("Bearer manage", "one",
                new ComplaintController.UpdateComplaintStatusRequest("invalid", null), request),
                HttpStatus.BAD_REQUEST, "INVALID_COMPLAINT_STATUS");
        assertEquals(HttpStatus.FORBIDDEN, controller.updateComplaintStatus("Bearer manage", "one",
                new ComplaintController.UpdateComplaintStatusRequest("resolved", "Done"), request).getStatusCode());

        when(authService.hasPermission(user, "complaints:route")).thenReturn(true);
        assertError(controller.updateComplaintStatus("Bearer manage", "missing",
                new ComplaintController.UpdateComplaintStatusRequest("resolved", "Done"), request),
                HttpStatus.NOT_FOUND, "COMPLAINT_NOT_FOUND");
        Complaint complaint = complaint("one", "open");
        when(repository.findById("one")).thenReturn(Optional.of(complaint));
        Member member = mock(Member.class);
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(member));
        assertEquals(HttpStatus.OK, controller.updateComplaintStatus("Bearer manage", "one",
                new ComplaintController.UpdateComplaintStatusRequest("resolved", " Done "), request).getStatusCode());
        verify(notificationService).notifyComplaintReply(member, "one", "Subject", "Done");
    }

    @Test
    void workflowValidatesActionsMessagesAndRoutesReplies() {
        allow("Bearer manage", "complaints:manage");
        assertError(controller.workflowAction("Bearer manage", "one",
                new ComplaintController.ComplaintWorkflowRequest("invalid", "Message"), request),
                HttpStatus.BAD_REQUEST, "INVALID_COMPLAINT_ACTION");
        Complaint complaint = complaint("one", "open");
        when(repository.findById("one")).thenReturn(Optional.of(complaint));
        assertError(controller.workflowAction("Bearer manage", "one",
                new ComplaintController.ComplaintWorkflowRequest("reply_member", "x"), request),
                HttpStatus.BAD_REQUEST, "COMPLAINT_MESSAGE_REQUIRED");
        assertEquals(HttpStatus.OK, controller.workflowAction("Bearer manage", "one",
                new ComplaintController.ComplaintWorkflowRequest("reply_member", "We are reviewing"), request).getStatusCode());
        verify(service).addStaffMessage(complaint, "user_one", "reply_member", "member_visible", "We are reviewing");
    }

    @Test
    void workflowRoutesToTreasurerAndChairperson() {
        allow("Bearer manage", "complaints:manage");
        when(authService.hasPermission(user, "complaints:route")).thenReturn(true);
        Complaint treasurerComplaint = complaint("treasurer_case", "open");
        Complaint chairComplaint = complaint("chair_case", "open");
        when(repository.findById("treasurer_case")).thenReturn(Optional.of(treasurerComplaint));
        when(repository.findById("chair_case")).thenReturn(Optional.of(chairComplaint));
        when(jdbcTemplate.queryForList(anyString(), eq(String.class), eq("tenant_one"), any()))
                .thenReturn(List.of("treasurer_user"), List.of("chair_user"));

        assertEquals(HttpStatus.OK, controller.workflowAction("Bearer manage", "treasurer_case",
                new ComplaintController.ComplaintWorkflowRequest("refer_treasurer", "Please review"), request).getStatusCode());
        assertEquals("referred_to_treasurer", treasurerComplaint.getStatus());
        assertEquals("treasurer_user", treasurerComplaint.getAssignedUserId());

        assertEquals(HttpStatus.OK, controller.workflowAction("Bearer manage", "chair_case",
                new ComplaintController.ComplaintWorkflowRequest("escalate_chairman", "Please decide"), request).getStatusCode());
        assertEquals("escalated_to_chairman", chairComplaint.getStatus());
        assertEquals("chair_user", chairComplaint.getAssignedUserId());
    }

    private Complaint complaint(String id, String status) {
        return new Complaint(id, "tenant_one", "member_one", "service", "Subject", "Description",
                "branch", "medium", status, "user_one", "user_one", null);
    }

    private void allow(String token, String permission) {
        when(authService.currentSession(token)).thenReturn(new AuthService.CurrentSession(null, user));
        when(authService.hasPermission(user, permission)).thenReturn(true);
    }

    private void stubAuthErrors() {
        when(authService.authRequired()).thenReturn(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "Required")));
        when(authService.permissionRequired(any())).thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Required")));
    }

    private User user() {
        User value = mock(User.class);
        when(value.getId()).thenReturn("user_one");
        when(value.getTenantId()).thenReturn("tenant_one");
        when(value.getFullName()).thenReturn("Secretary");
        return value;
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
