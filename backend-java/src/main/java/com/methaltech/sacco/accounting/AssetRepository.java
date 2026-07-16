package com.methaltech.sacco.accounting;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

interface AssetRepository extends JpaRepository<Asset, String> {
    List<Asset> findAllByOrderByTenantIdAscPurchaseDateDescCreatedAtDesc();
    List<Asset> findByTenantIdOrderByPurchaseDateDescCreatedAtDesc(String tenantId);
    boolean existsByTenantIdAndReferenceIgnoreCase(String tenantId, String reference);
    long countByTenantId(String tenantId);
}
