package com.methaltech.sacco.identity;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface RoleRepository extends JpaRepository<Role, String> {
    List<Role> findAllByOrderByTenantIdAscNameAsc();
    List<Role> findByTenantIdOrderByNameAsc(String tenantId);
    Optional<Role> findByTenantIdAndNameIgnoreCase(String tenantId, String name);
    boolean existsByTenantIdAndNameIgnoreCase(String tenantId, String name);
}
