package com.methaltech.sacco.member;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberSubscriptionRepository extends JpaRepository<MemberSubscription, String> {

    List<MemberSubscription> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    Optional<MemberSubscription> findFirstByMemberIdOrderByCreatedAtDesc(String memberId);

    /** Active memberships lapsed past their grace window — candidates to expire. */
    List<MemberSubscription> findByStatusAndExpiryLessThan(String status, LocalDate date);

    /** Active memberships approaching expiry — candidates for a renewal reminder. */
    List<MemberSubscription> findByStatusAndExpiryBetween(String status, LocalDate from, LocalDate to);
}
