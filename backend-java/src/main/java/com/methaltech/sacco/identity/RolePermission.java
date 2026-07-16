package com.methaltech.sacco.identity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "role_permissions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class RolePermission {

    @EmbeddedId
    private RolePermissionId id;

    RolePermission(String roleId, String permissionId) {
        this.id = new RolePermissionId(roleId, permissionId);
    }
}
