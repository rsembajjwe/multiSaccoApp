package com.methaltech.sacco.identity;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {
    List<RolePermission> findByIdRoleIdIn(List<String> roleIds);
    List<RolePermission> findByIdRoleId(String roleId);
}
