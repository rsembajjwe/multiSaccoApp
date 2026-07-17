package com.methaltech.sacco.finance;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface FinancialProductRepository extends JpaRepository<FinancialProduct, String> {
    List<FinancialProduct> findAllByOrderByTenantIdAscProductTypeAscCodeAsc();
    List<FinancialProduct> findByTenantIdOrderByProductTypeAscCodeAsc(String tenantId);
    List<FinancialProduct> findByTenantIdAndProductTypeOrderByCodeAsc(String tenantId, String productType);
    boolean existsByTenantIdAndCodeIgnoreCase(String tenantId, String code);
}
