package com.methaltech.sacco.notification;

import com.methaltech.sacco.api.ApiErrorResponse;
import com.methaltech.sacco.api.ApiResponse;
import com.methaltech.sacco.identity.AuditService;
import com.methaltech.sacco.identity.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notification-templates")
class NotificationTemplateController {

    private static final Set<String> CHANNELS = Set.of("in_app", "sms", "email");
    private static final Set<String> STATUSES = Set.of("active", "inactive");

    private final NotificationTemplateRepository templateRepository;
    private final AuthService authService;
    private final AuditService auditService;

    NotificationTemplateController(
            NotificationTemplateRepository templateRepository,
            AuthService authService,
            AuditService auditService) {
        this.templateRepository = templateRepository;
        this.authService = authService;
        this.auditService = auditService;
    }

    @GetMapping
    ResponseEntity<?> listTemplates(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @RequestParam(name = "tenantId", required = false) String requestedTenantId) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = tenantScope(currentSession, requestedTenantId);
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        var templates = templateRepository.findAllByOrderByTenantIdAscEventTypeAscChannelAsc().stream()
                .filter(template -> authService.isPlatform(currentSession.user()) && requestedTenantId == null
                        || template.getTenantId() == null
                        || template.getTenantId().equals(tenantId))
                .map(NotificationTemplateResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.of(templates));
    }

    @PostMapping
    ResponseEntity<?> createTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody CreateNotificationTemplateRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        String tenantId = body.tenantId() == null && authService.isPlatform(currentSession.user())
                ? null
                : tenantScope(currentSession, body.tenantId());
        if (tenantId == null && !authService.isPlatform(currentSession.user())) return tenantAccessDenied();

        String eventType = normalizeEventType(body.eventType());
        String channel = normalizeChannel(body.channel());
        String status = normalizeStatus(body.status() == null ? "active" : body.status());
        ResponseEntity<?> validation = validateTemplate(eventType, channel, body.title(), body.body(), status);
        if (validation != null) return validation;
        if (templateExists(null, tenantId, eventType, channel)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TEMPLATE_EXISTS", "A template already exists for that event type and channel."));
        }

        NotificationTemplate template = templateRepository.save(new NotificationTemplate(
                "template_" + UUID.randomUUID(),
                tenantId,
                channel,
                eventType,
                body.title().trim(),
                body.body().trim(),
                status));
        auditService.record(
                tenantId == null ? currentSession.user().getTenantId() : tenantId,
                currentSession.user(),
                "Created notification template " + eventType,
                "notification_template",
                template.getId(),
                request.getRemoteAddr());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(NotificationTemplateResponse.from(template)));
    }

    @PatchMapping("/{templateId}")
    ResponseEntity<?> updateTemplate(
            @RequestHeader(name = "Authorization", required = false) String authorization,
            @PathVariable String templateId,
            @RequestBody UpdateNotificationTemplateRequest body,
            HttpServletRequest request) {
        AuthService.CurrentSession currentSession = authService.currentSession(authorization);
        if (currentSession == null) return authService.authRequired();

        NotificationTemplate template = templateRepository.findById(templateId).orElse(null);
        if (template == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiErrorResponse.of(404, "TEMPLATE_NOT_FOUND", "Notification template not found."));
        }
        if (template.getTenantId() == null && !authService.isPlatform(currentSession.user())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiErrorResponse.of(403, "PLATFORM_ADMIN_REQUIRED", "Only platform administrators can update global templates."));
        }
        if (template.getTenantId() != null && !template.getTenantId().equals(tenantScope(currentSession, template.getTenantId()))) {
            return tenantAccessDenied();
        }

        String eventType = body.eventType() == null ? template.getEventType() : normalizeEventType(body.eventType());
        String channel = body.channel() == null ? template.getChannel() : normalizeChannel(body.channel());
        String title = body.title() == null ? template.getTitle() : body.title();
        String message = body.body() == null ? template.getBody() : body.body();
        String status = body.status() == null ? template.getStatus() : normalizeStatus(body.status());
        ResponseEntity<?> validation = validateTemplate(eventType, channel, title, message, status);
        if (validation != null) return validation;
        if (templateExists(template.getId(), template.getTenantId(), eventType, channel)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiErrorResponse.of(409, "TEMPLATE_EXISTS", "A template already exists for that event type and channel."));
        }

        template.update(channel, eventType, title.trim(), message.trim(), status);
        NotificationTemplate saved = templateRepository.save(template);
        auditService.record(
                template.getTenantId() == null ? currentSession.user().getTenantId() : template.getTenantId(),
                currentSession.user(),
                "Updated notification template " + saved.getEventType(),
                "notification_template",
                saved.getId(),
                request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.of(NotificationTemplateResponse.from(saved)));
    }

    private String tenantScope(AuthService.CurrentSession currentSession, String requestedTenantId) {
        if (authService.isPlatform(currentSession.user())) {
            return requestedTenantId == null || requestedTenantId.isBlank() ? null : requestedTenantId.trim();
        }
        if (requestedTenantId == null || requestedTenantId.isBlank()) return currentSession.user().getTenantId();
        return requestedTenantId.trim().equals(currentSession.user().getTenantId()) ? requestedTenantId.trim() : null;
    }

    private ResponseEntity<ApiErrorResponse> tenantAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "TENANT_ACCESS_DENIED", "Cannot access notification templates for another tenant."));
    }

    private String normalizeEventType(String eventType) {
        return eventType == null ? "" : eventType.trim().toLowerCase().replaceAll("\\s+", "_");
    }

    private String normalizeChannel(String channel) {
        return channel == null || channel.isBlank() ? "in_app" : channel.trim().toLowerCase();
    }

    private String normalizeStatus(String status) {
        return status == null || status.isBlank() ? "active" : status.trim().toLowerCase();
    }

    private ResponseEntity<?> validateTemplate(String eventType, String channel, String title, String body, String status) {
        if (!eventType.matches("^[a-z][a-z0-9_]*$")) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "VALIDATION_ERROR", "Event type must use lowercase letters, numbers, and underscores."));
        }
        if (!CHANNELS.contains(channel)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "VALIDATION_ERROR", "Unsupported notification channel."));
        }
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "VALIDATION_ERROR", "Template title is required."));
        }
        if (body == null || body.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "VALIDATION_ERROR", "Template body is required."));
        }
        if (!STATUSES.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(ApiErrorResponse.of(400, "VALIDATION_ERROR", "Unsupported template status."));
        }
        return null;
    }

    private boolean templateExists(String currentTemplateId, String tenantId, String eventType, String channel) {
        return templateRepository.findAll().stream()
                .anyMatch(template -> !template.getId().equals(currentTemplateId)
                        && ((template.getTenantId() == null && tenantId == null) || (template.getTenantId() != null && template.getTenantId().equals(tenantId)))
                        && template.getEventType().equals(eventType)
                        && template.getChannel().equals(channel));
    }

    record CreateNotificationTemplateRequest(
            String tenantId,
            @NotBlank String eventType,
            String channel,
            @NotBlank String title,
            @NotBlank String body,
            String status) {
    }

    record UpdateNotificationTemplateRequest(
            String eventType,
            String channel,
            String title,
            String body,
            String status) {
    }
}
