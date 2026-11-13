package com.methaltech.sacco.health;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.notification.SmsWalletService;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
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
    private final SmsWalletService smsWalletService;

    @GetMapping("/status")
    ResponseEntity<?> status(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "operations:view")) {
            return authService.permissionRequired("operations:view");
        }

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
        Instant fleetAlertCutoff = Instant.now().minus(24, ChronoUnit.HOURS);
        counts.put("repeatedFleetJobRecoveries", platformWide
                ? countUnscoped("SELECT COUNT(*) FROM fleet_bulk_jobs WHERE recovery_count >= 2 AND last_recovered_at >= ?", fleetAlertCutoff)
                : 0L);
        counts.put("fleetJobsWithFailures", platformWide
                ? countUnscoped("SELECT COUNT(*) FROM fleet_bulk_jobs WHERE failed_count > 0 AND finished_at >= ?", fleetAlertCutoff)
                : 0L);
        counts.put("overdueFleetApprovals", platformWide
                ? countUnscoped("SELECT COUNT(*) FROM fleet_bulk_jobs WHERE status = 'pending_approval' AND created_at < ?", Instant.now().minus(8, ChronoUnit.HOURS))
                : 0L);

        java.util.Map<String, Object> financials = new java.util.LinkedHashMap<>();
        financials.put("totalSavings", sum("SELECT COALESCE(SUM(savings_balance), 0) FROM members", tenantId));
        financials.put("totalShares", sum("SELECT COALESCE(SUM(shares_balance), 0) FROM members", tenantId));
        financials.put("totalWelfare", sum("SELECT COALESCE(SUM(welfare_balance), 0) FROM members", tenantId));
        financials.put("memberFunds", memberFunds(tenantId));
        financials.put("loanPortfolio", sum("SELECT COALESCE(SUM(balance), 0) FROM loans WHERE status NOT IN ('closed', 'rejected')", tenantId));
        if (!platformWide && tenantId != null) {
            financials.put("smsBalance", smsWalletService.balance(tenantId));
            financials.put("smsRate", smsWalletService.smsRate());
        }

        List<Map<String, Object>> alerts = alerts(counts);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", true);
        response.put("checkedAt", Instant.now().toString());
        response.put("scope", platformWide ? "platform" : tenantId);
        response.put("database", Map.of("reachable", true));
        response.put("counts", counts);
        response.put("financials", financials);
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

    private java.math.BigDecimal sum(String sql, String tenantId) {
        String scopedSql = tenantId == null ? sql : sql + (sql.toLowerCase().contains(" where ") ? " AND tenant_id = ?" : " WHERE tenant_id = ?");
        java.math.BigDecimal value = tenantId == null
                ? jdbcTemplate.queryForObject(scopedSql, java.math.BigDecimal.class)
                : jdbcTemplate.queryForObject(scopedSql, java.math.BigDecimal.class, tenantId);
        return value == null ? java.math.BigDecimal.ZERO : value;
    }

    private List<Map<String, Object>> alerts(Map<String, Object> counts) {
        List<Map<String, Object>> alerts = new ArrayList<>();
        addAlert(alerts, "open_complaints", (long) counts.get("openComplaints"), "warning", "Member or service complaints are still open.");
        addAlert(alerts, "callback_exceptions", (long) counts.get("callbackExceptions"), "critical", "Mobile-money callbacks need operational review.");
        addAlert(alerts, "delivery_exceptions", (long) counts.get("deliveryExceptions"), "warning", "Notification deliveries need provider follow-up.");
        addAlert(alerts, "fleet_job_repeated_recovery", (long) counts.get("repeatedFleetJobRecoveries"), "critical", "Fleet bulk jobs required repeated automatic recovery in the last 24 hours.");
        addAlert(alerts, "fleet_job_failures", (long) counts.get("fleetJobsWithFailures"), "warning", "Fleet bulk jobs completed with organization failures in the last 24 hours.");
        addAlert(alerts, "overdue_fleet_approvals", (long) counts.get("overdueFleetApprovals"), "critical", "Fleet bulk approvals have exceeded the eight-hour decision SLA.");
        return alerts;
    }

    private long countUnscoped(String sql, Object... args) {
        Object[] jdbcArgs = Arrays.stream(args).map(OperationsController::jdbcArgument).toArray();
        Long value = jdbcTemplate.queryForObject(sql, Long.class, jdbcArgs);
        return value == null ? 0 : value;
    }

    static Object jdbcArgument(Object argument) {
        if (argument instanceof Instant instant) {
            return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
        }
        return argument;
    }

    private void addAlert(List<Map<String, Object>> alerts, String code, long count, String severity, String message) {
        if (count <= 0) return;
        alerts.add(Map.of(
                "code", code,
                "count", count,
                "severity", severity,
                "message", message));
    }

    private List<Map<String, Object>> memberFunds(String tenantId) {
        String sql = """
                SELECT ft.code, ft.name, ft.basis, ft.is_system,
                       COALESCE(SUM(mfb.balance), 0) AS balance
                FROM sacco_fund_types ft
                LEFT JOIN member_fund_balances mfb
                  ON mfb.tenant_id = ft.tenant_id
                 AND mfb.fund_code = ft.code
                WHERE ft.active = TRUE
                """;
        if (tenantId != null) {
                    sql += " AND ft.tenant_id = ? ";
        }
        sql += """
                GROUP BY ft.display_order, ft.code, ft.name, ft.basis, ft.is_system
                ORDER BY ft.display_order ASC, ft.name ASC
                """;
        Object[] args = tenantId == null ? new Object[]{} : new Object[]{tenantId};
        return jdbcTemplate.query(sql, args, (rs, rowNum) -> {
            Map<String, Object> fund = new LinkedHashMap<>();
            fund.put("code", rs.getString("code"));
            fund.put("name", rs.getString("name"));
            fund.put("basis", rs.getString("basis"));
            fund.put("system", rs.getBoolean("is_system"));
            fund.put("balance", rs.getBigDecimal("balance"));
            return fund;
        });
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }
}
