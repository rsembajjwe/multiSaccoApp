package com.methaltech.sacco.member;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import com.methaltech.sacco.subscription.Subscription;
import com.methaltech.sacco.subscription.SubscriptionRepository;
import com.methaltech.sacco.subscription.SubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "member-subscription:view")) {
            return authService.permissionRequired("member-subscription:view");
        }
        String tenantId = resolveTenant(session, requestedTenantId);
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO to view member memberships."));
        }
        memberSubscriptionService.ensureMandatorySubscriptions(tenantId);

        if (PageParams.requested(page, size)) {
            Pageable pageable = PageParams.toPageable(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            String filter = status == null ? "" : status.trim().toLowerCase();
            Page<MemberSubscription> result;
            if ("paid".equals(filter)) {
                result = repository.findByTenantIdAndStatus(tenantId, "active", pageable);
            } else if ("unpaid".equals(filter)) {
                result = repository.findByTenantIdAndStatusNot(tenantId, "active", pageable);
            } else {
                result = repository.findByTenantId(tenantId, pageable);
            }
            return ResponseEntity.ok(PagedResponse.of(
                    result.getContent().stream().map(MemberSubscriptionResponse::from).toList(),
                    result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
        }

        return ResponseEntity.ok(ApiResponse.of(repository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(MemberSubscriptionResponse::from)
                .toList()));
    }

    /** Paid/unpaid/total member-subscription counts, so the screen can show the summary without the full list. */
    @GetMapping("/summary")
    ResponseEntity<?> summary(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "member-subscription:view")) {
            return authService.permissionRequired("member-subscription:view");
        }
        String tenantId = resolveTenant(session, requestedTenantId);
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO to view member memberships."));
        }
        memberSubscriptionService.ensureMandatorySubscriptions(tenantId);
        long total = repository.countByTenantId(tenantId);
        long paid = repository.countByTenantIdAndStatus(tenantId, "active");
        long unpaid = Math.max(0, total - paid);
        return ResponseEntity.ok(ApiResponse.of(new SubscriptionSummaryResponse(paid, unpaid, total)));
    }

    record SubscriptionSummaryResponse(long paid, long unpaid, long total) {
    }

    @PostMapping
    ResponseEntity<?> assign(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody AssignRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "member-subscription:manage")) {
            return authService.permissionRequired("member-subscription:manage");
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
        if (!authService.hasPermission(session.user(), "member-subscription:manage")) {
            return authService.permissionRequired("member-subscription:manage");
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
        ResponseEntity<?> capacityCheck = activationCapacityCheck(subscription.getTenantId(), subscription, amount, 1);
        if (capacityCheck != null) return capacityCheck;
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

    @PostMapping("/bulk-payments")
    ResponseEntity<?> recordBulkPayment(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody BulkPaymentRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession session = authService.currentSession(authorization);
        if (session == null) return authService.authRequired();
        if (!authService.hasPermission(session.user(), "member-subscription:manage")) {
            return authService.permissionRequired("member-subscription:manage");
        }
        if (body == null || body.subscriptionIds() == null || body.subscriptionIds().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "NO_MEMBERS_SELECTED", "Select at least one member subscription to mark paid."));
        }
        BigDecimal receivedAmount = body.amount();
        if (receivedAmount == null || receivedAmount.signum() <= 0) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "PAYMENT_AMOUNT_INVALID", "Enter the amount actually received."));
        }

        List<MemberSubscription> subscriptions = new ArrayList<>();
        BigDecimal requiredAmount = BigDecimal.ZERO;
        String tenantId = null;
        for (String id : body.subscriptionIds().stream().distinct().toList()) {
            if (id == null || id.isBlank()) continue;
            MemberSubscription subscription = repository.findById(id.trim()).orElse(null);
            if (subscription == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiErrorResponse.of(404, "MEMBERSHIP_NOT_FOUND", "One selected membership was not found."));
            }
            if (!authService.isPlatform(session.user()) && !subscription.getTenantId().equals(session.user().getTenantId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot manage another SACCO's memberships."));
            }
            if (tenantId == null) {
                tenantId = subscription.getTenantId();
            } else if (!tenantId.equals(subscription.getTenantId())) {
                return ResponseEntity.badRequest()
                        .body(ApiErrorResponse.of(400, "MIXED_TENANT_SELECTION", "Bulk member payments must belong to one SACCO."));
            }
            BigDecimal due = payableAmount(subscription);
            if (due.compareTo(BigDecimal.ZERO) > 0) {
                subscriptions.add(subscription);
                requiredAmount = requiredAmount.add(due);
            }
        }
        if (subscriptions.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "NO_PAYABLE_MEMBERSHIPS", "Selected memberships are already paid."));
        }
        if (requiredAmount.compareTo(receivedAmount) > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "BULK_PAYMENT_OVER_ALLOCATED",
                            "Selected members require " + requiredAmount + ", which exceeds the amount received."));
        }
        ResponseEntity<?> capacityCheck = activationCapacityCheck(tenantId, null, null, subscriptions.size());
        if (capacityCheck != null) return capacityCheck;

        List<MemberSubscriptionResponse> saved = subscriptions.stream()
                .map(subscription -> memberSubscriptionService.recordPayment(subscription, payableAmount(subscription)))
                .map(MemberSubscriptionResponse::from)
                .toList();
        auditService.record(tenantId, session.user(),
                "Recorded bulk member subscription payment for " + saved.size() + " member(s), amount received " + receivedAmount,
                "member_subscription", "bulk", request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(new BulkPaymentResponse(receivedAmount, requiredAmount, saved.size(), saved)));
    }

    private ResponseEntity<?> activationCapacityCheck(
            String tenantId,
            MemberSubscription subscription,
            BigDecimal paymentAmount,
            int requestedActivations) {
        if (tenantId == null) return null;
        int activations = requestedActivations;
        if (subscription != null) {
            BigDecimal paid = subscription.getPaid() == null ? BigDecimal.ZERO : subscription.getPaid();
            BigDecimal amount = subscription.getAmount() == null ? BigDecimal.ZERO : subscription.getAmount();
            boolean alreadyActive = "active".equals(subscription.getStatus()) && paid.compareTo(amount) >= 0;
            boolean willActivate = !alreadyActive && paid.add(paymentAmount == null ? BigDecimal.ZERO : paymentAmount).compareTo(amount) >= 0;
            activations = willActivate ? 1 : 0;
        }
        if (activations <= 0) return null;
        Subscription platformSubscription = subscriptionRepository.findFirstByTenantIdOrderByCreatedAtDesc(tenantId).orElse(null);
        if (platformSubscription == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "NO_SACCO_SUBSCRIPTION", "This SACCO has no platform subscription capacity."));
        }
        subscriptionService.refreshBilling(platformSubscription);
        int capacity = platformSubscription.paidMemberCapacity();
        long activeMembers = repository.countByTenantIdAndStatus(tenantId, "active");
        if (activeMembers + activations > capacity) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "MEMBER_SUBSCRIPTION_CAPACITY_EXCEEDED",
                            "The SACCO has paid for " + capacity + " member subscription(s). Pay the platform first before activating more members."));
        }
        return null;
    }

    private BigDecimal payableAmount(MemberSubscription subscription) {
        BigDecimal amount = subscription.getAmount() == null ? BigDecimal.ZERO : subscription.getAmount();
        BigDecimal paid = subscription.getPaid() == null ? BigDecimal.ZERO : subscription.getPaid();
        BigDecimal due = amount.subtract(paid).max(BigDecimal.ZERO);
        if ("expired".equals(subscription.getStatus()) && due.compareTo(BigDecimal.ZERO) <= 0) {
            return amount;
        }
        return due;
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

    record BulkPaymentRequest(BigDecimal amount, List<String> subscriptionIds, String method, String reference) {
    }

    record BulkPaymentResponse(BigDecimal receivedAmount, BigDecimal allocatedAmount, int paidMembers, List<MemberSubscriptionResponse> subscriptions) {
    }
}
