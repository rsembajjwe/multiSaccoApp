package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.identity.User;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class MemberSubscriptionControllerTest {

    private final MemberSubscriptionRepository repository = mock(MemberSubscriptionRepository.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);
    private final MemberSubscriptionService service = mock(MemberSubscriptionService.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User user = user("user_one", "tenant_one");
    private final User platform = user("platform", "tenant_platform");
    private final MemberSubscriptionController controller = new MemberSubscriptionController(repository,
            memberRepository, service, authService, auditService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(authService.isPlatform(platform)).thenReturn(true);
    }

    @Test
    void listAndSummaryEnforceScopeAndSupportStatusPagination() {
        stubAuthErrors();
        assertEquals(HttpStatus.UNAUTHORIZED, controller.list(null, null, null, null, null).getStatusCode());
        allow("Bearer view", user, "member-subscription:view");
        assertError(controller.list("Bearer view", "tenant_two", null, null, null),
                HttpStatus.FORBIDDEN, "TENANT_REQUIRED");

        MemberSubscription subscription = subscription("sub_one", "tenant_one", "100");
        when(repository.findByTenantIdOrderByCreatedAtDesc("tenant_one")).thenReturn(List.of(subscription));
        assertEquals(HttpStatus.OK, controller.list("Bearer view", null, null, null, null).getStatusCode());
        verify(service).ensureMandatorySubscriptions("tenant_one");

        when(repository.findByTenantIdAndStatus(org.mockito.ArgumentMatchers.eq("tenant_one"),
                org.mockito.ArgumentMatchers.eq("active"), any())).thenReturn(new PageImpl<>(List.of(subscription)));
        assertEquals(HttpStatus.OK, controller.list("Bearer view", null, "paid", 0, 20).getStatusCode());

        when(repository.countByTenantId("tenant_one")).thenReturn(7L);
        when(repository.countByTenantIdAndStatus("tenant_one", "active")).thenReturn(4L);
        MemberSubscriptionController.SubscriptionSummaryResponse summary =
                (MemberSubscriptionController.SubscriptionSummaryResponse)
                        ((ApiResponse<?>) controller.summary("Bearer view", null).getBody()).data();
        assertEquals(4, summary.paid());
        assertEquals(3, summary.unpaid());
    }

    @Test
    void assignmentValidatesInputMemberTenantAndAuditsSuccess() {
        allow("Bearer manage", user, "member-subscription:manage");
        assertError(controller.assign("Bearer manage", null, request),
                HttpStatus.BAD_REQUEST, "MEMBERSHIP_INPUT_INVALID");
        MemberSubscriptionController.AssignRequest body = new MemberSubscriptionController.AssignRequest(
                null, "member_one", "Annual", new BigDecimal("100"), "annual");
        assertError(controller.assign("Bearer manage", body, request),
                HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND");

        Member member = mock(Member.class);
        when(member.getId()).thenReturn("member_one");
        when(member.getTenantId()).thenReturn("tenant_one");
        when(member.getFullName()).thenReturn("Member One");
        when(memberRepository.findById("member_one")).thenReturn(Optional.of(member));
        MemberSubscription saved = subscription("sub_one", "tenant_one", "100");
        when(service.assign("tenant_one", "member_one", "Member app annual access", new BigDecimal("5000"), "annual"))
                .thenReturn(saved);
        assertEquals(HttpStatus.CREATED, controller.assign("Bearer manage", body, request).getStatusCode());
        verify(auditService).record(org.mockito.ArgumentMatchers.eq("tenant_one"),
                org.mockito.ArgumentMatchers.eq(user), any(), org.mockito.ArgumentMatchers.eq("member_subscription"),
                org.mockito.ArgumentMatchers.eq("sub_one"), org.mockito.ArgumentMatchers.eq("127.0.0.1"));
    }

    @Test
    void paymentChecksExistenceTenantAndAmount() {
        allow("Bearer manage", user, "member-subscription:manage");
        assertError(controller.recordPayment("Bearer manage", "missing",
                new MemberSubscriptionController.PaymentRequest(BigDecimal.ONE, "cash"), request),
                HttpStatus.NOT_FOUND, "MEMBERSHIP_NOT_FOUND");

        MemberSubscription foreign = subscription("foreign", "tenant_two", "100");
        when(repository.findById("foreign")).thenReturn(Optional.of(foreign));
        assertError(controller.recordPayment("Bearer manage", "foreign",
                new MemberSubscriptionController.PaymentRequest(BigDecimal.ONE, "cash"), request),
                HttpStatus.FORBIDDEN, "TENANT_ACCESS_DENIED");

        MemberSubscription own = subscription("own", "tenant_one", "100");
        when(repository.findById("own")).thenReturn(Optional.of(own));
        assertError(controller.recordPayment("Bearer manage", "own",
                new MemberSubscriptionController.PaymentRequest(BigDecimal.ZERO, "cash"), request),
                HttpStatus.BAD_REQUEST, "PAYMENT_AMOUNT_INVALID");
        when(service.recordPayment(own, new BigDecimal("100"))).thenReturn(own);
        assertEquals(HttpStatus.OK, controller.recordPayment("Bearer manage", "own",
                new MemberSubscriptionController.PaymentRequest(new BigDecimal("100"), "cash"), request).getStatusCode());
    }

    @Test
    void paymentRecordsSuccessfulAndDomainConflictOutcomes() {
        allow("Bearer manage", user, "member-subscription:manage");
        MemberSubscription own = subscription("own", "tenant_one", "100");
        when(repository.findById("own")).thenReturn(Optional.of(own));
        when(service.recordPayment(own, new BigDecimal("100")))
                .thenThrow(new IllegalStateException("Member subscription is already fully paid for the current cycle."))
                .thenReturn(own);
        assertError(controller.recordPayment("Bearer manage", "own",
                new MemberSubscriptionController.PaymentRequest(new BigDecimal("100"), "cash"), request),
                HttpStatus.CONFLICT, "MEMBERSHIP_ALREADY_PAID");
        assertEquals(HttpStatus.OK, controller.recordPayment("Bearer manage", "own",
                new MemberSubscriptionController.PaymentRequest(new BigDecimal("100"), "cash"), request).getStatusCode());
    }

    @Test
    void bulkPaymentsValidateSelectionAllocationAndPersistPayableRows() {
        allow("Bearer manage", user, "member-subscription:manage");
        assertError(controller.recordBulkPayment("Bearer manage", null, request),
                HttpStatus.BAD_REQUEST, "NO_MEMBERS_SELECTED");
        assertError(controller.recordBulkPayment("Bearer manage",
                new MemberSubscriptionController.BulkPaymentRequest(BigDecimal.ZERO, List.of("one"), "cash", null), request),
                HttpStatus.BAD_REQUEST, "PAYMENT_AMOUNT_INVALID");

        MemberSubscription one = subscription("one", "tenant_one", "60");
        MemberSubscription two = subscription("two", "tenant_one", "40");
        when(repository.findById("one")).thenReturn(Optional.of(one));
        when(repository.findById("two")).thenReturn(Optional.of(two));
        assertError(controller.recordBulkPayment("Bearer manage",
                new MemberSubscriptionController.BulkPaymentRequest(new BigDecimal("50"), List.of("one", "two"), "cash", null), request),
                HttpStatus.CONFLICT, "BULK_PAYMENT_OVER_ALLOCATED");

        when(service.recordPayment(any(), any())).thenAnswer(invocation -> invocation.getArgument(0));
        ResponseEntity<?> response = controller.recordBulkPayment("Bearer manage",
                new MemberSubscriptionController.BulkPaymentRequest(new BigDecimal("100"), List.of("one", "two"), "cash", null), request);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        MemberSubscriptionController.BulkPaymentResponse result =
                (MemberSubscriptionController.BulkPaymentResponse) ((ApiResponse<?>) response.getBody()).data();
        assertEquals(2, result.paidMembers());
    }

    private MemberSubscription subscription(String id, String tenantId, String amount) {
        return new MemberSubscription(id, tenantId, "member_one", "Annual", new BigDecimal(amount),
                "annual", LocalDate.now(), LocalDate.now().plusYears(1));
    }

    private void allow(String token, User currentUser, String permission) {
        when(authService.currentSession(token)).thenReturn(new AuthService.CurrentSession(null, currentUser));
        when(authService.hasPermission(currentUser, permission)).thenReturn(true);
    }

    private void stubAuthErrors() {
        when(authService.authRequired()).thenReturn(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "Required")));
        when(authService.permissionRequired(any())).thenReturn(ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Required")));
    }

    private User user(String id, String tenantId) {
        User value = mock(User.class);
        when(value.getId()).thenReturn(id);
        when(value.getTenantId()).thenReturn(tenantId);
        return value;
    }

    private void assertError(ResponseEntity<?> response, HttpStatus status, String code) {
        assertEquals(status, response.getStatusCode());
        assertEquals(code, ((ApiErrorResponse) response.getBody()).error().code());
    }
}
