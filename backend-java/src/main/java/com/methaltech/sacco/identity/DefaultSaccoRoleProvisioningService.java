package com.methaltech.sacco.identity;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultSaccoRoleProvisioningService {

    private static final String ADMIN_ROLE = "SACCO Administrator";
    private static final Set<String> ADMIN_PERMISSIONS = Set.of(
            "dashboard:view",
            "tenants:manage",
            "users:view",
            "users:create",
            "roles:view",
            "roles:create",
            "members:view",
            "members:create",
            "members:approve",
            "transactions:view",
            "transactions:create",
            "transactions:approve",
            "loans:view",
            "loans:create",
            "loans:approve",
            "loan-recovery:create",
            "accounting:view",
            "accounting:post",
            "reports:view",
            "approvals:view",
            "approvals:decide",
            "operations:view",
            "notifications:view",
            "notifications:manage",
            "governance:view",
            "governance:manage",
            "complaints:view",
            "complaints:manage",
            "sacco-profile:manage");
            private static final java.util.Map<String, Set<String>> OFFICIAL_PERMISSIONS = java.util.Map.of(
                "chairperson", Set.of(
                    "dashboard:view", "members:view", "transactions:view", "loans:view",
                    "loans:approve", "reports:view", "approvals:view", "approvals:decide", "operations:view",
                    "governance:view", "complaints:view", "notifications:view", "subscriptions:view",
                    "sacco-profile:manage", "finance-source:view", "finance-source:manage", "fund-types:view",
                    "fund-types:manage", "savings-transfer:view", "savings-transfer:approve", "welfare:approve"),
                "secretary", Set.of(
                    "dashboard:view", "members:view", "members:create", "members:approve", "loans:view",
                    "reports:view", "approvals:view", "governance:view", "governance:manage", "complaints:view",
                    "complaints:manage", "complaints:route", "welfare:view", "welfare:manage",
                    "member-subscription:view", "member-subscription:manage", "savings-transfer:view",
                    "savings-transfer:approve", "finance-source:view", "fund-types:view"),
                "treasurer", Set.of(
                    "dashboard:view", "members:view", "transactions:view", "transactions:create", "transactions:approve",
                    "accounting:view", "accounting:post", "reports:view", "approvals:view", "operations:view",
                    "loans:view", "loans:create", "loans:disburse", "finance-source:view", "finance-source:manage",
                    "fund-types:view", "savings-transfer:view", "savings-transfer:manage", "savings-transfer:create",
                    "savings-transfer:approve", "welfare:view", "member-subscription:view", "member-subscription:manage",
                    "loan-recovery:create"));

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public DefaultSaccoRoleProvisioningService(
            RoleRepository roleRepository,
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    @Transactional
    public String ensureAdministratorRole(String tenantId, String createdByUserId) {
        return ensureRole(tenantId, ADMIN_ROLE, ADMIN_PERMISSIONS, createdByUserId);
    }

    @Transactional
    public String ensureOfficialRole(String tenantId, String office, String createdByUserId) {
        String normalizedOffice = office == null ? "" : office.trim().toLowerCase();
        Set<String> permissions = OFFICIAL_PERMISSIONS.get(normalizedOffice);
        if (permissions == null) {
            throw new IllegalArgumentException("Unsupported SACCO official office.");
        }
        String roleName = Character.toUpperCase(normalizedOffice.charAt(0)) + normalizedOffice.substring(1);
        return ensureRole(tenantId, roleName, permissions, createdByUserId);
    }

    private String ensureRole(String tenantId, String roleName, Set<String> permissions, String createdByUserId) {
        Role role = roleRepository.findByTenantIdAndNameIgnoreCase(tenantId, roleName)
                .orElseGet(() -> roleRepository.save(new Role(
                        "role_" + UUID.randomUUID(), tenantId, roleName, true, createdByUserId)));
        if (rolePermissionRepository.findByIdRoleId(role.getId()).isEmpty()) {
            List<RolePermission> grants = permissionRepository.findAllById(permissions).stream()
                    .map(permission -> new RolePermission(role.getId(), permission.getId()))
                    .toList();
            rolePermissionRepository.saveAll(grants);
        }
        return role.getId();
    }
}
