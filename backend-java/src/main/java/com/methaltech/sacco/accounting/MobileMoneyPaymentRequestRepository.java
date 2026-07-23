package com.methaltech.sacco.accounting;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface MobileMoneyPaymentRequestRepository extends JpaRepository<MobileMoneyPaymentRequestEntity, String> {
    List<MobileMoneyPaymentRequestEntity> findAllByOrderByTenantIdAscRequestedAtDesc();
    List<MobileMoneyPaymentRequestEntity> findByTenantIdOrderByRequestedAtDesc(String tenantId);
    List<MobileMoneyPaymentRequestEntity> findByMemberIdOrderByRequestedAtDesc(String memberId);
    Optional<MobileMoneyPaymentRequestEntity> findByTenantIdAndExternalReferenceIgnoreCase(String tenantId, String externalReference);
    boolean existsByTenantIdAndExternalReferenceIgnoreCase(String tenantId, String externalReference);
}
