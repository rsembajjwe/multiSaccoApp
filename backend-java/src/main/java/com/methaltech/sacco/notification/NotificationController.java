package com.methaltech.sacco.notification;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.api.PageParams;
import com.methaltech.sacco.api.PagedResponse;
import com.methaltech.sacco.accounting.IntegrationJobRunHistoryService;
import com.methaltech.sacco.accounting.MobileMoneyProviderEvidence;
import com.methaltech.sacco.accounting.MobileMoneyProviderEvidenceService;
import com.methaltech.sacco.accounting.MobileMoneyReconciliationJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
class NotificationController {

    private final NotificationDeliveryRepository deliveryRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final List<NotificationProvider> notificationProviders;
    private final MobileMoneyProviderEvidenceService mobileMoneyEvidenceService;
    private final IntegrationJobRunHistoryService integrationJobRunHistoryService;
    private final MobileMoneyReconciliationJob mobileMoneyReconciliationJob;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping("/deliveries")
    ResponseEntity<?> listDeliveries(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            @RequestParam(name = "sort", required = false) String sortBy,
            @RequestParam(name = "direction", required = false) String direction,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access notification deliveries for another tenant."));
        }

        boolean platformAll = authService.isPlatform(currentSession.user()) && requestedTenantId == null;

        if (PageParams.requested(page, size)) {
            Sort sort = sortBy(platformAll, sortBy, direction, Map.of(
                    "tenantId", "tenantId",
                    "channel", "channel",
                    "provider", "provider",
                    "recipient", "recipient",
                    "status", "status",
                    "sentAt", "sentAt",
                    "createdAt", "createdAt"), "createdAt", Sort.Direction.DESC);
            Pageable pageable = PageParams.toPageable(page, size, sort);
            Page<NotificationDelivery> pageResult = platformAll
                    ? deliveryRepository.findAll(pageable)
                    : deliveryRepository.findByTenantId(tenantId, pageable);
            return ResponseEntity.ok(PagedResponse.of(
                    toDeliveryResponses(pageResult.getContent()),
                    pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements(), pageResult.getTotalPages()));
        }

        var deliveries = platformAll
                ? deliveryRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : deliveryRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        return ResponseEntity.ok(ApiResponse.of(toDeliveryResponses(deliveries)));
    }

    private List<NotificationDeliveryResponse> toDeliveryResponses(List<NotificationDelivery> deliveries) {
        Map<String, Notification> notificationsById = notificationRepository.findAllById(deliveries.stream()
                        .map(NotificationDelivery::getNotificationId)
                        .toList()).stream()
                .collect(Collectors.toMap(Notification::getId, Function.identity()));
        return deliveries.stream()
                .map(delivery -> NotificationDeliveryResponse.from(delivery, notificationsById.get(delivery.getNotificationId())))
                .toList();
    }

    private Sort sortBy(boolean platformAll, String requestedSort, String requestedDirection, Map<String, String> allowed, String fallback, Sort.Direction fallbackDirection) {
        String property = allowed.getOrDefault(requestedSort == null ? "" : requestedSort.trim(), fallback);
        Sort.Direction resolvedDirection = requestedDirection == null || requestedDirection.isBlank()
                ? fallbackDirection
                : ("desc".equalsIgnoreCase(requestedDirection) ? Sort.Direction.DESC : Sort.Direction.ASC);
        Sort sort = Sort.by(resolvedDirection, property);
        return platformAll && !"tenantId".equals(property) ? Sort.by(Sort.Direction.ASC, "tenantId").and(sort) : sort;
    }

    @GetMapping("/provider-status")
    ResponseEntity<?> providerStatus(@RequestHeader(name = "Authorization", required = false) String authorization) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }
        return ResponseEntity.ok(ApiResponse.of(notificationProviders.stream()
                .map(NotificationProvider::status)
                .toList()));
    }

    @GetMapping("/provider-evidence")
    ResponseEntity<?> providerEvidence(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access provider evidence for another SACCO."));
        }
        boolean platformAll = authService.isPlatform(currentSession.user()) && requestedTenantId == null;
        List<NotificationDelivery> deliveries = platformAll
                ? deliveryRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : deliveryRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<NotificationProviderStatusResponse> providerStatuses = notificationProviders.stream()
                .map(NotificationProvider::status)
                .toList();
        int failedDeliveries = countDeliveriesByStatus(deliveries, "failed");
        int sentDeliveries = countDeliveriesByStatus(deliveries, "sent");
        int readyProviders = countProviderStatuses(providerStatuses, "ready");
        int unavailableProviders = providerStatuses.size() - readyProviders;
        MobileMoneyProviderEvidence mobileMoney = mobileMoneyEvidenceService.build(tenantId, platformAll);
        String evidenceStatus = failedDeliveries == 0
                && unavailableProviders == 0
                && "ready".equalsIgnoreCase(mobileMoney.evidenceStatus())
                ? "ready"
                : "review";
        return ResponseEntity.ok(ApiResponse.of(new ProviderOperationalEvidence(
                deliveries.size(),
                failedDeliveries,
                sentDeliveries,
                readyProviders,
                unavailableProviders,
                providerStatuses,
                mobileMoney,
                evidenceStatus,
                Instant.now())));
    }

    @GetMapping("/provider-job-runs")
    ResponseEntity<?> providerJobRuns(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "jobName", required = false) String jobName) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }
        return ResponseEntity.ok(ApiResponse.of(integrationJobRunHistoryService.latest(jobName)));
    }

    @PostMapping("/provider-job-runs/mobile-money-reconciliation")
    ResponseEntity<?> runMobileMoneyReconciliation(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:manage")) {
            return authService.permissionRequired("notifications:manage");
        }
        var summary = mobileMoneyReconciliationJob.reconcilePendingRequests();
        auditService.record(
                currentSession.user().getTenantId(),
                currentSession.user(),
                "Ran mobile-money reconciliation manually",
                "integration_job",
                "mobile_money_reconciliation",
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.of(summary));
    }

    @PatchMapping("/{notificationId}/acknowledge")
    ResponseEntity<?> acknowledge(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String notificationId,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }

        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "NOTIFICATION_NOT_FOUND", "Notification was not found."));
        }
        if (!authService.isPlatform(currentSession.user()) && !notification.getTenantId().equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot acknowledge notifications for another SACCO."));
        }
        notification.markRead();
        Notification saved = notificationRepository.save(notification);
        auditService.record(
                saved.getTenantId(),
                currentSession.user(),
                "Acknowledged notification " + saved.getTitle(),
                "notification",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(NotificationResponse.from(saved)));
    }

    @PatchMapping("/deliveries/{deliveryId}/retry")
    ResponseEntity<?> retryDelivery(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String deliveryId,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:manage")) {
            return authService.permissionRequired("notifications:manage");
        }

        NotificationDelivery delivery = deliveryRepository.findById(deliveryId).orElse(null);
        if (delivery == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "NOTIFICATION_DELIVERY_NOT_FOUND", "Notification delivery was not found."));
        }
        if (!authService.isPlatform(currentSession.user()) && !delivery.getTenantId().equals(currentSession.user().getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot retry notification deliveries for another SACCO."));
        }
        if (!"failed".equalsIgnoreCase(delivery.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "DELIVERY_NOT_FAILED", "Only failed notification deliveries can be retried."));
        }

        Notification notification = notificationRepository.findById(delivery.getNotificationId()).orElse(null);
        NotificationDelivery retry = notificationService.retryDelivery(delivery, notification);
        auditService.record(
                retry.getTenantId(),
                currentSession.user(),
                "Retried notification delivery " + delivery.getId(),
                "notification_delivery",
                retry.getId(),
                request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(NotificationDeliveryResponse.from(retry, notification)));
    }

    @PatchMapping("/acknowledge")
    ResponseEntity<?> acknowledgeBulk(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestBody BulkAcknowledgeRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }

        List<String> notificationIds = body == null || body.notificationIds() == null
                ? List.of()
                : body.notificationIds().stream()
                        .filter(id -> id != null && !id.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();
        if (notificationIds.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "NOTIFICATION_IDS_REQUIRED", "Select at least one notification to acknowledge."));
        }

        List<Notification> notifications = notificationRepository.findAllById(notificationIds);
        List<Notification> allowed = notifications.stream()
                .filter(notification -> authService.isPlatform(currentSession.user()) || notification.getTenantId().equals(currentSession.user().getTenantId()))
                .toList();
        if (allowed.size() != notifications.size()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot acknowledge notifications for another SACCO."));
        }
        allowed.forEach(Notification::markRead);
        notificationRepository.saveAll(allowed);
        auditBulkAcknowledgement(currentSession, allowed, request);
        return ResponseEntity.ok(ApiResponse.of(new BulkAcknowledgeResponse(allowed.size())));
    }

    private void auditBulkAcknowledgement(
            AuthService.CurrentSession currentSession,
            List<Notification> notifications,
            HttpServletRequest request) {
        if (notifications.isEmpty()) return;
        notifications.stream()
                .collect(Collectors.groupingBy(Notification::getTenantId))
                .forEach((tenantId, tenantNotifications) -> auditService.record(
                        tenantId,
                        currentSession.user(),
                        "Acknowledged " + tenantNotifications.size() + " notification alert(s)",
                        "notification",
                        tenantNotifications.size() == 1 ? tenantNotifications.get(0).getId() : "bulk_" + tenantNotifications.size(),
                        request.getRemoteAddr()));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user()) && (requestedTenantId == null || requestedTenantId.isBlank())) {
            return null;
        }
        String tenantId = requestedTenantId == null || requestedTenantId.isBlank()
                ? currentSession.user().getTenantId()
                : requestedTenantId.trim();
        if (!authService.isPlatform(currentSession.user()) && !tenantId.equals(currentSession.user().getTenantId())) return null;
        return tenantId;
    }

    private static int countDeliveriesByStatus(List<NotificationDelivery> deliveries, String status) {
        return (int) deliveries.stream()
                .filter(delivery -> delivery.getStatus() != null && delivery.getStatus().equalsIgnoreCase(status))
                .count();
    }

    private static int countProviderStatuses(List<NotificationProviderStatusResponse> statuses, String status) {
        return (int) statuses.stream()
                .filter(row -> row.status() != null && row.status().equalsIgnoreCase(status))
                .count();
    }

    record BulkAcknowledgeRequest(List<String> notificationIds) {
    }

    record BulkAcknowledgeResponse(int acknowledged) {
    }
}
