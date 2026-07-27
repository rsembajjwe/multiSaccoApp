package com.methaltech.sacco.notification;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
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
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping("/deliveries")
    ResponseEntity<?> listDeliveries(
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
                    .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access notification deliveries for another tenant."));
        }

        var deliveries = authService.isPlatform(currentSession.user()) && requestedTenantId == null
                ? deliveryRepository.findAllByOrderByTenantIdAscCreatedAtDesc()
                : deliveryRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        Map<String, Notification> notificationsById = notificationRepository.findAllById(deliveries.stream()
                        .map(NotificationDelivery::getNotificationId)
                        .toList()).stream()
                .collect(Collectors.toMap(Notification::getId, Function.identity()));
        return ResponseEntity.ok(ApiResponse.of(deliveries.stream()
                .map(delivery -> NotificationDeliveryResponse.from(delivery, notificationsById.get(delivery.getNotificationId())))
                .toList()));
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

    record BulkAcknowledgeRequest(List<String> notificationIds) {
    }

    record BulkAcknowledgeResponse(int acknowledged) {
    }
}
