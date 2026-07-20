package com.methaltech.sacco.identity;

import com.methaltech.sacco.notification.NotificationService;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final NotificationService notificationService;

    AuditService(
            AuditEventRepository auditEventRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            NotificationService notificationService) {
        this.auditEventRepository = auditEventRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.notificationService = notificationService;
    }

    public AuditEvent record(
            String tenantId,
            User actor,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress) {
        return record(
                tenantId,
                actor == null ? null : actor.getId(),
                actor == null ? "System" : actor.getFullName(),
                action,
                resourceType,
                resourceId,
                ipAddress);
    }

    public AuditEvent record(
            String tenantId,
            String actorUserId,
            String actorName,
            String action,
            String resourceType,
            String resourceId,
            String ipAddress) {
        AuditEvent event = auditEventRepository.save(new AuditEvent(
                "audit_" + UUID.randomUUID(),
                tenantId,
                actorUserId,
                actorName,
                action,
                resourceType,
                resourceId,
                ipAddress));
        notifySecurityAdmins(event);
        return event;
    }

    private void notifySecurityAdmins(AuditEvent event) {
        if (!isLoginRiskEvent(event)) return;
        List<User> recipients = securityRecipients(event.getTenantId());
        if (recipients.isEmpty()) return;
        String title = event.getTenantId().equals("tenant_platform") ? "Platform login risk detected" : "SACCO login risk detected";
        String message = event.getAction() + " for " + safe(event.getResourceId()) + " from " + safe(event.getIpAddress()) + ".";
        recipients.forEach(user -> notificationService.notifyStaffSecurityAlert(
                user.getTenantId(),
                user.getId(),
                user.getEmail(),
                title,
                message,
                event.getResourceType(),
                event.getId()));
    }

    private boolean isLoginRiskEvent(AuditEvent event) {
        String text = (safe(event.getAction()) + " " + safe(event.getResourceType())).toLowerCase();
        return text.contains("login") && (text.contains("failed") || text.contains("blocked") || text.contains("invalid"));
    }

    private List<User> securityRecipients(String tenantId) {
        List<User> users = userRepository.findByTenantIdOrderByFullNameAsc(tenantId).stream()
                .filter(user -> "active".equalsIgnoreCase(user.getStatus()))
                .toList();
        if (users.isEmpty()) return List.of();
        List<String> userIds = users.stream().map(User::getId).toList();
        Set<String> adminRoleIds = roleRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
                .filter(role -> {
                    String name = role.getName().toLowerCase();
                    return role.isProtectedRole() || name.contains("super admin") || name.contains("administrator");
                })
                .map(Role::getId)
                .collect(Collectors.toSet());
        if (adminRoleIds.isEmpty()) return List.of();
        Set<String> recipientUserIds = userRoleRepository.findByIdUserIdIn(userIds).stream()
                .filter(userRole -> adminRoleIds.contains(userRole.getId().getRoleId()))
                .map(userRole -> userRole.getId().getUserId())
                .collect(Collectors.toSet());
        return users.stream()
                .filter(user -> recipientUserIds.contains(user.getId()))
                .toList();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }
}
