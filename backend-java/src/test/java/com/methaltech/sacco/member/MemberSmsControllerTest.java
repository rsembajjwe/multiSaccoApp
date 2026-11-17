package com.methaltech.sacco.member;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.notification.MemberSmsDeliveryService;
import com.methaltech.sacco.notification.MemberSmsWalletService;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class MemberSmsControllerTest {

    private MemberAuthService authService;
    private MemberSmsWalletService walletService;
    private MemberSmsDeliveryService deliveryService;
    private AuditService auditService;
    private MemberSmsController controller;
    private Member member;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        authService = mock(MemberAuthService.class);
        walletService = mock(MemberSmsWalletService.class);
        deliveryService = mock(MemberSmsDeliveryService.class);
        auditService = mock(AuditService.class);
        member = mock(Member.class);
        request = mock(HttpServletRequest.class);
        when(member.getId()).thenReturn("member_1");
        when(member.getTenantId()).thenReturn("tenant_green");
        when(member.getFullName()).thenReturn("Test Member");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(authService.currentSession("Bearer token"))
                .thenReturn(new MemberAuthService.CurrentMemberSession(null, member));
        controller = new MemberSmsController(authService, walletService, deliveryService, auditService);
    }

    @Test
    void walletRequiresAuthenticationAndReturnsMemberBalance() {
        ResponseEntity<ApiErrorResponse> unauthorized = ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        when(authService.authRequired()).thenReturn(unauthorized);
        assertEquals(HttpStatus.UNAUTHORIZED, controller.wallet(null).getStatusCode());

        when(walletService.balance("tenant_green", "member_1")).thenReturn(7);
        when(walletService.smsRate()).thenReturn(new BigDecimal("35.00"));
        assertEquals(HttpStatus.OK, controller.wallet("Bearer token").getStatusCode());
    }

    @Test
    void broadcastValidatesMessageRecipientsAndAvailableCredits() {
        assertEquals(HttpStatus.BAD_REQUEST, controller.broadcast(
                "Bearer token", new MemberSmsController.BroadcastRequest(List.of("0700000001"), "  "), request).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, controller.broadcast(
                "Bearer token", new MemberSmsController.BroadcastRequest(List.of("not-a-phone"), "Hello"), request).getStatusCode());

        when(walletService.balance("tenant_green", "member_1")).thenReturn(0);
        assertEquals(HttpStatus.CONFLICT, controller.broadcast(
                "Bearer token", new MemberSmsController.BroadcastRequest(List.of("0700000001"), "Hello"), request).getStatusCode());
        verify(walletService, never()).debit(eq("tenant_green"), eq("member_1"), eq(1), anyString(), anyString());
    }

    @Test
    void broadcastDebitsSuccessfulSegmentsAndRefundsFailedDeliveries() {
        when(walletService.balance("tenant_green", "member_1")).thenReturn(5, 4);
        when(deliveryService.send("+256700000001", "Hello")).thenReturn(true);
        when(deliveryService.send("+256700000002", "Hello")).thenReturn(false);

        ResponseEntity<?> response = controller.broadcast("Bearer token",
                new MemberSmsController.BroadcastRequest(
                        List.of("0700000001", "+256700000002", "0700000001", "invalid"), " Hello "),
                request);

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        verify(walletService).debit(eq("tenant_green"), eq("member_1"), eq(2), anyString(), eq("Member contact SMS broadcast"));
        verify(walletService).refund(eq("tenant_green"), eq("member_1"), eq(1), anyString(), eq("Refund for failed member SMS delivery"));
        verify(auditService).record("tenant_green", "member_1", "Test Member",
                "Sent personal SMS to 1 selected contact(s)", "member_sms_wallet", "member_1", "127.0.0.1");
    }
}
