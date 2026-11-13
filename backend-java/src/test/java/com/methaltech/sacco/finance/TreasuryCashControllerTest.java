package com.methaltech.sacco.finance;

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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class TreasuryCashControllerTest {

    private final TreasuryCashEntryRepository repository = mock(TreasuryCashEntryRepository.class);
    private final AuthService authService = mock(AuthService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final User saccoUser = user("user_green", "tenant_green", "Green Treasurer");
    private final User platformUser = user("user_platform", "tenant_platform", "Platform Admin");
    private final TreasuryCashController controller = new TreasuryCashController(repository, authService, auditService);

    @BeforeEach
    void configureDefaults() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(authService.isPlatform(platformUser)).thenReturn(true);
    }

    @Test
    void requiresAuthenticationAndPermissions() {
        ResponseEntity<ApiErrorResponse> authRequired = ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "AUTH_REQUIRED", "Required"));
        when(authService.authRequired()).thenReturn(authRequired);
        assertEquals(HttpStatus.UNAUTHORIZED, controller.list(null, null).getStatusCode());

        when(authService.currentSession("Bearer denied")).thenReturn(session(saccoUser));
        ResponseEntity<ApiErrorResponse> permissionRequired = ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "PERMISSION_REQUIRED", "Required"));
        when(authService.permissionRequired("accounting:view")).thenReturn(permissionRequired);
        assertEquals(HttpStatus.FORBIDDEN, controller.list("Bearer denied", null).getStatusCode());

        when(authService.permissionRequired("accounting:post")).thenReturn(permissionRequired);
        assertEquals(HttpStatus.FORBIDDEN, controller.create(
                "Bearer denied",
                new TreasuryCashController.CashEntryRequest(null, "expense", BigDecimal.ONE, null, null, null, null),
                request).getStatusCode());
    }

    @Test
    void enforcesTenantScopeForPlatformAndSaccoUsers() {
        allow("Bearer platform", platformUser, "accounting:view");
        assertError(controller.list("Bearer platform", null), "TENANT_ACCESS_DENIED");

        allow("Bearer sacco", saccoUser, "accounting:view");
        assertError(controller.list("Bearer sacco", "tenant_lake"), "TENANT_ACCESS_DENIED");

        when(repository.findByTenantIdOrderByEntryDateDescCreatedAtDesc("tenant_green"))
                .thenReturn(List.of());
        assertEquals(HttpStatus.OK, controller.list("Bearer sacco", "  ").getStatusCode());

        when(repository.findByTenantIdOrderByEntryDateDescCreatedAtDesc("tenant_lake"))
                .thenReturn(List.of());
        assertEquals(HttpStatus.OK, controller.list("Bearer platform", " tenant_lake ").getStatusCode());
    }

    @Test
    void listsEntriesAndCalculatesCashOnHand() {
        allow("Bearer sacco", saccoUser, "accounting:view");
        when(repository.findByTenantIdOrderByEntryDateDescCreatedAtDesc("tenant_green"))
                .thenReturn(List.of(
                        entry("cash_in", TreasuryCashEntry.IN, "bank_withdrawal", "100.50"),
                        entry("cash_out", TreasuryCashEntry.OUT, "expense", "40.25")));

        ResponseEntity<?> response = controller.list("Bearer sacco", null);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) ((ApiResponse<?>) response.getBody()).data();
        assertEquals(new BigDecimal("60.25"), body.get("cashOnHand"));
        assertEquals(new BigDecimal("100.50"), body.get("totalIn"));
        assertEquals(new BigDecimal("40.25"), body.get("totalOut"));
        assertEquals(2, ((List<?>) body.get("entries")).size());
    }

    @Test
    void validatesPurposeAndPositiveAmount() {
        allow("Bearer sacco", saccoUser, "accounting:post");

        assertError(controller.create("Bearer sacco",
                new TreasuryCashController.CashEntryRequest(null, null, BigDecimal.ONE, null, null, null, null), request),
                "INVALID_CASH_PURPOSE");
        assertError(controller.create("Bearer sacco",
                new TreasuryCashController.CashEntryRequest(null, "unknown", BigDecimal.ONE, null, null, null, null), request),
                "INVALID_CASH_PURPOSE");
        assertError(controller.create("Bearer sacco",
                new TreasuryCashController.CashEntryRequest(null, "expense", null, null, null, null, null), request),
                "INVALID_CASH_AMOUNT");
        assertError(controller.create("Bearer sacco",
                new TreasuryCashController.CashEntryRequest(null, "expense", BigDecimal.ZERO, null, null, null, null), request),
                "INVALID_CASH_AMOUNT");
    }

    @Test
    void recordsAuditedCashInAndCashOutEntries() {
        allow("Bearer sacco", saccoUser, "accounting:post");
        LocalDate date = LocalDate.of(2026, 11, 10);

        ResponseEntity<?> cashIn = controller.create("Bearer sacco",
                new TreasuryCashController.CashEntryRequest(null, " bank_withdrawal ", new BigDecimal("25.555"),
                        " REF-1 ", " Bank cash ", " ", date), request);
        assertEquals(HttpStatus.CREATED, cashIn.getStatusCode());
        TreasuryCashEntryResponse cashInBody = (TreasuryCashEntryResponse) ((ApiResponse<?>) cashIn.getBody()).data();
        assertEquals(TreasuryCashEntry.IN, cashInBody.direction());
        assertEquals(new BigDecimal("25.56"), cashInBody.amount());
        assertEquals("REF-1", cashInBody.reference());
        assertNull(cashInBody.memberId());
        assertEquals(date, cashInBody.entryDate());

        ResponseEntity<?> cashOut = controller.create("Bearer sacco",
                new TreasuryCashController.CashEntryRequest(null, "expense", new BigDecimal("5"),
                        null, null, "member_one", null), request);
        TreasuryCashEntryResponse cashOutBody = (TreasuryCashEntryResponse) ((ApiResponse<?>) cashOut.getBody()).data();
        assertEquals(TreasuryCashEntry.OUT, cashOutBody.direction());
        assertEquals(LocalDate.now(), cashOutBody.entryDate());
        assertEquals("member_one", cashOutBody.memberId());

        verify(auditService).record(eq("tenant_green"), eq(saccoUser),
                org.mockito.ArgumentMatchers.contains("Cash in"), eq("treasury_cash_entry"), any(), eq("127.0.0.1"));
        verify(auditService).record(eq("tenant_green"), eq(saccoUser),
                org.mockito.ArgumentMatchers.contains("Cash out"), eq("treasury_cash_entry"), any(), eq("127.0.0.1"));
    }

    private void allow(String token, User user, String permission) {
        when(authService.currentSession(token)).thenReturn(session(user));
        when(authService.hasPermission(user, permission)).thenReturn(true);
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

    private TreasuryCashEntry entry(String id, String direction, String purpose, String amount) {
        return new TreasuryCashEntry(id, "tenant_green", direction, purpose, new BigDecimal(amount),
                null, null, null, LocalDate.of(2026, 11, 10), "user_green");
    }

    private void assertError(ResponseEntity<?> response, String code) {
        assertEquals(HttpStatus.FORBIDDEN.value() == response.getStatusCode().value()
                        ? HttpStatus.FORBIDDEN
                        : HttpStatus.BAD_REQUEST,
                response.getStatusCode());
        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertEquals(code, body.error().code());
        assertTrue(body.error().status() >= 400);
    }
}
