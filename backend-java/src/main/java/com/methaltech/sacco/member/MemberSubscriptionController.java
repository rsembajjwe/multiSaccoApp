package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Staff management of member subscriptions: list mandatory SACCO member subscriptions and record
 * subscription payments. Tenant-scoped and audited. Members view their own subscription through the
 * member portal.
 */
@RestController
@RequestMapping("/api/v1/member-subscriptions")
@RequiredArgsConstructor
class MemberSubscriptionController {

    private final MemberSubscriptionRepository repository;
    private final MemberRepository memberRepository;
    private final MemberSubscriptionService memberSubscriptionService;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "members:view")) {
            return authService.permissionRequired("members:view");
        }
        String tenantId = resolveTenant(session, requestedTenantId);
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO to view member memberships."));
        }
        memberSubscriptionService.ensureMandatorySubscriptions(tenantId);
        return ResponseEntity.ok(ApiResponse.of(repository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(MemberSubscriptionResponse::from)
                .toList()));
    }

    @PostMapping
    ResponseEntity<?> assign(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody AssignRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "members:create")) {
            return authService.permissionRequired("members:create");
        }
        String tenantId = resolveTenant(session, body == null ? null : body.tenantId());
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO to assign a membership."));
        }
        String planName = body == null || body.planName() == null ? "" : body.planName().trim();
        if (body == null || body.memberId() == null || body.memberId().isBlank() || planName.isBlank() || body.amount() == null || body.amount().signum() <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "MEMBERSHIP_INPUT_INVALID", "Member, plan name and a positive amount are required."));
        }
        Member member = memberRepository.findById(body.memberId().trim()).orElse(null);
        if (member == null || !tenantId.equals(member.getTenantId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "MEMBER_NOT_FOUND", "Member was not found in this SACCO."));
        }
        MemberSubscription saved = memberSubscriptionService.assign(tenantId, member.getId(), planName, body.amount(), body.billingPeriod());
        auditService.record(tenantId, session.user(),
                "Assigned membership \"" + planName + "\" to member " + member.getFullName(),
                "member_subscription", saved.getId(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(MemberSubscriptionResponse.from(saved)));
    }

    @PostMapping("/{id}/payments")
    ResponseEntity<?> recordPayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String id,
            @RequestBody PaymentRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "members:create")) {
            return authService.permissionRequired("members:create");
        }
        MemberSubscription subscription = repository.findById(id).orElse(null);
        if (subscription == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "MEMBERSHIP_NOT_FOUND", "Membership was not found."));
        }
        if (!authService.isPlatform(session.user()) && !subscription.getTenantId().equals(session.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot manage another SACCO's memberships."));
        }
        BigDecimal amount = body == null ? null : body.amount();
        if (amount == null || amount.signum() <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "PAYMENT_AMOUNT_INVALID", "A positive payment amount is required."));
        }
        MemberSubscription saved;
        try {
            saved = memberSubscriptionService.recordPayment(subscription, amount);
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBERSHIP_ALREADY_PAID", ex.getMessage()));
        }
        auditService.record(subscription.getTenantId(), session.user(),
                "Recorded member subscription payment of " + amount + " for subscription " + subscription.getId(),
                "member_subscription", subscription.getId(), request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(MemberSubscriptionResponse.from(saved)));
    }

    private String resolveTenant(AuthService.CurrentSession session, String requestedTenantId) {
        if (authService.isPlatform(session.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId != null && !requestedTenantId.isBlank() && !requestedTenantId.trim().equals(session.user().getTenantId())) {
            return null;
        }
        return session.user().getTenantId();
    }

    record AssignRequest(String tenantId, String memberId, String planName, BigDecimal amount, String billingPeriod) {
    }

    record PaymentRequest(BigDecimal amount, String method) {
    }
}
