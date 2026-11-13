package com.methaltech.sacco.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.accounting.IntegrationJobRunHistoryService;
import com.methaltech.sacco.accounting.MobileMoneyProviderEvidence;
import com.methaltech.sacco.accounting.MobileMoneyProviderEvidenceService;
import com.methaltech.sacco.accounting.MobileMoneyReconciliationJob;
import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import com.methaltech.sacco.member.Member;
import com.methaltech.sacco.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class NotificationControllerTest {

    private final NotificationDeliveryRepository deliveryRepository = mock(NotificationDeliveryRepository.class);
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final NotificationBroadcastDispatcher broadcastDispatcher = mock(NotificationBroadcastDispatcher.class);
    private final NotificationProvider provider = mock(NotificationProvider.class);
    private final MobileMoneyProviderEvidenceService evidenceService = mock(MobileMoneyProviderEvidenceService.class);
    private final IntegrationJobRunHistoryService runHistoryService = mock(IntegrationJobRunHistoryService.class);
    private final MobileMoneyReconciliationJob reconciliationJob = mock(MobileMoneyReconciliationJob.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final AfroSmsCreditService afroSmsCreditService = mock(AfroSmsCreditService.class);
    private final SmsWalletService smsWalletService = mock(SmsWalletService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User saccoUser = user("user_one", "tenant_one", "SACCO User");
    private final User platformUser = user("platform_one", "tenant_platform", "Platform User");
    private final NotificationController controller = new NotificationController(deliveryRepository,
            notificationRepository, memberRepository, notificationService, broadcastDispatcher, List.of(provider),
            evidenceService, runHistoryService, reconciliationJob, authService, auditService,
            afroSmsCreditService, smsWalletService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(authService.isPlatform(platformUser)).thenReturn(true);
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(deliveryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(provider.status()).thenReturn(NotificationProviderStatusResponse.ready(
                "email", "smtp", null, "Configured"));
        when(afroSmsCreditService.platformCreditStatus()).thenReturn(
                NotificationProviderStatusResponse.ready("sms", "afrosms", "100", "Available"));
    }

    @Test
    void deliveriesEnforceAuthenticationPermissionAndTenantScope() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED,
                controller.listDeliveries(null, null, null, null, null, null).getStatusCode());
        when(authService.currentSession("Bearer denied")).thenReturn(session(saccoUser));
        assertEquals(HttpStatus.FORBIDDEN,
                controller.listDeliveries("Bearer denied", null, null, null, null, null).getStatusCode());

        allow("Bearer view", saccoUser, "notifications:view");
        assertError(controller.listDeliveries("Bearer view", "tenant_two", null, null, null, null),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        Notification notification = notification("note_one", "tenant_one", "user_one", "Welcome", "Message");
        NotificationDelivery delivery = delivery("delivery_one", notification, NotificationSendResult.sent("ref", "Sent"));
        when(deliveryRepository.findByTenantIdOrderByCreatedAtDesc("tenant_one")).thenReturn(List.of(delivery));
        when(notificationRepository.findAllById(List.of("note_one"))).thenReturn(List.of(notification));
        ResponseEntity<?> response = controller.listDeliveries("Bearer view", null, null, null, null, null);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, ((List<?>) ((ApiResponse<?>) response.getBody()).data()).size());
    }

    @Test
    void platformDeliveryPaginationAndProviderEvidenceAreOperational() {
        allow("Bearer platform", platformUser, "notifications:view");
        Notification notification = notification("note_one", "tenant_one", null, "Alert", "Review");
        NotificationDelivery delivery = delivery("delivery_one", notification, NotificationSendResult.failed("Failed"));
        when(deliveryRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(delivery)));
        when(notificationRepository.findAllById(List.of("note_one"))).thenReturn(List.of(notification));
        ResponseEntity<?> paged = controller.listDeliveries(
                "Bearer platform", null, "status", "asc", 0, 20);
        assertEquals(1, ((PagedResponse<?>) paged.getBody()).data().size());

        when(deliveryRepository.findAllByOrderByTenantIdAscCreatedAtDesc()).thenReturn(List.of(delivery));
        MobileMoneyProviderEvidence evidence = mock(MobileMoneyProviderEvidence.class);
        when(evidence.evidenceStatus()).thenReturn("review");
        when(evidenceService.build(null, true)).thenReturn(evidence);
        ResponseEntity<?> providerEvidence = controller.providerEvidence("Bearer platform", null);
        assertEquals(HttpStatus.OK, providerEvidence.getStatusCode());
        assertEquals(2, ((List<?>) ((ApiResponse<?>) controller.providerStatus("Bearer platform").getBody()).data()).size());
    }

    @Test
    void providerJobsCanBeListedAndReconciliationAudited() {
        allow("Bearer view", saccoUser, "notifications:view");
        assertEquals(HttpStatus.OK, controller.providerJobRuns("Bearer view", "momo").getStatusCode());

        allow("Bearer manage", saccoUser, "notifications:manage");
        ResponseEntity<?> response = controller.runMobileMoneyReconciliation("Bearer manage", request);
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        verify(reconciliationJob).reconcilePendingRequests();
        verify(auditService).record("tenant_one", saccoUser, "Ran mobile-money reconciliation manually",
                "integration_job", "mobile_money_reconciliation", "127.0.0.1");
    }

    @Test
    void acknowledgeAndRetryEnforceOwnershipAndDeliveryState() {
        allow("Bearer view", saccoUser, "notifications:view");
        assertError(controller.acknowledge("Bearer view", "missing", request),
                HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND");

        Notification foreign = notification("foreign", "tenant_two", null, "Foreign", "Message");
        when(notificationRepository.findById("foreign")).thenReturn(Optional.of(foreign));
        assertError(controller.acknowledge("Bearer view", "foreign", request),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        Notification own = notification("own", "tenant_one", "user_one", "Own", "Message");
        when(notificationRepository.findById("own")).thenReturn(Optional.of(own));
        assertEquals(HttpStatus.OK, controller.acknowledge("Bearer view", "own", request).getStatusCode());
        assertEquals("read", own.getStatus());

        allow("Bearer manage", saccoUser, "notifications:manage");
        assertError(controller.retryDelivery("Bearer manage", "missing", request),
                HttpStatus.NOT_FOUND, "NOTIFICATION_DELIVERY_NOT_FOUND");
        NotificationDelivery sent = delivery("sent", own, NotificationSendResult.sent("ref", "Sent"));
        when(deliveryRepository.findById("sent")).thenReturn(Optional.of(sent));
        assertError(controller.retryDelivery("Bearer manage", "sent", request),
                HttpStatus.CONFLICT, "DELIVERY_NOT_FAILED");

        NotificationDelivery failed = delivery("failed", own, NotificationSendResult.failed("Failed"));
        NotificationDelivery retry = delivery("retry", own, NotificationSendResult.sent("ref2", "Sent"));
        when(deliveryRepository.findById("failed")).thenReturn(Optional.of(failed));
        when(notificationService.retryDelivery(failed, own)).thenReturn(retry);
        assertEquals(HttpStatus.CREATED, controller.retryDelivery("Bearer manage", "failed", request).getStatusCode());
    }

    @Test
    void bulkAndPersonalInboxAcknowledgementsRespectOwnership() {
        allow("Bearer view", saccoUser, "notifications:view");
        assertError(controller.acknowledgeBulk("Bearer view", null, request),
                HttpStatus.BAD_REQUEST, "NOTIFICATION_IDS_REQUIRED");

        Notification own = notification("own", "tenant_one", "user_one", "Own", "Message");
        Notification foreign = notification("foreign", "tenant_two", "other", "Foreign", "Message");
        when(notificationRepository.findAllById(List.of("own", "foreign"))).thenReturn(List.of(own, foreign));
        assertError(controller.acknowledgeBulk("Bearer view",
                new NotificationController.BulkAcknowledgeRequest(List.of(" own ", "foreign", "own")), request),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        when(notificationRepository.findAllById(List.of("own"))).thenReturn(List.of(own));
        assertEquals(HttpStatus.OK, controller.acknowledgeBulk("Bearer view",
                new NotificationController.BulkAcknowledgeRequest(List.of("own")), request).getStatusCode());

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc("user_one")).thenReturn(List.of(own));
        assertEquals(1, ((List<?>) ((ApiResponse<?>) controller.inbox("Bearer view").getBody()).data()).size());
        assertEquals(HttpStatus.NOT_FOUND,
                controller.markInboxRead("Bearer view", "foreign").getStatusCode());
        when(notificationRepository.findById("own")).thenReturn(Optional.of(own));
        assertEquals(HttpStatus.OK, controller.markInboxRead("Bearer view", "own").getStatusCode());
        assertEquals(HttpStatus.OK, controller.markInboxAllRead("Bearer view").getStatusCode());
    }

    @Test
    void messagesFilterByCategoryAndSearchForTenantAndPlatform() {
        allow("Bearer view", saccoUser, "notifications:view");
        Notification matching = notification("match", "tenant_one", null, "loan_application_submitted", "Loan approved", "Ready");
        Notification other = notification("other", "tenant_one", null, "system", "Maintenance", "Tonight");
        when(notificationRepository.findByTenantIdOrderByCreatedAtDesc("tenant_one"))
                .thenReturn(List.of(matching, other));
        ResponseEntity<?> response = controller.listMessages(
                "Bearer view", null, "loan", "approved", null, null);
        assertEquals(1, ((List<?>) ((ApiResponse<?>) response.getBody()).data()).size());

        allow("Bearer platform", platformUser, "notifications:view");
        when(notificationRepository.findAll(any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(matching, other)));
        ResponseEntity<?> paged = controller.listMessages(
                "Bearer platform", null, "all", " ", 0, 10);
        assertEquals(2, ((PagedResponse<?>) paged.getBody()).data().size());
    }

    @Test
    void broadcastsValidateContentRecipientsAndDispatchAsynchronously() {
        allow("Bearer manage", saccoUser, "notifications:manage");
        assertError(controller.broadcastMessage("Bearer manage", null, request),
                HttpStatus.BAD_REQUEST, "MESSAGE_CONTENT_REQUIRED");

        NotificationController.BroadcastMessageRequest body =
                new NotificationController.BroadcastMessageRequest(null, " Notice ", " Message ", List.of());
        assertError(controller.broadcastMessage("Bearer manage", body, request),
                HttpStatus.BAD_REQUEST, "NO_RECIPIENTS");

        Member recipient = member("member_one", "tenant_one", "+256700000001");
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_one")).thenReturn(List.of(recipient));
        ResponseEntity<?> response = controller.broadcastMessage("Bearer manage", body, request);
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        verify(broadcastDispatcher).dispatch("tenant_one", List.of(recipient), "Notice", "Message");
    }

    @Test
    void smsBroadcastsValidatePhonesWalletBalanceAndSuccessfulDebit() {
        allow("Bearer manage", saccoUser, "notifications:manage");
        NotificationController.BroadcastMessageRequest empty =
                new NotificationController.BroadcastMessageRequest(null, null, " ", List.of());
        assertError(controller.sendSmsMessage("Bearer manage", empty, request),
                HttpStatus.BAD_REQUEST, "SMS_MESSAGE_REQUIRED");

        Member noPhone = member("member_one", "tenant_one", " ");
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_one")).thenReturn(List.of(noPhone));
        NotificationController.BroadcastMessageRequest body =
                new NotificationController.BroadcastMessageRequest(null, null, "Hello members", List.of());
        assertError(controller.sendSmsMessage("Bearer manage", body, request),
                HttpStatus.BAD_REQUEST, "NO_SMS_RECIPIENTS");

        Member recipient = member("member_two", "tenant_one", "+256700000002");
        when(memberRepository.findByTenantIdOrderByMembershipNoAsc("tenant_one")).thenReturn(List.of(recipient));
        doThrow(new IllegalStateException("No credits")).when(smsWalletService)
                .debit(eq("tenant_one"), any(Integer.class), any(), any());
        assertError(controller.sendSmsMessage("Bearer manage", body, request),
                HttpStatus.CONFLICT, "INSUFFICIENT_SMS_BALANCE");

        org.mockito.Mockito.reset(smsWalletService);
        Notification sent = notification("sms_one", "tenant_one", null, "broadcast", "SACCO message", "Hello members");
        when(notificationService.notifySmsBroadcast("tenant_one", List.of(recipient), "SACCO message", "Hello members"))
                .thenReturn(List.of(sent));
        when(smsWalletService.balance("tenant_one")).thenReturn(9);
        ResponseEntity<?> response = controller.sendSmsMessage("Bearer manage", body, request);
        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        NotificationController.SmsBroadcastResponse result =
                (NotificationController.SmsBroadcastResponse) ((ApiResponse<?>) response.getBody()).data();
        assertEquals(1, result.recipients());
        assertTrue(result.smsCreditsUsed() >= 1);
    }

    private Notification notification(String id, String tenantId, String userId, String title, String body) {
        return notification(id, tenantId, userId, "system", title, body);
    }

    private Notification notification(String id, String tenantId, String userId,
            String eventType, String title, String body) {
        return new Notification(id, tenantId, null, userId, eventType, title, body, "system", id);
    }

    private NotificationDelivery delivery(String id, Notification notification, NotificationSendResult result) {
        return new NotificationDelivery(id, notification.getTenantId(), notification.getId(), null,
                notification.getUserId(), "email", "smtp", "recipient@example.com", result, notification.getBody());
    }

    private Member member(String id, String tenantId, String phone) {
        Member member = mock(Member.class);
        when(member.getId()).thenReturn(id);
        when(member.getTenantId()).thenReturn(tenantId);
        when(member.getPhone()).thenReturn(phone);
        return member;
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

    private User user(String id, String tenantId, String name) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getTenantId()).thenReturn(tenantId);
        when(user.getFullName()).thenReturn(name);
        return user;
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
