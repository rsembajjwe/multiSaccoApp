package com.methaltech.sacco.subscription;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    List<Subscription> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<Subscription> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}
