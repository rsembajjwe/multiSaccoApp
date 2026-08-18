package com.methaltech.sacco.notification;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * SACCO-level channel enablement. Staff decide which notification channels their SACCO offers (SMS,
 * email, WhatsApp, push). Disabling a channel stops all fan-out on it for the SACCO — useful for cost
 * control on the charged channels (SMS, WhatsApp).
 */
@RestController
@RequestMapping("/api/v1/notification-channels")
@RequiredArgsConstructor
class NotificationChannelController {

    private final NotificationChannelPreferenceService preferenceService;
    private final AuthService authService;
    private final AuditService auditService;

    @GetMapping
    ResponseEntity<?> list(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:view")) {
            return authService.permissionRequired("notifications:view");
        }
        String tenantId = resolveTenant(currentSession, requestedTenantId);
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO to view its notification channels."));
        }
        return ResponseEntity.ok(ApiResponse.of(preferenceService.saccoChannels(tenantId)));
    }

    @PatchMapping("/{channel}")
    ResponseEntity<?> setChannel(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String channel,
            @RequestBody ChannelToggleRequest body,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();
        if (!authService.hasPermission(currentSession.user(), "notifications:manage")) {
            return authService.permissionRequired("notifications:manage");
        }
        if (!NotificationChannelPreferenceService.GATEABLE_CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "UNKNOWN_CHANNEL", "Channel must be one of: " + NotificationChannelPreferenceService.GATEABLE_CHANNELS));
        }
        String tenantId = resolveTenant(currentSession, requestedTenantId);
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "TENANT_REQUIRED", "Select a SACCO to update its notification channels."));
        }
        boolean enabled = body != null && body.enabled();
        preferenceService.setSaccoChannel(tenantId, channel, enabled);
        auditService.record(
                tenantId,
                currentSession.user(),
                (enabled ? "Enabled" : "Disabled") + " " + channel + " notification channel",
                "notification_channel",
                channel,
                request.getRemoteAddr());
        Map<String, Boolean> channels = preferenceService.saccoChannels(tenantId);
        return ResponseEntity.ok(ApiResponse.of(channels));
    }

    private String resolveTenant(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId != null && !requestedTenantId.isBlank() && !requestedTenantId.trim().equals(currentSession.user().getTenantId())) {
            return null;
        }
        return currentSession.user().getTenantId();
    }

    record ChannelToggleRequest(boolean enabled) {
    }
}
