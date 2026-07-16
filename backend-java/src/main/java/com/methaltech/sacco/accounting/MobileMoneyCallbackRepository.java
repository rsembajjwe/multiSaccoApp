package com.methaltech.sacco.accounting;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface MobileMoneyCallbackRepository extends JpaRepository<MobileMoneyCallback, String> {
    List<MobileMoneyCallback> findAllByOrderByTenantIdAscReceivedAtDesc();
    List<MobileMoneyCallback> findByTenantIdOrderByReceivedAtDesc(String tenantId);
    Optional<MobileMoneyCallback> findByTenantIdAndExternalReferenceIgnoreCase(String tenantId, String externalReference);
}
