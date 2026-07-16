package com.methaltech.sacco.identity;

import java.time.Instant;
import java.util.List;

record RoleResponse(
        String id,
        String tenantId,
        String name,
        boolean protectedRole,
        String createdByUserId,
        Instant createdAt,
        List<String> permissionIds) {

    static RoleResponse from(Role role, List<String> permissionIds) {
        return new RoleResponse(
                role.getId(),
                role.getTenantId(),
                role.getName(),
                role.isProtectedRole(),
                role.getCreatedByUserId(),
                role.getCreatedAt(),
                permissionIds);
    }
}
