package com.methaltech.sacco.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface SupplierRepository extends JpaRepository<Supplier, String> {
    List<Supplier> findAllByOrderByTenantIdAscNameAsc();
    List<Supplier> findByTenantIdOrderByNameAsc(String tenantId);
    boolean existsByTenantIdAndNameIgnoreCase(String tenantId, String name);
}
