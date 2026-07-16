package com.methaltech.sacco.identity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_roles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class UserRole {

    @EmbeddedId
    private UserRoleId id;

    @Column(name = "tenant_id")
    private String tenantId;

    UserRole(String userId, String roleId, String tenantId) {
        this.id = new UserRoleId(userId, roleId);
        this.tenantId = tenantId;
    }
}
