package com.methaltech.sacco.accounting;

import java.util.List;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface MobileMoneyPaymentRequestRepository extends JpaRepository<MobileMoneyPaymentRequestEntity, String> {
    List<MobileMoneyPaymentRequestEntity> findAllByOrderByTenantIdAscRequestedAtDesc();
    List<MobileMoneyPaymentRequestEntity> findByTenantIdOrderByRequestedAtDesc(String tenantId);
    List<MobileMoneyPaymentRequestEntity> findByMemberIdOrderByRequestedAtDesc(String memberId);
    List<MobileMoneyPaymentRequestEntity> findByStatusInOrderByRequestedAtAsc(Collection<String> statuses, Pageable pageable);
    Optional<MobileMoneyPaymentRequestEntity> findByTenantIdAndExternalReferenceIgnoreCase(String tenantId, String externalReference);
    boolean existsByTenantIdAndExternalReferenceIgnoreCase(String tenantId, String externalReference);
}
