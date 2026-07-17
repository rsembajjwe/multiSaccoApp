package com.methaltech.sacco.health;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuthService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/operations")
@RequiredArgsConstructor
class OperationsController {

    private final JdbcTemplate jdbcTemplate;
    private final AuthService authService;

    @GetMapping("/status")
    ResponseEntity<?> status(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access operations status for another tenant."));
        }

        boolean platformWide = authService.isPlatform(currentSession.user()) && tenantId == null;
        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("tenants", platformWide ? count("SELECT COUNT(*) FROM tenants", null) : 1);
        counts.put("users", count("SELECT COUNT(*) FROM users", tenantId));
        counts.put("members", count("SELECT COUNT(*) FROM members", tenantId));
        counts.put("activeMembers", count("SELECT COUNT(*) FROM members WHERE status = 'active'", tenantId));
        counts.put("pendingFinancialTransactions", count("SELECT COUNT(*) FROM financial_transactions WHERE status = 'pending_approval'", tenantId));
        counts.put("openLoans", count("SELECT COUNT(*) FROM loans WHERE status NOT IN ('closed', 'rejected')", tenantId));
        counts.put("openComplaints", count("SELECT COUNT(*) FROM complaints WHERE status NOT IN ('resolved', 'closed')", tenantId));
        counts.put("callbackExceptions", count("SELECT COUNT(*) FROM mobile_money_callbacks WHERE status <> 'posted'", tenantId));
        counts.put("deliveryExceptions", count("SELECT COUNT(*) FROM notification_deliveries WHERE status <> 'sent'", tenantId));
        counts.put("closedAccountingPeriods", count("SELECT COUNT(*) FROM accounting_periods WHERE status = 'closed'", tenantId));

        List<Map<String, Object>> alerts = alerts(counts);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("checkedAt", Instant.now().toString());
        response.put("scope", platformWide ? "platform" : tenantId);
        response.put("database", Map.of("reachable", true));
        response.put("counts", counts);
        response.put("alerts", alerts);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    private long count(String sql, String tenantId) {
        String scopedSql = tenantId == null ? sql : sql + (sql.toLowerCase().contains(" where ") ? " AND tenant_id = ?" : " WHERE tenant_id = ?");
        Long value = tenantId == null
                ? jdbcTemplate.queryForObject(scopedSql, Long.class)
                : jdbcTemplate.queryForObject(scopedSql, Long.class, tenantId);
        return value == null ? 0 : value;
    }

    private List<Map<String, Object>> alerts(Map<String, Object> counts) {
        List<Map<String, Object>> alerts = new ArrayList<>();
        addAlert(alerts, "pending_financial_transactions", (long) counts.get("pendingFinancialTransactions"), "warning", "Financial postings are waiting for approval.");
        addAlert(alerts, "open_complaints", (long) counts.get("openComplaints"), "warning", "Member or service complaints are still open.");
        addAlert(alerts, "callback_exceptions", (long) counts.get("callbackExceptions"), "critical", "Mobile-money callbacks need operational review.");
        addAlert(alerts, "delivery_exceptions", (long) counts.get("deliveryExceptions"), "warning", "Notification deliveries need provider follow-up.");
        return alerts;
    }

    private void addAlert(List<Map<String, Object>> alerts, String code, long count, String severity, String message) {
        if (count <= 0) return;
        alerts.add(Map.of(
                "code", code,
                "count", count,
                "severity", severity,
                "message", message));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }
}
