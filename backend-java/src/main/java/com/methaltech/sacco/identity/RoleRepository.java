package com.methaltech.sacco.identity;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface RoleRepository extends JpaRepository<Role, String> {
    List<Role> findAllByOrderByTenantIdAscNameAsc();
    List<Role> findByTenantIdOrderByNameAsc(String tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(String tenantId, String name);
}
