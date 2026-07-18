package com.methaltech.sacco.notification;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
class NotificationController {

    private final NotificationDeliveryRepository deliveryRepository;
    private final AuthService authService;

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
        return ResponseEntity.ok(ApiResponse.of(deliveries.stream().map(NotificationDeliveryResponse::from).toList()));
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
}
