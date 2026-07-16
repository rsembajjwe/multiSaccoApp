package com.methaltech.sacco.subscription;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, String> {
    List<SubscriptionPayment> findAllByOrderByTenantIdAscReceivedAtDesc();
    List<SubscriptionPayment> findByTenantIdOrderByReceivedAtDesc(String tenantId);
    Optional<SubscriptionPayment> findByExternalReferenceIgnoreCase(String externalReference);
}
