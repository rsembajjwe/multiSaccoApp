package com.methaltech.sacco.identity;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class StaffNotificationRecipientService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    StaffNotificationRecipientService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    public List<StaffNotificationRecipient> saccoPaymentExceptionRecipients(String tenantId) {
        return saccoRecipientsByRole(tenantId, this::isPaymentExceptionRole);
    }

    public List<StaffNotificationRecipient> saccoSubscriptionLeadershipRecipients(String tenantId) {
        return saccoRecipientsByRole(tenantId, this::isSubscriptionLeadershipRole);
    }

    public List<StaffNotificationRecipient> saccoComplaintRecipients(String tenantId) {
        return saccoRecipientsByRole(tenantId, this::isComplaintHandlingRole);
    }

    public List<StaffNotificationRecipient> saccoSavingsTransferApproverRecipients(String tenantId) {
        return saccoRecipientsByRole(tenantId, this::isSavingsTransferApproverRole);
    }

    public List<StaffNotificationRecipient> platformFleetApproverRecipients() {
        List<User> activeUsers = userRepository.findByTenantIdOrderByFullNameAsc("tenant_platform").stream()
                .filter(user -> "active".equalsIgnoreCase(user.getStatus()))
                .toList();
        if (activeUsers.isEmpty()) return List.of();
        List<String> userIds = activeUsers.stream().map(User::getId).toList();
        Set<String> roleIds = userRoleRepository.findByIdUserIdIn(userIds).stream()
                .map(userRole -> userRole.getId().getRoleId())
                .collect(Collectors.toSet());
        Set<String> managingRoleIds = rolePermissionRepository.findByIdRoleIdIn(roleIds.stream().toList()).stream()
                .filter(rolePermission -> "tenants:manage".equals(rolePermission.getId().getPermissionId()))
                .map(rolePermission -> rolePermission.getId().getRoleId())
                .collect(Collectors.toSet());
        Set<String> recipientUserIds = userRoleRepository.findByIdUserIdIn(userIds).stream()
                .filter(userRole -> managingRoleIds.contains(userRole.getId().getRoleId()))
                .map(userRole -> userRole.getId().getUserId())
                .collect(Collectors.toSet());
        return recipients(activeUsers.stream().filter(user -> recipientUserIds.contains(user.getId())).toList());
    }

    public Optional<StaffNotificationRecipient> platformRecipient(String userId) {
        if (userId == null || userId.isBlank()) return Optional.empty();
        return userRepository.findById(userId)
                .filter(user -> "tenant_platform".equals(user.getTenantId()))
                .filter(user -> "active".equalsIgnoreCase(user.getStatus()))
                .map(user -> new StaffNotificationRecipient(user.getId(), user.getTenantId(), user.getFullName(),
                        user.getEmail(), user.getPhone()));
    }

    private List<StaffNotificationRecipient> saccoRecipientsByRole(String tenantId, java.util.function.Predicate<Role> rolePredicate) {
        if (tenantId == null || tenantId.isBlank() || "tenant_platform".equals(tenantId)) {
            return List.of();
        }
        List<User> activeUsers = userRepository.findByTenantIdOrderByFullNameAsc(tenantId).stream()
                .filter(user -> "active".equalsIgnoreCase(user.getStatus()))
                .toList();
        if (activeUsers.isEmpty()) {
            return List.of();
        }
        List<String> userIds = activeUsers.stream().map(User::getId).toList();
        Set<String> paymentRoleIds = roleRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
                .filter(rolePredicate)
                .map(Role::getId)
                .collect(Collectors.toSet());
        if (paymentRoleIds.isEmpty()) {
            return recipients(activeUsers);
        }
        Set<String> recipientUserIds = userRoleRepository.findByIdUserIdIn(userIds).stream()
                .filter(userRole -> paymentRoleIds.contains(userRole.getId().getRoleId()))
                .map(userRole -> userRole.getId().getUserId())
                .collect(Collectors.toSet());
        List<User> recipients = activeUsers.stream()
                .filter(user -> recipientUserIds.contains(user.getId()))
                .toList();
        return recipients(recipients.isEmpty() ? activeUsers : recipients);
    }

    private boolean isPaymentExceptionRole(Role role) {
        String name = role.getName() == null ? "" : role.getName().toLowerCase();
        return role.isProtectedRole()
                || name.contains("administrator")
                || name.contains("treasurer")
                || name.contains("accountant")
                || name.contains("teller")
                || name.contains("cashier")
                || name.contains("chairperson");
    }

    private boolean isSubscriptionLeadershipRole(Role role) {
        String name = role.getName() == null ? "" : role.getName().toLowerCase();
        return name.contains("chairperson")
                || name.contains("chairman")
                || name.contains("secretary")
                || name.contains("treasurer");
    }

    private boolean isSavingsTransferApproverRole(Role role) {
        String name = role.getName() == null ? "" : role.getName().toLowerCase();
        return role.isProtectedRole()
                || name.contains("administrator")
                || name.contains("chairperson")
                || name.contains("chairman");
    }

    private boolean isComplaintHandlingRole(Role role) {
        String name = role.getName() == null ? "" : role.getName().toLowerCase();
        return role.isProtectedRole()
                || name.contains("administrator")
                || name.contains("manager")
                || name.contains("secretary")
                || name.contains("chairperson")
                || name.contains("support")
                || name.contains("relations")
                || name.contains("customer");
    }

    private List<StaffNotificationRecipient> recipients(List<User> users) {
        return users.stream()
                .map(user -> new StaffNotificationRecipient(
                        user.getId(),
                        user.getTenantId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone()))
                .toList();
    }
}
