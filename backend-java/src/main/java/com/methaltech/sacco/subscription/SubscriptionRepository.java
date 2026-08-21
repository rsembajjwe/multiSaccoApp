package com.methaltech.sacco.subscription;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    List<Subscription> findAllByOrderByTenantIdAscCreatedAtDesc();
    List<Subscription> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    java.util.Optional<Subscription> findFirstByTenantIdOrderByCreatedAtDesc(String tenantId);
    boolean existsByTenantIdAndStatus(String tenantId, String status);

    /** Active subscriptions whose expiry (plus grace) has fully lapsed — candidates to expire. */
    List<Subscription> findByStatusAndExpiryLessThan(String status, LocalDate date);

    /** Active subscriptions expiring within a pre-expiry window — candidates for a renewal reminder. */
    List<Subscription> findByStatusAndExpiryBetween(String status, LocalDate from, LocalDate to);

    /** Operating (active or trial) subscriptions past their grace window — candidates to expire. */
    List<Subscription> findByStatusInAndExpiryLessThan(Collection<String> statuses, LocalDate date);

    /** Operating (active or trial) subscriptions within a reminder window. */
    List<Subscription> findByStatusInAndExpiryBetween(Collection<String> statuses, LocalDate from, LocalDate to);
}
