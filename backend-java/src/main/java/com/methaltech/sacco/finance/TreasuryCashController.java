package com.methaltech.sacco.finance;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.money.Money;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The Treasurer's cash book. Records cash drawn from the bank into the Treasurer's
 * hand (bank withdrawal -> cash on hand) and every use of that cash (loan
 * disbursement, expense, member payout, general cash). The running balance of these
 * entries is cash on hand. Tenant-scoped and audited.
 * View needs {@code accounting:view}; recording needs {@code accounting:post}.
 */
@RestController
@RequestMapping("/api/v1/treasury/cash-entries")
class TreasuryCashController {

    private final TreasuryCashEntryRepository repository;
    private final AuthService authService;
    private final AuditService auditService;

    TreasuryCashController(
            TreasuryCashEntryRepository repository,
            AuthService authService,
            AuditService auditService) {
        this.repository = repository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession cs = authService.currentSession(authorization);
        if (cs == null) return authService.authRequired();
        if (!authService.hasPermission(cs.user(), "accounting:view")) {
            return authService.permissionRequired("accounting:view");
        }
        String tenantId = tenantScope(cs, requestedTenantId);
        if (tenantId == null) return tenantAccessDenied();

        List<TreasuryCashEntry> entries =
                repository.findByTenantIdOrderByEntryDateDescCreatedAtDesc(tenantId);
        BigDecimal cashIn = sum(entries, TreasuryCashEntry.IN);
        BigDecimal cashOut = sum(entries, TreasuryCashEntry.OUT);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("cashOnHand", Money.normalize(cashIn.subtract(cashOut)));
        body.put("totalIn", Money.normalize(cashIn));
        body.put("totalOut", Money.normalize(cashOut));
        body.put("entries", entries.stream().map(TreasuryCashEntryResponse::from).toList());
        return ResponseEntity.ok(ApiResponse.of(body));
    }

    @PostMapping
    ResponseEntity<?> create(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CashEntryRequest reqBody,
            HttpServletRequest request) {
        AuthService.CurrentSession cs = authService.currentSession(authorization);
        if (cs == null) return authService.authRequired();
        if (!authService.hasPermission(cs.user(), "accounting:post")) {
            return authService.permissionRequired("accounting:post");
        }
        String tenantId = tenantScope(cs, reqBody.tenantId());
        if (tenantId == null) return tenantAccessDenied();

        String purpose = reqBody.purpose() == null ? "" : reqBody.purpose().trim();
        if (!TreasuryCashEntry.PURPOSES.containsKey(purpose)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_CASH_PURPOSE", "Unsupported cash-book purpose."));
        }
        if (reqBody.amount() == null || reqBody.amount().signum() <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "INVALID_CASH_AMOUNT", "Amount must be greater than zero."));
        }

        String direction = TreasuryCashEntry.PURPOSES.get(purpose) ? TreasuryCashEntry.IN : TreasuryCashEntry.OUT;
        LocalDate date = reqBody.entryDate() == null ? LocalDate.now() : reqBody.entryDate();

        TreasuryCashEntry entry = repository.save(new TreasuryCashEntry(
                "cash_" + UUID.randomUUID(),
                tenantId,
                direction,
                purpose,
                Money.normalize(reqBody.amount()),
                trimOrNull(reqBody.reference()),
                trimOrNull(reqBody.description()),
                trimOrNull(reqBody.memberId()),
                date,
                cs.user().getId()));

        auditService.record(
                tenantId,
                cs.user(),
                (TreasuryCashEntry.IN.equals(direction) ? "Cash in — " : "Cash out — ")
                        + purpose + " " + Money.normalize(entry.getAmount()),
                "treasury_cash_entry",
                entry.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(TreasuryCashEntryResponse.from(entry)));
    }

    private static BigDecimal sum(List<TreasuryCashEntry> entries, String direction) {
        return entries.stream()
                .filter(e -> direction.equals(e.getDirection()))
                .map(TreasuryCashEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String tenantScope(AuthService.CurrentSession cs, String requestedTenantId) {
        if (authService.isPlatform(cs.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return cs.user().getTenantId();
        return requestedTenantId.trim().equals(cs.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private static String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access the cash book for another tenant."));
    }

    record CashEntryRequest(
            String tenantId,
            @NotNull String purpose,
            @NotNull BigDecimal amount,
            String reference,
            String description,
            String memberId,
            LocalDate entryDate) {
    }
}
