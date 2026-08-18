package com.methaltech.sacco.subscription;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface TenantBillingItemRepository extends JpaRepository<TenantBillingItem, String> {

    List<TenantBillingItem> findByTenantIdOrderByCreatedAtAsc(String tenantId);

    List<TenantBillingItem> findByTenantIdAndStatusOrderByCreatedAtAsc(String tenantId, String status);

    Optional<TenantBillingItem> findByIdAndTenantId(String id, String tenantId);
}
