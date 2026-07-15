package com.methaltech.sacco.tenant;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface TenantRepository extends JpaRepository<Tenant, String> {
    List<Tenant> findAllByOrderByNameAsc();
}
